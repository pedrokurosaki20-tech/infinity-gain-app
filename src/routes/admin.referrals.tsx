import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  Loader2,
  PauseCircle,
  Search,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/referrals")({
  head: () => ({
    meta: [
      { title: "Indicados — Infinity Gain" },
      { name: "description", content: "Gestão de indicações, validações e antifraude." },
    ],
  }),
  component: AdminReferralsPage,
});

type ReferralRow =
  Database["public"]["Functions"]["admin_list_referrals"]["Returns"][number];

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const statusMeta: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-amber-500/15 text-amber-300" },
  valid: { label: "Válido", className: "bg-emerald-500/15 text-emerald-300" },
  rejected: { label: "Rejeitado", className: "bg-red-500/15 text-red-300" },
  suspicious: { label: "Suspeito", className: "bg-orange-500/15 text-orange-300" },
};

const accountMeta: Record<string, { label: string; className: string }> = {
  active: { label: "Conta ativa", className: "text-emerald-300" },
  suspended: { label: "Suspenso", className: "text-amber-300" },
  blocked: { label: "Bloqueado", className: "text-red-300" },
};

function AdminReferralsPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "valid" | "rejected" | "suspicious">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_referrals");
    if (error) setErro(error.message);
    setRows((data ?? []) as ReferralRow[]);
  }, []);

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

  useEffect(() => {
    if (!isAdmin) return;
    load();
    const channel = supabase
      .channel("admin-referrals")
      .on("postgres_changes", { event: "*", schema: "public", table: "referrals" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!term) return true;
      return (
        (r.referred_name ?? "").toLowerCase().includes(term) ||
        (r.referred_email ?? "").toLowerCase().includes(term) ||
        (r.referred_phone ?? "").toLowerCase().includes(term) ||
        (r.referrer_name ?? "").toLowerCase().includes(term) ||
        (r.invite_code ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, q, filter]);

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.status === "pending").length,
      valid: rows.filter((r) => r.status === "valid").length,
      suspicious: rows.filter((r) => r.status === "suspicious").length,
    }),
    [rows],
  );

  async function review(id: string, action: "approve" | "reject") {
    setBusy(id);
    setErro(null);
    const { error } = await supabase.rpc("admin_review_referral", {
      _id: id,
      _action: action,
      _reason: reason[id] || undefined,
    });
    if (error) setErro(error.message);
    await load();
    setBusy(null);
  }

  async function setAccount(
    userId: string,
    id: string,
    status: Database["public"]["Enums"]["account_status"],
  ) {
    setBusy(id);
    setErro(null);
    const { error } = await supabase.rpc("admin_set_account_status", {
      _user_id: userId,
      _status: status,
      _reason: reason[id] || undefined,
    });
    if (error) setErro(error.message);
    await load();
    setBusy(null);
  }

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
        <div className="glass mt-10 rounded-3xl p-6 text-center">
          <ShieldCheck className="mx-auto mb-3 text-[color:var(--brand-pink)]" size={28} />
          <p className="text-sm font-semibold">Acesso restrito</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <Link to="/admin" className="glass grid h-10 w-10 place-items-center rounded-full" aria-label="Voltar">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold">Indicações</h1>
        <span className="w-10" />
      </header>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
        <Link to="/admin" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Saques</Link>
        <Link to="/admin/tasks/$type" params={{ type: "rcs" }} className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Tarefas RCS</Link>
        <Link to="/admin/sharing" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Compartilhamentos</Link>
        <Link to="/admin/checkin" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Check-in</Link>
        <span className="shrink-0 rounded-full bg-brand-gradient px-3.5 py-1.5 text-xs font-semibold text-white shadow-glow">Indicados</span>
      </nav>

      <section className="mt-5 grid grid-cols-3 gap-2">
        <div className="glass rounded-2xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Pendentes</p>
          <p className="mt-1 text-lg font-extrabold text-amber-300">{counts.pending}</p>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Válidos</p>
          <p className="mt-1 text-lg font-extrabold text-emerald-300">{counts.valid}</p>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Suspeitos</p>
          <p className="mt-1 text-lg font-extrabold text-orange-300">{counts.suspicious}</p>
        </div>
      </section>

      <section className="mt-4">
        <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2.5">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por indicado, indicador ou código…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {(["all", "pending", "valid", "suspicious", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                filter === f
                  ? "bg-brand-gradient text-white shadow-glow"
                  : "glass text-muted-foreground"
              }`}
            >
              {f === "all" ? "Todos" : statusMeta[f].label}
            </button>
          ))}
        </div>
      </section>

      {erro && (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          {erro}
        </p>
      )}

      <section className="mt-5 space-y-3 pb-4">
        {filtered.length === 0 ? (
          <div className="glass rounded-3xl px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhuma indicação encontrada.
          </div>
        ) : (
          filtered.map((r) => {
            const st = statusMeta[r.status] ?? statusMeta.pending;
            const acc = accountMeta[r.account_status] ?? accountMeta.active;
            return (
              <article key={r.id} className="glass rounded-3xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.referred_name || "Usuário"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{r.referred_email || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{r.referred_phone || "—"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${st.className}`}>
                    {st.label}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <p>
                    Indicador: <span className="text-white">{r.referrer_name || "—"}</span>
                  </p>
                  <p>
                    Código: <span className="font-mono text-white">{r.invite_code || "—"}</span>
                  </p>
                  <p>Cadastro: {fmtDate(r.created_at)}</p>
                  <p>1ª tarefa: {fmtDate(r.first_task_at)}</p>
                </div>

                <p className={`mt-2 text-[11px] font-semibold ${acc.className}`}>{acc.label}</p>

                {r.fraud_reason && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-2xl bg-orange-500/10 px-3 py-2 text-[11px] text-orange-300">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    Antifraude: {r.fraud_reason}
                  </p>
                )}
                {r.review_reason && (
                  <p className="mt-2 rounded-2xl bg-white/5 px-3 py-2 text-[11px] text-muted-foreground">
                    Motivo: {r.review_reason}
                  </p>
                )}

                <input
                  value={reason[r.id] ?? ""}
                  onChange={(e) => setReason((p) => ({ ...p, [r.id]: e.target.value }))}
                  placeholder="Motivo (opcional)"
                  className="mt-3 w-full rounded-2xl bg-white/5 px-3 py-2.5 text-xs outline-none placeholder:text-muted-foreground"
                />

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => review(r.id, "approve")}
                    disabled={busy === r.id}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-gradient text-xs font-semibold text-white shadow-glow disabled:opacity-60"
                  >
                    {busy === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Aprovar
                  </button>
                  <button
                    onClick={() => review(r.id, "reject")}
                    disabled={busy === r.id}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white/10 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    <X size={14} /> Rejeitar
                  </button>
                  {r.account_status === "active" ? (
                    <>
                      <button
                        onClick={() => setAccount(r.referred_id, r.id, "suspended")}
                        disabled={busy === r.id}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 text-xs font-semibold text-amber-300 disabled:opacity-60"
                      >
                        <PauseCircle size={14} /> Suspender
                      </button>
                      <button
                        onClick={() => setAccount(r.referred_id, r.id, "blocked")}
                        disabled={busy === r.id}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-red-500/15 text-xs font-semibold text-red-300 disabled:opacity-60"
                      >
                        <Ban size={14} /> Bloquear
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setAccount(r.referred_id, r.id, "active")}
                      disabled={busy === r.id}
                      className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 text-xs font-semibold text-emerald-300 disabled:opacity-60"
                    >
                      <UserCheck size={14} /> Reativar conta
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
