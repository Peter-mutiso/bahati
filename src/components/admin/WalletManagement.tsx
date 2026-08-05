import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlusCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useActiveSite } from "@/contexts/ActiveSiteContext";

interface WalletData {
  id: string;
  user_id: string;
  wallet_cash: number;
  wallet_bonus: number;
  updated_at: string;
  profile?: { email: string } | null;
}

const WalletManagement = () => {
  const { symbol } = useCurrency();
  const queryClient = useQueryClient();
  const { tenantEq, activeSite } = useActiveSite();
  const [selectedWallet, setSelectedWallet] = useState<WalletData | null>(null);
  const [amount, setAmount] = useState("");
  const [action, setAction] = useState<"add" | "deduct">("add");

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["admin-wallets", activeSite === "all" ? "all" : (activeSite as any).id],
    queryFn: async () => {
      const baseQuery = supabase
        .from("wallets")
        .select("*")
        .order("updated_at", { ascending: false });

      // Use match() for shallow type instantiation (avoids TS2589)
      const { data: wallets, error } = tenantEq
        ? await (baseQuery as any).eq(tenantEq[0], tenantEq[1])
        : await baseQuery;

      if (error) throw error;

      // Fetch profiles separately
      const walletsWithProfiles = await Promise.all(
        wallets.map(async (wallet) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", wallet.user_id)
            .maybeSingle();

          return {
            ...wallet,
            profile,
          };
        })
      );

      return walletsWithProfiles;
    },
  });

  const updateWalletMutation = useMutation({
    mutationFn: async ({ walletId, newBalance }: { walletId: string; newBalance: number }) => {
      const { error } = await supabase
        .from("wallets")
        .update({ wallet_cash: newBalance })
        .eq("id", walletId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
      toast.success("Wallet updated successfully");
      setSelectedWallet(null);
      setAmount("");
    },
    onError: (error) => {
      toast.error("Failed to update wallet: " + error.message);
    },
  });

  const handleUpdateWallet = () => {
    if (!selectedWallet || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const currentBalance = Number(selectedWallet.wallet_cash);
    const newBalance = action === "add" 
      ? currentBalance + amountNum 
      : currentBalance - amountNum;

    if (newBalance < 0) {
      toast.error("Cannot deduct more than current balance");
      return;
    }

    updateWalletMutation.mutate({ walletId: selectedWallet.id, newBalance });
  };

  const openDialog = (wallet: WalletData, actionType: "add" | "deduct") => {
    setSelectedWallet(wallet);
    setAction(actionType);
    setAmount("");
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading wallets...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Wallet Management</CardTitle>
          <CardDescription>Add or deduct funds from user wallets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Email</TableHead>
                  <TableHead>Current Balance</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets?.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell className="font-medium">
                      {wallet.profile?.email || "Unknown"}
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {symbol}{(Number(wallet.wallet_cash) + Number(wallet.wallet_bonus)).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(wallet.updated_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openDialog(wallet, "add")}
                      >
                        <PlusCircle className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDialog(wallet, "deduct")}
                      >
                        <MinusCircle className="w-4 h-4 mr-1" />
                        Deduct
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedWallet} onOpenChange={() => setSelectedWallet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "add" ? "Add Funds" : "Deduct Funds"}
            </DialogTitle>
            <DialogDescription>
              {action === "add" 
                ? "Add funds to this user's wallet" 
                : "Deduct funds from this user's wallet"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Balance</Label>
              <div className="text-2xl font-bold text-primary">
                {symbol}{Number(selectedWallet?.wallet_cash || 0).toFixed(2)}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedWallet(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateWallet}>
              {action === "add" ? "Add Funds" : "Deduct Funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletManagement;
