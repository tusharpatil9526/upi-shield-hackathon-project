import { ReactNode } from "react";
import { ShieldCheck, Lock, AlertTriangle, BadgeCheck } from "lucide-react";

export function AuthShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="min-h-screen w-full bg-background lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 lg:text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 backdrop-blur">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">UPI Shield</p>
            <p className="text-[11px] uppercase tracking-wider opacity-70">Fraud Detection Agent</p>
          </div>
        </div>

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">For India's Small Merchants</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight xl:text-5xl">Protect every rupee.</h1>
          <p className="mt-4 max-w-md text-base leading-relaxed opacity-80">
            AI-powered fraud detection that flags suspicious UPI transactions before they hurt your shop. Trained on real Indian scam patterns.
          </p>

          <div className="mt-10 grid max-w-md gap-3">
            <FeatureChip icon={AlertTriangle} text="Instant fraud alerts on every payment" />
            <FeatureChip icon={BadgeCheck} text="Auto-generated cybercrime complaints" />
            <FeatureChip icon={Lock} text="Community blacklist of repeat offenders" />
          </div>
        </div>

        <p className="text-xs opacity-60">© {new Date().getFullYear()} UPI Shield · Built for Indian shopkeepers</p>

        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-8">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">UPI Shield</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Protect every rupee</p>
          </div>
        </div>

        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function FeatureChip({ icon: Icon, text }: { icon: typeof Lock; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-primary-foreground/5 px-4 py-3 ring-1 ring-primary-foreground/10 backdrop-blur">
      <Icon className="h-4 w-4 shrink-0 text-accent" />
      <span className="text-sm">{text}</span>
    </div>
  );
}