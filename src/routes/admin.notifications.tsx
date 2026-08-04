import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Central de Notificações — Admin Infinity Gain" },
      {
        name: "description",
        content: "Envie avisos e alertas para todos os usuários ou para um usuário específico.",
      },
    ],
  }),
  component: AdminNotificationsPage,
});

type UserRow = { id: string; name: string | null; email: string | null };

const categories = [
  { value: "platform", label: "📣 Aviso da plataforma" },
  { value: "withdrawal", label: "💰 Saques" },
  { value: "referral", label: "👥 Indique e Ganhe" },
  { value: "share", label: "📢 Compartilhamento" },
  { value: "rcs", label: "📩 RCS" },
  { value: "checkin", label: "🎁 Check-in Diário" },
  { value: "bonus", label: "🎉 Bônus" },
  { value: "account", label: "👤 Conta" },
];

const priorities = [
  { value: "low", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Alta" },
];

function AdminNotificationsPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sending, setSending] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("platform");
  const [icon, setIcon] = useState("");
  const [priority, setPriority] = useState("normal");
  const [target, setTarget] = useState<"all" | "one">("all");
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate({ to: "/" });
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      setChecking(false);
      if (data) {
        const { data: list } = await supabase.rpc("admin_list_users_basic");
        setUsers((list ?? []) as UserRow[]);
      }
    })();
  }, [navigate]);

  async function send() {
    if (!title.trim()) {
      toast.error("Informe o título");
      return;
    }
    if (target === "one" && !userId) {
      toast.error("Selecione o usuário");
      return;
    }
    setSending(true);
    const { data, error } = await supabase.rpc("admin_send_notification", {
      _title: title.trim(),
      _body: body.trim(),
      _category: category,
      _icon: icon.trim() || undefined,
      _priority: priority,
      _user_id: target === "one" ? userId : undefined,
      _created_at: date ? new Date(date).toISOString() : undefined,
    });
    setSending(false);
    if (error) {
      toast.error("Falha ao enviar: " + error.message);
      return;
    }
    toast.success(`Notificação enviada para ${data ?? 0} usuário(s)`);
    setTitle("");
    setBody("");
    setIcon("");
    setDate("");
  }

  if (checking) {
    return (
      <AppShell>
        <div className="mt-20 text-center text-sm text-muted-foreground">Verificando acesso…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="glass mt-10 rounded-3xl p-6 text-center">
          <p className="text-sm font-semibold">Acesso restrito</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <Link to="/admin" className="glass grid h-10 w-10 place-items-center rounded-full" aria-label="Voltar">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold">Central de Notificações</h1>
        <span className="glass grid h-10 w-10 place-items-center rounded-full">
          <Bell size={16} />
        </span>
      </header>

      <section className="glass mt-6 space-y-4 rounded-3xl p-5">
        <div>
          <Label>Destinatário</Label>
          <div className="mt-1.5 flex gap-2">
            {(["all", "one"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  target === t ? "bg-brand-gradient text-white shadow-glow" : "glass text-muted-foreground"
                }`}
              >
                {t === "all" ? "Todos os usuários" : "Usuário específico"}
              </button>
            ))}
          </div>
        </div>

        {target === "one" && (
          <div className="animate-fade-up">
            <Label>Usuário</Label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none"
            >
              <option value="" className="bg-[#0b0b0f]">
                Selecione…
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-[#0b0b0f]">
                  {u.name || "Sem nome"} · {u.email || u.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Label>Título</Label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Manutenção programada"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <Label>Mensagem</Label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Escreva a mensagem que o usuário verá no sino."
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value} className="bg-[#0b0b0f]">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none"
            >
              {priorities.map((p) => (
                <option key={p.value} value={p.value} className="bg-[#0b0b0f]">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Ícone (emoji)</Label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="📣"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <Label>Data</Label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none"
            />
          </div>
        </div>

        <button
          onClick={send}
          disabled={sending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
        >
          <Send size={16} />
          {sending ? "Enviando…" : "Enviar notificação"}
        </button>
      </section>
    </AppShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
      {children}
    </span>
  );
}
