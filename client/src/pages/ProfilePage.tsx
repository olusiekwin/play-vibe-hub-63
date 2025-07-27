import { useGamblingStore } from "@/store/gamblingStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { User, Settings, LogOut, Mail, Bell, Volume2 } from "lucide-react";

const ProfilePage = () => {
  const { balance, gameStats, settings, updateSettings } = useGamblingStore();

  return (
    <div className="min-h-screen bg-gradient-background pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">👤 Player Profile</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Info */}
          <div className="bg-gradient-card border border-border/50 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">High Roller</h2>
                <p className="text-muted-foreground">Player since 2024</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/10 rounded-lg">
                <p className="text-lg font-bold text-foreground">${balance}</p>
                <p className="text-xs text-muted-foreground">Balance</p>
              </div>
              <div className="text-center p-3 bg-muted/10 rounded-lg">
                <p className="text-lg font-bold text-foreground">{gameStats.gamesPlayed}</p>
                <p className="text-xs text-muted-foreground">Games Played</p>
              </div>
              <div className="text-center p-3 bg-muted/10 rounded-lg">
                <p className="text-lg font-bold text-foreground">{gameStats.totalWins}</p>
                <p className="text-xs text-muted-foreground">Total Wins</p>
              </div>
              <div className="text-center p-3 bg-muted/10 rounded-lg">
                <p className="text-lg font-bold text-foreground">${gameStats.biggestWin}</p>
                <p className="text-xs text-muted-foreground">Biggest Win</p>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-gradient-card border border-border/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Preferences
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">Email Notifications</span>
                </div>
                <Switch 
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSettings({ emailNotifications: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">Sound Effects</span>
                </div>
                <Switch 
                  checked={settings.soundEffects}
                  onCheckedChange={(checked) => updateSettings({ soundEffects: checked })}
                />
              </div>
            </div>
          </div>

          <Button variant="destructive" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;