import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Clock, Trophy, Users, Sparkles, Target, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSounds } from "@/hooks/useGameSounds";

export default function Wingo() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const { playBetPlaced, playCoinFlipResult } = useGameSounds();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [betAmount, setBetAmount] = useState(10);
  const [selectedBets, setSelectedBets] = useState<Set<string>>(new Set());
  const [myBets, setMyBets] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [activePlayers, setActivePlayers] = useState(1247);
  const [totalBets, setTotalBets] = useState(0);
  const [isProcessingRound, setIsProcessingRound] = useState(false);
  const [settings, setSettings] = useState<any>({ betting_duration_seconds: 25 });
  const [userRoundResult, setUserRoundResult] = useState<{ won: boolean; profit: number; bets: any[] } | null>(null);
  const [processedRoundIds, setProcessedRoundIds] = useState<Set<string>>(new Set());
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isShowingResultRef = useRef(false);

  const quickAmounts = [10, 50, 100, 500, 1000];

  const colorOptions = [
    { id: 'green', label: 'Green', multiplier: 2, gradient: 'from-green-500 to-emerald-600', ring: 'ring-green-500' },
    { id: 'violet', label: 'Violet', multiplier: 4.5, gradient: 'from-purple-500 to-violet-600', ring: 'ring-purple-500' },
    { id: 'red', label: 'Red', multiplier: 2, gradient: 'from-red-500 to-rose-600', ring: 'ring-red-500' },
  ];

  const sizeOptions = [
    { id: 'big', label: 'Big (5-9)', multiplier: 2, icon: '↑' },
    { id: 'small', label: 'Small (0-4)', multiplier: 2, icon: '↓' },
  ];

  const numbers = Array.from({ length: 10 }, (_, i) => i);

  const getNumberColor = (num: number) => {
    if (num === 0 || num === 5) return 'from-purple-500 via-green-500 to-purple-500';
    if ([1, 3, 7, 9].includes(num)) return 'from-green-500 to-emerald-600';
    return 'from-red-500 to-rose-600';
  };

  useEffect(() => {
    checkUser();
    fetchSettings();
    initializeGame();
    fetchTrendData();
    subscribeToRounds();
    
    const timer = setInterval(async () => {
      if (currentRound && currentRound.status === 'betting') {
        const elapsed = Date.now() - new Date(currentRound.started_at).getTime();
        const remaining = Math.max(0, (settings.betting_duration_seconds * 1000) - elapsed);
        setTimeLeft(Math.ceil(remaining / 1000));
        
        // Trigger round processing when time runs out (only once per round)
        if (remaining <= 0 && !isProcessingRound) {
          setIsProcessingRound(true);
          try {
            await supabase.functions.invoke('wingo-engine', {
              body: { action: 'process_round', roundId: currentRound.id }
            });
          } catch (error) {
            console.error('Error processing round:', error);
          }
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [currentRound]);

  const initializeGame = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('wingo-engine', {
        body: { action: 'get_state' }
      });

      if (error) throw error;
      
      if (data?.round) {
        setCurrentRound(data.round);
        fetchRoundBets(data.round.id);
      }
    } catch (error) {
      console.error('Error initializing game:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to game server",
        variant: "destructive"
      });
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('wingo_settings')
      .select('*')
      .maybeSingle();
    if (data) {
      setSettings(data);
    }
  };

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      fetchWallet(user.id);
      fetchMyBets(user.id);
    }
  };

  const fetchWallet = async (userId: string) => {
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    setWallet(data);
  };

  const fetchCurrentRound = async () => {
    const { data } = await supabase
      .from('wingo_rounds')
      .select('*')
      .order('round_number', { ascending: false })
      .limit(1)
      .single();
    setCurrentRound(data);
    if (data) fetchRoundBets(data.id);
  };

  const fetchRoundBets = async (roundId: string) => {
    const { data } = await supabase
      .from('wingo_bets')
      .select('*')
      .eq('round_id', roundId);
    setTotalBets(data?.length || 0);
  };

  const fetchMyBets = async (userId: string) => {
    const { data } = await supabase
      .from('wingo_bets')
      .select('*, wingo_rounds(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    setMyBets(data || []);
  };

  const fetchTrendData = async () => {
    const { data } = await supabase
      .from('wingo_rounds')
      .select('*')
      .eq('status', 'completed')
      .order('round_number', { ascending: false })
      .limit(50);
    setTrendData(data || []);
  };

  const subscribeToRounds = () => {
    const channel = supabase
      .channel('wingo-rounds')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wingo_rounds'
      }, async (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
          setLastResult(payload.new);
          fetchTrendData();
          
          // Check user's bets for this round - only process once per round
          if (user && !processedRoundIds.has(payload.new.id) && !isShowingResultRef.current) {
            // Mark this round as processed
            setProcessedRoundIds(prev => new Set([...prev, payload.new.id]));
            isShowingResultRef.current = true;
            
            const { data: userBets } = await supabase
              .from('wingo_bets')
              .select('*')
              .eq('round_id', payload.new.id)
              .eq('user_id', user.id);
            
            if (userBets && userBets.length > 0) {
              const wonBets = userBets.filter(bet => bet.status === 'won');
              const totalProfit = wonBets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
              const totalLoss = userBets.filter(bet => bet.status === 'lost').reduce((sum, bet) => sum + bet.amount, 0);
              
              setUserRoundResult({
                won: wonBets.length > 0,
                profit: wonBets.length > 0 ? totalProfit : -totalLoss,
                bets: userBets
              });
              setShowResult(true);
              
              // Play win or loss sound
              playCoinFlipResult(wonBets.length > 0);
              
              // Clear any existing timeout
              if (resultTimeoutRef.current) {
                clearTimeout(resultTimeoutRef.current);
              }
              
              resultTimeoutRef.current = setTimeout(() => {
                setShowResult(false);
                setUserRoundResult(null);
                isShowingResultRef.current = false;
                resultTimeoutRef.current = null;
              }, 6000);
            } else {
              isShowingResultRef.current = false;
            }
            
            fetchMyBets(user.id);
            fetchWallet(user.id);
          }
        }
        if (payload.eventType === 'INSERT') {
          setCurrentRound(payload.new);
          setSelectedBets(new Set());
          setIsProcessingRound(false); // Reset flag for new round
          fetchRoundBets(payload.new.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleBet = (betId: string) => {
    const newBets = new Set(selectedBets);
    if (newBets.has(betId)) {
      newBets.delete(betId);
    } else {
      newBets.add(betId);
    }
    setSelectedBets(newBets);
  };

  const placeBets = async () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to place bets",
        variant: "destructive"
      });
      return;
    }

    if (selectedBets.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one bet",
        variant: "destructive"
      });
      return;
    }

    if (!currentRound || currentRound.status !== 'betting') {
      toast({
        title: "Betting Closed",
        description: "Wait for the next round",
        variant: "destructive"
      });
      return;
    }

    const totalCost = betAmount * selectedBets.size;
    if (wallet.wallet_cash < totalCost) {
      toast({
        title: "Insufficient Balance",
        description: "Please add funds to your wallet",
        variant: "destructive"
      });
      return;
    }

    // Deduct total cost
    await supabase
      .from('wallets')
      .update({ wallet_cash: wallet.wallet_cash - totalCost })
      .eq('user_id', user.id);

    // Place all bets
    const betsToInsert = Array.from(selectedBets).map(betId => {
      let multiplier = 2;
      if (betId === 'violet') multiplier = 4.5;
      else if (betId.startsWith('number-')) multiplier = 9;

      return {
        user_id: user.id,
        round_id: currentRound.id,
        amount: betAmount,
        color: betId,
        potential_payout: betAmount * multiplier,
        status: 'pending'
      };
    });

    const { error } = await supabase
      .from('wingo_bets')
      .insert(betsToInsert);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to place bets",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Bets Placed!",
      description: `${selectedBets.size} bet(s) for ${formatCurrency(totalCost)}`,
    });
    
    // Play bet placed sound
    playBetPlaced();

    fetchWallet(user.id);
    fetchMyBets(user.id);
    fetchRoundBets(currentRound.id);
    setSelectedBets(new Set());
  };

  const progress = timeLeft > 0 ? (timeLeft / settings.betting_duration_seconds) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 pb-16 sm:pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full h-8 w-8 sm:h-9 sm:w-9">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div>
                <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Wingo
                </h1>
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                  <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span>{activePlayers.toLocaleString()} playing</span>
                </div>
              </div>
            </div>
            <Card className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Balance</p>
              <p className="text-sm sm:text-base font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {formatCurrency(wallet?.wallet_cash || 0)}
              </p>
            </Card>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-3 py-2 sm:py-3 max-w-7xl">
        <div className="grid lg:grid-cols-[1fr_350px] gap-2 sm:gap-3">
          {/* Main Content */}
          <div className="space-y-2 sm:space-y-3">
            {/* Period & Timer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20">
                <div className="absolute inset-0 bg-grid-white/5" />
                <div className="relative p-2 sm:p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                        <Trophy className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        Period
                      </p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                        {currentRound?.round_number || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20">
                        <svg className="transform -rotate-90 w-full h-full">
                          <circle
                            cx="50%"
                            cy="50%"
                            r="44%"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="none"
                            className="text-muted/20"
                          />
                          <circle
                            cx="50%"
                            cy="50%"
                            r="44%"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="none"
                            strokeDasharray={276.46}
                            strokeDashoffset={276.46 - (276.46 * progress) / 100}
                            className="text-primary transition-all duration-300"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">{timeLeft}</span>
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">sec</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Bets</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold">{totalBets}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground capitalize mt-0.5">
                        {!currentRound ? 'Loading' : 
                         currentRound.status === 'betting' && timeLeft > 0 ? 'Betting' :
                         currentRound.status === 'betting' && timeLeft === 0 ? 'Processing...' :
                         currentRound.status === 'finished' ? 'Revealing Result' :
                         currentRound.status === 'completed' ? 'Next Round...' : 
                         'Loading'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

        {/* Premium Win/Loss Result Popup */}
        <AnimatePresence>
          {showResult && lastResult && userRoundResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-lg"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 400 }}
                className="relative w-full max-w-sm"
              >
                <Card className={`relative overflow-hidden border-2 backdrop-blur-xl ${
                  userRoundResult.won 
                    ? 'border-green-500/60 bg-gradient-to-br from-green-500/20 via-background/95 to-green-500/10' 
                    : 'border-red-500/60 bg-gradient-to-br from-red-500/20 via-background/95 to-red-500/10'
                }`}>
                  {/* Animated Background Effects */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {userRoundResult.won && (
                      <>
                        {[...Array(12)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ 
                              y: ['0%', '120%'],
                              opacity: [0, 0.8, 0],
                              x: Math.random() * 80 - 40
                            }}
                            transition={{
                              duration: 2.5 + Math.random() * 1.5,
                              delay: Math.random() * 0.3,
                              repeat: Infinity
                            }}
                            className="absolute text-xl"
                            style={{ left: `${Math.random() * 100}%` }}
                          >
                            ✨
                          </motion.div>
                        ))}
                      </>
                    )}
                    {/* Glow effect */}
                    <div className={`absolute inset-0 ${
                      userRoundResult.won 
                        ? 'bg-gradient-radial from-green-500/20 to-transparent' 
                        : 'bg-gradient-radial from-red-500/20 to-transparent'
                    } blur-2xl`} />
                  </div>

                  {/* Compact Content */}
                  <div className="relative p-4 flex flex-col items-center space-y-2.5">
                    {/* Icon & Title Combined */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 250 }}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        userRoundResult.won 
                          ? 'bg-gradient-to-br from-green-400 to-emerald-600' 
                          : 'bg-gradient-to-br from-red-400 to-rose-600'
                      } shadow-xl ring-4 ${
                        userRoundResult.won ? 'ring-green-500/30' : 'ring-red-500/30'
                      }`}>
                        {userRoundResult.won ? (
                          <Trophy className="h-6 w-6 text-white" />
                        ) : (
                          <Target className="h-6 w-6 text-white" />
                        )}
                      </div>
                      <h2 className={`text-xl font-bold ${
                        userRoundResult.won ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {userRoundResult.won ? 'You Won!' : 'You Lost'}
                      </h2>
                    </motion.div>

                    {/* Result Display - Compact */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-3 w-full justify-center"
                    >
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">Result</p>
                        <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${getNumberColor(lastResult.result_number)} shadow-xl flex items-center justify-center ring-2 ring-white/20`}>
                          <span className="text-2xl font-bold text-white">{lastResult.result_number}</span>
                        </div>
                      </div>
                      
                      <div className="h-10 w-px bg-border/50" />
                      
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">Period</p>
                        <p className="text-sm font-semibold text-foreground/80">#{lastResult.round_number}</p>
                      </div>
                    </motion.div>

                    {/* Profit/Loss Amount - Compact */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className={`w-full p-2.5 rounded-lg ${
                        userRoundResult.won 
                          ? 'bg-green-500/15 border border-green-500/40' 
                          : 'bg-red-500/15 border border-red-500/40'
                      }`}
                    >
                      <p className="text-[10px] text-muted-foreground text-center">
                        {userRoundResult.won ? 'Winnings' : 'Loss'}
                      </p>
                      <p className={`text-2xl font-bold text-center ${
                        userRoundResult.won ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {userRoundResult.won ? '+' : ''}{formatCurrency(userRoundResult.profit)}
                      </p>
                    </motion.div>

                    {/* Bets Summary - Inline */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-3 text-xs"
                    >
                      {userRoundResult.bets.filter(b => b.status === 'won').length > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          <span className="text-green-400">
                            {userRoundResult.bets.filter(b => b.status === 'won').length} won
                          </span>
                        </div>
                      )}
                      {userRoundResult.bets.filter(b => b.status === 'lost').length > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span className="text-red-400">
                            {userRoundResult.bets.filter(b => b.status === 'lost').length} lost
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

            {/* Color Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="p-2 sm:p-3 bg-gradient-to-br from-card to-card/50 border-primary/10">
                <h3 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  Select Colors
                </h3>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {colorOptions.map((color, idx) => (
                    <motion.button
                      key={color.id}
                      onClick={() => toggleBet(color.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`relative p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all ${
                        selectedBets.has(color.id)
                          ? `${color.ring} ring-2 border-transparent scale-105`
                          : 'border-border hover:border-primary/50'
                      } overflow-hidden group`}
                      style={{ 
                        background: `linear-gradient(135deg, ${
                          color.id === 'green' ? '#10b981, #059669' :
                          color.id === 'violet' ? '#a855f7, #7c3aed' :
                          '#ef4444, #dc2626'
                        })`
                      }}
                    >
                      {/* Liquid Wave Animation */}
                      <motion.div
                        className="absolute inset-0 opacity-40"
                        animate={{
                          backgroundPosition: ['0% 0%', '100% 100%'],
                        }}
                        transition={{
                          duration: 3 + idx,
                          repeat: Infinity,
                          repeatType: "reverse",
                          ease: "easeInOut"
                        }}
                        style={{
                          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 70%)`,
                          backgroundSize: '200% 200%'
                        }}
                      />
                      
                      {/* Floating Bubbles */}
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute rounded-full bg-white/20"
                          style={{
                            width: `${20 + i * 10}px`,
                            height: `${20 + i * 10}px`,
                            left: `${20 + i * 30}%`,
                            bottom: '-20px'
                          }}
                          animate={{
                            y: [0, -100, -150],
                            x: [0, Math.sin(i) * 20, 0],
                            opacity: [0, 0.6, 0],
                            scale: [0.8, 1, 0.8]
                          }}
                          transition={{
                            duration: 2 + i * 0.5,
                            delay: i * 0.7 + idx * 0.3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      ))}

                      {/* Wave Overlay */}
                      <motion.div
                        className="absolute inset-0"
                        animate={{
                          backgroundPosition: ['0% 50%', '100% 50%']
                        }}
                        transition={{
                          duration: 4 + idx * 0.5,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        style={{
                          background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 25%, transparent 50%, rgba(255,255,255,0.15) 75%, transparent 100%)`,
                          backgroundSize: '200% 100%'
                        }}
                      />

                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                      
                      <div className="relative text-white z-10">
                        <Circle className="h-3 w-3 sm:h-4 sm:w-4 mx-auto mb-0.5 sm:mb-1" />
                        <p className="font-bold text-xs sm:text-sm">{color.label}</p>
                        <p className="text-[10px] sm:text-xs opacity-90">{color.multiplier}x</p>
                      </div>
                      
                      {selectedBets.has(color.id) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full flex items-center justify-center z-20"
                        >
                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Number Selection */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="p-2 sm:p-3 bg-gradient-to-br from-card to-card/50 border-primary/10">
                <h3 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2 flex items-center gap-1.5">
                  <Target className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  Numbers (9x)
                </h3>
                <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                  {numbers.map((num) => (
                    <motion.button
                      key={num}
                      onClick={() => toggleBet(`number-${num}`)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`relative aspect-square rounded-md sm:rounded-lg border-2 transition-all ${
                        selectedBets.has(`number-${num}`)
                          ? 'ring-2 ring-primary border-transparent scale-110'
                          : 'border-border hover:border-primary/50'
                      } overflow-hidden group`}
                      style={{
                        background: `linear-gradient(135deg, ${
                          num === 0 || num === 5 ? '#a855f7, #10b981, #7c3aed' :
                          [1, 3, 7, 9].includes(num) ? '#10b981, #059669' :
                          '#ef4444, #dc2626'
                        })`
                      }}
                    >
                      {/* Liquid Wave Animation */}
                      <motion.div
                        className="absolute inset-0 opacity-40"
                        animate={{
                          backgroundPosition: ['0% 0%', '100% 100%'],
                        }}
                        transition={{
                          duration: 2.5 + num * 0.2,
                          repeat: Infinity,
                          repeatType: "reverse",
                          ease: "easeInOut"
                        }}
                        style={{
                          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 70%)`,
                          backgroundSize: '200% 200%'
                        }}
                      />

                      {/* Floating Bubbles */}
                      {[...Array(2)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute rounded-full bg-white/20"
                          style={{
                            width: `${10 + i * 8}px`,
                            height: `${10 + i * 8}px`,
                            left: `${30 + i * 30}%`,
                            bottom: '-15px'
                          }}
                          animate={{
                            y: [0, -70, -100],
                            x: [0, Math.sin(i + num) * 15, 0],
                            opacity: [0, 0.5, 0],
                            scale: [0.7, 1, 0.7]
                          }}
                          transition={{
                            duration: 1.8 + i * 0.4,
                            delay: i * 0.5 + num * 0.1,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      ))}

                      {/* Wave Overlay */}
                      <motion.div
                        className="absolute inset-0"
                        animate={{
                          backgroundPosition: ['0% 50%', '100% 50%']
                        }}
                        transition={{
                          duration: 3 + num * 0.2,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        style={{
                          background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 25%, transparent 50%, rgba(255,255,255,0.15) 75%, transparent 100%)`,
                          backgroundSize: '200% 100%'
                        }}
                      />

                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                      
                      <div className="relative h-full flex items-center justify-center z-10">
                        <p className="text-base sm:text-lg font-bold text-white">{num}</p>
                      </div>
                      
                      {selectedBets.has(`number-${num}`) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-0.5 right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full flex items-center justify-center z-20"
                        >
                          <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Big/Small */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="p-2 sm:p-3 bg-gradient-to-br from-card to-card/50 border-primary/10">
                <h3 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2">Big/Small (2x)</h3>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {sizeOptions.map((option, idx) => (
                    <motion.button
                      key={option.id}
                      onClick={() => toggleBet(option.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`relative p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all ${
                        selectedBets.has(option.id)
                          ? 'ring-2 ring-primary border-transparent'
                          : 'border-border hover:border-primary/50'
                      } overflow-hidden group`}
                      style={{
                        background: `linear-gradient(135deg, ${
                          option.id === 'big' ? '#3b82f6, #2563eb' : '#8b5cf6, #7c3aed'
                        })`
                      }}
                    >
                      {/* Liquid Wave Animation */}
                      <motion.div
                        className="absolute inset-0 opacity-40"
                        animate={{
                          backgroundPosition: ['0% 0%', '100% 100%'],
                        }}
                        transition={{
                          duration: 3.5 + idx,
                          repeat: Infinity,
                          repeatType: "reverse",
                          ease: "easeInOut"
                        }}
                        style={{
                          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 70%)`,
                          backgroundSize: '200% 200%'
                        }}
                      />

                      {/* Floating Bubbles */}
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute rounded-full bg-white/20"
                          style={{
                            width: `${15 + i * 10}px`,
                            height: `${15 + i * 10}px`,
                            left: `${25 + i * 25}%`,
                            bottom: '-20px'
                          }}
                          animate={{
                            y: [0, -90, -130],
                            x: [0, Math.sin(i + idx) * 20, 0],
                            opacity: [0, 0.5, 0],
                            scale: [0.7, 1, 0.7]
                          }}
                          transition={{
                            duration: 2.2 + i * 0.5,
                            delay: i * 0.6 + idx * 0.4,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      ))}

                      {/* Wave Overlay */}
                      <motion.div
                        className="absolute inset-0"
                        animate={{
                          backgroundPosition: ['0% 50%', '100% 50%']
                        }}
                        transition={{
                          duration: 4.5 + idx,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        style={{
                          background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 25%, transparent 50%, rgba(255,255,255,0.15) 75%, transparent 100%)`,
                          backgroundSize: '200% 100%'
                        }}
                      />

                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />

                      <div className="text-center relative z-10 text-white">
                        <span className="text-xl sm:text-2xl mb-0.5 sm:mb-1 block">{option.icon}</span>
                        <p className="font-bold text-xs sm:text-sm">{option.label}</p>
                        <p className="text-[10px] sm:text-xs opacity-80">{option.multiplier}x</p>
                      </div>

                      {selectedBets.has(option.id) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full flex items-center justify-center z-20"
                        >
                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar - Bet Amount & Tabs */}
          <div className="space-y-2 sm:space-y-3">
            {/* Bet Amount & Place Bet */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="p-2 sm:p-3 space-y-2 bg-gradient-to-br from-primary/10 via-card to-accent/10 border-primary/20 sticky top-16 sm:top-[4.5rem]">
                <div>
                  <label className="text-[10px] sm:text-xs font-medium mb-1 sm:mb-1.5 block">Bet Amount</label>
                  <div className="flex gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
                    {quickAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant={betAmount === amount ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBetAmount(amount)}
                        className="flex-1 text-[10px] sm:text-xs h-6 sm:h-7 px-1"
                      >
                        {formatCurrency(amount)}
                      </Button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="w-full p-1.5 sm:p-2 rounded-lg border-2 border-border bg-background text-sm sm:text-base font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    min="10"
                  />
                </div>
                <div className="bg-background/50 rounded-lg p-1.5 sm:p-2 space-y-1">
                  <div className="flex justify-between text-[10px] sm:text-xs">
                    <span className="text-muted-foreground">Bets:</span>
                    <span className="font-semibold">{selectedBets.size}</span>
                  </div>
                  <div className="flex justify-between text-[10px] sm:text-xs">
                    <span className="text-muted-foreground">Each:</span>
                    <span className="font-semibold">{formatCurrency(betAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm font-bold border-t border-border pt-1">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(betAmount * selectedBets.size)}</span>
                  </div>
                </div>
                <Button
                  onClick={placeBets}
                  className="w-full h-8 sm:h-10 text-xs sm:text-sm font-bold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/20"
                  size="lg"
                  disabled={selectedBets.size === 0 || timeLeft === 0}
                >
                  {selectedBets.size === 0 ? 'Select Bets' : `Place ${selectedBets.size} Bet(s)`}
                </Button>
              </Card>
            </motion.div>

            {/* Tabs */}
            <Tabs defaultValue="trend" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-7 sm:h-8">
                <TabsTrigger value="trend" className="text-[10px] sm:text-xs">
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  Trend
                </TabsTrigger>
                <TabsTrigger value="mybets" className="text-[10px] sm:text-xs">
                  <Trophy className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  Bets
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trend" className="mt-2">
                <Card className="p-2 sm:p-3 bg-gradient-to-br from-card to-card/50">
                  <h3 className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    Recent
                  </h3>
                  <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-1 sm:gap-1.5">
                    {trendData.slice(0, 24).map((round) => (
                      <motion.div
                        key={round.id}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.1 }}
                        className="text-center"
                      >
                        <div className={`w-full aspect-square mx-auto rounded-md sm:rounded-lg bg-gradient-to-br ${getNumberColor(round.result_number)} shadow-md flex items-center justify-center text-white font-bold text-sm sm:text-base hover:shadow-lg transition-shadow`}>
                          {round.result_number}
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">#{round.round_number}</p>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="mybets" className="mt-2 space-y-1.5">
                {myBets.length === 0 ? (
                  <Card className="p-6 sm:p-8 text-center">
                    <Trophy className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs sm:text-sm text-muted-foreground">No bets yet</p>
                  </Card>
                ) : (
                  myBets.slice(0, 10).map((bet) => (
                    <motion.div
                      key={bet.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Card className="p-2 sm:p-2.5 bg-gradient-to-br from-card to-card/50 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-[10px] sm:text-xs flex items-center gap-1">
                              <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                              #{bet.wingo_rounds?.round_number}
                            </p>
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground capitalize">{bet.color.replace('-', ' ')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[10px] sm:text-xs">{formatCurrency(bet.amount)}</p>
                            <p className={`text-[9px] sm:text-[10px] font-semibold ${
                              bet.status === 'won' ? 'text-green-500' :
                              bet.status === 'lost' ? 'text-red-500' :
                              'text-yellow-500'
                            }`}>
                              {bet.status === 'won' && `+${formatCurrency(bet.profit)}`}
                              {bet.status === 'lost' && formatCurrency(bet.profit)}
                              {bet.status === 'pending' && 'Pending'}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}