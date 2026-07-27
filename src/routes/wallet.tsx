import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BalanceCard } from "@/components/BalanceCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Minha Carteira — Infinity Gain" },
      {
        name: "description",
        content: "Acompanhe saldo, ganhos totais e histórico de saques.",
      },
    ],
  }),
  component: WalletPage,
});

type WithdrawalStatus = "processing" | "completed" | "rejected";
type Withdrawal = {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  pix_key: string;
  pix_type: string;
  status: WithdrawalStatus;
  created_at: string;
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusMeta: Record<WithdrawalStatus, { label: string; className: string; Icon: typeof Clock }> = {
  processing: {
    label: "Processando",
    className: "bg-[color:var(--brand-blue)]/15 text-[color:var(--brand-blue)]",
    Icon: Clock,
  },
  completed: {
    label: "Concluído",
    className: "bg-emerald-500/15 text-emerald-400",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Rejeitado",
    className: "bg-red-500/15 text-red-400",
    Icon: XCircle,
  },
};

function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Withdrawal[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (active) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("withdrawals")
        .select("id, amount, fee, net_amount, pix_key, pix_type, status, created_at")
        .order("created_at", { ascending: false })
        .returns<Withdrawal[]>();
      if (!active) return;
      setItems(data ?? []);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const totalWithdrawn = items
    .filter((i) => i.status === "completed")
    .reduce((s, i) => s + Number(i.net_amount), 0);

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="glass grid h-10 w-10 place-items-center rounded-full"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold">Minha Carteira</h1>
        <span className="w-10" />
      </header>

      <section className="mt-6 animate-fade-up">
        <BalanceCard />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 animate-fade-up">
        <Stat label="Saques Concluídos" value={formatBRL(totalWithdrawn)} tone="blue" />
        <Stat label="Solicitações" value={String(items.length)} tone="pink" />
      </section>

      <section className="mt-5 animate-fade-up">
        <Link
          to="/withdraw"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.01]"
        >
          <ArrowDownToLine size={18} />
          Solicitar Saque
        </Link>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Histórico de Saques</h2>
        {loading ? (
          <div className="glass rounded-3xl px-4 py-6 text-center text-sm text-muted-foreground">
            Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="glass rounded-3xl px-4 py-8 text-center text-sm text-muted-foreground">
            Você ainda não solicitou nenhum saque.
          </div>
        ) : (
          <div className="glass divide-y divide-white/5 rounded-3xl">
            {items.map((t) => {
              const meta = statusMeta[t.status];
              const Icon = meta.Icon;
              return (
                <Link
                  key={t.id}
                  to="/withdraw/$id"
                  params={{ id: t.id }}
                  className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.03]"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--brand-pink)]/15 text-[color:var(--brand-pink)]">
                    <ArrowUpRight size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      Saque via PIX · {t.pix_type}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.created_at)}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}
                      >
                        <Icon size={10} />
                        {meta.label}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-white">
                      −{formatBRL(Number(t.amount))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Líquido {formatBRL(Number(t.net_amount))}
                    </p>
                  </div>
                </Link>

              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "pink";
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-1.5 text-xl font-extrabold"
        style={{ color: tone === "blue" ? "#7aa5ff" : "#ff9edb" }}
      >
        {value}
      </p>
    </div>
  );
}
