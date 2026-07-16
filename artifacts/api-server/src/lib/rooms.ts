import { WebSocket } from "ws";

export type Cell = 0 | 1 | 2;
export type Board = Cell[];

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function checkWinner(board: Board): number | "draw" | null {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c])
      return board[a];
  }
  if (!board.includes(0)) return "draw";
  return null;
}

function winLine(board: Board): number[] {
  for (const ln of WIN_LINES) {
    const [a,b,c] = ln;
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c])
      return ln;
  }
  return [];
}

function makeCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

interface Player {
  ws: WebSocket;
  name: string;
  symbol: 1 | 2;
}

interface Room {
  code: string;
  players: Player[];
  board: Board;
  turn: 1 | 2;
  started: boolean;
}

const rooms = new Map<string, Room>();

function send(ws: WebSocket, msg: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(room: Room, msg: object) {
  for (const p of room.players) send(p.ws, msg);
}

function roomState(room: Room, forSymbol: 1 | 2) {
  return {
    type: "state",
    board: room.board,
    turn: room.turn,
    yourSymbol: forSymbol,
    players: room.players.map(p => ({ name: p.name, symbol: p.symbol })),
    started: room.started,
  };
}

export function handleWsClient(ws: WebSocket) {
  let myRoom: Room | null = null;
  let mySymbol: 1 | 2 | null = null;

  ws.on("message", (raw) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    const type = msg["type"] as string;

    if (type === "create") {
      const name = String(msg["name"] || "Jugador 1").slice(0, 20);
      const code = makeCode();
      const room: Room = {
        code,
        players: [{ ws, name, symbol: 1 }],
        board: [0,0,0,0,0,0,0,0,0],
        turn: 1,
        started: false,
      };
      rooms.set(code, room);
      myRoom = room;
      mySymbol = 1;
      send(ws, { type: "created", code, yourSymbol: 1, name });
      return;
    }

    if (type === "join") {
      const code = String(msg["code"] || "").toUpperCase().trim();
      const name = String(msg["name"] || "Jugador 2").slice(0, 20);
      const room = rooms.get(code);
      if (!room) { send(ws, { type: "error", msg: "Sala no encontrada." }); return; }
      if (room.players.length >= 2) { send(ws, { type: "error", msg: "La sala está llena." }); return; }
      room.players.push({ ws, name, symbol: 2 });
      myRoom = room;
      mySymbol = 2;
      room.started = true;
      // notify both
      for (const p of room.players) {
        send(p.ws, roomState(room, p.symbol));
      }
      return;
    }

    if (type === "move") {
      if (!myRoom || mySymbol === null) return;
      const room = myRoom;
      if (!room.started) return;
      if (room.turn !== mySymbol) { send(ws, { type: "error", msg: "No es tu turno." }); return; }
      const idx = Number(msg["idx"]);
      if (idx < 0 || idx > 8 || room.board[idx] !== 0) return;
      room.board[idx] = mySymbol;
      const winner = checkWinner(room.board);
      if (winner !== null) {
        const wl = winner !== "draw" ? winLine(room.board) : [];
        broadcast(room, {
          type: "gameover",
          board: room.board,
          winner,
          winLine: wl,
          players: room.players.map(p => ({ name: p.name, symbol: p.symbol })),
        });
        rooms.delete(room.code);
        return;
      }
      room.turn = room.turn === 1 ? 2 : 1;
      for (const p of room.players) send(p.ws, roomState(room, p.symbol));
      return;
    }

    if (type === "rematch") {
      if (!myRoom) return;
      const room = myRoom;
      room.board = [0,0,0,0,0,0,0,0,0];
      room.turn = 1;
      // swap symbols
      for (const p of room.players) p.symbol = p.symbol === 1 ? 2 : 1;
      room.started = true;
      for (const p of room.players) send(p.ws, roomState(room, p.symbol));
      return;
    }
  });

  ws.on("close", () => {
    if (!myRoom) return;
    const room = myRoom;
    // notify the other player
    for (const p of room.players) {
      if (p.ws !== ws) send(p.ws, { type: "opponent_left" });
    }
    rooms.delete(room.code);
  });
}
