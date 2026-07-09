import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Coins,
  Gift,
  Info,
  Lock,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { tasks } from "@/lib/tasks";
import heroAsset from "@/assets/banner-indique-ganhe.png.asset.json";

type Meta = {
  convites: number;
  comissao: number;
  bonus: number;
};

const metasDiarias: Meta[] = [
  { convites: 5, comissao: 2.5, bonus: 0.5 },
  { convites: 10, comissao: 5, bonus: 1 },
  { convites: 20, comissao: 10, bonus: 2 },
  { convites: 30, comissao: 15, bonus: 3 },
  { convites: 40, comissao: 20, bonus: 4 },
  { convites: 50, comissao: 25, bonus: 5 },
  { convites: 60, comissao: 30, bonus: 6 },
  { convites: 70, comissao: 35, bonus: 7 },
  { convites: 80, comissao: 40, bonus: 8 },
  { convites: 90, comissao: 45, bonus: 9 },
  { convites: 100, comissao: 50, bonus: 10 },
];

const metasSemanais: Meta[] = [
  { convites: 50, comissao: 25, bonus: 3 },
  { convites: 100, comissao: 50, bonus: 5 },
  { convites: 150, comissao: 75, bonus: 7 },
  { convites: 200, comissao: 100, bonus: 10 },
  { convites: 250, comissao: 125, bonus: 13 },
  { convites: 300, comissao: 150, bonus: 16 },
  { convites: 350, comissao: 175, bonus: 20 },
  { convites: 400, comissao: 200, bonus: 25 },
  { convites: 450, comissao: 225, bonus: 30 },
  { convites: 500, comissao: 250, bonus: 40 },
];

const META_DIARIA_MAX = 100;
const META_SEMANAL_MAX = 500;
const CONVITES_DIA = 22;
const CONVITES_SEMANA = 130;
const LINK = "https://infinitygain.app/i/INF-RSILVA";

export const Route = createFileRoute("/referral")({
  head: () => ({
    meta: [
      { title: "Indique & Ganhe — Infinity Gain" },
      {
        name: "description",
        content:
          "Convide novos usuários para a Infinity Gain e ganhe comissão por cada indicação válida.",
      },
    ],
  }),
  component: ReferralPage,
});

function ReferralPage() {
  const [resgatados, setResgatados] = useState<Record<string, boolean>>({
    "daily-5": true,
    "weekly-50": true,
  });

  const progressoDia = useMemo(
    () => Math.min(100, (CONVITES_DIA / META_DIARIA_MAX) * 100),
    []
  );
  const progressoSemana = useMemo(
    () => Math.min(100, (CONVITES_SEMANA / META_SEMANAL_MAX) * 100),
    []
  );

  const outras = tasks.filter((t) => t.slug !== "indique-ganhe");

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
        <h1 className="truncate text-base font-semibold">Indique & Ganhe</h1>
        <span className="w-10" />
      </header>

      {/* Hero image */}
      <section className="mt-6 animate-fade-up">
        <div className="relative overflow-hidden rounded-3xl shadow-glow">
          <img
            src={heroAsset.url}
            alt="Indique & Ganhe — Infinity Gain"
            className="block h-auto w-full object-contain"
          />
        </div>
      </section>

      {/* Título + subtítulo */}
      <section className="mt-6 animate-fade-up">
        <h2 className="text-2xl font-extrabold tracking-tight">Indique & Ganhe</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Convide novos usuários para a Infinity Gain através do seu link
          exclusivo. Cada indicação válida gera comissão automaticamente e ainda
          desbloqueia bônus diários e semanais.
        </p>
      </section>

      {/* Comissão por indicação */}
      <section className="mt-6 animate-fade-up">
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Coins size={20} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Comissão por Indicação
              </p>
              <h3 className="text-base font-bold">R$ 0,50 por indicação válida</h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/90">
            A indicação será validada quando o novo usuário:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-white/85">
            <li>• realizar o cadastro utilizando seu link ou código;</li>
            <li>• concluir o cadastro completo;</li>
            <li>• concluir pelo menos uma tarefa.</li>
          </ul>
        </div>
      </section>

      {/* Link de convite */}
      <section className="mt-6 animate-fade-up">
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
          Seu link de convite
        </p>
        <CopyLink link={LINK} />
      </section>

      {/* Progresso Diário */}
      <section className="mt-6 animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Progresso Diário
          </h3>
          <span className="text-xs text-white/70">
            {CONVITES_DIA} / {META_DIARIA_MAX} convites
          </span>
        </div>
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar value={progressoDia} />
            </div>
            <span className="text-sm font-bold text-white">
              {Math.round(progressoDia)}%
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3">
            {metasDiarias.map((m) => {
              const key = `daily-${m.convites}`;
              const atingida = CONVITES_DIA >= m.convites;
              const resgatado = !!resgatados[key];
              return (
                <BonusCard
                  key={key}
                  convites={m.convites}
                  comissao={m.comissao}
                  bonus={m.bonus}
                  atingida={atingida}
                  resgatado={resgatado}
                  onResgatar={() =>
                    setResgatados((r) => ({ ...r, [key]: true }))
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
            {CONVITES_SEMANA} / {META_SEMANAL_MAX} convites
          </span>
        </div>
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar value={progressoSemana} />
            </div>
            <span className="text-sm font-bold text-white">
              {Math.round(progressoSemana)}%
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {metasSemanais.map((m) => {
              const key = `weekly-${m.convites}`;
              const atingida = CONVITES_SEMANA >= m.convites;
              const resgatado = !!resgatados[key];
              return (
                <BonusCard
                  key={key}
                  convites={m.convites}
                  comissao={m.comissao}
                  bonus={m.bonus}
                  atingida={atingida}
                  resgatado={resgatado}
                  hideCommission
                  onResgatar={() =>
                    setResgatados((r) => ({ ...r, [key]: true }))
                  }
                />
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
            <li>• Cada indicação válida gera R$0,50.</li>
            <li>
              • O usuário indicado deve concluir o cadastro e realizar pelo
              menos uma tarefa.
            </li>
            <li>
              • Os bônus diários são liberados imediatamente após atingir cada
              meta.
            </li>
            <li>
              • Os bônus semanais acumulam durante toda a semana.
            </li>
            <li>
              • Os bônus devem ser resgatados antes do encerramento do prazo.
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-8 animate-fade-up">
        <button
          onClick={() => navigator.clipboard?.writeText(LINK)}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(30,94,255,0.45)] active:scale-[0.97]"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <UsersRound size={18} className="relative" /> Convidar Agora
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

function BonusCard({
  convites,
  comissao,
  bonus,
  atingida,
  resgatado,
  hideCommission,
  onResgatar,
}: {
  convites: number;
  comissao: number;
  bonus: number;
  atingida: boolean;
  resgatado: boolean;
  hideCommission?: boolean;
  onResgatar: () => void;
}) {
  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const button = resgatado ? (
    <button
      disabled
      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-xs font-semibold text-white shadow-soft"
    >
      <Check size={14} /> +R${bonus.toFixed(2).replace(".", ",")}{" "}
      Resgatado
    </button>
  ) : atingida ? (
    <button
      onClick={onResgatar}
      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-gradient px-3 text-xs font-semibold text-white shadow-glow transition-transform active:scale-[0.97]"
    >
      <Gift size={14} /> +R${bonus.toFixed(2).replace(".", ",")} Resgatar
    </button>
  ) : (
    <button
      disabled
      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white/60"
    >
      <Lock size={12} /> +R${bonus.toFixed(2).replace(".", ",")}
    </button>
  );

  if (hideCommission) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/5 p-3 text-center">
        <p className="text-xs text-muted-foreground">{convites} convites</p>
        {button}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white/5 p-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{convites} convites</p>
        <p className="truncate text-sm font-medium text-white/90">
          Comissão:{" "}
          <span className="text-base font-extrabold text-white">
            {formatCurrency(comissao)}
          </span>
        </p>
      </div>
      {button}
    </div>
  );
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="glass flex items-center gap-2 rounded-2xl p-2 pl-4">
      <span className="min-w-0 flex-1 truncate text-sm text-white/90">
        {link}
      </span>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-xs font-semibold text-white shadow-glow"
      >
        {copied ? <Check size={14} /> : null}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
