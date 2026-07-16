import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Board from "@/components/Board";
import {
  Board as BoardType,
  checkWinner,
  getWinLine,
  recordMove,
} from "@/lib/qlearning";

type Player = 1 | 2;
type Result = "p1" | "p2" | "draw" | null;

const PLAYER_LABELS: Record<Player, { name: string; symbol: string; color: string; bg: string }> = {
  1: { name: "Jugador 1", symbol: "X", color: "text-sky-400", bg: "bg-sky-500/15 border-sky-500/40" },
  2: { name: "Jugador 2", symbol: "O", color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/40" },
};

export default function TwoPlayers() {
  const [board, setBoard] = useState<BoardType>(Array(9).fill(0) as BoardType);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [result, setResult] = useState<Result>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [lastMove, setLastMove] = useState<number | undefined>(undefined);
  const [score, setScore] = useState({ p1: 0, p2: 0, draw: 0 });
  const [history, setHistory] = useState<Result[]>([]);
  const [p1Name, setP1Name] = useState("Jugador 1");
  const [p2Name, setP2Name] = useState("Jugador 2");
  const [editingNames, setEditingNames] = useState(false);

  const resetGame = useCallback(() => {
    setBoard(Array(9).fill(0) as BoardType);
    setCurrentPlayer(1);
    setResult(null);
    setWinLine(null);
    setLastMove(undefined);
  }, []);

  const handleCellClick = (idx: number) => {
    if (result !== null || board[idx] !== 0) return;
    recordMove(idx);
    const newBoard = board.slice() as BoardType;
    newBoard[idx] = currentPlayer;
    setBoard(newBoard);
    setLastMove(idx);

    const winner = checkWinner(newBoard);
    if (winner !== null) {
      setWinLine(getWinLine(newBoard));
      const r: Result =
        winner === "draw" ? "draw" : winner === 1 ? "p1" : "p2";
      setResult(r);
      setHistory(h => [r, ...h].slice(0, 30));
      setScore(s => ({
        p1: s.p1 + (r === "p1" ? 1 : 0),
        p2: s.p2 + (r === "p2" ? 1 : 0),
        draw: s.draw + (r === "draw" ? 1 : 0),
      }));
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  const p = PLAYER_LABELS[currentPlayer];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-8 px-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-5 text-center">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-purple-500 bg-clip-text text-transparent">
          2 Jugadores
        </h1>
        <p className="text-slate-400 text-sm mt-1">Modo local — turno a turno</p>
      </motion.div>

      {!editingNames ? (
        <button
          onClick={() => setEditingNames(true)}
          className="text-xs text-slate-500 hover:text-slate-300 border border-slate-700 rounded-lg px-3 py-1 mb-4 transition-all hover:border-slate-500"
        >
          ✏ Cambiar nombres
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 mb-4 items-center"
        >
          <input
            value={p1Name}
            onChange={e => setP1Name(e.target.value)}
            maxLength={12}
            className="bg-slate-800 border border-sky-500/40 rounded-lg px-3 py-1 text-sm text-sky-400 w-28 text-center focus:outline-none"
            placeholder="Jugador 1"
          />
          <span className="text-slate-500 text-xs">vs</span>
          <input
            value={p2Name}
            onChange={e => setP2Name(e.target.value)}
            maxLength={12}
            className="bg-slate-800 border border-purple-500/40 rounded-lg px-3 py-1 text-sm text-purple-400 w-28 text-center focus:outline-none"
            placeholder="Jugador 2"
          />
          <button
            onClick={() => setEditingNames(false)}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 rounded-lg px-2 py-1 transition-all"
          >✓</button>
        </motion.div>
      )}

      <div className="flex gap-5 mb-5">
        {([1, 2] as Player[]).map(pl => {
          const info = PLAYER_LABELS[pl];
          const name = pl === 1 ? p1Name : p2Name;
          const count = pl === 1 ? score.p1 : score.p2;
          return (
            <div key={pl} className="text-center">
              <p className={`text-3xl font-bold ${info.color}`}>{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{name} ({info.symbol})</p>
            </div>
          );
        })}
        <div className="text-center">
          <p className="text-3xl font-bold text-yellow-400">{score.draw}</p>
          <p className="text-xs text-slate-500 mt-0.5">Empates</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!result && (
          <motion.div
            key="turn"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border mb-4 text-sm font-medium ${p.bg} ${p.color}`}
          >
            <span>Turno de {currentPlayer === 1 ? p1Name : p2Name}</span>
            <span className="font-bold text-base">({p.symbol})</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-xs mb-4">
        <Board
          board={board}
          winLine={winLine}
          onCellClick={handleCellClick}
          disabled={result !== null}
          lastMove={lastMove}
        />
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center mb-3"
          >
            {result === "draw" ? (
              <p className="text-3xl font-bold text-yellow-400">Empate</p>
            ) : (
              <>
                <p className={`text-3xl font-bold ${result === "p1" ? "text-sky-400" : "text-purple-400"}`}>
                  🏆 {result === "p1" ? p1Name : p2Name} gana
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  ({result === "p1" ? "X" : "O"})
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={resetGame}
        className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-purple-600 text-white font-semibold text-sm shadow-lg mb-6"
      >
        Nueva partida
      </motion.button>

      {history.length > 0 && (
        <div className="w-full max-w-xs">
          <p className="text-xs uppercase tracking-wider text-slate-600 font-semibold mb-2">Historial</p>
          <div className="flex flex-wrap gap-1.5">
            {history.map((r, i) => (
              <span
                key={i}
                className={[
                  "text-xs px-2 py-0.5 rounded-full border font-medium",
                  r === "p1"
                    ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                    : r === "p2"
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                    : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
                ].join(" ")}
              >
                {r === "p1" ? p1Name : r === "p2" ? p2Name : "Emp"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
