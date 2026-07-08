import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, ChevronRight, Sparkles } from "lucide-react";
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

      <section className="mt-5 animate-fade-up">
        <div
          className="relative overflow-hidden rounded-3xl p-5 shadow-glow"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(30,94,255,0.25), rgba(255,102,196,0.25))",
          }}
        >
          <div className="absolute inset-0 glass rounded-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-gradient shadow-glow">
              <Sparkles size={22} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                Missão do dia
              </p>
              <h3 className="mt-0.5 truncate font-semibold">
                Complete 5 tarefas e ganhe R$ 25 extras
              </h3>
              <p className="mt-0.5 text-xs text-white/70">
                Bônus creditado automaticamente na sua carteira.
              </p>
            </div>
          </div>
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
              className="glass flex h-40 flex-col rounded-3xl p-4 shadow-soft transition-transform hover:scale-[1.01] animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-glow"
                  style={{ backgroundImage: t.accent }}
                >
                  <t.icon size={22} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold leading-tight">
                    {t.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
                    {t.short}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex justify-end pt-3">
                <span className="inline-flex h-10 w-36 items-center justify-center gap-1 rounded-full bg-brand-gradient text-sm font-semibold text-white shadow-glow">
                  Iniciar Tarefa
                  <ChevronRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

