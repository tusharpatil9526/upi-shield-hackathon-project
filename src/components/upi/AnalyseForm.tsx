import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ScanSearch, Loader2, FileWarning, MessageCircle } from "lucide-react";
import { AnalysisResult } from "@/components/upi/AnalysisResult";
import { DEFAULT_MERCHANT_ID, RiskLevel } from "@/lib/upi";
import { useAuth } from "@/contexts/AuthContext";
import { CommunityWarning } from "@/components/upi/CommunityWarning";
import { CybercrimeModal } from "@/components/upi/CybercrimeModal";
import { recordCommunityFlag } from "@/lib/community-blacklist";
import { enqueueAnalysis } from "@/lib/offline-queue";
import { whatsappShareUrl } from "@/lib/whatsapp";

interface AIResult {
  risk_score: number;
  risk_level: RiskLevel;
  flags: string[];
  explanations: string[];
  recommended_actions: string[];
  summary: string;
}

const nowLocalISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export function AnalyseForm({ onComplete, compact }: { onComplete?: () => void; compact?: boolean }) {
  const navigate = useNavigate();
  const { merchantId } = useAuth();
  const activeMerchantId = merchantId || DEFAULT_MERCHANT_ID;
  const [senderUpi, setSenderUpi] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [remark, setRemark] = useState("");
  const [time, setTime] = useState(nowLocalISO());
  const [isKnown, setIsKnown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedTx, setSavedTx] = useState<any>(null);
  const [cybercrimeOpen, setCybercrimeOpen] = useState(false);

  const reset = () => {
    setSenderUpi("");
    setAmount("");
    setRemark("");
    setTime(nowLocalISO());
    setIsKnown(false);
    setResult(null);
    setSavedId(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderUpi.trim() || !amount) {
      toast.error("Please fill UPI ID and amount");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }
    if (!navigator.onLine) {
      enqueueAnalysis({
        merchant_id: activeMerchantId,
        sender_upi: senderUpi.trim(),
        amount: numAmount,
        remark: remark.trim() || null,
        transaction_time: new Date(time).toISOString(),
        is_known_sender: isKnown,
      });
      toast.success("Queued — will analyse when you're back online");
      reset();
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const txTime = new Date(time).toISOString();
      const { data, error } = await supabase.functions.invoke("analyse-transaction", {
        body: {
          sender_upi: senderUpi.trim(),
          amount: numAmount,
          remark: remark.trim(),
          transaction_time: txTime,
          is_known_sender: isKnown,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const ai = data as AIResult;
      setResult(ai);

      // Auto-log as pending
      const { data: inserted, error: insErr } = await supabase
        .from("transactions")
        .insert({
          merchant_id: activeMerchantId,
          sender_upi: senderUpi.trim(),
          amount: numAmount,
          remark: remark.trim() || null,
          transaction_time: txTime,
          is_known_sender: isKnown,
          risk_score: ai.risk_score,
          risk_level: ai.risk_level,
          flags: ai.flags,
          explanations: ai.explanations,
          recommended_actions: ai.recommended_actions,
          summary: ai.summary,
          status: ai.risk_level === "SAFE" ? "safe" : "flagged",
        })
        .select("*")
        .single();
      if (insErr) console.error(insErr);
      else {
        setSavedId(inserted.id);
        setSavedTx(inserted);
      }
      // Record in community blacklist if flagged
      if (ai.risk_level !== "SAFE") {
        recordCommunityFlag(senderUpi.trim(), ai.risk_level).catch(console.error);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to analyse transaction");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: "safe" | "flagged") => {
    if (!savedId) return;
    const { error } = await supabase.from("transactions").update({ status }).eq("id", savedId);
    if (error) {
      toast.error("Could not update status");
      return;
    }
    toast.success(status === "safe" ? "Marked as safe and logged" : "Logged as suspicious for dispute");
    if (status === "flagged") {
      setCybercrimeOpen(true);
      return;
    }
    if (onComplete) onComplete();
    else navigate("/log");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-card p-10 text-center">
        <div className="relative">
          <div className="pulse-ring flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
            <ScanSearch className="h-8 w-8 text-accent" />
          </div>
        </div>
        <div>
          <p className="font-semibold">AI is checking fraud patterns…</p>
          <p className="text-sm text-muted-foreground">Looking at amount, sender, time and remark</p>
        </div>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-4">
        {senderUpi && result.risk_level !== "SAFE" && <CommunityWarning upi={senderUpi} />}
        <AnalysisResult result={result} />
        {result.risk_level !== "SAFE" && savedTx && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="outline" asChild className="bg-[#25D366]/10 text-[#075E54] hover:bg-[#25D366]/20">
              <a href={whatsappShareUrl({ ...savedTx, summary: result.summary })} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Send Alert on WhatsApp
              </a>
            </Button>
            <Button variant="outline" onClick={() => setCybercrimeOpen(true)}>
              <FileWarning className="mr-2 h-4 w-4" /> File Cybercrime Complaint
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => updateStatus("safe")} disabled={!savedId}>
            Mark as Safe & Log
          </Button>
          <Button onClick={() => updateStatus("flagged")} disabled={!savedId}>
            Log as Suspicious for Dispute
          </Button>
        </div>
        <Button variant="ghost" className="w-full" onClick={reset}>
          Analyse another transaction
        </Button>
        {savedTx && (
          <CybercrimeModal open={cybercrimeOpen} onOpenChange={setCybercrimeOpen} tx={savedTx} />
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "space-y-3" : "space-y-4"}>
      {senderUpi.includes("@") && <CommunityWarning upi={senderUpi} />}
      <div className="space-y-1.5">
        <Label htmlFor="upi">Sender UPI ID</Label>
        <Input
          id="upi"
          placeholder="e.g. ramesh.kumar@paytm"
          value={senderUpi}
          onChange={(e) => setSenderUpi(e.target.value)}
          autoComplete="off"
          maxLength={120}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount (₹)</Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="time">Transaction time</Label>
          <Input id="time" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="remark">Remark / note</Label>
        <Textarea
          id="remark"
          placeholder="e.g. Urgent payment for order"
          rows={compact ? 2 : 3}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          maxLength={500}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
        <div>
          <Label htmlFor="known" className="cursor-pointer">
            Known sender
          </Label>
          <p className="text-xs text-muted-foreground">A regular customer you trust</p>
        </div>
        <Switch id="known" checked={isKnown} onCheckedChange={setIsKnown} />
      </div>
      <Button type="submit" className="w-full" size="lg">
        <ScanSearch className="mr-2 h-4 w-4" />
        Analyse with AI
      </Button>
    </form>
  );
}