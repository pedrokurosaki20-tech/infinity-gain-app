import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Coins,
  Lock,
  Check,
  Gift,
  Info,
  Smartphone,
  Loader2,
  KeyRound,
  CheckCircle2,
  Send,
  WifiOff,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SafetyNotice } from "@/components/SafetyNotice";
import { tasks } from "@/lib/tasks";
import heroAsset from "@/assets/treinamento-ia-hero.png.asset.json";
import { useWhatsapp } from "@/hooks/use-whatsapp";

type Meta = {
  envios: number;
  ganhos: number;
  bonus: number;
};

const metasDiarias: Meta[] = [
  { envios: 200, ganhos: 20, bonus: 3 },
  { envios: 400, ganhos: 40, bonus: 10 },
  { envios: 600, ganhos: 60, bonus: 10 },
  { envios: 800, ganhos: 80, bonus: 10 },
  { envios: 900, ganhos: 90, bonus: 10 },
  { envios: 1000, ganhos: 100, bonus: 20 },
  { envios: 2000, ganhos: 200, bonus: 40 },
];

const metasSemanais: Meta[] = [
  { envios: 500, ganhos: 5, bonus: 5 },
  { envios: 1000, ganhos: 10, bonus: 10 },
  { envios: 1500, ganhos: 15, bonus: 15 },
  { envios: 2000, ganhos: 20, bonus: 20 },
  { envios: 2500, ganhos: 25, bonus: 25 },
  { envios: 3000, ganhos: 30, bonus: 30 },
];

const META_DIARIA_MAX = 2000;
const META_SEMANAL_MAX = 3000;

// Formata número BR: 11 dígitos → (XX) XXXXX-XXXX
function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function TreinamentoIA() {
  const { phase, error, openPhoneInput, cancelPhoneInput, connect, disconnect } =
    useWhatsapp();

  const [phone, setPhone] = useState("");
  const [resgatados, setResgatados] = useState<Record<number, boolean>>({
    500: true,
  });

  // Contadores reais quando enviando, simulados caso contrário
  const enviosDia = phase.kind === "sending" ? phase.sent : 0;
  const enviosSemana = phase.kind === "sending" ? phase.sent : 0;
  const ganhoEstimado = (enviosDia * 0.1).toFixed(2).replace(".", ",");

  const progressoDia = useMemo(
    () => Math.min(100, (enviosDia / META_DIARIA_MAX) * 100),
    [enviosDia]
  );
  const progressoSemana = useMemo(
    () => Math.min(100, (enviosSemana / META_SEMANAL_MAX) * 100),
    [enviosSemana]
  );

  const outras = tasks.filter((t) => t.slug !== "treinamento-ia");

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value));
  }

  function handleConnect() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    connect("55" + digits);
  }

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
            <span className="font-semibold" style={{ color: "var(--brand-blue)" }}>
              R$ 0,10
            </span>
            .
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

      {/* ═══════════════════════════════════════════════
          BLOCO DO WHATSAPP — fluxo de conexão e envio
          ═══════════════════════════════════════════════ */}

      {/* ── IDLE: botão inicial ── */}
      {phase.kind === "idle" && (
        <section className="mt-8 animate-fade-up">
          <button
            onClick={openPhoneInput}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(30,94,255,0.45)] active:scale-[0.97]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Smartphone size={18} className="relative" /> Iniciar Treinamento
          </button>
        </section>
      )}

      {/* ── PHONE-INPUT: digitar número ── */}
      {phase.kind === "phone-input" && (
        <section className="mt-8 animate-fade-up">
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                <Smartphone size={20} />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Passo 1
                </p>
                <h3 className="text-base font-bold">Conectar WhatsApp</h3>
              </div>
            </div>

            <p className="mt-4 text-sm text-white/80">
              Digite seu número com DDD. Vamos enviar um código de pareamento para
              o seu WhatsApp.
            </p>

            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3">
              <span className="text-sm font-medium text-white/50">🇧🇷 +55</span>
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={handlePhoneChange}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
                autoFocus
              />
            </div>

            {error && (
              <p className="mt-3 rounded-xl bg-destructive/20 px-3 py-2 text-xs text-destructive-foreground">
                {error}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={cancelPhoneInput}
                className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-white/5 text-sm font-semibold text-white/70 transition-transform active:scale-[0.97]"
              >
                Cancelar
              </button>
              <button
                onClick={handleConnect}
                disabled={phone.replace(/\D/g, "").length < 10}
                className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-brand-gradient text-sm font-semibold text-white shadow-glow transition-all active:scale-[0.97] disabled:opacity-50"
              >
                <KeyRound size={15} /> Gerar Código
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── CONNECTING: aguardando resposta da API ── */}
      {phase.kind === "connecting" && (
        <section className="mt-8 animate-fade-up">
          <div className="glass rounded-3xl p-6 text-center">
            <Loader2 size={32} className="mx-auto animate-spin text-white/60" />
            <p className="mt-4 text-sm font-medium text-white/80">
              Conectando ao WhatsApp...
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Gerando código de pareamento para {phase.phone}
            </p>
          </div>
        </section>
      )}

      {/* ── PAIRING: exibir código ── */}
      {phase.kind === "pairing" && (
        <section className="mt-8 animate-fade-up">
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                <KeyRound size={20} />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Passo 2
                </p>
                <h3 className="text-base font-bold">Código de Pareamento</h3>
              </div>
            </div>

            {/* Código em destaque */}
            <div className="mt-5 flex justify-center">
              <span className="rounded-2xl bg-white/10 px-6 py-4 font-mono text-3xl font-extrabold tracking-[0.3em] text-white shadow-glow">
                {phase.code}
              </span>
            </div>

            <ol className="mt-5 space-y-2 text-sm text-white/80">
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-white">1.</span>
                Abra o <strong>WhatsApp</strong> no seu celular.
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-white">2.</span>
                Toque em <strong>Aparelhos Conectados</strong>.
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-white">3.</span>
                Selecione <strong>Conectar com número de telefone</strong>.
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-white">4.</span>
                Digite o código acima.
              </li>
            </ol>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={13} className="animate-spin" />
              Aguardando confirmação no WhatsApp…
            </div>
          </div>
        </section>
      )}

      {/* ── CONNECTED: carregando contatos (transição rápida) ── */}
      {phase.kind === "connected" && (
        <section className="mt-8 animate-fade-up">
          <div className="glass rounded-3xl p-6 text-center">
            <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
            <p className="mt-3 text-sm font-semibold text-white">
              WhatsApp conectado com sucesso!
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Carregando contatos do banco de dados…
            </p>
            <Loader2 size={18} className="mx-auto mt-3 animate-spin text-white/40" />
          </div>
        </section>
      )}

      {/* ── SENDING: painel de progresso ── */}
      {phase.kind === "sending" && (
        <section className="mt-8 animate-fade-up">
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500 text-white shadow-glow">
                <Send size={18} />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-emerald-400">
                  Em execução
                </p>
                <h3 className="text-base font-bold">Enviando Mensagens</h3>
              </div>
            </div>

            {/* Contadores */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 p-4 text-center">
                <p className="text-xs text-muted-foreground">Enviados</p>
                <p className="mt-1 text-2xl font-extrabold text-white">
                  {phase.sent.toLocaleString("pt-BR")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  de {phase.total.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4 text-center">
                <p className="text-xs text-muted-foreground">Ganhos estimados</p>
                <p className="mt-1 text-2xl font-extrabold text-white">
                  R$ {ganhoEstimado}
                </p>
                <p className="text-[10px] text-muted-foreground">R$ 0,10 / envio</p>
              </div>
            </div>

            {/* Barra de progresso geral */}
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                <span>Progresso</span>
                <span>
                  {phase.total > 0
                    ? Math.round((phase.sent / phase.total) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-700 ease-out"
                  style={{
                    width: `${phase.total > 0 ? (phase.sent / phase.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Intervalo antiban ativo — 30 a 45 segundos entre mensagens
            </p>

            <button
              onClick={disconnect}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 py-3 text-sm font-semibold text-white/70 transition-transform active:scale-[0.97]"
            >
              <WifiOff size={15} /> Desconectar
            </button>
          </div>
        </section>
      )}

      {/* Erro genérico fora dos painéis */}
      {error && phase.kind === "idle" && (
        <p className="mt-3 rounded-xl bg-destructive/20 px-4 py-2 text-xs text-destructive-foreground">
          {error}
        </p>
      )}

      {/* ═══════════════════════════════════════════
          PROGRESSO DIÁRIO (mostra envios reais quando enviando)
          ═══════════════════════════════════════════ */}
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
              const atingida = enviosDia >= m.envios;
              const resgatado = !!resgatados[m.envios];
              return (
                <MetaCard
                  key={m.envios}
                  envios={m.envios}
                  ganhos={m.ganhos}
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
              const atingida = enviosSemana >= m.envios;
              const resgatado = !!resgatados[m.envios];
              return (
                <MetaCard
                  key={m.envios}
                  envios={m.envios}
                  ganhos={m.ganhos}
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
            <li>• Cada mensagem enviada gera R$0,10.</li>
            <li>• Os ganhos são acumulados em tempo real.</li>
            <li>
              • Ao atingir uma meta diária, o bônus correspondente é liberado.
            </li>
            <li>
              • Após resgatar um bônus, você pode continuar enviando mensagens
              para desbloquear novas recompensas.
            </li>
            <li>
              • O progresso semanal acumula automaticamente durante toda a
              semana.
            </li>
            <li>• Resgate seus bônus antes do encerramento do prazo.</li>
          </ul>
        </div>
      </section>

      <SafetyNotice />

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

function MetaCard({
  envios,
  ganhos,
  bonus,
  atingida,
  resgatado,
  onResgatar,
}: {
  envios: number;
  ganhos: number;
  bonus: number;
  atingida: boolean;
  resgatado: boolean;
  onResgatar: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white/5 p-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{envios} envios</p>
        <p className="truncate text-sm font-medium text-white/90">
          Ganhos:{" "}
          <span className="text-base font-extrabold text-white">
            R$ {ganhos},00
          </span>
        </p>
      </div>
      {resgatado ? (
        <button
          disabled
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-xs font-semibold text-white shadow-soft"
        >
          <Check size={14} /> +R${bonus} Resgatado
        </button>
      ) : atingida ? (
        <button
          onClick={onResgatar}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-gradient px-3 text-xs font-semibold text-white shadow-glow transition-transform active:scale-[0.97]"
        >
          <Gift size={14} /> +R${bonus} Resgatar
        </button>
      ) : (
        <button
          disabled
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white/60"
        >
          <Lock size={12} /> +R${bonus}
        </button>
      )}
    </div>
  );
}
