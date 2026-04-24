import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ShieldAlert, Users } from "lucide-react";
import { formatDateTime12, RiskLevel } from "@/lib/upi";
import { RiskBadge } from "@/components/upi/RiskBadge";

interface BlacklistEntry {
  id: string;
  sender_upi_masked: string;
  flag_count: number;
  highest_risk_level: string;
  first_flagged: string;
  last_flagged: string;
}

const Blacklist = () => {
  const [rows, setRows] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("community_blacklist")
      .select("*")
      .order("flag_count", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setRows((data as BlacklistEntry[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container max-w-5xl space-y-5 p-4 sm:p-6">
      <div>
        <div className="mb-1 flex items-center gap-2 text-accent">
          <Users className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Community-powered</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Community Blacklist</h1>
        <p className="text-sm text-muted-foreground">
          Anonymised list of UPI senders flagged by merchants across India. Identities are partially masked to protect privacy.
        </p>
      </div>

      <Card>
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShieldAlert className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No flagged senders in the community yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Rank</th>
                  <th className="px-4 py-2.5 text-left font-medium">Sender (masked)</th>
                  <th className="px-4 py-2.5 text-right font-medium">Flag count</th>
                  <th className="px-4 py-2.5 text-left font-medium">Highest risk</th>
                  <th className="px-4 py-2.5 text-left font-medium">First reported</th>
                  <th className="px-4 py-2.5 text-left font-medium">Last reported</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">#{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.sender_upi_masked}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{r.flag_count}</td>
                    <td className="px-4 py-2.5"><RiskBadge level={r.highest_risk_level as RiskLevel} /></td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime12(r.first_flagged)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime12(r.last_flagged)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Blacklist;