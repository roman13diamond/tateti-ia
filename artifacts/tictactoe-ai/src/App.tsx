import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Game from "@/pages/Game";
import TwoPlayers from "@/pages/TwoPlayers";
import Solo from "@/pages/Solo";
import Training from "@/pages/Training";
import Stats from "@/pages/Stats";
import Lab from "@/pages/Lab";
import Online from "@/pages/Online";
import { DiscordProvider } from "@/hooks/DiscordProvider";
import { useDiscord } from "@/hooks/useDiscord";
import { getAvatarUrl } from "@/lib/discord";

const queryClient = new QueryClient();

type Tab = "home" | "game" | "twoplayers" | "solo" | "training" | "stats" | "lab" | "online";

const NAV_TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "training", label: "Entrenar", icon: "🧠" },
  { id: "stats",    label: "Stats",    icon: "📊" },
  { id: "lab",      label: "Lab",      icon: "🔬" },
];

const GAME_MODES = [
  {
    id: "game" as Tab,
    icon: "🤖",
    title: "vs IA",
    desc: "Jugá contra la inteligencia artificial Q-Learning",
    gradient: "from-sky-500 to-purple-600",
    border: "border-sky-500/30",
    bg: "bg-sky-500/5",
  },
  {
    id: "twoplayers" as Tab,
    icon: "👥",
    title: "2 Jugadores",
    desc: "Modo local — dos jugadores en el mismo dispositivo",
    gradient: "from-purple-500 to-pink-600",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
  },
  {
    id: "online" as Tab,
    icon: "🌐",
    title: "Online",
    desc: "Multijugador en línea — código de sala, jugá con quien quieras",
    gradient: "from-emerald-500 to-sky-500",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
  },
  {
    id: "solo" as Tab,
    icon: "🧩",
    title: "Puzzles",
    desc: "Modo solitario — resolvé posiciones tácticas",
    gradient: "from-yellow-500 to-orange-500",
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/5",
  },
];

function FullscreenButton() {
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      title={isFs ? "Salir de pantalla completa" : "Pantalla completa"}
      className="ml-1 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
    >
      {isFs ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
          <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M3 7V3h4"/><path d="M17 3h4v4"/>
          <path d="M21 17v4h-4"/><path d="M7 21H3v-4"/>
        </svg>
      )}
    </motion.button>
  );
}

function DiscordBadge() {
  const { ctx, inDiscord } = useDiscord();
  if (!inDiscord || !ctx) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30"
    >
      <img
        src={getAvatarUrl(ctx.user)}
        alt={ctx.user.username}
        className="w-5 h-5 rounded-full"
      />
      <span className="text-xs text-indigo-300 font-medium">
        {ctx.user.global_name ?? ctx.user.username}
      </span>
      <span className="text-xs text-indigo-500">Discord</span>
    </motion.div>
  );
}

function HomeScreen({ onSelect }: { onSelect: (t: Tab) => void }) {
  const { inDiscord, ctx } = useDiscord();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-sky-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          Ta-Te-Ti IA
        </h1>
        {inDiscord && ctx ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 mt-2"
          >
            <img
              src={getAvatarUrl(ctx.user)}
              alt={ctx.user.username}
              className="w-7 h-7 rounded-full border-2 border-indigo-500/40"
            />
            <p className="text-slate-300 text-sm">
              Hola, <span className="text-indigo-300 font-semibold">{ctx.user.global_name ?? ctx.user.username}</span> — jugando en Discord
            </p>
          </motion.div>
        ) : (
          <p className="text-slate-400 text-base">Elegí un modo de juego</p>
        )}
      </motion.div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        {GAME_MODES.map((mode, i) => (
          <motion.button
            key={mode.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 + 0.2, duration: 0.4 }}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(mode.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border ${mode.border} ${mode.bg} hover:border-opacity-60 transition-all text-left group`}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center text-2xl shadow-lg shrink-0`}>
              {mode.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-100 text-base">{mode.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{mode.desc}</p>
            </div>
            <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </motion.button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 flex gap-3 text-xs text-slate-600"
      >
        <span>🧠 IA Q-Learning</span>
        <span>·</span>
        <span>📊 Estadísticas</span>
        <span>·</span>
        <span>🔬 Laboratorio</span>
        {inDiscord && <><span>·</span><span className="text-indigo-500">Discord Activity</span></>}
      </motion.div>
    </div>
  );
}

function AppInner() {
  const [tab, setTab] = useState<Tab>("home");

  const isGameTab = tab === "game" || tab === "twoplayers" || tab === "solo" || tab === "online";
  const showBackButton = tab !== "home";

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center px-3 py-2 gap-1">
        {showBackButton && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setTab("home")}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-all mr-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            <span className="text-xs">Modos</span>
          </motion.button>
        )}

        {isGameTab && (
          <div className="flex items-center gap-0.5">
            {GAME_MODES.map(m => (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTab(m.id)}
                className={[
                  "relative px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1",
                  tab === m.id ? "text-white" : "text-slate-400 hover:text-slate-300",
                ].join(" ")}
              >
                {tab === m.id && (
                  <motion.div
                    layoutId="game-tab-bg"
                    className="absolute inset-0 bg-slate-800 rounded-xl border border-slate-700"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative">{m.icon}</span>
                <span className="relative">{m.title}</span>
              </motion.button>
            ))}
          </div>
        )}

        <div className="flex-1" />

        <DiscordBadge />

        {NAV_TABS.map(t => (
          <motion.button
            key={t.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTab(t.id)}
            className={[
              "relative px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1",
              tab === t.id ? "text-white" : "text-slate-400 hover:text-slate-300",
            ].join(" ")}
          >
            {tab === t.id && (
              <motion.div
                layoutId="tab-bg"
                className={[
                  "absolute inset-0 rounded-xl border",
                  t.id === "lab"
                    ? "bg-gradient-to-r from-green-500/20 to-sky-500/20 border-green-400/30"
                    : "bg-gradient-to-r from-sky-500/20 to-purple-500/20 border-sky-400/30",
                ].join(" ")}
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative">{t.icon}</span>
            <span className="relative">{t.label}</span>
          </motion.button>
        ))}

        <FullscreenButton />
      </nav>

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {tab === "home"       && <motion.div key="home"       initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><HomeScreen onSelect={setTab} /></motion.div>}
          {tab === "game"       && <motion.div key="game"       initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Game /></motion.div>}
          {tab === "twoplayers" && <motion.div key="twoplayers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><TwoPlayers /></motion.div>}
          {tab === "online"     && <motion.div key="online"     initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Online /></motion.div>}
          {tab === "solo"       && <motion.div key="solo"       initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Solo /></motion.div>}
          {tab === "training"   && <motion.div key="training"   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Training /></motion.div>}
          {tab === "stats"      && <motion.div key="stats"      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Stats /></motion.div>}
          {tab === "lab"        && <motion.div key="lab"        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Lab /></motion.div>}
        </AnimatePresence>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DiscordProvider>
        <AppInner />
      </DiscordProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
