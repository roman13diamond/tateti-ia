import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Board from "@/components/Board";
import {
  Board as BoardType,
  loadReplay,
  loadElo,
  loadAgent,
  boardToState,
  checkWinner,
  getWinLine,
} from "@/lib/qlearning";

type LabSection = "replay" | "elo" | "analyzer";

export default function Lab() {
  const [section, setSection] = useState<LabSection>("replay");

  const replay = loadReplay();
  const elo = loadElo();
  const agent = loadAgent();

  const [replayStep, setReplayStep] = useState(0);

  const replayBoard = (() => {
    if (!replay) return Array(9).fill(0) as BoardType;
    const b: BoardType = Array(9).fill(0) as BoardType;
    for (let i = 0; i < replayStep && i < replay.moves.length; i++) {
      b[replay.moves[i].move] = replay.moves[i].player;
    }
    return b;
  })();

  const replayWinLine = (() => {
    if (!replay || replayStep < replay.moves.length) return null;
    return getWinLine(replayBoard);
  })();

  const replayLastMove = replay?.moves[replayStep - 1]?.move;

  const [analyzerBoard, setAnalyzerBoard] = useState<BoardType>(Array(9).fill(0) as BoardType);
  const [showAnalyzerQ, setShowAnalyzerQ] = useState(true);

  const analyzerQValues = (() => {
    if (!showAnalyzerQ) return undefined;
    const state = boardToState(analyzerBoard);
    return agent.getQValues(state, analyzerBoard);
  })();

  const cycleCell = (idx: number) => {
    const board = analyzerBoard.slice() as BoardType;
    board[idx] = ((board[idx] + 1) % 3) as 0 | 1 | 2;
    setAnalyzerBoard(board);
  };

  const eloRating = (r: number) => {
    if (r >= 1400) return { label: "Gran Maestro", color: "text-yellow-300" };
    if (r >= 1200) return { label: "Experto", color: "text-purple-400" };
    if (r >= 1100) return { label: "Avanzado", color: "text-sky-400" };
    if (r >= 1000) return { label: "Intermedio", color: "text-green-400" };
    if (r >= 900) return { label: "Principiante", color: "text-orange-400" };
    return { label: "Novato", color: "text-red-400" };
  };

  const sections: { id: LabSection; label: string; icon: string }[] = [
    { id: "replay", label: "Replay", icon: "▶" },
    { id: "elo", label: "ELO", icon: "📈" },
    { id: "analyzer", label: "Analizador", icon: "🔬" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-8 px-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-green-400 to-sky-500 bg-clip-text text-transparent">
          Laboratorio
        </h1>
        <p className="text-slate-400 text-sm mt-1">Replay, ELO y análisis de posiciones</p>
      </motion.div>

      <div className="flex gap-1 mb-6 bg-slate-800/60 p-1 rounded-xl border border-slate-700">
        {sections.map(s => (
          <motion.button
            key={s.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSection(s.id)}
            className={[
              "relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
              section === s.id ? "text-white" : "text-slate-400 hover:text-slate-300",
            ].join(" ")}
          >
            {section === s.id && (
              <motion.div
                layoutId="lab-tab"
                className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-sky-500/20 rounded-lg border border-green-400/30"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative">{s.icon}</span>
            <span className="relative">{s.label}</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {section === "replay" && (
          <motion.div key="replay" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-xs flex flex-col items-center">
            {!replay ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🎬</p>
                <p className="text-slate-400 text-sm">Todavía no hay partidas guardadas.</p>
                <p className="text-slate-500 text-xs mt-1">Jugá una partida para ver el replay aquí.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4 w-full justify-center">
                  <span className={[
                    "text-xs px-2 py-0.5 rounded-full border font-medium",
                    replay.result === "player"
                      ? "bg-sky-500/15 border-sky-500/30 text-sky-400"
                      : replay.result === "ai"
                      ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                      : "bg-yellow-500/15 border-yellow-500/30 text-yellow-400",
                  ].join(" ")}>
                    {replay.result === "player" ? "Ganó el Jugador" : replay.result === "ai" ? "Ganó la IA" : "Empate"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(replay.savedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <Board
                  board={replayBoard}
                  winLine={replayWinLine}
                  onCellClick={() => {}}
                  disabled
                  lastMove={replayLastMove}
                />

                <div className="flex items-center gap-2 mt-5 w-full justify-center">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setReplayStep(0)}
                    disabled={replayStep === 0}
                    className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 disabled:opacity-30 flex items-center justify-center text-sm"
                  >⏮</motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setReplayStep(s => Math.max(0, s - 1))}
                    disabled={replayStep === 0}
                    className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 disabled:opacity-30 flex items-center justify-center text-sm"
                  >◀</motion.button>
                  <span className="text-sm text-slate-400 w-16 text-center">
                    {replayStep} / {replay.moves.length}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setReplayStep(s => Math.min(replay.moves.length, s + 1))}
                    disabled={replayStep === replay.moves.length}
                    className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 disabled:opacity-30 flex items-center justify-center text-sm"
                  >▶</motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setReplayStep(replay.moves.length)}
                    disabled={replayStep === replay.moves.length}
                    className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 disabled:opacity-30 flex items-center justify-center text-sm"
                  >⏭</motion.button>
                </div>

                <div className="mt-4 w-full">
                  <input
                    type="range"
                    min={0}
                    max={replay.moves.length}
                    value={replayStep}
                    onChange={e => setReplayStep(Number(e.target.value))}
                    className="w-full accent-sky-500"
                  />
                </div>

                {replayStep > 0 && replayStep <= replay.moves.length && (
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Jugada {replayStep}: {replay.moves[replayStep - 1].player === 1 ? "Jugador (X)" : "IA (O)"} → celda {replay.moves[replayStep - 1].move + 1}
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}

        {section === "elo" && (
          <motion.div key="elo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-xs flex flex-col items-center gap-4">
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="bg-slate-800/60 border border-sky-500/30 rounded-2xl p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Tu ELO</p>
                <p className="text-4xl font-black text-sky-400">{elo.player}</p>
                <p className={`text-xs font-semibold mt-1 ${eloRating(elo.player).color}`}>
                  {eloRating(elo.player).label}
                </p>
              </div>
              <div className="bg-slate-800/60 border border-purple-500/30 rounded-2xl p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">ELO de la IA</p>
                <p className="text-4xl font-black text-purple-400">{elo.ai}</p>
                <p className={`text-xs font-semibold mt-1 ${eloRating(elo.ai).color}`}>
                  {eloRating(elo.ai).label}
                </p>
              </div>
            </div>

            <div className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Diferencia de rating</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-sky-400 w-8 text-right">{elo.player}</span>
                <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden flex">
                  {(() => {
                    const total = elo.player + elo.ai;
                    const playerPct = Math.round((elo.player / total) * 100);
                    return (
                      <>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${playerPct}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-full bg-sky-500 rounded-l-full"
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${100 - playerPct}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-full bg-purple-500 rounded-r-full"
                        />
                      </>
                    );
                  })()}
                </div>
                <span className="text-xs text-purple-400 w-8">{elo.ai}</span>
              </div>
            </div>

            {elo.history.length > 0 && (
              <div className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                  Historial ELO ({elo.history.length} partidas)
                </p>
                <div className="flex items-end gap-0.5 h-20">
                  {elo.history.slice(-30).map((h, i) => {
                    const maxElo = Math.max(...elo.history.map(x => x.player));
                    const minElo = Math.min(...elo.history.map(x => x.player));
                    const range = maxElo - minElo || 100;
                    const height = 15 + Math.round(((h.player - minElo) / range) * 80);
                    return (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: i * 0.02, duration: 0.4 }}
                        className={[
                          "flex-1 rounded-t",
                          h.result === "player" ? "bg-sky-500" : h.result === "ai" ? "bg-purple-500" : "bg-yellow-500",
                        ].join(" ")}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-600">más antiguo</span>
                  <span className="text-xs text-slate-600">más reciente</span>
                </div>
                <div className="flex gap-3 mt-2 justify-center">
                  {[
                    { color: "bg-sky-500", label: "Tu victoria" },
                    { color: "bg-purple-500", label: "Victoria IA" },
                    { color: "bg-yellow-500", label: "Empate" },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-sm ${color}`} />
                      <span className="text-xs text-slate-500">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {elo.history.length === 0 && (
              <p className="text-xs text-slate-500 text-center">
                Jugá partidas para ver tu historial ELO aquí.
              </p>
            )}
          </motion.div>
        )}

        {section === "analyzer" && (
          <motion.div key="analyzer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-xs flex flex-col items-center gap-4">
            <div className="text-center">
              <p className="text-sm text-slate-400">Hacé clic en las celdas para colocar piezas</p>
              <p className="text-xs text-slate-500 mt-0.5">vacío → X → O → vacío</p>
            </div>

            <Board
              board={analyzerBoard}
              winLine={getWinLine(analyzerBoard)}
              onCellClick={cycleCell}
              disabled={false}
              qValues={showAnalyzerQ ? analyzerQValues : undefined}
            />

            <div className="flex gap-2 w-full">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAnalyzerQ(v => !v)}
                className={[
                  "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                  showAnalyzerQ
                    ? "bg-green-500/15 border-green-500/40 text-green-400"
                    : "bg-slate-800/50 border-slate-700 text-slate-400",
                ].join(" ")}
              >
                {showAnalyzerQ ? "Q-values ON" : "Q-values OFF"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setAnalyzerBoard(Array(9).fill(0) as BoardType)}
                className="flex-1 py-2 rounded-xl text-sm font-medium border bg-slate-800/50 border-slate-700 text-slate-400 transition-all hover:border-slate-500"
              >
                Limpiar tablero
              </motion.button>
            </div>

            {checkWinner(analyzerBoard) !== null && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center w-full">
                <p className="text-sm text-slate-300">
                  {checkWinner(analyzerBoard) === "draw"
                    ? "Empate en esta posición"
                    : `Gana el jugador ${checkWinner(analyzerBoard) === 1 ? "X" : "O"}`}
                </p>
              </div>
            )}

            {showAnalyzerQ && analyzerQValues && checkWinner(analyzerBoard) === null && (
              <div className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Ranking de jugadas (IA como O)
                </p>
                <div className="space-y-1.5">
                  {analyzerQValues
                    .map((v, i) => ({ v, i }))
                    .filter(({ v, i }) => analyzerBoard[i] === 0 && isFinite(v))
                    .sort((a, b) => b.v - a.v)
                    .slice(0, 5)
                    .map(({ v, i }, rank) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-4">{rank + 1}.</span>
                        <span className="text-xs text-slate-400">Celda {i + 1}</span>
                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(5, ((v + 1) / 2) * 100)}%` }}
                            className={`h-full rounded-full ${v > 0.3 ? "bg-green-500" : v > -0.3 ? "bg-yellow-500" : "bg-red-500"}`}
                          />
                        </div>
                        <span className={`text-xs font-mono font-bold ${v > 0.3 ? "text-green-400" : v > -0.3 ? "text-yellow-400" : "text-red-400"}`}>
                          {v > 0 ? "+" : ""}{v.toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
