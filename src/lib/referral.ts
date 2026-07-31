import { supabase } from "@/integrations/supabase/client";

export const REFERRAL_BASE = "https://infinitygain.site/cadastro";

export function inviteLink(code: string) {
  return `${REFERRAL_BASE}?ref=${code}`;
}

/** Stable per-device identifier used by the anti-fraud analysis. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("ig_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("ig_device_id", id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Signup fingerprint (device, browser, IP) sent as auth metadata. */
export async function getSignupContext() {
  const device = getDeviceId();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let ip = "";
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (res.ok) ip = ((await res.json()) as { ip?: string }).ip ?? "";
  } catch {
    ip = "";
  }
  return { device, ua, ip };
}

/** "now" as seen in America/Sao_Paulo. */
export function spNow(date: Date = new Date()) {
  return new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

export function dailyKey(date: Date = new Date()) {
  const d = spNow(date);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Monday 00:00 of the current week, in SP time. */
export function weekStart(date: Date = new Date()) {
  const d = spNow(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type BonusClaim = {
  id: string;
  period: string;
  period_key: string;
  target: number;
  amount: number;
  created_at: string;
};

export function isClaimed(
  claims: BonusClaim[],
  period: "daily" | "weekly",
  target: number,
) {
  if (period === "daily") {
    const key = dailyKey();
    return claims.some(
      (c) => c.period === "daily" && c.target === target && c.period_key === key,
    );
  }
  const start = weekStart();
  return claims.some(
    (c) =>
      c.period === "weekly" &&
      c.target === target &&
      spNow(new Date(c.created_at)) >= start,
  );
}

export async function loadReferralData() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [profileRes, statsRes, claimsRes, referralsRes] = await Promise.all([
    supabase.from("profiles").select("invite_code, name").eq("id", user.id).maybeSingle(),
    supabase.rpc("referral_stats"),
    supabase
      .from("referral_bonus_claims")
      .select("id, period, period_key, target, amount, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("referrals")
      .select("id, status, created_at, first_task_at, validated_at, review_reason, referred_id")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const stats = (statsRes.data?.[0] ?? {
    valid_total: 0,
    pending_total: 0,
    daily_valid: 0,
    weekly_valid: 0,
    total_commission: 0,
  }) as {
    valid_total: number;
    pending_total: number;
    daily_valid: number;
    weekly_valid: number;
    total_commission: number;
  };

  return {
    userId: user.id,
    inviteCode: profileRes.data?.invite_code ?? "",
    stats,
    claims: (claimsRes.data ?? []) as BonusClaim[],
    referrals: referralsRes.data ?? [],
  };
}
