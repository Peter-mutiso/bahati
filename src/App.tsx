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
import CycleRacePredictionsOversight from "./pages/CycleRacePredictionsOversight";
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

// The five production Cycle-Race-only domains (plus their www variants).
// Any hostname in this set gets the reduced, Cycle-Race-only route table
// below instead of the full multi-game app. Every other hostname (including
// localhost and the existing production domain) is completely unaffected.
const CYCLE_RACE_ONLY_HOSTNAMES = new Set([
  "nyotares.com", "www.nyotares.com",
  "baiskol.com", "www.baiskol.com",
  "bikeres.com", "www.bikeres.com",
  "krests.com", "www.krests.com",
  "siakabike.com", "www.siakabike.com",
]);
const isCycleRaceOnlyHost = CYCLE_RACE_ONLY_HOSTNAMES.has(window.location.hostname);
const cycleRaceOnly = STANDALONE_CYCLE_RACE || isCycleRaceOnlyHost;

// Predictions-only oversight domain. Left unset until the client supplies
// the real hostname - with it unset, isPredictionsHost is always false and
// the app behaves exactly as it does today.
const PREDICTIONS_HOST = import.meta.env.VITE_CYCLE_RACE_PREDICTIONS_HOST;
const isPredictionsHost = !!PREDICTIONS_HOST && window.location.hostname === PREDICTIONS_HOST;

const AppContent = () => {
  // Initialize settings (theme and performance mode)
  useSettings();
  // Initialize website settings (name and logo)
  useWebsiteSettings();
  // Initialize theme colors
  useThemeColors();

  // Predictions-only oversight domain: exposes nothing but the existing
  // admin/marketer prediction view, gated by the same existing
  // authorization checks. No betting UI, no other games, no wallet routes.
  if (isPredictionsHost) {
    return (
      <Routes>
        <Route path="/" element={<CycleRacePredictionsOversight />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Cycle-Race-only domains: only the routes the existing Cycle Race player
  // experience genuinely needs (the game itself, its predictions page, and
  // the account/auth pages it links to). No other game, no admin, no
  // marketer routes exist on these hostnames at all.
  if (cycleRaceOnly) {
    return (
      <Routes>
        <Route path="/" element={<CycleRace />} />
        <Route path="/cycle-race" element={<CycleRace />} />
        <Route path="/cycling-race" element={<Navigate to="/cycle-race" replace />} />
        <Route path="/cycling-race-predictions" element={<CyclePredictions />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/history" element={<History />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/live-chat" element={<LiveChatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
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