import { useCallback, useEffect, useState } from "react";
import { Check, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import markAsset from "@/assets/infinity-gain-mark.png.asset.json";

const BRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const DEFAULT_REWARDS = [0.05, 0.05, 0.05, 0.05, 0.1, 0.1, 1];

type State = {
  active: boolean;
  rewards: number[];
  current_day: number;
  cycles_completed: number;
  claimed_today: boolean;
};

function Coin({ shine }: { shine?: boolean }) {
  return (
    <span
      className={`grid h-full w-full place-items-center rounded-full text-[11px] font-black text-amber-900 ${
        shine ? "animate-pulse" : ""
      }`}
      style={{
        background: "radial-gradient(circle at 30% 25%, #ffe9a3, #f5b942 55%, #c98b12)",
        boxShadow: shine ? "0 0 12px 2px rgba(245,185,66,0.55)" : "none",
      }}
      aria-hidden
    >
      $
    </span>
  );
}

export function DailyCheckin() {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("checkin_state");
    if (!error && data && data.length > 0) {
      const r = data[0];
      setState({
        active: r.active,
        rewards: (r.rewards ?? DEFAULT_REWARDS).map(Number),
        current_day: r.current_day,
        cycles_completed: r.cycles_completed,
        claimed_today: r.claimed_today,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  async function claim() {
    if (!state || claiming || state.claimed_today) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_daily_checkin");
    setClaiming(false);
    if (error) {
      toast.error(error.message);
      await load();
      return;
    }
    const row = data?.[0];
    if (row) {
      toast.success(`Check-in realizado! +${BRL(Number(row.amount))}`);
      if (row.cycle_completed) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 2600);
        toast.success("Ciclo de 7 dias concluído! Nova sequência iniciada 🎉");
      }
    }
    window.dispatchEvent(new CustomEvent("balance:refresh"));
    await load();
  }

  if (loading) {
    return (
      <div className="glass flex h-[104px] items-center justify-center rounded-3xl">
        <Loader2 className="animate-spin text-muted-foreground" size={18} />
      </div>
    );
  }

  if (!state || !state.active) return null;

  const rewards = state.rewards.length === 7 ? state.rewards : DEFAULT_REWARDS;
  const today = state.current_day;

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-4">
      {celebrate && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-pulse"
          style={{ background: "var(--gradient-brand)", opacity: 0.18 }}
        />
      )}
      <div className="relative flex items-center gap-3">
        <img
          src={markAsset.url}
          alt="Infinity Gain"
          className="h-12 w-12 shrink-0 rounded-2xl object-cover"
          draggable={false}
        />
        <div className="min-w-0">
          <h3 className="text-sm font-bold leading-tight">Check-in Diário</h3>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {state.claimed_today
              ? "✓ Check-in realizado hoje"
              : "Faça seu check-in diário e receba recompensas."}
          </p>
        </div>
      </div>

      <div className="relative mt-3 flex items-end justify-between gap-1">
        {rewards.map((amount, i) => {
          const day = i + 1;
          const done = day < today || (day === today && state.claimed_today);
          const available = day === today && !state.claimed_today;
          return (
            <button
              key={day}
              type="button"
              disabled={!available || claiming}
              onClick={claim}
              aria-label={`Dia ${day} — ${BRL(amount)}`}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1 transition ${
                available ? "active:scale-90" : "cursor-default"
              }`}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full transition-all duration-300 ${
                  done
                    ? "bg-emerald-500/20 text-emerald-400"
                    : available
                      ? ""
                      : "bg-white/5 text-white/30"
                }`}
              >
                {done ? (
                  <Check size={15} strokeWidth={3} />
                ) : available ? (
                  claiming ? (
                    <Loader2 size={14} className="animate-spin text-white/70" />
                  ) : (
                    <Coin shine />
                  )
                ) : (
                  <Lock size={12} />
                )}
              </span>
              <span
                className={`text-[9px] font-semibold leading-none ${
                  done ? "text-emerald-400" : available ? "text-white" : "text-white/40"
                }`}
              >
                {BRL(amount).replace("R$", "").trim()}
              </span>
              <span className="text-[8px] leading-none text-muted-foreground">D{day}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
