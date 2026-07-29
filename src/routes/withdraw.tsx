import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import {
  NextWithdrawCountdown,
  WITHDRAWAL_SELECT,
  WithdrawTracking,
  type WithdrawalRow,
} from "@/components/WithdrawTracking";


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

const pixTypes = ["CPF", "Telefone"] as const;

function WithdrawPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<(typeof pixTypes)[number]>("CPF");
  const [key, setKey] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [latest, setLatest] = useState<WithdrawalRow | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const [{ data: profile }, { data: last }] = await Promise.all([
        supabase.from("profiles").select("balance").eq("id", userData.user.id).maybeSingle(),
        supabase
          .from("withdrawals")
          .select(WITHDRAWAL_SELECT)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .returns<WithdrawalRow>(),
      ]);
      if (!active) return;
      if (profile) setBalance(Number((profile as { balance: number }).balance));
      setLatest((last as WithdrawalRow) ?? null);
    }

    load();

    const channel = supabase
      .channel("withdraw-page")
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

  const lockedUntil = latest
    ? new Date(latest.created_at).getTime() + 24 * 3600 * 1000
    : 0;
  const locked = lockedUntil > Date.now();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (locked) {
      setError(
        "Você já possui um saque recente. Aguarde o término da contagem regressiva para realizar uma nova solicitação.",
      );
      return;
    }
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value < 10) {
      setError("O valor mínimo de saque é R$ 10,00.");
      return;
    }
    if (value > 100) {
      setError("O valor máximo por saque é R$ 100,00.");
      return;
    }
    if (!key.trim()) {
      setError("Informe sua chave PIX.");
      return;
    }
    setSubmitting(true);
    const { data: newId, error: rpcError } = await supabase.rpc("request_withdrawal", {
      _amount: value,
      _pix_key: key.trim(),
      _pix_type: type,
    });
    setSubmitting(false);
    if (rpcError || !newId) {
      setError(rpcError?.message || "Não foi possível registrar seu saque. Tente novamente.");
      return;
    }
    navigate({ to: "/withdraw/$id", params: { id: newId as string } });
  }



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
        <p className="mt-1 text-3xl font-extrabold">
          {balance === null
            ? "—"
            : balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </section>

      {latest && <NextWithdrawCountdown createdAt={latest.created_at} />}

      {latest && (
        <div className="mt-4">
          <WithdrawTracking item={latest} />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 animate-fade-up"
      >

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Tipo de chave PIX
          </label>
          <div className="grid grid-cols-2 gap-2">
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

        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">📌</span>
            <h2 className="text-sm font-bold text-white">
              Informações sobre Saques
            </h2>
          </div>
          <ul className="space-y-3 text-sm text-white/90">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--brand-blue)]" />
              <span>Saque mínimo: <strong className="text-white">R$ 10,00</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--brand-pink)]" />
              <span>Saque máximo: <strong className="text-white">R$ 100,00</strong> por solicitação</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--brand-blue)]" />
              <span>Limite de <strong className="text-white">1 saque a cada 24 horas</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--brand-pink)]" />
              <span>Taxa de processamento: <strong className="text-white">5%</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--brand-blue)]" />
              <span>Os pagamentos são processados em até <strong className="text-white">24 horas úteis</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--brand-pink)]" />
              <span>O valor líquido já será enviado diretamente para a chave PIX cadastrada.</span>
            </li>
          </ul>
        </div>

        <div className="glass flex items-start gap-3 rounded-2xl p-4">
          <Info size={18} className="mt-0.5 shrink-0 text-[color:var(--brand-blue)]" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            A taxa de 5% é descontada automaticamente apenas no momento do saque. Nenhuma outra taxa é cobrada pela plataforma.
          </p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/70">
            Exemplos
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <span className="font-semibold uppercase tracking-wider text-white/70">
              Solicitação
            </span>
            <span className="font-semibold uppercase tracking-wider text-white/70">
              Taxa (5%)
            </span>
            <span className="font-semibold uppercase tracking-wider text-[color:var(--brand-blue)]">
              Você recebe
            </span>
          </div>
          <div className="mt-2 space-y-0">
            <Example request={10} />
            <div className="h-px bg-white/10" />
            <Example request={50} />
            <div className="h-px bg-white/10" />
            <Example request={100} />
          </div>
        </section>

        {error && (
          <p className="text-center text-xs font-medium text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting || locked}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          {submitting ? "Enviando…" : locked ? "Aguarde 24 horas" : "Solicitar Saque"}
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

function Example({ request }: { request: number }) {
  const fee = request * 0.05;
  const net = request - fee;
  return (
    <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs">
      <span className="text-white/90">
        {request.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </span>
      <span className="text-white/90">
        {fee.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </span>
      <span className="font-semibold text-[color:var(--brand-blue)]">
        {net.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </span>
    </div>
  );
}
