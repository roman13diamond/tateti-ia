import AsyncStorage from "@react-native-async-storage/async-storage";

export type Board = (0 | 1 | 2)[];
export type Player = 1 | 2;

export interface QTable {
  [state: string]: number[];
}

export interface GameStats {
  totalGames: number;
  aiWins: number;
  playerWins: number;
  draws: number;
  trainingGames: number;
  lastUpdated: string;
}

const ALPHA = 0.3;
const GAMMA = 0.9;
const EPSILON_MIN = 0.05;
const EPSILON_MAX = 0.9;

export const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function checkWinner(board: Board): Player | "draw" | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Player;
    }
  }
  if (board.every((c) => c !== 0)) return "draw";
  return null;
}

export function getWinLine(board: Board): number[] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

export function boardToState(board: Board): string {
  return board.join("");
}

export function getAvailableMoves(board: Board): number[] {
  return board.reduce<number[]>((acc, cell, idx) => {
    if (cell === 0) acc.push(idx);
    return acc;
  }, []);
}

function initQValues(board: Board): number[] {
  return board.map((cell) => (cell === 0 ? 0 : -Infinity));
}

export class QLearningAgent {
  private qtable: QTable;
  private epsilon: number;
  private trainingGames: number;

  constructor(qtable: QTable = {}, trainingGames = 0) {
    this.qtable = qtable;
    this.trainingGames = trainingGames;
    this.epsilon = Math.max(EPSILON_MIN, EPSILON_MAX * Math.exp(-trainingGames / 500));
  }

  getQValues(state: string, board: Board): number[] {
    if (!this.qtable[state]) this.qtable[state] = initQValues(board);
    return this.qtable[state];
  }

  chooseAction(board: Board, explore = true): number {
    const available = getAvailableMoves(board);
    if (available.length === 0) return -1;
    if (explore && Math.random() < this.epsilon) {
      return available[Math.floor(Math.random() * available.length)];
    }
    const state = boardToState(board);
    const qvals = this.getQValues(state, board);
    let best = available[0];
    let bestVal = qvals[available[0]];
    for (const move of available) {
      if (qvals[move] > bestVal) { bestVal = qvals[move]; best = move; }
    }
    return best;
  }

  update(state: string, action: number, reward: number, nextBoard: Board, done: boolean) {
    if (!this.qtable[state]) this.qtable[state] = initQValues(Array(9).fill(0) as Board);
    const nextState = boardToState(nextBoard);
    if (!this.qtable[nextState]) this.qtable[nextState] = initQValues(nextBoard);
    const currentQ = this.qtable[state][action];
    const nextMax = done ? 0 : Math.max(...this.qtable[nextState].filter((v) => v !== -Infinity));
    const target = reward + GAMMA * (isFinite(nextMax) ? nextMax : 0);
    this.qtable[state][action] = currentQ + ALPHA * (target - currentQ);
  }

  getQTable(): QTable { return this.qtable; }
  getTrainingGames(): number { return this.trainingGames; }
  getEpsilon(): number { return this.epsilon; }
  incrementTrainingGames() {
    this.trainingGames++;
    this.epsilon = Math.max(EPSILON_MIN, EPSILON_MAX * Math.exp(-this.trainingGames / 500));
  }
}

export function trainEpisode(agent: QLearningAgent) {
  const board: Board = Array(9).fill(0) as Board;
  const history: { state: string; action: number; player: Player }[] = [];
  let current: Player = 1;

  while (true) {
    const available = getAvailableMoves(board);
    if (!available.length) break;
    const state = boardToState(board);
    const action = current === 2
      ? agent.chooseAction(board, true)
      : available[Math.floor(Math.random() * available.length)];
    history.push({ state, action, player: current });
    board[action] = current;
    const winner = checkWinner(board);
    if (winner !== null) {
      for (const step of history) {
        const reward = winner === "draw" ? 0.3 : step.player === winner ? 1.0 : -1.0;
        agent.update(step.state, step.action, reward, board.slice() as Board, true);
      }
      break;
    }
    current = current === 1 ? 2 : 1;
  }
  agent.incrementTrainingGames();
}

const STORAGE_KEY = "ttt_qtable";
const STATS_KEY = "ttt_stats";

export async function saveAgent(agent: QLearningAgent) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      qtable: agent.getQTable(),
      trainingGames: agent.getTrainingGames(),
    }));
  } catch {}
}

export async function loadAgent(): Promise<QLearningAgent> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return new QLearningAgent(data.qtable || {}, data.trainingGames || 0);
    }
  } catch {}
  return new QLearningAgent();
}

export async function loadStats(): Promise<GameStats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { totalGames: 0, aiWins: 0, playerWins: 0, draws: 0, trainingGames: 0, lastUpdated: new Date().toISOString() };
}

export async function saveStats(stats: GameStats) {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify({ ...stats, lastUpdated: new Date().toISOString() }));
  } catch {}
}
