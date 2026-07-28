import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { WhatsappConnection } from "@/components/WhatsappConnection";
import { BillingQueue } from "@/components/BillingQueue";

export const Route = createFileRoute("/dashboard")({
  component: DashboardComponent,
});

function DashboardComponent() {
  const [whatsappStatus, setWhatsappStatus] = useState("close");

  // Monitora em tempo real se o celular do funcionário está conectado
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/status");
        const data = await res.json();
        setWhatsappStatus(data.status);
      } catch (err) {
        console.error("Aguardando inicialização do servidor...", err);
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Atualiza o status a cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 py-10 px-4">
      {/* Cabeçalho do Painel */}
      <div className="max-w-4xl mx-auto text-center mb-10">
        <h1 className="text-4xl font-black tracking-tight mb-3">
          🚀 Painel de Treinamento IA & Disparos
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-base max-w-md mx-auto">
          Conecte o número de telefone da empresa via código de pareamento e inicie os envios automáticos para os clientes do banco de dados.
        </p>
      </div>

      {/* Grid de Ferramentas Integradas */}
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Bloco 1: Conectar Aparelho do Funcionário */}
        <section>
          <div className="text-center mb-2">
            <span className="text-xs font-bold uppercase tracking-widest bg-zinc-200 dark:bg-zinc-800 px-2.5 py-1 rounded-full text-zinc-600 dark:text-zinc-400">
              Etapa 1
            </span>
          </div>
          <WhatsappConnection />
        </section>

        {/* Bloco 2: Lista de Clientes e Disparador Humano */}
        <section>
          <div className="text-center mb-2">
            <span className="text-xs font-bold uppercase tracking-widest bg-zinc-200 dark:bg-zinc-800 px-2.5 py-1 rounded-full text-zinc-600 dark:text-zinc-400">
              Etapa 2
            </span>
          </div>
          <BillingQueue whatsappStatus={whatsappStatus} />
        </section>

      </div>
    </div>
  );
}

