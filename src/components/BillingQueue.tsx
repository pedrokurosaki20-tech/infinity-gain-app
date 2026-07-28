import { useState, useEffect } from "react";

interface BillingQueueProps {
  whatsappStatus: string;
}

export function BillingQueue({ whatsappStatus }: BillingQueueProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  // Busca os contatos direto da rota /api/contatos do seu servidor configurado
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch("/api/contatos");
        const data = await res.json();
        if (Array.isArray(data)) {
          setContacts(data);
        }
      } catch (err) {
        console.error("Erro ao buscar contatos do servidor:", err);
      }
    };
    fetchContacts();
  }, []);

  const handleStartDisparos = async () => {
    if (whatsappStatus !== "open") {
      return alert("Atenção: O WhatsApp precisa estar Conectado para iniciar os disparos!");
    }
    if (contacts.length === 0) {
      return alert("Nenhum contato encontrado no banco de dados para enviar.");
    }

    // Filtra e limpa os números vindos do banco de dados (aceita campos 'phone', 'phone_number' ou 'telefone')
    const targets = contacts.map((c) => c.phone || c.phone_number || c.telefone).filter(Boolean);

    if (targets.length === 0) {
      return alert("Nenhum número de telefone válido foi encontrado nos contatos.");
    }

    setSending(true);
    try {
      const res = await fetch("/api/disparar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets }),
      });
      const data = await res.json();
      
      if (data.status === "queueing") {
        alert(`Sucesso! O robô iniciou o envio em massa para ${data.count} clientes com proteção antiban em background.`);
      }
    } catch (err) {
      alert("Falha ao se comunicar com o motor de disparos.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 max-w-2xl mx-auto my-4 shadow-sm text-zinc-900 dark:text-zinc-50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h3 className="text-xl font-bold">📋 Fila de Clientes Cadastrados</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{contacts.length} registros prontos para receber a notificação</p>
        </div>
        <button
          onClick={handleStartDisparos}
          disabled={sending || whatsappStatus !== "open"}
          className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-md font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
        >
          {sending ? "Enviando Fila..." : "🚀 Disparar Recompensas"}
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-md divide-y divide-zinc-200 dark:divide-zinc-800 bg-zinc-50 dark:bg-zinc-950">
        {contacts.map((contact, idx) => (
          <div key={idx} className="p-3 flex justify-between items-center text-sm">
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{contact.name || contact.nome || "Cliente"}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{contact.phone || contact.phone_number || contact.telefone}</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-full font-medium">
              Aguardando Disparo
            </span>
          </div>
        ))}
        {contacts.length === 0 && (
          <p className="text-center p-6 text-zinc-500 dark:text-zinc-400 text-sm">Nenhum cliente listado no banco de dados no momento.</p>
        )}
      </div>
    </div>
  );
}

