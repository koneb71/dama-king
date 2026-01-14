import type { Board, Color, GameResult, GameState, Move, Piece, Position, RulesConfig, Square } from "./types";
import { DEFAULT_RULES } from "./types";
import { cloneBoard, getLegalMoves, getSquare, inBounds, promotionRow } from "./rules";

export function createEmptyBoard(cfg: RulesConfig = DEFAULT_RULES): Square[][] {
  const b: Square[][] = [];
  for (let r = 0; r < cfg.boardSize; r++) {
    const row: Square[] = [];
    for (let c = 0; c < cfg.boardSize; c++) row.push(null);
    b.push(row);
  }
  return b;
}

function isDarkSquare(pos: Position): boolean {
  // Standard checkers coloring: dark squares are where (row + col) is odd.
  return (pos.row + pos.col) % 2 === 1;
}

export function createInitialBoard(cfg: RulesConfig = DEFAULT_RULES): Board {
  const board = createEmptyBoard(cfg);

  // Standard 8x8 start: 3 rows each side on dark squares.
  // black at top (rows 0..2), red at bottom (rows 5..7).
  const place = (pos: Position, piece: Piece) => {
    if (!inBounds(pos, cfg)) return;
    if (!isDarkSquare(pos)) return;
    board[pos.row]![pos.col] = piece;
  };

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < cfg.boardSize; c++) {
      place({ row: r, col: c }, { color: "black", kind: "man" });
    }
  }
  for (let r = cfg.boardSize - 3; r < cfg.boardSize; r++) {
    for (let c = 0; c < cfg.boardSize; c++) {
      place({ row: r, col: c }, { color: "red", kind: "man" });
    }
  }

  return board;
}

export function createInitialState(cfg: RulesConfig = DEFAULT_RULES): GameState {
  // Common convention: black moves first.
  return {
    board: createInitialBoard(cfg),
    turn: "black",
    result: { status: "active" },
  };
}

export function otherPlayer(c: Color): Color {
  return c === "red" ? "black" : "red";
}

export function applyMove(state: GameState, move: Move, cfg: RulesConfig = DEFAULT_RULES): GameState {
  if (state.result.status === "finished") return state;
  if (move.player !== state.turn) return state;

  // Validate move is currently legal (defensive; UI can pre-filter).
  const legal = getLegalMoves(state.board, state.turn, cfg);
  const key = moveKey(move);
  const legalMove = legal.find((m) => moveKey(m) === key);
  if (!legalMove) return state;

  const board = cloneBoard(state.board);
  const from = legalMove.from;
  const piece = getSquare(state.board, from);
  if (!piece) return state;

  // Apply piece movement and captures.
  board[from.row]![from.col] = null;
  for (const cap of legalMove.captures) {
    board[cap.row]![cap.col] = null;
  }

  let nextPiece: Piece = piece;
  if (piece.kind === "man" && legalMove.promotes) {
    nextPiece = { color: piece.color, kind: "king" };
  }
  board[legalMove.to.row]![legalMove.to.col] = nextPiece;

  const nextTurn = otherPlayer(state.turn);
  const nextState: GameState = {
    board,
    turn: nextTurn,
    result: { status: "active" },
  };

  const result = computeResult(nextState, cfg);
  return { ...nextState, result };
}

export function computeResult(state: GameState, cfg: RulesConfig = DEFAULT_RULES): GameResult {
  // If opponent has no pieces, current player (whose turn it is) wins by no_pieces?
  // More intuitive: the player who *just moved* caused opponent to have no pieces.
  // Here we evaluate from the perspective of "player to move"; if they have no pieces/moves, they lose.

  const toMove = state.turn;
  const pieces = countPieces(state.board);
  if (pieces[toMove] === 0) {
    return { status: "finished", winner: otherPlayer(toMove), reason: "no_pieces" };
  }

  const legal = getLegalMoves(state.board, toMove, cfg);
  if (legal.length === 0) {
    return { status: "finished", winner: otherPlayer(toMove), reason: "no_moves" };
  }

  return { status: "active" };
}

export function countPieces(board: Board): Record<Color, number> {
  const counts: Record<Color, number> = { red: 0, black: 0 };
  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      counts[sq.color]++;
    }
  }
  return counts;
}

export function moveKey(m: Move): string {
  // Stable signature for equality checks.
  const path = m.path.map((p) => `${p.row},${p.col}`).join("->");
  const caps = m.captures.map((p) => `${p.row},${p.col}`).join("|");
  return `${m.player}:${path}:${caps}:${m.promotes ? "P" : "-"}`;
}

export function isPromotionSquare(color: Color, pos: Position, cfg: RulesConfig = DEFAULT_RULES): boolean {
  return pos.row === promotionRow(color, cfg);
}

