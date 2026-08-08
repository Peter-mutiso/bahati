import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Zap, Clock, Trophy, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import crashPoster from "@/assets/games/crash-poster.jpg";
import plinkoPoster from "@/assets/games/plinko-poster.jpg";
import cycleRacePoster from "@/assets/games/cycle-race-poster.jpg";
import coinTrainPoster from "@/assets/games/coin-train-poster.jpg";
import coinFlipPoster from "@/assets/games/coin-flip-poster.jpg";
import aviatorPoster from "@/assets/games/aviator-red-poster.jpg";
import minesPoster from "@/assets/games/mines-poster.jpg";
import wingoPoster from "@/assets/games/wingo-poster.jpg";
import chickenRoadPoster from "@/assets/games/chicken-road-2-poster.png";

const allGames = [
  {
    id: "crash",
    name: "Crash",
    poster: crashPoster,
    available: true,
    route: "/game",
    players: 1247,
    rtp: 99,
    categories: ["trending", "high-win", "instant-win"]
  },
  {
    id: "aviator-red",
    name: "Jet Red",
    poster: aviatorPoster,
    available: true,
    route: "/aviator-red",
    players: 1156,
    rtp: 95,
    categories: ["trending", "high-win", "instant-win"]
  },
  {
    id: "plinko",
    name: "Plinko",
    poster: plinkoPoster,
    available: true,
    route: "/plinko",
    players: 856,
    rtp: 98,
    categories: ["trending", "classic", "skill-based"]
  },
  {
    id: "coin-train",
    name: "Coin Train",
    poster: coinTrainPoster,
    available: true,
    route: "/coin-train",
    players: 734,
    rtp: 96,
    categories: ["trending", "instant-win", "high-win"]
  },
  {
    id: "coin-flip",
    name: "Coin Flip",
    poster: coinFlipPoster,
    available: true,
    route: "/coin-flip",
    players: 892,
    rtp: 97,
    categories: ["classic", "instant-win"]
  },
  {
    id: "cycle-race",
    name: "Cycle Race",
    poster: cycleRacePoster,
    available: true,
    route: "/cycle-race",
    players: 512,
    rtp: 95,
    categories: ["skill-based", "high-win"]
  },
  {
    id: "mines",
    name: "Mine",
    poster: minesPoster,
    available: true,
    route: "/mines",
    players: 945,
    rtp: 97,
    categories: ["classic", "skill-based", "trending"]
  },
  {
    id: "wingo",
    name: "Wingo 30s",
    poster: wingoPoster,
    available: true,
    route: "/wingo",
    players: 768,
    rtp: 97,
    categories: ["instant-win", "classic", "trending"]
  },
  {
    id: "chicken-road",
    name: "Chicken Road",
    poster: chickenRoadPoster,
    available: true,
    route: "/chicken-road",
    players: 1089,
    rtp: 96,
    categories: ["trending", "instant-win", "skill-based"]
  },
];

const categories = [
  { id: "trending", name: "Trending", icon: TrendingUp, color: "text-primary" },
  { id: "instant-win", name: "Instant Win", icon: Zap, color: "text-yellow-500" },
  { id: "classic", name: "Classic", icon: Clock, color: "text-blue-500" },
  { id: "skill-based", name: "Skill Based", icon: Sparkles, color: "text-purple-500" },
  { id: "high-win", name: "High Win", icon: Trophy, color: "text-green-500" }
];

// Map master panel category IDs to component category IDs
const categoryIdMap: Record<string, string> = {
  "trending": "trending",
  "instant": "instant-win",
  "classic": "classic",
  "skill": "skill-based",
  "high-win": "high-win"
};

export const GameCategories = () => {
  const navigate = useNavigate();
  const { ref, isVisible } = useScrollAnimation();
  const [hiddenGames, setHiddenGames] = useState<string[]>([]);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("game_settings")
        .select("hidden_games, hidden_categories")
        .single();
      
      if (data) {
        setHiddenGames(data.hidden_games || []);
        setHiddenCategories((data.hidden_categories || []).map((c: string) => categoryIdMap[c] || c));
      }
    };
    fetchSettings();
  }, []);

  const handleGameClick = (game: typeof allGames[0]) => {
    if (game.available) {
      navigate(game.route);
    } else {
      return;
    }
  };

  const visibleGames = allGames.filter(game => !hiddenGames.includes(game.id));
  const visibleCategories = categories.filter(cat => !hiddenCategories.includes(cat.id));

  return (
    <div 
      ref={ref}
      className={`max-w-7xl mx-auto px-4 py-4 md:py-6 space-y-6 md:space-y-8 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {visibleCategories.map((category) => {
        const categoryGames = visibleGames.filter(game => 
          game.categories.includes(category.id)
        );

        if (categoryGames.length === 0) return null;

        const Icon = category.icon;

        return (
          <div key={category.id}>
            <div className="mb-3 md:mb-4 flex items-center gap-2">
              <Icon className={`w-5 h-5 md:w-6 md:h-6 ${category.color}`} />
              <h2 className="text-lg md:text-2xl font-bold text-foreground">
                {category.name}
              </h2>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 md:gap-3 lg:gap-4">
              {categoryGames.map((game, index) => {
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
                      onClick={() => handleGameClick(game)}
                      className={`group relative overflow-hidden border-0 bg-card/50 backdrop-blur-sm transition-all duration-500 animate-float ${
                        game.available
                          ? "cursor-pointer hover:shadow-2xl hover:shadow-primary/20"
                          : "cursor-not-allowed opacity-60"
                      }`}
                      style={{
                        animationDelay: `${index * 100}ms`,
                      }}
                      onMouseMove={handleMouseMove}
                    >
                      {/* Cursor-following shine effect */}
                      {game.available && (
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                          style={{
                            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0, 191, 255, 0.15), transparent 40%)`,
                          }}
                        />
                      )}

                      {/* Game Poster */}
                      <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
                        <img
                          src={game.poster}
                          alt={game.name}
                          className={`w-full h-full object-cover rounded-lg transition-all duration-500 ${
                            game.available ? "group-hover:scale-110 group-hover:brightness-110" : ""
                          }`}
                        />

                        {/* Coming Soon overlay for unavailable games */}
                        {!game.available && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                            <span className="text-white text-[10px] md:text-xs font-bold bg-black/60 px-2 py-1 rounded-full">
                              Coming Soon
                            </span>
                          </div>
                        )}

                        {/* Hover Overlay (available only) */}
                        {game.available && (
                          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        )}

                        {/* Live Players Badge - Top Right Corner Edge */}
                        <div className="absolute top-0 right-0">
                          <Badge className="rounded-none rounded-bl-lg bg-success text-success-foreground border-0 text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 shadow-lg font-bold">
                            <div className="w-1.5 h-1.5 rounded-full bg-white mr-1 animate-pulse" />
                            {game.players}
                          </Badge>
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

                      {/* Hover Glow Effect */}
                      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300 pointer-events-none" />
                      
                      {/* Border glow on hover */}
                      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" 
                        style={{
                          boxShadow: '0 0 20px rgba(0, 191, 255, 0.3)',
                        }}
                      />
                    </Card>
                  );
                };

                return <GameCard key={`${category.id}-${index}`} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
