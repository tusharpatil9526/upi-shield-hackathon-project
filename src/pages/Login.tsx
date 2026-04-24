import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, DEMO_MERCHANT_ID } from "@/contexts/AuthContext";
import { AuthShell } from "@/components/upi/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Phone, Lock, PlayCircle } from "lucide-react";
import { mobileToEmail, isValidMobile, normalizeMobile, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/auth-helpers";

const schema = z.object({
  mobile: z.string().refine(isValidMobile, "Enter a valid 10-digit mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { enterDemo, setMerchantId } = useAuth();
  const from = (location.state as { from?: string })?.from || "/";

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ mobile, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const email = mobileToEmail(normalizeMobile(mobile));
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Wrong mobile number or password");
      return;
    }
    // Load merchant
    const { data: m } = await supabase.from("merchants").select("id").eq("user_id", data.user.id).maybeSingle();
    if (m) setMerchantId(m.id);
    if (!remember) {
      // Supabase persists by default; nothing to do for "don't remember" without changing client storage
    }
    toast.success("Welcome back!");
    navigate(from, { replace: true });
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    // Try sign in; if fails, sign up
    let { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    if (error) {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        options: { data: { full_name: "Demo Merchant", mobile_number: "9999900000" } },
      });
      if (signUpErr && !signUpErr.message.toLowerCase().includes("already")) {
        toast.error(signUpErr.message);
        setDemoLoading(false);
        return;
      }
      const retry = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
      error = retry.error;
    }
    if (error) {
      // Fall back to local-only demo (no auth) — uses seed data
      enterDemo();
      toast.success("Loaded demo with seed data");
      navigate("/", { replace: true });
      setDemoLoading(false);
      return;
    }
    // Bind demo merchant id (shared seed)
    setMerchantId(DEMO_MERCHANT_ID);
    enterDemo();
    toast.success("Demo mode — explore freely");
    navigate("/", { replace: true });
    setDemoLoading(false);
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your UPI Shield account">
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="mobile">Mobile number</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="mobile"
              type="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              className="pl-9"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="pl-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
          Remember me on this device
        </label>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center"><span className="bg-background px-3 text-xs uppercase tracking-wider text-muted-foreground">Or</span></div>
      </div>

      <Button variant="outline" className="w-full" size="lg" onClick={handleDemo} disabled={demoLoading}>
        {demoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
        Try Demo — no signup needed
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to UPI Shield?{" "}
        <Link to="/signup" className="font-medium text-accent hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
};

export default Login;