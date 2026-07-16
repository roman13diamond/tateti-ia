import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  loadStats,
  loadAgent,
  loadHeatmap,
  exportBrain,
  importBrain,
  saveAgent,
  saveStats,
  resetAll,
} from "@/lib/qlearning";
import { ACHIEVEMENT_DEFS, getUnlocked } from "@/lib/achievements";

type Section = "stats" | "heatmap" | "achievements" | "cerebro";

export default function Stats() {
  const [activeSection, setActiveSection] = useState<Section>("stats");
  const [stats, setStats] = useState(loadStats);
  const agent = loadAgent();
  const trainingGames = agent.getTrainingGames();
  const epsilon = agent.getEpsilon();
  const qtableSize = Object.keys(agent.getQTable()).length;
  const heatmap = loadHeatmap();
  const unlockedIds = getUnlocked({ ...stats, trainingGames });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const total = stats.totalGames;
  const winPct = total > 0 ? Math.round((stats.playerWins / total) * 100) : 0;
  const aiPct = total > 0 ? Math.round((stats.aiWins / total) * 100) : 0;
  const drawPct = total > 0 ? Math.round((stats.draws / total) * 100) : 0;

  const handleReset = () => {
    if (!confirm("¿Resetear toda la memoria de la IA y estadísticas?")) return;
    resetAll();
    setStats(loadStats());
    window.location.reload();
  };

  const handleExport = () => {
    const json = exportBrain(agent);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ttt-cerebro-ia-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const newAgent = importBrain(ev.target?.result as string);
        saveAgent(newAgent);
        const newStats = loadStats();
        newStats.trainingGames = newAgent.getTrainingGames();
        saveStats(newStats);
        setImportMsg(`Cerebro importado: ${newAgent.getTrainingGames().toLocaleString()} partidas`);
        setTimeout(() => setImportMsg(null), 4000);
      } catch {
        setImportMsg("Error: archivo inválido");
        setTimeout(() => setImportMsg(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const maxHeat = Math.max(...heatmap, 1);
  const cellNames = ["↖", "↑", "↗", "←", "·", "→", "↙", "↓", "↘"];

  const sections: { id: Section; label: string }[] = [
    { id: "stats", label: "Resumen" },
    { id: "heatmap", label: "Heatmap" },
    { id: "achievements", label: "Logros" },
    { id: "cerebro", label: "Cerebro IA" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-8 px-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-purple-500 bg-clip-text text-transparent">
          Estadísticas
        </h1>
      </motion.div>

      <div className="flex gap-1 mb-6 bg-slate-800/60 p-1 rounded-xl border border-slate-700">
        {sections.map(s => (
          <motion.button
            key={s.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveSection(s.id)}
            className={[
              "relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              activeSection === s.id ? "text-white" : "text-slate-400 hover:text-slate-300",
            ].join(" ")}
          >
            {activeSection === s.id && (
              <motion.div
                layoutId="stats-tab"
                className="absolute inset-0 bg-gradient-to-r from-sky-500/20 to-purple-500/20 rounded-lg border border-sky-400/30"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative">{s.label}</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeSection === "stats" && (
          <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-xl space-y-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-4">Partidas vs IA</p>
              <p className="text-5xl font-bold text-center text-slate-100 mb-6">{total}</p>
              <div className="space-y-4">
                {[
                  { label: "Tus victorias", pct: winPct, count: stats.playerWins, color: "from-sky-500 to-sky-400" },
                  { label: "Victorias IA", pct: aiPct, count: stats.aiWins, color: "from-purple-500 to-purple-400" },
                  { label: "Empates", pct: drawPct, count: stats.draws, color: "from-yellow-500 to-yellow-400" },
                ].map(({ label, pct, count, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">{label}</span>
                      <span className="font-medium text-slate-300">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full bg-gradient-to-r ${color} rounded-full`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Entrenamiento", val: trainingGames.toLocaleString(), sub: "partidas totales", color: "text-purple-400" },
                { label: "Estados aprendidos", val: qtableSize.toLocaleString(), sub: "entradas Q-table", color: "text-sky-400" },
                { label: "Exploración (ε)", val: `${(epsilon * 100).toFixed(1)}%`, sub: "movimientos aleatorios", color: "text-yellow-400" },
                { label: "Inteligencia", val: `${Math.min(100, Math.round((1 - epsilon) * 100))}%`, sub: "movimientos óptimos", color: "text-green-400" },
              ].map(({ label, val, sub, color }) => (
                <div key={label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                  <p className={`text-2xl font-bold ${color}`}>{val}</p>
                  <p className="text-sm text-slate-300 mt-0.5">{label}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Curva de aprendizaje</p>
              <div className="flex items-end gap-0.5 h-20">
                {Array.from({ length: 24 }, (_, i) => {
                  const progress = Math.min(1, trainingGames / (400 * (i + 1)));
                  const height = Math.round(8 + progress * 92);
                  return (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: i * 0.025, duration: 0.5, ease: "easeOut" }}
                      className="flex-1 rounded-t bg-gradient-to-t from-purple-600 to-sky-500 opacity-80"
                    />
                  );
                })}
              </div>
              <p className="text-xs text-slate-600 mt-2 text-center">
                Con más entrenamiento la IA mejora su estrategia
              </p>
            </div>

            {stats.lastUpdated && (
              <p className="text-xs text-slate-600 text-center">
                Actualizado: {new Date(stats.lastUpdated).toLocaleString("es-AR")}
              </p>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleReset}
              className="w-full px-6 py-2.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-all"
            >
              Resetear memoria y estadísticas
            </motion.button>
          </motion.div>
        )}

        {activeSection === "heatmap" && (
          <motion.div key="heatmap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-xs">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3 text-center">
              Mapa de movimientos jugados
            </p>
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 mb-4">
              <div className="grid grid-cols-3 gap-2">
                {heatmap.map((count, idx) => {
                  const intensity = count / maxHeat;
                  const opacity = 0.1 + intensity * 0.85;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className="aspect-square rounded-xl flex flex-col items-center justify-center relative overflow-hidden border border-slate-600/50"
                      style={{ background: `rgba(139, 92, 246, ${opacity})` }}
                    >
                      <span className="text-xs text-slate-400 absolute top-1 left-2">{cellNames[idx]}</span>
                      <p className="text-xl font-bold text-white">{count}</p>
                      <p className="text-xs text-slate-300/60">{maxHeat > 0 ? Math.round(intensity * 100) : 0}%</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center">
              Más oscuro = más jugadas en esa celda (IA + jugador combinado)
            </p>
            <div className="flex items-center gap-2 mt-3 justify-center">
              <div className="w-16 h-2 rounded-full bg-gradient-to-r from-purple-900/30 to-purple-500" />
              <span className="text-xs text-slate-500">poca → mucha actividad</span>
            </div>
            <p className="text-xs text-slate-600 mt-4 text-center">
              Total de movimientos registrados: {heatmap.reduce((a, b) => a + b, 0).toLocaleString()}
            </p>
          </motion.div>
        )}

        {activeSection === "achievements" && (
          <motion.div key="achievements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-xl">
            <p className="text-xs text-slate-500 text-center mb-4">
              {unlockedIds.size} / {ACHIEVEMENT_DEFS.length} desbloqueados
            </p>
            <div className="w-full bg-slate-700 rounded-full h-1.5 mb-6">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(unlockedIds.size / ACHIEVEMENT_DEFS.length) * 100}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-gradient-to-r from-sky-500 to-purple-500 rounded-full"
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              {ACHIEVEMENT_DEFS.map(a => {
                const unlocked = unlockedIds.has(a.id);
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={[
                      "flex items-center gap-3 p-3 rounded-xl border transition-all",
                      unlocked
                        ? "bg-slate-800/80 border-yellow-400/30"
                        : "bg-slate-800/30 border-slate-700/50 opacity-50",
                    ].join(" ")}
                  >
                    <span className={`text-2xl ${!unlocked && "grayscale"}`}>{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${unlocked ? "text-slate-100" : "text-slate-500"}`}>
                        {a.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{a.desc}</p>
                    </div>
                    {unlocked && (
                      <span className="text-xs text-yellow-400 font-medium shrink-0">✓</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeSection === "cerebro" && (
          <motion.div key="cerebro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-xs space-y-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 text-center">
              <p className="text-4xl mb-2">🧠</p>
              <p className="text-xl font-bold text-slate-100">{qtableSize.toLocaleString()} estados</p>
              <p className="text-sm text-slate-400 mt-1">aprendidos en {trainingGames.toLocaleString()} partidas</p>
              <p className="text-xs text-slate-500 mt-1">ε = {(epsilon * 100).toFixed(2)}% de exploración</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Exportar cerebro</p>
              <p className="text-xs text-slate-400">Descargá la Q-table completa como archivo JSON para guardarlo o compartirlo.</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleExport}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-purple-600 text-white font-semibold text-sm shadow-lg"
              >
                Descargar cerebro (.json)
              </motion.button>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Importar cerebro</p>
              <p className="text-xs text-slate-400">Cargá un cerebro exportado anteriormente para restaurar el aprendizaje.</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-slate-700/80 border border-slate-600 text-slate-200 font-semibold text-sm"
              >
                Cargar archivo .json
              </motion.button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
              <AnimatePresence>
                {importMsg && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`text-xs text-center font-medium ${importMsg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}
                  >
                    {importMsg}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="border-t border-slate-700/50 pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleReset}
                className="w-full px-6 py-2.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-all"
              >
                Resetear todo
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
