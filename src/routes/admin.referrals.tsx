import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Search, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/referrals")({
  head: () => ({
    meta: [
      { title: "Indicados — Infinity Gain" },
      { name: "description", content: "Histórico de usuários cadastrados por código de convite." },
    ],
  }),
  component: AdminReferralsPage,
});

type Profile = {
  id: string;
  name: string | null;
  phone: string | null;
  invite_code: string | null;
  referred_by: string | null;
  created_at: string;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function AdminReferralsPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);

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
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, phone, invite_code, referred_by, created_at")
        .order("created_at", { ascending: false });
      setProfiles((data ?? []) as Profile[]);
    })();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return profiles.slice(0, 30);
    return profiles.filter(
      (p) =>
        (p.name ?? "").toLowerCase().includes(term) ||
        (p.phone ?? "").toLowerCase().includes(term) ||
        (p.invite_code ?? "").toLowerCase().includes(term),
    );
  }, [profiles, q]);

  const invitees = useMemo(() => {
    if (!selected?.invite_code) return [] as Profile[];
    const code = selected.invite_code.toLowerCase();
    return profiles.filter((p) => (p.referred_by ?? "").toLowerCase() === code);
  }, [profiles, selected]);

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
        <Link
          to="/admin"
          className="glass grid h-10 w-10 place-items-center rounded-full"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold">Indicados</h1>
        <span className="w-10" />
      </header>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
        <Link
          to="/admin"
          className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground"
        >
          Saques
        </Link>
        <Link
          to="/admin/tasks/$type"
          params={{ type: "rcs" }}
          className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground"
        >
          Tarefas RCS
        </Link>
        <Link
          to="/admin/tasks/$type"
          params={{ type: "compartilhamento" }}
          className="glass shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground"
        >
          Compartilhamento
        </Link>
        <span className="shrink-0 rounded-full bg-brand-gradient px-3.5 py-1.5 text-xs font-semibold text-white shadow-glow">
          Indicados
        </span>
      </nav>

      <section className="mt-5">
        <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2.5">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelected(null);
            }}
            placeholder="Buscar usuário por nome, telefone ou código…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </section>

      {!selected && (
        <section className="mt-5 space-y-2 pb-4">
          {filtered.length === 0 ? (
            <div className="glass rounded-3xl px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum usuário encontrado.
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="glass flex w-full items-center justify-between rounded-2xl p-3 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.name || "Usuário"}</p>
                  <p className="text-[11px] text-muted-foreground">{p.phone || "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Código
                  </p>
                  <p className="font-mono text-xs text-white">{p.invite_code || "—"}</p>
                </div>
              </button>
            ))
          )}
        </section>
      )}

      {selected && (
        <>
          <section className="mt-5">
            <div className="glass rounded-3xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Indicador
                  </p>
                  <h2 className="mt-1 truncate text-base font-bold">
                    {selected.name || "Usuário"}
                  </h2>
                  <p className="text-xs text-muted-foreground">{selected.phone || "—"}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Código:{" "}
                    <span className="font-mono text-white">{selected.invite_code || "—"}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/80"
                >
                  Trocar
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2">
                <UsersRound size={16} className="text-[color:var(--brand-pink)]" />
                <p className="text-sm">
                  Total de indicados:{" "}
                  <span className="font-extrabold text-white">{invitees.length}</span>
                </p>
              </div>
            </div>
          </section>

          <section className="mt-5 space-y-2 pb-4">
            {invitees.length === 0 ? (
              <div className="glass rounded-3xl px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum usuário cadastrado com este código ainda.
              </div>
            ) : (
              invitees.map((p) => (
                <div key={p.id} className="glass rounded-2xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.name || "Usuário"}</p>
                      <p className="text-[11px] text-muted-foreground">{p.phone || "—"}</p>
                    </div>
                    <p className="shrink-0 text-[11px] text-muted-foreground">
                      {fmtDate(p.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
