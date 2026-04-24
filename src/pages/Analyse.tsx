import { Card } from "@/components/ui/card";
import { AnalyseForm } from "@/components/upi/AnalyseForm";
import { ScanSearch } from "lucide-react";

const Analyse = () => {
  return (
    <div className="container max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <div className="mb-1 flex items-center gap-2 text-accent">
          <ScanSearch className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Fraud Analysis</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analyse a transaction</h1>
        <p className="text-sm text-muted-foreground">Enter the UPI payment details and let UPI Shield check for fraud signals.</p>
      </div>
      <Card className="p-5 sm:p-6">
        <AnalyseForm />
      </Card>
    </div>
  );
};

export default Analyse;