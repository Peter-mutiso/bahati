import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cloud, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OfferRainDialogProps {
  userId: string;
  walletBalance: number;
  currencySymbol: string;
  onRainCreated: () => void;
}

const OfferRainDialog: React.FC<OfferRainDialogProps> = ({ 
  userId, 
  walletBalance, 
  currencySymbol,
  onRainCreated 
}) => {
  const [open, setOpen] = useState(false);
  const [potAmount, setPotAmount] = useState('');
  const [maxClaimers, setMaxClaimers] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState('5');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const pot = parseFloat(potAmount);
    const claimers = parseInt(maxClaimers);
    const expiry = parseInt(expiryMinutes);

    if (!pot || pot <= 0) {
      toast.error('Enter a valid pot amount');
      return;
    }
    if (!claimers || claimers <= 0) {
      toast.error('Enter valid number of claimers');
      return;
    }
    if (!expiry || expiry < 1 || expiry > 60) {
      toast.error('Expiry must be 1-60 minutes');
      return;
    }
    if (pot > walletBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setLoading(true);

    try {
      // Deduct from wallet
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('wallet_cash')
        .eq('user_id', userId)
        .single();

      if (walletError) throw walletError;

      const newBalance = (walletData.wallet_cash || 0) - pot;
      if (newBalance < 0) {
        toast.error('Insufficient balance');
        setLoading(false);
        return;
      }

      await supabase
        .from('wallets')
        .update({ wallet_cash: newBalance })
        .eq('user_id', userId);

      // Create the rain
      const expiresAt = new Date(Date.now() + expiry * 60 * 1000).toISOString();
      const amountPerPerson = pot / claimers;

      const { error: rainError } = await supabase
        .from('offer_rains')
        .insert({
          creator_id: userId,
          pot_amount: pot,
          max_claimers: claimers,
          amount_per_person: amountPerPerson,
          expires_at: expiresAt,
          status: 'active'
        });

      if (rainError) throw rainError;

      toast.success('Offer Rain created!');
      setOpen(false);
      setPotAmount('');
      setMaxClaimers('');
      setExpiryMinutes('5');
      onRainCreated();
    } catch (err) {
      console.error('Error creating rain:', err);
      toast.error('Failed to create rain');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 transition-opacity"
        >
          <Cloud className="w-4 h-4" />
          Offer Rain
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a1a1a] border-[#333] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Cloud className="w-5 h-5 text-blue-400" />
            Create Offer Rain
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-sm text-gray-400">Pot Amount ({currencySymbol})</Label>
            <Input
              type="number"
              value={potAmount}
              onChange={(e) => setPotAmount(e.target.value)}
              placeholder="Enter amount"
              className="bg-[#2a2a2a] border-[#444] text-white mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Balance: {currencySymbol}{walletBalance.toFixed(2)}</p>
          </div>

          <div>
            <Label className="text-sm text-gray-400">Max Claimers</Label>
            <Input
              type="number"
              value={maxClaimers}
              onChange={(e) => setMaxClaimers(e.target.value)}
              placeholder="How many can claim"
              className="bg-[#2a2a2a] border-[#444] text-white mt-1"
            />
            {potAmount && maxClaimers && parseInt(maxClaimers) > 0 && (
              <p className="text-xs text-green-400 mt-1">
                Each gets: {currencySymbol}{(parseFloat(potAmount) / parseInt(maxClaimers)).toFixed(2)}
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm text-gray-400">Expires in (minutes)</Label>
            <Input
              type="number"
              value={expiryMinutes}
              onChange={(e) => setExpiryMinutes(e.target.value)}
              placeholder="1-60"
              min={1}
              max={60}
              className="bg-[#2a2a2a] border-[#444] text-white mt-1"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Rain'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfferRainDialog;
