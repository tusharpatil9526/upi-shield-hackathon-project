import { RiskRing } from "@/components/upi/RiskRing";
import { RiskBadge } from "@/components/upi/RiskBadge";
import { RiskLevel, flagLabel } from "@/lib/upi";
import { AlertCircle, ShieldAlert, ListChecks } from "lucide-react";

interface Props {
  result: {
    risk_score: number;
    risk_level: RiskLevel;
    flags: string[];
    explanations: string[];
    recommended_actions: string[];
    summary: string;
  };
}

export function AnalysisResult({ result }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col items-center gap-4 border-b bg-muted/30 p-6 sm:flex-row sm:items-start sm:gap-6">
        <RiskRing score={result.risk_score} level={result.risk_level} />
        <div className="flex-1 text-center sm:text-left">
          <RiskBadge level={result.risk_level} size="md" />
          <p className="mt-3 text-base font-medium leading-snug">{result.summary}</p>
          {result.flags.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {result.flags.map((f) => (
                <span key={f} className="rounded-md bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                  {flagLabel(f)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="h-4 w-4 text-suspicious" />
            Why flagged
          </h3>
          {result.explanations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fraud signals detected.</p>
          ) : (
            <ul className="space-y-2">
              {result.explanations.map((e, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-suspicious" />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="h-4 w-4 text-accent" />
            Recommended action
          </h3>
          <ul className="space-y-2">
            {result.recommended_actions.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}