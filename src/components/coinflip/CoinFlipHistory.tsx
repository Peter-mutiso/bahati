import { motion } from "framer-motion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface HistoryItem {
  roundNumber: number;
  result: "heads" | "tails";
  timestamp: string;
}

interface CoinFlipHistoryProps {
  history: HistoryItem[];
}

const CoinFlipHistory = ({ history }: CoinFlipHistoryProps) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5 lg:mb-2 px-1">
        <span className="text-xs lg:text-sm font-medium text-muted-foreground">Recent Results</span>
        <div className="flex gap-3 lg:gap-4">
          <div className="flex items-center gap-1 lg:gap-1.5">
            <div className="w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-yellow-500" />
            <span className="text-[10px] lg:text-xs text-muted-foreground">
              H: {history.filter(h => h.result === "heads").length}
            </span>
          </div>
          <div className="flex items-center gap-1 lg:gap-1.5">
            <div className="w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-gray-400" />
            <span className="text-[10px] lg:text-xs text-muted-foreground">
              T: {history.filter(h => h.result === "tails").length}
            </span>
          </div>
        </div>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-1.5 lg:gap-2 pb-1">
          {history.map((item, index) => (
            <motion.div
              key={item.roundNumber}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 lg:w-14 lg:h-14 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 ${
                item.result === "heads"
                  ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30"
                  : "bg-gradient-to-br from-gray-400/20 to-gray-600/20 border border-gray-400/30"
              }`}
            >
              <span className={`text-sm lg:text-lg font-bold ${
                item.result === "heads" ? "text-yellow-500" : "text-gray-400"
              }`}>
                {item.result === "heads" ? "H" : "T"}
              </span>
              <span className="text-[8px] lg:text-[10px] text-muted-foreground">
                #{item.roundNumber}
              </span>
            </motion.div>
          ))}
          
          {history.length === 0 && (
            <div className="w-full py-2 text-center text-xs lg:text-sm text-muted-foreground">
              No recent results
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default CoinFlipHistory;
