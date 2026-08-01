import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowLeft, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BalanceCard } from "@/components/BalanceCard";
import { supabase } from "@/integrations/supabase/client";
import {
  BRL,
  WITHDRAWAL_SELECT,
  statusMeta,
  type WithdrawalRow,
} from "@/components/WithdrawTracking";

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

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type TxnRow = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
};

function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WithdrawalRow[]>([]);
  const [txns, setTxns] = useState<TxnRow[]>([]);

  useEffect(() => {
    let active = true;
    async function loadTxns() {
      const { data } = await supabase
        .from("transactions")
        .select("id, type, amount, description, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (active) setTxns((data ?? []) as TxnRow[]);
    }
    loadTxns();
    const ch = supabase
      .channel("wallet-transactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => loadTxns())
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, []);


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
        .select(WITHDRAWAL_SELECT)
        .order("created_at", { ascending: false })
        .returns<WithdrawalRow[]>();
      if (!active) return;
      setItems(data ?? []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("wallet-withdrawals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawals" },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
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
        <Stat label="Saques Concluídos" value={BRL(totalWithdrawn)} tone="blue" />
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

      <section className="mt-8 pb-4">
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
          <div className="space-y-3">
            {items.map((t) => {
              const meta = statusMeta[t.status];
              const Icon = meta.Icon;
              return (
                <Link
                  key={t.id}
                  to="/withdraw/$id"
                  params={{ id: t.id }}
                  className="glass block rounded-2xl p-4 transition hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--brand-pink)]/15 text-[color:var(--brand-pink)]">
                      <ArrowUpRight size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        Solicitação #{t.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(t.created_at)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}
                    >
                      <Icon size={10} />
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <MiniInfo label="Solicitado" value={BRL(Number(t.amount))} />
                    <MiniInfo label="Taxa (5%)" value={BRL(Number(t.fee))} />
                    <MiniInfo label="Líquido" value={BRL(Number(t.net_amount))} highlight />
                  </div>

                  <p className="mt-2 truncate text-[11px] text-muted-foreground">
                    Chave PIX ({t.pix_type}): <span className="font-mono text-white/80">{t.pix_key}</span>
                  </p>
                  {t.status === "rejected" && t.rejection_reason && (
                    <p className="mt-1 text-[11px] text-red-400">
                      Motivo: {t.rejection_reason}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function MiniInfo({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-2 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 text-xs font-semibold ${highlight ? "text-[color:var(--brand-blue)]" : "text-white"}`}
      >
        {value}
      </p>
    </div>
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
