import { useState, useEffect } from "react";
import { useGamblingStore } from "@/store/gamblingStore";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Volume2, Zap, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceCommand {
  amount: number;
  game: string;
  bet: string;
  confidence: number;
}

const VoiceBettingPage = () => {
  const { balance, updateBalance, addTransaction, updateGameStats } = useGamblingStore();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedCommand, setParsedCommand] = useState<VoiceCommand | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        
        setTranscript(transcript);
        parseVoiceCommand(transcript, confidence);
        setIsListening(false);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Voice Recognition Error",
          description: "Please try speaking again clearly.",
          variant: "destructive",
        });
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    } else {
      toast({
        title: "Voice Recognition Not Supported",
        description: "Your browser doesn't support voice recognition. Using mock commands instead.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleStartListening = () => {
    if (recognition) {
      setIsListening(true);
      recognition.start();
    } else {
      // Fallback for browsers without speech recognition
      setIsListening(true);
      simulateVoiceRecognition();
    }
  };

  const simulateVoiceRecognition = () => {
    setTimeout(() => {
      const mockCommands = [
        "Bet fifty dollars on red in roulette",
        "Place one hundred on blackjack",
        "Wager twenty five on poker",
        "Put seventy five on slots",
        "Bet thirty on black in roulette",
        "Place two hundred on poker",
      ];
      
      const randomCommand = mockCommands[Math.floor(Math.random() * mockCommands.length)];
      setTranscript(randomCommand);
      parseVoiceCommand(randomCommand, 0.95);
      setIsListening(false);
    }, 2000);
  };

  const parseVoiceCommand = (text: string, confidence: number) => {
    // Enhanced parsing logic
    const lowercaseText = text.toLowerCase();
    
    // Extract amount
    const amountPatterns = [
      /(\d+)\s*dollars?/,
      /(\d+)\s*bucks?/,
      /(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|one hundred|two hundred)/,
      /(\d+)/
    ];
    
    let amount = 0;
    for (const pattern of amountPatterns) {
      const match = lowercaseText.match(pattern);
      if (match) {
        if (match[1].match(/\d+/)) {
          amount = parseInt(match[1]);
        } else {
          // Convert word to number
          const wordToNumber: { [key: string]: number } = {
            'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
            'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
            'one hundred': 100, 'two hundred': 200
          };
          amount = wordToNumber[match[1]] || 0;
        }
        break;
      }
    }
    
    // Extract game
    const gamePattern = /(roulette|blackjack|poker|slots|slot)/i;
    const gameMatch = lowercaseText.match(gamePattern);
    const game = gameMatch ? gameMatch[1].toLowerCase().replace('slot', 'slots') : '';
    
    // Extract bet type
    const betPatterns = [
      /(red|black|odd|even)/i,
      /(hit|stand|double)/i,
      /(fold|call|raise)/i,
      /(spin|play)/i
    ];
    
    let bet = 'play';
    for (const pattern of betPatterns) {
      const match = lowercaseText.match(pattern);
      if (match) {
        bet = match[1].toLowerCase();
        break;
      }
    }
    
    if (amount > 0 && game) {
      setParsedCommand({
        amount,
        game,
        bet,
        confidence
      });
    } else {
      toast({
        title: "Couldn't understand command",
        description: "Try saying something like 'Bet 50 dollars on red in roulette'",
        variant: "destructive",
      });
    }
  };

  const handleConfirmBet = () => {
    if (parsedCommand && parsedCommand.amount <= balance) {
      // Deduct bet amount
      updateBalance(-parsedCommand.amount);
      
      // Add bet transaction
      addTransaction({
        type: 'bet',
        amount: -parsedCommand.amount,
        game: parsedCommand.game,
        status: 'completed',
      });
      
      // Simulate game outcome (60% chance to win for demo)
      const won = Math.random() > 0.4;
      
      setTimeout(() => {
        if (won) {
          const winAmount = Math.floor(parsedCommand.amount * (1.5 + Math.random()));
          updateBalance(winAmount);
          addTransaction({
            type: 'win',
            amount: winAmount,
            game: parsedCommand.game,
            status: 'completed',
          });
          
          toast({
            title: "🎉 You Won!",
            description: `Congratulations! You won $${winAmount} on ${parsedCommand.game}!`,
          });
        } else {
          toast({
            title: "😔 Better luck next time!",
            description: `You lost $${parsedCommand.amount} on ${parsedCommand.game}. Try again!`,
            variant: "destructive",
          });
        }
        
        updateGameStats({
          gamesPlayed: 1,
          totalWins: won ? 1 : 0,
          totalLosses: won ? 0 : 1,
          betsToday: 1,
        });
        
        clearCommand();
      }, 1500);
      
      toast({
        title: "🎲 Bet Placed!",
        description: `$${parsedCommand.amount} bet on ${parsedCommand.bet} in ${parsedCommand.game}. Good luck!`,
      });
    } else if (parsedCommand && parsedCommand.amount > balance) {
      toast({
        title: "Insufficient Funds",
        description: "Please top up your wallet to place this bet.",
        variant: "destructive",
      });
    }
  };

  const clearCommand = () => {
    setTranscript("");
    setParsedCommand(null);
  };

  return (
    <div className="min-h-screen bg-gradient-background pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">🎙️ Voice Betting</h1>
          <p className="text-muted-foreground">
            Speak your bets naturally - AI-powered gambling at your command
          </p>
        </div>

        {/* Voice Interface */}
        <div className="bg-gradient-card border border-border/50 rounded-lg p-8 text-center space-y-6 mb-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">🗣️ Speak Your Bet</h2>
            <p className="text-muted-foreground">
              Try: "Bet 50 dollars on red in roulette" or "Place 100 on blackjack"
            </p>
          </div>

          {/* Microphone Button */}
          <div className="flex justify-center">
            <Button
              variant={isListening ? "destructive" : "casino"}
              size="lg"
              onClick={isListening ? () => setIsListening(false) : handleStartListening}
              className={cn(
                "w-32 h-32 rounded-full text-lg font-bold",
                isListening && "animate-pulse-glow"
              )}
            >
              {isListening ? (
                <div className="flex flex-col items-center">
                  <MicOff className="h-8 w-8 mb-2" />
                  <span className="text-sm">Stop</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Mic className="h-8 w-8 mb-2" />
                  <span className="text-sm">Speak</span>
                </div>
              )}
            </Button>
          </div>

          {isListening && (
            <div className="space-y-3">
              <div className="flex justify-center items-center gap-2">
                <Volume2 className="h-5 w-5 text-primary animate-pulse" />
                <span className="text-primary font-medium">Listening...</span>
              </div>
              <div className="flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-8 bg-primary rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="bg-gradient-card border border-border/50 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-accent" />
              <h3 className="font-semibold text-foreground">Voice Transcript</h3>
            </div>
            <div className="bg-muted/20 rounded-lg p-4 border-l-4 border-accent">
              <p className="text-foreground italic text-lg">"{transcript}"</p>
            </div>
          </div>
        )}

        {/* Parsed Command */}
        {parsedCommand && (
          <div className="bg-gradient-card border border-primary/50 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Bet Preview</h3>
              <div className="ml-auto bg-primary/20 rounded-full px-3 py-1">
                <span className="text-xs font-medium text-primary">
                  {Math.round(parsedCommand.confidence * 100)}% confidence
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-muted/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Amount</p>
                <p className="text-2xl font-bold text-primary">${parsedCommand.amount}</p>
              </div>
              <div className="text-center p-4 bg-muted/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Game</p>
                <p className="text-2xl font-bold text-foreground capitalize">{parsedCommand.game}</p>
              </div>
              <div className="text-center p-4 bg-muted/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Bet Type</p>
                <p className="text-2xl font-bold text-accent capitalize">{parsedCommand.bet}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={clearCommand} className="flex-1">
                Clear & Try Again
              </Button>
              <Button 
                variant="casino" 
                onClick={handleConfirmBet} 
                className="flex-1"
                disabled={parsedCommand.amount > balance}
              >
                {parsedCommand.amount > balance ? "Insufficient Funds" : "Confirm & Place Bet"}
              </Button>
            </div>
          </div>
        )}

        {/* Voice Commands Help */}
        <div className="bg-gradient-card border border-border/50 rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">🎯 Voice Command Examples</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Bet 50 dollars on red in roulette",
              "Place 100 on blackjack",
              "Wager 25 on poker", 
              "Put 75 on slots",
              "Bet thirty on black in roulette",
              "Place two hundred on poker"
            ].map((example, index) => (
              <div key={index} className="bg-muted/10 rounded-lg p-3 border border-border/30">
                <p className="text-muted-foreground text-sm">💬 "{example}"</p>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm text-accent font-medium">
              💡 <strong>Pro Tip:</strong> Speak clearly and mention the amount, game, and bet type for best results!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceBettingPage;