import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  Loader2,
  Clock,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SafetyNotice } from "@/components/SafetyNotice";
import { tasks } from "@/lib/tasks";
import { submitTaskProof } from "@/lib/task-submission";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heroAsset from "@/assets/compartilhamento-hero.png.asset.json";

type Campaign = {
  id: string;
  name: string;
  logo: ReactNode;
  accent: string;
  // seconds until next renewal; 0 = available now
  nextInSeconds: number;
};

const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
    <path
      fill="#ffffff"
      d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.7c0-.93.26-1.56 1.6-1.56H16.7V4.28c-.29-.04-1.29-.13-2.45-.13-2.42 0-4.08 1.48-4.08 4.2v2.35H7.5V14h2.67v8h3.33Z"
    />
  </svg>
);

const InstagramLogo = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
    <path
      fill="#ffffff"
      d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2Zm0 7.92A3.12 3.12 0 1 1 12 8.88a3.12 3.12 0 0 1 0 6.24Zm6.12-8.11a1.12 1.12 0 1 1-2.24 0 1.12 1.12 0 0 1 2.24 0ZM21 7.02c-.07-1.5-.41-2.83-1.5-3.92C18.4 2.01 17.08 1.67 15.58 1.6 14.03 1.5 9.97 1.5 8.42 1.6 6.92 1.67 5.6 2 4.5 3.1 3.41 4.18 3.07 5.5 3 7c-.1 1.55-.1 5.61 0 7.16.07 1.5.41 2.82 1.5 3.92 1.1 1.09 2.42 1.43 3.92 1.5 1.55.1 5.61.1 7.16 0 1.5-.07 2.82-.41 3.92-1.5 1.09-1.1 1.43-2.42 1.5-3.92.1-1.55.1-5.6 0-7.14ZM19 15.72a3.16 3.16 0 0 1-1.78 1.78c-1.23.49-4.16.38-5.52.38-1.36 0-4.29.1-5.52-.38A3.16 3.16 0 0 1 4.4 15.72c-.49-1.23-.38-4.16-.38-5.52 0-1.36-.1-4.29.38-5.52A3.16 3.16 0 0 1 6.18 2.9c1.23-.49 4.16-.38 5.52-.38 1.36 0 4.29-.1 5.52.38 .82.32 1.46.96 1.78 1.78.49 1.23.38 4.16.38 5.52 0 1.36.11 4.29-.38 5.52Z"
    />
  </svg>
);

const XLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
    <path
      fill="#ffffff"
      d="M17.53 3H20.5l-6.49 7.42L21.75 21H15.9l-4.58-6-5.24 6H3.1l6.94-7.94L2.5 3h6l4.14 5.48L17.53 3Zm-1.04 16.2h1.64L7.6 4.7H5.85l10.64 14.5Z"
    />
  </svg>
);

const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
    <path
      fill="#25F4EE"
      d="M20 8.2a7.6 7.6 0 0 1-4.14-1.22V15.3a5.7 5.7 0 1 1-4.92-5.65v2.98a2.72 2.72 0 1 0 1.9 2.6V2h2.94A4.66 4.66 0 0 0 20 5.24v2.96Z"
    />
    <path
      fill="#FE2C55"
      d="M21 9.2a7.6 7.6 0 0 1-4.14-1.22V16.3a5.7 5.7 0 1 1-4.92-5.65v2.98a2.72 2.72 0 1 0 1.9 2.6V3h2.94A4.66 4.66 0 0 0 21 6.24V9.2Z"
    />
    <path
      fill="#ffffff"
      d="M20.5 8.7a7.6 7.6 0 0 1-4.14-1.22V15.8a5.7 5.7 0 1 1-4.92-5.65v2.98a2.72 2.72 0 1 0 1.9 2.6V2.5h2.94A4.66 4.66 0 0 0 20.5 5.74V8.7Z"
    />
  </svg>
);

const KwaiLogo = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
    <path
      fill="#ffffff"
      d="M12.9 6.5a3.2 3.2 0 1 1-4.53 4.53 3.2 3.2 0 0 1 4.53-4.53Zm5.86 5.86a3.2 3.2 0 1 1-4.53 4.53 3.2 3.2 0 0 1 4.53-4.53Zm-11.72 0a3.2 3.2 0 1 1-4.53 4.53 3.2 3.2 0 0 1 4.53-4.53Zm5.86 5.86a3.2 3.2 0 1 1-4.53 4.53l-.02-.02a3.2 3.2 0 0 1 4.55-4.51ZM12.9.64a3.2 3.2 0 1 1-4.53 4.53A3.2 3.2 0 0 1 12.9.64Z"
    />
  </svg>
);

const initialCampaigns: Campaign[] = [
  {
    id: "facebook",
    name: "Facebook",
    logo: <FacebookLogo />,
    accent: "linear-gradient(135deg,#1877F2,#4c9bff)",
    nextInSeconds: 0,
  },
  {
    id: "instagram",
    name: "Instagram",
    logo: <InstagramLogo />,
    accent: "linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)",
    nextInSeconds: 0,
  },
  {
    id: "x",
    name: "X",
    logo: <XLogo />,
    accent: "linear-gradient(135deg,#000000,#1a1a1a)",
    nextInSeconds: 0,
  },
  {
    id: "tiktok",
    name: "TikTok",
    logo: <TikTokLogo />,
    accent: "linear-gradient(135deg,#000000,#111111)",
    nextInSeconds: 0,
  },
  {
    id: "kwai",
    name: "Kwai",
    logo: <KwaiLogo />,
    accent: "linear-gradient(135deg,#FF7A00,#FF5500)",
    nextInSeconds: 0,
  },
];


export function CompartilhamentoTask() {
  const outras = tasks.filter((t) => t.slug !== "compartilhamento");

  const [now, setNow] = useState(Date.now());
  const [platform, setPlatform] = useState<string>("facebook");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [states, setStates] = useState<Record<string, ShareCampaignState | null>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function loadPlatform(p: string) {
    const state = await loadCampaignState(p);
    setStates((prev) => ({ ...prev, [p]: state }));
  }

  async function loadAll() {
    const results = await Promise.all(SHARE_PLATFORMS.map((p) => loadCampaignState(p)));
    const map: Record<string, ShareCampaignState | null> = {};
    SHARE_PLATFORMS.forEach((p, i) => (map[p] = results[i] ?? null));
    setStates(map);
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await loadAll();
      const { data } = await supabase
        .from("task_submissions")
        .select("status")
        .eq("user_id", u.user.id)
        .eq("task_type", "compartilhamento")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setLastStatus(data.status as any);
    })();
  }, [submitting]);

  // Atualiza automaticamente quando o admin altera qualquer campanha
  useEffect(() => {
    const ch = supabase
      .channel("share-campaigns-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "share_campaigns" }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const remainingFor = (p: string) => {
    const s = states[p];
    if (!s?.next_available_at) return 0;
    return Math.max(0, Math.floor((new Date(s.next_available_at).getTime() - now) / 1000));
  };
  const availableFor = (p: string) => {
    const s = states[p];
    if (!s) return false;
    return s.available || remainingFor(p) === 0;
  };

  // Libera automaticamente quando algum cronômetro chega a zero
  useEffect(() => {
    for (const p of SHARE_PLATFORMS) {
      const s = states[p];
      if (!s || s.available || !s.next_available_at) continue;
      if (new Date(s.next_available_at).getTime() - now <= 0) loadPlatform(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  async function copyCampaignText(p: string) {
    const text = states[p]?.text_content?.trim();
    if (!text) {
      toast.warning("⚠️ Texto da campanha ainda não cadastrado.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast.success("✅ Texto copiado com sucesso.");
  }

  async function downloadCampaignFile(p: string) {
    const state = states[p];
    const url = await resolveCampaignFileUrl(state?.file_url);
    if (!url) {
      toast.warning("⚠️ Arquivo da campanha ainda não cadastrado.");
      return;
    }
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download =
        (state?.file_url ?? url).split("/").pop()?.split("?")[0] ||
        (state?.file_type === "video" ? "campanha.mp4" : "campanha.jpg");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank", "noopener");
    }
    toast.success("✅ Arquivo baixado com sucesso.");
  }

  function shareNow(p: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const custom = states[p]?.share_url?.trim();
    window.open(custom || defaultShareUrl(p, origin), "_blank", "noopener");
  }

  async function handleSubmit() {
    if (!availableFor(platform)) {
      toast.warning("⚠️ Campanha já enviada. Aguarde a renovação.");
      return;
    }
    if (!file) {
      setMessage("Envie o print da publicação.");
      toast.warning("⚠️ Envie o print da publicação.");
      return;
    }
    if (!link.trim()) {
      setMessage("Informe o link da publicação.");
      toast.warning("⚠️ Informe o link da publicação.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await submitTaskProof({ taskType: "compartilhamento", file, link, platform });
      setMessage("Comprovante enviado! Aguarde a análise da equipe.");
      toast.success("✅ Publicação enviada para análise. Sua recompensa será analisada em até 24 horas.");
      setLink("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadPlatform(platform);

    } catch (err: any) {
      const msg = err?.message || "Falha ao enviar comprovante.";
      setMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
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
            const remaining = remainingFor(c.id);
            const available = availableFor(c.id);

            return (
              <div
                key={c.id}
                className="glass flex flex-col rounded-3xl p-5 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl shadow-glow"
                    style={{ backgroundImage: c.accent }}
                  >
                    {c.logo}
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
                  <CampaignAction
                    icon={Copy}
                    label="Copiar Texto"
                    onClick={() => copyCampaignText(c.id)}
                  />
                  <CampaignAction
                    icon={Download}
                    label="Salvar Imagem"
                    onClick={() => downloadCampaignFile(c.id)}
                  />
                  <CampaignAction
                    icon={Share2}
                    label="Compartilhar Agora"
                    primary
                    disabled={!available}
                    onClick={() => {
                      setPlatform(c.id);
                      shareNow(c.id);
                    }}
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
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Plataforma</p>
              <div className="grid grid-cols-5 gap-2">
                {["facebook","instagram","x","tiktok","kwai"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`rounded-xl px-2 py-2 text-[11px] font-semibold capitalize transition ${platform === p ? "bg-brand-gradient text-white shadow-glow" : "bg-white/5 text-white/80 hover:bg-white/10"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center transition-colors hover:bg-white/10">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
                <Upload size={18} />
              </span>
              <span className="text-sm font-semibold text-white">
                {file ? file.name : "Upload do print da publicação"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                PNG ou JPG até 5MB
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="relative">
              <Link2
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Cole aqui o link da publicação"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-9 py-3 text-sm text-white placeholder:text-muted-foreground focus:border-brand-blue focus:outline-none"
              />
            </div>
          </div>

          {lastStatus && (
            <div className="mt-4">
              <StatusBadge status={lastStatus} />
            </div>
          )}
          {message && (
            <p className="mt-3 text-center text-xs text-white/80">{message}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="group relative mt-5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition-all duration-200 hover:scale-[1.01] active:scale-[0.97] disabled:opacity-60"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {submitting ? <Loader2 size={18} className="relative animate-spin" /> : <ShieldCheck size={18} className="relative" />}
            {submitting ? "Enviando…" : "Validar Tarefa"}
          </button>
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

function CampaignAction({
  icon: Icon,
  label,
  primary,
  disabled,
  onClick,
}: {
  icon: typeof Copy;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const meta = {
    pending: { Icon: Clock, label: "Última validação em análise", cls: "text-[color:var(--brand-blue)] bg-[color:var(--brand-blue)]/15" },
    approved: { Icon: CheckCircle2, label: "Última validação aprovada", cls: "text-emerald-400 bg-emerald-500/15" },
    rejected: { Icon: XCircle, label: "Última validação rejeitada", cls: "text-red-400 bg-red-500/15" },
  }[status];
  return (
    <div className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${meta.cls}`}>
      <meta.Icon size={16} />
      {meta.label}
    </div>
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
