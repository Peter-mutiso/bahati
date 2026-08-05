import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSite } from "@/contexts/ActiveSiteContext";
import type { Tenant } from "@/contexts/TenantContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Globe, PlusCircle, Pencil, Trash2, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SiteFormData {
  name: string;
  slug: string;
  domain: string;
  is_active: boolean;
}

const DEFAULT_FORM: SiteFormData = {
  name: "",
  slug: "",
  domain: "",
  is_active: true,
};

// ─── Component ────────────────────────────────────────────────────────────────

const SitesManagement = () => {
  const queryClient = useQueryClient();
  const { refreshSites, setActiveSite } = useActiveSite();

  const [showDialog, setShowDialog] = useState(false);
  const [editingSite, setEditingSite] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<SiteFormData>(DEFAULT_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Fetch sites ──────────────────────────────────────────────────────────
  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["sites-management"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Tenant[];
    },
  });

  // ── Create ───────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: SiteFormData) => {
      const { error } = await supabase.from("tenants").insert([data]);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Site created successfully");
      queryClient.invalidateQueries({ queryKey: ["sites-management"] });
      await refreshSites();
      closeDialog();
    },
    onError: (e: Error) => toast.error("Failed to create site: " + e.message),
  });

  // ── Update ───────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SiteFormData> }) => {
      const { error } = await supabase.from("tenants").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Site updated successfully");
      queryClient.invalidateQueries({ queryKey: ["sites-management"] });
      await refreshSites();
      closeDialog();
    },
    onError: (e: Error) => toast.error("Failed to update site: " + e.message),
  });

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Site deleted");
      queryClient.invalidateQueries({ queryKey: ["sites-management"] });
      await refreshSites();
      setActiveSite("all");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error("Failed to delete site: " + e.message),
  });

  // ── Toggle active ────────────────────────────────────────────────────────
  const toggleActive = (site: Tenant) => {
    updateMutation.mutate({ id: site.id, data: { is_active: !site.is_active } });
  };

  // ── Dialog helpers ───────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingSite(null);
    setFormData(DEFAULT_FORM);
    setShowDialog(true);
  };

  const openEdit = (site: Tenant) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      slug: site.slug,
      domain: site.domain,
      is_active: site.is_active,
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingSite(null);
    setFormData(DEFAULT_FORM);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.slug.trim() || !formData.domain.trim()) {
      toast.error("Name, slug and domain are required");
      return;
    }
    if (editingSite) {
      updateMutation.mutate({ id: editingSite.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingSite
        ? prev.slug // don't overwrite slug on edit
        : name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
    }));
  };

  // Copy tenant ID to clipboard
  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (isLoading) return <div className="text-center py-8">Loading sites...</div>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Sites Management
            </CardTitle>
            <CardDescription>
              Manage the game domains connected to this admin panel
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="gap-2" id="add-site-btn">
            <PlusCircle className="w-4 h-4" />
            Add New Site
          </Button>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Tenant ID</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id} id={`site-row-${site.slug}`}>
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {site.slug}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {site.domain}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => copyId(site.id)}
                        className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                        title="Click to copy"
                        id={`copy-id-${site.slug}`}
                      >
                        {copiedId === site.id ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {site.id.slice(0, 8)}…
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={site.is_active}
                        onCheckedChange={() => toggleActive(site)}
                        id={`toggle-${site.slug}`}
                        disabled={site.slug === "default"}
                        aria-label={`Toggle ${site.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEdit(site)}
                          id={`edit-site-${site.slug}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className={cn("h-8 w-8 p-0", site.slug === "default" && "opacity-40 cursor-not-allowed")}
                          onClick={() => site.slug !== "default" && setDeleteId(site.id)}
                          disabled={site.slug === "default"}
                          title={site.slug === "default" ? "Cannot delete the default site" : undefined}
                          id={`delete-site-${site.slug}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sites.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No sites configured yet. Click "Add New Site" to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground mt-4">
            <strong>Domain</strong> must exactly match the hostname (no protocol, no trailing slash).
            Example: <code className="bg-muted px-1 rounded">game1.yourdomain.com</code>
          </p>
        </CardContent>
      </Card>

      {/* ── Create / Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent id="site-dialog">
          <DialogHeader>
            <DialogTitle>{editingSite ? "Edit Site" : "Add New Site"}</DialogTitle>
            <DialogDescription>
              {editingSite
                ? "Update the domain mapping for this site."
                : "Register a new game domain to manage from this admin panel."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="site-name">Site Name</Label>
              <Input
                id="site-name"
                placeholder="Kuku Bahati"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site-slug">
                Slug <span className="text-muted-foreground text-xs">(unique identifier, lowercase)</span>
              </Label>
              <Input
                id="site-slug"
                placeholder="kuku-bahati"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site-domain">
                Domain <span className="text-muted-foreground text-xs">(without https://)</span>
              </Label>
              <Input
                id="site-domain"
                placeholder="game1.yourdomain.com"
                value={formData.domain}
                onChange={(e) => setFormData((p) => ({ ...p, domain: e.target.value.trim() }))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="site-active"
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, is_active: v }))}
              />
              <Label htmlFor="site-active">Active (visible to players)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              id="save-site-btn"
            >
              {editingSite ? "Save Changes" : "Create Site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this site?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the domain mapping. Existing user data (profiles, wallets,
              transactions) is <strong>not deleted</strong> — only the site record is removed.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SitesManagement;
