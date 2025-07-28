import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { SessionMonitor } from "@/components/SessionMonitor";

// Pages
import HomePage from "./pages/HomePage";
import GamesPage from "./pages/GamesPage";
import VoiceBettingPage from "./pages/VoiceBettingPage";
import WalletPage from "./pages/WalletPage";
import MentalHealthPage from "./pages/MentalHealthPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";

// Individual Game Pages
import BlackjackGame from "./pages/games/BlackjackGame";
import PokerGame from "./pages/games/PokerGame";
import SlotsGame from "./pages/games/SlotsGame";
import RouletteGame from "./pages/games/RouletteGame";
import AviatorGame from "./pages/games/AviatorGame";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SessionMonitor />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/blackjack" element={<BlackjackGame />} />
          <Route path="/games/poker" element={<PokerGame />} />
          <Route path="/games/slots" element={<SlotsGame />} />
          <Route path="/games/roulette" element={<RouletteGame />} />
          <Route path="/games/aviator" element={<AviatorGame />} />
          <Route path="/voice" element={<VoiceBettingPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/health" element={<MentalHealthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Navigation />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
