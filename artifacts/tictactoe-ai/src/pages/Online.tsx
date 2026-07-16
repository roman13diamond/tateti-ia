import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Board from "@/components/Board";

type Cell = 0 | 1 | 2;
type Phase = "lobby" | "waiting" | "playing" | "gameover";
type NetMode = "online" | "lan";

const WS_URL = (() => {
  const host = window.location.host;
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${host}/api/ws`;
})();

interface ServerMsg {
  type: string;
  [k: string]: unknown;
}

export default function Online() {
  const [netMode, setNetMode] = useState<NetMode>("online");
  const [phase, setPhase] = useState<Phase>("lobby");
  const [name, setName] = useState("Jugador");
  const [code, setCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(0) as Cell[]);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [mySymbol, setMySymbol] = useState<1 | 2>(1);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [winner, setWinner] = useState<number | "draw" | null>(null);
  const [players, setPlayers] = useState<{ name: string; symbol: number }[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const sendWs = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback((onOpen: (ws: WebSocket) => void) => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => onOpen(ws);

    ws.onmessage = (ev) => {
      const msg: ServerMsg = JSON.parse(ev.data as string);

      if (msg.type === "created") {
        setCode(msg["code"] as string);
        setMySymbol(msg["yourSymbol"] as 1 | 2);
        setPhase("waiting");
      }

      if (msg.type === "state") {
        setBoard(msg["board"] as Cell[]);
        setTurn(msg["turn"] as 1 | 2);
        setMySymbol(msg["yourSymbol"] as 1 | 2);
        setPlayers(msg["players"] as { name: string; symbol: number }[]);
        setWinLine(null);
        setWinner(null);
        setPhase("playing");
      }

      if (msg.type === "gameover") {
        setBoard(msg["board"] as Cell[]);
        setWinLine(msg["winLine"] as number[]);
        setWinner(msg["winner"] as number | "draw");
        setPlayers(msg["players"] as { name: string; symbol: number }[]);
        setPhase("gameover");
      }

      if (msg.type === "opponent_left") {
        setPhase("lobby");
        setError("El oponente abandonó la sala.");
        setBoard(Array(9).fill(0) as Cell[]);
      }

      if (msg.type === "error") {
        setError(msg["msg"] as string);
      }
    };

    ws.onclose = () => {};
  }, []);

  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  const handleCreate = () => {
    setError("");
    connect((ws) => ws.send(JSON.stringify({ type: "create", name })));
  };

  const handleJoin = () => {
    const c = inputCode.trim().toUpperCase();
    if (!c) { setError("Ingresá el código de sala."); return; }
    setError("");
    connect((ws) => ws.send(JSON.stringify({ type: "join", code: c, name })));
  };

  const handleCell = (idx: number) => {
    if (phase !== "playing" || turn !== mySymbol || board[idx] !== 0) return;
    sendWs({ type: "move", idx });
  };

  const handleRematch = () => sendWs({ type: "rematch" });

  const handleLeave = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setPhase("lobby");
    setBoard(Array(9).fill(0) as Cell[]);
    setWinner(null);
    setWinLine(null);
    setError("");
    setCode("");
    setInputCode("");
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const myName = players.find(p => p.symbol === mySymbol)?.name ?? name;
  const opponentName = players.find(p => p.symbol !== mySymbol)?.name ?? "Oponente";
  const myTurn = phase === "playing" && turn === mySymbol;
  const winnerName = winner === "draw" ? null : winner === mySymbol ? myName : opponentName;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 py-8">
      <AnimatePresence mode="wait">

        {/* ── LOBBY ─────────────────────────────────────────────── */}
        {phase === "lobby" && (
          <motion.div key="lobby"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col gap-4"
          >
            <div className="text-center">
              <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
                🌐 Multijugador
              </h2>
              <p className="text-slate-400 text-sm mt-1">Jugá con alguien en tiempo real</p>
            </div>

            {/* Mode toggle */}
            <div className="flex bg-slate-800/70 border border-slate-700 rounded-2xl p-1 gap-1">
              {([["online", "🌐 Online"], ["lan", "📡 Red Local"]] as [NetMode, string][]).map(([m, label]) => (
                <button key={m} onClick={() => setNetMode(m)}
                  className={[
                    "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                    netMode === m
                      ? "bg-slate-700 text-white shadow"
                      : "text-slate-500 hover:text-slate-300",
                  ].join(" ")}>
                  {label}
                </button>
              ))}
            </div>

            {/* LAN info */}
            {netMode === "lan" && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/8 border border-emerald-500/25 rounded-xl px-4 py-3 text-xs text-emerald-300/80 space-y-1">
                <p className="font-semibold text-emerald-300">📡 Red Local</p>
                <p>Ambos jugadores deben estar en la misma red WiFi.</p>
                <p>El juego usa el mismo servidor — creá una sala y compartí el código con alguien cerca.</p>
              </motion.div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 text-red-400 text-sm text-center">
                {error}
              </motion.div>
            )}

            {/* Name input */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex flex-col gap-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider">Tu nombre</label>
              <input
                value={name}
                onChange={e => setName(e.target.value.slice(0, 20))}
                placeholder="Tu nombre"
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <button onClick={handleCreate}
              className="w-full bg-emerald-500/10 border border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-400 font-bold py-3 rounded-2xl transition-all">
              ✚ Crear sala
            </button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-slate-600 text-xs">o unirse</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            <div className="flex gap-2">
              <input
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase().slice(0, 5))}
                placeholder="Código"
                className="flex-1 bg-slate-800/50 border border-slate-700 rounded-2xl px-3 py-3 text-slate-200 text-sm text-center font-mono tracking-widest focus:outline-none focus:border-sky-500 transition-colors"
              />
              <button onClick={handleJoin}
                className="bg-sky-500/10 border border-sky-500/40 hover:bg-sky-500/20 text-sky-400 font-bold px-5 py-3 rounded-2xl transition-all">
                Unirse
              </button>
            </div>
          </motion.div>
        )}

        {/* ── WAITING ───────────────────────────────────────────── */}
        {phase === "waiting" && (
          <motion.div key="waiting"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col items-center gap-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-200">Sala creada</h2>
              <p className="text-slate-400 text-sm mt-1">
                {netMode === "lan"
                  ? "Compartí el código con alguien en tu red WiFi"
                  : "Compartí el código con tu oponente"}
              </p>
            </div>

            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={copyCode}
              className="bg-slate-800 border-2 border-emerald-500/50 rounded-2xl px-10 py-6 flex flex-col items-center gap-2 cursor-pointer hover:border-emerald-400/70 transition-all"
            >
              <span className="text-5xl font-black font-mono tracking-widest text-emerald-400">{code}</span>
              <span className="text-xs text-slate-500">{copied ? "✓ Copiado!" : "Tocá para copiar"}</span>
            </motion.button>

            {netMode === "lan" && (
              <p className="text-xs text-slate-500 text-center">
                El otro jugador abre el juego, elige "Red Local" y pega el código.
              </p>
            )}

            <div className="flex items-center gap-3 text-slate-500 text-sm">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-emerald-500/40 border-t-emerald-400 rounded-full"
              />
              <span>Esperando oponente...</span>
            </div>

            <button onClick={handleLeave} className="text-slate-600 hover:text-slate-400 text-sm transition-colors">
              Cancelar
            </button>
          </motion.div>
        )}

        {/* ── PLAYING ───────────────────────────────────────────── */}
        {phase === "playing" && (
          <motion.div key="playing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              {players.map(p => {
                const isMe = p.symbol === mySymbol;
                const active = turn === p.symbol;
                return (
                  <div key={p.symbol}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                      active
                        ? p.symbol === 1
                          ? "bg-sky-500/10 border-sky-500/50 text-sky-300"
                          : "bg-purple-500/10 border-purple-500/50 text-purple-300"
                        : "border-transparent text-slate-500"
                    }`}
                  >
                    <span className={`font-black text-lg ${p.symbol === 1 ? "text-sky-400" : "text-purple-400"}`}>
                      {p.symbol === 1 ? "X" : "O"}
                    </span>
                    <span className="text-sm font-medium">{p.name}{isMe ? " (vos)" : ""}</span>
                    {active && <span className="text-xs animate-pulse">●</span>}
                  </div>
                );
              })}
            </div>

            <motion.div key={myTurn ? "my" : "opp"} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className={`text-center text-sm font-medium py-2 rounded-xl ${
                myTurn ? "text-emerald-300 bg-emerald-500/10" : "text-slate-400 bg-slate-800/50"
              }`}
            >
              {myTurn ? "Tu turno — elegí una celda" : `Turno de ${opponentName}...`}
            </motion.div>

            <Board board={board} winLine={winLine} onCellClick={handleCell} disabled={!myTurn} />

            <button onClick={handleLeave}
              className="text-slate-600 hover:text-slate-400 text-xs text-center transition-colors mt-2">
              Abandonar partida
            </button>
          </motion.div>
        )}

        {/* ── GAMEOVER ──────────────────────────────────────────── */}
        {phase === "gameover" && (
          <motion.div key="gameover"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col items-center gap-6"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
              className="text-7xl">
              {winner === "draw" ? "🤝" : winner === mySymbol ? "🎉" : "😅"}
            </motion.div>

            <p className={`text-3xl font-black ${winner === "draw" ? "text-yellow-400" : winner === mySymbol ? "text-emerald-400" : "text-purple-400"}`}>
              {winner === "draw" ? "¡Empate!" : `¡Ganó ${winnerName}!`}
            </p>

            <Board board={board} winLine={winLine} onCellClick={() => {}} disabled />

            <div className="flex flex-col gap-3 w-full">
              <button onClick={handleRematch}
                className="w-full bg-emerald-500/10 border border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-400 font-bold py-3 rounded-2xl transition-all">
                🔄 Revancha
              </button>
              <button onClick={handleLeave}
                className="w-full text-slate-500 hover:text-slate-300 py-2 rounded-2xl border border-transparent hover:border-slate-700 transition-all text-sm">
                Volver al lobby
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
