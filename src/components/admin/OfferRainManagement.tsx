import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Cloud, Trash2, RefreshCw, Users, Clock, Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface OfferRain {
  id: string;
  creator_id: string;
  pot_amount: number;
  max_claimers: number;
  amount_per_person: number;
  claimed_count: number;
  expires_at: string;
  status: string;
  created_at: string;
  creator_email?: string;
}

const OfferRainManagement = () => {
  const [rains, setRains] = useState<OfferRain[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRain, setEditingRain] = useState<OfferRain | null>(null);
  const [formData, setFormData] = useState({
    pot_amount: '',
    max_claimers: '',
    expiry_minutes: '5'
  });
  const [saving, setSaving] = useState(false);

  const fetchRains = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('offer_rains')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch creator emails
      const creatorIds = [...new Set(data?.map(r => r.creator_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', creatorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.email]));

      const enriched = (data || []).map(rain => ({
        ...rain,
        creator_email: profileMap.get(rain.creator_id) || 'Unknown'
      }));

      setRains(enriched);
    } catch (err) {
      console.error('Error fetching rains:', err);
      toast.error('Failed to load rains');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRains();

    const channel = supabase
      .channel('admin_offer_rains')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offer_rains' }, fetchRains)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rain?')) return;

    try {
      const { error } = await supabase
        .from('offer_rains')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Rain deleted');
      fetchRains();
    } catch (err) {
      console.error('Error deleting rain:', err);
      toast.error('Failed to delete');
    }
  };

  const handleCreate = () => {
    setEditingRain(null);
    setFormData({ pot_amount: '', max_claimers: '', expiry_minutes: '5' });
    setDialogOpen(true);
  };

  const handleEdit = (rain: OfferRain) => {
    setEditingRain(rain);
    const expiresAt = new Date(rain.expires_at);
    const now = new Date();
    const remainingMins = Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 60000));
    
    setFormData({
      pot_amount: rain.pot_amount.toString(),
      max_claimers: rain.max_claimers.toString(),
      expiry_minutes: remainingMins.toString()
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const pot = parseFloat(formData.pot_amount);
    const claimers = parseInt(formData.max_claimers);
    const expiry = parseInt(formData.expiry_minutes);

    if (!pot || pot <= 0) {
      toast.error('Enter a valid pot amount');
      return;
    }
    if (!claimers || claimers <= 0) {
      toast.error('Enter valid number of claimers');
      return;
    }
    if (!expiry || expiry < 1 || expiry > 1440) {
      toast.error('Expiry must be 1-1440 minutes');
      return;
    }

    setSaving(true);

    try {
      const expiresAt = new Date(Date.now() + expiry * 60 * 1000).toISOString();
      const amountPerPerson = pot / claimers;

      if (editingRain) {
        // Update existing
        const { error } = await supabase
          .from('offer_rains')
          .update({
            pot_amount: pot,
            max_claimers: claimers,
            amount_per_person: amountPerPerson,
            expires_at: expiresAt
          })
          .eq('id', editingRain.id);

        if (error) throw error;
        toast.success('Rain updated');
      } else {
        // Get admin user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Create new rain (admin doesn't deduct wallet)
        const { error } = await supabase
          .from('offer_rains')
          .insert({
            creator_id: user.id,
            pot_amount: pot,
            max_claimers: claimers,
            amount_per_person: amountPerPerson,
            expires_at: expiresAt,
            status: 'active'
          });

        if (error) throw error;
        toast.success('Rain created');
      }

      setDialogOpen(false);
      fetchRains();
    } catch (err) {
      console.error('Error saving rain:', err);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (rain: OfferRain) => {
    const now = new Date();
    const expiresAt = new Date(rain.expires_at);

    if (rain.status === 'completed' || rain.claimed_count >= rain.max_claimers) {
      return <Badge className="bg-green-500/20 text-green-500">Completed</Badge>;
    }
    if (expiresAt < now) {
      return <Badge className="bg-gray-500/20 text-gray-500">Expired</Badge>;
    }
    return <Badge className="bg-blue-500/20 text-blue-500">Active</Badge>;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-400" />
          Offer Rain Management
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
          <Button variant="outline" size="sm" onClick={fetchRains} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Creator</TableHead>
                <TableHead>Pot Amount</TableHead>
                <TableHead>Per Person</TableHead>
                <TableHead>Claims</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rains.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No offer rains found
                  </TableCell>
                </TableRow>
              ) : (
                rains.map(rain => (
                  <TableRow key={rain.id}>
                    <TableCell className="font-medium text-sm">
                      {rain.creator_email}
                    </TableCell>
                    <TableCell className="font-bold text-green-400">
                      ${rain.pot_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ${rain.amount_per_person.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {rain.claimed_count}/{rain.max_claimers}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        <Clock className="w-3 h-3" />
                        {format(new Date(rain.expires_at), 'MMM dd, HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(rain)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(rain.created_at), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rain)}
                          className="text-blue-400 hover:text-blue-500 hover:bg-blue-500/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rain.id)}
                          className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-400" />
              {editingRain ? 'Edit Offer Rain' : 'Create Offer Rain'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm text-muted-foreground">Pot Amount ($)</Label>
              <Input
                type="number"
                value={formData.pot_amount}
                onChange={(e) => setFormData(p => ({ ...p, pot_amount: e.target.value }))}
                placeholder="Enter amount"
                className="bg-muted border-border mt-1"
              />
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Max Claimers</Label>
              <Input
                type="number"
                value={formData.max_claimers}
                onChange={(e) => setFormData(p => ({ ...p, max_claimers: e.target.value }))}
                placeholder="How many can claim"
                className="bg-muted border-border mt-1"
              />
              {formData.pot_amount && formData.max_claimers && parseInt(formData.max_claimers) > 0 && (
                <p className="text-xs text-green-400 mt-1">
                  Each gets: ${(parseFloat(formData.pot_amount) / parseInt(formData.max_claimers)).toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Expires in (minutes)</Label>
              <Input
                type="number"
                value={formData.expiry_minutes}
                onChange={(e) => setFormData(p => ({ ...p, expiry_minutes: e.target.value }))}
                placeholder="1-1440"
                min={1}
                max={1440}
                className="bg-muted border-border mt-1"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {saving ? 'Saving...' : editingRain ? 'Update Rain' : 'Create Rain'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default OfferRainManagement;