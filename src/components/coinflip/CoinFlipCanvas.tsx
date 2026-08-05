import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useGameSounds } from "@/hooks/useGameSounds";

interface CoinFlipCanvasProps {
  gameState: {
    status: "waiting" | "betting" | "flipping" | "result";
    result: "heads" | "tails" | null;
    timeLeft: number;
    roundNumber: number;
  };
  selectedSide: "heads" | "tails" | null;
}

const CoinFlipCanvas = ({ gameState, selectedSide }: CoinFlipCanvasProps) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [displayResult, setDisplayResult] = useState<"heads" | "tails" | null>(null);
  const [flipRotation, setFlipRotation] = useState(0);
  const animationRef = useRef<number>();
  const spinSoundIntervalRef = useRef<NodeJS.Timeout>();
  const { playCoinFlipSpin, playCoinFlipResult } = useGameSounds();

  useEffect(() => {
    if (gameState.status === "flipping") {
      setIsFlipping(true);
      setDisplayResult(null);
      
      // Start spinning sound effect
      playCoinFlipSpin();
      spinSoundIntervalRef.current = setInterval(() => {
        playCoinFlipSpin();
      }, 200);
      
      // Animate coin flip
      let rotation = 0;
      const flipDuration = 3000;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / flipDuration, 1);
        
        // Easing function for deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);
        rotation = easeOut * 1800; // 5 full rotations
        
        setFlipRotation(rotation);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsFlipping(false);
          setDisplayResult(gameState.result);
          // Stop spinning sound
          if (spinSoundIntervalRef.current) {
            clearInterval(spinSoundIntervalRef.current);
          }
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        if (spinSoundIntervalRef.current) {
          clearInterval(spinSoundIntervalRef.current);
        }
      };
    }
  }, [gameState.status]);

  useEffect(() => {
    if (gameState.status === "result" && gameState.result) {
      setDisplayResult(gameState.result);
      
      const isWin = selectedSide && selectedSide === gameState.result;
      
      // Play result sound
      if (selectedSide) {
        playCoinFlipResult(!!isWin);
      }
      
      // Trigger celebration
      const colors = gameState.result === "heads" 
        ? ["#FFD700", "#FFA500", "#FFFF00"] 
        : ["#C0C0C0", "#808080", "#A9A9A9"];
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: colors,
      });
    }
  }, [gameState.status, gameState.result, selectedSide]);

  const isWinner = selectedSide && displayResult && selectedSide === displayResult;

  return (
    <div className="relative w-full aspect-[4/3] max-w-sm lg:max-w-xl mx-auto">
      {/* Glow background */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-transparent to-accent/20 blur-3xl" />
      
      {/* Main coin container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Coin */}
        <motion.div
          className="relative w-36 h-36 sm:w-44 sm:h-44 lg:w-64 lg:h-64"
          style={{
            perspective: "1000px",
            transformStyle: "preserve-3d",
          }}
        >
          <motion.div
            className="w-full h-full relative"
            style={{
              transformStyle: "preserve-3d",
              rotateX: flipRotation,
            }}
            animate={{
              rotateX: isFlipping ? flipRotation : (displayResult === "tails" ? 180 : 0),
            }}
            transition={{
              duration: isFlipping ? 0 : 0.5,
              ease: "easeOut",
            }}
          >
            {/* Heads side */}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                backfaceVisibility: "hidden",
                background: "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)",
                boxShadow: "0 10px 40px rgba(255, 215, 0, 0.4), inset 0 2px 10px rgba(255, 255, 255, 0.5)",
              }}
            >
              <div className="text-center">
                <div className="text-5xl sm:text-6xl lg:text-8xl font-bold text-yellow-900/80">H</div>
                <div className="text-xs sm:text-sm lg:text-base font-semibold text-yellow-900/60 uppercase tracking-wider">Heads</div>
              </div>
              <div className="absolute inset-2 lg:inset-3 rounded-full border-4 border-yellow-600/30" />
              <div className="absolute inset-4 lg:inset-6 rounded-full border-2 border-yellow-500/20" />
            </div>

            {/* Tails side */}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateX(180deg)",
                background: "linear-gradient(135deg, #C0C0C0 0%, #808080 50%, #C0C0C0 100%)",
                boxShadow: "0 10px 40px rgba(192, 192, 192, 0.4), inset 0 2px 10px rgba(255, 255, 255, 0.5)",
              }}
            >
              <div className="text-center">
                <div className="text-5xl sm:text-6xl lg:text-8xl font-bold text-gray-700/80">T</div>
                <div className="text-xs sm:text-sm lg:text-base font-semibold text-gray-700/60 uppercase tracking-wider">Tails</div>
              </div>
              <div className="absolute inset-2 lg:inset-3 rounded-full border-4 border-gray-500/30" />
              <div className="absolute inset-4 lg:inset-6 rounded-full border-2 border-gray-400/20" />
            </div>
          </motion.div>
        </motion.div>

        {/* Status overlay */}
        <AnimatePresence>
          {gameState.status === "waiting" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-full"
            >
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Waiting...</div>
                <div className="text-sm lg:text-base text-muted-foreground">Next round starting soon</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result display */}
        <AnimatePresence>
          {gameState.status === "result" && displayResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute -bottom-16 lg:-bottom-20 left-1/2 -translate-x-1/2 text-center"
            >
              <div className={`text-3xl sm:text-4xl lg:text-5xl font-bold uppercase ${
                displayResult === "heads" ? "text-yellow-500" : "text-gray-400"
              }`}>
                {displayResult}!
              </div>
              {selectedSide && (
                <div className={`text-lg lg:text-xl font-semibold mt-2 ${
                  isWinner ? "text-green-500" : "text-red-500"
                }`}>
                  {isWinner ? "🎉 You Won!" : "Better luck next time!"}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary/50 blur-sm" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-accent/50 blur-sm" />
    </div>
  );
};

export default CoinFlipCanvas;
