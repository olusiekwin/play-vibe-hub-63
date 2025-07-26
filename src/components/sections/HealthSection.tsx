import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Shield, Clock, DollarSign, Phone, AlertTriangle } from "lucide-react";

interface HealthSectionProps {
  onBack: () => void;
}

export const HealthSection = ({ onBack }: HealthSectionProps) => {
  const [safeMode, setSafeMode] = useState(false);
  const [timeLimit, setTimeLimit] = useState(30);
  const [betLimit, setBetLimit] = useState(100);

  const healthTips = [
    "Set time limits before you start playing",
    "Never chase your losses",
    "Gambling should be entertainment, not income",
    "Take regular breaks every 30 minutes",
    "Only gamble with money you can afford to lose",
  ];

  const usageStats = {
    timeToday: 45,
    betsToday: 12,
    averageSession: 25,
    weeklySpend: 350,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Mental Health</h1>
      </div>

      {/* Safe Mode */}
      <div className="bg-gradient-card border border-border/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-secondary" />
            <h2 className="text-lg font-semibold text-foreground">Safe Mode</h2>
          </div>
          <Switch checked={safeMode} onCheckedChange={setSafeMode} />
        </div>
        
        {safeMode && (
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Time Limit (minutes)</label>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimeLimit(Math.max(15, timeLimit - 15))}
                  >
                    -
                  </Button>
                  <span className="text-lg font-medium min-w-[3rem] text-center">{timeLimit}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimeLimit(Math.min(120, timeLimit + 15))}
                  >
                    +
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Bet Limit ($)</label>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetLimit(Math.max(25, betLimit - 25))}
                  >
                    -
                  </Button>
                  <span className="text-lg font-medium min-w-[3rem] text-center">{betLimit}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetLimit(Math.min(500, betLimit + 25))}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Usage Statistics */}
      <div className="bg-gradient-card border border-border/50 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Your Usage Today</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/20 rounded-lg">
            <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{usageStats.timeToday}m</p>
            <p className="text-sm text-muted-foreground">Time Played</p>
          </div>
          
          <div className="text-center p-3 bg-muted/20 rounded-lg">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-secondary" />
            <p className="text-2xl font-bold text-foreground">{usageStats.betsToday}</p>
            <p className="text-sm text-muted-foreground">Bets Placed</p>
          </div>
        </div>
        
        {usageStats.timeToday > 30 && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              You've been playing for over 30 minutes. Consider taking a break!
            </p>
          </div>
        )}
      </div>

      {/* Healthy Gambling Tips */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Healthy Gambling Tips</h2>
        
        <div className="space-y-2">
          {healthTips.map((tip, index) => (
            <div
              key={index}
              className="bg-gradient-card border border-border/50 rounded-lg p-3"
            >
              <p className="text-sm text-foreground">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <h3 className="font-semibold text-destructive mb-2">Need Help?</h3>
        <p className="text-sm text-muted-foreground mb-3">
          If you're struggling with gambling addiction, help is available 24/7.
        </p>
        <Button variant="destructive" className="w-full">
          <Phone className="h-4 w-4 mr-2" />
          Call Gambling Helpline
        </Button>
      </div>
    </div>
  );
};