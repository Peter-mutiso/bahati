import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Flame, TrendingUp } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import crashPoster from "@/assets/games/crash-poster.jpg";
import plinkoPoster from "@/assets/games/plinko-poster.jpg";
import minesPoster from "@/assets/games/mines-poster.jpg";
import coinTrainPoster from "@/assets/games/coin-train-poster.jpg";
import aviatorPoster from "@/assets/games/aviator-red-poster.jpg";

const topPickGames = [
  {
    name: "Crash",
    poster: crashPoster,
    badge: "hot" as const,
    available: true,
    route: "/game"
  },
  {
    name: "Jet Red",
    poster: aviatorPoster,
    badge: "hot" as const,
    available: true,
    route: "/aviator-red"
  },
  {
    name: "Plinko",
    poster: plinkoPoster,
    badge: "trending" as const,
    available: true,
    route: "/plinko"
  },
  {
    name: "Mine",
    poster: minesPoster,
    badge: "hot" as const,
    available: true,
    route: "/mines"
  },
  {
    name: "Coin Train",
    poster: coinTrainPoster,
    badge: "trending" as const,
    available: true,
    route: "/coin-train"
  }
];

export const TopPicks = () => {
  const { ref, isVisible } = useScrollAnimation();
  const navigate = useNavigate();

  const autoplayPlugin = Autoplay({
    delay: 3000, 
    stopOnInteraction: false,
    stopOnMouseEnter: true
  });

  return (
    <div 
      ref={ref}
      className={`max-w-7xl mx-auto px-4 py-4 md:py-6 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1 md:mb-2">
          Top Picks
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground">
          Most played games this week
        </p>
      </div>

      <div className="relative">
        {/* Left fade gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        
        {/* Right fade gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <Carousel
          opts={{
            align: "start",
            loop: true,
            dragFree: true,
          }}
          plugins={[autoplayPlugin]}
          className="w-full"
        >
        <CarouselContent className="-ml-2 md:-ml-3 lg:-ml-4">
          {topPickGames.map((game, index) => {
            const GameCard = () => {
              const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

              const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMousePosition({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              };

              return (
                <Card
                  onClick={() => { if (game.available) navigate(game.route); }}
                  className={`group relative overflow-hidden border-0 bg-card/50 backdrop-blur-sm transition-all duration-500 animate-float ${
                    game.available
                      ? "cursor-pointer hover:shadow-2xl hover:shadow-primary/20"
                      : "cursor-not-allowed opacity-60"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onMouseMove={handleMouseMove}
                >
                  {/* Cursor-following shine effect (available only) */}
                  {game.available && (
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(var(--primary-rgb, 0, 191, 255), 0.15), transparent 40%)`,
                      }}
                    />
                  )}

                  {/* Game Poster */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={game.poster}
                      alt={game.name}
                      className={`w-full h-full object-cover transition-all duration-500 ${
                        game.available ? "group-hover:scale-110 group-hover:brightness-110" : ""
                      }`}
                    />

                    {/* Coming Soon overlay */}
                    {!game.available && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-[10px] md:text-xs font-bold bg-black/60 px-2 py-1 rounded-full">
                          Coming Soon
                        </span>
                      </div>
                    )}

                    {/* Hover Overlay (available only) */}
                    {game.available && (
                      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}

                    {/* Badge - Top Right Corner Edge */}
                    <div className="absolute top-0 right-0">
                      {game.badge === "hot" ? (
                        <Badge className="rounded-none rounded-bl-lg bg-destructive text-destructive-foreground border-0 text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 shadow-lg font-bold">
                          <Flame className="w-3 h-3 md:w-3.5 md:h-3.5 mr-0.5" />
                          HOT
                        </Badge>
                      ) : (
                        <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground border-0 text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 shadow-lg font-bold">
                          <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5 mr-0.5" />
                          TOP
                        </Badge>
                      )}
                    </div>

                    {/* Game Name - Only on Hover (available games) */}
                    {game.available && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <h3 className="text-sm md:text-base font-bold text-foreground">
                          {game.name}
                        </h3>
                      </div>
                    )}
                  </div>

                  {/* Hover Glow Effect (available only) */}
                  {game.available && (
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300 pointer-events-none" />
                  )}

                  {/* Border glow on hover (available only) */}
                  {game.available && (
                    <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ boxShadow: "0 0 20px rgba(0, 191, 255, 0.3)" }}
                    />
                  )}
                </Card>
              );
            };

            return (
              <CarouselItem 
                key={index} 
                className="pl-2 md:pl-3 lg:pl-4 basis-1/3 md:basis-1/4 lg:basis-1/6 xl:basis-[14.285%] 2xl:basis-[12.5%]"
              >
                <GameCard />
              </CarouselItem>
            );
          })}
        </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
};
