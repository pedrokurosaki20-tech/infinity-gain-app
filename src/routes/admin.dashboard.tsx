import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Admin Infinity Gain" },
      {
        name: "description",
        content:
          "Métricas em tempo real de usuários, financeiro, tarefas, indicações e check-in da Infinity Gain.",
      },
      { property: "og:title", content: "Dashboard — Admin Infinity Gain" },
      {
        property: "og:description",
        content: "Painel administrativo com métricas em tempo real da Infinity Gain.",
      },
    ],
  }),
  component: AdminDashboardPage,
});

const BRL = (v: number) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Metrics = {
  range: { from: string; to: string };
  users: { total: number; in_range: number; new_today: number; blocked: number; suspended: number };
  active_today: number;
  blocked_recent: {
    id: string;
    name: string | null;
    email: string | null;
    status: string;
    reason: string | null;
    at: string;
  }[];
  finance: { distributed: number };
  withdrawals: {
    total: number;
    in_range: number;
    pending: number;
    processing: number;
    completed: number;
    rejected: number;
    paid_today: number;
    paid_week: number;
    paid_month: number;
    paid_range: number;
  };
  tasks: {
    share_pending: number;
    share_approved: number;
    share_rejected: number;
    rcs_pending: number;
    rcs_approved: number;
    rcs_rejected: number;
    sent_today: number;
    sent_range: number;
    pending_total: number;
  };
  referrals: { total: number; valid: number; pending: number; suspicious: number; in_range: number };
  referral_bonus: { today: number; week: number };
  checkin: { today: number; total_amount: number; range_amount: number };
  series: {
    day: string;
    users: number;
    paid: number;
    withdrawals: number;
    approved: number;
    rejected: number;
  }[];
};

type Preset = "today" | "yesterday" | "7d" | "30d" | "custom";

const isoDay = (d: Date) => {
  const sp = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${sp.getFullYear()}-${String(sp.getMonth() + 1).padStart(2, "0")}-${String(sp.getDate()).padStart(2, "0")}`;
};
const shiftDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoDay(d);
};

function rangeFor(preset: Preset, from: string, to: string) {
  switch (preset) {
    case "today":
      return { from: shiftDays(0), to: shiftDays(0) };
    case "yesterday":
      return { from: shiftDays(-1), to: shiftDays(-1) };
    case "7d":
      return { from: shiftDays(-6), to: shiftDays(0) };
    case "30d":
      return { from: shiftDays(-29), to: shiftDays(0) };
    default:
      return { from, to };
  }
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Metrics | null>(null);
  const [preset, setPreset] = useState<Preset>("7d");
  const [from, setFrom] = useState(shiftDays(-6));
  const [to, setTo] = useState(shiftDays(0));
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate({ to: "/" });
        return;
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!role);
      setChecking(false);
    })();
  }, [navigate]);

  const load = useCallback(async () => {
    const r = rangeFor(preset, from, to);
    setLoading(true);
    const { data: res, error } = await supabase.rpc("admin_dashboard_metrics", {
      _from: r.from,
      _to: r.to,
    });
    if (!error && res) setData(res as unknown as Metrics);
    setUpdatedAt(new Date());
    setLoading(false);
  }, [preset, from, to]);

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, load]);

  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase
      .channel("admin-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "referrals" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "checkin_history" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isAdmin, load]);

  const alerts = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Saques aguardando aprovação",
        value: data.withdrawals.pending + data.withdrawals.processing,
        to: "/admin" as const,
      },
      { label: "Tarefas aguardando análise", value: data.tasks.pending_total, to: "/admin/sharing" as const },
      { label: "Convites suspeitos de fraude", value: data.referrals.suspicious, to: "/admin/referrals" as const },
      { label: "Usuários bloqueados/suspensos (7 dias)", value: data.blocked_recent.length, to: "/admin/referrals" as const },
    ];
  }, [data]);

  if (checking) {
    return (
      <AppShell>
        <div className="mt-20 text-center text-sm text-muted-foreground">Verificando acesso…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <header className="flex items-center justify-between">
          <Link to="/profile" className="glass grid h-10 w-10 place-items-center rounded-full" aria-label="Voltar">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-base font-semibold">Dashboard</h1>
          <span className="w-10" />
        </header>
        <div className="glass mt-10 rounded-3xl p-6 text-center">
          <ShieldCheck className="mx-auto mb-3 text-[color:var(--brand-pink)]" size={28} />
          <p className="text-sm font-semibold">Acesso restrito</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sua conta não possui permissão de administrador.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <Link to="/profile" className="glass grid h-10 w-10 place-items-center rounded-full" aria-label="Voltar">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold">Dashboard</h1>
        <button onClick={load} className="glass grid h-10 w-10 place-items-center rounded-full" aria-label="Atualizar agora">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 rounded-full bg-brand-gradient px-3.5 py-1.5 text-xs font-semibold text-white shadow-glow">Dashboard</span>
        <Link to="/admin" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Saques</Link>
        <Link to="/admin/tasks/$type" params={{ type: "rcs" }} className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Tarefas RCS</Link>
        <Link to="/admin/sharing" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Compartilhamentos</Link>
        <Link to="/admin/referrals" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Indicados</Link>
        <Link to="/admin/checkin" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Check-in</Link>
        <Link to="/admin/notifications" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Notificações</Link>
      </nav>

      <section className="mt-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              ["today", "Hoje"],
              ["yesterday", "Ontem"],
              ["7d", "Últimos 7 dias"],
              ["30d", "Últimos 30 dias"],
              ["custom", "Personalizado"],
            ] as [Preset, string][]
          ).map(([p, label]) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                preset === p ? "bg-brand-gradient text-white shadow-glow" : "glass text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="glass mt-3 grid grid-cols-2 gap-2 rounded-2xl p-3 animate-fade-up">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              De
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none"
              />
            </label>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Até
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none"
              />
            </label>
          </div>
        )}
        <button
          onClick={load}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-2.5 text-xs font-semibold text-white shadow-glow"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Atualizar agora
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          {updatedAt ? `Atualizado às ${updatedAt.toLocaleTimeString("pt-BR")} · tempo real ativo` : "Carregando…"}
        </p>
      </section>

      {!data ? (
        <div className="glass mt-5 rounded-3xl px-4 py-8 text-center text-sm text-muted-foreground">
          Carregando métricas…
        </div>
      ) : (
        <>
          <Alerts alerts={alerts} />

          <Group title="Usuários">
            <Stat label="Total cadastrados" value={String(data.users.total)} tone="blue" />
            <Stat label="Novos hoje" value={String(data.users.new_today)} tone="pink" />
            <Stat label="Ativos hoje" value={String(data.active_today)} tone="emerald" />
            <Stat label="Novos no período" value={String(data.users.in_range)} tone="blue" />
            <Stat label="Bloqueados" value={String(data.users.blocked)} tone="red" />
            <Stat label="Suspensos" value={String(data.users.suspended)} tone="amber" />
          </Group>

          <Group title="Financeiro">
            <Stat label="Saldo total distribuído" value={BRL(data.finance.distributed)} tone="emerald" />
            <Stat label="Pago hoje" value={BRL(data.withdrawals.paid_today)} tone="blue" />
            <Stat label="Pago na semana" value={BRL(data.withdrawals.paid_week)} tone="pink" />
            <Stat label="Pago no mês" value={BRL(data.withdrawals.paid_month)} tone="emerald" />
            <Stat label="Pago no período" value={BRL(data.withdrawals.paid_range)} tone="blue" />
            <Stat label="Saques solicitados" value={String(data.withdrawals.total)} tone="blue" />
            <Stat label="Pendentes" value={String(data.withdrawals.pending)} tone="amber" />
            <Stat label="Aprovados (processando)" value={String(data.withdrawals.processing)} tone="blue" />
            <Stat label="Concluídos" value={String(data.withdrawals.completed)} tone="emerald" />
            <Stat label="Rejeitados" value={String(data.withdrawals.rejected)} tone="red" />
          </Group>

          <Group title="Tarefas">
            <Stat label="Compart. pendentes" value={String(data.tasks.share_pending)} tone="amber" />
            <Stat label="Compart. aprovados" value={String(data.tasks.share_approved)} tone="emerald" />
            <Stat label="Compart. reprovados" value={String(data.tasks.share_rejected)} tone="red" />
            <Stat label="RCS pendentes" value={String(data.tasks.rcs_pending)} tone="amber" />
            <Stat label="RCS aprovados" value={String(data.tasks.rcs_approved)} tone="emerald" />
            <Stat label="RCS reprovados" value={String(data.tasks.rcs_rejected)} tone="red" />
            <Stat label="Enviadas hoje" value={String(data.tasks.sent_today)} tone="blue" />
            <Stat label="Enviadas no período" value={String(data.tasks.sent_range)} tone="pink" />
          </Group>

          <Group title="Indique & Ganhe">
            <Stat label="Convites enviados" value={String(data.referrals.total)} tone="blue" />
            <Stat label="Convites aprovados" value={String(data.referrals.valid)} tone="emerald" />
            <Stat label="Convites pendentes" value={String(data.referrals.pending)} tone="amber" />
            <Stat label="Suspeitos" value={String(data.referrals.suspicious)} tone="red" />
            <Stat label="Bônus pagos hoje" value={BRL(data.referral_bonus.today)} tone="pink" />
            <Stat label="Bônus pagos na semana" value={BRL(data.referral_bonus.week)} tone="emerald" />
          </Group>

          <Group title="Check-in">
            <Stat label="Check-ins hoje" value={String(data.checkin.today)} tone="blue" />
            <Stat label="Recompensas pagas (total)" value={BRL(data.checkin.total_amount)} tone="emerald" />
            <Stat label="Recompensas no período" value={BRL(data.checkin.range_amount)} tone="pink" />
          </Group>

          <section className="mt-7 space-y-4 pb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Gráficos</h2>
            <Chart
              title="Novos usuários por dia"
              series={[{ color: "#7aa5ff", values: data.series.map((s) => s.users) }]}
              labels={data.series.map((s) => s.day)}
            />
            <Chart
              title="Pagamentos por dia (R$)"
              series={[{ color: "#4ade80", values: data.series.map((s) => Number(s.paid)) }]}
              labels={data.series.map((s) => s.day)}
              money
            />
            <Chart
              title="Tarefas aprovadas x reprovadas"
              series={[
                { color: "#4ade80", values: data.series.map((s) => s.approved) },
                { color: "#f87171", values: data.series.map((s) => s.rejected) },
              ]}
              labels={data.series.map((s) => s.day)}
            />
            <Chart
              title="Saques realizados por dia"
              series={[{ color: "#ff9edb", values: data.series.map((s) => s.withdrawals) }]}
              labels={data.series.map((s) => s.day)}
            />
          </section>
        </>
      )}
    </AppShell>
  );
}

function Alerts({ alerts }: { alerts: { label: string; value: number; to: string }[] }) {
  return (
    <section className="mt-6 rounded-3xl border border-[color:var(--brand-pink)]/25 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(255,102,196,0.16),rgba(30,94,255,0.10))] p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-[color:var(--brand-pink)]" />
        <h2 className="text-sm font-bold">Alertas</h2>
      </div>
      <div className="mt-3 space-y-2">
        {alerts.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="glass flex items-center justify-between rounded-2xl px-3.5 py-2.5"
          >
            <span className="text-xs text-muted-foreground">{a.label}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                a.value > 0 ? "bg-brand-gradient text-white shadow-glow" : "text-muted-foreground"
              }`}
            >
              {a.value}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

const tones: Record<string, string> = {
  blue: "#7aa5ff",
  pink: "#ff9edb",
  emerald: "#4ade80",
  red: "#f87171",
  amber: "#fbbf24",
};

function Stat({ label, value, tone }: { label: string; value: string; tone: keyof typeof tones }) {
  return (
    <div className="glass rounded-2xl p-3.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-extrabold" style={{ color: tones[tone] }}>
        {value}
      </p>
    </div>
  );
}

function Chart({
  title,
  series,
  labels,
  money,
}: {
  title: string;
  series: { color: string; values: number[] }[];
  labels: string[];
  money?: boolean;
}) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const n = labels.length;
  const total = series[0]?.values.reduce((a, b) => a + b, 0) ?? 0;
  return (
    <div className="glass rounded-3xl p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-[10px] text-muted-foreground">
          {money ? BRL(total) : `${total} no período`}
        </p>
      </div>
      <div className="mt-3 flex h-28 items-end gap-[3px]">
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className="flex h-full flex-1 items-end gap-[2px]">
            {series.map((s, si) => (
              <div
                key={si}
                className="w-full rounded-t-md transition-all"
                style={{
                  height: `${Math.max(2, (Number(s.values[i] ?? 0) / max) * 100)}%`,
                  background: `linear-gradient(180deg, ${s.color}, ${s.color}44)`,
                }}
                title={`${labels[i]}: ${money ? BRL(Number(s.values[i] ?? 0)) : s.values[i]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
        <span>{labels[0]?.slice(5).split("-").reverse().join("/")}</span>
        <span>{labels[n - 1]?.slice(5).split("-").reverse().join("/")}</span>
      </div>
    </div>
  );
}
