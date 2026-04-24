import { Transaction, formatINR, formatDateTime12, riskLabel } from "@/lib/upi";

export function whatsappShareUrl(t: {
  sender_upi: string;
  amount: number;
  risk_level: string;
  transaction_time: string;
  summary?: string | null;
}) {
  const text = `🚨 *UPI Shield Fraud Alert*

Risk: *${riskLabel(t.risk_level as Transaction["risk_level"])}*
Sender: ${t.sender_upi}
Amount: ${formatINR(t.amount)}
Time: ${formatDateTime12(t.transaction_time)}

${t.summary || "Suspicious UPI transaction detected. Verify before accepting."}

— Sent via UPI Shield`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}