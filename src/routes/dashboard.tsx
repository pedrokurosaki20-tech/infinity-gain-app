import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BalanceCard } from "@/components/BalanceCard";
import { Logo } from "@/components/Logo";
import { PromoCarousel } from "@/components/PromoCarousel";
import { tasks } from "@/lib/tasks";


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

function Dashboard() {
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

      <section className="mt-5 animate-fade-up">
        <PromoCarousel />
      </section>



      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Tarefas em destaque</h2>
          <button className="text-xs text-muted-foreground">Ver todas</button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {tasks.map((t, i) => (
            <Link
              key={t.slug}
              to="/task/$slug"
              params={{ slug: t.slug }}
              className="glass flex h-full min-h-[220px] flex-col rounded-3xl p-5 shadow-soft transition-transform hover:scale-[1.01] animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl shadow-glow"
                  style={{ backgroundImage: t.accent }}
                >
                  <t.icon size={28} strokeWidth={1.8} className="text-white" />
                </div>
                <h3 className="text-base font-semibold leading-tight">{t.title}</h3>
              </div>
              <p className="mt-3 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-muted-foreground">
                {t.short}
              </p>
              <div className="mt-auto pt-4">
                <span className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-brand-gradient text-sm font-semibold text-white shadow-glow">
                  Iniciar Tarefa
                  <ChevronRight size={16} />
                </span>
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
