import type { Board } from "./qlearning";

export interface Puzzle {
  id: number;
  title: string;
  description: string;
  hint: string;
  board: Board;
  solution: number;
  difficulty: "fácil" | "medio" | "difícil";
}

export const PUZZLES: Puzzle[] = [
  {
    id: 1,
    title: "Victoria en 1",
    description: "Sos X. Ganás en un movimiento.",
    hint: "Completá la fila superior.",
    board: [1, 1, 0, 2, 0, 2, 0, 0, 0],
    solution: 2,
    difficulty: "fácil",
  },
  {
    id: 2,
    title: "Columna ganadora",
    description: "Sos X. Completá la columna.",
    hint: "La columna izquierda está casi completa.",
    board: [1, 2, 0, 1, 2, 0, 0, 0, 0],
    solution: 6,
    difficulty: "fácil",
  },
  {
    id: 3,
    title: "Diagonal perfecta",
    description: "Sos X. Una diagonal te da la victoria.",
    hint: "Seguí la diagonal principal.",
    board: [1, 2, 0, 0, 1, 2, 0, 0, 0],
    solution: 8,
    difficulty: "fácil",
  },
  {
    id: 4,
    title: "Ataque doble",
    description: "Sos X. Ganás aunque la IA bloquee.",
    hint: "Jugá en el centro para crear dos amenazas.",
    board: [1, 0, 0, 0, 0, 0, 0, 0, 2],
    solution: 4,
    difficulty: "medio",
  },
  {
    id: 5,
    title: "Prioridades",
    description: "Sos X. Podés ganar o dejar ganar a O.",
    hint: "No bloqueés — ¡ganás vos!",
    board: [2, 2, 0, 1, 1, 0, 0, 0, 0],
    solution: 5,
    difficulty: "medio",
  },
  {
    id: 6,
    title: "Diagonal oculta",
    description: "Sos X. Hay una diagonal que no es obvia.",
    hint: "La anti-diagonal también cuenta.",
    board: [0, 2, 1, 0, 1, 2, 0, 0, 0],
    solution: 6,
    difficulty: "medio",
  },
  {
    id: 7,
    title: "Trampa de esquinas",
    description: "Sos X. La IA tiene esquinas opuestas. ¿Cómo evitás la trampa?",
    hint: "Jugá un borde, no una esquina.",
    board: [2, 0, 0, 0, 1, 0, 0, 0, 2],
    solution: 1,
    difficulty: "difícil",
  },
  {
    id: 8,
    title: "Forking maestro",
    description: "Sos X. Un movimiento crea dos formas de ganar.",
    hint: "Mirá las diagonales juntas.",
    board: [1, 2, 0, 0, 0, 0, 0, 2, 1],
    solution: 4,
    difficulty: "difícil",
  },
];
