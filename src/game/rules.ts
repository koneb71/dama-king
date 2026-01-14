import type { Board, Color, Move, Piece, Position, RulesConfig, Square } from "./types";
import { DEFAULT_RULES } from "./types";

const DIAGONALS: ReadonlyArray<Readonly<{
  dr: number;
  dc: number;
}>> = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
];

export function inBounds(pos: Position, cfg: RulesConfig = DEFAULT_RULES): boolean {
  return pos.row >= 0 && pos.row < cfg.boardSize && pos.col >= 0 && pos.col < cfg.boardSize;
}

export function getSquare(board: Board, pos: Position): Square {
  return board[pos.row]?.[pos.col] ?? null;
}

export function cloneBoard(board: Board): Square[][] {
  return board.map((row) => row.slice()) as Square[][];
}

export function isOpponent(a: Piece, b: Piece): boolean {
  return a.color !== b.color;
}

export function forwardDirections(color: Color): ReadonlyArray<{ dr: number; dc: number }> {
  // Convention: row 0 is "top".
  // - black starts at top and moves down (+1).
  // - red starts at bottom and moves up (-1).
  const dr = color === "black" ? 1 : -1;
  return [
    { dr, dc: -1 },
    { dr, dc: 1 },
  ];
}

export function promotionRow(color: Color, cfg: RulesConfig = DEFAULT_RULES): number {
  return color === "black" ? cfg.boardSize - 1 : 0;
}

export function wouldPromote(piece: Piece, landing: Position, cfg: RulesConfig = DEFAULT_RULES): boolean {
  if (piece.kind === "king") return false;
  return landing.row === promotionRow(piece.color, cfg);
}

export function getLegalMoves(
  board: Board,
  player: Color,
  cfg: RulesConfig = DEFAULT_RULES,
): ReadonlyArray<Move> {
  const captureMoves: Move[] = [];
  const quietMoves: Move[] = [];

  for (let r = 0; r < cfg.boardSize; r++) {
    for (let c = 0; c < cfg.boardSize; c++) {
      const piece = board[r]?.[c] ?? null;
      if (!piece || piece.color !== player) continue;
      const from: Position = { row: r, col: c };

      const capturesForPiece = generateCaptures(board, from, piece, cfg);
      if (capturesForPiece.length > 0) {
        captureMoves.push(...capturesForPiece);
      } else {
        quietMoves.push(...generateNonCaptures(board, from, piece, cfg));
      }
    }
  }

  if (cfg.mandatoryCapture && captureMoves.length > 0) {
    if (cfg.capturePriority === "max") {
      const max = Math.max(...captureMoves.map((m) => m.captures.length));
      return captureMoves.filter((m) => m.captures.length === max);
    }
    return captureMoves;
  }

  return [...captureMoves, ...quietMoves];
}

function generateNonCaptures(board: Board, from: Position, piece: Piece, cfg: RulesConfig): Move[] {
  if (piece.kind === "man") {
    const moves: Move[] = [];
    for (const { dr, dc } of forwardDirections(piece.color)) {
      const to: Position = { row: from.row + dr, col: from.col + dc };
      if (!inBounds(to, cfg)) continue;
      if (getSquare(board, to) !== null) continue;
      moves.push({
        player: piece.color,
        from,
        to,
        path: [from, to],
        captures: [],
        promotes: wouldPromote(piece, to, cfg),
      });
    }
    return moves;
  }

  // King
  return cfg.flyingKings
    ? generateFlyingKingSlides(board, from, piece, cfg)
    : generateStepKingSlides(board, from, piece, cfg);
}

function generateStepKingSlides(board: Board, from: Position, piece: Piece, cfg: RulesConfig): Move[] {
  const moves: Move[] = [];
  for (const { dr, dc } of DIAGONALS) {
    const to: Position = { row: from.row + dr, col: from.col + dc };
    if (!inBounds(to, cfg)) continue;
    if (getSquare(board, to) !== null) continue;
    moves.push({
      player: piece.color,
      from,
      to,
      path: [from, to],
      captures: [],
      promotes: false,
    });
  }
  return moves;
}

function generateFlyingKingSlides(board: Board, from: Position, piece: Piece, cfg: RulesConfig): Move[] {
  const moves: Move[] = [];
  for (const { dr, dc } of DIAGONALS) {
    let step = 1;
    while (true) {
      const to: Position = { row: from.row + dr * step, col: from.col + dc * step };
      if (!inBounds(to, cfg)) break;
      if (getSquare(board, to) !== null) break;
      moves.push({
        player: piece.color,
        from,
        to,
        path: [from, to],
        captures: [],
        promotes: false,
      });
      step++;
    }
  }
  return moves;
}

function generateCaptures(board: Board, from: Position, piece: Piece, cfg: RulesConfig): Move[] {
  const startPath: Position[] = [from];
  const startCaptures: Position[] = [];
  const startBoard = cloneBoard(board);

  return piece.kind === "king"
    ? dfsKingCaptures(startBoard, from, piece, startPath, startCaptures, cfg)
    : dfsManCaptures(startBoard, from, piece, startPath, startCaptures, cfg);
}

function manCaptureDirections(piece: Piece, cfg: RulesConfig): ReadonlyArray<{ dr: number; dc: number }> {
  if (cfg.menCaptureBackward) return DIAGONALS;
  return forwardDirections(piece.color);
}

function dfsManCaptures(
  board: Square[][],
  pos: Position,
  piece: Piece,
  path: Position[],
  captures: Position[],
  cfg: RulesConfig,
): Move[] {
  const moves: Move[] = [];
  let foundExtension = false;

  for (const { dr, dc } of manCaptureDirections(piece, cfg)) {
    const mid: Position = { row: pos.row + dr, col: pos.col + dc };
    const landing: Position = { row: pos.row + dr * 2, col: pos.col + dc * 2 };
    if (!inBounds(mid, cfg) || !inBounds(landing, cfg)) continue;

    const midSq = board[mid.row]?.[mid.col] ?? null;
    if (!midSq || midSq.color === piece.color) continue;
    if ((board[landing.row]?.[landing.col] ?? null) !== null) continue;

    foundExtension = true;

    // Apply capture on a cloned board for this branch
    const nextBoard = cloneBoard(board);
    nextBoard[pos.row]![pos.col] = null;
    nextBoard[mid.row]![mid.col] = null;

    const landedPromotes = wouldPromote(piece, landing, cfg);
    const nextPiece: Piece =
      piece.kind === "king"
        ? piece
        : cfg.promoteMidTurn && landedPromotes
          ? { color: piece.color, kind: "king" }
          : piece;

    nextBoard[landing.row]![landing.col] = nextPiece;

    const nextPath = [...path, landing];
    const nextCaptures = [...captures, mid];

    const continuations =
      nextPiece.kind === "king"
        ? dfsKingCaptures(nextBoard, landing, nextPiece, nextPath, nextCaptures, cfg)
        : dfsManCaptures(nextBoard, landing, nextPiece, nextPath, nextCaptures, cfg);

    moves.push(...continuations);
  }

  if (!foundExtension && captures.length > 0) {
    const to = path[path.length - 1]!;
    const promotes = !cfg.promoteMidTurn && wouldPromote(piece, to, cfg);
    moves.push({
      player: piece.color,
      from: path[0]!,
      to,
      path,
      captures,
      promotes,
    });
  }

  return moves;
}

function dfsKingCaptures(
  board: Square[][],
  pos: Position,
  piece: Piece,
  path: Position[],
  captures: Position[],
  cfg: RulesConfig,
): Move[] {
  const moves: Move[] = [];
  let foundExtension = false;

  for (const { dr, dc } of DIAGONALS) {
    // Scan outward to find the first piece in this diagonal.
    let step = 1;
    let victimPos: Position | null = null;

    while (true) {
      const cur: Position = { row: pos.row + dr * step, col: pos.col + dc * step };
      if (!inBounds(cur, cfg)) break;
      const sq = board[cur.row]?.[cur.col] ?? null;
      if (sq === null) {
        step++;
        continue;
      }

      // Hit a piece.
      if (sq.color === piece.color) {
        victimPos = null;
      } else {
        victimPos = cur;
      }
      break;
    }

    if (!victimPos) continue;

    // After victim, any empty square is a legal landing (until blocked).
    let landingStep = step + 1;
    while (true) {
      const landing: Position = {
        row: pos.row + dr * landingStep,
        col: pos.col + dc * landingStep,
      };
      if (!inBounds(landing, cfg)) break;
      const landingSq = board[landing.row]?.[landing.col] ?? null;
      if (landingSq !== null) break; // blocked

      foundExtension = true;

      const nextBoard = cloneBoard(board);
      nextBoard[pos.row]![pos.col] = null;
      nextBoard[victimPos.row]![victimPos.col] = null;
      nextBoard[landing.row]![landing.col] = piece;

      const nextPath = [...path, landing];
      const nextCaptures = [...captures, victimPos];

      const continuations = dfsKingCaptures(nextBoard, landing, piece, nextPath, nextCaptures, cfg);
      moves.push(...continuations);

      landingStep++;
    }
  }

  if (!foundExtension && captures.length > 0) {
    const to = path[path.length - 1]!;
    moves.push({
      player: piece.color,
      from: path[0]!,
      to,
      path,
      captures,
      promotes: false,
    });
  }

  return moves;
}

