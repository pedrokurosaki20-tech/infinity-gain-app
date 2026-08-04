import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Clock, RefreshCw, Search, XCircle, ShieldCheck, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/tasks/$type")({
  beforeLoad: ({ params }) => {
    if (params.type !== "rcs") throw redirect({ to: "/admin/sharing" });
  },
  head: () => ({
    meta: [
      { title: "Validar Tarefas — Infinity Gain" },
      { name: "description", content: "Aprove ou rejeite comprovantes enviados pelos usuários." },
    ],
  }),
  component: AdminTasksPage,
});

type SubmissionStatus = "pending" | "approved" | "rejected";
type TaskType = "rcs" | "compartilhamento";

type Row = {
  id: string;
  user_id: string;
  task_type: TaskType;
  proof_path: string;
  link: string | null;
  platform: string | null;
  status: SubmissionStatus;
  reward_amount: number;
  rejection_reason: string | null;
  created_at: string;
  profile?: { name: string | null; phone: string | null } | null;
  proof_url?: string;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const statusMeta: Record<SubmissionStatus, { label: string; className: string; Icon: typeof Clock }> = {
  pending: { label: "Pendente", className: "bg-[color:var(--brand-blue)]/15 text-[color:var(--brand-blue)]", Icon: Clock },
  approved: { label: "Aprovado", className: "bg-emerald-500/15 text-emerald-400", Icon: CheckCircle2 },
  rejected: { label: "Rejeitado", className: "bg-red-500/15 text-red-400", Icon: XCircle },
};

const titleFor = (t: TaskType) => (t === "rcs" ? "Validar RCS" : "Validar Compartilhamento");

function AdminTasksPage() {
  const { type } = Route.useParams();
  const taskType = type as TaskType;
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | SubmissionStatus>("pending");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rewardFor, setRewardFor] = useState<string | null>(null);

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
    const { data } = await supabase
      .from("task_submissions")
      .select("id, user_id, task_type, proof_path, link, platform, status, reward_amount, rejection_reason, created_at")
      .eq("task_type", taskType)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Row[];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, name, phone").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      for (const r of list) r.profile = map.get(r.user_id) ?? null;
    }
    // Signed URLs for previews
    await Promise.all(
      list.map(async (r) => {
        const { data: sig } = await supabase.storage.from("task-proofs").createSignedUrl(r.proof_path, 3600);
        r.proof_url = sig?.signedUrl;
      })
    );
    setRows(list);
    setLoading(false);
  }

  useEffect(() => {
    if (!isAdmin) return;
    load();
    const ch = supabase
      .channel(`admin-tasks-${taskType}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, taskType]);

  async function review(id: string, approve: boolean, amount?: number) {
    setBusyId(id);
    const { error } = await supabase.rpc("review_task_submission", {
      _id: id,
      _approve: approve,
      _amount: approve && taskType === "compartilhamento" ? (amount ?? 0.5) : undefined,
    });
    if (error) alert("Falha: " + error.message);
    else setRewardFor(null);
    setBusyId(null);
  }


  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!term) return true;
      return (
        (r.profile?.name ?? "").toLowerCase().includes(term) ||
        (r.profile?.phone ?? "").toLowerCase().includes(term) ||
        (r.link ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, filter, q]);

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
        <h1 className="text-base font-semibold">{titleFor(taskType)}</h1>
        <button onClick={load} className="glass grid h-10 w-10 place-items-center rounded-full" aria-label="Atualizar">
          <RefreshCw size={16} />
        </button>
      </header>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
        <Link to="/admin" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Saques</Link>
        <Link to="/admin/tasks/$type" params={{ type: "rcs" }} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${taskType === "rcs" ? "bg-brand-gradient text-white shadow-glow" : "glass text-muted-foreground"}`}>Tarefas RCS</Link>
        <Link to="/admin/sharing" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Compartilhamentos</Link>
        <Link to="/admin/referrals" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Indicados</Link>
        <Link to="/admin/checkin" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Check-in</Link>
      </nav>

      <section className="mt-5">
        <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2.5">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, telefone ou link…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filter === f ? "bg-brand-gradient text-white shadow-glow" : "glass text-muted-foreground"}`}
            >
              {f === "all" ? "Todos" : statusMeta[f].label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 space-y-3 pb-4">
        {loading ? (
          <div className="glass rounded-3xl px-4 py-6 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-3xl px-4 py-8 text-center text-sm text-muted-foreground">Nenhum envio encontrado.</div>
        ) : (
          filtered.map((r) => {
            const meta = statusMeta[r.status];
            const Icon = meta.Icon;
            const busy = busyId === r.id;
            return (
              <div key={r.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.profile?.name || "Usuário"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.profile?.phone || "—"} · {fmtDate(r.created_at)}
                    </p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>
                    <Icon size={10} />
                    {meta.label}
                  </span>
                </div>

                {r.platform && (
                  <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                    Plataforma: <span className="text-white/90">{r.platform}</span>
                  </p>
                )}

                {r.link && (
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-[color:var(--brand-blue)] hover:underline"
                  >
                    <ExternalLink size={12} /> Abrir link da publicação
                  </a>
                )}

                {r.proof_url && (
                  <a href={r.proof_url} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-2xl border border-white/10">
                    <img src={r.proof_url} alt="Comprovante" className="max-h-72 w-full object-contain bg-black/40" />
                  </a>
                )}

                {r.status === "rejected" && r.rejection_reason && (
                  <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    Motivo: {r.rejection_reason}
                  </p>
                )}

                {r.status === "approved" && (
                  <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    Creditado: R$ {Number(r.reward_amount).toFixed(2).replace(".", ",")}
                  </p>
                )}

                {r.status === "pending" && (
                  <>
                    {rewardFor === r.id && taskType === "compartilhamento" ? (
                      <div className="mt-3">
                        <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                          Escolha a recompensa
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {[0.3, 0.5, 0.7, 1].map((v) => (
                            <button
                              key={v}
                              disabled={busy}
                              onClick={() => review(r.id, true, v)}
                              className="rounded-xl bg-emerald-500/90 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              R$ {v.toFixed(2).replace(".", ",")}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setRewardFor(null)}
                          className="mt-2 w-full rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-muted-foreground"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <button
                          disabled={busy}
                          onClick={() =>
                            taskType === "compartilhamento"
                              ? setRewardFor(r.id)
                              : review(r.id, true)
                          }
                          className="flex-1 rounded-xl bg-emerald-500/90 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Aprovar
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => review(r.id, false)}
                          className="flex-1 rounded-xl bg-red-500/90 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Reprovar
                        </button>
                      </div>
                    )}
                  </>
                )}

              </div>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
