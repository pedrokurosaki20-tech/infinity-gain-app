import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Info,
  Play,
  AlertTriangle,
  Timer,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { tasks } from "@/lib/tasks";
import rcsHeroAsset from "@/assets/rcs-hero.png.asset.json";

const TOTAL_ENVIOS = 10;
const CONCLUIDOS = 3;
const PROGRESSO = Math.round((CONCLUIDOS / TOTAL_ENVIOS) * 100);

export function RcsTask() {
  const outras = tasks.filter((t) => t.slug !== "rcs");

  // Countdown target: 23h 17m from mount (for layout demonstration)
  const target = useMemo(
    () => new Date(Date.now() + 23 * 60 * 60 * 1000 + 17 * 60 * 1000),
    []
  );
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(target));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

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
        <h1 className="truncate text-base font-semibold">RCS</h1>
        <span className="w-10" />
      </header>

      {/* Hero banner */}
      <section className="mt-6 animate-fade-up">
        <div className="relative overflow-hidden rounded-3xl shadow-glow">
          <img
            src={rcsHeroAsset.url}
            alt="RCS — Infinity Gain"
            className="block h-auto w-full object-contain"
          />
        </div>
      </section>

      {/* Título + subtítulo */}
      <section className="mt-6 animate-fade-up">
        <h2 className="text-2xl font-extrabold tracking-tight">RCS</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Envie mensagens RCS de forma simples e segura. Cada envio concluído
          com sucesso gera recompensas automaticamente para sua conta.
        </p>
      </section>

      {/* Recompensa + limite */}
      <section className="mt-6 animate-fade-up">
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Coins size={20} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Valor por tarefa
              </p>
              <h3 className="text-base font-bold">R$ 0,50 por envio</h3>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/5 p-3 text-center">
              <p className="text-xs text-muted-foreground">Limite diário</p>
              <p className="text-lg font-extrabold">10 envios</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 text-center">
              <p className="text-xs text-muted-foreground">Disponíveis</p>
              <p className="text-lg font-extrabold">
                {TOTAL_ENVIOS} / {TOTAL_ENVIOS}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mt-6 animate-fade-up">
        <div className="mb-3 flex items-center gap-2">
          <Info size={16} className="text-brand-blue" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Como funciona?
          </h3>
        </div>
        <div className="glass rounded-3xl p-5">
          <ul className="space-y-2 text-sm text-white/85">
            <li>• Clique em "Iniciar Tarefa".</li>
            <li>• O texto será copiado automaticamente.</li>
            <li>• Você será direcionado para enviar a mensagem via RCS.</li>
            <li>• Após concluir o envio, retorne para a plataforma.</li>
            <li>• O envio será validado automaticamente.</li>
            <li>• Cada envio válido gera R$ 0,50.</li>
          </ul>
        </div>
      </section>

      {/* Requisitos */}
      <section className="mt-6 animate-fade-up">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-brand-blue" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Requisitos
          </h3>
        </div>
        <ul className="glass space-y-2 rounded-3xl p-5">
          {[
            "Conexão estável com a internet.",
            "Aplicativo Mensagens (RCS) ativo.",
            "Permitir abertura automática da conversa.",
            "Concluir o envio corretamente.",
          ].map((req) => (
            <li key={req} className="flex items-start gap-2 text-sm">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-[color:var(--brand-blue)]"
              />
              <span className="text-white/90">{req}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Progresso */}
      <section className="mt-6 animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Progresso de hoje
          </h3>
          <span className="text-xs text-white/70">{PROGRESSO}%</span>
        </div>
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar value={PROGRESSO} />
            </div>
            <span className="text-sm font-bold text-white">{PROGRESSO}%</span>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {CONCLUIDOS} / {TOTAL_ENVIOS} envios
          </p>
        </div>
      </section>

      {/* Próxima renovação */}
      <section className="mt-6 animate-fade-up">
        <div className="mb-3 flex items-center gap-2">
          <Timer size={16} className="text-brand-pink" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Próxima renovação
          </h3>
        </div>
        <div className="glass rounded-3xl p-5 text-center">
          <p className="text-3xl font-extrabold tracking-tight text-white">
            {timeLeft.h}h {timeLeft.m}min
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            As tarefas são renovadas automaticamente a cada 24 horas.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-8 animate-fade-up">
        <button className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(30,94,255,0.45)] active:scale-[0.97]">
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <Play size={18} className="relative" /> Iniciar Tarefa
        </button>
      </section>

      {/* Aviso */}
      <section className="mt-6 animate-fade-up">
        <div className="glass rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-brand-pink">
              <AlertTriangle size={18} />
            </span>
            <div>
              <h3 className="text-sm font-bold">Importante</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/80">
                Caso o envio não seja concluído corretamente, a recompensa não
                será contabilizada.
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/80">
                Sempre aguarde a confirmação antes de fechar a conversa.
              </p>
            </div>
          </div>
        </div>
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
              <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                {t.short}
              </p>
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

function getTimeLeft(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  return { h, m, s };
}
