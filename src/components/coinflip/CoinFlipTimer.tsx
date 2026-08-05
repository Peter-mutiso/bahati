import { motion } from "framer-motion";
import { Clock, Users, Coins, Lock, Zap, Trophy } from "lucide-react";

interface CoinFlipTimerProps {
  phase: "waiting" | "betting" | "flipping" | "result";
  timeLeft: number;
}

const phases = [
  { id: "waiting", label: "Lobby", icon: Users, color: "text-blue-500" },
  { id: "betting", label: "Betting", icon: Coins, color: "text-green-500" },
  { id: "flipping", label: "Flipping", icon: Zap, color: "text-yellow-500" },
  { id: "result", label: "Result", icon: Trophy, color: "text-purple-500" },
];

const CoinFlipTimer = ({ phase, timeLeft }: CoinFlipTimerProps) => {
  const currentPhaseIndex = phases.findIndex((p) => p.id === phase);
  const currentPhase = phases[currentPhaseIndex] || phases[0];
  const Icon = currentPhase.icon;

  const circumference = 2 * Math.PI * 45;
  const maxTime = phase === "betting" ? 15 : phase === "flipping" ? 5 : 3;
  const progress = (timeLeft / maxTime) * circumference;

  return (
    <div className="flex flex-col items-start gap-2 lg:gap-3 bg-card/70 backdrop-blur-xl rounded-xl p-2 lg:p-3 border border-border/30">
      {/* Timer Row */}
      <div className="flex items-center gap-3 lg:gap-4">
        <div className="relative w-12 h-12 lg:w-16 lg:h-16">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-border/30" />
            <motion.circle
              cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={circumference - progress}
              className={currentPhase.color} initial={false}
              animate={{ strokeDashoffset: circumference - progress }}
              transition={{ duration: 0.5, ease: "linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base lg:text-xl font-bold text-foreground">{timeLeft}s</span>
          </div>
        </div>
        <div className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-semibold ${
          phase === "betting" ? "bg-green-500/20 text-green-500" 
            : phase === "flipping" ? "bg-yellow-500/20 text-yellow-500"
            : "bg-muted/20 text-muted-foreground"
        }`}>
          {phase === "waiting" && "Waiting..."}
          {phase === "betting" && "Place bets!"}
          {phase === "flipping" && "Flipping..."}
          {phase === "result" && "Complete!"}
        </div>
      </div>

      {/* Phase Progress */}
      <div className="flex items-center gap-1 lg:gap-1.5">
        {phases.map((p, index) => {
          const isActive = index === currentPhaseIndex;
          const isCompleted = index < currentPhaseIndex;
          return (
            <div key={p.id} className={`w-5 h-1 lg:w-8 lg:h-1.5 rounded-full transition-all ${
              isActive ? "bg-primary" : isCompleted ? "bg-primary/60" : "bg-border/40"
            }`} />
          );
        })}
      </div>
    </div>
  );
};

export default CoinFlipTimer;
