import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Board from "@/components/Board";
import {
  Board as BoardType,
  QLearningAgent,
  checkWinner,
  getWinLine,
  getAvailableMoves,
  boardToState,
  flipBoard,
  loadAgent,
  saveAgent,
  loadStats,
  saveStats,
  trainEpisode,
  trainSelfPlayEpisode,
  SelfPlayResult,
} from "@/lib/qlearning";

type TrainMode = "watch" | "fast" | "self-watch" | "self-fast";
type TrainResult = "ai" | "random" | "draw";

const MODES: { id: TrainMode; label: string; group: "vs-random" | "vs-self" }[] = [
  { id: "watch",      label: "Ver en vivo",        group: "vs-random" },
  { id: "fast",       label: "Rápido",              group: "vs-random" },
  { id: "self-watch", label: "Ver en vivo",         group: "vs-self"   },
  { id: "self-fast",  label: "Rápido",              group: "vs-self"   },
];

export default function Training() {
  const agentRef = useRef<QLearningAgent>(loadAgent());
  const [mode, setMode] = useState<TrainMode>("watch");
  const [isRunning, setIsRunning] = useState(false);
  const [board, setBoard] = useState<BoardType>(Array(9).fill(0) as BoardType);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [lastMove, setLastMove] = useState<number | undefined>(undefined);
  const [sessionStats, setSessionStats] = useState({ aiWins: 0, randomWins: 0, draws: 0, total: 0 });
  const [selfStats, setSelfStats] = useState({ xWins: 0, oWins: 0, draws: 0, total: 0 });
  const [totalTrained, setTotalTrained] = useState(() => loadAgent().getTrainingGames());
  const [epsilon, setEpsilon] = useState(() => loadAgent().getEpsilon());
  const [batchProgress, setBatchProgress] = useState(0);
  const [lastResults, setLastResults] = useState<string[]>([]);
  const runRef = useRef(false);
  const stepDelay = 80;

  const isSelfMode = mode === "self-watch" || mode === "self-fast";

  const stopTraining = useCallback(() => {
    runRef.current = false;
    setIsRunning(false);
    saveAgent(agentRef.current);
    const stats = loadStats();
    stats.trainingGames = agentRef.current.getTrainingGames();
    saveStats(stats);
  }, []);

  const runWatchEpisode = useCallback(async () => {
    const agent = agentRef.current;
    const newBoard: BoardType = Array(9).fill(0) as BoardType;
    setBoard([...newBoard] as BoardType);
    setWinLine(null);
    setLastMove(undefined);
    await new Promise(r => setTimeout(r, stepDelay));

    let currentPlayer: 1 | 2 = 1;
    const history: { state: string; action: number; player: 1 | 2 }[] = [];

    while (true) {
      if (!runRef.current) return null;
      const available = getAvailableMoves(newBoard);
      if (available.length === 0) break;

      const state = boardToState(newBoard);
      let action: number;
      if (currentPlayer === 2) {
        action = agent.chooseAction(newBoard, true);
      } else {
        action = available[Math.floor(Math.random() * available.length)];
      }

      history.push({ state, action, player: currentPlayer });
      newBoard[action] = currentPlayer;
      setBoard([...newBoard] as BoardType);
      setLastMove(action);
      await new Promise(r => setTimeout(r, stepDelay));

      const winner = checkWinner(newBoard);
      if (winner !== null) {
        setWinLine(getWinLine(newBoard));
        if (winner !== "draw") {
          for (const step of history) {
            const reward = step.player === winner ? 1 : -1;
            agent.update(step.state, step.action, reward, [...newBoard] as BoardType, true);
          }
        } else {
          for (const step of history) {
            agent.update(step.state, step.action, 0.3, [...newBoard] as BoardType, true);
          }
        }
        agent.incrementTrainingGames();
        await new Promise(r => setTimeout(r, 400));
        return winner === "draw" ? "draw" : winner === 2 ? "ai" : ("random" as TrainResult);
      }

      currentPlayer = currentPlayer === 1 ? 2 : 1;
    }
    agent.incrementTrainingGames();
    return "draw" as TrainResult;
  }, []);

  const runWatchSelfEpisode = useCallback(async (): Promise<SelfPlayResult | null> => {
    const agent = agentRef.current;
    const newBoard: BoardType = Array(9).fill(0) as BoardType;
    setBoard([...newBoard] as BoardType);
    setWinLine(null);
    setLastMove(undefined);
    await new Promise(r => setTimeout(r, stepDelay));

    let currentPlayer: 1 | 2 = 1;
    const history: { state: string; flippedState: string; action: number; player: 1 | 2 }[] = [];

    while (true) {
      if (!runRef.current) return null;
      const available = getAvailableMoves(newBoard);
      if (available.length === 0) break;

      const state = boardToState(newBoard);
      const flipped = flipBoard(newBoard);
      const flippedState = boardToState(flipped);

      let action: number;
      if (currentPlayer === 2) {
        action = agent.chooseAction(newBoard, true);
      } else {
        action = agent.chooseAction(flipped, true);
      }
      if (!available.includes(action)) {
        action = available[Math.floor(Math.random() * available.length)];
      }

      history.push({ state, flippedState, action, player: currentPlayer });
      newBoard[action] = currentPlayer;
      setBoard([...newBoard] as BoardType);
      setLastMove(action);
      await new Promise(r => setTimeout(r, stepDelay));

      const winner = checkWinner(newBoard);
      if (winner !== null) {
        setWinLine(getWinLine(newBoard));
        if (winner !== "draw") {
          for (const step of history) {
            const reward = step.player === winner ? 1.0 : -1.0;
            const nb = [...newBoard] as BoardType;
            if (step.player === 2) {
              agent.update(step.state, step.action, reward, nb, true);
            } else {
              agent.update(step.flippedState, step.action, reward, flipBoard(nb), true);
            }
          }
        } else {
          for (const step of history) {
            const nb = [...newBoard] as BoardType;
            if (step.player === 2) {
              agent.update(step.state, step.action, 0.3, nb, true);
            } else {
              agent.update(step.flippedState, step.action, 0.3, flipBoard(nb), true);
            }
          }
        }
        agent.incrementTrainingGames();
        await new Promise(r => setTimeout(r, 400));
        return winner === "draw" ? "draw" : winner === 1 ? "x" : "o";
      }

      currentPlayer = currentPlayer === 1 ? 2 : 1;
    }
    agent.incrementTrainingGames();
    return "draw";
  }, []);

  const startWatchMode = useCallback(async () => {
    runRef.current = true;
    setIsRunning(true);
    while (runRef.current) {
      const res = await runWatchEpisode();
      if (res === null) break;
      setSessionStats(s => ({
        aiWins: s.aiWins + (res === "ai" ? 1 : 0),
        randomWins: s.randomWins + (res === "random" ? 1 : 0),
        draws: s.draws + (res === "draw" ? 1 : 0),
        total: s.total + 1,
      }));
      setTotalTrained(agentRef.current.getTrainingGames());
      setEpsilon(agentRef.current.getEpsilon());
      setLastResults(prev => [res, ...prev].slice(0, 30));
    }
    stopTraining();
  }, [runWatchEpisode, stopTraining]);

  const startSelfWatchMode = useCallback(async () => {
    runRef.current = true;
    setIsRunning(true);
    while (runRef.current) {
      const res = await runWatchSelfEpisode();
      if (res === null) break;
      setSelfStats(s => ({
        xWins: s.xWins + (res === "x" ? 1 : 0),
        oWins: s.oWins + (res === "o" ? 1 : 0),
        draws: s.draws + (res === "draw" ? 1 : 0),
        total: s.total + 1,
      }));
      setTotalTrained(agentRef.current.getTrainingGames());
      setEpsilon(agentRef.current.getEpsilon());
      setLastResults(prev => [res, ...prev].slice(0, 30));
    }
    stopTraining();
  }, [runWatchSelfEpisode, stopTraining]);

  const startFastMode = useCallback(async () => {
    runRef.current = true;
    setIsRunning(true);
    const BATCH = 100;
    const agent = agentRef.current;
    let localStats = { aiWins: 0, randomWins: 0, draws: 0, total: 0 };
    while (runRef.current) {
      const results: TrainResult[] = [];
      for (let i = 0; i < BATCH; i++) {
        const r = trainEpisode(agent);
        results.push(r);
        localStats.total++;
        if (r === "ai") localStats.aiWins++;
        else if (r === "random") localStats.randomWins++;
        else localStats.draws++;
      }
      setBatchProgress(p => p + BATCH);
      setSessionStats({ ...localStats });
      setTotalTrained(agent.getTrainingGames());
      setEpsilon(agent.getEpsilon());
      setLastResults(prev => [...results.slice(-30), ...prev].slice(0, 30));
      await new Promise(r => setTimeout(r, 0));
    }
    stopTraining();
  }, [stopTraining]);

  const startSelfFastMode = useCallback(async () => {
    runRef.current = true;
    setIsRunning(true);
    const BATCH = 100;
    const agent = agentRef.current;
    let localStats = { xWins: 0, oWins: 0, draws: 0, total: 0 };
    while (runRef.current) {
      const results: SelfPlayResult[] = [];
      for (let i = 0; i < BATCH; i++) {
        const r = trainSelfPlayEpisode(agent);
        results.push(r);
        localStats.total++;
        if (r === "x") localStats.xWins++;
        else if (r === "o") localStats.oWins++;
        else localStats.draws++;
      }
      setBatchProgress(p => p + BATCH);
      setSelfStats({ ...localStats });
      setTotalTrained(agent.getTrainingGames());
      setEpsilon(agent.getEpsilon());
      setLastResults(prev => [...results.slice(-30), ...prev].slice(0, 30));
      await new Promise(r => setTimeout(r, 0));
    }
    stopTraining();
  }, [stopTraining]);

  const handleToggle = () => {
    if (isRunning) {
      runRef.current = false;
    } else {
      setSessionStats({ aiWins: 0, randomWins: 0, draws: 0, total: 0 });
      setSelfStats({ xWins: 0, oWins: 0, draws: 0, total: 0 });
      setBatchProgress(0);
      setLastResults([]);
      if (mode === "watch") startWatchMode();
      else if (mode === "fast") startFastMode();
      else if (mode === "self-watch") startSelfWatchMode();
      else startSelfFastMode();
    }
  };

  const handleModeChange = (m: TrainMode) => {
    if (isRunning) return;
    setMode(m);
    setLastResults([]);
    setSessionStats({ aiWins: 0, randomWins: 0, draws: 0, total: 0 });
    setSelfStats({ xWins: 0, oWins: 0, draws: 0, total: 0 });
  };

  useEffect(() => {
    return () => { runRef.current = false; };
  }, []);

  const aiWinRate = sessionStats.total > 0 ? Math.round((sessionStats.aiWins / sessionStats.total) * 100) : 0;
  const aiLossRate = sessionStats.total > 0 ? Math.round((sessionStats.randomWins / sessionStats.total) * 100) : 0;
  const xWinRate = selfStats.total > 0 ? Math.round((selfStats.xWins / selfStats.total) * 100) : 0;
  const oWinRate = selfStats.total > 0 ? Math.round((selfStats.oWins / selfStats.total) * 100) : 0;
  const totalSession = isSelfMode ? selfStats.total : sessionStats.total;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-10 px-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-purple-500 bg-clip-text text-transparent">
          Entrenamiento
        </h1>
      </motion.div>

      <div className="mb-6 w-full max-w-xs space-y-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5 text-center">IA vs Bot Aleatorio</p>
          <div className="flex gap-2 justify-center">
            {MODES.filter(m => m.group === "vs-random").map(m => (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleModeChange(m.id)}
                disabled={isRunning}
                className={[
                  "flex-1 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all",
                  mode === m.id
                    ? "bg-sky-500/20 border-sky-400/60 text-sky-300"
                    : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500",
                  isRunning ? "opacity-50 cursor-not-allowed" : "",
                ].join(" ")}
              >
                {m.label}
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5 text-center">IA vs Ella Misma</p>
          <div className="flex gap-2 justify-center">
            {MODES.filter(m => m.group === "vs-self").map(m => (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleModeChange(m.id)}
                disabled={isRunning}
                className={[
                  "flex-1 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all",
                  mode === m.id
                    ? "bg-purple-500/20 border-purple-400/60 text-purple-300"
                    : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500",
                  isRunning ? "opacity-50 cursor-not-allowed" : "",
                ].join(" ")}
              >
                {m.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {(mode === "watch" || mode === "self-watch") && (
        <div className="relative w-full max-w-xs mb-6">
          <Board board={board} winLine={winLine} onCellClick={() => {}} disabled lastMove={lastMove} />
          <AnimatePresence>
            {isRunning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-2 right-2 flex items-center gap-1.5"
              >
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-green-400 font-medium">Live</span>
              </motion.div>
            )}
          </AnimatePresence>
          {mode === "self-watch" && (
            <div className="absolute top-2 left-2 flex items-center gap-2">
              <span className="text-xs bg-sky-500/20 border border-sky-500/40 text-sky-300 px-2 py-0.5 rounded-md">X = IA</span>
              <span className="text-xs bg-purple-500/20 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded-md">O = IA</span>
            </div>
          )}
        </div>
      )}

      {(mode === "fast" || mode === "self-fast") && (
        <div className="w-full max-w-xs mb-6 bg-slate-800/60 border border-slate-700 rounded-2xl p-6 text-center">
          <motion.p
            key={batchProgress}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className={`text-5xl font-bold ${isSelfMode ? "text-purple-400" : "text-sky-400"}`}
          >
            {totalSession.toLocaleString()}
          </motion.p>
          <p className="text-slate-400 text-sm mt-1">partidas entrenadas esta sesión</p>
          {isRunning && (
            <div className="mt-4 flex gap-1 justify-center">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12 }}
                  className={`w-2 h-2 rounded-full ${isSelfMode ? "bg-purple-400" : "bg-sky-400"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6 w-full max-w-xs">
        {isSelfMode ? (
          <>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-sky-400">{xWinRate}%</p>
              <p className="text-xs text-slate-500">Victorias IA-X</p>
              <p className="text-xs text-sky-400/60 font-medium">{selfStats.xWins} partidas</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-400">{oWinRate}%</p>
              <p className="text-xs text-slate-500">Victorias IA-O</p>
              <p className="text-xs text-purple-400/60 font-medium">{selfStats.oWins} partidas</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">
                {selfStats.total > 0 ? Math.round((selfStats.draws / selfStats.total) * 100) : 0}%
              </p>
              <p className="text-xs text-slate-500">Empates</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">{(epsilon * 100).toFixed(0)}%</p>
              <p className="text-xs text-slate-500">Exploración ε</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-400">{aiWinRate}%</p>
              <p className="text-xs text-slate-500">Victorias IA</p>
              <p className="text-xs text-purple-400/60 font-medium">{sessionStats.aiWins} partidas</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{aiLossRate}%</p>
              <p className="text-xs text-slate-500">Derrotas IA</p>
              <p className="text-xs text-red-400/60 font-medium">{sessionStats.randomWins} partidas</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-sky-400">{totalTrained.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Total entrenadas</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">{(epsilon * 100).toFixed(0)}%</p>
              <p className="text-xs text-slate-500">Exploración ε</p>
            </div>
          </>
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleToggle}
        className={[
          "px-10 py-3 rounded-xl font-bold text-sm shadow-lg transition-all mb-6",
          isRunning
            ? "bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30"
            : isSelfMode
            ? "bg-gradient-to-r from-purple-500 to-sky-600 text-white hover:shadow-purple-500/30"
            : "bg-gradient-to-r from-sky-500 to-purple-600 text-white hover:shadow-sky-500/30",
        ].join(" ")}
      >
        {isRunning ? "Detener entrenamiento" : "Iniciar entrenamiento"}
      </motion.button>

      {lastResults.length > 0 && (
        <div className="w-full max-w-xs">
          <p className="text-xs uppercase tracking-wider text-slate-600 font-semibold mb-2">
            Resultados recientes
          </p>
          <div className="flex flex-wrap gap-1">
            {lastResults.map((r, i) => (
              <span
                key={i}
                className={[
                  "text-xs px-1.5 py-0.5 rounded-md font-medium",
                  r === "ai" || r === "o"
                    ? "bg-purple-500/15 text-purple-400"
                    : r === "random" || r === "x"
                    ? "bg-sky-500/15 text-sky-400"
                    : "bg-yellow-500/15 text-yellow-400",
                ].join(" ")}
              >
                {r === "ai" ? "IA" : r === "random" ? "Rand" : r === "x" ? "IA-X" : r === "o" ? "IA-O" : "Emp"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
