import { supabase } from "@/integrations/supabase/client";

export const SHARE_PLATFORMS = ["facebook", "instagram", "x", "tiktok", "kwai"] as const;
export type SharePlatform = (typeof SHARE_PLATFORMS)[number];

export const PLATFORM_LABEL: Record<SharePlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  tiktok: "TikTok",
  kwai: "Kwai",
};

export const CAMPAIGN_BUCKET = "share-campaigns";

export type ShareCampaignState = {
  campaign_id: string | null;
  platform: string;
  title: string | null;
  text_content: string | null;
  file_url: string | null;
  file_type: string | null;
  share_url: string | null;
  available: boolean;
  next_available_at: string | null;
  last_status: "pending" | "approved" | "rejected" | null;
};

/** Fallback público de cada rede quando o admin não define um link oficial. */
export function defaultShareUrl(platform: string, origin: string) {
  switch (platform) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(origin)}`;
    case "x":
      return `https://twitter.com/intent/tweet?url=${encodeURIComponent(origin)}`;
    case "instagram":
      return "https://www.instagram.com/";
    case "tiktok":
      return "https://www.tiktok.com/upload";
    case "kwai":
      return "https://www.kwai.com/";
    default:
      return origin;
  }
}

/** Arquivos podem ser URL externa ou caminho no bucket privado. */
export async function resolveCampaignFileUrl(fileUrl: string | null | undefined) {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const { data } = await supabase.storage.from(CAMPAIGN_BUCKET).createSignedUrl(fileUrl, 3600);
  return data?.signedUrl ?? null;
}

export async function loadCampaignState(platform: string) {
  const { data, error } = await supabase.rpc("share_campaign_state", { _platform: platform });
  if (error) return null;
  const row = Array.isArray(data) ? (data[0] as any) : (data as any);
  return (row ?? null) as ShareCampaignState | null;
}
