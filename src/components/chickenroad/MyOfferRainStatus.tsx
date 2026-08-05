import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Cloud, Users, Clock, CheckCircle } from 'lucide-react';

interface MyRain {
  id: string;
  pot_amount: number;
  max_claimers: number;
  amount_per_person: number;
  claimed_count: number;
  expires_at: string;
  status: string;
}

interface MyOfferRainStatusProps {
  userId: string;
  currencySymbol: string;
}

const MyOfferRainStatus: React.FC<MyOfferRainStatusProps> = ({ userId, currencySymbol }) => {
  const [myRains, setMyRains] = useState<MyRain[]>([]);

  const fetchMyRains = async () => {
    const { data } = await supabase
      .from('offer_rains')
      .select('*')
      .eq('creator_id', userId)
      .in('status', ['active'])
      .order('created_at', { ascending: false });

    if (data) {
      // Filter only active and not expired
      const activeRains = data.filter(r => {
        const notExpired = new Date(r.expires_at) > new Date();
        const notFullyClaimed = r.claimed_count < r.max_claimers;
        return notExpired && notFullyClaimed;
      });
      setMyRains(activeRains);
    }
  };

  useEffect(() => {
    if (!userId) return;
    
    fetchMyRains();

    const channel = supabase
      .channel('my_offer_rains')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'offer_rains',
        filter: `creator_id=eq.${userId}`
      }, fetchMyRains)
      .subscribe();

    const interval = setInterval(fetchMyRains, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userId]);

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (myRains.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto pb-2 mt-2">
      <div className="flex gap-2 px-2 min-w-max">
        {myRains.map(rain => (
          <div
            key={rain.id}
            className="flex items-center gap-3 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-500/40 rounded-xl px-3 py-2"
          >
            <div className="flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold text-sm">
                Your Rain
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-white">
              <span>{currencySymbol}{rain.pot_amount.toFixed(2)}</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-emerald-300">
              <Users className="w-3 h-3" />
              <span>{rain.claimed_count}/{rain.max_claimers} claimed</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-orange-300">
              <Clock className="w-3 h-3" />
              <span>{getTimeRemaining(rain.expires_at)}</span>
            </div>

            {rain.claimed_count >= rain.max_claimers && (
              <div className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle className="w-3 h-3" />
                <span>Complete</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyOfferRainStatus;