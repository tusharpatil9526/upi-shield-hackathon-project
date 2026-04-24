
-- Merchants table
CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name TEXT NOT NULL,
  upi_id TEXT NOT NULL,
  city TEXT,
  alert_threshold NUMERIC NOT NULL DEFAULT 10000,
  night_start_hour INTEGER NOT NULL DEFAULT 22,
  night_end_hour INTEGER NOT NULL DEFAULT 6,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  sender_upi TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  remark TEXT,
  transaction_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_known_sender BOOLEAN NOT NULL DEFAULT false,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'SAFE',
  flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanations JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_merchant ON public.transactions(merchant_id, transaction_time DESC);
CREATE INDEX idx_transactions_status ON public.transactions(status);

-- Whitelist table
CREATE TABLE public.whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  upi_id TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, upi_id)
);

-- Updated-at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_merchants_updated_at
BEFORE UPDATE ON public.merchants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelist ENABLE ROW LEVEL SECURITY;

-- Public access policies (single-merchant prototype, no auth)
-- Merchants
CREATE POLICY "Public read merchants" ON public.merchants FOR SELECT USING (true);
CREATE POLICY "Public insert merchants" ON public.merchants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update merchants" ON public.merchants FOR UPDATE USING (true);

-- Transactions
CREATE POLICY "Public read transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Public insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update transactions" ON public.transactions FOR UPDATE USING (true);
CREATE POLICY "Public delete transactions" ON public.transactions FOR DELETE USING (true);

-- Whitelist
CREATE POLICY "Public read whitelist" ON public.whitelist FOR SELECT USING (true);
CREATE POLICY "Public insert whitelist" ON public.whitelist FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete whitelist" ON public.whitelist FOR DELETE USING (true);

-- Default merchant
INSERT INTO public.merchants (id, shop_name, upi_id, city)
VALUES ('00000000-0000-0000-0000-000000000001', 'Sharma General Store', 'sharma.store@okhdfcbank', 'Jaipur');

-- 15 Seed transactions: mix of safe / suspicious / high-risk
INSERT INTO public.transactions (merchant_id, sender_upi, amount, remark, transaction_time, is_known_sender, risk_score, risk_level, flags, explanations, recommended_actions, summary, status) VALUES
-- Safe transactions
('00000000-0000-0000-0000-000000000001', 'ramesh.kumar@paytm', 250, 'Tea and snacks', now() - interval '1 hour', true, 8, 'SAFE', '[]'::jsonb, '["Known regular customer", "Small amount during business hours"]'::jsonb, '["No action needed"]'::jsonb, 'Routine small payment from a known customer.', 'safe'),
('00000000-0000-0000-0000-000000000001', 'priya.sharma@oksbi', 480, 'Groceries', now() - interval '2 hours', true, 10, 'SAFE', '[]'::jsonb, '["Known sender", "Normal grocery amount"]'::jsonb, '["No action needed"]'::jsonb, 'Normal grocery payment.', 'safe'),
('00000000-0000-0000-0000-000000000001', 'amit.verma@ybl', 1200, 'Monthly milk bill', now() - interval '3 hours', true, 12, 'SAFE', '[]'::jsonb, '["Regular customer for monthly bill"]'::jsonb, '["No action needed"]'::jsonb, 'Routine monthly bill payment.', 'safe'),
('00000000-0000-0000-0000-000000000001', 'sunita.devi@paytm', 75, 'Bread', now() - interval '4 hours', true, 5, 'SAFE', '[]'::jsonb, '["Tiny amount, known sender"]'::jsonb, '["No action needed"]'::jsonb, 'Very small payment, no concerns.', 'safe'),
('00000000-0000-0000-0000-000000000001', 'rajesh.singh@oksbi', 890, 'Vegetables', now() - interval '5 hours', true, 8, 'SAFE', '[]'::jsonb, '["Known sender", "Normal amount"]'::jsonb, '["No action needed"]'::jsonb, 'Routine vegetable payment.', 'safe'),
('00000000-0000-0000-0000-000000000001', 'meena.gupta@ybl', 320, 'Snacks', now() - interval '6 hours', true, 7, 'SAFE', '[]'::jsonb, '["Regular small purchase"]'::jsonb, '["No action needed"]'::jsonb, 'Regular small purchase.', 'safe'),
('00000000-0000-0000-0000-000000000001', 'vikash.yadav@paytm', 540, 'Cold drinks', now() - interval '8 hours', false, 22, 'SAFE', '["UNKNOWN_SENDER"]'::jsonb, '["First-time sender but small amount during business hours"]'::jsonb, '["Verify customer name on next visit"]'::jsonb, 'New customer, small amount — likely fine.', 'safe'),

-- Suspicious transactions
('00000000-0000-0000-0000-000000000001', 'unknown_5421@ybl', 7500, 'Urgent payment please confirm fast', now() - interval '10 hours', false, 58, 'SUSPICIOUS', '["URGENCY_PRESSURE", "UNKNOWN_SENDER"]'::jsonb, '["Remark uses urgent language — common pressure tactic", "Sender is not in your known contacts"]'::jsonb, '["Call sender on a verified number before releasing goods", "Wait for full bank confirmation"]'::jsonb, 'Urgency pressure from unknown sender — verify before proceeding.', 'flagged'),
('00000000-0000-0000-0000-000000000001', 'refund_help@okaxis', 2400, 'Sent extra by mistake please refund', now() - interval '12 hours', false, 65, 'SUSPICIOUS', '["SUSPICIOUS_REMARK", "UNKNOWN_SENDER"]'::jsonb, '["Classic overpayment scam pattern — sender claims mistake and asks for refund", "Unknown sender"]'::jsonb, '["Do NOT refund any amount", "Wait for your bank to confirm the original transaction first", "Report to bank if pressured"]'::jsonb, 'Likely overpayment refund scam. Do not send money back.', 'flagged'),
('00000000-0000-0000-0000-000000000001', 'quickpay_888@ybl', 5000, 'Round figure transfer', now() - interval '14 hours', false, 55, 'SUSPICIOUS', '["UNUSUAL_AMOUNT", "UNKNOWN_SENDER"]'::jsonb, '["Round-number amount of ₹5,000 from unknown sender", "No clear business reason in remark"]'::jsonb, '["Verify customer identity", "Check actual UPI app for confirmation, not screenshot"]'::jsonb, 'Round amount from unknown sender — verify carefully.', 'flagged'),

-- High-risk transactions (clearly fraudulent: late night + unusual amount + unknown sender)
('00000000-0000-0000-0000-000000000001', 'unknown_9876@ybl', 49999, 'Pay now last chance order will cancel', (now()::date + interval '2 hours 14 minutes')::timestamptz, false, 92, 'HIGH_RISK', '["URGENCY_PRESSURE", "UNUSUAL_AMOUNT", "UNKNOWN_SENDER", "LATE_NIGHT", "HIGH_AMOUNT"]'::jsonb, '["Transaction at 2:14 AM — unusual for normal business hours", "₹49,999 is just under the ₹50,000 bank alert threshold — known fraud trick", "Urgent cancellation language used to pressure you", "Sender is unknown and amount is very high"]'::jsonb, '["Do NOT release any goods or services", "Put this transaction on hold immediately", "Call your bank fraud helpline: 1930 (national cyber helpline)", "Save UPI ID and remark as evidence"]'::jsonb, 'Multiple strong fraud signals — almost certainly a scam. Do not proceed.', 'flagged'),
('00000000-0000-0000-0000-000000000001', 'fastpay_321@paytm', 19999, 'Send screenshot of payment immediately', (now()::date - interval '1 day' + interval '23 hours 47 minutes')::timestamptz, false, 88, 'HIGH_RISK', '["UNUSUAL_AMOUNT", "UNKNOWN_SENDER", "LATE_NIGHT", "SUSPICIOUS_REMARK", "HIGH_AMOUNT"]'::jsonb, '["Late-night transaction at 11:47 PM", "₹19,999 is just under ₹20,000 alert threshold", "Sender asking you to rely on screenshot — fake payment screenshot scam", "Unknown sender with high amount"]'::jsonb, '["Always check your real UPI app, never trust screenshots", "Do not deliver goods until amount is in your bank account", "Report this UPI ID to NPCI"]'::jsonb, 'Fake screenshot scam pattern detected.', 'flagged'),
('00000000-0000-0000-0000-000000000001', 'urgent_buyer@okaxis', 99999, 'Emergency need product immediately wire approved', (now()::date + interval '3 hours 30 minutes')::timestamptz, false, 95, 'HIGH_RISK', '["URGENCY_PRESSURE", "UNUSUAL_AMOUNT", "UNKNOWN_SENDER", "LATE_NIGHT", "HIGH_AMOUNT"]'::jsonb, '["3:30 AM transaction — extremely unusual hour", "₹99,999 just under ₹1,00,000 RBI reporting threshold", "Heavy urgency language with vague remark", "Unknown sender with very high amount"]'::jsonb, '["Block this transaction immediately", "Report to cybercrime.gov.in", "Call 1930 cyber crime helpline", "Do not respond to any follow-up calls from this sender"]'::jsonb, 'Critical fraud alert — clear scam pattern with multiple red flags.', 'flagged'),

('00000000-0000-0000-0000-000000000001', 'deepak.jain@oksbi', 1800, 'Stationery order', now() - interval '20 hours', true, 10, 'SAFE', '[]'::jsonb, '["Known sender, normal business amount"]'::jsonb, '["No action needed"]'::jsonb, 'Normal stationery order from regular customer.', 'safe'),
('00000000-0000-0000-0000-000000000001', 'newuser_4567@ybl', 3200, 'Items purchase', now() - interval '22 hours', false, 38, 'SUSPICIOUS', '["UNKNOWN_SENDER"]'::jsonb, '["First-time sender with moderate amount", "Vague remark"]'::jsonb, '["Verify customer in person before fulfilling"]'::jsonb, 'New sender with vague details — verify before delivering.', 'flagged');
