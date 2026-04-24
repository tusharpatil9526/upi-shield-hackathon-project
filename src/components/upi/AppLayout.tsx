import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/upi/AppSidebar";
import { QuickAnalyseFab } from "@/components/upi/QuickAnalyseFab";
import { ShieldCheck } from "lucide-react";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-semibold">UPI Shield</span>
            </div>
            <div className="ml-auto hidden text-xs text-muted-foreground sm:block">
              AI Fraud Detection · for Indian Merchants
            </div>
          </header>
          <main className="flex-1 pb-24">
            <Outlet />
          </main>
        </div>
        <QuickAnalyseFab />
      </div>
    </SidebarProvider>
  );
}