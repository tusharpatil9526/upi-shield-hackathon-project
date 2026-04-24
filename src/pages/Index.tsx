import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_MERCHANT_ID, Transaction, formatINR, formatTime12, riskColor } from "@/lib/upi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/upi/RiskBadge";
import { StatusPill } from "@/components/upi/StatusPill";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Activity, AlertTriangle, CheckCircle2, ShieldAlert, ScanSearch, Inbox } from "lucide-react";

const Dashboard = () => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("merchant_id", DEFAULT_MERCHANT_ID)
        .order("transaction_time", { ascending: false })
        .limit(200);
      if (!mounted) return;
      if (error) console.error(error);
      setTxs((data as Transaction[]) || []);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel("tx-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = txs.filter((t) => new Date(t.transaction_time) >= todayStart);
    const flagged = today.filter((t) => t.status === "flagged").length;
    const safe = today.filter((t) => t.status === "safe").length;
    const avg =
      today.length > 0
        ? Math.round(today.reduce((s, t) => s + (t.risk_score || 0), 0) / today.length)
        : 0;
    return { total: today.length, flagged, safe, avg };
  }, [txs]);

  const recent20 = txs.slice(0, 20);
  const recentAlerts = txs.filter((t) => t.status === "flagged").slice(0, 5);

  const donut = [
    { name: "Safe", value: stats.safe, color: "hsl(var(--safe))" },
    { name: "Flagged", value: stats.flagged, color: "hsl(var(--high-risk))" },
  ];

  const hourly = useMemo(() => {
    const buckets: { hour: string; count: number }[] = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const h = new Date(now.getTime() - i * 60 * 60 * 1000);
      h.setMinutes(0, 0, 0);
      buckets.push({ hour: h.toLocaleTimeString("en-IN", { hour: "numeric", hour12: true }), count: 0 });
    }
    txs.forEach((t) => {
      const tt = new Date(t.transaction_time);
      const diff = Math.floor((Date.now() - tt.getTime()) / (60 * 60 * 1000));
      if (diff >= 0 && diff < 24) {
        buckets[23 - diff].count += 1;
      }
    });
    return buckets;
  }, [txs]);

  const allClearToday = stats.total > 0 && stats.flagged === 0;

  return (
    <div className="container max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live overview of UPI activity at your shop</p>
        </div>
        <Button asChild>
          <Link to="/analyse"><ScanSearch className="mr-2 h-4 w-4" />Analyse Transaction</Link>
        </Button>
      </div>

      {allClearToday && (
        <div className="flex items-center gap-3 rounded-xl border border-safe/30 bg-safe-muted px-4 py-3 text-safe">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-sm font-medium">All clear today — no suspicious transactions detected.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Activity className="h-4 w-4" />} label="Transactions today" value={String(stats.total)} />
        <StatCard icon={<AlertTriangle className="h-4 w-4 text-high-risk" />} label="Flagged today" value={String(stats.flagged)} accent="high-risk" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-safe" />} label="Safe today" value={String(stats.safe)} accent="safe" />
        <StatCard icon={<ShieldAlert className="h-4 w-4 text-suspicious" />} label="Avg risk score" value={String(stats.avg)} accent="suspicious" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <h3 className="mb-2 text-sm font-semibold">Today: Safe vs Flagged</h3>
          {stats.total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No transactions today yet</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {donut.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 flex justify-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-safe" />Safe {stats.safe}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-high-risk" />Flagged {stats.flagged}</span>
          </div>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold">Volume by hour (last 24h)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Feed + alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="text-sm font-semibold">Live transaction feed</h3>
            <Link to="/log" className="text-xs font-medium text-accent hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : recent20.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Time</th>
                    <th className="px-4 py-2 text-left font-medium">Sender UPI</th>
                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                    <th className="px-4 py-2 text-left font-medium">Risk</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recent20.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{formatTime12(t.transaction_time)}</td>
                      <td className="px-4 py-2 font-mono text-xs">{t.sender_upi}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums">{formatINR(t.amount)}</td>
                      <td className="px-4 py-2"><RiskBadge level={t.risk_level} /></td>
                      <td className="px-4 py-2"><StatusPill status={t.status} /></td>
                      <td className="px-4 py-2 text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/analyse?id=${t.id}`}>Analyse</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-1">
          <div className="border-b p-4">
            <h3 className="text-sm font-semibold">Recent alerts</h3>
            <p className="text-xs text-muted-foreground">Last 5 flagged transactions</p>
          </div>
          {recentAlerts.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No alerts yet</p>
          ) : (
            <ul className="divide-y">
              {recentAlerts.map((t) => (
                <li key={t.id} className="p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <RiskBadge level={t.risk_level} />
                    <span className="text-xs text-muted-foreground">{formatTime12(t.transaction_time)}</span>
                  </div>
                  <p className="font-mono text-xs">{t.sender_upi}</p>
                  <p className="text-sm font-semibold">{formatINR(t.amount)}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.summary || (t.explanations[0] ?? "")}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "safe" | "high-risk" | "suspicious";
}) {
  const accentColor =
    accent === "safe" ? "text-safe" : accent === "high-risk" ? "text-high-risk" : accent === "suspicious" ? "text-suspicious" : "text-foreground";
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${accentColor}`}>{value}</p>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">No transactions analysed yet — use the Quick Analyse button to get started</p>
    </div>
  );
}

export default Dashboard;
