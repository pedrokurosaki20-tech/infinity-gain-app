import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarCheck,
  CheckCheck,
  Gift,
  Megaphone,
  MessageSquare,
  Share2,
  Trash2,
  UserCircle,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type NotificationRow = {
  id: string;
  category: string;
  title: string;
  body: string;
  icon: string | null;
  priority: string;
  read_at: string | null;
  created_at: string;
};

const categoryMeta: Record<
  string,
  { Icon: typeof Bell; label: string; tint: string }
> = {
  withdrawal: { Icon: Wallet, label: "Saques", tint: "from-[#1E5EFF] to-[#4d8bff]" },
  referral: { Icon: Users, label: "Indique & Ganhe", tint: "from-[#FF66C4] to-[#ff9edb]" },
  share: { Icon: Share2, label: "Compartilhamento", tint: "from-[#1E5EFF] to-[#FF66C4]" },
  rcs: { Icon: MessageSquare, label: "RCS", tint: "from-[#7aa5ff] to-[#1E5EFF]" },
  checkin: { Icon: CalendarCheck, label: "Check-in Diário", tint: "from-[#f5b942] to-[#ff8a3d]" },
  bonus: { Icon: Gift, label: "Bônus", tint: "from-[#FF66C4] to-[#f5b942]" },
  account: { Icon: UserCircle, label: "Conta", tint: "from-[#4ade80] to-[#1E5EFF]" },
  platform: { Icon: Megaphone, label: "Avisos", tint: "from-[#FF66C4] to-[#1E5EFF]" },
};

function metaFor(n: NotificationRow) {
  return categoryMeta[n.category] ?? categoryMeta["platform"]!;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, category, title, body, icon, priority, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as NotificationRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }
      setUserId(userData.user.id);
      await load();
      channel = supabase
        .channel("user-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userData.user.id}`,
          },
          () => load(),
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  const unread = useMemo(() => rows.filter((r) => !r.read_at).length, [rows]);

  async function openPanel() {
    setOpen(true);
    setConfirmClear(false);
  }

  async function markAllRead() {
    if (!userId || unread === 0) return;
    setRows((prev) =>
      prev.map((r) => (r.read_at ? r : { ...r, read_at: new Date().toISOString() })),
    );
    const { error } = await supabase.rpc("mark_all_notifications_read");
    if (error) {
      toast.error("Não foi possível marcar como lidas");
      load();
    }
  }

  async function markOne(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || row.read_at) return;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, read_at: new Date().toISOString() } : r)),
    );
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }

  async function clearAll() {
    setRows([]);
    setConfirmClear(false);
    const { error } = await supabase.rpc("clear_notifications");
    if (error) {
      toast.error("Não foi possível limpar as notificações");
      load();
    } else {
      toast.success("Notificações limpas");
    }
  }

  return (
    <>
      <button
        onClick={openPanel}
        className="glass relative grid h-10 w-10 place-items-center rounded-full"
        aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ""}`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-glow">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            aria-label="Fechar notificações"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative mx-auto w-full max-w-md animate-fade-up rounded-t-3xl border border-white/10 bg-[#0b0b0f]/95 pb-6 shadow-soft">
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/20" />

            <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
              <div>
                <h2 className="text-base font-bold">🔔 Notificações</h2>
                <p className="text-[11px] text-muted-foreground">
                  {unread > 0 ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Tudo em dia"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllRead}
                  disabled={unread === 0}
                  className="glass flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                >
                  <CheckCheck size={13} /> Marcar todas
                </button>
                <button
                  onClick={() => setConfirmClear(true)}
                  disabled={rows.length === 0}
                  className="glass grid h-8 w-8 place-items-center rounded-full text-red-400 disabled:opacity-40"
                  aria-label="Limpar notificações"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="glass grid h-8 w-8 place-items-center rounded-full"
                  aria-label="Fechar"
                >
                  <X size={14} />
                </button>
              </div>
            </header>

            {confirmClear && (
              <div className="mx-5 mb-3 animate-fade-up rounded-2xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs font-semibold text-red-300">
                  Limpar todas as notificações?
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Esta ação não pode ser desfeita.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={clearAll}
                    className="rounded-xl bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="glass rounded-xl px-3 py-1.5 text-[11px] font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-[60vh] space-y-2 overflow-y-auto px-5 pb-2">
              {loading ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p>
              ) : rows.length === 0 ? (
                <div className="py-12 text-center">
                  <BellRing className="mx-auto mb-2 text-muted-foreground" size={26} />
                  <p className="text-sm font-semibold">Nenhuma notificação</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Suas atualizações aparecerão aqui.
                  </p>
                </div>
              ) : (
                rows.map((n) => {
                  const meta = metaFor(n);
                  const Icon = meta.Icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() => markOne(n.id)}
                      className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition ${
                        n.read_at
                          ? "border-white/5 bg-white/[0.02]"
                          : "border-white/10 bg-white/[0.06]"
                      }`}
                    >
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${meta.tint} text-white`}
                      >
                        <Icon size={17} strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{n.title}</span>
                          {!n.read_at && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--brand-pink)]" />
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                          {n.body}
                        </span>
                        <span className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{fmt(n.created_at)}</span>
                          <span>·</span>
                          <span>{meta.label}</span>
                          <span>·</span>
                          <span className={n.read_at ? "" : "text-[color:var(--brand-pink)]"}>
                            {n.read_at ? "Lida" : "Não lida"}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
