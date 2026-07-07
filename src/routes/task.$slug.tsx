import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Coins, Play } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getTask, tasks } from "@/lib/tasks";

export const Route = createFileRoute("/task/$slug")({
  loader: ({ params }) => {
    const task = getTask(params.slug);
    if (!task) throw notFound();
    return { task };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.task.title} — Infinity Gain` },
          { name: "description", content: loaderData.task.short },
        ]
      : [{ title: "Tarefa — Infinity Gain" }, { name: "robots", content: "noindex" }],
  }),
  component: TaskDetail,
  notFoundComponent: TaskNotFound,
});

function TaskDetail() {
  const { task } = Route.useLoaderData();
  const Icon = task.icon;

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
        <h1 className="truncate text-base font-semibold">{task.title}</h1>
        <span className="w-10" />
      </header>

      <section className="mt-6 animate-fade-up">
        <div
          className="relative flex h-52 items-center justify-center overflow-hidden rounded-3xl shadow-glow"
          style={{ backgroundImage: task.accent }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(400px 200px at 20% 20%, rgba(255,255,255,0.5), transparent 60%)",
            }}
          />
          <Icon size={96} strokeWidth={1.4} className="relative text-white animate-float" />
        </div>
      </section>

      <section className="mt-6 animate-fade-up">
        <h2 className="text-2xl font-extrabold tracking-tight">{task.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>
      </section>

      <section className="mt-5 glass rounded-2xl p-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
            <Coins size={18} />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Ganho estimado
            </p>
            <p className="text-base font-bold">{task.earnings}</p>
          </div>
        </div>
      </section>

      <section className="mt-5 animate-fade-up">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Requisitos
        </h3>
        <ul className="glass space-y-2 rounded-2xl p-4">
          {task.requirements.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[color:var(--brand-blue)]" />
              <span className="text-white/90">{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.01]">
          <Play size={18} /> Iniciar Tarefa
        </button>
      </section>

      <section className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Outras tarefas
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {tasks
            .filter((t) => t.slug !== task.slug)
            .map((t) => (
              <Link
                key={t.slug}
                to="/task/$slug"
                params={{ slug: t.slug }}
                className="glass min-w-[160px] rounded-2xl p-3"
              >
                <div
                  className="grid h-10 w-10 place-items-center rounded-xl shadow-glow"
                  style={{ backgroundImage: t.accent }}
                >
                  <t.icon size={18} className="text-white" />
                </div>
                <p className="mt-3 text-sm font-semibold">{t.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{t.earnings}</p>
              </Link>
            ))}
        </div>
      </section>
    </AppShell>
  );
}

function TaskNotFound() {
  return (
    <AppShell>
      <div className="mt-24 text-center">
        <h1 className="text-xl font-bold">Tarefa não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O link pode estar quebrado ou a tarefa foi removida.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-2xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-glow"
        >
          Voltar ao início
        </Link>
      </div>
    </AppShell>
  );
}
