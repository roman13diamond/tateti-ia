import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Board from "@/components/Board";
import {
  Board as BoardType,
  checkWinner,
  getWinLine,
} from "@/lib/qlearning";

type Result = "win" | "wrong" | null;
type Mode = "play" | "create";

interface Puzzle {
  id: number;
  title: string;
  desc: string;
  board: BoardType;
  hint: string;
  winningMove: number;
  custom?: boolean;
}

// Todos los puzzles validan: colocar X en winningMove produce victoria inmediata
const BUILTIN_PUZZLES: Puzzle[] = [
  {
    id: 1,
    title: "Ganá en 1",
    desc: "Completá la fila superior con X.",
    board: [1, 1, 0, 2, 0, 2, 0, 0, 0] as BoardType,
    hint: "Fila de arriba — posición 3",
    winningMove: 2,
  },
  {
    id: 2,
    title: "Columna izquierda",
    desc: "X controla la columna. Terminala.",
    board: [1, 2, 0, 1, 0, 2, 0, 0, 0] as BoardType,
    hint: "Mirá la columna de la izquierda",
    winningMove: 6,
  },
  {
    id: 3,
    title: "Diagonal principal",
    desc: "Completá la diagonal de arriba-izquierda a abajo-derecha.",
    board: [1, 2, 0, 0, 1, 2, 0, 0, 0] as BoardType,
    hint: "La diagonal principal — esquina inferior derecha",
    winningMove: 8,
  },
  {
    id: 4,
    title: "Fila del medio",
    desc: "X tiene la fila del medio casi completa.",
    board: [0, 2, 0, 1, 1, 0, 0, 2, 0] as BoardType,
    hint: "Completá la fila central",
    winningMove: 5,
  },
  {
    id: 5,
    title: "Anti-diagonal",
    desc: "Hay una diagonal escondida. Encontrala.",
    board: [0, 2, 1, 0, 1, 2, 0, 0, 0] as BoardType,
    hint: "La anti-diagonal va de arriba-derecha a abajo-izquierda",
    winningMove: 6,
  },
  {
    id: 6,
    title: "Doble amenaza",
    desc: "Una jugada gana Y bloquea a O al mismo tiempo.",
    board: [2, 2, 0, 1, 1, 0, 0, 0, 0] as BoardType,
    hint: "Completá tu fila del medio antes de que O complete la suya",
    winningMove: 5,
  },
  {
    id: 7,
    title: "Columna central",
    desc: "X domina la columna del centro. Un movimiento la cierra.",
    board: [2, 1, 0, 2, 1, 0, 0, 0, 0] as BoardType,
    hint: "Columna del centro — celda de abajo",
    winningMove: 7,
  },
  {
    id: 8,
    title: "Columna derecha",
    desc: "Completá la columna de la derecha.",
    board: [2, 0, 1, 2, 0, 1, 0, 0, 0] as BoardType,
    hint: "Columna derecha — esquina inferior",
    winningMove: 8,
  },
];

const CUSTOM_KEY = "tateti_custom_puzzles";

function loadCustom(): Puzzle[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as Puzzle[]) : [];
  } catch {
    return [];
  }
}

function saveCustom(puzzles: Puzzle[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(puzzles));
}

// ─── CREATOR ──────────────────────────────────────────────────────────────────
function PuzzleCreator({ onSave, onCancel }: { onSave: (p: Puzzle) => void; onCancel: () => void }) {
  const [creatorBoard, setCreatorBoard] = useState<BoardType>(Array(9).fill(0) as BoardType);
  const [solution, setSolution] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [hint, setHint] = useState("");
  const [pickingMove, setPickingMove] = useState(false);
  const [error, setError] = useState("");

  const toggleCell = (idx: number) => {
    if (pickingMove) {
      if (creatorBoard[idx] !== 0) return; // must be empty to be a valid solution
      setSolution(idx);
      setPickingMove(false);
      return;
    }
    const next = [...creatorBoard] as BoardType;
    next[idx] = ((next[idx] + 1) % 3) as 0 | 1 | 2;
    if (solution === idx) setSolution(null);
    setCreatorBoard(next);
  };

  const validate = () => {
    if (!title.trim()) { setError("Poné un título al puzzle."); return false; }
    if (solution === null) { setError("Seleccioná la jugada ganadora."); return false; }
    if (creatorBoard[solution] !== 0) { setError("La jugada ganadora debe ser una celda vacía."); return false; }
    // Verify it actually wins
    const test = [...creatorBoard] as BoardType;
    test[solution] = 1;
    const w = checkWinner(test);
    if (w !== 1) { setError("Esa jugada no produce una victoria inmediata para X. Ajustá el tablero."); return false; }
    return true;
  };

  const handleSave = () => {
    setError("");
    if (!validate()) return;
    onSave({
      id: Date.now(),
      title: title.trim(),
      desc: desc.trim() || "Puzzle personalizado — encontrá la jugada ganadora.",
      board: creatorBoard,
      hint: hint.trim() || "Buscá la victoria inmediata para X.",
      winningMove: solution!,
      custom: true,
    });
  };

  const symbols: Record<number, string> = { 0: "", 1: "X", 2: "O" };
  const colors: Record<number, string> = { 0: "text-slate-500", 1: "text-sky-400", 2: "text-purple-400" };

  return (
    <div className="w-full max-w-xs flex flex-col gap-4">
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 text-center">
        <p className="text-sm font-semibold text-slate-200 mb-1">Diseñá el tablero</p>
        <p className="text-xs text-slate-500">Clic en una celda para poner X → O → vacío</p>
      </div>

      {/* Board editor */}
      <div className="grid grid-cols-3 gap-2 w-full select-none">
        {creatorBoard.map((cell, idx) => (
          <motion.button
            key={idx}
            whileTap={{ scale: 0.92 }}
            onClick={() => toggleCell(idx)}
            className={[
              "aspect-square rounded-2xl flex items-center justify-center border-2 text-5xl font-black transition-all",
              solution === idx
                ? "bg-green-500/20 border-green-400/70"
                : pickingMove && cell === 0
                ? "bg-yellow-500/10 border-yellow-400/50 animate-pulse"
                : "bg-slate-800/60 border-slate-700 hover:border-slate-500",
              colors[cell],
            ].join(" ")}
          >
            {solution === idx && cell === 0
              ? <span className="text-green-400 text-3xl">★</span>
              : symbols[cell]}
          </motion.button>
        ))}
      </div>

      {/* Pick solution */}
      <button
        onClick={() => setPickingMove(v => !v)}
        className={[
          "w-full py-2 rounded-xl border text-sm font-medium transition-all",
          pickingMove
            ? "bg-yellow-500/15 border-yellow-400/60 text-yellow-300"
            : solution !== null
            ? "bg-green-500/10 border-green-500/40 text-green-400"
            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500",
        ].join(" ")}
      >
        {pickingMove
          ? "🎯 Hacé clic en la celda ganadora..."
          : solution !== null
          ? `✓ Jugada ganadora: celda ${solution + 1}`
          : "🎯 Seleccionar jugada ganadora"}
      </button>

      <input
        value={title}
        onChange={e => setTitle(e.target.value.slice(0, 30))}
        placeholder="Título del puzzle *"
        className="bg-slate-800 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none transition-colors"
      />
      <input
        value={desc}
        onChange={e => setDesc(e.target.value.slice(0, 80))}
        placeholder="Descripción (opcional)"
        className="bg-slate-800 border border-slate-700 focus:border-slate-500 rounded-xl px-3 py-2 text-sm text-slate-400 focus:outline-none transition-colors"
      />
      <input
        value={hint}
        onChange={e => setHint(e.target.value.slice(0, 60))}
        placeholder="Pista (opcional)"
        className="bg-slate-800 border border-slate-700 focus:border-slate-500 rounded-xl px-3 py-2 text-sm text-slate-400 focus:outline-none transition-colors"
      />

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          {error}
        </motion.p>
      )}

      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-500 transition-all">
          Cancelar
        </button>
        <button onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold text-sm shadow-lg hover:opacity-90 transition-all">
          Guardar puzzle
        </button>
      </div>
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
export default function Solo() {
  const [mode, setMode] = useState<Mode>("play");
  const [customPuzzles, setCustomPuzzles] = useState<Puzzle[]>(loadCustom);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [lastMove, setLastMove] = useState<number | undefined>(undefined);
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const [streak, setStreak] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const allPuzzles = [...BUILTIN_PUZZLES, ...customPuzzles];
  const puzzle = allPuzzles[puzzleIdx] ?? BUILTIN_PUZZLES[0];

  const [board, setBoard] = useState<BoardType>(puzzle.board.slice() as BoardType);

  const loadPuzzle = useCallback((idx: number, puzzles: Puzzle[]) => {
    const p = puzzles[idx] ?? puzzles[0];
    setBoard(p.board.slice() as BoardType);
    setResult(null);
    setWinLine(null);
    setLastMove(undefined);
    setShowHint(false);
    setWrongFlash(false);
  }, []);

  const handleCellClick = (idx: number) => {
    if (result !== null || board[idx] !== 0) return;

    if (idx !== puzzle.winningMove) {
      setStreak(0);
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 700);
      return;
    }

    const newBoard = board.slice() as BoardType;
    newBoard[idx] = 1;
    setBoard(newBoard);
    setLastMove(idx);

    const winner = checkWinner(newBoard);
    if (winner === 1) {
      setWinLine(getWinLine(newBoard));
      setResult("win");
      setSolved(s => new Set([...s, puzzle.id]));
      setStreak(s => s + 1);
    } else {
      // Shouldn't happen with correct puzzles, but fallback
      setResult("wrong");
    }
  };

  const goTo = (idx: number) => {
    const all = [...BUILTIN_PUZZLES, ...customPuzzles];
    const clamped = Math.max(0, Math.min(idx, all.length - 1));
    setPuzzleIdx(clamped);
    loadPuzzle(clamped, all);
  };

  const retry = () => loadPuzzle(puzzleIdx, allPuzzles);

  const handleSaveCustom = (p: Puzzle) => {
    const updated = [...customPuzzles, p];
    setCustomPuzzles(updated);
    saveCustom(updated);
    setMode("play");
    const all = [...BUILTIN_PUZZLES, ...updated];
    const newIdx = all.length - 1;
    setPuzzleIdx(newIdx);
    loadPuzzle(newIdx, all);
  };

  const deleteCustom = (id: number) => {
    const updated = customPuzzles.filter(p => p.id !== id);
    setCustomPuzzles(updated);
    saveCustom(updated);
    const all = [...BUILTIN_PUZZLES, ...updated];
    const newIdx = Math.min(puzzleIdx, all.length - 1);
    setPuzzleIdx(newIdx);
    loadPuzzle(newIdx, all);
  };

  if (mode === "create") {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-8 px-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 text-center">
          <h1 className="text-3xl font-bold text-yellow-400">Crear Puzzle</h1>
          <p className="text-slate-400 text-sm mt-1">Diseñá tu propio puzzle de Ta-Te-Ti</p>
        </motion.div>
        <PuzzleCreator onSave={handleSaveCustom} onCancel={() => setMode("play")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-8 px-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          Puzzles
        </h1>
        <p className="text-slate-400 text-sm mt-1">Encontrá la jugada ganadora para X</p>
      </motion.div>

      {/* Dot nav + streak */}
      <div className="flex items-center gap-3 mb-4 flex-wrap justify-center">
        <div className="flex gap-1.5 flex-wrap justify-center">
          {allPuzzles.map((p, i) => (
            <button
              key={p.id}
              onClick={() => goTo(i)}
              title={p.title}
              className={[
                "w-6 h-6 rounded-full text-xs font-bold border transition-all",
                solved.has(p.id)
                  ? "bg-green-500/20 border-green-500/60 text-green-400"
                  : i === puzzleIdx
                  ? "bg-yellow-500/20 border-yellow-500/60 text-yellow-400"
                  : p.custom
                  ? "bg-purple-800/40 border-purple-700/60 text-purple-400"
                  : "bg-slate-800 border-slate-700 text-slate-500",
              ].join(" ")}
            >
              {i + 1}
            </button>
          ))}
        </div>
        {streak > 1 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="text-xs text-orange-400 font-bold bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-full">
            🔥 {streak} seguidos
          </motion.span>
        )}
      </div>

      {/* Puzzle card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={puzzleIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full max-w-xs mb-3"
        >
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 mb-4 text-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">{puzzleIdx + 1} / {allPuzzles.length}</span>
              <div className="flex items-center gap-1.5">
                {puzzle.custom && (
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-purple-500/15 border-purple-500/40 text-purple-400">
                    Propio
                  </span>
                )}
                <span className={[
                  "text-xs px-2 py-0.5 rounded-full border font-medium",
                  solved.has(puzzle.id)
                    ? "bg-green-500/15 border-green-500/40 text-green-400"
                    : "bg-yellow-500/15 border-yellow-500/40 text-yellow-400",
                ].join(" ")}>
                  {solved.has(puzzle.id) ? "✓ Resuelto" : "Pendiente"}
                </span>
              </div>
            </div>
            <p className="text-lg font-bold text-slate-100">{puzzle.title}</p>
            <p className="text-sm text-slate-400 mt-1">{puzzle.desc}</p>
            <p className="text-xs text-slate-500 mt-1">Jugás con <span className="text-sky-400 font-bold">X</span></p>
          </div>

          <motion.div
            animate={wrongFlash ? { x: [-6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.35 }}
          >
            <Board
              board={board}
              winLine={winLine}
              onCellClick={handleCellClick}
              disabled={result !== null}
              lastMove={lastMove}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Feedback */}
      <AnimatePresence mode="wait">
        {result === "win" && (
          <motion.div key="win" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-3">
            <p className="text-3xl font-bold text-green-400">¡Correcto! 🎉</p>
            <p className="text-slate-400 text-sm mt-1">Encontraste la jugada ganadora</p>
          </motion.div>
        )}
        {wrongFlash && result === null && (
          <motion.div key="wrong" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center mb-3">
            <p className="text-lg font-bold text-red-400">Movimiento incorrecto ✗</p>
          </motion.div>
        )}
        {!wrongFlash && result === null && (
          <motion.div key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-3">
            <p className="text-sm text-slate-500">¿Cuál es la mejor jugada para X?</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint */}
      {!showHint && result === null && (
        <button onClick={() => setShowHint(true)}
          className="text-xs text-slate-500 hover:text-yellow-400 border border-slate-700 hover:border-yellow-500/40 rounded-lg px-3 py-1 mb-3 transition-all">
          💡 Ver pista
        </button>
      )}
      {showHint && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-xs text-yellow-400/80 mb-3 italic text-center">
          Pista: {puzzle.hint}
        </motion.p>
      )}

      {/* Nav buttons */}
      <div className="flex gap-2 mb-4">
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => goTo(puzzleIdx - 1)}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-sm">
          ← Anterior
        </motion.button>
        {result === "win" ? (
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => goTo(puzzleIdx + 1)}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold text-sm shadow-lg">
            Siguiente →
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale: 0.95 }} onClick={retry}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-sm">
            Reintentar
          </motion.button>
        )}
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => goTo(puzzleIdx + 1)}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-sm">
          Saltar →
        </motion.button>
      </div>

      {/* Progress */}
      <div className="mt-2 w-full max-w-xs">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Progreso</span>
          <span>{solved.size} / {allPuzzles.length}</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${(solved.size / allPuzzles.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
          />
        </div>
      </div>

      {/* Create + manage custom puzzles */}
      <div className="mt-6 w-full max-w-xs">
        <button
          onClick={() => setMode("create")}
          className="w-full py-2.5 rounded-xl border border-dashed border-yellow-500/40 text-yellow-400/80 hover:text-yellow-300 hover:border-yellow-400/60 text-sm font-medium transition-all"
        >
          ✚ Crear mi propio puzzle
        </button>

        {customPuzzles.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowCustom(v => !v)}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors mb-2 flex items-center gap-1"
            >
              {showCustom ? "▾" : "▸"} Mis puzzles ({customPuzzles.length})
            </button>
            {showCustom && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-1.5">
                {customPuzzles.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2">
                    <button
                      onClick={() => goTo(BUILTIN_PUZZLES.length + i)}
                      className="flex-1 text-left text-sm text-slate-300 hover:text-white transition-colors"
                    >
                      {solved.has(p.id) ? "✓ " : ""}{p.title}
                    </button>
                    <button
                      onClick={() => deleteCustom(p.id)}
                      className="text-slate-600 hover:text-red-400 text-xs transition-colors"
                      title="Eliminar"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
