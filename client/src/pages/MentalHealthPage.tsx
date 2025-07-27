import { useGamblingStore } from "@/store/gamblingStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Clock, 
  DollarSign, 
  Phone, 
  AlertTriangle, 
  Heart,
  Brain,
  Users,
  TrendingDown,
  Zap
} from "lucide-react";

const MentalHealthPage = () => {
  const { settings, gameStats, updateSettings } = useGamblingStore();
  const { toast } = useToast();

  const healthTips = [
    {
      icon: Clock,
      title: "Set Time Limits",
      description: "Decide how long you'll play before you start"
    },
    {
      icon: DollarSign,
      title: "Budget Wisely", 
      description: "Never gamble with money you can't afford to lose"
    },
    {
      icon: TrendingDown,
      title: "Don't Chase Losses",
      description: "Accept losses as part of the game and walk away"
    },
    {
      icon: Heart,
      title: "Take Breaks",
      description: "Step away every 30 minutes to clear your mind"
    },
    {
      icon: Brain,
      title: "Stay Alert",
      description: "Avoid gambling when tired, stressed, or under influence"
    },
    {
      icon: Users,
      title: "Talk to Someone",
      description: "Share your gaming habits with trusted friends or family"
    }
  ];

  const handleSafeModeToggle = (enabled: boolean) => {
    updateSettings({ safeMode: enabled });
    toast({
      title: enabled ? "🛡️ Safe Mode Activated" : "Safe Mode Deactivated",
      description: enabled 
        ? "Time and betting limits are now enforced"
        : "All limits have been removed",
      variant: enabled ? "default" : "destructive"
    });
  };

  const updateTimeLimit = (change: number) => {
    const newLimit = Math.max(15, Math.min(180, settings.timeLimit + change));
    updateSettings({ timeLimit: newLimit });
  };

  const updateBetLimit = (change: number) => {
    const newLimit = Math.max(10, Math.min(1000, settings.betLimit + change));
    updateSettings({ betLimit: newLimit });
  };

  const timeProgress = Math.min((gameStats.timePlayedToday / settings.timeLimit) * 100, 100);
  const isTimeWarning = timeProgress > 80;

  return (
    <div className="min-h-screen bg-gradient-background pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">🧠 Mental Health Hub</h1>
          <p className="text-muted-foreground">
            Your wellbeing matters. Stay in control and gamble responsibly.
          </p>
        </div>

        {/* Safe Mode Card */}
        <div className="bg-gradient-card border border-border/50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-secondary/20 rounded-lg">
                <Shield className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Safe Mode</h2>
                <p className="text-sm text-muted-foreground">Enforce healthy gaming limits</p>
              </div>
            </div>
            <Switch 
              checked={settings.safeMode} 
              onCheckedChange={handleSafeModeToggle}
              className="scale-125"
            />
          </div>
          
          {settings.safeMode && (
            <div className="space-y-6 pt-6 border-t border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Time Limit */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Daily Time Limit
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTimeLimit(-15)}
                      disabled={settings.timeLimit <= 15}
                    >
                      -15m
                    </Button>
                    <div className="text-center">
                      <span className="text-2xl font-bold text-foreground">{settings.timeLimit}</span>
                      <span className="text-sm text-muted-foreground ml-1">minutes</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTimeLimit(15)}
                      disabled={settings.timeLimit >= 180}
                    >
                      +15m
                    </Button>
                  </div>
                </div>
                
                {/* Bet Limit */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Max Bet Amount
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBetLimit(-25)}
                      disabled={settings.betLimit <= 10}
                    >
                      -$25
                    </Button>
                    <div className="text-center">
                      <span className="text-2xl font-bold text-foreground">${settings.betLimit}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBetLimit(25)}
                      disabled={settings.betLimit >= 1000}
                    >
                      +$25
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Usage Statistics */}
        <div className="bg-gradient-card border border-border/50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Today's Activity
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/10 rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-foreground">{gameStats.timePlayedToday}m</p>
              <p className="text-sm text-muted-foreground">Time Played</p>
            </div>
            
            <div className="text-center p-4 bg-muted/10 rounded-lg">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-secondary" />
              <p className="text-2xl font-bold text-foreground">{gameStats.betsToday}</p>
              <p className="text-sm text-muted-foreground">Bets Placed</p>
            </div>
            
            <div className="text-center p-4 bg-muted/10 rounded-lg">
              <TrendingDown className="h-8 w-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold text-foreground">{gameStats.totalWins}</p>
              <p className="text-sm text-muted-foreground">Total Wins</p>
            </div>
            
            <div className="text-center p-4 bg-muted/10 rounded-lg">
              <Heart className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-bold text-foreground">{Math.round((gameStats.totalWins / (gameStats.totalWins + gameStats.totalLosses)) * 100)}%</p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </div>
          </div>

          {/* Time Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Daily Time Usage</span>
              <span className="text-sm text-muted-foreground">
                {gameStats.timePlayedToday}/{settings.timeLimit} minutes
              </span>
            </div>
            <Progress 
              value={timeProgress} 
              className={`h-2 ${isTimeWarning ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`}
            />
          </div>
          
          {isTimeWarning && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg mt-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">
                You're approaching your daily time limit. Consider taking a break!
              </p>
            </div>
          )}
        </div>

        {/* Healthy Gambling Tips */}
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            Responsible Gaming Tips
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {healthTips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <div
                  key={index}
                  className="bg-gradient-card border border-border/50 rounded-lg p-4 hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-accent/20 rounded-lg">
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-1">{tip.title}</h3>
                      <p className="text-sm text-muted-foreground">{tip.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Emergency Support */}
        <div className="bg-gradient-to-r from-destructive/20 to-destructive/10 border border-destructive/30 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-destructive/20 rounded-lg">
              <Phone className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-2">Need Help? You're Not Alone</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If gambling is causing problems in your life, confidential help is available 24/7.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button variant="destructive" className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Helpline: 1-800-522-4700
                </Button>
                <Button variant="outline" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Find Support Groups
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentalHealthPage;