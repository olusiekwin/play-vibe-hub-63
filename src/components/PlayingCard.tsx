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
      "w-24 h-36 bg-gradient-to-br from-casino-white via-casino-white to-gray-50 rounded-xl flex flex-col shadow-deep",
      "relative overflow-hidden transition-all duration-300 hover:scale-110 hover:shadow-money border-2 border-casino-gold/30",
      "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/60 before:to-transparent before:pointer-events-none",
      "after:absolute after:inset-0 after:rounded-xl after:border-2 after:border-casino-gold/20 after:pointer-events-none",
      className
    )}>
      {/* Premium Card Background Pattern */}
      <div className="absolute inset-2 opacity-5 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)`,
        backgroundSize: '8px 8px'
      }} />
      
      {/* Top-left corner */}
      <div className="absolute top-2 left-2 text-sm font-bold z-10 drop-shadow-sm">
        <div className={cn("leading-none text-lg font-extrabold", isRed ? "text-red-600" : "text-gray-900")}>
          {rank}
        </div>
        <div className={cn("text-xl leading-none font-bold", isRed ? "text-red-600" : "text-gray-900")}>
          {suit}
        </div>
      </div>
      
      {/* Center symbol with premium styling */}
      <div className="flex-1 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-br from-casino-gold/5 to-transparent rounded-full" />
        <span className={cn(
          "text-5xl font-bold drop-shadow-lg relative z-10",
          isRed ? "text-red-500" : "text-gray-900"
        )}>
          {suit}
        </span>
      </div>
      
      {/* Bottom-right corner (upside down) */}
      <div className="absolute bottom-2 right-2 text-sm font-bold transform rotate-180 z-10 drop-shadow-sm">
        <div className={cn("leading-none text-lg font-extrabold", isRed ? "text-red-500" : "text-gray-900")}>
          {rank}
        </div>
        <div className={cn("text-xl leading-none font-bold", isRed ? "text-red-500" : "text-gray-900")}>
          {suit}
        </div>
      </div>
      
      {/* Premium gloss effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-casino-gold/10 rounded-xl pointer-events-none" />
      
      {/* Casino authenticity watermark */}
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-400/30 font-mono">
        CASINO
      </div>
    </div>
  );
};