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

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function checkWinner(board: Board): Player | 'draw' | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Player;
    }
  }
  if (board.every(cell => cell !== 0)) return 'draw';
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
  return board.join('');
}

export function getAvailableMoves(board: Board): number[] {
  return board.reduce<number[]>((acc, cell, idx) => {
    if (cell === 0) acc.push(idx);
    return acc;
  }, []);
}

function initQValues(board: Board): number[] {
  return board.map(cell => (cell === 0 ? 0 : -Infinity));
}

export class QLearningAgent {
  private qtable: QTable;
  private epsilon: number;
  private trainingGames: number;

  constructor(qtable: QTable = {}, trainingGames: number = 0) {
    this.qtable = qtable;
    this.trainingGames = trainingGames;
    this.epsilon = Math.max(EPSILON_MIN, EPSILON_MAX * Math.exp(-trainingGames / 500));
  }

  getQValues(state: string, board: Board): number[] {
    if (!this.qtable[state]) {
      this.qtable[state] = initQValues(board);
    }
    return this.qtable[state];
  }

  chooseAction(board: Board, explore: boolean = true): number {
    const available = getAvailableMoves(board);
    if (available.length === 0) return -1;

    if (explore && Math.random() < this.epsilon) {
      return available[Math.floor(Math.random() * available.length)];
    }

    const state = boardToState(board);
    const qvals = this.getQValues(state, board);
    let bestAction = available[0];
    let bestVal = qvals[available[0]];
    for (const move of available) {
      if (qvals[move] > bestVal) {
        bestVal = qvals[move];
        bestAction = move;
      }
    }
    return bestAction;
  }

  update(
    state: string,
    action: number,
    reward: number,
    nextBoard: Board,
    done: boolean
  ) {
    if (!this.qtable[state]) {
      this.qtable[state] = initQValues(Array(9).fill(0) as Board);
    }

    const nextState = boardToState(nextBoard);
    if (!this.qtable[nextState]) {
      this.qtable[nextState] = initQValues(nextBoard);
    }

    const currentQ = this.qtable[state][action];
    const nextMax = done ? 0 : Math.max(...this.qtable[nextState].filter(v => v !== -Infinity));
    const target = reward + GAMMA * (isFinite(nextMax) ? nextMax : 0);
    this.qtable[state][action] = currentQ + ALPHA * (target - currentQ);
  }

  getQTable(): QTable {
    return this.qtable;
  }

  getTrainingGames(): number {
    return this.trainingGames;
  }

  getEpsilon(): number {
    return this.epsilon;
  }

  incrementTrainingGames() {
    this.trainingGames++;
    this.epsilon = Math.max(EPSILON_MIN, EPSILON_MAX * Math.exp(-this.trainingGames / 500));
  }
}

export function trainEpisode(agent: QLearningAgent): 'ai' | 'random' | 'draw' {
  const board: Board = Array(9).fill(0) as Board;
  const history: { state: string; action: number; player: Player }[] = [];

  let currentPlayer: Player = 1;
  let result: 'ai' | 'random' | 'draw' = 'draw';

  while (true) {
    const available = getAvailableMoves(board);
    if (available.length === 0) break;

    const state = boardToState(board);
    let action: number;

    if (currentPlayer === 2) {
      action = agent.chooseAction(board, true);
    } else {
      action = available[Math.floor(Math.random() * available.length)];
    }

    history.push({ state, action, player: currentPlayer });
    board[action] = currentPlayer;

    const winner = checkWinner(board);
    if (winner !== null) {
      if (winner === 'draw') {
        result = 'draw';
        for (const step of history) {
          const nextBoard = board.slice() as Board;
          agent.update(step.state, step.action, 0.3, nextBoard, true);
        }
      } else {
        result = winner === 2 ? 'ai' : 'random';
        for (const step of history) {
          let reward: number;
          if (step.player === winner) {
            reward = 1.0;
          } else {
            reward = -1.0;
          }
          const nextBoard = board.slice() as Board;
          agent.update(step.state, step.action, reward, nextBoard, true);
        }
      }
      break;
    }

    currentPlayer = currentPlayer === 1 ? 2 : 1;
  }

  agent.incrementTrainingGames();
  return result;
}

export function flipBoard(board: Board): Board {
  return board.map(c => (c === 0 ? 0 : c === 1 ? 2 : 1)) as Board;
}

export type SelfPlayResult = 'x' | 'o' | 'draw';

export function trainSelfPlayEpisode(agent: QLearningAgent): SelfPlayResult {
  const board: Board = Array(9).fill(0) as Board;
  const history: { state: string; flippedState: string; action: number; player: Player }[] = [];

  let currentPlayer: Player = 1;
  let result: SelfPlayResult = 'draw';

  while (true) {
    const available = getAvailableMoves(board);
    if (available.length === 0) break;

    const state = boardToState(board);
    const flippedBoard = flipBoard(board);
    const flippedState = boardToState(flippedBoard);

    let action: number;
    if (currentPlayer === 2) {
      action = agent.chooseAction(board, true);
    } else {
      action = agent.chooseAction(flippedBoard, true);
    }

    if (!available.includes(action)) {
      action = available[Math.floor(Math.random() * available.length)];
    }

    history.push({ state, flippedState, action, player: currentPlayer });
    board[action] = currentPlayer;

    const winner = checkWinner(board);
    if (winner !== null) {
      if (winner === 'draw') {
        result = 'draw';
        for (const step of history) {
          const nb = board.slice() as Board;
          if (step.player === 2) {
            agent.update(step.state, step.action, 0.3, nb, true);
          } else {
            agent.update(step.flippedState, step.action, 0.3, flipBoard(nb), true);
          }
        }
      } else {
        result = winner === 1 ? 'x' : 'o';
        for (const step of history) {
          const reward = step.player === winner ? 1.0 : -1.0;
          const nb = board.slice() as Board;
          if (step.player === 2) {
            agent.update(step.state, step.action, reward, nb, true);
          } else {
            agent.update(step.flippedState, step.action, reward, flipBoard(nb), true);
          }
        }
      }
      break;
    }

    currentPlayer = currentPlayer === 1 ? 2 : 1;
  }

  agent.incrementTrainingGames();
  return result;
}

const STORAGE_KEY = 'ttt_qtable';
const STATS_KEY = 'ttt_stats';

export function saveAgent(agent: QLearningAgent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      qtable: agent.getQTable(),
      trainingGames: agent.getTrainingGames(),
    }));
  } catch {}
}

export function loadAgent(): QLearningAgent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return new QLearningAgent(data.qtable || {}, data.trainingGames || 0);
    }
  } catch {}
  return new QLearningAgent();
}

export function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { totalGames: 0, aiWins: 0, playerWins: 0, draws: 0, trainingGames: 0, lastUpdated: new Date().toISOString() };
}

export function saveStats(stats: GameStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify({ ...stats, lastUpdated: new Date().toISOString() }));
  } catch {}
}

const HEATMAP_KEY = 'ttt_heatmap';

export function loadHeatmap(): number[] {
  try {
    const raw = localStorage.getItem(HEATMAP_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return Array(9).fill(0);
}

export function recordMove(idx: number) {
  const h = loadHeatmap();
  h[idx] = (h[idx] || 0) + 1;
  try { localStorage.setItem(HEATMAP_KEY, JSON.stringify(h)); } catch {}
}

export function exportBrain(agent: QLearningAgent): string {
  return JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    trainingGames: agent.getTrainingGames(),
    qtable: agent.getQTable(),
  }, null, 2);
}

export function importBrain(jsonStr: string): QLearningAgent {
  const data = JSON.parse(jsonStr);
  return new QLearningAgent(data.qtable || {}, data.trainingGames || 0);
}

export interface ReplayMove {
  boardBefore: Board;
  move: number;
  player: Player;
}

export interface ReplayData {
  moves: ReplayMove[];
  result: 'player' | 'ai' | 'draw';
  savedAt: string;
}

const REPLAY_KEY = 'ttt_replay';
const ELO_KEY = 'ttt_elo';

export function saveReplay(data: ReplayData) {
  try { localStorage.setItem(REPLAY_KEY, JSON.stringify(data)); } catch {}
}

export function loadReplay(): ReplayData | null {
  try {
    const raw = localStorage.getItem(REPLAY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export interface EloData {
  player: number;
  ai: number;
  history: { player: number; ai: number; result: string; date: string }[];
}

export function loadElo(): EloData {
  try {
    const raw = localStorage.getItem(ELO_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { player: 1000, ai: 1000, history: [] };
}

export function updateElo(result: 'player' | 'ai' | 'draw'): EloData {
  const elo = loadElo();
  const K = 32;
  const expectedPlayer = 1 / (1 + Math.pow(10, (elo.ai - elo.player) / 400));
  const actualPlayer = result === 'player' ? 1 : result === 'draw' ? 0.5 : 0;
  const delta = Math.round(K * (actualPlayer - expectedPlayer));
  elo.player = Math.max(100, elo.player + delta);
  elo.ai = Math.max(100, elo.ai - delta);
  elo.history.push({ player: elo.player, ai: elo.ai, result, date: new Date().toISOString() });
  if (elo.history.length > 50) elo.history = elo.history.slice(-50);
  try { localStorage.setItem(ELO_KEY, JSON.stringify(elo)); } catch {}
  return elo;
}

export function resetAll() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STATS_KEY);
  localStorage.removeItem('ttt_heatmap');
  localStorage.removeItem(REPLAY_KEY);
  localStorage.removeItem(ELO_KEY);
}
