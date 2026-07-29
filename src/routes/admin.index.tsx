import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import {
  WITHDRAWAL_SELECT,
  statusMeta,
  type WithdrawalRow,
  type WithdrawalStatus,
} from "@/components/WithdrawTracking";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Painel Admin — Infinity Gain" },
      { name: "description", content: "Gerencie saques e atualize status em tempo real." },
    ],
  }),
  component: AdminPage,
});

type Row = WithdrawalRow & {
  user_id: string;
  profile?: { name: string | null; phone: string | null } | null;
};

const BRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const statusOptions: { value: WithdrawalStatus; label: string }[] = [
  { value: "requested", label: "Solicitado" },
  { value: "processing", label: "Aprovado (Processando)" },
  { value: "completed", label: "Concluído" },
  { value: "rejected", label: "Rejeitado" },
];


function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | WithdrawalStatus>("all");
  const [q, setQ] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
      .from("withdrawals")
      .select(`user_id, ${WITHDRAWAL_SELECT}`)
      .order("created_at", { ascending: false });

    const list = (data ?? []) as Row[];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, name, phone")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      for (const r of list) r.profile = map.get(r.user_id) ?? null;
    }
    setRows(list);
    setLoading(false);
  }

  useEffect(() => {
    if (!isAdmin) return;
    load();
    const ch = supabase
      .channel("admin-withdrawals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawals" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isAdmin]);

  async function updateStatus(id: string, status: WithdrawalStatus, reason?: string) {
    setUpdatingId(id);
    const { error } = await supabase.rpc("review_withdrawal", {
      _id: id,
      _status: status,
      _reason: reason ?? undefined,
    });
    if (error) alert("Falha ao atualizar: " + error.message);
    else await load();
    setUpdatingId(null);
  }


  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!term) return true;
      return (
        r.pix_key.toLowerCase().includes(term) ||
        (r.profile?.name ?? "").toLowerCase().includes(term) ||
        (r.profile?.phone ?? "").toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term)
      );
    });
  }, [rows, filter, q]);

  const counts = useMemo(() => {
    return {
      processing: rows.filter((r) => r.status === "processing").length,
      completed: rows.filter((r) => r.status === "completed").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
      pendingAmount: rows
        .filter((r) => r.status === "processing")
        .reduce((s, r) => s + Number(r.amount), 0),
    };
  }, [rows]);

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
          <h1 className="text-base font-semibold">Painel Admin</h1>
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
        <h1 className="text-base font-semibold">Painel Admin</h1>
        <button
          onClick={load}
          className="glass grid h-10 w-10 place-items-center rounded-full"
          aria-label="Atualizar"
        >
          <RefreshCw size={16} />
        </button>
      </header>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 rounded-full bg-brand-gradient px-3.5 py-1.5 text-xs font-semibold text-white shadow-glow">Saques</span>
        <Link to="/admin/tasks/$type" params={{ type: "rcs" }} className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Tarefas RCS</Link>
        <Link to="/admin/tasks/$type" params={{ type: "compartilhamento" }} className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Compartilhamento</Link>
        <Link to="/admin/referrals" className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">Indicados</Link>
      </nav>


      <section className="mt-5 grid grid-cols-2 gap-3">
        <StatBox label="Pendentes" value={String(counts.processing)} tone="blue" />
        <StatBox label="Valor pendente" value={BRL(counts.pendingAmount)} tone="pink" />
        <StatBox label="Concluídos" value={String(counts.completed)} tone="emerald" />
        <StatBox label="Rejeitados" value={String(counts.rejected)} tone="red" />
      </section>

      <section className="mt-5">
        <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2.5">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, PIX, telefone…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {(["all", "processing", "completed", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
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

      <section className="mt-5 space-y-3 pb-4">
        {loading ? (
          <div className="glass rounded-3xl px-4 py-6 text-center text-sm text-muted-foreground">
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-3xl px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum saque encontrado.
          </div>
        ) : (
          filtered.map((r) => {
            const meta = statusMeta[r.status];
            const Icon = meta.Icon;
            const busy = updatingId === r.id;
            return (
              <div key={r.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {r.profile?.name || "Usuário"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.profile?.phone || "—"} · {fmtDate(r.created_at)}
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
                  <Info label="Solicitado" value={BRL(Number(r.amount))} />
                  <Info label="Taxa" value={BRL(Number(r.fee))} />
                  <Info label="Líquido" value={BRL(Number(r.net_amount))} highlight />
                </div>

                <div className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2 text-xs">
                  <p className="text-muted-foreground">Chave PIX ({r.pix_type})</p>
                  <p className="mt-0.5 truncate font-mono text-white">{r.pix_key}</p>
                </div>

                <div className="mt-3 flex gap-2">
                  {r.status !== "completed" && (
                    <button
                      disabled={busy}
                      onClick={() => updateStatus(r.id, "completed")}
                      className="flex-1 rounded-xl bg-emerald-500/90 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Concluir
                    </button>
                  )}
                  {r.status !== "processing" && (
                    <button
                      disabled={busy}
                      onClick={() => updateStatus(r.id, "processing")}
                      className="flex-1 rounded-xl bg-[color:var(--brand-blue)]/90 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Processar
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button
                      disabled={busy}
                      onClick={() => updateStatus(r.id, "rejected")}
                      className="flex-1 rounded-xl bg-red-500/90 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Rejeitar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>
    </AppShell>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "pink" | "emerald" | "red";
}) {
  const color =
    tone === "blue" ? "#7aa5ff" : tone === "pink" ? "#ff9edb" : tone === "emerald" ? "#4ade80" : "#f87171";
  return (
    <div className="glass rounded-2xl p-3.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-extrabold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function Info({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
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
