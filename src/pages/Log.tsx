import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_MERCHANT_ID,
  Transaction,
  formatDateTime12,
  formatINR,
  flagLabel,
} from "@/lib/upi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RiskBadge } from "@/components/upi/RiskBadge";
import { StatusPill } from "@/components/upi/StatusPill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, ChevronDown, ChevronUp, Search, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

const Log = () => {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("merchant_id", DEFAULT_MERCHANT_ID)
        .order("transaction_time", { ascending: false });
      setRows((data as Transaction[]) || []);
    };
    load();
    const ch = supabase
      .channel("log-tx")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search && !r.sender_upi.toLowerCase().includes(search.toLowerCase()) && !(r.summary || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter !== "all" && r.risk_level !== riskFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      const t = new Date(r.transaction_time).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime() + 24 * 60 * 60 * 1000) return false;
      return true;
    });
  }, [rows, search, riskFilter, statusFilter, from, to]);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };

  const exportPdf = (subset: Transaction[]) => {
    const flagged = subset.filter((r) => r.status === "flagged");
    if (flagged.length === 0) {
      toast.error("No flagged transactions to export");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("UPI Shield — Fraud Dispute Report", 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 23);
    doc.text(`Total flagged transactions: ${flagged.length}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [["Txn ID", "Date / Time", "Sender UPI", "Amount (Rs)", "AI Reason", "Action"]],
      body: flagged.map((t) => [
        t.id.slice(0, 8),
        formatDateTime12(t.transaction_time),
        t.sender_upi,
        Number(t.amount).toLocaleString("en-IN"),
        (t.summary || (t.explanations[0] ?? "")).slice(0, 80),
        t.status,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`upi-shield-dispute-${Date.now()}.pdf`);
    toast.success(`Exported ${flagged.length} flagged transactions`);
  };

  return (
    <div className="container max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Transaction Log</h1>
          <p className="text-sm text-muted-foreground">Search, filter and export your full payment history.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={selected.size === 0}
            onClick={() => exportPdf(filtered.filter((r) => selected.has(r.id)))}
          >
            <FileText className="mr-2 h-4 w-4" />Export Selected ({selected.size})
          </Button>
          <Button onClick={() => exportPdf(filtered)}>
            <Download className="mr-2 h-4 w-4" />Export Dispute PDF
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search UPI ID or summary…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger><SelectValue placeholder="Risk level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              <SelectItem value="SAFE">Safe</SelectItem>
              <SelectItem value="SUSPICIOUS">Suspicious</SelectItem>
              <SelectItem value="HIGH_RISK">High Risk</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="safe">Safe</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2"><Checkbox checked={selected.size > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} /></th>
                <th className="px-3 py-2 text-left font-medium">Time</th>
                <th className="px-3 py-2 text-left font-medium">Sender UPI</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium">Risk</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">AI Summary</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">No transactions match your filters</td></tr>
              )}
              {filtered.map((t) => (
                <Fragment key={t.id}>
                  <tr className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selected.has(t.id)}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          if (v) next.add(t.id); else next.delete(t.id);
                          setSelected(next);
                        }}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{formatDateTime12(t.transaction_time)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{t.sender_upi}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">{formatINR(t.amount)}</td>
                    <td className="px-3 py-2"><RiskBadge level={t.risk_level} /></td>
                    <td className="px-3 py-2"><StatusPill status={t.status} /></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground"><span className="line-clamp-1">{t.summary || "—"}</span></td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setExpanded({ ...expanded, [t.id]: !expanded[t.id] })}>
                        {expanded[t.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </td>
                  </tr>
                  {expanded[t.id] && (
                    <tr className="bg-muted/20">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Remark</p>
                            <p className="text-sm">{t.remark || "—"}</p>
                            <p className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk score</p>
                            <p className="text-2xl font-bold">{t.risk_score}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flags</p>
                            <div className="flex flex-wrap gap-1">
                              {t.flags.length === 0 ? <span className="text-sm text-muted-foreground">None</span> : t.flags.map(f => (
                                <span key={f} className="rounded bg-background px-2 py-0.5 text-[11px] ring-1 ring-border">{flagLabel(f)}</span>
                              ))}
                            </div>
                            <p className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explanations</p>
                            <ul className="list-disc space-y-1 pl-4 text-sm">
                              {t.explanations.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommended actions</p>
                            <ul className="list-disc space-y-1 pl-4 text-sm">
                              {t.recommended_actions.map((a, i) => <li key={i}>{a}</li>)}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Log;