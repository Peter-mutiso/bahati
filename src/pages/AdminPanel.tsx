import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, Wallet, TrendingUp, Settings, DollarSign, LayoutDashboard, Shield, Clock, Percent, BarChart3, Gift, Coins, MessageCircle, Globe, Sparkles, Trophy, FileText, Drumstick, Cloud, History, LogOut } from "lucide-react";
import UserManagement from "@/components/admin/UserManagement";
import WalletManagement from "@/components/admin/WalletManagement";
import GameSettings from "@/components/admin/GameSettings";
import BonusSettings from "@/components/admin/BonusSettings";
import TransactionManagement from "@/components/admin/TransactionManagement";
import ProfitAnalytics from "@/components/admin/ProfitAnalytics";
import SystemOverview from "@/components/admin/SystemOverview";
import RoleManagement from "@/components/admin/RoleManagement";
import ActivityLog from "@/components/admin/ActivityLog";
import RTPSettings from "@/components/admin/RTPSettings";
import RTPAnalytics from "@/components/admin/RTPAnalytics";
import LoanManagement from "@/components/admin/LoanManagement";
import { SupportChat } from "@/components/admin/SupportChat";
import { WebsiteSettings } from "@/components/admin/WebsiteSettings";
import SpinWheelSettings from "@/components/admin/SpinWheelSettings";
import AchievementsSettings from "@/components/admin/AchievementsSettings";
import { PromotionsSettings } from "@/components/admin/PromotionsSettings";
import LegalDocuments from "@/components/admin/LegalDocuments";
import { ChickenRoadSettings } from "@/components/admin/ChickenRoadSettings";
import { ChickenRoadHowToPlay } from "@/components/admin/ChickenRoadHowToPlay";
import OfferRainManagement from "@/components/admin/OfferRainManagement";
import { CycleRaceSettings } from "@/components/admin/CycleRaceSettings";
import { AviatorSettings } from "@/components/admin/AviatorSettings";
import WingoSettings from "@/components/admin/WingoSettings";
import { CoinFlipSettings } from "@/components/admin/CoinFlipSettings";
import { CoinTrainSettings } from "@/components/admin/CoinTrainSettings";
import { PlinkoSettings } from "@/components/admin/PlinkoSettings";
import { MinesSettings } from "@/components/admin/MinesSettings";
import { supabase } from "@/integrations/supabase/client";
import { Bike, Plane, Layers, FlipHorizontal, Train, Circle, Bomb } from "lucide-react";
import { ActiveSiteProvider } from "@/contexts/ActiveSiteContext";
import { SiteSelector } from "@/components/admin/SiteSelector";
import SitesManagement from "@/components/admin/SitesManagement";
import MarketerManagement from "@/components/admin/MarketerManagement";

const AdminPanel = () => {
  const { isAdmin, isLoading } = useAdminCheck();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/admin-login");
    }
  }, [isAdmin, isLoading, navigate]);

  // Auto-hide games except Chicken Road and Cycle Race on load
  useEffect(() => {
    const hideOtherGames = async () => {
      const hiddenGames = ["crash", "aviator-red", "plinko", "coin-flip", "coin-train", "mines", "wingo"];
      await supabase
        .from("game_settings")
        .update({ hidden_games: hiddenGames })
        .eq("id", (await supabase.from("game_settings").select("id").single()).data?.id);
    };
    hideOtherGames();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <ActiveSiteProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">Admin Control Panel</h1>
              <p className="text-xs text-muted-foreground">Manage users, game settings, and monitor analytics</p>
            </div>
            <div className="flex items-center gap-2">
              <SiteSelector onAddSite={() => setActiveTab("sites")} />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => { await supabase.auth.signOut(); navigate("/admin-login"); }}
                className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Scrollable Nav for PC */}
          <div className="overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            <TabsList className="inline-flex w-auto gap-1 md:gap-2 min-w-max">
              <TabsTrigger value="overview" className="gap-1 md:gap-2 px-2 md:px-3">
                <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Dashboard</span>
              </TabsTrigger>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin-bet-history")}
                className="gap-1 md:gap-2 px-2 md:px-3"
              >
                <History className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Bet History</span>
              </Button>
              <TabsTrigger value="users" className="gap-1 md:gap-2 px-2 md:px-3">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Users</span>
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-1 md:gap-2 px-2 md:px-3">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Roles</span>
              </TabsTrigger>
              <TabsTrigger value="wallets" className="gap-1 md:gap-2 px-2 md:px-3">
                <Wallet className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Wallets</span>
              </TabsTrigger>
              <TabsTrigger value="loans" className="gap-1 md:gap-2 px-2 md:px-3">
                <Coins className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Loans</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-1 md:gap-2 px-2 md:px-3">
                <DollarSign className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Transactions</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 md:gap-2 px-2 md:px-3">
                <Settings className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Settings</span>
              </TabsTrigger>
              <TabsTrigger value="website" className="gap-1 md:gap-2 px-2 md:px-3">
                <Globe className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Website</span>
              </TabsTrigger>
              <TabsTrigger value="bonus" className="gap-1 md:gap-2 px-2 md:px-3">
                <Gift className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Bonus</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1 md:gap-2 px-2 md:px-3">
                <TrendingUp className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="rtp" className="gap-1 md:gap-2 px-2 md:px-3">
                <Percent className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">RTP</span>
              </TabsTrigger>
              <TabsTrigger value="rtp-analytics" className="gap-1 md:gap-2 px-2 md:px-3">
                <BarChart3 className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">RTP Stats</span>
              </TabsTrigger>
              <TabsTrigger value="chicken-road" className="gap-1 md:gap-2 px-2 md:px-3">
                <Drumstick className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Chicken Road</span>
              </TabsTrigger>
              <TabsTrigger value="cycle-race" className="gap-1 md:gap-2 px-2 md:px-3">
                <Bike className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Cycle Race</span>
              </TabsTrigger>
              <TabsTrigger value="aviator" className="gap-1 md:gap-2 px-2 md:px-3">
                <Plane className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Aviator</span>
              </TabsTrigger>
              <TabsTrigger value="wingo" className="gap-1 md:gap-2 px-2 md:px-3">
                <Layers className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Wingo</span>
              </TabsTrigger>
              <TabsTrigger value="coin-flip" className="gap-1 md:gap-2 px-2 md:px-3">
                <FlipHorizontal className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Coin Flip</span>
              </TabsTrigger>
              <TabsTrigger value="coin-train" className="gap-1 md:gap-2 px-2 md:px-3">
                <Train className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Coin Train</span>
              </TabsTrigger>
              <TabsTrigger value="plinko" className="gap-1 md:gap-2 px-2 md:px-3">
                <Circle className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Plinko</span>
              </TabsTrigger>
              <TabsTrigger value="mines" className="gap-1 md:gap-2 px-2 md:px-3">
                <Bomb className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Mines</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1 md:gap-2 px-2 md:px-3">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Activity</span>
              </TabsTrigger>
              <TabsTrigger value="support" className="gap-1 md:gap-2 px-2 md:px-3">
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Support</span>
              </TabsTrigger>
              <TabsTrigger value="spin-wheel" className="gap-1 md:gap-2 px-2 md:px-3">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Spin Wheel</span>
              </TabsTrigger>
              <TabsTrigger value="achievements" className="gap-1 md:gap-2 px-2 md:px-3">
                <Trophy className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Achievements</span>
              </TabsTrigger>
              <TabsTrigger value="promotions" className="gap-1 md:gap-2 px-2 md:px-3">
                <Gift className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Promotions</span>
              </TabsTrigger>
              <TabsTrigger value="legal" className="gap-1 md:gap-2 px-2 md:px-3">
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Legal</span>
              </TabsTrigger>
              <TabsTrigger value="sites" className="gap-1 md:gap-2 px-2 md:px-3 border border-primary/30">
                <Globe className="w-4 h-4 flex-shrink-0 text-primary" />
                <span className="text-xs md:text-sm text-primary font-medium">Sites</span>
              </TabsTrigger>
              <TabsTrigger value="marketers" className="gap-1 md:gap-2 px-2 md:px-3">
                <TrendingUp className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm">Marketers</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <SystemOverview />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <RoleManagement />
          </TabsContent>

          <TabsContent value="wallets" className="space-y-4">
            <WalletManagement />
          </TabsContent>

          <TabsContent value="loans" className="space-y-4">
            <LoanManagement />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <TransactionManagement />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <GameSettings />
          </TabsContent>

          <TabsContent value="website" className="space-y-4">
            <WebsiteSettings />
          </TabsContent>


          <TabsContent value="bonus" className="space-y-4">
            <BonusSettings />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <ProfitAnalytics />
          </TabsContent>

          <TabsContent value="rtp" className="space-y-4">
            <RTPSettings />
          </TabsContent>

          <TabsContent value="rtp-analytics" className="space-y-4">
            <RTPAnalytics />
          </TabsContent>

          <TabsContent value="chicken-road" className="space-y-4">
            <Tabs defaultValue="settings" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="settings">Game Settings</TabsTrigger>
                <TabsTrigger value="how-to-play">How to Play</TabsTrigger>
                <TabsTrigger value="offer-rain" className="gap-1">
                  <Cloud className="w-4 h-4" />
                  Offer Rain
                </TabsTrigger>
              </TabsList>
              <TabsContent value="settings">
                <ChickenRoadSettings />
              </TabsContent>
              <TabsContent value="how-to-play">
                <ChickenRoadHowToPlay />
              </TabsContent>
              <TabsContent value="offer-rain">
                <OfferRainManagement />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="cycle-race" className="space-y-4">
            <CycleRaceSettings />
          </TabsContent>

          <TabsContent value="aviator" className="space-y-4">
            <AviatorSettings />
          </TabsContent>

          <TabsContent value="wingo" className="space-y-4">
            <WingoSettings />
          </TabsContent>

          <TabsContent value="coin-flip" className="space-y-4">
            <CoinFlipSettings />
          </TabsContent>

          <TabsContent value="coin-train" className="space-y-4">
            <CoinTrainSettings />
          </TabsContent>

          <TabsContent value="plinko" className="space-y-4">
            <PlinkoSettings />
          </TabsContent>

          <TabsContent value="mines" className="space-y-4">
            <MinesSettings />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ActivityLog />
          </TabsContent>

          <TabsContent value="support" className="space-y-4">
            <SupportChat />
          </TabsContent>

          <TabsContent value="spin-wheel" className="space-y-4">
            <SpinWheelSettings />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <AchievementsSettings />
          </TabsContent>

          <TabsContent value="promotions" className="space-y-4">
            <PromotionsSettings />
          </TabsContent>

          <TabsContent value="legal" className="space-y-4">
            <LegalDocuments />
          </TabsContent>

          <TabsContent value="sites" className="space-y-4">
            <SitesManagement />
          </TabsContent>

          <TabsContent value="marketers" className="space-y-4">
            <MarketerManagement />
          </TabsContent>
          </Tabs>
        </main>
      </div>
    </ActiveSiteProvider>
  );
};

export default AdminPanel;
