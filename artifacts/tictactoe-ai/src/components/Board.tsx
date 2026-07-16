import { motion } from "framer-motion";
import type { Board as BoardType } from "@/lib/qlearning";

interface BoardProps {
  board: BoardType;
  winLine: number[] | null;
  onCellClick: (idx: number) => void;
  disabled?: boolean;
  lastMove?: number;
  qValues?: number[];
}

function qColor(normalized: number): string {
  if (normalized >= 0.65) return "text-green-400";
  if (normalized >= 0.35) return "text-yellow-400";
  return "text-red-400";
}

function qBg(normalized: number): string {
  if (normalized >= 0.65) return "bg-green-500/10 border-green-500/40";
  if (normalized >= 0.35) return "bg-yellow-500/10 border-yellow-400/30";
  return "bg-red-500/10 border-red-500/30";
}

export default function Board({ board, winLine, onCellClick, disabled, lastMove, qValues }: BoardProps) {
  const finite = qValues?.filter(v => isFinite(v)) ?? [];
  const minQ = finite.length ? Math.min(...finite) : 0;
  const maxQ = finite.length ? Math.max(...finite) : 0;
  const range = maxQ - minQ || 1;

  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-xs mx-auto select-none">
      {board.map((cell, idx) => {
        const isWin = winLine?.includes(idx);
        const isEmpty = cell === 0;
        const isLast = lastMove === idx;
        const qVal = qValues?.[idx];
        const showQ = isEmpty && qVal !== undefined && isFinite(qVal);
        const normalized = showQ ? (qVal - minQ) / range : 0.5;

        return (
          <motion.button
            key={idx}
            onClick={() => !disabled && isEmpty && onCellClick(idx)}
            whileHover={!disabled && isEmpty && !showQ ? { scale: 1.05 } : {}}
            whileTap={!disabled && isEmpty ? { scale: 0.95 } : {}}
            className={[
              "aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-200 relative overflow-hidden",
              isWin
                ? "bg-gradient-to-br from-purple-500/30 to-sky-500/30 border-sky-400/80 shadow-lg shadow-sky-500/20"
                : showQ
                ? `${qBg(normalized)} cursor-pointer`
                : isEmpty
                ? "bg-slate-800/60 border-slate-700 hover:border-slate-500 cursor-pointer"
                : "bg-slate-800/80 border-slate-700 cursor-default",
            ].join(" ")}
          >
            {cell === 1 && (
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className={`text-5xl font-black ${isLast ? "text-sky-300" : "text-sky-400/80"}`}
              >
                X
              </motion.span>
            )}
            {cell === 2 && (
              <motion.span
                initial={{ scale: 0, rotate: 20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className={`text-5xl font-black ${isLast ? "text-purple-300" : "text-purple-400/80"}`}
              >
                O
              </motion.span>
            )}
            {showQ && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-0.5"
              >
                <span className={`text-xl font-black ${qColor(normalized)}`}>
                  {qVal > 0 ? "+" : ""}{qVal.toFixed(2)}
                </span>
                <div className="w-8 h-1 rounded-full bg-slate-700 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${normalized * 100}%` }}
                    transition={{ duration: 0.3 }}
                    className={`h-full rounded-full ${normalized >= 0.65 ? "bg-green-400" : normalized >= 0.35 ? "bg-yellow-400" : "bg-red-400"}`}
                  />
                </div>
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
