import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Board from "@/components/Board";
import {
  Board as BoardType,
  QLearningAgent,
  checkWinner,
  getWinLine,
  boardToState,
  loadAgent,
  saveAgent,
  loadStats,
  saveStats,
  recordMove,
  saveReplay,
  updateElo,
  type ReplayMove,
} from "@/lib/qlearning";
import { ACHIEVEMENT_DEFS, getUnlocked } from "@/lib/achievements";

type GameResult = "player" | "ai" | "draw" | null;
type Difficulty = "easy" | "medium" | "hard";

const DIFF_EPSILON: Record<Difficulty, number> = {
  easy: 0.7,
  medium: 0.35,
  hard: 0,
};

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: "Fácil",
  medium: "Medio",
  hard: "Difícil",
};

export default function Game() {
  const agentRef = useRef<QLearningAgent>(loadAgent());
  const gameMovesRef = useRef<ReplayMove[]>([]);
  const [board, setBoard] = useState<BoardType>(Array(9).fill(0) as BoardType);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [aiStartsNext, setAiStartsNext] = useState(false);
  const [aiStartedThisGame, setAiStartedThisGame] = useState(false);
  const [result, setResult] = useState<GameResult>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [lastMove, setLastMove] = useState<number | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [history, setHistory] = useState<GameResult[]>([]);
  const [thinking, setThinking] = useState(false);
  const [showQValues, setShowQValues] = useState(false);
  const [score, setScore] = useState({ player: 0, ai: 0, draw: 0 });
  const [newAchievement, setNewAchievement] = useState<string | null>(null);
  const prevUnlockedRef = useRef<Set<string>>(new Set());

  const resetGame = useCallback((forceAiFirst?: boolean) => {
    const aiFirst = forceAiFirst !== undefined ? forceAiFirst : aiStartsNext;
    setBoard(Array(9).fill(0) as BoardType);
    setIsPlayerTurn(!aiFirst);
    setAiStartedThisGame(aiFirst);
    setResult(null);
    setWinLine(null);
    setLastMove(undefined);
    setThinking(false);
    gameMovesRef.current = [];
  }, [aiStartsNext]);

  const checkAchievements = useCallback(() => {
    const stats = loadStats();
    const agent = loadAgent();
    const fullStats = { ...stats, trainingGames: agent.getTrainingGames() };
    const now = getUnlocked(fullStats);
    const prev = prevUnlockedRef.current;
    for (const id of now) {
      if (!prev.has(id)) {
        const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
        if (def) {
          setNewAchievement(`${def.icon} ${def.title}`);
          setTimeout(() => setNewAchievement(null), 3000);
        }
        break;
      }
    }
    prevUnlockedRef.current = now;
  }, []);

  const recordResult = useCallback((r: GameResult, finalBoard: BoardType) => {
    setResult(r);
    setHistory(h => [r, ...h].slice(0, 20));
    setScore(s => ({
      player: s.player + (r === "player" ? 1 : 0),
      ai: s.ai + (r === "ai" ? 1 : 0),
      draw: s.draw + (r === "draw" ? 1 : 0),
    }));
    setAiStartsNext(r === "player");

    const stats = loadStats();
    stats.totalGames++;
    if (r === "player") stats.playerWins++;
    else if (r === "ai") stats.aiWins++;
    else stats.draws++;
    saveStats(stats);

    if (r !== null) {
      saveReplay({ moves: [...gameMovesRef.current], result: r, savedAt: new Date().toISOString() });
      updateElo(r);
    }

    setTimeout(checkAchievements, 100);
  }, [checkAchievements]);

  const makeAiMove = useCallback(
    (currentBoard: BoardType) => {
      const agent = agentRef.current;
      const forcedEpsilon = DIFF_EPSILON[difficulty];

      const action = (() => {
        if (Math.random() < forcedEpsilon) {
          const avail = currentBoard.reduce<number[]>((a, c, i) => (c === 0 ? [...a, i] : a), []);
          return avail[Math.floor(Math.random() * avail.length)];
        }
        return agent.chooseAction(currentBoard, false);
      })();

      if (action === -1) return;

      recordMove(action);
      const boardBefore = currentBoard.slice() as BoardType;
      const newBoard = currentBoard.slice() as BoardType;
      newBoard[action] = 2;
      gameMovesRef.current.push({ boardBefore, move: action, player: 2 });
      setBoard(newBoard);
      setLastMove(action);

      const winner = checkWinner(newBoard);
      if (winner !== null) {
        setWinLine(getWinLine(newBoard));
        recordResult(winner === "draw" ? "draw" : winner === 1 ? "player" : "ai", newBoard);
        saveAgent(agent);
      } else {
        setIsPlayerTurn(true);
      }
    },
    [difficulty, recordResult]
  );

  useEffect(() => {
    if (!isPlayerTurn && result === null) {
      setThinking(true);
      const t = setTimeout(() => {
        setThinking(false);
        makeAiMove(board);
      }, 500 + Math.random() * 300);
      return () => clearTimeout(t);
    }
  }, [isPlayerTurn, result, board, makeAiMove]);

  useEffect(() => {
    const stats = loadStats();
    const agent = loadAgent();
    prevUnlockedRef.current = getUnlocked({ ...stats, trainingGames: agent.getTrainingGames() });
  }, []);

  const aiQValues = useMemo(() => {
    if (result !== null || !showQValues) return undefined;
    const state = boardToState(board);
    return agentRef.current.getQValues(state, board);
  }, [board, result, showQValues]);

  const handleCellClick = (idx: number) => {
    if (!isPlayerTurn || result !== null || board[idx] !== 0) return;
    recordMove(idx);
    const boardBefore = board.slice() as BoardType;
    const newBoard = board.slice() as BoardType;
    newBoard[idx] = 1;
    gameMovesRef.current.push({ boardBefore, move: idx, player: 1 });
    setBoard(newBoard);
    setLastMove(idx);

    const winner = checkWinner(newBoard);
    if (winner !== null) {
      setWinLine(getWinLine(newBoard));
      recordResult(winner === "draw" ? "draw" : winner === 1 ? "player" : "ai", newBoard);
    } else {
      setIsPlayerTurn(false);
    }
  };

  const resultMessages: Record<NonNullable<GameResult>, { title: string; sub: string; color: string }> = {
    player: { title: "¡Ganaste!", sub: "La IA aprenderá de esta derrota.", color: "text-sky-400" },
    ai: { title: "Ganó la IA", sub: "La IA usó lo que aprendió.", color: "text-purple-400" },
    draw: { title: "Empate", sub: "Buena partida.", color: "text-yellow-400" },
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-10 px-4">
      <AnimatePresence>
        {newAchievement && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-yellow-400/60 rounded-2xl px-5 py-3 shadow-xl shadow-yellow-500/20 text-center"
          >
            <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-0.5">Logro desbloqueado</p>
            <p className="text-sm font-bold text-slate-100">{newAchievement}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-purple-500 bg-clip-text text-transparent">
          Ta-Te-Ti IA
        </h1>
        <p className="text-slate-400 text-sm mt-1">Jugador vs Inteligencia Artificial</p>
        <div className="mt-2 flex justify-center">
          <span className={[
            "text-xs px-3 py-1 rounded-full border font-medium",
            aiStartedThisGame
              ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
              : "bg-sky-500/15 border-sky-500/30 text-sky-400",
          ].join(" ")}>
            {aiStartedThisGame ? "IA empieza (O)" : "Vos empezás (X)"}
          </span>
        </div>
      </motion.div>

      <div className="flex gap-2 mb-4">
        {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
          <motion.button
            key={d}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setDifficulty(d); resetGame(); }}
            className={[
              "px-4 py-1.5 rounded-xl text-sm font-medium border transition-all",
              difficulty === d
                ? "bg-sky-500/20 border-sky-400/60 text-sky-300"
                : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500",
            ].join(" ")}
          >
            {DIFF_LABEL[d]}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-6 mb-4">
        {[
          { label: "Tú (X)", count: score.player, color: "text-sky-400" },
          { label: "Empates", count: score.draw, color: "text-yellow-400" },
          { label: "IA (O)", count: score.ai, color: "text-purple-400" },
        ].map(({ label, count, color }) => (
          <div key={label} className="text-center">
            <p className={`text-3xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="relative w-full max-w-xs mb-2">
        <Board
          board={board}
          winLine={winLine}
          onCellClick={handleCellClick}
          disabled={!isPlayerTurn || result !== null}
          lastMove={lastMove}
          qValues={aiQValues}
        />

        <AnimatePresence>
          {thinking && !result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -bottom-7 left-0 right-0 flex items-center justify-center gap-2"
            >
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                    className="w-1.5 h-1.5 bg-purple-400 rounded-full"
                  />
                ))}
              </div>
              {showQValues && <span className="text-xs text-purple-400/70">analizando jugadas...</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowQValues(v => !v)}
        className={[
          "flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl border transition-all mt-8 mb-3 font-medium",
          showQValues
            ? "bg-red-500/10 border-red-500/40 text-red-400"
            : "bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-500",
        ].join(" ")}
      >
        {showQValues ? (
          <><span>👁</span><span>Ocultar trampa (Q-values)</span></>
        ) : (
          <><span>🎯</span><span>Ver ventaja de la IA (trampa)</span></>
        )}
      </motion.button>

      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center mb-2"
          >
            <p className={`text-3xl font-bold ${resultMessages[result].color}`}>
              {resultMessages[result].title}
            </p>
            <p className="text-slate-400 text-sm mt-1">{resultMessages[result].sub}</p>
          </motion.div>
        ) : (
          <motion.div
            key="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center mb-2"
          >
            <p className="text-slate-400 text-sm">
              {isPlayerTurn ? (
                <span className="text-sky-400 font-medium">Tu turno — elige una celda</span>
              ) : (
                <span className="text-purple-400 font-medium">La IA está pensando...</span>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {result && (
        <p className="text-xs text-slate-500 mb-2">
          {aiStartsNext ? "La IA empieza primero en la próxima" : "Vos empezás primero en la próxima"}
        </p>
      )}

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => resetGame()}
        className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-purple-600 text-white font-semibold text-sm shadow-lg hover:shadow-sky-500/30 transition-all mb-6"
      >
        Nueva partida
      </motion.button>

      {history.length > 0 && (
        <div className="w-full max-w-xs">
          <p className="text-xs uppercase tracking-wider text-slate-600 font-semibold mb-2">Historial reciente</p>
          <div className="flex flex-wrap gap-1.5">
            {history.map((r, i) => (
              <span
                key={i}
                className={[
                  "text-xs px-2 py-0.5 rounded-full border font-medium",
                  r === "player"
                    ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                    : r === "ai"
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                    : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
                ].join(" ")}
              >
                {r === "player" ? "Tú" : r === "ai" ? "IA" : "Emp"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
