import { useEffect } from "react";
import { useGamblingStore } from "@/store/gamblingStore";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

export const SessionMonitor = () => {
  const { settings, gameStats, startSession } = useGamblingStore();
  const { toast } = useToast();

  useEffect(() => {
    // Start session when component mounts
    startSession();

    // Check for time limit warnings
    const checkTimeLimit = () => {
      if (settings.safeMode && gameStats.timePlayedToday >= settings.timeLimit - 5) {
        toast({
          title: "⚠️ Time Limit Warning",
          description: `You've been playing for ${gameStats.timePlayedToday} minutes. Consider taking a break!`,
          variant: "destructive",
        });
      }

      // Auto-break at 30 minutes
      if (gameStats.timePlayedToday >= 30 && gameStats.timePlayedToday % 30 === 0) {
        toast({
          title: "🛑 Break Reminder",
          description: "You've been playing for 30 minutes. Time for a healthy break!",
          variant: "destructive",
        });
      }
    };

    const interval = setInterval(checkTimeLimit, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [settings, gameStats.timePlayedToday, startSession, toast]);

  return null; // This is a utility component with no UI
};