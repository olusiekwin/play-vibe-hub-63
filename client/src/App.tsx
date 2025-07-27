import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { SessionMonitor } from "@/components/SessionMonitor";

// Pages
import Index from "./pages/Index";
import HomePage from "./pages/HomePage";
import GamesPage from "./pages/GamesPage";
import WalletPage from "./pages/WalletPage";
import VoiceBettingPage from "./pages/VoiceBettingPage";
import MentalHealthPage from "./pages/MentalHealthPage";
import ProfilePage from "./pages/ProfilePage";
import BlackjackGame from "./pages/games/BlackjackGame";
import PokerGame from "./pages/games/PokerGame";
import RouletteGame from "./pages/games/RouletteGame";
import SlotsGame from "./pages/games/SlotsGame";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SessionMonitor />
        <BrowserRouter>
          <div className="relative">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/games" element={<GamesPage />} />
              <Route path="/games/blackjack" element={<BlackjackGame />} />
              <Route path="/games/poker" element={<PokerGame />} />
              <Route path="/games/roulette" element={<RouletteGame />} />
              <Route path="/games/slots" element={<SlotsGame />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/voice" element={<VoiceBettingPage />} />
              <Route path="/health" element={<MentalHealthPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Navigation />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);export default App;
