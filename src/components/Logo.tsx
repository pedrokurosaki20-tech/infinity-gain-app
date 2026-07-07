import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/infinity-gain-logo.png.asset.json";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const h = size === "lg" ? "h-16" : size === "sm" ? "h-8" : "h-11";
  return (
    <Link to="/dashboard" className="inline-flex items-center" aria-label="Infinity Gain">
      <img
        src={logoAsset.url}
        alt="Infinity Gain"
        className={`${h} w-auto object-contain select-none`}
        draggable={false}
      />
    </Link>
  );
}
