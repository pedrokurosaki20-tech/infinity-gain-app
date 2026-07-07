import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Check, Share2, MessageCircle, Send, Instagram } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/referral")({
  head: () => ({
    meta: [
      { title: "Indique e Ganhe — Infinity Gain" },
      {
        name: "description",
        content: "Convide amigos e ganhe comissão vitalícia sobre os ganhos deles.",
      },
    ],
  }),
  component: ReferralPage,
});

const LINK = "https://infinitygain.app/i/INF-RSILVA";

function ReferralPage() {
  const [copied, setCopied] = useState(false);

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
        <h1 className="text-base font-semibold">Indique e Ganhe</h1>
        <span className="w-10" />
      </header>

      <section className="mt-6 relative overflow-hidden rounded-3xl p-6 shadow-glow bg-card-gradient border border-white/10 animate-fade-up">
        <div
          aria-hidden
          className="absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--gradient-brand)" }}
        />
        <p className="text-xs uppercase tracking-widest text-white/70">
          Sua recompensa
        </p>
        <h2 className="mt-2 text-3xl font-extrabold leading-tight">
          Ganhe <span className="text-brand-gradient">R$ 10</span> por amigo
          + 10% vitalício.
        </h2>
        <p className="mt-2 text-sm text-white/80">
          Quando seu amigo se cadastrar e concluir a primeira tarefa, você recebe.
        </p>
      </section>

      <section className="mt-6 animate-fade-up">
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
          Seu link de convite
        </p>
        <div className="glass flex items-center gap-2 rounded-2xl p-2 pl-4">
          <span className="min-w-0 flex-1 truncate text-sm text-white/90">
            {LINK}
          </span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(LINK);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-xs font-semibold text-white shadow-glow"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-3 animate-fade-up">
        <Stat label="Indicados" value="24" />
        <Stat label="Ativos" value="17" />
        <Stat label="Comissões" value="R$ 342" />
      </section>

      <section className="mt-8">
        <h3 className="mb-3 text-lg font-bold">Compartilhar</h3>
        <div className="grid grid-cols-4 gap-3">
          <Share icon={<MessageCircle size={20} />} label="WhatsApp" />
          <Share icon={<Send size={20} />} label="Telegram" />
          <Share icon={<Instagram size={20} />} label="Instagram" />
          <Share icon={<Share2 size={20} />} label="Mais" />
        </div>
      </section>

      <section className="mt-8">
        <h3 className="mb-3 text-lg font-bold">Últimas comissões</h3>
        <div className="glass divide-y divide-white/5 rounded-3xl">
          {[
            { name: "Ana P.", amount: 12.4, date: "Hoje" },
            { name: "João M.", amount: 8.6, date: "Ontem" },
            { name: "Bianca L.", amount: 24.0, date: "22/07" },
            { name: "Carlos T.", amount: 5.2, date: "21/07" },
          ].map((c) => (
            <div key={c.name} className="flex items-center gap-3 px-4 py-3.5">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white">
                {c.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.date}</p>
              </div>
              <p className="text-sm font-semibold text-[color:var(--brand-pink)]">
                +
                {c.amount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <p className="text-2xl font-extrabold text-brand-gradient">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function Share({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="glass flex flex-col items-center gap-2 rounded-2xl px-2 py-3 transition-transform hover:scale-[1.03]">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient-soft text-white">
        {icon}
      </span>
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}
