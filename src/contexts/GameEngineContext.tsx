import { createContext, useContext, ReactNode } from "react";
import { useGameEngine } from "@/hooks/useGameEngine";

interface GameEngineContextType {
  gameState: {
    status: "preparing" | "flying" | "crashed";
    multiplier: number;
    crashPoint: number;
    roundNumber: number;
    roundId?: string | null;
    timeLeft?: number;
    serverSeed?: string;
    serverSeedHash?: string;
    clientSeed?: string;
    nonce?: number;
  };
  placeBet: (userId: string, amount: number, autoCashout: number | null, roundId: string, onSuccess?: (betId: string) => void) => void;
  cashout: (betId: string, userId: string, onSuccess?: (profit: number, multiplier: number) => void, onError?: (error: string) => void) => void;
  isConnected: boolean;
  ping: number;
}

const GameEngineContext = createContext<GameEngineContextType | undefined>(undefined);

export const GameEngineProvider = ({ children }: { children: ReactNode }) => {
  const gameEngine = useGameEngine();

  return (
    <GameEngineContext.Provider value={gameEngine}>
      {children}
    </GameEngineContext.Provider>
  );
};

export const useGameEngineContext = () => {
  const context = useContext(GameEngineContext);
  if (context === undefined) {
    throw new Error("useGameEngineContext must be used within a GameEngineProvider");
  }
  return context;
};
