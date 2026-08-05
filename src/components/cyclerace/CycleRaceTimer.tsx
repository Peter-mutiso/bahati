import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface CycleRaceTimerProps {
  phase: number;
  timeLeft: number;
}

const phases = [
  { id: 1, label: "Lobby", color: "#6366f1" },
  { id: 2, label: "Warmup", color: "#8b5cf6" },
  { id: 3, label: "Betting", color: "#06b6d4" },
  { id: 4, label: "Locking", color: "#f59e0b" },
  { id: 5, label: "Sync", color: "#10b981" },
  { id: 6, label: "Start", color: "#84cc16" },
  { id: 7, label: "Racing", color: "#ef4444" },
  { id: 8, label: "Finish", color: "#eab308" }
];

const CycleRaceTimer = ({ phase }: CycleRaceTimerProps) => {
  return null;
};

export default CycleRaceTimer;
