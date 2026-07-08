import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Coins,
  Lock,
  Check,
  Play,
  Gift,
  TrendingUp,
  Info,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { tasks } from "@/lib/tasks";
import heroAsset from "@/assets/treinamento-ia-hero.png.asset.json";

type Meta = { envios: number; bonus: number };

const metasDiarias: Meta[] = [
  { envios: 200, bonus: 23 },
  { envios: 400, bonus: 50 },
  { envios: 600, bonus: 70 },
  { envios: 800, bonus: 90 },
  { envios: 900, bonus: 100 },
  { envios: 1000, bonus: 120 },
  { envios: 2000, bonus: 240 },
];

const metasSemanais: Meta[] = [
  { envios: 500, bonus: 5 },
  { envios: 1000, bonus: 10 },
  { envios: 1500, bonus: 15 },
  { envios: 2000, bonus: 20 },
  { envios: 2500, bonus: 25 },
  { envios: 3000, bonus: 30 },
];

const META_DIARIA_MAX = 2000;
const META_SEMANAL_MAX = 3000;

export function TreinamentoIA() {
  const [enviosDia] = useState(0);
  const [enviosSemana] = useState(0);
  const [resgatados, setResgatados] = useState<Record<number, boolean>>({});

  const progressoDia = useMemo(
    () => Math.min(100, (enviosDia / META_DIARIA_MAX) * 100),
    [enviosDia]
  );
  const progressoSemana = useMemo(
    () => Math.min(100, (enviosSemana / META_SEMANAL_MAX) * 100),
    [enviosSemana]
  );

  const outras = tasks.filter((t) => t.slug !== "treinamento-ia");

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
        <h1 className="truncate text-base font-semibold">Treinamento de IA</h1>
        <span className="w-10" />
      </header>

      {/* Hero image */}
      <section className="mt-6 animate-fade-up">
        <div className="relative overflow-hidden rounded-3xl shadow-glow">
          <img
            src={heroAsset.url}
            alt="Treinamento de IA — Infinity Gain"
            className="block h-auto w-full object-contain"
          />
        </div>
      </section>

      {/* Título + subtítulo */}
      <section className="mt-6 animate-fade-up">
        <h2 className="text-2xl font-extrabold tracking-tight">Treinamento de IA</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Conecte seu WhatsApp e participe do treinamento de Inteligência
          Artificial enviando mensagens. A cada envio concluído você acumula
          ganhos, desbloqueia bônus diários, progride para novas metas e aumenta
          seus lucros automaticamente.
        </p>
      </section>

      {/* Ganhos por mensagem */}
      <section className="mt-6 animate-fade-up">
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Coins size={20} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Ganhos
              </p>
              <h3 className="text-base font-bold">Ganhos por Mensagem</h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/90">
            Cada mensagem enviada e validada gera{" "}
            <span className="font-semibold text-brand-gradient">R$ 0,10</span>.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/5 p-3 text-center">
              <p className="text-xs text-muted-foreground">100 envios</p>
              <p className="text-lg font-extrabold">R$ 10,00</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 text-center">
              <p className="text-xs text-muted-foreground">200 envios</p>
              <p className="text-lg font-extrabold">R$ 20,00</p>
            </div>
          </div>
        </div>
      </section>

      {/* Progresso Diário */}
      <section className="mt-6 animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Progresso Diário
          </h3>
          <span className="text-xs text-white/70">
            {enviosDia} / {META_DIARIA_MAX} envios
          </span>
        </div>
        <div className="glass rounded-3xl p-5">
          <ProgressBar value={progressoDia} />
          <div className="mt-5 grid grid-cols-1 gap-3">
            {metasDiarias.map((m) => {
              const atingida = enviosDia >= m.envios;
              const resgatado = !!resgatados[m.envios];
              return (
                <MetaCard
                  key={m.envios}
                  envios={m.envios}
                  bonus={m.bonus}
                  atingida={atingida}
                  resgatado={resgatado}
                  onResgatar={() =>
                    setResgatados((r) => ({ ...r, [m.envios]: true }))
                  }
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Progresso Semanal */}
      <section className="mt-6 animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Progresso Semanal
          </h3>
          <span className="text-xs text-white/70">
            {enviosSemana} / {META_SEMANAL_MAX} envios
          </span>
        </div>
        <div className="glass rounded-3xl p-5">
          <ProgressBar value={progressoSemana} />
          <div className="mt-5 grid grid-cols-2 gap-3">
            {metasSemanais.map((m) => {
              const atingida = enviosSemana >= m.envios;
              return (
                <div
                  key={m.envios}
                  className="rounded-2xl bg-white/5 p-3 text-center"
                >
                  <div className="mb-1 flex items-center justify-center gap-1 text-[color:var(--brand-pink)]">
                    <TrendingUp size={14} />
                    <p className="text-xs text-muted-foreground">
                      {m.envios} envios
                    </p>
                  </div>
                  <p
                    className={`text-base font-extrabold ${
                      atingida ? "text-brand-gradient" : "text-white/90"
                    }`}
                  >
                    +R$ {m.bonus}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mt-6 animate-fade-up">
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient-soft text-white">
              <Info size={20} />
            </span>
            <h3 className="text-base font-bold">Como funciona?</h3>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-white/85">
            <li>• Cada mensagem enviada vale R$ 0,10.</li>
            <li>
              • O bônus diário é liberado automaticamente ao atingir cada meta.
            </li>
            <li>
              • Após resgatar um bônus diário, o usuário pode continuar enviando
              mensagens para desbloquear novas metas.
            </li>
            <li>• O bônus semanal acumula durante toda a semana.</li>
            <li>
              • Os bônus precisam ser resgatados antes do encerramento do prazo.
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-8">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition-transform active:scale-[0.98] hover:scale-[1.01]">
          <Play size={18} /> Iniciar Treinamento
        </button>
      </section>

      {/* Outras tarefas */}
      <section className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Outras tarefas
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {outras.map((t) => (
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

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-brand-gradient transition-[width] duration-500 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function MetaCard({
  envios,
  bonus,
  atingida,
  resgatado,
  onResgatar,
}: {
  envios: number;
  bonus: number;
  atingida: boolean;
  resgatado: boolean;
  onResgatar: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white/5 p-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{envios} envios</p>
        <p className="truncate text-base font-extrabold">R$ {bonus}</p>
      </div>
      {resgatado ? (
        <button
          disabled
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-white shadow-soft"
        >
          <Check size={14} /> Bônus Resgatado
        </button>
      ) : atingida ? (
        <button
          onClick={onResgatar}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-gradient px-4 text-xs font-semibold text-white shadow-glow transition-transform active:scale-[0.97]"
        >
          <Gift size={14} /> Resgatar Bônus
        </button>
      ) : (
        <button
          disabled
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-4 text-xs font-semibold text-white/60"
        >
          <Lock size={12} /> Resgatar bônus
        </button>
      )}
    </div>
  );
}
