import { Card } from "@/components/ui/card";
import {
  AlarmClockOff,
  Banknote,
  UserX,
  Moon,
  Image as ImageIcon,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

const patterns = [
  {
    icon: AlarmClockOff,
    name: "Urgency Pressure",
    how: "Scammers create panic by using phrases like 'pay now or order cancelled' or 'last chance'. They want you to act before you can think.",
    example: '"Urgent! Send now, my flight is leaving — order will cancel in 5 minutes."',
    color: "high-risk",
  },
  {
    icon: Banknote,
    name: "Unusual Amount",
    how: "Round numbers like ₹10,000 or amounts just under bank alert limits like ₹49,999 are red flags. Banks alert at ₹50,000 — fraudsters stay just below.",
    example: "Sender pays ₹49,999 and demands the goods be sent immediately.",
    color: "suspicious",
  },
  {
    icon: UserX,
    name: "Unknown Sender",
    how: "First-time UPI IDs you have never seen before, especially when paired with high amounts or urgency, deserve extra checking.",
    example: "unknown_9876@ybl pays ₹15,000 with no clear remark.",
    color: "suspicious",
  },
  {
    icon: Moon,
    name: "Late-Night Transaction",
    how: "Genuine business payments rarely happen between 10 PM and 6 AM. Late-night payments from unknown senders are often part of automated scam attempts.",
    example: "₹19,999 received at 2:14 AM from a UPI ID never seen before.",
    color: "high-risk",
  },
  {
    icon: ImageIcon,
    name: "Fake Payment Screenshot",
    how: "Scammers send a screenshot 'showing' the payment was made. The screenshot is fake — no money has actually arrived in your bank account.",
    example: '"Bhai, screenshot bhej raha hu, paisa send kar diya — jaldi maal de do."',
    color: "high-risk",
  },
  {
    icon: RotateCcw,
    name: "Refund Request Scam",
    how: "Sender claims they overpaid by mistake and asks you to refund the difference. Often the original payment is fake or will be reversed.",
    example: '"Sorry, I sent ₹10,000 instead of ₹1,000 — please refund ₹9,000 to this UPI."',
    color: "high-risk",
  },
];

const Patterns = () => {
  return (
    <div className="container max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <div className="mb-1 flex items-center gap-2 text-accent">
          <ShieldAlert className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Education</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">UPI fraud patterns to watch</h1>
        <p className="text-sm text-muted-foreground">These are the 6 patterns UPI Shield's AI checks every transaction against.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {patterns.map((p) => {
          const Icon = p.icon;
          const colorClass = p.color === "high-risk" ? "text-high-risk bg-high-risk-muted" : "text-suspicious bg-suspicious-muted";
          return (
            <Card key={p.name} className="p-5 transition-shadow hover:shadow-md">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${colorClass}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1 text-base font-semibold">{p.name}</h3>
              <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{p.how}</p>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Real example</p>
                <p className="text-xs italic text-foreground/80">{p.example}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Patterns;