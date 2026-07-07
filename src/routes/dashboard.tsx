import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet, ArrowDownToLine, User, Bell, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BalanceCard } from "@/components/BalanceCard";
import { Logo } from "@/components/Logo";
import { tasks } from "@/lib/tasks";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Início — Infinity Gain" },
      {
        name: "description",
        content: "Suas tarefas disponíveis, saldo e ganhos em um só lugar.",
      },
    ],
  }),
  component: Dashboard,
});

const banners = [
  {
    title: "Bônus de boas-vindas",
    sub: "Ganhe R$ 15 na sua primeira tarefa concluída.",
    bg: "linear-gradient(135deg,#1e5eff,#7aa5ff)",
  },
  {
    title: "Indique e ganhe 10%",
    sub: "Comissão vitalícia sobre seus indicados.",
    bg: "linear-gradient(135deg,#ff66c4,#ff9edb)",
  },
  {
    title: "Missão semanal",
    sub: "Complete 20 tarefas e ganhe R$ 50 extra.",
    bg: "linear-gradient(135deg,#1e5eff,#ff66c4)",
  },
];

function Dashboard() {
  const [banner, setBanner] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setBanner((b) => (b + 1) % banners.length), 4200);
    return () => clearInterval(id);
  }, []);

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <button
          className="glass grid h-10 w-10 place-items-center rounded-full"
          aria-label="Notificações"
        >
          <Bell size={18} />
        </button>
      </header>

      <section className="mt-6 animate-fade-up">
        <p className="text-sm text-muted-foreground">Olá, Rafael 👋</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          Qual tarefa você vai concluir hoje?
        </h1>
      </section>

      <section className="mt-5 animate-fade-up">
        <BalanceCard />
      </section>

      <section className="mt-5 grid grid-cols-3 gap-3 animate-fade-up">
        <Shortcut to="/wallet" icon={<Wallet size={20} />} label="Carteira" />
        <Shortcut to="/withdraw" icon={<ArrowDownToLine size={20} />} label="Saque" />
        <Shortcut to="/profile" icon={<User size={20} />} label="Perfil" />
      </section>

      <section className="mt-6 animate-fade-up">
        <div
          className="relative h-32 overflow-hidden rounded-3xl p-5 shadow-soft transition-all duration-500"
          style={{ backgroundImage: banners[banner].bg }}
        >
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-widest text-white/80">
              Destaque
            </p>
            <h3 className="mt-1 text-lg font-bold text-white">
              {banners[banner].title}
            </h3>
            <p className="mt-1 text-sm text-white/90">{banners[banner].sub}</p>
          </div>
          <div
            aria-hidden
            className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl"
          />
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setBanner(i)}
              aria-label={`Banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                banner === i ? "w-6 bg-white" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Tarefas em destaque</h2>
          <button className="text-xs text-muted-foreground">Ver todas</button>
        </div>
        <div className="space-y-3">
          {tasks.map((t, i) => (
            <Link
              key={t.slug}
              to="/task/$slug"
              params={{ slug: t.slug }}
              className="glass block rounded-3xl p-4 shadow-soft transition-transform hover:scale-[1.01] animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl shadow-glow"
                  style={{ backgroundImage: t.accent }}
                >
                  <t.icon size={24} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{t.title}</h3>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    {t.short}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-white/70">
                      {t.earnings}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-white shadow-glow">
                      Iniciar Tarefa
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Shortcut({
  to,
  icon,
  label,
}: {
  to: "/wallet" | "/withdraw" | "/profile";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="glass flex flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 transition-transform hover:scale-[1.02]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient-soft text-white">
        {icon}
      </span>
      <span className="text-xs font-medium text-white/90">{label}</span>
    </Link>
  );
}
