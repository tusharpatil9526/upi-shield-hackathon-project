import { cn } from "@/lib/utils";
import { TxStatus } from "@/lib/upi";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";

export const StatusPill = ({ status }: { status: TxStatus }) => {
  const map = {
    safe: { cls: "bg-safe-muted text-safe", Icon: CheckCircle2, label: "Safe" },
    flagged: { cls: "bg-high-risk-muted text-high-risk", Icon: AlertTriangle, label: "Flagged" },
    pending: { cls: "bg-muted text-muted-foreground", Icon: Clock, label: "Pending" },
  }[status];
  const { cls, Icon, label } = map;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};