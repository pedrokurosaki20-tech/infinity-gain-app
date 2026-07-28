import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { WhatsappConnection } from "@/components/WhatsappConnection";
import { BillingQueue } from "@/components/BillingQueue";

export const Route = createFileRoute("/dashboard")({
  component: DashboardComponent,
});

function DashboardComponent() {
  const [whatsappStatus, setWhatsappStatus] = useState("close");

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
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Painel de Operações</h1>
          <p className="text-muted-foreground text-sm">
            Gerenciamento de conexões e disparos automáticos via WhatsApp.
          </p>
        </div>

        {/* Componentes de Integração */}
        <div className="grid gap-6">
          <WhatsappConnection />
          <BillingQueue whatsappStatus={whatsappStatus} />
        </div>
      </div>
    </div>
  );
}

