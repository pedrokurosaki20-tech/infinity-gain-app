import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarCheck, RefreshCw, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/checkin")({
  head: () => ({
    meta: [
      { title: "Check-in Diário — Admin Infinity Gain" },
      {
        name: "description",
        content: "Configure recompensas, acompanhe ciclos e redefina o progresso do check-in diário.",
      },
    ],
  }),
  component: AdminCheckinPage,
});

const BRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type OverviewRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  current_day: number;
  cycles_completed: number;
  last_checkin_date: string | null;
  total_checkins: number;
  total_amount: number;
  checkins_today: number;
};

function AdminCheckinPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(true);
  const [rewards, setRewards] = useState<string[]>(["0.05", "0.05", "0.05", "0.05", "0.10", "0.10", "1.00"]);
  const [rows, setRows] = useState<OverviewRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate({ to: "/" });
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      setChecking(false);
    })();
  }, [navigate]);

  async function load() {
    setLoading(true);
    const [{ data: settings }, { data: overview }] = await Promise.all([
      supabase.from("checkin_settings").select("active, rewards").maybeSingle(),
      supabase.rpc("admin_checkin_overview"),
    ]);
    if (settings) {
      setActive(settings.active);
      const r = (settings.rewards ?? []).map((v) => Number(v).toFixed(2));
      if (r.length === 7) setRewards(r);
    }
    setRows((overview ?? []) as OverviewRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function save() {
    const nums = rewards.map((r) => Number(String(r).replace(",", ".")));
    if (nums.some((n) => !Number.isFinite(n) || n < 0 || n > 100)) {
      toast.error("Informe valores válidos entre 0 e 100.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_save_checkin_settings", {
      _rewards: nums,
      _active: active,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Configurações salvas.");
    load();
  }

  async function reset(userId: string) {
    const { error } = await supabase.rpc("admin_reset_checkin", { _user_id: userId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Progresso redefinido.");
    load();
  }

  if (checking) {
    return (
      <AppShell>
        <p className="mt-10 text-center text-sm text-muted-foreground">Verificando acesso…</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <p className="mt-10 text-center text-sm text-muted-foreground">Acesso restrito.</p>
      </AppShell>
    );
  }

  const checkinsToday = rows[0]?.checkins_today ?? 0;

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <Link to="/admin" className="glass grid h-10 w-10 place-items-center rounded-full" aria-label="Voltar">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold">Check-in Diário</h1>
        <button onClick={load} className="glass grid h-10 w-10 place-items-center rounded-full" aria-label="Atualizar">
          <RefreshCw size={16} />
        </button>
      </header>

      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <Link to="/admin/dashboard" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Dashboard</Link>
        <Link to="/admin" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Saques</Link>
        <Link to="/admin/tasks/$type" params={{ type: "rcs" }} className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Tarefas RCS</Link>
        <Link to="/admin/sharing" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Compartilhamentos</Link>
        <Link to="/admin/referrals" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Indicados</Link>
        <span className="shrink-0 rounded-full bg-brand-gradient px-3.5 py-1.5 text-xs font-semibold text-white">Check-in</span>
      </nav>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Check-ins hoje</p>
          <p className="mt-1 text-xl font-extrabold text-[color:var(--brand-blue)]">{checkinsToday}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Usuários ativos</p>
          <p className="mt-1 text-xl font-extrabold text-[color:var(--brand-pink)]">{rows.length}</p>
        </div>
      </section>

      <section className="glass mt-4 rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <CalendarCheck size={16} /> Recompensas por dia
          </h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativo
          </label>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {rewards.map((v, i) => (
            <div key={i}>
              <label className="text-[10px] text-muted-foreground">Dia {i + 1}</label>
              <input
                value={v}
                inputMode="decimal"
                onChange={(e) => {
                  const next = [...rewards];
                  next[i] = e.target.value;
                  setRewards(next);
                }}
                className="mt-1 w-full rounded-xl bg-white/5 px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-[color:var(--brand-blue)]"
              />
            </div>
          ))}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient py-3 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? "Salvando…" : "Salvar configurações"}
        </button>
      </section>

      <section className="mt-6 pb-4">
        <h2 className="mb-3 text-sm font-bold">Progresso dos usuários</h2>
        {loading ? (
          <div className="glass rounded-3xl px-4 py-6 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="glass rounded-3xl px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum check-in registrado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.user_id} className="glass rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.name || "Sem nome"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{r.email}</p>
                  </div>
                  <button
                    onClick={() => reset(r.user_id)}
                    className="glass flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"
                  >
                    <RotateCcw size={12} /> Redefinir
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <Mini label="Dia atual" value={String(r.current_day)} />
                  <Mini label="Ciclos" value={String(r.cycles_completed)} />
                  <Mini label="Check-ins" value={String(r.total_checkins)} />
                  <Mini label="Total" value={BRL(Number(r.total_amount))} />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Último check-in: {r.last_checkin_date ?? "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-2 py-2">
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-semibold">{value}</p>
    </div>
  );
}
