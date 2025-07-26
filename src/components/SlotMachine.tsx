import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface SlotMachineProps {
  reels: string[];
  isSpinning: boolean;
  onSpin: () => void;
  betAmount: number;
  gameResult?: string;
  winAmount?: number;
}

export const SlotMachine = ({ 
  reels, 
  isSpinning, 
  onSpin, 
  betAmount, 
  gameResult, 
  winAmount 
}: SlotMachineProps) => {
  const [displayReels, setDisplayReels] = useState(reels);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);

  const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎'];

  useEffect(() => {
    if (isSpinning) {
      // Start spinning each reel with slight delays
      setSpinningReels([true, true, true]);
      
      // Stop reels at different times for realistic effect
      setTimeout(() => setSpinningReels([false, true, true]), 1000);
      setTimeout(() => setSpinningReels([false, false, true]), 1500);
      setTimeout(() => {
        setSpinningReels([false, false, false]);
        setDisplayReels(reels);
      }, 2000);
    } else {
      setDisplayReels(reels);
    }
  }, [isSpinning, reels]);

  useEffect(() => {
    // Continuous reel animation while spinning
    if (isSpinning) {
      const interval = setInterval(() => {
        setDisplayReels([
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)]
        ]);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isSpinning]);

  return (
    <div className="relative">
      {/* Slot Machine Frame */}
      <div className="bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 p-8 rounded-2xl shadow-2xl border-4 border-amber-700">
        {/* Machine Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-amber-900 mb-2 drop-shadow-lg">
            🎰 GOLDEN SLOTS 🎰
          </h2>
          <div className="flex justify-center gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            ))}
          </div>
        </div>

        {/* Reels Container */}
        <div className="bg-black p-4 rounded-xl mb-6 shadow-inner">
          <div className="flex justify-center gap-3">
            {displayReels.map((symbol, index) => (
              <div key={index} className="relative">
                {/* Reel Window */}
                <div className="w-24 h-32 bg-white rounded-lg border-4 border-gray-300 overflow-hidden shadow-inner">
                  {/* Reel Strip */}
                  <div className={cn(
                    "h-full flex flex-col items-center justify-center transition-all duration-200",
                    spinningReels[index] && "animate-bounce"
                  )}>
                    <div className={cn(
                      "text-5xl transition-all duration-200",
                      spinningReels[index] && "blur-sm scale-110"
                    )}>
                      {symbol}
                    </div>
                  </div>
                </div>
                
                {/* Reel Labels */}
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-amber-900 font-bold text-sm">
                  REEL {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-4 rounded-xl">
          {/* Bet Display */}
          <div className="flex justify-between items-center mb-4">
            <div className="bg-black text-green-400 px-4 py-2 rounded font-mono text-sm">
              BET: KES {betAmount.toLocaleString()}
            </div>
            
            {winAmount !== undefined && winAmount > 0 && (
              <div className="bg-black text-yellow-400 px-4 py-2 rounded font-mono text-sm animate-pulse">
                WIN: KES {winAmount.toLocaleString()}
              </div>
            )}
          </div>

          {/* Spin Button */}
          <button
            onClick={onSpin}
            disabled={isSpinning}
            className={cn(
              "w-full py-4 rounded-xl font-bold text-xl transition-all duration-200",
              "bg-gradient-to-b from-red-500 to-red-700 text-white shadow-lg",
              "hover:from-red-400 hover:to-red-600 active:scale-95",
              "disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed",
              isSpinning && "animate-pulse"
            )}
          >
            {isSpinning ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                SPINNING...
              </div>
            ) : (
              <>🎲 SPIN 🎲</>
            )}
          </button>

          {/* Result Display */}
          {gameResult && !isSpinning && (
            <div className="mt-4 p-3 bg-black text-center rounded-lg">
              <p className="text-yellow-400 font-bold text-lg">{gameResult}</p>
              {winAmount && winAmount > 0 && (
                <p className="text-green-400 font-bold text-2xl mt-1">
                  +KES {winAmount.toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Side Decorations */}
      <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 w-8 h-32 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full shadow-lg" />
      <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 w-8 h-32 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full shadow-lg" />
    </div>
  );
};