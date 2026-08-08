import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, TrendingUp, Phone, Search, Ban, CheckCircle, History, ArrowRightLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrency } from "@/hooks/useCurrency";
import UserBetHistory from "./UserBetHistory";
import { useActiveSite } from "@/contexts/ActiveSiteContext";

interface UserBet {
  amount: number;
  profit: number | null;
}

interface UserData {
  id: string;
  email: string;
  username?: string;
  is_banned?: boolean;
  banned_at?: string | null;
  account_type?: string;
  created_at: string;
  wallet?: { wallet_cash: number; wallet_bonus: number } | null;
  bets: UserBet[];
  chickenRoadBets: UserBet[];
}

// Helper to parse phone and email from user data
const parseUserContact = (email: string) => {
  if (email.includes('@mobile.com')) {
    const rawPhone = email.replace('@mobile.com', '');
    // If it has a tenant prefix (e.g. "uuid_phone"), strip it
    const phone = rawPhone.includes('_') ? rawPhone.split('_')[1] : rawPhone;
    return {
      phone: phone,
      email: null
    };
  }
  return {
    phone: null,
    email: email
  };
};

const UserManagement = () => {
  const { symbol } = useCurrency();
  const queryClient = useQueryClient();
  const { tenantEq, activeSite, sites } = useActiveSite();
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [banUserId, setBanUserId] = useState<string | null>(null);
  const [banAction, setBanAction] = useState<'ban' | 'unban'>('ban');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string } | null>(null);
  const [moveSiteUser, setMoveSiteUser] = useState<{ id: string; username: string; currentTenantId: string | null } | null>(null);
  const [moveSiteTarget, setMoveSiteTarget] = useState<string>("");

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["admin-users", activeSite === "all" ? "all" : (activeSite as any).id],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }) as any;

      // Filter by selected site
      if (tenantEq) query = query.eq(tenantEq[0], tenantEq[1]);

      const { data: profiles, error } = await query;
      if (error) throw error;

      // Fetch wallets and bets separately
      const profilesWithData = await Promise.all(
        profiles.map(async (profile) => {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("wallet_cash, wallet_bonus")
            .eq("user_id", profile.id)
            .maybeSingle();

          const { data: bets } = await supabase
            .from("bets")
            .select("amount, profit")
            .eq("user_id", profile.id);

          const { data: chickenRoadBets } = await supabase
            .from("chicken_road_bets")
            .select("amount, profit")
            .eq("user_id", profile.id);

          return {
            ...profile,
            wallet,
            bets: bets || [],
            chickenRoadBets: chickenRoadBets || [],
          };
        })
      );

      return profilesWithData;
    },
  });

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!users || !searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase().trim();
    return users.filter((user) => {
      const contact = parseUserContact(user.email);
      return (
        user.username?.toLowerCase().includes(query) ||
        contact.phone?.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    });
  }, [users, searchQuery]);

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success("User deleted successfully");
      setDeleteUserId(null);
    },
    onError: (error) => {
      toast.error("Failed to delete user: " + error.message);
    },
  });

  const banMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'ban' | 'unban' }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_banned: action === 'ban',
          banned_at: action === 'ban' ? new Date().toISOString() : null
        })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      refetch();
      toast.success(action === 'ban' ? "User banned successfully" : "User unbanned successfully");
      setBanUserId(null);
    },
    onError: (error) => {
      toast.error("Failed to update user status: " + error.message);
    },
  });

  const moveSiteMutation = useMutation({
    mutationFn: async ({ userId, tenantId }: { userId: string; tenantId: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ tenant_id: tenantId })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success("User moved to new site successfully");
      setMoveSiteUser(null);
      setMoveSiteTarget("");
    },
    onError: (error) => {
      toast.error("Failed to move user: " + error.message);
    },
  });

  // profiles.account_type is write-protected at the column-privilege level
  // (see 20260806000000_cycling_race_account_types.sql) - a plain .update()
  // from any client, admin included, is rejected by Postgres. This RPC is
  // the only way to change it, and it re-checks the admin role itself.
  const accountTypeMutation = useMutation({
    mutationFn: async ({ userId, accountType }: { userId: string; accountType: string }) => {
      const { error } = await supabase.rpc("set_profile_account_type", {
        p_user_id: userId,
        p_account_type: accountType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success("Account type updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update account type: " + error.message);
    },
  });

  const getUserStats = (user: UserData) => {
    // Combine bets from all game tables
    const allBets = [...(user.bets || []), ...(user.chickenRoadBets || [])];
    const totalWagered = allBets.reduce((sum: number, bet: UserBet) => sum + Number(bet.amount || 0), 0);
    const totalProfit = allBets.reduce((sum: number, bet: UserBet) => sum + Number(bet.profit || 0), 0);
    const biggestWin = allBets.reduce((max: number, bet: UserBet) => Math.max(max, Number(bet.profit || 0)), 0);
    
    return { totalWagered, totalProfit, biggestWin };
  };

  const handleBanClick = (userId: string, isBanned: boolean) => {
    setBanUserId(userId);
    setBanAction(isBanned ? 'unban' : 'ban');
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View and manage all registered users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username, phone or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Username</TableHead>
                  <TableHead className="whitespace-nowrap">Site</TableHead>
                  <TableHead className="whitespace-nowrap">Mobile</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Account Type</TableHead>
                  <TableHead className="whitespace-nowrap">Balance</TableHead>
                  <TableHead className="whitespace-nowrap">Wagered</TableHead>
                  <TableHead className="whitespace-nowrap">Profit</TableHead>
                  <TableHead className="whitespace-nowrap">Best Win</TableHead>
                  <TableHead className="whitespace-nowrap">Joined</TableHead>
                  <TableHead className="text-right whitespace-nowrap sticky right-0 bg-background">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => {
                  const stats = getUserStats(user);
                  const balance = (user.wallet?.wallet_cash || 0) + (user.wallet?.wallet_bonus || 0);
                  const contact = parseUserContact(user.email);
                  const isBanned = user.is_banned || false;
                  const userSite = sites.find(s => s.id === (user as any).tenant_id);
                  
                  return (
                    <TableRow key={user.id} className={isBanned ? "opacity-60 bg-destructive/5" : ""}>
                      <TableCell className="font-medium whitespace-nowrap">{user.username || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {userSite?.name || 'Default'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {contact.phone ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-primary" />
                            {contact.phone}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap max-w-[150px] truncate">{contact.email || '-'}</TableCell>
                      <TableCell>
                        {isBanned ? (
                          <Badge variant="destructive" className="gap-1 whitespace-nowrap">
                            <Ban className="w-3 h-3" />
                            Banned
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-500 whitespace-nowrap">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Select
                          value={user.account_type || "real"}
                          onValueChange={(value) => accountTypeMutation.mutate({ userId: user.id, accountType: value })}
                        >
                          <SelectTrigger className="h-8 w-[100px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="real">Real</SelectItem>
                            <SelectItem value="demo">Demo</SelectItem>
                            <SelectItem value="bot">Bot</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="secondary">{symbol}{Number(balance).toFixed(2)}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{symbol}{stats.totalWagered.toFixed(2)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={stats.totalProfit >= 0 ? "text-green-500" : "text-red-500"}>
                          {symbol}{stats.totalProfit.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {stats.biggestWin > 0 && (
                          <Badge variant="default" className="gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {symbol}{stats.biggestWin.toFixed(2)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right sticky right-0 bg-background">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser({ id: user.id, username: user.username || user.email })}
                            className="h-8 w-8 p-0"
                            title="View Bet History"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setMoveSiteUser({ id: user.id, username: user.username || user.email, currentTenantId: (user as any).tenant_id });
                              setMoveSiteTarget((user as any).tenant_id || "");
                            }}
                            className="h-8 w-8 p-0"
                            title="Move to Site"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={isBanned ? "outline" : "secondary"}
                            size="sm"
                            onClick={() => handleBanClick(user.id, isBanned)}
                            className={isBanned ? "border-green-500 text-green-500 hover:bg-green-500/10 h-8 w-8 p-0" : "h-8 w-8 p-0"}
                          >
                            {isBanned ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteUserId(user.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredUsers?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No users found matching "{searchQuery}"
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user and all their associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban/Unban Confirmation Dialog */}
      <AlertDialog open={!!banUserId} onOpenChange={() => setBanUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {banAction === 'ban' ? 'Ban User?' : 'Unban User?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {banAction === 'ban' 
                ? 'This user will no longer be able to access the platform or place bets.'
                : 'This user will regain access to the platform and be able to place bets again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => banUserId && banMutation.mutate({ userId: banUserId, action: banAction })}
              className={banAction === 'ban' 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-green-600 text-white hover:bg-green-700"}
            >
              {banAction === 'ban' ? 'Ban User' : 'Unban User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move to Site Dialog */}
      <AlertDialog open={!!moveSiteUser} onOpenChange={(open) => { if (!open) { setMoveSiteUser(null); setMoveSiteTarget(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move User to Site</AlertDialogTitle>
            <AlertDialogDescription>
              Move <strong>{moveSiteUser?.username}</strong> to a different site. This changes their tenant assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Select value={moveSiteTarget} onValueChange={setMoveSiteTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Select site..." />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => moveSiteUser && moveSiteTarget && moveSiteMutation.mutate({ userId: moveSiteUser.id, tenantId: moveSiteTarget })}
              disabled={!moveSiteTarget || moveSiteTarget === moveSiteUser?.currentTenantId}
            >
              Move User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Bet History Dialog */}
      <UserBetHistory
        userId={selectedUser?.id || null}
        username={selectedUser?.username || ''}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      />
    </>
  );
};

export default UserManagement;
