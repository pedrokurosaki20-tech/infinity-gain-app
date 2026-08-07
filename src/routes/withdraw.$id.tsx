import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Copy, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { WithdrawReceipt } from "@/components/WithdrawReceipt";
import { supabase } from "@/integrations/supabase/client";
import {
  BRL,
  NextWithdrawCountdown,
  WITHDRAWAL_SELECT,
  WithdrawTracking,
  statusMeta,
  type WithdrawalRow,
} from "@/components/WithdrawTracking";

export const Route = createFileRoute("/withdraw/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do Saque — Infinity Gain" },
      {
        name: "description",
        content: "Acompanhe o status do seu saque em tempo real.",
      },
    ],
  }),
  component: WithdrawDetailPage,
});

function WithdrawDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<WithdrawalRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("withdrawals")
        .select(WITHDRAWAL_SELECT)
        .eq("id", id)
        .maybeSingle()
        .returns<WithdrawalRow>();
      if (!active) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setItem(data);
      }
      setLoading(false);
    }

    async function loadName() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", u.user.id)
        .maybeSingle();
      if (active) setUserName(p?.name ?? null);
    }

    load();
    loadName();

    const channel = supabase
      .channel(`withdrawal:${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "withdrawals",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (!active) return;
          setItem((prev) => ({ ...(prev ?? {}), ...(payload.new as WithdrawalRow) }));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  async function handleCopy() {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="mt-20 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="animate-spin" size={22} />
          <p className="text-sm">Carregando saque…</p>
        </div>
      </AppShell>
    );
  }

  if (notFound || !item) {
    return (
      <AppShell>
        <header className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/wallet" })}
            className="glass grid h-10 w-10 place-items-center rounded-full"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-semibold">Detalhes do Saque</h1>
          <span className="w-10" />
        </header>
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Este saque não foi encontrado.
          </p>
          <Link
            to="/wallet"
            className="mt-4 inline-flex rounded-2xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow"
          >
            Voltar para a Carteira
          </Link>
        </div>
      </AppShell>
    );
  }

  const meta = statusMeta[item.status];
  const StatusIcon = meta.Icon;

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
        <h1 className="text-base font-semibold">Detalhes do Saque</h1>
        <span className="w-10" />
      </header>

      <section className="mt-6 rounded-3xl bg-card-gradient p-6 shadow-glow border border-white/10 animate-fade-up">
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}
        >
          <StatusIcon size={12} />
          {meta.label}
          {(item.status === "processing" || item.status === "requested") && (
            <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          )}
        </div>
        <p className="mt-4 text-xs uppercase tracking-widest text-white/70">
          Valor solicitado
        </p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">
          {BRL(Number(item.amount))}
        </p>
      </section>

      <NextWithdrawCountdown createdAt={item.created_at} />

      <div className="mt-4">
        <WithdrawTracking item={item} />
      </div>

      <section className="mt-4 animate-fade-up">
        <div className="glass rounded-3xl p-5">
          <h2 className="text-sm font-bold">Resumo</h2>
          <div className="mt-3 space-y-2.5 text-sm">
            <Row label="Valor bruto" value={BRL(Number(item.amount))} />
            <Row label="Taxa (5%)" value={`− ${BRL(Number(item.fee))}`} muted />
            <div className="h-px bg-white/10" />
            <Row
              label="Você recebe"
              value={BRL(Number(item.net_amount))}
              highlight
            />
          </div>
        </div>
      </section>

      <section className="mt-4 animate-fade-up">
        <div className="glass rounded-3xl p-5">
          <h2 className="text-sm font-bold">Destino</h2>
          <div className="mt-3 space-y-2.5 text-sm">
            <Row label="Tipo de chave" value={item.pix_type} />
            <Row label="Chave PIX" value={item.pix_key} />
          </div>
        </div>
      </section>

      <section className="mt-4 animate-fade-up">
        <button
          onClick={handleCopy}
          className="glass flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-sm"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[color:var(--brand-blue)]" />
            <span className="text-muted-foreground">ID do saque</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-white/80">
              {item.id.slice(0, 8)}…{item.id.slice(-4)}
            </span>
            <Copy size={14} className="text-muted-foreground" />
          </div>
        </button>
        {copied && (
          <p className="mt-2 text-center text-[11px] text-[color:var(--brand-blue)]">
            ID copiado
          </p>
        )}
      </section>
    </AppShell>
  );
}

function Row({
  label,
  value,
  muted,
  highlight,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          highlight
            ? "text-base font-bold text-[color:var(--brand-blue)]"
            : muted
              ? "text-white/80"
              : "font-medium text-white"
        }
      >
        {value}
      </span>
    </div>
  );
}
