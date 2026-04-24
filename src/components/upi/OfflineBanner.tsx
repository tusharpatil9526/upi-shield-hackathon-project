import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { getQueuedAnalyses, processQueue } from "@/lib/offline-queue";
import { toast } from "sonner";

export function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(getQueuedAnalyses().length);

  useEffect(() => {
    const goOnline = async () => {
      setOnline(true);
      const queued = getQueuedAnalyses();
      if (queued.length > 0) {
        toast.success(`Back online — analysing ${queued.length} queued transaction${queued.length > 1 ? "s" : ""}…`);
        await processQueue();
        setQueueSize(getQueuedAnalyses().length);
      }
    };
    const goOffline = () => {
      setOnline(false);
      toast.warning("You are offline — transactions will be analysed when connection is restored");
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const interval = setInterval(() => setQueueSize(getQueuedAnalyses().length), 3000);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(interval);
    };
  }, []);

  if (online && queueSize === 0) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-suspicious/30 bg-suspicious-muted px-4 py-2 text-xs font-medium text-suspicious">
      <WifiOff className="h-3.5 w-3.5" />
      {online
        ? `Syncing ${queueSize} queued transaction${queueSize > 1 ? "s" : ""}…`
        : "You are offline — transactions will be analysed when connection is restored"}
    </div>
  );
}