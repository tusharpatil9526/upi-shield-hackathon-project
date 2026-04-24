import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AuthShell } from "@/components/upi/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { mobileToEmail, isValidMobile, normalizeMobile } from "@/lib/auth-helpers";

const schema = z
  .object({
    shopName: z.string().trim().min(2, "Shop name is required").max(80),
    fullName: z.string().trim().min(2, "Full name is required").max(80),
    mobile: z.string().refine(isValidMobile, "Enter a valid 10-digit mobile number"),
    upiId: z.string().trim().min(3, "UPI ID is required").max(80).regex(/@/, "UPI ID must contain @"),
    city: z.string().trim().min(2).max(60),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

type Step = "form" | "otp";

const Signup = () => {
  const navigate = useNavigate();
  const { setMerchantId } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);

  const [shopName, setShopName] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [upiId, setUpiId] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [sentCode, setSentCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ shopName, fullName, mobile, upiId, city, password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    // Simulate sending OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);
    setStep("otp");
    toast.success(`OTP sent to +${normalizeMobile(mobile)}`, {
      description: `Demo OTP: ${code}`,
      duration: 8000,
    });
  };

  const handleVerify = async () => {
    if (otp !== sentCode) {
      toast.error("Invalid OTP. Please try again.");
      return;
    }
    setLoading(true);
    const email = mobileToEmail(normalizeMobile(mobile));
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          mobile_number: normalizeMobile(mobile),
        },
      },
    });
    if (error) {
      setLoading(false);
      if (error.message.toLowerCase().includes("already")) {
        toast.error("This mobile number is already registered. Please sign in.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    if (!data.user) {
      setLoading(false);
      toast.error("Could not create account. Try again.");
      return;
    }
    // Create merchant for this user
    const { data: merchant, error: mErr } = await supabase
      .from("merchants")
      .insert({
        user_id: data.user.id,
        shop_name: shopName,
        upi_id: upiId,
        city,
      })
      .select("id")
      .single();
    if (mErr) {
      console.error(mErr);
      toast.error("Account created but shop setup failed. Please contact support.");
      setLoading(false);
      return;
    }
    setMerchantId(merchant.id);
    setLoading(false);
    toast.success(`Welcome to UPI Shield, ${shopName}!`);
    navigate("/", { replace: true });
  };

  return (
    <AuthShell
      title={step === "form" ? "Create your shop account" : "Verify your mobile"}
      subtitle={step === "form" ? "Start protecting your UPI payments in 2 minutes" : `We sent a 6-digit code to +${normalizeMobile(mobile)}`}
    >
      {step === "form" ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="shopName">Shop name</Label>
              <Input id="shopName" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Sharma General Store" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Owner full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rajesh Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input id="mobile" type="tel" inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="98765 43210" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upi">Your shop's UPI ID</Label>
              <Input id="upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="shop@paytm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full">Send OTP</Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-medium text-accent hover:underline">Sign in</Link>
          </p>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Demo mode — OTP shown in toast above
            </div>
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("form")} disabled={loading}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleVerify} disabled={loading || otp.length !== 6} className="flex-1">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify & create account
            </Button>
          </div>

          <button
            type="button"
            className="block w-full text-center text-xs text-muted-foreground hover:text-accent"
            onClick={() => {
              const code = Math.floor(100000 + Math.random() * 900000).toString();
              setSentCode(code);
              setOtp("");
              toast.success(`New OTP sent`, { description: `Demo OTP: ${code}`, duration: 8000 });
            }}
          >
            Didn't receive the code? Resend OTP
          </button>
        </div>
      )}
    </AuthShell>
  );
};

export default Signup;