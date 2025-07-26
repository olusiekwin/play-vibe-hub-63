import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic, MicOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceSectionProps {
  onBack: () => void;
  onPlaceBet: (amount: number, game: string, bet: string) => void;
}

export const VoiceSection = ({ onBack, onPlaceBet }: VoiceSectionProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedCommand, setParsedCommand] = useState<{
    amount: number;
    game: string;
    bet: string;
  } | null>(null);

  const handleStartListening = () => {
    setIsListening(true);
    
    // Simulate voice recognition
    setTimeout(() => {
      const mockTranscripts = [
        "Bet 50 dollars on red in roulette",
        "Place 100 on blackjack",
        "Wager 25 on poker",
        "Put 75 on slots",
      ];
      
      const randomTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
      setTranscript(randomTranscript);
      parseVoiceCommand(randomTranscript);
      setIsListening(false);
    }, 3000);
  };

  const parseVoiceCommand = (text: string) => {
    // Simple parsing logic for demo
    const amountMatch = text.match(/(\d+)/);
    const gameMatch = text.match(/(roulette|blackjack|poker|slots)/i);
    const betMatch = text.match(/(red|black|hit|stand)/i) || ['', 'play'];
    
    if (amountMatch && gameMatch) {
      setParsedCommand({
        amount: parseInt(amountMatch[1]),
        game: gameMatch[1].toLowerCase(),
        bet: betMatch[1].toLowerCase(),
      });
    }
  };

  const handleConfirmBet = () => {
    if (parsedCommand) {
      onPlaceBet(parsedCommand.amount, parsedCommand.game, parsedCommand.bet);
      setTranscript("");
      setParsedCommand(null);
    }
  };

  const clearCommand = () => {
    setTranscript("");
    setParsedCommand(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Voice Betting</h1>
      </div>

      {/* Voice Interface */}
      <div className="bg-gradient-card border border-border/50 rounded-lg p-6 text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Speak Your Bet</h2>
          <p className="text-sm text-muted-foreground">
            Say something like "Bet 50 on red in roulette"
          </p>
        </div>

        {/* Microphone Button */}
        <div className="flex justify-center">
          <Button
            variant={isListening ? "destructive" : "casino"}
            size="lg"
            onClick={isListening ? () => setIsListening(false) : handleStartListening}
            className={cn(
              "w-24 h-24 rounded-full",
              isListening && "animate-pulse-glow"
            )}
          >
            {isListening ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
        </div>

        {isListening && (
          <div className="space-y-2">
            <div className="flex justify-center">
              <Volume2 className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">Listening...</p>
          </div>
        )}
      </div>

      {/* Transcript Display */}
      {transcript && (
        <div className="bg-gradient-card border border-border/50 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-foreground">What you said:</h3>
          <div className="bg-muted/20 rounded-lg p-3">
            <p className="text-foreground italic">"{transcript}"</p>
          </div>
        </div>
      )}

      {/* Parsed Command */}
      {parsedCommand && (
        <div className="bg-gradient-card border border-primary/50 rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            Bet Preview
          </h3>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-lg font-bold text-primary">${parsedCommand.amount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Game</p>
              <p className="text-lg font-bold text-foreground capitalize">{parsedCommand.game}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bet</p>
              <p className="text-lg font-bold text-accent capitalize">{parsedCommand.bet}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={clearCommand} className="flex-1">
              Clear
            </Button>
            <Button variant="casino" onClick={handleConfirmBet} className="flex-1">
              Confirm Bet
            </Button>
          </div>
        </div>
      )}

      {/* Voice Commands Help */}
      <div className="bg-gradient-card border border-border/50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-foreground">Voice Command Examples:</h3>
        
        <div className="space-y-2 text-sm">
          {[
            "Bet 50 on red in roulette",
            "Place 100 on blackjack",
            "Wager 25 on poker",
            "Put 75 on slots",
          ].map((example, index) => (
            <div key={index} className="bg-muted/10 rounded p-2">
              <p className="text-muted-foreground">"{example}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};