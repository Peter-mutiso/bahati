import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import confetti from "canvas-confetti";
import { useGameSounds } from "@/hooks/useGameSounds";

interface Cyclist {
  number: number;
  name: string;
  color: string;
  flag: string;
}

interface CycleRaceCanvasProps {
  cyclists: Cyclist[];
  raceState: {
    status: string;
    winnerNumber?: number;
  };
  selectedCyclist: number | null;
  phase?: number;
  timeLeft?: number;
}

const CycleRaceCanvas = ({ cyclists, raceState, selectedCyclist, phase = 1, timeLeft = 0 }: CycleRaceCanvasProps) => {
  const [cyclistPositions, setCyclistPositions] = useState<number[]>([]);
  const animationRef = useRef<number>();
  const randomOffsetsRef = useRef<number[]>([]);
  const racingSoundRef = useRef<NodeJS.Timeout | null>(null);
  const prevStatusRef = useRef<string>("");
  const { playCycleRaceStart, playCycleRaceWhistle, playCycleRacing, playCycleWinnerCelebration } = useGameSounds();

  // Play sounds based on race state
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const currentStatus = raceState.status;

    // Race start - play whistle immediately
    if (currentStatus === "racing" && prevStatus !== "racing") {
      playCycleRaceWhistle();
      playCycleRaceStart();
      // Start racing sounds loop
      racingSoundRef.current = setInterval(() => {
        playCycleRacing();
      }, 200);
    }

    // Stop racing sounds and play celebration when finished
    if (currentStatus === "finished" && prevStatus !== "finished") {
      if (racingSoundRef.current) {
        clearInterval(racingSoundRef.current);
        racingSoundRef.current = null;
      }
      playCycleWinnerCelebration();
    }

    // Stop racing sounds if race is reset
    if (currentStatus === "betting" || currentStatus === "waiting") {
      if (racingSoundRef.current) {
        clearInterval(racingSoundRef.current);
        racingSoundRef.current = null;
      }
    }

    prevStatusRef.current = currentStatus;

    return () => {
      if (racingSoundRef.current) {
        clearInterval(racingSoundRef.current);
      }
    };
  }, [raceState.status, playCycleRaceStart, playCycleRaceWhistle, playCycleRacing, playCycleWinnerCelebration]);

  // Trigger confetti celebration when race finishes
  useEffect(() => {
    if (raceState.status === "finished" && raceState.winnerNumber) {
      // Fire confetti from both sides
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF6347', '#00FF00', '#00CED1']
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF6347', '#00FF00', '#00CED1']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      // Initial burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#00FF00', '#00CED1', '#9400D3']
      });

      frame();
    }
  }, [raceState.status, raceState.winnerNumber]);

  useEffect(() => {
    const numCyclists = cyclists.length || 10;
    
    if (raceState.status === "racing" || raceState.status === "midrace") {
      // Pre-calculate random offsets once at race start
      if (randomOffsetsRef.current.length !== numCyclists) {
        randomOffsetsRef.current = Array(numCyclists).fill(0).map(() => 75 + Math.random() * 20);
      }
      
      const startTime = Date.now();
      const duration = 8000; // 8 seconds race

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        setCyclistPositions(randomOffsetsRef.current.map((offset, index) => {
          if (raceState.winnerNumber && index + 1 === raceState.winnerNumber) {
            return progress * 100;
          }
          return progress * offset;
        }));

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    } else if (raceState.status === "finished") {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      // Reset positions and offsets for new race
      setCyclistPositions(Array(numCyclists).fill(0));
      randomOffsetsRef.current = [];
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [raceState.status, raceState.winnerNumber, cyclists.length]);

  const phases = [
    { id: 1, label: "Lobby", color: "#6366f1" },
    { id: 2, label: "Warmup", color: "#8b5cf6" },
    { id: 3, label: "Starting", color: "#06b6d4" },
    { id: 4, label: "Start", color: "#84cc16" },
    { id: 5, label: "Racing", color: "#ef4444" },
    { id: 6, label: "Finish", color: "#eab308" }
  ];

  const currentPhase = phases.find(p => p.id === phase) || phases[0];

  // Calculate race progress percentage
  const getRaceProgress = () => {
    if (raceState.status !== "racing" && raceState.status !== "midrace") return 0;
    const maxPos = Math.max(...cyclistPositions, 0);
    return Math.min(maxPos, 100);
  };

  const raceProgress = getRaceProgress();

  return (
    <div className="w-full space-y-2">
      {/* Race Progress Bar - Only show during racing - ABOVE canvas */}
      {(raceState.status === "racing" || raceState.status === "midrace") && (
        <div className="w-full p-2 sm:p-3 bg-card/80 backdrop-blur-sm rounded-xl border border-border/50">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm font-bold text-primary animate-pulse">🏁 RACING</span>
            <div className="flex-1 h-2 sm:h-3 bg-background/50 rounded-full overflow-hidden border border-border/30">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-primary/80 to-yellow-400 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${raceProgress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <span className="text-xs sm:text-sm font-bold text-foreground min-w-[40px] text-right">{Math.round(raceProgress)}%</span>
          </div>
        </div>
      )}

      <div className="relative w-full bg-gradient-to-b from-card to-card/50 rounded-3xl border border-border/50 overflow-hidden shadow-2xl">

      {/* Center Timer Overlay - Only show during phases 1-4 (up to and including Locking) */}
      {phase <= 4 && raceState.status !== "finished" && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background/80 backdrop-blur-md rounded-2xl px-6 py-4 border border-border/50 shadow-2xl text-center"
          >
            <p className="text-xs text-muted-foreground mb-1">{currentPhase.label}</p>
            <motion.span 
              key={timeLeft}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-4xl md:text-5xl font-bold"
              style={{ color: currentPhase.color }}
            >
              {timeLeft}
            </motion.span>
            <p className="text-xs text-muted-foreground mt-1">seconds</p>
          </motion.div>
        </div>
      )}

      {/* Track Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>

      {/* Lanes */}
      <div className="relative space-y-1.5 sm:space-y-2 p-2 sm:p-4 md:p-6">
        {cyclists.map((cyclist, index) => (
          <div
            key={cyclist.number}
            className={`relative h-10 sm:h-12 md:h-16 rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 ${
              selectedCyclist === cyclist.number
                ? "ring-1 sm:ring-2 ring-primary ring-offset-1 sm:ring-offset-2 ring-offset-background scale-105"
                : "opacity-80 hover:opacity-100"
            }`}
            style={{
              background: `linear-gradient(to right, ${cyclist.color}15, transparent)`
            }}
          >
            {/* Moving Road Texture per Lane */}
            {raceState.status === "racing" && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 40px, ${cyclist.color}20 40px, ${cyclist.color}20 50px)`,
                  backgroundSize: '90px 100%'
                }}
                animate={{ backgroundPositionX: [0, -90] }}
                transition={{ 
                  duration: 0.3 + index * 0.05, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              />
            )}

            {/* Lane Number & Info */}
            <div className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2 z-10">
              <div
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm"
                style={{ backgroundColor: cyclist.color }}
              >
                {cyclist.number}
              </div>
              <div className="min-w-0 max-w-[76px] sm:max-w-[130px] md:max-w-none">
                <p className="text-[10px] sm:text-xs font-semibold text-foreground truncate">{cyclist.name}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{cyclist.flag}</p>
              </div>
            </div>

            {/* Cyclist Position */}
            <AnimatePresence>
              {(raceState.status === "racing" || raceState.status === "midrace" || raceState.status === "finished") && (
                <motion.div
                  initial={{ left: "5%" }}
                  animate={{ left: `${cyclistPositions[index]}%` }}
                  transition={{ duration: 0.016, ease: "linear" }}
                  className="absolute top-1/2 -translate-y-1/2 z-20"
                >
                  <div className="relative">
                    {/* Speed Lines (behind cyclist) */}
                    {raceState.status === "racing" && (
                      <motion.div
                        className="absolute left-0 top-1/2 -translate-y-1/2 flex gap-1"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ 
                          opacity: [0, 0.6, 0], 
                          x: [-5, -15, -25]
                        }}
                        transition={{ 
                          duration: 0.4, 
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      >
                        <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: cyclist.color, opacity: 0.6 }} />
                        <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: cyclist.color, opacity: 0.4 }} />
                        <div className="w-2 h-0.5 rounded-full" style={{ backgroundColor: cyclist.color, opacity: 0.2 }} />
                      </motion.div>
                    )}
                    
                    {/* Cyclist Lottie Animation with Bobbing */}
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center relative">
                      {/* Colored Glow Background */}
                      <div 
                        className="absolute inset-0 rounded-full -z-10"
                        style={{
                          background: `radial-gradient(circle, ${cyclist.color}80, ${cyclist.color}40 50%, transparent 80%)`,
                          filter: 'blur(8px)',
                          transform: 'scale(1.2)'
                        }}
                      />
                      
                      {/* Lottie Animation */}
                      <div className="relative w-full h-full">
                        <DotLottieReact
                          src="https://lottie.host/2469cf0b-96f6-4781-82ea-54935423d864/HLwQXyYKw6.lottie"
                          autoplay
                          loop
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                    </div>
                    
                    {/* Winner Crown */}
                    {raceState.status === "finished" && raceState.winnerNumber === cyclist.number && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180, y: -20 }}
                        animate={{ scale: 1, rotate: 0, y: 0 }}
                        transition={{ type: "spring", bounce: 0.6, delay: 0.2 }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 text-3xl drop-shadow-lg"
                      >
                        👑
                      </motion.div>
                    )}

                    {/* Speed Glow Effect */}
                    {raceState.status === "racing" && (
                      <motion.div
                        className="absolute inset-0 rounded-full -z-10"
                        style={{
                          background: `radial-gradient(circle, ${cyclist.color}60, transparent 70%)`,
                          filter: "blur(12px)"
                        }}
                        animate={{
                          scale: [1, 1.4, 1],
                          opacity: [0.4, 0.7, 0.4]
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    )}

                    {/* Dust Particles */}
                    {raceState.status === "racing" && (
                      <>
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="absolute bottom-0 left-0 w-1 h-1 rounded-full bg-muted-foreground/40"
                            initial={{ 
                              x: 0, 
                              y: 0, 
                              opacity: 0.6,
                              scale: 1
                            }}
                            animate={{ 
                              x: [-10 - i * 5, -20 - i * 8],
                              y: [0, 5 + i * 2],
                              opacity: [0.6, 0],
                              scale: [1, 0.3]
                            }}
                            transition={{
                              duration: 0.5 + i * 0.1,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: "easeOut"
                            }}
                          />
                        ))}
                      </>
                    )}

                    {/* Leading indicator for winner */}
                    {raceState.status === "racing" && raceState.winnerNumber === cyclist.number && (
                      <motion.div
                        className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
                        style={{ 
                          backgroundColor: cyclist.color,
                          color: 'white'
                        }}
                        animate={{
                          y: [-2, 2, -2],
                          opacity: [0.8, 1, 0.8]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity
                        }}
                      >
                        Leading! 🔥
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Finish Line */}
            <div className="absolute right-4 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-400 opacity-30"></div>
          </div>
        ))}
      </div>

      {/* Finish Banner */}
      <AnimatePresence>
        {raceState.status === "finished" && raceState.winnerNumber && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-md z-30"
          >
            <div className="text-center space-y-4">
              {/* Confetti-like particles */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: `hsl(${i * 30}, 70%, 60%)`,
                    left: `${20 + i * 6}%`,
                    top: '20%'
                  }}
                  initial={{ y: 0, opacity: 0, scale: 0 }}
                  animate={{
                    y: [0, -100, 100],
                    x: [0, (i % 2 === 0 ? 50 : -50)],
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                    rotate: [0, 360]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
              
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                }}
                transition={{ duration: 1, repeat: 2 }}
                className="text-4xl sm:text-5xl md:text-7xl"
              >
                🏆
              </motion.div>
              <motion.h2 
                className="text-xl sm:text-2xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 bg-clip-text text-transparent px-2"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                Winner: Cyclist #{raceState.winnerNumber}
              </motion.h2>
              <motion.p 
                className="text-sm sm:text-base md:text-xl text-muted-foreground px-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {cyclists.find(c => c.number === raceState.winnerNumber)?.name} {cyclists.find(c => c.number === raceState.winnerNumber)?.flag}
              </motion.p>
              <motion.div
                className="flex justify-center gap-1 sm:gap-2 text-xl sm:text-2xl md:text-3xl"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", bounce: 0.5 }}
              >
                🎉 🎊 🥳
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default CycleRaceCanvas;
