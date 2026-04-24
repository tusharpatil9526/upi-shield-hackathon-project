import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SYSTEM_PROMPT = `You are UPI Shield, an AI fraud detection agent for small Indian merchants.
Analyse the given UPI transaction and detect fraud signals.

Known fraud patterns to check:
1. URGENCY_PRESSURE - remark contains urgent/emergency/cancel/last chance language
2. UNUSUAL_AMOUNT - amount is a round number (5000, 10000, 50000) OR just below bank alert thresholds (49999, 99999, 19999)
3. UNKNOWN_SENDER - sender is not a known/trusted contact
4. LATE_NIGHT - transaction time is between 10 PM and 6 AM IST
5. SUSPICIOUS_REMARK - remark mentions refund, overpayment, screenshot, or asks merchant to send money back
6. HIGH_AMOUNT - amount exceeds ₹10,000 for unknown senders

Use the analyse_transaction tool to return your structured analysis. Always include at least one explanation and one recommended action. Use plain English (or Hinglish where natural) — speak directly to the merchant.`;

const tools = [
  {
    type: "function",
    function: {
      name: "analyse_transaction",
      description: "Return the fraud analysis for a UPI transaction.",
      parameters: {
        type: "object",
        properties: {
          risk_score: { type: "integer", minimum: 0, maximum: 100 },
          risk_level: { type: "string", enum: ["SAFE", "SUSPICIOUS", "HIGH_RISK"] },
          flags: {
            type: "array",
            items: {
              type: "string",
              enum: ["URGENCY_PRESSURE", "UNUSUAL_AMOUNT", "UNKNOWN_SENDER", "LATE_NIGHT", "SUSPICIOUS_REMARK", "HIGH_AMOUNT"],
            },
          },
          explanations: { type: "array", items: { type: "string" } },
          recommended_actions: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
        required: ["risk_score", "risk_level", "flags", "explanations", "recommended_actions", "summary"],
        additionalProperties: false,
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { sender_upi, amount, remark, transaction_time, is_known_sender } = await req.json();

    if (!sender_upi || amount === undefined || amount === null) {
      return new Response(JSON.stringify({ error: "sender_upi and amount are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMsg = `Sender UPI: ${sender_upi} | Amount: ₹${amount} | Remark: ${remark || "(none)"} | Time: ${transaction_time || new Date().toISOString()} | Known sender: ${is_known_sender ? "yes" : "no"}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "analyse_transaction" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call returned:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI did not return a structured analysis" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyse-transaction error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});