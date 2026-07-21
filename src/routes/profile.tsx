import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Pencil,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  Gift,
  ChevronRight,
  HelpCircle,
  Send,
  Megaphone,
  Instagram,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — Infinity Gain" },
      { name: "description", content: "Gerencie sua conta, dados e preferências." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
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
        <h1 className="text-base font-semibold">Perfil</h1>
        <span className="w-10" />
      </header>

      <section className="mt-8 flex flex-col items-center animate-fade-up">
        <div className="relative">
          <div
            className="grid h-24 w-24 place-items-center rounded-full text-3xl font-black text-white shadow-glow"
            style={{ backgroundImage: "var(--gradient-brand)" }}
          >
            RS
          </div>
          <button
            aria-label="Alterar foto"
            className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-background text-white"
          >
            <Pencil size={14} />
          </button>
        </div>
        <h2 className="mt-4 text-xl font-extrabold">Rafael Silva</h2>
        <p className="text-sm text-muted-foreground">Membro Premium desde 2024</p>
      </section>

      <section className="mt-6 glass rounded-3xl p-2 animate-fade-up">
        <Row icon={<Phone size={16} />} label="Telefone" value="(11) 98765-4321" />
        <Row icon={<Mail size={16} />} label="E-mail" value="rafael@infinitygain.app" />
        <Row icon={<Gift size={16} />} label="Código de convite" value="INF-RSILVA" last />
      </section>

      <section className="mt-5 space-y-3">
        <Action icon={<Pencil size={18} />} label="Editar Perfil" />
        <Action icon={<KeyRound size={18} />} label="Alterar Senha" />
      </section>

      {/* Suporte e Comunidade */}
      <section className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Suporte e Comunidade
        </h3>
        <div className="space-y-3">
          <CommunityCard
            icon={<Send size={20} />}
            title="Grupo de Suporte"
            description="Tire dúvidas, receba ajuda da equipe e acompanhe informações importantes."
            cta="Entrar no Grupo"
            href="https://t.me/"
          />
          <CommunityCard
            icon={<Megaphone size={20} />}
            title="Canal Oficial"
            description="Receba comunicados oficiais, novidades, eventos e anúncios da Infinity Gain."
            cta="Abrir Canal"
            href="https://t.me/"
          />
          <CommunityCard
            icon={<Instagram size={20} />}
            title="Instagram Oficial"
            description="Acompanhe novidades, dicas, atualizações e conteúdos exclusivos."
            cta="Seguir Instagram"
            href="https://instagram.com/"
          />
          <CommunityCard
            icon={<HelpCircle size={20} />}
            title="Central de Ajuda (FAQ)"
            description="Encontre respostas para as dúvidas mais frequentes sobre tarefas, pagamentos, saques, indicações e utilização da plataforma."
            cta="Abrir Central de Ajuda"
            to="/help"
          />
        </div>
      </section>

      <section className="mt-6">
        <button
          onClick={() => navigate({ to: "/" })}
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-left transition hover:bg-white/[0.05]"
        >
          <span className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/15 text-destructive">
              <LogOut size={18} />
            </span>
            <span className="font-semibold text-destructive">Sair</span>
          </span>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>
      </section>
    </AppShell>
  );
}

function Row({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-3 ${
        last ? "" : "border-b border-white/5"
      }`}
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function Action({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="glass flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left transition hover:bg-white/[0.06]">
      <span className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient-soft text-white">
          {icon}
        </span>
        <span className="font-semibold">{label}</span>
      </span>
      <ChevronRight size={18} className="text-muted-foreground" />
    </button>
  );
}

function CommunityCard({
  icon,
  title,
  description,
  cta,
  href,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  href?: string;
  to?: string;
}) {
  const button = (
    <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.01]">
      {cta}
    </span>
  );
  const content = (
    <>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          {icon}
        </span>
        <div className="min-w-0">
          <h4 className="text-base font-bold">{title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {button}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="glass block rounded-3xl p-5 transition hover:bg-white/[0.05]">
        {content}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="glass block rounded-3xl p-5 transition hover:bg-white/[0.05]"
    >
      {content}
    </a>
  );
}
