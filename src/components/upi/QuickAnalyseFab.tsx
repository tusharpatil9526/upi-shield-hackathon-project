import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AnalyseForm } from "@/components/upi/AnalyseForm";

export function QuickAnalyseFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 h-14 rounded-full px-5 shadow-lg shadow-primary/20"
        size="lg"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Quick Analyse
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>Quick Analyse</SheetTitle>
            <SheetDescription>Check a UPI transaction for fraud signals in seconds.</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <AnalyseForm onComplete={() => setOpen(false)} compact />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}