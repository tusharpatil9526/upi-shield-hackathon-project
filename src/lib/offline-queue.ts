import { supabase } from "@/integrations/supabase/client";

export interface QueuedAnalysis {
  id: string;
  merchant_id: string;
  sender_upi: string;
  amount: number;
  remark: string | null;
  transaction_time: string;
  is_known_sender: boolean;
  queued_at: string;
}

const QUEUE_KEY = "upi_offline_queue";
const CACHE_KEY = "upi_recent_cache";
const CACHE_LIMIT = 10;

export function getQueuedAnalyses(): QueuedAnalysis[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function enqueueAnalysis(item: Omit<QueuedAnalysis, "id" | "queued_at">) {
  const queue = getQueuedAnalyses();
  queue.push({
    ...item,
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queued_at: new Date().toISOString(),
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export async function processQueue() {
  const queue = getQueuedAnalyses();
  if (queue.length === 0) return;
  const remaining: QueuedAnalysis[] = [];
  for (const item of queue) {
    try {
      const { data: analysis, error } = await supabase.functions.invoke("analyse-transaction", {
        body: {
          sender_upi: item.sender_upi,
          amount: item.amount,
          remark: item.remark,
          transaction_time: item.transaction_time,
          is_known_sender: item.is_known_sender,
        },
      });
      if (error || !analysis) {
        remaining.push(item);
        continue;
      }
      await supabase.from("transactions").insert({
        merchant_id: item.merchant_id,
        sender_upi: item.sender_upi,
        amount: item.amount,
        remark: item.remark,
        transaction_time: item.transaction_time,
        is_known_sender: item.is_known_sender,
        risk_score: analysis.risk_score,
        risk_level: analysis.risk_level,
        flags: analysis.flags,
        explanations: analysis.explanations,
        recommended_actions: analysis.recommended_actions,
        summary: analysis.summary,
        status: analysis.risk_level === "SAFE" ? "safe" : "flagged",
      });
    } catch {
      remaining.push(item);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

export function cacheRecentTx(tx: unknown[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(tx.slice(0, CACHE_LIMIT)));
  } catch {
    /* ignore quota */
  }
}

export function getCachedTx(): unknown[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
  } catch {
    return [];
  }
}