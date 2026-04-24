import { useEffect, useState } from "react";
import { lookupCommunityFlag } from "@/lib/community-blacklist";
import { ShieldAlert } from "lucide-react";
import { formatDateTime12 } from "@/lib/upi";

export function CommunityWarning({ upi }: { upi: string }) {
  const [info, setInfo] = useState<{ flag_count: number; first_flagged: string; highest_risk_level: string } | null>(null);

  useEffect(() => {
    if (!upi) return;
    let mounted = true;
    lookupCommunityFlag(upi).then((d) => {
      if (mounted && d) setInfo(d);
    });
    return () => { mounted = false; };
  }, [upi]);

  if (!info) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-high-risk/40 bg-high-risk-muted px-4 py-3 text-high-risk">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold">Warning: This UPI ID was flagged by another merchant previously</p>
        <p className="mt-0.5 text-xs opacity-80">
          Flagged {info.flag_count} time{info.flag_count > 1 ? "s" : ""} across the community · first reported {formatDateTime12(info.first_flagged)}
        </p>
      </div>
    </div>
  );
}