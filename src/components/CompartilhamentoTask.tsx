import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Info,
  Timer,
  Copy,
  Download,
  Share2,
  Upload,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { tasks } from "@/lib/tasks";
import heroAsset from "@/assets/compartilhamento-hero.png.asset.json";

type Campaign = {
  id: string;
  name: string;
  emoji: string;
  accent: string;
  // seconds until next renewal; 0 = available now
  nextInSeconds: number;
};

const initialCampaigns: Campaign[] = [
  {
    id: "facebook",
    name: "Facebook",
    emoji: "📘",
    accent: "linear-gradient(135deg,#1877F2,#4c9bff)",
    nextInSeconds: 0,
  },
  {
    id: "instagram",
    name: "Instagram",
    emoji: "📷",
    accent: "linear-gradient(135deg,#f58529,#dd2a7b,#8134af)",
    nextInSeconds: 5 * 60 * 60 + 12 * 60,
  },
  {
    id: "x",
    name: "X",
    emoji: "𝕏",
    accent: "linear-gradient(135deg,#111,#444)",
    nextInSeconds: 0,
  },
  {
    id: "tiktok",
    name: "TikTok",
    emoji: "🎵",
    accent: "linear-gradient(135deg,#25F4EE,#000000,#FE2C55)",
    nextInSeconds: 12 * 60 * 60 + 47 * 60,
  },
  {
    id: "kwai",
    name: "Kwai",
    emoji: "🎬",
    accent: "linear-gradient(135deg,#FF6C00,#FF3A6E)",
    nextInSeconds: 22 * 60 * 60 + 5 * 60,
  },
];

export function CompartilhamentoTask() {
  const outras = tasks.filter((t) => t.slug !== "compartilhamento");

  const start = useMemo(() => Date.now(), []);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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
        <h1 className="truncate text-base font-semibold">Compartilhamento</h1>
        <span className="w-10" />
      </header>

      {/* Hero */}
      <section className="mt-6 animate-fade-up">
        <div className="relative overflow-hidden rounded-3xl shadow-glow">
          <img
            src={heroAsset.url}
            alt="Compartilhamento — Infinity Gain"
            className="block h-auto w-full object-contain"
          />
        </div>
      </section>

      {/* Título + descrição */}
      <section className="mt-6 animate-fade-up">
        <h2 className="text-2xl font-extrabold tracking-tight">
          Compartilhamento
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Compartilhe campanhas oficiais da Infinity Gain nas principais redes
          sociais e receba recompensas por cada publicação validada. Escolha
          uma campanha disponível, publique seguindo as instruções e envie a
          comprovação para receber sua recompensa.
        </p>
      </section>

      {/* Recompensa */}
      <section className="mt-6 animate-fade-up">
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Coins size={20} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Recompensa
              </p>
              <h3 className="text-base font-bold">
                R$ 0,30 até R$ 1,00 por tarefa concluída
              </h3>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            O valor da recompensa varia conforme a campanha disponível.
          </p>
        </div>
      </section>

      {/* Disponibilidade */}
      <section className="mt-6 animate-fade-up">
        <div className="mb-3 flex items-center gap-2">
          <Timer size={16} className="text-brand-pink" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Disponibilidade
          </h3>
        </div>
        <div className="glass rounded-3xl p-5">
          <p className="text-sm text-white/85">
            Cada rede social libera 1 campanha a cada 24 horas.
          </p>
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
            <li>• Escolha uma campanha disponível.</li>
            <li>• Copie o texto da campanha.</li>
            <li>• Salve a imagem oficial.</li>
            <li>• Clique em Compartilhar Agora.</li>
            <li>• Publique normalmente na rede social.</li>
            <li>• Após publicar, copie o link da publicação.</li>
            <li>• Tire um print da publicação.</li>
            <li>• Retorne ao aplicativo.</li>
            <li>• Clique em Validar Tarefa.</li>
            <li>• Envie o link da publicação e o print solicitado.</li>
            <li>
              • Após validação, a recompensa será creditada em até 24 horas.
            </li>
          </ul>
        </div>
      </section>

      {/* Campanhas */}
      <section className="mt-6 animate-fade-up">
        <div className="mb-3 flex items-center gap-2">
          <Share2 size={16} className="text-brand-blue" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Campanhas disponíveis
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {initialCampaigns.map((c) => {
            const target = start + c.nextInSeconds * 1000;
            const remaining = Math.max(0, Math.floor((target - now) / 1000));
            const available = c.nextInSeconds === 0 || remaining === 0;
            return (
              <div
                key={c.id}
                className="glass flex flex-col rounded-3xl p-5 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl text-2xl shadow-glow"
                    style={{ backgroundImage: c.accent }}
                  >
                    <span className="drop-shadow">{c.emoji}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-bold">{c.name}</h4>
                    <p className="mt-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                      {available
                        ? "Campanha disponível agora"
                        : "Próxima renovação em:"}
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-4 rounded-2xl px-4 py-3 text-center font-mono text-lg font-extrabold tracking-widest ${
                    available
                      ? "bg-brand-gradient text-white shadow-glow"
                      : "bg-white/5 text-white"
                  }`}
                >
                  {available ? "DISPONÍVEL" : formatHMS(remaining)}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <CampaignAction icon={Copy} label="Copiar Texto" />
                  <CampaignAction icon={Download} label="Salvar Imagem" />
                  <CampaignAction
                    icon={Share2}
                    label="Compartilhar Agora"
                    primary
                    disabled={!available}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Validar tarefa */}
      <section className="mt-8 animate-fade-up">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck size={16} className="text-brand-pink" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Validar tarefa
          </h3>
        </div>
        <div className="glass rounded-3xl p-5">
          <p className="text-sm text-white/85">
            Após publicar a campanha, envie as informações abaixo para análise.
          </p>

          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center transition-colors hover:bg-white/10">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
                <Upload size={18} />
              </span>
              <span className="text-sm font-semibold text-white">
                Upload do print da publicação
              </span>
              <span className="text-[11px] text-muted-foreground">
                PNG ou JPG até 5MB
              </span>
              <input type="file" accept="image/*" className="hidden" />
            </label>

            <div className="relative">
              <Link2
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="url"
                placeholder="Cole aqui o link da publicação"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-9 py-3 text-sm text-white placeholder:text-muted-foreground focus:border-brand-blue focus:outline-none"
              />
            </div>
          </div>

          <button className="group relative mt-5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition-all duration-200 hover:scale-[1.01] active:scale-[0.97]">
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <ShieldCheck size={18} className="relative" /> Validar Tarefa
          </button>
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

function CampaignAction({
  icon: Icon,
  label,
  primary,
  disabled,
}: {
  icon: typeof Copy;
  label: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className={`flex h-full min-h-[70px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold leading-tight transition-all ${
        primary
          ? "bg-brand-gradient text-white shadow-glow hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40 disabled:hover:scale-100"
          : "bg-white/5 text-white/90 hover:bg-white/10 active:scale-[0.97]"
      }`}
    >
      <Icon size={16} />
      <span className="text-center">{label}</span>
    </button>
  );
}

function formatHMS(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function pad(n: number) {
  return n.toString().padStart(2, "0");
}
