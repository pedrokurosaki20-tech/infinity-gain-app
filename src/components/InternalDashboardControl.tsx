import { useState, useEffect } from "react";

export function InternalDashboardControl() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState("close");
  const [loading, setLoading] = useState(false);
  const [targetsInput, setTargetsInput] = useState("");

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${GATEWAY_URL}/api/status`);
        const data = await res.json();
        setStatus(data.status);
        if (data.pairingCode) setCode(data.pairingCode);
      } catch (err) {
        console.log("Servidor aguardando inicialização...");
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    if (!phone) return alert("Insira o número do WhatsApp com DDD!");
    setLoading(true);
    try {
      const res = await fetch(`${GATEWAY_URL}/api/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.pairingCode) {
        setCode(data.pairingCode);
        setStatus("pairing");
      }
    } catch (err) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${GATEWAY_URL}/api/disconnect`, { method: "POST" });
      setStatus("close");
      setCode(null);
      setPhone("");
    } catch (err) {
      alert("Erro ao processar desconexão.");
    }
  };

  const handleProcessQueue = async () => {
    if (!targetsInput) return alert("Insira a lista de números para disparo!");
    const targets = targetsInput.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
    
    try {
      const res = await fetch(`${GATEWAY_URL}/api/disparar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets }),
      });
      const data = await res.json();
      if (data.status === "queueing") {
        alert(`Disparos iniciados para ${data.count} contatos em background!`);
        setTargetsInput("");
      }
    } catch (err) {
      alert("Falha ao acionar robô.");
    }
  };

  return (
    <div className="p-6 glass rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-6 max-w-2xl mx-auto my-6 text-zinc-900 dark:text-zinc-50">
      <div>
        <h3 className="text-xl font-extrabold tracking-tight">Painel de Disparos Computacionais</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Status do Motor: <span className="font-semibold text-emerald-500 capitalize">{status === "open" ? "Conectado ✅" : status === "pairing" ? "Aguardando Código ⏳" : "Desconectado ❌"}</span></p>
      </div>

      {status === "close" && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Ex: 5511999999999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 border border-zinc-300 dark:border-zinc-700 rounded-2xl bg-transparent"
          />
          <button onClick={handleConnect} disabled={loading} className="w-full bg-brand-gradient text-white py-3 rounded-2xl font-semibold shadow-glow">
            {loading ? "Gerando Código..." : "Vincular Número por Código"}
          </button>
        </div>
      )}

      {status === "pairing" && code && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center space-y-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Digite este código no seu WhatsApp (Aparelhos Conectados):</p>
          <div className="font-mono text-3xl font-black text-emerald-500 tracking-widest bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">{code}</div>
          <button onClick={handleDisconnect} className="text-xs text-red-500 underline mt-2 block mx-auto">Cancelar Operação</button>
        </div>
      )}

      {status === "open" && (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm text-center font-medium">
            WhatsApp autenticado e pronto para envios!
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500">Cole a lista de clientes (um por linha):</label>
            <textarea
              rows={4}
              placeholder="5511999999999&#10;5511988888888"
              value={targetsInput}
              onChange={(e) => setTargetsInput(e.target.value)}
              className="w-full p-3 text-sm font-mono border border-zinc-300 dark:border-zinc-700 rounded-2xl bg-transparent"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={handleProcessQueue} className="flex-1 bg-brand-gradient text-white py-3 rounded-2xl font-semibold shadow-glow">
              🚀 Iniciar Envio em Massa
            </button>
            <button onClick={handleDisconnect} className="bg-red-600 text-white px-5 py-3 rounded-2xl font-semibold">
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


