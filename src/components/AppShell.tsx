import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Wallet, Users, User, ArrowDownToLine } from "lucide-react";
import type { ReactNode } from "react";

const items = [
  { to: "/dashboard", label: "Início", icon: Home },
  { to: "/wallet", label: "Carteira", icon: Wallet },
  { to: "/withdraw", label: "Saque", icon: ArrowDownToLine },
  { to: "/referral", label: "Indicar", icon: Users },
  { to: "/profile", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-4 pb-4 pt-2">
      <div className="glass grid grid-cols-5 rounded-3xl px-2 py-2 shadow-soft">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2 transition-colors"
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl transition-all ${
                  active
                    ? "bg-brand-gradient text-white shadow-glow"
                    : "text-muted-foreground"
                }`}
              >
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({
  children,
  withNav = true,
}: {
  children: ReactNode;
  withNav?: boolean;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Ambient gradients */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(600px 400px at 10% -10%, rgba(30,94,255,0.25), transparent 60%), radial-gradient(500px 400px at 100% 10%, rgba(255,102,196,0.18), transparent 60%)",
        }}
      />
      <main
        className={`relative mx-auto max-w-md px-5 pt-6 ${
          withNav ? "pb-32" : "pb-8"
        }`}
      >
        {children}
      </main>
      {withNav && <BottomNav />}
    </div>
  );
}
