import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, KeyRound, LogOut, Mail, Phone, Gift, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — Infinity Gain" },
      { name: "description", content: "Gerencie sua conta, dados e preferências." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="glass grid h-10 w-10 place-items-center rounded-full"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold">Perfil</h1>
        <span className="w-10" />
      </header>

      <section className="mt-8 flex flex-col items-center animate-fade-up">
        <div className="relative">
          <div
            className="grid h-24 w-24 place-items-center rounded-full text-3xl font-black text-white shadow-glow"
            style={{ backgroundImage: "var(--gradient-brand)" }}
          >
            RS
          </div>
          <button
            aria-label="Alterar foto"
            className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-background text-white"
          >
            <Pencil size={14} />
          </button>
        </div>
        <h2 className="mt-4 text-xl font-extrabold">Rafael Silva</h2>
        <p className="text-sm text-muted-foreground">Membro Premium desde 2024</p>
      </section>

      <section className="mt-6 glass rounded-3xl p-2 animate-fade-up">
        <Row icon={<Phone size={16} />} label="Telefone" value="(11) 98765-4321" />
        <Row icon={<Mail size={16} />} label="E-mail" value="rafael@infinitygain.app" />
        <Row icon={<Gift size={16} />} label="Código de convite" value="INF-RSILVA" last />
      </section>

      <section className="mt-5 space-y-3">
        <Action icon={<Pencil size={18} />} label="Editar Perfil" />
        <Action icon={<KeyRound size={18} />} label="Alterar Senha" />
        <button
          onClick={() => navigate({ to: "/" })}
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-left transition hover:bg-white/[0.05]"
        >
          <span className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/15 text-destructive">
              <LogOut size={18} />
            </span>
            <span className="font-semibold text-destructive">Sair</span>
          </span>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>
      </section>
    </AppShell>
  );
}

function Row({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-3 ${
        last ? "" : "border-b border-white/5"
      }`}
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function Action({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="glass flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left transition hover:bg-white/[0.06]">
      <span className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient-soft text-white">
          {icon}
        </span>
        <span className="font-semibold">{label}</span>
      </span>
      <ChevronRight size={18} className="text-muted-foreground" />
    </button>
  );
}
