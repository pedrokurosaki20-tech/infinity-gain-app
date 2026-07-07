import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BalanceCard } from "@/components/BalanceCard";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Minha Carteira — Infinity Gain" },
      {
        name: "description",
        content: "Acompanhe saldo, ganhos totais e histórico de transações.",
      },
    ],
  }),
  component: WalletPage,
});

const tx = [
  { id: 1, title: "Tarefa: Treinamento de IA", date: "Hoje, 14:32", amount: 6.5, type: "in" as const },
  { id: 2, title: "Saque via PIX", date: "Ontem, 09:12", amount: -150, type: "out" as const },
  { id: 3, title: "Bônus indicação — Ana", date: "22/07", amount: 10, type: "in" as const },
  { id: 4, title: "Compartilhamento", date: "21/07", amount: 28.4, type: "in" as const },
  { id: 5, title: "RCS", date: "20/07", amount: 2.8, type: "in" as const },
  { id: 6, title: "Saque via PIX", date: "18/07", amount: -300, type: "out" as const },
];

function WalletPage() {
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
        <Stat label="Ganhos Totais" value="R$ 4.820,90" tone="blue" />
        <Stat label="Saques Realizados" value="R$ 2.100,00" tone="pink" />
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
        <h2 className="mb-3 text-lg font-bold">Histórico</h2>
        <div className="glass divide-y divide-white/5 rounded-3xl">
          {tx.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  t.type === "in"
                    ? "bg-[color:var(--brand-blue)]/15 text-[color:var(--brand-blue)]"
                    : "bg-[color:var(--brand-pink)]/15 text-[color:var(--brand-pink)]"
                }`}
              >
                {t.type === "in" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.date}</p>
              </div>
              <p
                className={`shrink-0 text-sm font-semibold ${
                  t.amount > 0 ? "text-white" : "text-muted-foreground"
                }`}
              >
                {t.amount > 0 ? "+" : "−"}
                {Math.abs(t.amount).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
          ))}
        </div>
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
