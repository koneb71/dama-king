export type Color = "red" | "black";

export type PieceKind = "man" | "king";

export type Position = Readonly<{
  row: number;
  col: number;
}>;

export type Piece = Readonly<{
  color: Color;
  kind: PieceKind;
}>;

export type Square = Piece | null;

export type Board = ReadonlyArray<ReadonlyArray<Square>>;

/**
 * A complete move for a single turn.
 * - `path` includes the origin and each landing square in order.
 * - `captures` are the positions of opponent pieces removed (in order captured).
 */
export type Move = Readonly<{
  player: Color;
  from: Position;
  to: Position;
  path: ReadonlyArray<Position>;
  captures: ReadonlyArray<Position>;
  promotes: boolean;
}>;

export type GameStatus = "waiting" | "active" | "finished";

export type GameResult = Readonly<
  | { status: "active" | "waiting" }
  | { status: "finished"; winner: Color; reason: "no_pieces" | "no_moves" }
>;

export type GameState = Readonly<{
  board: Board;
  turn: Color;
  result: GameResult;
}>;

export type RulesConfig = Readonly<{
  boardSize: number; // expected 8
  mandatoryCapture: boolean;
  /**
   * If true, kings "fly" (move any distance diagonally on empty squares).
   * If false, kings move 1 diagonal step (American checkers style).
   */
  flyingKings: boolean;
  /**
   * If true, men may capture backwards (common in international/Filipino variants).
   * Men still only move forwards for non-capture moves.
   */
  menCaptureBackward: boolean;
  /**
   * Capture selection policy when multiple capture moves exist.
   * - "any": any capture is legal
   * - "max": only moves with the maximum number of captures are legal
   */
  capturePriority: "any" | "max";
  /**
   * Promotion timing.
   * - false: promote only after the whole move (including multi-capture) ends
   * - true: if a man reaches the back rank during a capture sequence, it becomes a king immediately
   */
  promoteMidTurn: boolean;
}>;

export const DEFAULT_RULES: RulesConfig = {
  boardSize: 8,
  mandatoryCapture: true,
  flyingKings: true,
  menCaptureBackward: true,
  capturePriority: "any",
  promoteMidTurn: false,
};

