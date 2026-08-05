import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Cloud, Users, Clock, Gift } from 'lucide-react';
import { toast } from 'sonner';

interface OfferRain {
  id: string;
  creator_id: string;
  pot_amount: number;
  max_claimers: number;
  amount_per_person: number;
  claimed_count: number;
  expires_at: string;
  status: string;
}

interface OfferRainBannerProps {
  userId: string | null;
  currencySymbol: string;
  onClaimed: () => void;
}

const OfferRainBanner: React.FC<OfferRainBannerProps> = ({ userId, currencySymbol, onClaimed }) => {
  const [rains, setRains] = useState<OfferRain[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimedRains, setClaimedRains] = useState<Set<string>>(new Set());

  // Fetch active rains (excluding user's own and already claimed)
  const fetchRains = async () => {
    const { data, error } = await supabase
      .from('offer_rains')
      .select('*')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (data && !error) {
      // Filter out user's own rains, fully claimed, and already claimed by this user
      const filtered = data.filter(r => 
        r.creator_id !== userId && 
        r.claimed_count < r.max_claimers &&
        !claimedRains.has(r.id)
      );
      setRains(filtered);
    }
  };

  // Check which rains user already claimed
  const checkUserClaims = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('offer_rain_claims')
      .select('rain_id')
      .eq('user_id', userId);

    if (data) {
      setClaimedRains(new Set(data.map(c => c.rain_id)));
    }
  };

  useEffect(() => {
    fetchRains();
    checkUserClaims();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('offer_rains_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offer_rains' }, () => {
        fetchRains();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offer_rain_claims' }, () => {
        fetchRains();
        checkUserClaims();
      })
      .subscribe();

    // Refresh periodically to check expiry
    const interval = setInterval(fetchRains, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userId]);

  const handleClaim = async (rain: OfferRain) => {
    if (!userId) {
      toast.error('Please login to claim');
      return;
    }
    if (claimedRains.has(rain.id)) {
      toast.error('Already claimed!');
      return;
    }

    setClaiming(rain.id);

    try {
      // Check if already claimed
      const { data: existingClaim } = await supabase
        .from('offer_rain_claims')
        .select('id')
        .eq('rain_id', rain.id)
        .eq('user_id', userId)
        .single();

      if (existingClaim) {
        toast.error('Already claimed!');
        setClaiming(null);
        return;
      }

      // Insert claim
      const { error: claimError } = await supabase
        .from('offer_rain_claims')
        .insert({
          rain_id: rain.id,
          user_id: userId,
          amount: rain.amount_per_person
        });

      if (claimError) throw claimError;

      // Update claimed count
      await supabase
        .from('offer_rains')
        .update({ claimed_count: rain.claimed_count + 1 })
        .eq('id', rain.id);

      // If fully claimed, mark as completed
      if (rain.claimed_count + 1 >= rain.max_claimers) {
        await supabase
          .from('offer_rains')
          .update({ status: 'completed' })
          .eq('id', rain.id);
      }

      // Credit to wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('wallet_cash')
        .eq('user_id', userId)
        .single();

      if (walletData) {
        await supabase
          .from('wallets')
          .update({ wallet_cash: (walletData.wallet_cash || 0) + rain.amount_per_person })
          .eq('user_id', userId);
      }

      toast.success(`Claimed ${currencySymbol}${rain.amount_per_person.toFixed(2)}!`);
      setClaimedRains(prev => new Set([...prev, rain.id]));
      onClaimed();
      fetchRains();
    } catch (err) {
      console.error('Error claiming rain:', err);
      toast.error('Failed to claim');
    } finally {
      setClaiming(null);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter out claimed rains from display
  const visibleRains = rains.filter(r => !claimedRains.has(r.id));

  if (visibleRains.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex gap-2 px-2 min-w-max">
        {visibleRains.map(rain => (
          <div
            key={rain.id}
            className="flex items-center gap-3 bg-gradient-to-r from-blue-600/30 to-purple-600/30 border border-blue-500/40 rounded-xl px-3 py-2 animate-pulse-slow"
          >
            <div className="flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-blue-400" />
              <span className="text-white font-bold text-sm">
                {currencySymbol}{rain.amount_per_person.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-300">
              <Users className="w-3 h-3" />
              <span>{rain.claimed_count}/{rain.max_claimers}</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-orange-300">
              <Clock className="w-3 h-3" />
              <span>{getTimeRemaining(rain.expires_at)}</span>
            </div>

            {userId && rain.creator_id !== userId && (
              <button
                onClick={() => handleClaim(rain)}
                disabled={claiming === rain.id}
                className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                {claiming === rain.id ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <>
                    <Gift className="w-3 h-3" />
                    Claim
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OfferRainBanner;
