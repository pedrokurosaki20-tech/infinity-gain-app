import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar — Infinity Gain" },
      {
        name: "description",
        content: "Entre na sua conta Infinity Gain e continue ganhando com tarefas online.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message,
      );
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(700px 500px at 50% -10%, rgba(30,94,255,0.35), transparent 60%), radial-gradient(500px 400px at 100% 100%, rgba(255,102,196,0.22), transparent 60%)",
        }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex justify-center animate-fade-up">
          <Logo size="lg" />
        </div>

        <div className="mt-14 animate-fade-up">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Bem-vindo de volta
          </h1>
          <p className="mt-2 text-muted-foreground">
            Entre para continuar ganhando.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 animate-fade-up">
          <Field
            icon={<Mail size={18} />}
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={setEmail}
          />
          <Field
            icon={<Lock size={18} />}
            type="password"
            placeholder="Senha"
            value={password}
            onChange={setPassword}
          />

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Entrar"}
              {!loading && (
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </div>

          <Link
            to="/register"
            className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-base font-semibold text-white transition hover:bg-white/10"
          >
            Criar Conta
          </Link>

          <div className="pt-2 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground transition hover:text-white"
            >
              Esqueci minha senha
            </button>
          </div>
        </form>

        <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">
          Ao continuar você aceita os Termos e Política de Privacidade.
        </p>
      </div>
    </div>
  );
}

function Field({
  icon,
  type,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5 transition focus-within:border-white/25">
      <span className="text-muted-foreground">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none"
      />
    </label>
  );
}
