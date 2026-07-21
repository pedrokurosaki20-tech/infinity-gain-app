import { useEffect, useState } from "react";
import { Eye, EyeOff, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function BalanceCard() {
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        if (active) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("balance, total_earnings")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setBalance(Number(data.balance ?? 0));
        setTotalEarnings(Number(data.total_earnings ?? 0));
      }
      setLoading(false);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        load();
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 shadow-glow bg-card-gradient border border-white/10">
      <div
        aria-hidden
        className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--gradient-brand)" }}
      />
      <div className="relative flex items-start justify-between">
        <div className="w-full">
          <p className="text-xs uppercase tracking-widest text-white/70">
            Saldo Disponível
          </p>
          <div className="mt-2 flex items-center gap-3">
            <h2 className="text-4xl font-extrabold tracking-tight">
              {loading ? "R$ ••••••" : visible ? formatBRL(balance) : "R$ ••••••"}
            </h2>
            <button
              onClick={() => setVisible((v) => !v)}
              className="rounded-full p-2 text-white/80 transition hover:bg-white/10"
              aria-label={visible ? "Ocultar saldo" : "Mostrar saldo"}
            >
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
            <TrendingUp size={12} />
            Ganhos totais: {loading || !visible ? "R$ ••••" : formatBRL(totalEarnings)}
          </div>
        </div>
      </div>
    </div>
  );
}
