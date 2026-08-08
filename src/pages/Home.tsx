import { useNavigate } from "react-router-dom";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import DesktopNav from "@/components/layout/DesktopNav";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gamepad2, Star, Wallet, Users, Play, Sparkles, Gift, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { AuthDrawer } from "@/components/auth/AuthDrawer";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/useCurrency";
import { SpinWheel } from "@/components/SpinWheel";
import { LeaderboardSection } from "@/components/home/LeaderboardSection";
import { FeaturedMultipliers } from "@/components/home/FeaturedMultipliers";
import { ExclusivePromotions } from "@/components/home/ExclusivePromotions";
import Footer from "@/components/layout/Footer";
import { GameCategories } from "@/components/home/GameCategories";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import chickenRoadPoster from "@/assets/games/chicken-road-2-poster.png";
import cycleRacePoster from "@/assets/games/cycle-race-poster.jpg";
import coinFlipPoster from "@/assets/games/coin-flip-poster.jpg";

const Home = () => {
  const navigate = useNavigate();
  const { websiteName } = useWebsiteSettings();
  const { symbol } = useCurrency();
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [bonusSettings, setBonusSettings] = useState({
    percent: 100,
    maxAmount: 500
  });

  const autoplayPlugin = Autoplay({ delay: 5000, stopOnInteraction: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchWallet = async () => {
        const { data } = await supabase
          .from("wallets")
          .select("wallet_cash, wallet_bonus")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (data) {
          setWalletBalance(Number(data.wallet_cash) + Number(data.wallet_bonus));
        }
      };

      fetchWallet();

      const channel = supabase
        .channel('wallet-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallets',
            filter: `user_id=eq.${user.id}`
          },
          (payload: any) => {
            if (payload.new) {
              setWalletBalance(Number(payload.new.wallet_cash) + Number(payload.new.wallet_bonus));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    const fetchBonusSettings = async () => {
      const { data } = await supabase
        .from("game_settings")
        .select("first_deposit_bonus_percent, first_deposit_bonus_fixed_amount")
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setBonusSettings({
          percent: Number(data.first_deposit_bonus_percent) || 100,
          maxAmount: Number(data.first_deposit_bonus_fixed_amount) || 500
        });
      }
    };

    fetchBonusSettings();
  }, []);

  return (
    <>
      <AuthDrawer open={authDrawerOpen} onOpenChange={setAuthDrawerOpen} />
      {showSpinWheel && user && (
        <SpinWheel userId={user.id} onClose={() => setShowSpinWheel(false)} />
      )}
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-b border-border z-30">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            <span className="text-base font-bold text-gradient">{websiteName}</span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <Button 
                size="sm"
                variant="outline"
                onClick={() => navigate("/wallet")}
                className="h-8 px-2 text-xs font-semibold"
              >
                <Wallet className="w-4 h-4 mr-1" />
                {symbol}{walletBalance.toFixed(2)}
              </Button>
            )}
            {!user && (
              <Button 
                size="sm"
                onClick={() => navigate("/auth")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 text-xs"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <DesktopNav 
        isAuthenticated={!!user}
        onAuthRequired={() => setAuthDrawerOpen(true)}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5 pb-20 md:pb-0 md:pt-16 pt-14">
        {/* Scrollable Nav for PC */}
        <div className="hidden md:block sticky top-16 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-4 py-3 overflow-x-auto scrollbar-hide">
              <Button
                variant="ghost"
                className="flex-shrink-0 bg-purple-500/20 text-purple-500 hover:bg-purple-500/30 font-semibold"
                onClick={() => navigate("/coin-flip")}
              >
                🪙 Coin Flip
              </Button>
              <Button
                variant="ghost"
                className="flex-shrink-0 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 font-semibold"
                onClick={() => navigate("/chicken-road")}
              >
                🐔 Chicken Road
              </Button>
              <Button 
                variant="ghost" 
                className="flex-shrink-0 bg-cyan-500/20 text-cyan-500 hover:bg-cyan-500/30 font-semibold"
                onClick={() => navigate("/cycle-race")}
              >
                🚴 Cycle Race
              </Button>
              <Button 
                variant="ghost" 
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/")}
              >
                🏠 Home
              </Button>
              <Button 
                variant="ghost" 
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => user ? navigate("/wallet") : navigate("/auth")}
              >
                💰 Wallet
              </Button>
              <Button 
                variant="ghost" 
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => user ? navigate("/history") : navigate("/auth")}
              >
                📜 History
              </Button>
              <Button 
                variant="ghost" 
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => user ? navigate("/referrals") : navigate("/auth")}
              >
                👥 Referrals
              </Button>
              <Button 
                variant="ghost" 
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => user ? navigate("/profile") : navigate("/auth")}
              >
                👤 Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Carousel - Chicken Road Themed Banners */}
        <div className="relative overflow-hidden bg-gradient-to-r from-background via-amber-500/5 to-background">
          <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              plugins={[autoplayPlugin]}
              className="w-full"
            >
              <CarouselContent>
                {/* Slide 1: Chicken Road Game */}
                <CarouselItem>
                  <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
                    <div className="relative flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-6 p-4 md:p-8 min-h-[200px] md:min-h-[280px]">
                      <div className="flex flex-col justify-center space-y-1.5 md:space-y-3 animate-fade-in">
                        <Badge className="bg-amber-500 text-white text-[10px] md:text-xs font-bold w-fit">
                          🔥 MOST POPULAR
                        </Badge>
                        <h2 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground leading-tight">
                          Chicken Road
                        </h2>
                        <p className="text-xs md:text-base text-muted-foreground line-clamp-2 md:line-clamp-none">
                          Help the chicken cross the road! Dodge traffic and win up to <span className="text-amber-500 font-bold">100x</span>
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button 
                            size="sm"
                            onClick={() => navigate("/chicken-road")}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg text-xs md:text-sm h-8 md:h-10 px-3 md:px-6"
                          >
                            <Play className="w-3 h-3 md:w-4 md:h-4 mr-1 fill-current" />
                            Play Now
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-sm pt-1">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-success animate-pulse" />
                            <span className="text-muted-foreground">1,892 playing</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 md:w-4 md:h-4 text-amber-500 fill-amber-500" />
                            <span className="font-bold">97% RTP</span>
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:flex items-center justify-center animate-fade-in">
                        <img
                          src={chickenRoadPoster}
                          alt="Chicken Road Game"
                          className="w-full h-auto object-contain drop-shadow-2xl max-h-[220px] lg:max-h-[260px]"
                        />
                      </div>
                    </div>
                  </Card>
                </CarouselItem>

                {/* Slide 2: Welcome Bonus - Chicken Road Themed */}
                <CarouselItem>
                  <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-600/20 via-orange-500/10 to-transparent">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
                    <div className="relative flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-6 p-4 md:p-8 min-h-[200px] md:min-h-[280px]">
                      <div className="flex flex-col justify-center space-y-1.5 md:space-y-3 animate-fade-in">
                        <Badge className="bg-amber-500 text-white text-[10px] md:text-xs font-bold w-fit animate-pulse">
                          🐔 NEW PLAYERS BONUS
                        </Badge>
                        <h2 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground leading-tight">
                          First Deposit Bonus
                        </h2>
                        <div className="space-y-0.5 md:space-y-1">
                          <p className="text-2xl md:text-5xl font-black text-amber-500 leading-tight">{bonusSettings.percent}% Match</p>
                          <p className="text-xs md:text-base text-muted-foreground line-clamp-2 md:line-clamp-none">
                            Up to <span className="text-amber-500 font-bold">{symbol}{bonusSettings.maxAmount}</span> to play Chicken Road!
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button 
                            size="sm"
                            onClick={() => {
                              if (user) {
                                setShowSpinWheel(true);
                              } else {
                                setAuthDrawerOpen(true);
                              }
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg text-xs md:text-sm h-8 md:h-10 px-3 md:px-6"
                          >
                            <Gift className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                            Claim Reward
                          </Button>
                        </div>
                      </div>
                      <div className="hidden md:flex items-center justify-center animate-fade-in">
                        <div className="relative">
                          <div className="text-8xl">🐔</div>
                          <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-amber-500 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </CarouselItem>

                {/* Slide 3: Cycle Race Game */}
                <CarouselItem>
                  <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
                    <div className="relative flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-6 p-4 md:p-8 min-h-[200px] md:min-h-[280px]">
                      <div className="flex flex-col justify-center space-y-1.5 md:space-y-3 animate-fade-in">
                        <Badge className="bg-cyan-500 text-white text-[10px] md:text-xs font-bold w-fit">
                          🚴 MULTIPLAYER RACING
                        </Badge>
                        <h2 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground leading-tight">
                          Cycle Race
                        </h2>
                        <p className="text-xs md:text-base text-muted-foreground line-clamp-2 md:line-clamp-none">
                          Pick your cyclist and race to victory! Win up to <span className="text-cyan-500 font-bold">10x</span> your bet
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button 
                            size="sm"
                            onClick={() => navigate("/cycle-race")}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold shadow-lg text-xs md:text-sm h-8 md:h-10 px-3 md:px-6"
                          >
                            <Play className="w-3 h-3 md:w-4 md:h-4 mr-1 fill-current" />
                            Join Race
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-sm pt-1">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-success animate-pulse" />
                            <span className="text-muted-foreground">2,341 playing</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 md:w-4 md:h-4 text-cyan-500 fill-cyan-500" />
                            <span className="font-bold">96% RTP</span>
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:flex items-center justify-center animate-fade-in">
                        <img
                          src={cycleRacePoster}
                          alt="Cycle Race Game"
                          className="w-full h-auto object-contain drop-shadow-2xl max-h-[220px] lg:max-h-[260px] rounded-lg"
                        />
                      </div>
                    </div>
                  </Card>
                </CarouselItem>

                {/* Slide 4: Coin Flip Game */}
                <CarouselItem>
                  <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500/20 via-fuchsia-500/10 to-transparent">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
                    <div className="relative flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-6 p-4 md:p-8 min-h-[200px] md:min-h-[280px]">
                      <div className="flex flex-col justify-center space-y-1.5 md:space-y-3 animate-fade-in">
                        <Badge className="bg-purple-500 text-white text-[10px] md:text-xs font-bold w-fit">
                          🪙 INSTANT WINS
                        </Badge>
                        <h2 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground leading-tight">
                          Coin Flip
                        </h2>
                        <p className="text-xs md:text-base text-muted-foreground line-clamp-2 md:line-clamp-none">
                          Call it heads or tails and win up to <span className="text-purple-500 font-bold">1.95x</span> your bet instantly
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => navigate("/coin-flip")}
                            className="bg-purple-500 hover:bg-purple-600 text-white font-bold shadow-lg text-xs md:text-sm h-8 md:h-10 px-3 md:px-6"
                          >
                            <Play className="w-3 h-3 md:w-4 md:h-4 mr-1 fill-current" />
                            Flip Now
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-sm pt-1">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-success animate-pulse" />
                            <span className="text-muted-foreground">Live now</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 md:w-4 md:h-4 text-purple-500 fill-purple-500" />
                            <span className="font-bold">95% RTP</span>
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:flex items-center justify-center animate-fade-in">
                        <img
                          src={coinFlipPoster}
                          alt="Coin Flip Game"
                          className="w-full h-auto object-contain drop-shadow-2xl max-h-[220px] lg:max-h-[260px] rounded-lg"
                        />
                      </div>
                    </div>
                  </Card>
                </CarouselItem>

                {/* Slide 5: High Multiplier - Chicken Road Themed */}
                <CarouselItem>
                  <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
                    <div className="relative flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-6 p-4 md:p-8 min-h-[200px] md:min-h-[280px]">
                      <div className="flex flex-col justify-center space-y-1.5 md:space-y-3 animate-fade-in">
                        <Badge className="bg-orange-500 text-white text-[10px] md:text-xs font-bold w-fit">
                          🏆 HIGH MULTIPLIERS
                        </Badge>
                        <h2 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground leading-tight">
                          Win Up To 100x!
                        </h2>
                        <p className="text-xs md:text-base text-muted-foreground line-clamp-2 md:line-clamp-none">
                          Cross more lanes, win bigger! Every lane crossed increases your <span className="text-orange-500 font-bold">multiplier</span>
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button 
                            size="sm"
                            onClick={() => navigate("/chicken-road")}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg text-xs md:text-sm h-8 md:h-10 px-3 md:px-6"
                          >
                            <Play className="w-3 h-3 md:w-4 md:h-4 mr-1 fill-current" />
                            Start Playing
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-sm pt-1">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-success animate-pulse" />
                            <span className="text-muted-foreground">Live now</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 md:w-4 md:h-4 text-orange-500 fill-orange-500" />
                            <span className="font-bold">Provably Fair</span>
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:flex items-center justify-center animate-fade-in">
                        <div className="relative">
                          <div className="w-40 h-40 lg:w-48 lg:h-48 bg-gradient-to-br from-orange-500/30 to-amber-600/10 rounded-full flex items-center justify-center">
                            <span className="text-5xl lg:text-6xl font-black text-orange-500">100x</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious className="left-2 hidden md:flex" />
              <CarouselNext className="right-2 hidden md:flex" />
            </Carousel>
          </div>
        </div>

        {/* Featured Game Card */}
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <Card 
            className="relative overflow-hidden border-0 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 cursor-pointer group hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-500"
            onClick={() => navigate("/chicken-road")}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex flex-row items-center gap-4 md:gap-8 p-4 md:p-8">
              {/* Poster Image */}
              <div className="flex-shrink-0 relative">
                <div className="w-24 h-24 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-2xl overflow-hidden shadow-2xl shadow-amber-500/30 border-2 border-amber-500/30 group-hover:border-amber-500/60 transition-all duration-500 group-hover:scale-105">
                  <img
                    src={chickenRoadPoster}
                    alt="Chicken Road Game"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Badge className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] md:text-xs font-bold animate-pulse shadow-lg shadow-amber-500/50">
                  🔥 HOT
                </Badge>
              </div>
              
              {/* Content */}
              <div className="flex-1 space-y-2 md:space-y-4">
                <div className="space-y-1 md:space-y-2">
                  <h1 className="text-xl md:text-3xl lg:text-4xl font-black text-foreground leading-tight">
                    🐔 Chicken Road
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 max-w-xl">
                    Dodge traffic and win up to <span className="text-amber-500 font-bold">100x</span> your bet!
                  </p>
                </div>
                
                {/* Stats Row */}
                <div className="flex flex-wrap items-center gap-3 md:gap-6 text-[10px] md:text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <Users className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                    <span className="text-muted-foreground font-medium">1,892 playing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 md:w-4 md:h-4 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-foreground">97% RTP</span>
                  </div>
                </div>
                
                {/* Play Button */}
                <Button 
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xl shadow-amber-500/30 text-sm md:text-base h-10 md:h-12 px-6 md:px-8 group-hover:scale-105 transition-transform duration-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/chicken-road");
                  }}
                >
                  <Play className="w-4 h-4 md:w-5 md:h-5 mr-2 fill-current" />
                  Play Now
                </Button>
              </div>
            </div>
          </Card>

          {/* Cycle Race Featured Card */}
          <Card 
            className="relative overflow-hidden border-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-cyan-500/20 cursor-pointer group hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 mt-4"
            onClick={() => navigate("/cycle-race")}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex flex-row items-center gap-4 md:gap-8 p-4 md:p-8">
              {/* Poster Image */}
              <div className="flex-shrink-0 relative">
                <div className="w-24 h-24 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/30 border-2 border-cyan-500/30 group-hover:border-cyan-500/60 transition-all duration-500 group-hover:scale-105">
                  <img
                    src={cycleRacePoster}
                    alt="Cycle Race Game"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Badge className="absolute -top-2 -right-2 bg-cyan-500 text-white text-[10px] md:text-xs font-bold animate-pulse shadow-lg shadow-cyan-500/50">
                  🏆 NEW
                </Badge>
              </div>
              
              {/* Content */}
              <div className="flex-1 space-y-2 md:space-y-4">
                <div className="space-y-1 md:space-y-2">
                  <h1 className="text-xl md:text-3xl lg:text-4xl font-black text-foreground leading-tight">
                    🚴 Cycle Race
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 max-w-xl">
                    Pick your cyclist and win up to <span className="text-cyan-500 font-bold">6x</span> your bet!
                  </p>
                </div>
                
                {/* Stats Row */}
                <div className="flex flex-wrap items-center gap-3 md:gap-6 text-[10px] md:text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <Users className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                    <span className="text-muted-foreground font-medium">1,245 playing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 md:w-4 md:h-4 text-cyan-500 fill-cyan-500" />
                    <span className="font-bold text-foreground">95% RTP</span>
                  </div>
                </div>
                
                {/* Play Button */}
                <Button 
                  size="lg"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold shadow-xl shadow-cyan-500/30 text-sm md:text-base h-10 md:h-12 px-6 md:px-8 group-hover:scale-105 transition-transform duration-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/cycle-race");
                  }}
                >
                  <Play className="w-4 h-4 md:w-5 md:h-5 mr-2 fill-current" />
                  Play Now
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* All Games Categories */}
        <GameCategories />

        {/* Massive Wins Section */}
        <FeaturedMultipliers />

        {/* Exclusive Promotions */}
        <ExclusivePromotions 
          user={user} 
          onAuthRequired={() => setAuthDrawerOpen(true)} 
          onSpinWheel={() => setShowSpinWheel(true)} 
        />

        {/* Leaderboard, Challenges & Big Wins Section */}
        <LeaderboardSection />
        
        {/* Footer */}
        <Footer />
      </div>

      <BottomNav isAuthenticated={!!user} />
    </>
  );
};

export default Home;
