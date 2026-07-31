import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, User, Phone, Gift, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { getSignupContext } from "@/lib/referral";


export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Criar conta — Infinity Gain" },
      {
        name: "description",
        content: "Crie sua conta Infinity Gain em segundos e comece a ganhar com tarefas online.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
    invite: "",
  });
  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setForm((f) => (f.invite ? f : { ...f, invite: ref.toUpperCase() }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 6) {
      setError("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const ctx = await getSignupContext();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          name: form.name,
          phone: form.phone,
          invite: form.invite ? form.invite.trim().toUpperCase() : null,
          signup_ip: ctx.ip,
          device_id: ctx.device,
          user_agent: ctx.ua,
        },
      },
    });
    setLoading(false);

    if (error) {
      setError(
        error.message.includes("registered")
          ? "Este e-mail já está cadastrado."
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
            "radial-gradient(700px 500px at 50% -10%, rgba(255,102,196,0.3), transparent 60%), radial-gradient(500px 400px at 0% 100%, rgba(30,94,255,0.28), transparent 60%)",
        }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </Link>
          <Logo size="sm" />
          <span className="w-10" />
        </div>

        <div className="mt-10 animate-fade-up">
          <h1 className="text-3xl font-extrabold tracking-tight">Crie sua conta</h1>
          <p className="mt-2 text-muted-foreground">
            É rápido, gratuito e você já começa a ganhar hoje.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3.5 animate-fade-up">
          <Field icon={<User size={18} />} placeholder="Nome completo" value={form.name} onChange={set("name")} />
          <Field icon={<Phone size={18} />} type="tel" placeholder="Telefone" value={form.phone} onChange={set("phone")} />
          <Field icon={<Mail size={18} />} type="email" placeholder="E-mail" value={form.email} onChange={set("email")} />
          <Field icon={<Lock size={18} />} type="password" placeholder="Senha" value={form.password} onChange={set("password")} />
          <Field icon={<Lock size={18} />} type="password" placeholder="Confirmar senha" value={form.confirm} onChange={set("confirm")} />
          <Field icon={<Gift size={18} />} placeholder="Código de convite (opcional)" value={form.invite} onChange={set("invite")} />

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Criar Conta"}
              {!loading && (
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </div>

          <p className="pt-3 text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/" className="font-semibold text-white">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5">
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
