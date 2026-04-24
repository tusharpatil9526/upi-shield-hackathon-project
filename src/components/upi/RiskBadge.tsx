import { cn } from "@/lib/utils";
import { RiskLevel, riskLabel } from "@/lib/upi";

interface Props {
  level: RiskLevel;
  className?: string;
  size?: "sm" | "md";
}

export const RiskBadge = ({ level, className, size = "sm" }: Props) => {
  const styles = {
    SAFE: "bg-safe-muted text-safe border-safe/20",
    SUSPICIOUS: "bg-suspicious-muted text-suspicious border-suspicious/20",
    HIGH_RISK: "bg-high-risk-muted text-high-risk border-high-risk/20",
  }[level];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold uppercase tracking-wide",
        size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        styles,
        className
      )}
    >
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {riskLabel(level)}
    </span>
  );
};