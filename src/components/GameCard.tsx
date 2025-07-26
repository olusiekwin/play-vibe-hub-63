import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GameCardProps {
  title: string;
  image: string;
  onPlay: () => void;
  className?: string;
}

export const GameCard = ({ title, image, onPlay, className }: GameCardProps) => {
  return (
    <div className={cn(
      "bg-gradient-card border border-border/50 rounded-lg overflow-hidden hover:border-primary/50 transition-all duration-300 hover:scale-105 shadow-card hover:shadow-glow",
      className
    )}>
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
          <Button variant="casino" size="sm" onClick={onPlay} className="w-full">
            Play Now
          </Button>
        </div>
      </div>
    </div>
  );
};