import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Gift, Percent, TrendingUp, Target, UserPlus, AlertCircle } from "lucide-react";
import { useActiveSite } from "@/contexts/ActiveSiteContext";

const BonusSettings = () => {
  const { activeSite, tenantFilter } = useActiveSite();
  const queryClient = useQueryClient();
  const [referralBetCommission, setReferralBetCommission] = useState("");
  const [referralFirstDepositCommission, setReferralFirstDepositCommission] = useState("");
  const [firstDepositBonusPercent, setFirstDepositBonusPercent] = useState("");
  const [firstDepositBonusFixed, setFirstDepositBonusFixed] = useState("");
  const [wagerMultiplier, setWagerMultiplier] = useState("");
  const [wagerEnabled, setWagerEnabled] = useState(true);
  const [signupBonus, setSignupBonus] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["game-settings", activeSite === "all" ? "all" : activeSite.id],
    queryFn: async () => {
      if (activeSite === "all") return null;
      const { data, error } = await supabase
        .from("game_settings")
        .select("*")
        .match(tenantFilter)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: activeSite !== "all",
  });

  useEffect(() => {
    if (settings) {
      setReferralBetCommission(settings.referral_bet_commission_percent?.toString() ?? "1");
      setReferralFirstDepositCommission(settings.referral_first_deposit_commission_percent?.toString() ?? "10");
      setFirstDepositBonusPercent(settings.first_deposit_bonus_percent?.toString() ?? "50");
      setFirstDepositBonusFixed(settings.first_deposit_bonus_fixed_amount?.toString() ?? "");
      setWagerMultiplier(settings.wager_requirement_multiplier?.toString() ?? "5");
      setWagerEnabled((settings as any).wager_requirement_enabled ?? true);
      setSignupBonus(settings.signup_bonus_amount?.toString() ?? "0");
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<typeof settings>) => {
      const { error } = await supabase
        .from("game_settings")
        .update({ ...updates, tenant_id: activeSite === "all" ? null : activeSite.id })
        .eq("id", settings?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game-settings"] });
      toast.success("Bonus settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update settings: " + error.message);
    },
  });

  const handleSave = () => {
    const updates: Record<string, number | boolean | null> = {
      referral_bet_commission_percent: parseFloat(referralBetCommission) || 0,
      referral_first_deposit_commission_percent: parseFloat(referralFirstDepositCommission) || 0,
      first_deposit_bonus_percent: parseFloat(firstDepositBonusPercent) || 0,
      wager_requirement_multiplier: parseFloat(wagerMultiplier) || 1,
      wager_requirement_enabled: wagerEnabled,
      signup_bonus_amount: parseFloat(signupBonus) || 0,
    };

    if (firstDepositBonusFixed) {
      updates.first_deposit_bonus_fixed_amount = parseFloat(firstDepositBonusFixed);
    } else {
      updates.first_deposit_bonus_fixed_amount = null;
    }

    updateSettingsMutation.mutate(updates);
  };

  if (activeSite === "all") {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-500">
            <AlertCircle className="w-5 h-5" />
            Selection Required
          </CardTitle>
          <CardDescription>
            You must select a specific site from the dropdown above to manage its bonus settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading bonus settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-destructive">Failed to load settings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Bonus & Commission Settings
        </CardTitle>
        <CardDescription>
          Configure referral commissions, deposit bonuses, and wager requirements
        </CardDescription>
        {settings && (
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
            <strong>Current Values:</strong> Bet Commission: {settings.referral_bet_commission_percent}%, 
            First Deposit Commission: {settings.referral_first_deposit_commission_percent}%, 
            Bonus: {settings.first_deposit_bonus_percent}%, 
            Wager: {settings.wager_requirement_multiplier}x
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Signup Bonus
          </h3>
          <div className="space-y-2">
            <Label htmlFor="signupBonus">Signup Bonus Amount</Label>
            <Input
              id="signupBonus"
              type="number"
              step="1"
              min="0"
              value={signupBonus}
              onChange={(e) => setSignupBonus(e.target.value)}
              placeholder="0"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Fixed bonus amount given to new users upon signup (added to bonus wallet)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Referral Commissions
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="refBetCommission">Bet Commission %</Label>
              <Input
                id="refBetCommission"
                type="number"
                step="0.1"
                min="0"
                value={referralBetCommission}
                onChange={(e) => setReferralBetCommission(e.target.value)}
                placeholder="1.0"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Commission % given to referrer on each bet placed by referred user
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refFirstDepCommission">First Deposit Commission %</Label>
              <Input
                id="refFirstDepCommission"
                type="number"
                step="0.1"
                min="0"
                value={referralFirstDepositCommission}
                onChange={(e) => setReferralFirstDepositCommission(e.target.value)}
                placeholder="10.0"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Commission % given to referrer on referred user's first deposit
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Percent className="w-4 h-4" />
            First Deposit Bonus
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstDepBonus">Bonus %</Label>
              <Input
                id="firstDepBonus"
                type="number"
                step="1"
                min="0"
                value={firstDepositBonusPercent}
                onChange={(e) => setFirstDepositBonusPercent(e.target.value)}
                placeholder="50"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Percentage bonus added to first deposit (e.g., 50% of deposit amount)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixedBonus">Fixed Bonus Amount (Optional)</Label>
              <Input
                id="fixedBonus"
                type="number"
                step="1"
                min="0"
                value={firstDepositBonusFixed}
                onChange={(e) => setFirstDepositBonusFixed(e.target.value)}
                placeholder="Leave empty for percentage"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                If set, this fixed amount overrides the percentage bonus
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="w-4 h-4" />
              Wager Requirement
            </h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="wagerEnabled" className="text-sm">Enable</Label>
              <Switch
                id="wagerEnabled"
                checked={wagerEnabled}
                onCheckedChange={setWagerEnabled}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wagerMultiplier">Wager Multiplier</Label>
            <Input
              id="wagerMultiplier"
              type="number"
              step="0.1"
              min="1"
              value={wagerMultiplier}
              onChange={(e) => setWagerMultiplier(e.target.value)}
              placeholder="5"
              className="font-mono"
              disabled={!wagerEnabled}
            />
            <p className="text-xs text-muted-foreground">
              Required wager = Bonus amount × Multiplier (e.g., 5x means user must wager 5 times the bonus)
            </p>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          className="w-full"
          disabled={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending ? "Saving..." : "Save Bonus Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BonusSettings;
