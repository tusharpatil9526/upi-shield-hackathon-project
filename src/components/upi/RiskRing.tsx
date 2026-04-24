import { cn } from "@/lib/utils";
import { RiskLevel } from "@/lib/upi";

interface Props {
  score: number;
  level: RiskLevel;
  size?: number;
}

export const RiskRing = ({ score, level, size = 160 }: Props) => {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  const colorClass = {
    SAFE: "text-safe",
    SUSPICIOUS: "text-suspicious",
    HIGH_RISK: "text-high-risk",
  }[level];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("stroke-current transition-all duration-700 ease-out", colorClass)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-4xl font-bold tabular-nums", colorClass)}>{score}</span>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Risk Score</span>
      </div>
    </div>
  );
};