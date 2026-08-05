import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle2, XCircle, Settings, Globe, TrendingUp, Percent, Gamepad2 } from "lucide-react";

interface Marketer {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: string;
  notes: string | null;
  created_at: string;
  assigned_tenant_id?: string | null;
  assigned_tenant_name?: string | null;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

const statusBadge = (s: string) => {
  if (s === "approved") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">Pending</Badge>;
};

const MarketerManagement = () => {
  const qc = useQueryClient();
  const [selectedMarketer, setSelectedMarketer] = useState<Marketer | null>(null);
  const [actionDialog, setActionDialog] = useState<"approve" | "reject" | "assign" | "assign_games" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [selectedGames, setSelectedGames] = useState<string[]>([]);

  // Revenue share settings
  const [editingShare, setEditingShare] = useState(false);
  const [shareInput, setShareInput] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: marketers = [], isLoading } = useQuery({
    queryKey: ["admin-marketers"],
    queryFn: async () => {
      const { data: mks, error } = await supabase
        .from("marketers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch site assignments
      const { data: assignments } = await supabase
        .from("marketer_site_assignments")
        .select("marketer_id, tenant_id, tenants:tenant_id(name)");

      const aMap: Record<string, { tenant_id: string; tenant_name: string }> = {};
      for (const a of assignments ?? []) {
        aMap[a.marketer_id] = {
          tenant_id: a.tenant_id,
          tenant_name: (a.tenants as any)?.name ?? "Unknown",
        };
      }

      return (mks ?? []).map(m => ({
        ...m,
        assigned_tenant_id: aMap[m.id]?.tenant_id ?? null,
        assigned_tenant_name: aMap[m.id]?.tenant_name ?? null,
      })) as Marketer[];
    },
  });

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["admin-tenants-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: revenueSettings } = useQuery({
    queryKey: ["marketer-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketer_settings")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: assignedGames = [] } = useQuery({
    queryKey: ["marketer-game-assignments", selectedMarketer?.id],
    queryFn: async () => {
      if (!selectedMarketer) return [];
      const { data, error } = await supabase
        .from("marketer_game_assignments")
        .select("game_slug")
        .eq("marketer_id", selectedMarketer.id);
      if (error) throw error;
      return data.map(d => d.game_slug);
    },
    enabled: !!selectedMarketer,
  });

  const AVAILABLE_GAMES = [
    { slug: "aviator", name: "Aviator" },
    { slug: "cycling-race", name: "Cycle Race" },
    { slug: "chicken-road", name: "Chicken Road" },
    { slug: "coin-train", name: "Coin Train" },
    { slug: "coin-flip", name: "Coin Flip" },
    { slug: "plinko", name: "Plinko" },
    { slug: "wingo", name: "Wingo" },
    { slug: "mines", name: "Mines" },
  ];

  // ── Mutations ────────────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes, tenantId }: { id: string; notes: string; tenantId: string }) => {
      // Check if another marketer (not this one) already owns this site
      const { data: existing } = await supabase
        .from("marketer_site_assignments")
        .select("marketer_id, marketers:marketer_id(full_name)")
        .eq("tenant_id", tenantId)
        .neq("marketer_id", id)
        .maybeSingle();

      if (existing) {
        const takenBy = (existing.marketers as any)?.full_name ?? "another marketer";
        throw new Error(`This site is already assigned to ${takenBy}. Each site can only have one marketer.`);
      }

      const { error } = await supabase
        .from("marketers")
        .update({ status: "approved", notes: notes || null })
        .eq("id", id);
      if (error) throw error;

      await supabase.from("marketer_site_assignments").delete().eq("marketer_id", id);
      const { error: aErr } = await supabase.from("marketer_site_assignments").insert({
        marketer_id: id,
        tenant_id: tenantId,
      });
      if (aErr) throw aErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-marketers"] });
      toast.success("Marketer approved and site assigned");
      closeDialog();
    },
    onError: e => toast.error((e as any).message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("marketers")
        .update({ status: "rejected", notes: notes || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-marketers"] });
      toast.success("Marketer rejected");
      closeDialog();
    },
    onError: e => toast.error("Error: " + (e as any).message),
  });

  const assignSiteMutation = useMutation({
    mutationFn: async ({ marketerId, tenantId }: { marketerId: string; tenantId: string }) => {
      // Check if another marketer (not this one) already owns this site
      const { data: existing } = await supabase
        .from("marketer_site_assignments")
        .select("marketer_id, marketers:marketer_id(full_name)")
        .eq("tenant_id", tenantId)
        .neq("marketer_id", marketerId)
        .maybeSingle();

      if (existing) {
        const takenBy = (existing.marketers as any)?.full_name ?? "another marketer";
        throw new Error(`This site is already assigned to ${takenBy}. Each site can only have one marketer.`);
      }

      await supabase.from("marketer_site_assignments").delete().eq("marketer_id", marketerId);
      const { error } = await supabase.from("marketer_site_assignments").insert({
        marketer_id: marketerId,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-marketers"] });
      toast.success("Site assigned to marketer");
      closeDialog();
    },
    onError: e => toast.error((e as any).message),
  });

  const updateShareMutation = useMutation({
    mutationFn: async (pct: number) => {
      const { data: existing } = await supabase
        .from("marketer_settings")
        .select("id")
        .single();
      const { data: { user } } = await supabase.auth.getUser();
      if (existing) {
        const { error } = await supabase
          .from("marketer_settings")
          .update({ revenue_share_percent: pct, updated_by: user?.id ?? null })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("marketer_settings")
          .insert({ revenue_share_percent: pct, updated_by: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketer-settings"] });
      toast.success("Revenue share updated");
      setEditingShare(false);
    },
    onError: e => toast.error("Error: " + (e as any).message),
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("marketer_withdrawals")
        .update({ status: "approved", admin_notes: notes || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-marketer-withdrawals"] });
      toast.success("Withdrawal approved");
    },
    onError: e => toast.error("Error: " + (e as any).message),
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("marketer_withdrawals")
        .update({ status: "rejected", admin_notes: notes || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-marketer-withdrawals"] });
      toast.success("Withdrawal rejected");
    },
    onError: e => toast.error("Error: " + (e as any).message),
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["admin-marketer-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketer_withdrawals")
        .select("*, marketers:marketer_id(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const assignGamesMutation = useMutation({
    mutationFn: async ({ marketerId, games }: { marketerId: string; games: string[] }) => {
      // Delete existing
      await supabase.from("marketer_game_assignments").delete().eq("marketer_id", marketerId);
      
      if (games.length > 0) {
        const { error } = await supabase.from("marketer_game_assignments").insert(
          games.map(slug => ({ marketer_id: marketerId, game_slug: slug }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketer-game-assignments"] });
      toast.success("Game assignments updated");
      closeDialog();
    },
    onError: e => toast.error((e as any).message),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const openDialog = (m: Marketer, action: "approve" | "reject" | "assign" | "assign_games") => {
    setSelectedMarketer(m);
    setAdminNotes(m.notes ?? "");
    setSelectedTenantId(m.assigned_tenant_id ?? "");
    if (action === "assign_games") {
      setSelectedGames(assignedGames);
    }
    setActionDialog(action);
  };

  const closeDialog = () => {
    setActionDialog(null);
    setSelectedMarketer(null);
    setAdminNotes("");
    setSelectedTenantId("");
    setSelectedGames([]);
  };

  const handleSaveShare = () => {
    const pct = parseFloat(shareInput);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Enter a percentage between 0 and 100");
      return;
    }
    updateShareMutation.mutate(pct);
  };

  const [withdrawNotes, setWithdrawNotes] = useState<Record<string, string>>({});

  if (isLoading) return <div className="text-center py-8">Loading marketers…</div>;

  const pending = marketers.filter(m => m.status === "pending");
  const approved = marketers.filter(m => m.status === "approved");
  const rejected = marketers.filter(m => m.status === "rejected");

  return (
    <>
      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications" className="gap-1.5">
            <TrendingUp className="w-4 h-4" /> Applications
            {pending.length > 0 && (
              <Badge className="ml-1 bg-yellow-500/20 text-yellow-400 text-xs">{pending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="gap-1.5">
            <Globe className="w-4 h-4" /> Withdrawals
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Percent className="w-4 h-4" /> Revenue Share
          </TabsTrigger>
        </TabsList>

        {/* ── Applications tab ── */}
        <TabsContent value="applications" className="space-y-4">
          {/* Pending */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Applications</CardTitle>
              <CardDescription>Marketers awaiting your approval</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Assigned Site</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No pending applications</TableCell></TableRow>
                  )}
                  {pending.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.full_name}</TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{m.assigned_tenant_name ?? <span className="text-muted-foreground text-xs">Not assigned</span>}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" className="gap-1 text-green-400 border-green-500/30" onClick={() => openDialog(m, "approve")}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30" onClick={() => openDialog(m, "reject")}>
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => openDialog(m, "assign")}>
                          <Globe className="w-3.5 h-3.5" /> Assign Site
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Approved */}
          <Card>
            <CardHeader>
              <CardTitle>Approved Marketers</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Site</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approved.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No approved marketers yet</TableCell></TableRow>
                  )}
                  {approved.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.full_name}</TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>{statusBadge(m.status)}</TableCell>
                      <TableCell>
                        {m.assigned_tenant_name
                          ? <Badge variant="outline" className="gap-1"><Globe className="w-3 h-3" />{m.assigned_tenant_name}</Badge>
                          : <span className="text-muted-foreground text-xs">Not assigned</span>}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openDialog(m, "assign")}>
                          <Globe className="w-3.5 h-3.5 mr-1" /> Site
                        </Button>
                        <Button size="sm" variant="outline" className="text-primary border-primary/30" onClick={() => openDialog(m, "assign_games")}>
                          <Gamepad2 className="w-3.5 h-3.5 mr-1" /> Games
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => openDialog(m, "reject")}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Rejected */}
          {rejected.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Rejected Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejected.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.full_name}</TableCell>
                        <TableCell>{m.email}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.notes ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="text-green-400 border-green-500/30" onClick={() => openDialog(m, "approve")}>
                            Re-approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Withdrawals tab ── */}
        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketer Withdrawal Requests</CardTitle>
              <CardDescription>Approve or reject marketer payout requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marketer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No withdrawal requests</TableCell></TableRow>
                  )}
                  {withdrawals.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{w.marketers?.full_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{w.marketers?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">KES {w.amount.toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{w.payment_method ?? "—"}</TableCell>
                      <TableCell className="text-xs">{w.payment_details ?? "—"}</TableCell>
                      <TableCell>{statusBadge(w.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {w.status === "pending" && (
                          <div className="flex items-center gap-2 justify-end">
                            <Input
                              className="h-7 text-xs w-36"
                              placeholder="Admin notes…"
                              value={withdrawNotes[w.id] ?? ""}
                              onChange={e => setWithdrawNotes(n => ({ ...n, [w.id]: e.target.value }))}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-400 border-green-500/30 gap-1"
                              onClick={() => approveWithdrawalMutation.mutate({ id: w.id, notes: withdrawNotes[w.id] ?? "" })}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Pay
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 gap-1"
                              onClick={() => rejectWithdrawalMutation.mutate({ id: w.id, notes: withdrawNotes[w.id] ?? "" })}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </div>
                        )}
                        {w.status !== "pending" && (
                          <span className="text-xs text-muted-foreground">{w.admin_notes ?? "—"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Revenue share settings tab ── */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Revenue Share Percentage
              </CardTitle>
              <CardDescription>
                This percentage is applied globally to all marketers. It determines what fraction of each deposit they earn.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-primary">
                  {revenueSettings?.revenue_share_percent ?? 25}%
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Current revenue share per deposit</p>
                  <p className="text-xs mt-0.5">Example: user deposits KES 1,000 → marketer earns KES {((revenueSettings?.revenue_share_percent ?? 25) * 10).toFixed(0)}</p>
                </div>
              </div>

              {editingShare ? (
                <div className="flex items-end gap-3 max-w-xs">
                  <div className="flex-1 space-y-1">
                    <Label>New Percentage (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="e.g. 25"
                      value={shareInput}
                      onChange={e => setShareInput(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <Button onClick={handleSaveShare} disabled={updateShareMutation.isPending}>
                    {updateShareMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingShare(false)}>Cancel</Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    setShareInput(String(revenueSettings?.revenue_share_percent ?? 25));
                    setEditingShare(true);
                  }}
                >
                  <Settings className="w-4 h-4" />
                  Change Revenue Share
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Approve dialog ── */}
      <Dialog open={actionDialog === "approve"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Marketer</DialogTitle>
            <DialogDescription>Approving: {selectedMarketer?.full_name} ({selectedMarketer?.email})</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assign Site <span className="text-destructive">*</span></Label>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select site to assign…" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map(t => {
                    const occupant = marketers.find(
                      m => m.assigned_tenant_id === t.id && m.id !== selectedMarketer?.id
                    );
                    return (
                      <SelectItem key={t.id} value={t.id} disabled={!!occupant}>
                        {t.name} ({t.slug}){occupant ? ` — taken by ${occupant.full_name}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Sites marked as taken are already assigned to another marketer.</p>
            </div>
            <div className="space-y-2">
              <Label>Admin Notes (optional)</Label>
              <Textarea placeholder="Any notes for this marketer…" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (!selectedTenantId) { toast.error("Please select a site before approving"); return; }
                selectedMarketer && approveMutation.mutate({ id: selectedMarketer.id, notes: adminNotes, tenantId: selectedTenantId });
              }}
              disabled={approveMutation.isPending || !selectedTenantId}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {approveMutation.isPending ? "Approving…" : "Approve & Assign Site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject dialog ── */}
      <Dialog open={actionDialog === "reject"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Marketer</DialogTitle>
            <DialogDescription>Rejecting: {selectedMarketer?.full_name} ({selectedMarketer?.email})</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason / Notes (optional)</Label>
            <Textarea placeholder="Reason for rejection…" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedMarketer && rejectMutation.mutate({ id: selectedMarketer.id, notes: adminNotes })}
              disabled={rejectMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {rejectMutation.isPending ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign site dialog ── */}
      <Dialog open={actionDialog === "assign"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Site to Marketer</DialogTitle>
            <DialogDescription>
              Assign a site to <strong>{selectedMarketer?.full_name}</strong>. They will only see data for this site.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Select Site</Label>
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a site…" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map(t => {
                  const occupant = marketers.find(
                    m => m.assigned_tenant_id === t.id && m.id !== selectedMarketer?.id
                  );
                  return (
                    <SelectItem key={t.id} value={t.id} disabled={!!occupant}>
                      {t.name} ({t.slug}){occupant ? ` — taken by ${occupant.full_name}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Sites marked as taken are already assigned to another marketer.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={() => selectedMarketer && selectedTenantId && assignSiteMutation.mutate({ marketerId: selectedMarketer.id, tenantId: selectedTenantId })}
              disabled={assignSiteMutation.isPending || !selectedTenantId}
            >
              <Globe className="w-4 h-4 mr-2" />
              {assignSiteMutation.isPending ? "Assigning…" : "Assign Site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign games dialog ── */}
      <Dialog open={actionDialog === "assign_games"} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Games to Marketer</DialogTitle>
            <DialogDescription>
              Select games that <strong>{selectedMarketer?.full_name}</strong> can see results for in their dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {AVAILABLE_GAMES.map(game => {
              const isSelected = selectedGames.includes(game.slug);
              return (
                <div
                  key={game.slug}
                  onClick={() => {
                    setSelectedGames(prev => 
                      isSelected ? prev.filter(s => s !== game.slug) : [...prev, game.slug]
                    );
                  }}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                    ${isSelected 
                      ? "bg-primary/10 border-primary shadow-[0_0_15px_-5px_rgba(var(--primary),0.4)]" 
                      : "bg-card/50 border-border hover:border-primary/50"}
                  `}
                >
                  <div className={`
                    w-4 h-4 rounded border flex items-center justify-center
                    ${isSelected ? "bg-primary border-primary" : "border-muted-foreground"}
                  `}>
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {game.name}
                  </span>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={() => selectedMarketer && assignGamesMutation.mutate({ marketerId: selectedMarketer.id, games: selectedGames })}
              disabled={assignGamesMutation.isPending}
              className="gap-2"
            >
              <Gamepad2 className="w-4 h-4" />
              {assignGamesMutation.isPending ? "Saving…" : "Save Assignments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MarketerManagement;
