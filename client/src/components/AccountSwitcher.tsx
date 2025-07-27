import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/hooks/useWallet";
import { AlertTriangle, DollarSign, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export const AccountSwitcher = () => {
  const { accountMode, demoBalance, realBalance, switchAccount } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitch = async (accountType: 'demo' | 'real') => {
    if (accountType === accountMode) return;
    
    setIsLoading(true);
    try {
      await switchAccount(accountType);
    } catch (error) {
      console.error('Failed to switch account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-card border border-border/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Account Mode</h3>
        <Badge variant={accountMode === 'demo' ? 'secondary' : 'default'}>
          {accountMode === 'demo' ? 'Practice Mode' : 'Real Money'}
        </Badge>
      </div>

      <Tabs value={accountMode} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger 
            value="demo" 
            onClick={() => handleSwitch('demo')}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Demo
          </TabsTrigger>
          <TabsTrigger 
            value="real" 
            onClick={() => handleSwitch('real')}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <DollarSign className="h-4 w-4" />
            Real
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Account Balances */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className={cn(
          "p-3 rounded-lg border transition-colors",
          accountMode === 'demo' ? "bg-primary/10 border-primary/20" : "bg-muted/50 border-border"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Play className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Demo</span>
          </div>
          <p className="text-lg font-bold">KES {demoBalance.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Practice money</p>
        </div>

        <div className={cn(
          "p-3 rounded-lg border transition-colors",
          accountMode === 'real' ? "bg-primary/10 border-primary/20" : "bg-muted/50 border-border"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Real</span>
          </div>
          <p className="text-lg font-bold">KES {realBalance.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Real money</p>
        </div>
      </div>

      {/* Warning for real money */}
      {accountMode === 'real' && (
        <div className="flex items-start gap-2 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-yellow-500">Real Money Mode</p>
            <p className="text-muted-foreground">You are using real money. Please gamble responsibly.</p>
          </div>
        </div>
      )}

      {/* Demo mode info */}
      {accountMode === 'demo' && (
        <div className="flex items-start gap-2 mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Play className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-500">Practice Mode</p>
            <p className="text-muted-foreground">Practice with play money. Switch to real mode when ready.</p>
          </div>
        </div>
      )}
    </div>
  );
};
