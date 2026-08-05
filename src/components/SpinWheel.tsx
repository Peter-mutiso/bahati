import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Sparkles, Trophy, X, Coins, Calendar, Award } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { Badge } from "./ui/badge";

interface SpinWheelProps {
  userId: string;
  onClose: () => void;
}

interface Prize {
  id: string;
  label: string;
  amount: number;
  color: string;
  position: number;
}

interface LeaderboardEntry {
  username: string;
  prize_amount: number;
  created_at: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  achievement_type: string;
  criteria_value: number;
  badge_color: string;
  earned_at?: string;
}

export const SpinWheel = ({ userId, onClose }: SpinWheelProps) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<Prize | null>(null);
  const [canSpin, setCanSpin] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { symbol } = useCurrency();
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [spinHistory, setSpinHistory] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userAchievements, setUserAchievements] = useState<Achievement[]>([]);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    checkDailySpin();
    fetchSpinHistory();
    fetchPrizes();
    fetchLeaderboard();
    fetchUserAchievements();
    setShowModal(true);
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(ctx);
    
    return () => {
      ctx.close();
    };
  }, [userId]);

  const fetchPrizes = async () => {
    const { data } = await supabase
      .from("spin_wheel_prizes")
      .select("*")
      .order("position", { ascending: true });
    
    if (data) {
      setPrizes(data);
    }
  };

  const fetchUserAchievements = async () => {
    const { data } = await supabase
      .from("user_spin_achievements")
      .select(`
        earned_at,
        achievement:spin_achievements(*)
      `)
      .eq("user_id", userId);

    if (data) {
      const achievements = data.map((item: any) => ({
        ...item.achievement,
        earned_at: item.earned_at
      }));
      setUserAchievements(achievements);
    }
  };

  const checkAndAwardAchievements = async (winAmount: number, stats: any) => {
    // Fetch all available achievements
    const { data: allAchievements } = await supabase
      .from("spin_achievements")
      .select("*");

    if (!allAchievements) return;

    const earnedIds = new Set(userAchievements.map(a => a.id));
    const newlyEarned: Achievement[] = [];

    for (const achievement of allAchievements) {
      if (earnedIds.has(achievement.id)) continue;

      let earned = false;

      switch (achievement.achievement_type) {
        case "streak":
          earned = stats.current_streak >= achievement.criteria_value;
          break;
        case "win_amount":
          earned = winAmount >= achievement.criteria_value;
          break;
        case "total_spins":
          earned = stats.total_spins >= achievement.criteria_value;
          break;
        case "total_earnings":
          earned = stats.total_earnings >= achievement.criteria_value;
          break;
      }

      if (earned) {
        // Award achievement
        await supabase
          .from("user_spin_achievements")
          .insert({
            user_id: userId,
            achievement_id: achievement.id,
          });
        
        newlyEarned.push(achievement);
      }
    }

    if (newlyEarned.length > 0) {
      setNewAchievements(newlyEarned);
      fetchUserAchievements();
      
      // Show achievement toast
      setTimeout(() => {
        newlyEarned.forEach(achievement => {
          toast.success(`🏆 Achievement Unlocked: ${achievement.icon} ${achievement.name}!`, {
            description: achievement.description,
            duration: 5000,
          });
        });
      }, 2000);
    }
  };

  const updateUserStats = async (winAmount: number) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get or create user stats
    let { data: stats } = await supabase
      .from("user_spin_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!stats) {
      // Create initial stats
      const { data: newStats } = await supabase
        .from("user_spin_stats")
        .insert({
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          total_spins: 1,
          total_earnings: winAmount,
          last_spin_date: today,
        })
        .select()
        .single();
      
      if (newStats) {
        await checkAndAwardAchievements(winAmount, newStats);
      }
      return;
    }

    // Calculate streak
    const lastSpinDate = new Date(stats.last_spin_date);
    const todayDate = new Date(today);
    const daysDiff = Math.floor((todayDate.getTime() - lastSpinDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let newStreak = stats.current_streak;
    if (daysDiff === 1) {
      newStreak = stats.current_streak + 1;
    } else if (daysDiff > 1) {
      newStreak = 1;
    }

    const updatedStats = {
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, stats.longest_streak),
      total_spins: stats.total_spins + 1,
      total_earnings: Number(stats.total_earnings) + winAmount,
      last_spin_date: today,
    };

    await supabase
      .from("user_spin_stats")
      .update(updatedStats)
      .eq("user_id", userId);

    await checkAndAwardAchievements(winAmount, {
      ...stats,
      ...updatedStats,
    });
  };

  const fetchLeaderboard = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("daily_spins")
      .select(`
        prize_amount,
        created_at,
        user_id
      `)
      .eq("last_spin_date", today)
      .gt("prize_amount", 0)
      .order("prize_amount", { ascending: false })
      .limit(10);

    if (data) {
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, email")
        .in("id", userIds);

      const leaderboardWithNames = data.map(entry => {
        const profile = profiles?.find(p => p.id === entry.user_id);
        return {
          username: profile?.username || profile?.email || "Anonymous",
          prize_amount: entry.prize_amount,
          created_at: entry.created_at,
        };
      });

      setLeaderboard(leaderboardWithNames);
    }
  };

  const fetchSpinHistory = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data } = await supabase
      .from("daily_spins")
      .select("*")
      .eq("user_id", userId)
      .gte("last_spin_date", sevenDaysAgo.toISOString().split('T')[0])
      .order("last_spin_date", { ascending: false });

    if (data) {
      setSpinHistory(data);
      const total = data.reduce((sum, spin) => sum + (spin.prize_amount || 0), 0);
      setTotalEarnings(total);
    }
  };

  const checkDailySpin = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("daily_spins")
      .select("*")
      .eq("user_id", userId)
      .eq("last_spin_date", today)
      .maybeSingle();

    setCanSpin(!data);
  };

  const playTickSound = () => {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
  };

  const playWinSound = () => {
    if (!audioContext) return;
    
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const startTime = audioContext.currentTime + i * 0.15;
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });
  };

  const handleSpin = async () => {
    if (!canSpin || spinning || prizes.length === 0) return;

    setSpinning(true);
    setResult(null);
    setNewAchievements([]);
    
    const interval = setInterval(() => {
      playTickSound();
    }, 100);

    const targetIndex = Math.floor(Math.random() * prizes.length);
    
    const segmentAngle = 360 / prizes.length;
    const targetAngle = 360 - (targetIndex * segmentAngle + segmentAngle / 2);
    const spins = 5;
    const finalRotation = spins * 360 + targetAngle;

    setRotation(finalRotation);

    setTimeout(async () => {
      clearInterval(interval);
      
      const prize = prizes[targetIndex];
      setResult(prize);
      setSpinning(false);
      setCanSpin(false);

      const today = new Date().toISOString().split('T')[0];
      await supabase.from("daily_spins").insert({
        user_id: userId,
        last_spin_date: today,
        prize_type: prize.amount > 0 ? "cash" : "better_luck",
        prize_amount: prize.amount,
      });
      
      // Update stats and check achievements
      await updateUserStats(prize.amount);
      
      fetchSpinHistory();
      fetchLeaderboard();

      if (prize.amount > 0) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("wallet_bonus")
          .eq("user_id", userId)
          .single();

        if (wallet) {
          await supabase
            .from("wallets")
            .update({ wallet_bonus: Number(wallet.wallet_bonus) + prize.amount })
            .eq("user_id", userId);

          playWinSound();
          
          confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FF6347']
          });

          toast.success(`🎉 Congratulations! You won ${symbol}${prize.amount}!`);
        }
      } else {
        toast.info("Better luck next time! Come back tomorrow for another spin.");
      }
    }, 5000);
  };

  const segmentAngle = prizes.length > 0 ? 360 / prizes.length : 0;

  const createSegmentPath = (index: number) => {
    const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);
    const radius = 195;

    const x1 = 200 + radius * Math.cos(startAngle);
    const y1 = 200 + radius * Math.sin(startAngle);
    const x2 = 200 + radius * Math.cos(endAngle);
    const y2 = 200 + radius * Math.sin(endAngle);

    const largeArc = segmentAngle > 180 ? 1 : 0;

    return `M 200 200 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const getTextPosition = (index: number) => {
    const angle = (index * segmentAngle + segmentAngle / 2 - 90) * (Math.PI / 180);
    const radius = 130;
    const x = 200 + radius * Math.cos(angle);
    const y = 200 + radius * Math.sin(angle);
    const rotation = index * segmentAngle + segmentAngle / 2;
    
    return { x, y, rotation };
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg p-4 transition-opacity duration-300 ${showModal ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div 
        className={`relative bg-card/95 backdrop-blur-xl rounded-3xl p-6 md:p-8 w-full max-w-6xl shadow-2xl border border-border transform transition-all duration-300 ${showModal ? 'scale-100' : 'scale-90'} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 opacity-5 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)),transparent_50%)]" />
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 md:w-12 md:h-12 rounded-full bg-background/90 hover:bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hover:scale-110 hover:rotate-90 duration-300 z-10 shadow-lg"
        >
          <X className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        <div className="text-center mb-6 md:mb-8 relative">
          <div className="inline-flex items-center gap-2 md:gap-3 mb-2 md:mb-3 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 md:px-6 md:py-3 shadow-lg">
            <Coins className="w-5 h-5 md:w-6 md:h-6 text-primary animate-pulse" />
            <h2 className="text-xl md:text-3xl font-black text-primary drop-shadow-lg">
              DAILY FORTUNE WHEEL
            </h2>
            <Coins className="w-5 h-5 md:w-6 md:h-6 text-primary animate-pulse" />
          </div>
          <p className="text-xs md:text-base text-muted-foreground font-semibold tracking-wide">
            {canSpin ? "🎰 Test Your Luck • One Spin Per Day" : "⏰ Return Tomorrow for Another Chance"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Wheel Section */}
          <div>
            <div className="relative mx-auto w-full max-w-[320px] md:max-w-[400px] aspect-square mb-6">
              <div className="absolute inset-0 rounded-full animate-pulse pointer-events-none" style={{
                background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
                filter: 'blur(60px)'
              }} />
              
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 md:-translate-y-6 z-30">
                <div className="relative">
                  <div className="absolute inset-0 blur-xl pointer-events-none" style={{
                    background: 'radial-gradient(circle, hsl(var(--primary) / 0.8) 0%, transparent 70%)'
                  }} />
                  <svg width="50" height="70" viewBox="0 0 60 80" className="md:w-[60px] md:h-[80px]" fill="none">
                    <defs>
                      <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                      </linearGradient>
                    </defs>
                    <path d="M 30 70 L 10 20 L 30 5 L 50 20 Z" fill="url(#arrowGradient)" stroke="hsl(var(--primary))" strokeWidth="2"/>
                    <circle cx="30" cy="10" r="8" fill="hsl(var(--primary))" className="animate-pulse" />
                  </svg>
                </div>
              </div>

              <div className="relative w-full h-full rounded-full bg-background shadow-2xl" style={{
                boxShadow: '0 0 80px hsl(var(--primary) / 0.3), inset 0 0 40px rgba(0,0,0,0.5)'
              }}>
                <svg
                  viewBox="0 0 400 400"
                  className="w-full h-full drop-shadow-2xl"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                    transformOrigin: 'center',
                  }}
                >
                  <defs>
                    {prizes.map((prize, index) => (
                      <linearGradient key={`grad-${index}`} id={`gradient-${index}`}>
                        <stop offset="0%" stopColor={prize.color} stopOpacity="0.9" />
                        <stop offset="100%" stopColor={prize.color} />
                      </linearGradient>
                    ))}
                  </defs>
                  
                  {prizes.map((prize, index) => {
                    const textPos = getTextPosition(index);
                    const labelText = prize.label;
                    const isCashPrize = prize.amount > 0;
                    
                    return (
                      <g key={index}>
                        <path
                          d={createSegmentPath(index)}
                          fill={`url(#gradient-${index})`}
                          stroke="hsl(var(--background))"
                          strokeWidth="4"
                          style={{
                            filter: `drop-shadow(0 0 20px ${prize.color}40)`
                          }}
                        />
                        
                        {isCashPrize ? (
                          <g transform={`rotate(${textPos.rotation}, ${textPos.x}, ${textPos.y})`}>
                            {/* Badge background */}
                            <rect
                              x={textPos.x - 38}
                              y={textPos.y - 14}
                              width="76"
                              height="28"
                              rx="14"
                              fill="rgba(0,0,0,0.6)"
                              stroke="rgba(255,255,255,0.3)"
                              strokeWidth="1"
                            />
                            <text
                              x={textPos.x}
                              y={textPos.y}
                              fill="#FFD700"
                              fontSize="18"
                              fontWeight="900"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              style={{
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                letterSpacing: '0.5px'
                              }}
                            >
                              {labelText}
                            </text>
                          </g>
                        ) : (
                          <text
                            x={textPos.x}
                            y={textPos.y}
                            fill="white"
                            fontSize="18"
                            fontWeight="900"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(${textPos.rotation}, ${textPos.x}, ${textPos.y})`}
                            style={{
                              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,1))',
                              fontFamily: 'system-ui, -apple-system, sans-serif',
                              letterSpacing: '1px'
                            }}
                          >
                            {labelText}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  <circle cx="200" cy="200" r="60" fill="hsl(var(--primary))" style={{
                    filter: 'drop-shadow(0 0 30px hsl(var(--primary)))'
                  }} />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div 
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary flex items-center justify-center shadow-2xl border-3 md:border-4 border-primary/30 relative"
                    style={{
                      boxShadow: '0 0 40px hsl(var(--primary)), inset 0 0 20px rgba(255,255,255,0.2)'
                    }}
                  >
                    <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground drop-shadow-2xl relative z-10 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={handleSpin}
                disabled={!canSpin || spinning}
                className="w-full max-w-xs h-14 text-lg font-bold relative overflow-hidden group"
                style={{
                  boxShadow: '0 0 30px hsl(var(--primary) / 0.5)'
                }}
              >
                <span className="relative z-10">
                  {spinning ? "SPINNING..." : canSpin ? "🎲 SPIN NOW" : "⏰ COME BACK TOMORROW"}
                </span>
              </Button>
            </div>

            {/* Achievements Display */}
            {userAchievements.length > 0 && (
              <div className="mt-6 bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Your Achievements</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {userAchievements.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {userAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="group relative"
                    >
                      <div
                        className="text-3xl p-2 rounded-lg border-2 transition-all hover:scale-110"
                        style={{
                          borderColor: achievement.badge_color,
                          backgroundColor: `${achievement.badge_color}20`,
                        }}
                        title={`${achievement.name}: ${achievement.description}`}
                      >
                        {achievement.icon}
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                        <div className="bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap border border-border">
                          <div className="font-bold">{achievement.name}</div>
                          <div className="text-muted-foreground">{achievement.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Leaderboard & History */}
          <div className="space-y-4">
            {/* Leaderboard */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Today's Top Winners</h3>
              </div>
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No winners yet today. Be the first!
                  </p>
                ) : (
                  leaderboard.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-muted/30 rounded-lg p-3 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          idx === 0 ? 'bg-yellow-500 text-yellow-900' :
                          idx === 1 ? 'bg-gray-400 text-gray-900' :
                          idx === 2 ? 'bg-orange-600 text-orange-100' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                          {entry.username}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-primary">
                        {symbol}{entry.prize_amount}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Spin History */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Your History</h3>
                </div>
                <div className="text-sm font-semibold text-primary">
                  Total: {symbol}{totalEarnings}
                </div>
              </div>
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {spinHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No spin history yet
                  </p>
                ) : (
                  spinHistory.map((spin) => (
                    <div
                      key={spin.id}
                      className="flex items-center justify-between bg-muted/30 rounded-lg p-3 border border-border/50"
                    >
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(spin.last_spin_date), "MMM dd, yyyy")}
                      </div>
                      <div className={`text-sm font-bold ${
                        spin.prize_amount > 0 ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {spin.prize_amount > 0 ? `+${symbol}${spin.prize_amount}` : 'No Win'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
