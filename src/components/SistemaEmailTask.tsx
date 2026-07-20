import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Coins,
  Info,
  Lock,
  Mail,
  Play,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { tasks } from "@/lib/tasks";
import heroAsset from "@/assets/sistema-email-hero.png.asset.json";

const TELEGRAM_BOT_URL = "https://t.me/InfinityGainBot";

type Meta = {
  goal: number;
  reward: string;
  state: "locked" | "available" | "claimed";
};

const weeklyProgress = 86;
const weeklyGoal = 300;

const metas: Meta[] = [
  { goal: 10, reward: "R$ 0,25", state: "claimed" },
  { goal: 25, reward: "R$ 0,50", state: "claimed" },
  { goal: 50, reward: "R$ 1,00", state: "available" },
  { goal: 100, reward: "R$ 3,00", state: "locked" },
  { goal: 150, reward: "R$ 5,00", state: "locked" },
  { goal: 200, reward: "R$ 8,00", state: "locked" },
  { goal: 300, reward: "R$ 15,00", state: "locked" },
];

const howItWorks = [
  "Clique em Iniciar Tarefa.",
  "Você será direcionado automaticamente para nosso Bot oficial no Telegram.",
  "O próprio bot ensinará todo o processo passo a passo.",
  "Após criar uma conta válida, envie-a diretamente pelo bot.",
  "Cada conta aprovada gera uma recompensa automaticamente.",
  "Quanto mais contas aprovadas durante a semana, maiores serão seus bônus.",
];

const requirements = [
  "Contas Gmail recém-criadas.",
  "Criar utilizando nossa senha padrão gerada pelo bot.",
  "Remover o email do seu telefone após concluir a venda.",
  "Não adicionar telefone de recuperação nem autenticação em duas etapas.",
  "Enviar apenas contas limpas, sem qualquer informação pessoal.",
];

export function SistemaEmailTask() {
  const progressPct = Math.min(100, Math.round((weeklyProgress / weeklyGoal) * 100));

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
        <h1 className="truncate text-base font-semibold">Sistema de E-mail</h1>
        <span className="w-10" />
      </header>

      {/* Hero */}
      <section className="mt-6 animate-fade-up">
        <div className="relative overflow-hidden rounded-3xl shadow-glow">
          <img
            src={heroAsset.url}
            alt="Sistema de E-mail — Infinity Gain"
            className="block h-auto w-full select-none"
            draggable={false}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.55) 100%)",
            }}
          />
        </div>
      </section>

      {/* Title + subtitle */}
      <section className="mt-6 animate-fade-up">
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          Sistema de E-mail
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Ganhe R$0,50 por cada conta Gmail aprovada. Complete tarefas simples e
          desbloqueie bônus semanais, podendo alcançar ganhos de R$30 a R$100 por
          dia conforme sua produtividade.
        </p>
      </section>

      {/* Earnings card */}
      <section className="mt-5 glass rounded-2xl p-4 animate-fade-up">
        <div className="flex items-center justify-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
            <Coins size={20} />
          </span>
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Ganho estimado
            </p>
            <p className="text-base font-bold">R$30 – R$100 por dia</p>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="mt-5 animate-fade-up">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Requisitos
        </h3>
        <ul className="glass space-y-2 rounded-2xl p-4">
          {requirements.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-[color:var(--brand-blue)]"
              />
              <span className="text-white/90">{r}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="mt-5 animate-fade-up">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Como funciona?
        </h3>
        <ol className="glass space-y-2.5 rounded-2xl p-4">
          {howItWorks.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-gradient text-[11px] font-bold text-white shadow-glow">
                {i + 1}
              </span>
              <span className="text-white/90">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Weekly progress */}
      <section className="mt-6 animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Progresso semanal
          </h3>
          <span className="text-sm font-bold text-white/90">{progressPct}%</span>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/90">
              <span className="font-bold">{weeklyProgress}</span>
              <span className="text-muted-foreground"> / {weeklyGoal} contas</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/70">
              <Sparkles size={11} /> Bônus ativos
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-brand-gradient shadow-glow transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Meta cards */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {metas.map((m) => (
            <MetaCard key={m.goal} meta={m} />
          ))}
        </div>
      </section>

      {/* Importante */}
      <section className="mt-6 animate-fade-up">
        <div className="glass relative overflow-hidden rounded-2xl p-4">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full"
            style={{ background: "var(--gradient-brand-soft)" }}
          />
          <div className="relative flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
              <AlertTriangle size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">Importante</p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-white/80">
                <li className="flex gap-2">
                  <Info size={12} className="mt-0.5 shrink-0 text-[color:var(--brand-pink)]" />
                  Os bônus são calculados apenas sobre contas aprovadas.
                </li>
                <li className="flex gap-2">
                  <Info size={12} className="mt-0.5 shrink-0 text-[color:var(--brand-pink)]" />
                  O progresso semanal é reiniciado automaticamente ao final de cada semana.
                </li>
                <li className="flex gap-2">
                  <Info size={12} className="mt-0.5 shrink-0 text-[color:var(--brand-pink)]" />
                  Sempre siga corretamente as orientações apresentadas pelo Bot
                  oficial para evitar reprovações.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-8">
        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.01]"
        >
          <Play size={18} /> Iniciar Tarefa
        </a>
      </section>

      {/* Outras tarefas */}
      <section className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Outras tarefas
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {tasks
            .filter((t) => t.slug !== "sistema-email")
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
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t.earnings}
                </p>
              </Link>
            ))}
        </div>
      </section>
    </AppShell>
  );
}

function MetaCard({ meta }: { meta: Meta }) {
  const { goal, reward, state } = meta;
  return (
    <div className="glass flex flex-col items-center rounded-2xl p-4 text-center">
      <div
        className={`grid h-12 w-12 place-items-center rounded-xl text-white ${
          state === "locked" ? "bg-white/5" : "bg-brand-gradient shadow-glow"
        }`}
      >
        {state === "locked" ? (
          <Lock size={18} className="text-white/60" />
        ) : (
          <Mail size={18} />
        )}
      </div>
      <p className="mt-3 text-sm font-semibold">{goal} E-mails</p>
      <p className="text-[11px] text-muted-foreground">+ Bônus {reward}</p>
      {state === "available" ? (
        <button className="mt-3 w-full rounded-xl bg-brand-gradient px-3.5 py-2 text-xs font-bold text-white shadow-glow transition-transform hover:scale-[1.02]">
          Resgatar
        </button>
      ) : state === "claimed" ? (
        <button
          disabled
          className="mt-3 w-full rounded-xl bg-white/5 px-3.5 py-2 text-xs font-bold text-white/70"
        >
          Resgatado
        </button>
      ) : (
        <button
          disabled
          className="mt-3 w-full rounded-xl bg-white/5 px-3.5 py-2 text-xs font-bold text-white/50"
        >
          Bloqueado
        </button>
      )}
    </div>
  );
}
