import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Gem, Bomb, Sparkles } from "lucide-react";
import { useState } from "react";

interface MinesCanvasProps {
  revealedTiles: number[];
  minePositions: number[];
  gameStatus: 'idle' | 'active' | 'busted' | 'cashed_out';
  onTileClick: (index: number) => void;
  onTileHover?: () => void;
}

export const MinesCanvas = ({
  revealedTiles,
  minePositions,
  gameStatus,
  onTileClick,
  onTileHover
}: MinesCanvasProps) => {
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);

  const getTileContent = (index: number) => {
    const isRevealed = revealedTiles.includes(index);
    const isMine = minePositions.includes(index);
    
    if (!isRevealed) return null;

    if (isMine) {
      return (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 1 }}
              className="absolute inset-0 bg-destructive/30 rounded-full blur-xl"
            />
            <Bomb className="w-12 h-12 text-destructive drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] relative z-10" />
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ scale: 0, rotate: 180 }}
        animate={{ scale: 1, rotate: 0 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-emerald-400/30 rounded-full blur-xl"
          />
          <Gem className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)] relative z-10" />
          
          {/* Sparkle effects */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: [0, Math.random() * 40 - 20],
                y: [0, Math.random() * 40 - 20],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  const canInteract = gameStatus === 'active';

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Animated background effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_50%)]" />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"
        />
      </div>

      {/* 5x5 Grid */}
      <div className="relative z-10 p-4 md:p-6">
        <div className="grid grid-cols-5 gap-2 md:gap-2.5 max-w-md lg:max-w-lg mx-auto">
          {Array.from({ length: 25 }, (_, index) => {
            const isRevealed = revealedTiles.includes(index);
            const isMine = minePositions.includes(index) && (gameStatus === 'busted' || gameStatus === 'cashed_out');
            const isHovered = hoveredTile === index;

            return (
              <motion.button
                key={index}
                onClick={() => canInteract && onTileClick(index)}
                onMouseEnter={() => {
                  setHoveredTile(index);
                  onTileHover?.();
                }}
                onMouseLeave={() => setHoveredTile(null)}
                disabled={!canInteract || isRevealed}
                whileHover={canInteract && !isRevealed ? { scale: 1.05 } : {}}
                whileTap={canInteract && !isRevealed ? { scale: 0.95 } : {}}
                className={`
                  aspect-square rounded-xl relative overflow-hidden
                  transition-all duration-300 disabled:cursor-not-allowed
                  ${!isRevealed && canInteract ? 'cursor-pointer' : ''}
                `}
              >
                {/* Base tile background */}
                <div
                  className={`
                    absolute inset-0 transition-all duration-300
                    ${isRevealed
                      ? isMine
                        ? 'bg-gradient-to-br from-destructive/20 to-destructive/10 border-2 border-destructive/30'
                        : 'bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 border-2 border-emerald-500/30'
                      : 'bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-2 border-border/50'
                    }
                  `}
                />

                {/* Hover glow effect */}
                {isHovered && !isRevealed && canInteract && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/50"
                  />
                )}

                {/* Glassmorphism overlay */}
                {!isRevealed && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-[2px]" />
                )}

                {/* Grid pattern */}
                {!isRevealed && (
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
                      backgroundSize: '8px 8px',
                    }} />
                  </div>
                )}

                {/* Question mark for unrevealed tiles */}
                {!isRevealed && (
                  <motion.div
                    animate={isHovered ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span className="text-2xl md:text-3xl font-bold text-muted-foreground/50">?</span>
                  </motion.div>
                )}

                {/* Revealed content */}
                {getTileContent(index)}

                {/* Shine effect on hover */}
                {isHovered && !isRevealed && canInteract && (
                  <motion.div
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: '100%', opacity: [0, 0.5, 0] }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    style={{ transform: 'skewX(-20deg)' }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Game Over Overlays */}
      <AnimatePresence>
        {gameStatus === 'busted' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-destructive/20 backdrop-blur-md flex items-center justify-center z-20"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="text-center space-y-4"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="relative"
              >
                <div className="absolute inset-0 bg-destructive/30 rounded-full blur-2xl animate-pulse" />
                <Bomb className="w-24 h-24 mx-auto text-destructive drop-shadow-[0_0_30px_rgba(239,68,68,1)] relative z-10" />
              </motion.div>
              <div>
                <h3 className="text-3xl font-bold text-destructive mb-2">BOOM! 💥</h3>
                <p className="text-muted-foreground">You hit a mine!</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {gameStatus === 'cashed_out' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-emerald-500/20 backdrop-blur-md flex items-center justify-center z-20"
          >
            <motion.div
              initial={{ scale: 0, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: -50 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="text-center space-y-4"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="relative"
              >
                <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-2xl animate-pulse" />
                <Gem className="w-24 h-24 mx-auto text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,1)] relative z-10" />
              </motion.div>
              <div>
                <h3 className="text-3xl font-bold text-emerald-400 mb-2">Success! 💎</h3>
                <p className="text-muted-foreground">You cashed out safely!</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
