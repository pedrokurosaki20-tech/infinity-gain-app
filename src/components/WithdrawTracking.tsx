import { CheckCircle2, Clock, Loader2, PartyPopper, Send, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export type WithdrawalStatus = "requested" | "processing" | "completed" | "rejected";

export type WithdrawalRow = {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  pix_key: string;
  pix_type: string;
  status: WithdrawalStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export const WITHDRAWAL_SELECT =
  "id, amount, fee, net_amount, pix_key, pix_type, status, rejection_reason, created_at, updated_at";

export const statusMeta: Record<
  WithdrawalStatus,
  { label: string; className: string; dot: string; Icon: typeof Clock }
> = {
  requested: {
    label: "Solicitado",
    className: "bg-[color:var(--brand-blue)]/15 text-[color:var(--brand-blue)]",
    dot: "var(--brand-blue)",
    Icon: Send,
  },
  processing: {
    label: "Processando",
    className: "bg-amber-500/15 text-amber-400",
    dot: "#fbbf24",
    Icon: Loader2,
  },
  completed: {
    label: "Concluído",
    className: "bg-emerald-500/15 text-emerald-400",
    dot: "#4ade80",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Rejeitado",
    className: "bg-red-500/15 text-red-400",
    dot: "#f87171",
    Icon: XCircle,
  },
};

export const BRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function useCountdown(target: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (target === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (target === null) return { remaining: 0, text: "00:00:00", done: true };
  const remaining = Math.max(0, target - now);
  const total = Math.floor(remaining / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return { remaining, text: `${h}:${m}:${s}`, done: remaining <= 0 };
}

function StepDot({
  state,
  color,
  Icon,
}: {
  state: "done" | "active" | "todo";
  color: string;
  Icon: typeof Clock;
}) {
  return (
    <div
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-all duration-500 ${
        state === "done"
          ? "border-transparent text-white animate-fade-up"
          : state === "active"
            ? "border-white/20 animate-pulse"
            : "border-white/10 bg-white/[0.04] text-muted-foreground"
      }`}
      style={
        state === "done"
          ? { background: color }
          : state === "active"
            ? { background: `${color}22`, color }
            : undefined
      }
    >
      {state === "done" ? <CheckCircle2 size={16} /> : <Icon size={15} />}
    </div>
  );
}

function Step({
  title,
  badge,
  badgeClass,
  description,
  extra,
  state,
  color,
  Icon,
  last,
}: {
  title: string;
  badge: string;
  badgeClass: string;
  description: string;
  extra?: React.ReactNode;
  state: "done" | "active" | "todo";
  color: string;
  Icon: typeof Clock;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <StepDot state={state} color={color} Icon={Icon} />
        {!last && (
          <div
            className="mt-1 w-px flex-1 rounded-full transition-all duration-500"
            style={{
              background:
                state === "done" ? color : "rgba(255,255,255,0.08)",
              minHeight: 22,
            }}
          />
        )}
      </div>
      <div className={`min-w-0 flex-1 pb-5 ${state === "todo" ? "opacity-50" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-white">{title}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
          >
            {badge}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
        {extra}
      </div>
    </div>
  );
}

function TimerPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5">
      <Clock size={12} className="text-[color:var(--brand-blue)]" />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-mono text-xs font-bold text-white">{value}</span>
    </div>
  );
}

export function WithdrawTracking({ item }: { item: WithdrawalRow }) {
  const requestedDeadline =
    item.status === "requested"
      ? new Date(item.created_at).getTime() + 24 * 3600 * 1000
      : null;
  const processingDeadline =
    item.status === "processing"
      ? new Date(item.updated_at).getTime() + 12 * 3600 * 1000
      : null;

  const requestedTimer = useCountdown(requestedDeadline);
  const processingTimer = useCountdown(processingDeadline);

  const order: WithdrawalStatus[] = ["requested", "processing", "completed"];
  const idx = order.indexOf(item.status);
  const rejected = item.status === "rejected";

  const stateFor = (i: number): "done" | "active" | "todo" => {
    if (rejected) return i === 0 ? "done" : "todo";
    if (idx > i) return "done";
    if (idx === i) return i === 2 ? "done" : "active";
    return "todo";
  };

  const progress = rejected ? 33 : ((idx + 1) / 3) * 100;

  return (
    <section className="glass rounded-3xl p-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">Acompanhamento do Saque</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusMeta[item.status].className}`}
        >
          {statusMeta[item.status].label}
        </span>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: rejected
              ? "#f87171"
              : "linear-gradient(90deg, var(--brand-blue), var(--brand-pink))",
          }}
        />
      </div>

      <div className="mt-5">
        <Step
          title="Saque solicitado"
          badge="Solicitado"
          badgeClass={statusMeta.requested.className}
          description="Sua solicitação foi recebida com sucesso."
          state={stateFor(0)}
          color="#1E5EFF"
          Icon={Send}
          extra={
            <>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tempo estimado: até 24 horas · {fmtDateTime(item.created_at)}
              </p>
              {item.status === "requested" && (
                <TimerPill label="Tempo restante" value={requestedTimer.text} />
              )}
            </>
          }
        />

        <Step
          title="Saque aprovado"
          badge="Processando"
          badgeClass={statusMeta.processing.className}
          description="Seu saque foi aprovado pela equipe e está sendo preparado para pagamento."
          state={stateFor(1)}
          color="#fbbf24"
          Icon={Loader2}
          extra={
            <>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tempo estimado: entre 6 e 12 horas.
              </p>
              {item.status === "processing" && (
                <TimerPill label="Tempo restante" value={processingTimer.text} />
              )}
            </>
          }
        />

        <Step
          title="Saque concluído"
          badge="Concluído"
          badgeClass={statusMeta.completed.className}
          description="🎉 Parabéns! Seu saque foi enviado com sucesso para sua chave PIX cadastrada."
          state={stateFor(2)}
          color="#22c55e"
          Icon={PartyPopper}
          last={!rejected}
          extra={
            item.status === "completed" ? (
              <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">
                    Pagamento enviado
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-white/80">
                  {fmtDateTime(item.updated_at)}
                </p>
                <p className="text-[11px] text-white/80">
                  Valor enviado: <strong>{BRL(Number(item.net_amount))}</strong>
                </p>
              </div>
            ) : null
          }
        />

        {rejected && (
          <Step
            title="Saque rejeitado"
            badge="Rejeitado"
            badgeClass={statusMeta.rejected.className}
            description="Seu saque não pôde ser processado."
            state="done"
            color="#ef4444"
            Icon={XCircle}
            last
            extra={
              <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400">
                  Motivo da rejeição
                </p>
                <p className="mt-1 text-xs text-white/90">
                  {item.rejection_reason || "Motivo não informado pela administração."}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  O valor solicitado foi devolvido ao seu saldo.
                </p>
              </div>
            }
          />
        )}
      </div>
    </section>
  );
}

export function NextWithdrawCountdown({ createdAt }: { createdAt: string }) {
  const target = new Date(createdAt).getTime() + 24 * 3600 * 1000;
  const { text, done } = useCountdown(target);
  if (done) return null;
  return (
    <section className="mt-6 glass rounded-3xl p-5 text-center animate-fade-up">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Próximo saque disponível em
      </p>
      <p className="mt-2 font-mono text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-brand-gradient">
        {text}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Você pode solicitar 1 saque a cada 24 horas.
      </p>
    </section>
  );
}
