import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface RouletteWheelProps {
  isSpinning: boolean;
  winningNumber: number | null;
  onSpinComplete?: () => void;
}

export const RouletteWheel = ({ isSpinning, winningNumber, onSpinComplete }: RouletteWheelProps) => {
  const [rotation, setRotation] = useState(0);
  const [ballPosition, setBallPosition] = useState(0);
  
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  
  // Roulette wheel numbers in order (European layout)
  const wheelNumbers = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  useEffect(() => {
    if (isSpinning) {
      // Random rotation for spinning effect
      const randomRotation = rotation + 1440 + Math.random() * 720; // At least 4 full rotations
      setRotation(randomRotation);
      setBallPosition(randomRotation + Math.random() * 360);
    }
  }, [isSpinning]);

  const getNumberColor = (number: number) => {
    if (number === 0) return "text-green-500";
    return redNumbers.includes(number) ? "text-red-500" : "text-black";
  };

  const getNumberBgColor = (number: number) => {
    if (number === 0) return "bg-green-500";
    return redNumbers.includes(number) ? "bg-red-500" : "bg-black";
  };

  return (
    <div className="relative w-64 h-64 mx-auto">
      {/* Outer rim */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 shadow-2xl">
        {/* Inner wheel */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 border-4 border-amber-700">
          {/* Number pockets */}
          <div 
            className={cn(
              "absolute inset-0 rounded-full transition-transform duration-[3000ms] ease-out",
              isSpinning && "animate-spin"
            )}
            style={{ 
              transform: `rotate(${rotation}deg)`,
              animationDuration: isSpinning ? '3s' : '0s'
            }}
          >
            {wheelNumbers.map((number, index) => {
              const angle = (index * 360) / wheelNumbers.length;
              const isWinning = winningNumber === number && !isSpinning;
              
              return (
                <div
                  key={index}
                  className="absolute w-6 h-6 flex items-center justify-center text-xs font-bold"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-85px) rotate(-${angle}deg)`,
                  }}
                >
                  <div className={cn(
                    "w-6 h-6 flex items-center justify-center rounded text-white text-xs font-bold",
                    getNumberBgColor(number),
                    isWinning && "ring-4 ring-yellow-400 ring-opacity-75 animate-pulse"
                  )}>
                    {number}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Center hub */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 border-4 border-gray-600 shadow-inner">
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-200 to-gray-400" />
          </div>
          
          {/* Ball */}
          <div 
            className={cn(
              "absolute w-3 h-3 bg-white rounded-full shadow-lg border border-gray-300 transition-all duration-[3000ms] ease-out",
              isSpinning && "animate-bounce"
            )}
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${ballPosition}deg) translateY(-90px)`,
            }}
          />
        </div>
      </div>
      
      {/* Pointer */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[16px] border-l-transparent border-r-transparent border-b-amber-800 z-10" />
      
      {/* Winning number display */}
      {winningNumber !== null && !isSpinning && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-gradient-card border border-border/50 rounded-lg px-4 py-2">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Winning Number</p>
            <p className={cn("text-2xl font-bold", getNumberColor(winningNumber))}>
              {winningNumber}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};