import { cn } from "@/lib/utils";

interface PlayingCardProps {
  rank: string;
  suit: string;
  className?: string;
  isHidden?: boolean;
}

export const PlayingCard = ({ rank, suit, className, isHidden = false }: PlayingCardProps) => {
  const isRed = suit === '♥' || suit === '♦';
  
  if (isHidden) {
    return (
      <div className={cn(
        "w-20 h-28 bg-gradient-to-br from-blue-900 to-blue-700 border-2 border-blue-600 rounded-lg flex items-center justify-center shadow-lg",
        "relative overflow-hidden",
        className
      )}>
        {/* Card back pattern */}
        <div className="absolute inset-2 border border-blue-400 rounded-md opacity-50" />
        <div className="text-blue-300 text-xl font-bold opacity-70">🂠</div>
      </div>
    );
  }

  return (
    <div className={cn(
      "w-20 h-28 bg-white border-2 border-gray-300 rounded-lg flex flex-col shadow-xl",
      "relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl",
      "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/40 before:to-transparent before:pointer-events-none",
      className
    )}>
      {/* Top-left corner */}
      <div className="absolute top-1.5 left-1.5 text-xs font-bold z-10">
        <div className={cn("leading-none text-sm", isRed ? "text-red-600" : "text-gray-800")}>
          {rank}
        </div>
        <div className={cn("text-base leading-none", isRed ? "text-red-600" : "text-gray-800")}>
          {suit}
        </div>
      </div>
      
      {/* Center symbol */}
      <div className="flex-1 flex items-center justify-center">
        <span className={cn(
          "text-3xl font-bold",
          isRed ? "text-red-500" : "text-black"
        )}>
          {suit}
        </span>
      </div>
      
      {/* Bottom-right corner (upside down) */}
      <div className="absolute bottom-1 right-1 text-xs font-bold transform rotate-180">
        <div className={cn("leading-none", isRed ? "text-red-500" : "text-black")}>
          {rank}
        </div>
        <div className={cn("text-sm leading-none", isRed ? "text-red-500" : "text-black")}>
          {suit}
        </div>
      </div>
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-100/20 rounded-lg pointer-events-none" />
    </div>
  );
};