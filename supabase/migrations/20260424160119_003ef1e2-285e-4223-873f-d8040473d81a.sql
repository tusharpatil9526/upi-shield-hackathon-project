-- Profiles linked to auth users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  mobile_number TEXT,
  merchant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by signed-in users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add owner reference to merchants
ALTER TABLE public.merchants
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_merchants_user_id ON public.merchants(user_id);

-- Complaints
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  transaction_id UUID NOT NULL,
  complaint_text TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'pdf', -- portal | helpline | pdf | whatsapp
  status TEXT NOT NULL DEFAULT 'draft', -- draft | filed | resolved
  filed_on TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant reads own complaints"
  ON public.complaints FOR SELECT TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

CREATE POLICY "Merchant inserts own complaints"
  ON public.complaints FOR INSERT TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

CREATE POLICY "Merchant updates own complaints"
  ON public.complaints FOR UPDATE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

CREATE POLICY "Merchant deletes own complaints"
  ON public.complaints FOR DELETE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

-- Also allow public for the demo merchant flow
CREATE POLICY "Public read complaints (demo)"
  ON public.complaints FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert complaints (demo)"
  ON public.complaints FOR INSERT TO anon WITH CHECK (true);

CREATE TRIGGER complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_complaints_merchant ON public.complaints(merchant_id);
CREATE INDEX idx_complaints_transaction ON public.complaints(transaction_id);

-- Community blacklist (anonymised)
CREATE TABLE public.community_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_upi_hash TEXT NOT NULL UNIQUE,
  sender_upi_masked TEXT NOT NULL,
  flag_count INTEGER NOT NULL DEFAULT 1,
  highest_risk_level TEXT NOT NULL DEFAULT 'SUSPICIOUS',
  first_flagged TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_flagged TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads community blacklist"
  ON public.community_blacklist FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can upsert blacklist (demo)"
  ON public.community_blacklist FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update blacklist (demo)"
  ON public.community_blacklist FOR UPDATE TO anon, authenticated USING (true);

CREATE INDEX idx_blacklist_count ON public.community_blacklist(flag_count DESC);

-- Monthly reports
CREATE TABLE public.monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM
  total_txns INTEGER NOT NULL DEFAULT 0,
  flagged_count INTEGER NOT NULL DEFAULT 0,
  amount_at_risk NUMERIC NOT NULL DEFAULT 0,
  safety_score INTEGER NOT NULL DEFAULT 100,
  top_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, month)
);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read reports (demo)"
  ON public.monthly_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert reports (demo)"
  ON public.monthly_reports FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX idx_reports_merchant_month ON public.monthly_reports(merchant_id, month DESC);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, mobile_number)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'mobile_number'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();