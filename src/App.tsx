import { Toaster } from "@/components/ui/toaster";
import AviatorRed from "./pages/AviatorRed";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GameEngineProvider } from "@/contexts/GameEngineContext";
import { useSettings } from "@/hooks/useSettings";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { useThemeColors } from "@/hooks/useThemeColors";
import { LicenseGuard } from "@/components/LicenseGuard";
import { TenantProvider } from "@/contexts/TenantContext";
import { TenantGate } from "@/components/TenantGate";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Game from "./pages/Game";
import Wallet from "./pages/Wallet";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Referrals from "./pages/Referrals";
import Transactions from "./pages/Transactions";
import AdminPanel from "./pages/AdminPanel";
import AdminLogin from "./pages/AdminLogin";
import AdminBetHistory from "./pages/AdminBetHistory";
import LiveChatPage from "./pages/LiveChatPage";
import MasterPanel from "./pages/MasterPanel";
import MarketerLogin from "./pages/MarketerLogin";
import MarketerPending from "./pages/MarketerPending";
import MarketerDashboard from "./pages/MarketerDashboard";
import MarketerCoinFlip from "./pages/MarketerCoinFlip";
import Plinko from "./pages/Plinko";
import CycleRace from "./pages/CycleRace";
import CyclePredictions from "./pages/CyclePredictions";
import CoinFlip from "./pages/CoinFlip";
import CoinTrain from "./pages/CoinTrain";
import Mines from "./pages/Mines";
import Wingo from "./pages/Wingo";
import ChickenRoad from "./pages/ChickenRoad";


const queryClient = new QueryClient();

// When set for a deployment (e.g. a client's Cycle-Race-only domain), the
// root route opens Cycle Race directly instead of the multi-game Home
// dashboard. Unset/false (the default) leaves the existing multi-game app
// completely unchanged - this only ever affects what "/" renders.
const STANDALONE_CYCLE_RACE = import.meta.env.VITE_STANDALONE_CYCLE_RACE === "true";

const AppContent = () => {
  // Initialize settings (theme and performance mode)
  useSettings();
  // Initialize website settings (name and logo)
  useWebsiteSettings();
  // Initialize theme colors
  useThemeColors();

  return (
    <Routes>
      <Route path="/" element={STANDALONE_CYCLE_RACE ? <CycleRace /> : <Home />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/game" element={<Game />} />
      <Route path="/plinko" element={<Plinko />} />
      <Route path="/cycle-race" element={<CycleRace />} />
      <Route path="/cycling-race" element={<Navigate to="/cycle-race" replace />} />
      <Route path="/cycling-race-predictions" element={<CyclePredictions />} />
      <Route path="/coin-flip" element={<CoinFlip />} />
      <Route path="/coin-train" element={<CoinTrain />} />
      <Route path="/aviator-red" element={<AviatorRed />} />
      <Route path="/mines" element={<Mines />} />
      <Route path="/wingo" element={<Wingo />} />
      
      <Route path="/wallet" element={<Wallet />} />
      <Route path="/history" element={<History />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/referrals" element={<Referrals />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/live-chat" element={<LiveChatPage />} />
      <Route path="/adminct" element={<AdminPanel />} />
      <Route path="/admin-bet-history" element={<AdminBetHistory />} />
      <Route path="/master" element={<MasterPanel />} />
      <Route path="/chicken-road" element={<ChickenRoad />} />
      <Route path="/marketer-login" element={<MarketerLogin />} />
      <Route path="/marketer-pending" element={<MarketerPending />} />
      <Route path="/marketer" element={<MarketerDashboard />} />
      <Route path="/marketer/coinflip" element={<MarketerCoinFlip />} />
      
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TenantProvider>
          <TenantGate>
            <LicenseGuard>
              <GameEngineProvider>
                <AppContent />
              </GameEngineProvider>
            </LicenseGuard>
          </TenantGate>
        </TenantProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;