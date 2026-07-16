import type { GameStats } from "./qlearning";

export interface AchievementDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
  check: (stats: GameStats & { trainingGames: number }) => boolean;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "first_win",
    icon: "🏆",
    title: "Primera victoria",
    desc: "Gana tu primera partida contra la IA",
    check: s => s.playerWins >= 1,
  },
  {
    id: "win_3",
    icon: "🔥",
    title: "Racha caliente",
    desc: "Gana 3 partidas contra la IA",
    check: s => s.playerWins >= 3,
  },
  {
    id: "win_10",
    icon: "⭐",
    title: "Maestro del tablero",
    desc: "Gana 10 partidas contra la IA",
    check: s => s.playerWins >= 10,
  },
  {
    id: "play_10",
    icon: "🎮",
    title: "Jugador activo",
    desc: "Juega 10 partidas contra la IA",
    check: s => s.totalGames >= 10,
  },
  {
    id: "play_50",
    icon: "🎯",
    title: "Veterano",
    desc: "Juega 50 partidas contra la IA",
    check: s => s.totalGames >= 50,
  },
  {
    id: "draw_1",
    icon: "🤝",
    title: "Empate táctico",
    desc: "Logra un empate contra la IA",
    check: s => s.draws >= 1,
  },
  {
    id: "train_100",
    icon: "🧠",
    title: "Iniciador",
    desc: "Entrena 100 partidas",
    check: s => s.trainingGames >= 100,
  },
  {
    id: "train_1k",
    icon: "🚀",
    title: "Investigador",
    desc: "Entrena 1,000 partidas",
    check: s => s.trainingGames >= 1000,
  },
  {
    id: "train_10k",
    icon: "💡",
    title: "Científico",
    desc: "Entrena 10,000 partidas",
    check: s => s.trainingGames >= 10000,
  },
  {
    id: "train_100k",
    icon: "🤖",
    title: "IA Avanzada",
    desc: "Entrena 100,000 partidas",
    check: s => s.trainingGames >= 100000,
  },
  {
    id: "train_1m",
    icon: "🌟",
    title: "Supercerebro",
    desc: "Entrena 1,000,000 partidas",
    check: s => s.trainingGames >= 1000000,
  },
  {
    id: "ai_beats_100",
    icon: "😈",
    title: "Rival duro",
    desc: "Deja que la IA te gane 5 veces",
    check: s => s.aiWins >= 5,
  },
];

export function getUnlocked(stats: GameStats & { trainingGames: number }): Set<string> {
  return new Set(ACHIEVEMENT_DEFS.filter(a => a.check(stats)).map(a => a.id));
}
