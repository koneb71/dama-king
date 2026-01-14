import type { Color, GameState, Move, RulesConfig } from "./types";
import { DEFAULT_RULES } from "./types";
import { applyMove, countPieces, otherPlayer } from "./engine";
import { getLegalMoves } from "./rules";

export type AiDifficulty = "easy" | "medium" | "hard";

type ScoredMove = { move: Move; score: number };

function randInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

function evaluateMaterial(state: GameState, aiColor: Color, cfg: RulesConfig): number {
  // Material + mobility. Positive = good for AI.
  // Kings are stronger especially with flying kings.
  const kingValue = cfg.flyingKings ? 7 : 5;
  const manValue = 3;

  let red = 0;
  let black = 0;

  for (const row of state.board) {
    for (const sq of row) {
      if (!sq) continue;
      const v = sq.kind === "king" ? kingValue : manValue;
      if (sq.color === "red") red += v;
      else black += v;
    }
  }

  const material = aiColor === "red" ? red - black : black - red;

  const aiMoves = getLegalMoves(state.board, aiColor, cfg).length;
  const oppMoves = getLegalMoves(state.board, otherPlayer(aiColor), cfg).length;
  const mobility = 0.1 * (aiMoves - oppMoves);

  return material + mobility;
}

function scoreImmediate(move: Move): number {
  // Captures are the primary tactical objective; promotion is next.
  // Add a tiny random jitter to avoid repeating identical games.
  return move.captures.length * 10 + (move.promotes ? 4 : 0) + Math.random() * 0.01;
}

function minimax(
  state: GameState,
  aiColor: Color,
  depth: number,
  alpha: number,
  beta: number,
  cfg: RulesConfig,
): number {
  if (state.result.status === "finished") {
    return state.result.winner === aiColor ? 10_000 : -10_000;
  }
  if (depth <= 0) return evaluateMaterial(state, aiColor, cfg);

  const player = state.turn;
  const legal = getLegalMoves(state.board, player, cfg);
  if (legal.length === 0) {
    // Defensive: engine should mark finished, but handle anyway.
    return player === aiColor ? -10_000 : 10_000;
  }

  const maximizing = player === aiColor;
  if (maximizing) {
    let best = -Infinity;
    for (const m of legal) {
      const next = applyMove(state, m, cfg);
      const val = minimax(next, aiColor, depth - 1, alpha, beta, cfg);
      best = Math.max(best, val);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const m of legal) {
    const next = applyMove(state, m, cfg);
    const val = minimax(next, aiColor, depth - 1, alpha, beta, cfg);
    best = Math.min(best, val);
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

export function chooseAiMove(
  state: GameState,
  aiColor: Color,
  difficulty: AiDifficulty = "medium",
  cfg: RulesConfig = DEFAULT_RULES,
): Move | null {
  if (state.result.status === "finished") return null;
  if (state.turn !== aiColor) return null;

  const legal = getLegalMoves(state.board, aiColor, cfg);
  if (legal.length === 0) return null;

  if (difficulty === "easy") {
    return legal[randInt(legal.length)] ?? null;
  }

  if (difficulty === "medium") {
    // Pick among top-scoring immediate tactical moves.
    const scored = legal
      .map((m) => ({ move: m, score: scoreImmediate(m) }))
      .sort((a, b) => b.score - a.score);
    const bestScore = scored[0]!.score;
    const top = scored.filter((s) => s.score >= bestScore - 1e-6);
    return top[randInt(top.length)]!.move;
  }

  // hard: shallow minimax with immediate-move ordering
  const depth = 3;
  const ordered: ScoredMove[] = legal
    .map((m) => ({ move: m, score: scoreImmediate(m) }))
    .sort((a, b) => b.score - a.score);

  let bestMove: Move | null = null;
  let bestVal = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const { move } of ordered) {
    const next = applyMove(state, move, cfg);
    const val = minimax(next, aiColor, depth - 1, alpha, beta, cfg);
    if (val > bestVal) {
      bestVal = val;
      bestMove = move;
    }
    alpha = Math.max(alpha, bestVal);
  }

  return bestMove ?? legal[0]!;
}

export function getMaterialCounts(state: GameState): {
  red: number;
  black: number;
  redKings: number;
  blackKings: number;
} {
  const pieces = countPieces(state.board);
  let redKings = 0;
  let blackKings = 0;
  for (const row of state.board) {
    for (const sq of row) {
      if (!sq || sq.kind !== "king") continue;
      if (sq.color === "red") redKings++;
      else blackKings++;
    }
  }
  return { red: pieces.red, black: pieces.black, redKings, blackKings };
}

