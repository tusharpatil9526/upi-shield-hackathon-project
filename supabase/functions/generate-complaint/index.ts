import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SYSTEM_PROMPT = `You are a legal assistant helping Indian citizens file cybercrime complaints.
Generate a formal complaint letter based on the fraud transaction details provided.
The letter must include:
- Complainant details (merchant name, shop, UPI ID, city)
- Incident description with exact date, time, amount, sender UPI ID
- Fraud pattern identified
- Financial loss or attempted loss amount
- Request for investigation
Format it professionally for Indian cybercrime authorities. Plain prose, under 300 words. Address it "To, The Officer-in-Charge, Cybercrime Cell".`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    const { merchant, transaction } = await req.json();
    if (!merchant || !transaction) {
      return new Response(JSON.stringify({ error: "merchant and transaction are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userMsg = `Merchant: ${merchant.shop_name}, owner ${merchant.full_name || "N/A"}, shop UPI ${merchant.upi_id}, city ${merchant.city || "N/A"}, mobile ${merchant.mobile_number || "N/A"}.
Incident: On ${new Date(transaction.transaction_time).toLocaleString("en-IN")}, received UPI request from ${transaction.sender_upi} for Rs. ${transaction.amount}. Remark: "${transaction.remark || "none"}".
Fraud patterns: ${(transaction.flags || []).join(", ") || "general suspicion"}.
Risk: ${transaction.risk_level} (${transaction.risk_score}/100). Summary: ${transaction.summary || ""}

Write the complaint letter now.`;
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });
    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI error:", aiRes.status, await aiRes.text());
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await aiRes.json();
    const text = data?.choices?.[0]?.message?.content || "Could not generate complaint.";
    return new Response(JSON.stringify({ complaint_text: text }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-complaint error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});