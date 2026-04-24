import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const DEMO_MERCHANT_ID = "00000000-0000-0000-0000-000000000001";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  merchantId: string | null;
  setMerchantId: (id: string | null) => void;
  enterDemo: () => void;
  exitDemo: () => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState<boolean>(() => localStorage.getItem("upi_demo") === "1");
  const [merchantId, setMerchantIdState] = useState<string | null>(() => {
    if (localStorage.getItem("upi_demo") === "1") return DEMO_MERCHANT_ID;
    return localStorage.getItem("upi_merchant_id");
  });

  const setMerchantId = (id: string | null) => {
    setMerchantIdState(id);
    if (id) localStorage.setItem("upi_merchant_id", id);
    else localStorage.removeItem("upi_merchant_id");
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Load merchant for this user
        setTimeout(async () => {
          const { data } = await supabase
            .from("merchants")
            .select("id")
            .eq("user_id", s.user.id)
            .maybeSingle();
          if (data) setMerchantId(data.id);
        }, 0);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const enterDemo = () => {
    localStorage.setItem("upi_demo", "1");
    setIsDemo(true);
    setMerchantId(DEMO_MERCHANT_ID);
  };

  const exitDemo = () => {
    localStorage.removeItem("upi_demo");
    setIsDemo(false);
    setMerchantId(null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    exitDemo();
    setMerchantId(null);
  };

  return (
    <Ctx.Provider value={{ session, user, loading, isDemo, merchantId, setMerchantId, enterDemo, exitDemo, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}