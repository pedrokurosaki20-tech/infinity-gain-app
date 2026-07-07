import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Info } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/withdraw")({
  head: () => ({
    meta: [
      { title: "Solicitar Saque — Infinity Gain" },
      {
        name: "description",
        content: "Solicite seu saque via PIX com processamento em até 24h úteis.",
      },
    ],
  }),
  component: WithdrawPage,
});

const pixTypes = ["CPF", "E-mail", "Telefone", "Aleatória"] as const;

function WithdrawPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<(typeof pixTypes)[number]>("CPF");
  const [key, setKey] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <Link
          to="/wallet"
          className="glass grid h-10 w-10 place-items-center rounded-full"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold">Solicitar Saque</h1>
        <span className="w-10" />
      </header>

      <section className="mt-6 rounded-3xl p-5 bg-card-gradient border border-white/10 shadow-glow animate-fade-up">
        <p className="text-xs uppercase tracking-widest text-white/70">
          Saldo Disponível
        </p>
        <p className="mt-1 text-3xl font-extrabold">R$ 1.284,50</p>
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/wallet" });
        }}
        className="mt-6 space-y-4 animate-fade-up"
      >
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Tipo de chave PIX
          </label>
          <div className="grid grid-cols-4 gap-2">
            {pixTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-2xl px-2 py-3 text-xs font-semibold transition ${
                  type === t
                    ? "bg-brand-gradient text-white shadow-glow"
                    : "glass text-white/80"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <FieldBlock label="Chave PIX">
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Digite sua chave"
            className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none"
          />
        </FieldBlock>

        <FieldBlock label="Valor do saque">
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground">R$</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full bg-transparent text-lg font-semibold text-white placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </FieldBlock>

        <div className="glass flex items-start gap-3 rounded-2xl p-4">
          <Info size={16} className="mt-0.5 shrink-0 text-[color:var(--brand-blue)]" />
          <p className="text-xs text-muted-foreground">
            Os saques são processados em até 24 horas úteis diretamente na sua chave PIX.
          </p>
        </div>

        <button
          type="submit"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.01]"
        >
          Solicitar Saque
        </button>
      </form>
    </AppShell>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="glass rounded-2xl px-4 py-3.5">{children}</div>
    </div>
  );
}
