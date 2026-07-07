import { Link } from "@tanstack/react-router";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  return (
    <Link to="/dashboard" className="inline-flex items-center gap-3">
      <span
        className={`${dims} relative grid place-items-center rounded-2xl bg-brand-gradient shadow-glow`}
      >
        <span className="text-white font-black text-lg leading-none">∞</span>
      </span>
      <span className={`${text} font-extrabold tracking-tight`}>
        Infinity <span className="text-brand-gradient">Gain</span>
      </span>
    </Link>
  );
}
