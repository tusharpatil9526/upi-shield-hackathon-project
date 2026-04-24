import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2, Copy, ExternalLink, Phone, Download, MessageCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Transaction } from "@/lib/upi";
import { generateComplaintPdf } from "@/lib/complaint-pdf";
import { whatsappShareUrl } from "@/lib/whatsapp";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tx: Transaction;
}

export function CybercrimeModal({ open, onOpenChange, tx }: Props) {
  const { merchantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [merchant, setMerchant] = useState<{ shop_name: string; upi_id: string; city: string | null } | null>(null);

  useEffect(() => {
    if (!open || !merchantId) return;
    setLoading(true);
    setComplaint("");
    (async () => {
      const { data: m } = await supabase.from("merchants").select("shop_name, upi_id, city").eq("id", merchantId).maybeSingle();
      if (m) setMerchant(m);
      const { data, error } = await supabase.functions.invoke("generate-complaint", {
        body: { merchant: m, transaction: tx },
      });
      setLoading(false);
      if (error) {
        toast.error("Could not generate complaint. Try again.");
        return;
      }
      setComplaint(data.complaint_text);
      // Save draft
      await supabase.from("complaints").insert({
        merchant_id: merchantId,
        transaction_id: tx.id,
        complaint_text: data.complaint_text,
        method: "draft",
        status: "draft",
      });
    })();
  }, [open, merchantId, tx]);

  const copyText = async () => {
    await navigator.clipboard.writeText(complaint);
    toast.success("Complaint copied to clipboard");
  };

  const downloadPdf = () => {
    if (!merchant) return;
    generateComplaintPdf({ merchant, tx, complaintText: complaint });
    toast.success("PDF downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-high-risk" /> File a Cybercrime Complaint
          </DialogTitle>
          <DialogDescription>
            UPI Shield has prepared a formal complaint. Choose how you'd like to file it.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">AI is drafting your complaint letter…</p>
          </div>
        ) : (
          <Tabs defaultValue="portal" className="mt-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="portal">Portal</TabsTrigger>
              <TabsTrigger value="helpline">1930</TabsTrigger>
              <TabsTrigger value="pdf">PDF</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>

            <TabsContent value="portal" className="space-y-3 pt-4">
              <Card className="bg-muted/30 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI-generated complaint</p>
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">{complaint}</pre>
              </Card>
              <div className="rounded-lg border bg-accent/5 p-3 text-sm">
                <p className="mb-1.5 font-semibold">How to file:</p>
                <ol className="ml-4 list-decimal space-y-0.5 text-xs text-muted-foreground">
                  <li>Click "Report Cyber Crime" on cybercrime.gov.in</li>
                  <li>Select "Financial Fraud"</li>
                  <li>Paste the complaint above into the description field</li>
                </ol>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyText} className="flex-1"><Copy className="mr-2 h-4 w-4" />Copy</Button>
                <Button asChild className="flex-1">
                  <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Go to cybercrime.gov.in
                  </a>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="helpline" className="space-y-3 pt-4">
              <Card className="bg-gradient-to-br from-accent to-primary p-6 text-primary-foreground">
                <p className="text-xs uppercase tracking-wider opacity-80">National Cybercrime Helpline</p>
                <p className="mt-1 text-4xl font-bold">1930</p>
                <Button asChild variant="secondary" size="lg" className="mt-4 w-full">
                  <a href="tel:1930"><Phone className="mr-2 h-4 w-4" />Tap to call now</a>
                </Button>
              </Card>
              <div className="rounded-lg border p-4 text-sm">
                <p className="mb-2 font-semibold">What to say on the call:</p>
                <ul className="ml-4 list-disc space-y-1 text-xs text-muted-foreground">
                  <li>"I want to report a UPI fraud attempt from sender {tx.sender_upi}"</li>
                  <li>"Amount involved is ₹{tx.amount.toLocaleString("en-IN")}, time {new Date(tx.transaction_time).toLocaleString("en-IN")}"</li>
                  <li>"I have a transaction ID and AI fraud analysis ready to share"</li>
                </ul>
                <p className="mt-3 text-xs text-muted-foreground"><span className="font-semibold">Best time to call:</span> 9 AM – 6 PM IST (24×7 line, but daytime is faster).</p>
              </div>
            </TabsContent>

            <TabsContent value="pdf" className="space-y-3 pt-4">
              <Card className="p-4">
                <p className="text-sm font-semibold">Download formal complaint PDF</p>
                <p className="mt-1 text-xs text-muted-foreground">Includes UPI Shield header, transaction details, AI analysis, and the complaint letter.</p>
                <p className="mt-2 text-xs italic text-muted-foreground">Ready to submit to your nearest police station or bank.</p>
              </Card>
              <Button onClick={downloadPdf} size="lg" className="w-full"><Download className="mr-2 h-4 w-4" />Download Complaint PDF</Button>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-3 pt-4">
              <Card className="p-4">
                <p className="text-sm font-semibold">Share alert on WhatsApp</p>
                <p className="mt-1 text-xs text-muted-foreground">Send the fraud summary to family, your accountant, or your bank manager instantly.</p>
              </Card>
              <Button asChild size="lg" className="w-full bg-[#25D366] text-white hover:bg-[#20bd5a]">
                <a href={whatsappShareUrl(tx)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> Send Alert on WhatsApp
                </a>
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}