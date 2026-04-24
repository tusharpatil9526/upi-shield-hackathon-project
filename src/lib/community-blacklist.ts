import { supabase } from "@/integrations/supabase/client";

// Simple deterministic hash so we don't store raw UPI ids in the community blacklist.
export async function hashUpiId(upi: string): Promise<string> {
  const data = new TextEncoder().encode(upi.toLowerCase().trim() + ":upi-shield-salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function maskUpi(upi: string): string {
  const [name, bank] = upi.split("@");
  if (!name || !bank) return upi;
  const visible = name.slice(0, Math.max(2, Math.floor(name.length / 3)));
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${bank}`;
}

export async function recordCommunityFlag(upi: string, riskLevel: string) {
  const hash = await hashUpiId(upi);
  const masked = maskUpi(upi);
  const { data: existing } = await supabase
    .from("community_blacklist")
    .select("id, flag_count, highest_risk_level")
    .eq("sender_upi_hash", hash)
    .maybeSingle();
  if (existing) {
    const upgrade =
      riskLevel === "HIGH_RISK" ||
      (riskLevel === "SUSPICIOUS" && existing.highest_risk_level !== "HIGH_RISK");
    await supabase
      .from("community_blacklist")
      .update({
        flag_count: existing.flag_count + 1,
        last_flagged: new Date().toISOString(),
        highest_risk_level: upgrade ? riskLevel : existing.highest_risk_level,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("community_blacklist").insert({
      sender_upi_hash: hash,
      sender_upi_masked: masked,
      flag_count: 1,
      highest_risk_level: riskLevel,
    });
  }
}

export async function lookupCommunityFlag(upi: string) {
  const hash = await hashUpiId(upi);
  const { data } = await supabase
    .from("community_blacklist")
    .select("flag_count, highest_risk_level, first_flagged, last_flagged, sender_upi_masked")
    .eq("sender_upi_hash", hash)
    .maybeSingle();
  return data;
}