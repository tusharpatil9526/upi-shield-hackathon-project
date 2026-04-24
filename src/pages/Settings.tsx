import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_MERCHANT_ID } from "@/lib/upi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Settings as SettingsIcon } from "lucide-react";

interface Merchant {
  id: string;
  shop_name: string;
  upi_id: string;
  city: string | null;
  alert_threshold: number;
  night_start_hour: number;
  night_end_hour: number;
  notifications_enabled: boolean;
}

interface Whitelist {
  id: string;
  upi_id: string;
  label: string | null;
}

const Settings = () => {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [whitelist, setWhitelist] = useState<Whitelist[]>([]);
  const [newUpi, setNewUpi] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const loadAll = async () => {
    const [{ data: m }, { data: w }] = await Promise.all([
      supabase.from("merchants").select("*").eq("id", DEFAULT_MERCHANT_ID).single(),
      supabase.from("whitelist").select("id, upi_id, label").eq("merchant_id", DEFAULT_MERCHANT_ID).order("created_at", { ascending: false }),
    ]);
    if (m) setMerchant(m as Merchant);
    setWhitelist((w as Whitelist[]) || []);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const save = async () => {
    if (!merchant) return;
    const { error } = await supabase
      .from("merchants")
      .update({
        shop_name: merchant.shop_name,
        upi_id: merchant.upi_id,
        city: merchant.city,
        alert_threshold: merchant.alert_threshold,
        night_start_hour: merchant.night_start_hour,
        night_end_hour: merchant.night_end_hour,
        notifications_enabled: merchant.notifications_enabled,
      })
      .eq("id", DEFAULT_MERCHANT_ID);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  const addWhitelist = async () => {
    if (!newUpi.trim()) return;
    const { error } = await supabase.from("whitelist").insert({
      merchant_id: DEFAULT_MERCHANT_ID,
      upi_id: newUpi.trim(),
      label: newLabel.trim() || null,
    });
    if (error) toast.error(error.message);
    else {
      setNewUpi("");
      setNewLabel("");
      loadAll();
    }
  };

  const removeWhitelist = async (id: string) => {
    const { error } = await supabase.from("whitelist").delete().eq("id", id);
    if (error) toast.error(error.message);
    else loadAll();
  };

  if (!merchant) return <div className="p-6">Loading…</div>;

  return (
    <div className="container max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <div className="mb-1 flex items-center gap-2 text-accent">
          <SettingsIcon className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Configuration</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Merchant profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Shop name</Label>
            <Input value={merchant.shop_name} onChange={(e) => setMerchant({ ...merchant, shop_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>UPI ID</Label>
            <Input value={merchant.upi_id} onChange={(e) => setMerchant({ ...merchant, upi_id: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>City</Label>
            <Input value={merchant.city ?? ""} onChange={(e) => setMerchant({ ...merchant, city: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Alert thresholds</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Auto-flag above (₹)</Label>
            <Input
              type="number"
              value={merchant.alert_threshold}
              onChange={(e) => setMerchant({ ...merchant, alert_threshold: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Night start (hour, 0-23)</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={merchant.night_start_hour}
              onChange={(e) => setMerchant({ ...merchant, night_start_hour: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Night end (hour, 0-23)</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={merchant.night_end_hour}
              onChange={(e) => setMerchant({ ...merchant, night_end_hour: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">In-app alerts</h2>
            <p className="text-xs text-muted-foreground">Show toast notifications on flagged transactions</p>
          </div>
          <Switch
            checked={merchant.notifications_enabled}
            onCheckedChange={(v) => setMerchant({ ...merchant, notifications_enabled: v })}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-base font-semibold">Trusted senders whitelist</h2>
        <p className="mb-4 text-xs text-muted-foreground">These UPI IDs will be treated as known and never auto-flagged.</p>
        <div className="mb-3 flex gap-2">
          <Input placeholder="upi.id@bank" value={newUpi} onChange={(e) => setNewUpi(e.target.value)} />
          <Input placeholder="Label (optional)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="hidden sm:block" />
          <Button onClick={addWhitelist}><Plus className="h-4 w-4" /></Button>
        </div>
        {whitelist.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No trusted senders yet</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {whitelist.map((w) => (
              <li key={w.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="font-mono text-xs">{w.upi_id}</p>
                  {w.label && <p className="text-xs text-muted-foreground">{w.label}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeWhitelist(w.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="sticky bottom-20 flex justify-end">
        <Button size="lg" onClick={save} className="shadow-lg">Save settings</Button>
      </div>
    </div>
  );
};

export default Settings;