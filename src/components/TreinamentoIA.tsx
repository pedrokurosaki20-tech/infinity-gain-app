import { useMemo, useState, useEffect } from "react";
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
import { InternalDashboardControl } from "@/components/InternalDashboardControl";

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
export function TreinamentoIA() {
  const [whatsappStatus, setWhatsappStatus] = useState("close");
  const [resgatados, setResgatados] = useState<Record<number, boolean>>({ 500: true });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/status");
        const data = await res.json();
        setWhatsappStatus(data.status);
      } catch (err) {
        console.log("Aguardando servidor de IA...");
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const enviosDia = whatsappStatus === "open" ? 120 : 0; 
  const enviosSemana = whatsappStatus === "open" ? 640 : 0;
  const ganhoEstimado = (enviosDia * 0.1).toFixed(2).replace(".", ",");

  const progressoDia = useMemo(() => Math.min(100, (enviosDia / META_DIARIA_MAX) * 100), [enviosDia]);
  const progressoSemana = useMemo(() => Math.min(100, (enviosSemana / META_SEMANAL_MAX) * 100), [enviosSemana]);
  const outras = tasks.filter((t) => t.slug !== "treinamento-ia");

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <Link to="/dashboard" className="glass grid h-10 w-10 place-items-center rounded-full text-foreground">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="truncate text-base font-semibold">Treinamento de IA</h1>
        <span className="w-10" />
      </header>

      <section className="mt-6 animate-fade-up">
        <div className="relative overflow-hidden rounded-3xl shadow-glow">
          <img src={heroAsset.url} alt="Treinamento de IA" className="block h-auto w-full object-contain" />
        </div>
      </section>

      <section className="mt-6 animate-fade-up">
        <h2 className="text-2xl font-extrabold tracking-tight">Treinamento de IA</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Gerencie o robô de validações computacionais e envie lotes ativos em segundo plano.
        </p>
      </section>

      <section className="mt-8 animate-fade-up">
        <InternalDashboardControl />
      </section>

      <section className="mt-6 animate-fade-up">
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Coins size={20} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Ganhos</p>
              <h3 className="text-base font-bold">Ganhos por Operação</h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/90">
            Cada registro validado gera <span className="font-semibold text-blue-400">R$ 0,10</span>.
          </p>
        </div>
      </section>

      <section className="mt-6 animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Progresso Diário</h3>
          <span className="text-xs text-white/70">{enviosDia} / {META_DIARIA_MAX} envios</span>
        </div>
        <div className="glass rounded-3xl p-5">
          <ProgressBar value={progressoDia} />
          <div className="mt-5 grid grid-cols-1 gap-3">
            {metasDiarias.map((m) => (
              <MetaCard
                key={m.envios}
                envios={m.envios}
                ganhos={m.ganhos}
                bonus={m.bonus}
                atingida={enviosDia >= m.envios}
                resgatado={!!resgatados[m.envios]}
                onResgatar={() => setResgatados((r) => ({ ...r, [m.envios]: true }))}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Progresso Semanal</h3>
          <span className="text-xs text-white/70">{enviosSemana} / {META_SEMANAL_MAX} envios</span>
        </div>
        <div className="glass rounded-3xl p-5">
          <ProgressBar value={progressoSemana} />
          <div className="mt-5 grid grid-cols-2 gap-3">
            {metasSemanais.map((m) => (
              <MetaCard
                key={m.envios}
                envios={m.envios}
                ganhos={m.ganhos}
                bonus={m.bonus}
                atingida={enviosSemana >= m.envios}
                resgatado={!!resgatados[m.envios]}
                onResgatar={() => setResgatados((r) => ({ ...r, [m.envios]: true }))}
              />
            ))}
          </div>
        </div>
      </section>

      <SafetyNotice />
    </AppShell>
  );
}
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-brand-gradient transition-[width] duration-500 ease-out" style={{ width: `${value}%` }} />
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
          Ganhos: <span className="text-base font-extrabold text-white">R$ {ganhos},00</span>
        </p>
      </div>
      {resgatado ? (
        <button disabled className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-xs font-semibold text-white shadow-soft">
          <Check size={14} /> +R${bonus} Resgatado
        </button>
      ) : atingida ? (
        <button onClick={onResgatar} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-gradient px-3 text-xs font-semibold text-white shadow-glow transition-transform active:scale-[0.97]">
          <Gift size={14} /> +R${bonus} Resgatar
        </button>
      ) : (
        <button disabled className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white/60">
          <Lock size={12} /> +R${bonus}
        </button>
      )}
    </div>
  );
}

