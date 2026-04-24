export const DEFAULT_MERCHANT_ID = "00000000-0000-0000-0000-000000000001";

export type RiskLevel = "SAFE" | "SUSPICIOUS" | "HIGH_RISK";
export type TxStatus = "safe" | "flagged" | "pending";

export interface Transaction {
  id: string;
  merchant_id: string;
  sender_upi: string;
  amount: number;
  remark: string | null;
  transaction_time: string;
  is_known_sender: boolean;
  risk_score: number;
  risk_level: RiskLevel;
  flags: string[];
  explanations: string[];
  recommended_actions: string[];
  summary: string | null;
  status: TxStatus;
  created_at: string;
}

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const formatTime12 = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
};

export const formatDateTime12 = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const riskColor = (level: RiskLevel) => {
  switch (level) {
    case "SAFE":
      return "safe";
    case "SUSPICIOUS":
      return "suspicious";
    case "HIGH_RISK":
      return "high-risk";
  }
};

export const riskLabel = (level: RiskLevel) => {
  switch (level) {
    case "SAFE":
      return "Safe";
    case "SUSPICIOUS":
      return "Suspicious";
    case "HIGH_RISK":
      return "High Risk";
  }
};

export const flagLabel = (flag: string) => {
  const map: Record<string, string> = {
    URGENCY_PRESSURE: "Urgency Pressure",
    UNUSUAL_AMOUNT: "Unusual Amount",
    UNKNOWN_SENDER: "Unknown Sender",
    LATE_NIGHT: "Late Night",
    SUSPICIOUS_REMARK: "Suspicious Remark",
    HIGH_AMOUNT: "High Amount",
  };
  return map[flag] || flag;
};