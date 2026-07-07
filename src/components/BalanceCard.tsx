import { useState } from "react";
import { Eye, EyeOff, TrendingUp } from "lucide-react";

export function BalanceCard({
  balance = 1284.5,
  gain = 12.4,
}: {
  balance?: number;
  gain?: number;
}) {
  const [visible, setVisible] = useState(true);
  const formatted = balance.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  return (
    <div className="relative overflow-hidden rounded-3xl p-6 shadow-glow bg-card-gradient border border-white/10">
      <div
        aria-hidden
        className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--gradient-brand)" }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/70">
            Saldo Disponível
          </p>
          <div className="mt-2 flex items-center gap-3">
            <h2 className="text-4xl font-extrabold tracking-tight">
              {visible ? formatted : "R$ ••••••"}
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
            +{gain.toFixed(1)}% esta semana
          </div>
        </div>
      </div>
    </div>
  );
}
