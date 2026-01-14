"use client";

import type { CSSProperties } from "react";

import type { Board as BoardT, Color, Move, Position } from "@/game/types";

function isDarkSquare(pos: Position): boolean {
  return (pos.row + pos.col) % 2 === 1;
}

function samePos(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function keyPos(p: Position): string {
  return `${p.row},${p.col}`;
}

type Props = {
  board: BoardT;
  perspective: Color;
  selected: Position | null;
  legalMoves: ReadonlyArray<Move>;
  onSquareClick: (pos: Position) => void;
  /** Optional: compact mode for fitting in viewport without scroll */
  compact?: boolean;
};

export function Board({ board, perspective, selected, legalMoves, onSquareClick, compact = false }: Props) {
  const size = board.length;

  const legalFrom = new Set<string>(legalMoves.map((m) => keyPos(m.from)));
  const legalTo = new Set<string>(
    selected ? legalMoves.filter((m) => samePos(m.from, selected)).map((m) => keyPos(m.to)) : [],
  );

  function toInternal(displayRow: number, displayCol: number): Position {
    // Flip board 180 degrees when black is at the bottom.
    if (perspective === "red") return { row: displayRow, col: displayCol };
    return { row: size - 1 - displayRow, col: size - 1 - displayCol };
  }

  // Compact mode uses smaller squares to fit viewport without scrolling
  // On mobile (portrait), use vw-based sizing for full width
  // On desktop or larger screens, use vh-based sizing to fit viewport height
  const squareSize = compact
    ? "clamp(28px, min(10.5vw, 8.5vh), 72px)"
    : "clamp(32px, 11vw, 72px)";

  return (
    <div
      className="relative inline-block max-w-full"
      style={
        {
          // Responsive square size that fits even narrow phones.
          ["--sq" as never]: squareSize,
        } as CSSProperties
      }
    >
      {/* Board frame with wood-like gradient */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-800 via-amber-900 to-amber-950 p-3 shadow-2xl sm:p-4">
        {/* Inner shadow/highlight for 3D effect */}
        <div className="rounded-xl bg-gradient-to-br from-amber-700/20 to-transparent p-0.5">
          <div
            className="grid gap-0 overflow-hidden rounded-lg shadow-inner"
            style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: size * size }).map((_, idx) => {
              const r = Math.floor(idx / size);
              const c = idx % size;
              const pos = toInternal(r, c);
              const sq = board[pos.row]?.[pos.col] ?? null;

              const dark = isDarkSquare(pos);
              const isSelected = selected ? samePos(selected, pos) : false;
              const canSelect = legalFrom.has(keyPos(pos));
              const canMoveTo = legalTo.has(keyPos(pos));

              // Premium board colors
              const squareColor = dark
                ? "bg-gradient-to-br from-emerald-800 to-emerald-900"
                : "bg-gradient-to-br from-amber-100 to-amber-200";

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => onSquareClick(pos)}
                  className={[
                    "relative aspect-square w-[var(--sq)]",
                    "flex items-center justify-center",
                    squareColor,
                    "select-none touch-manipulation",
                    "transition-all duration-150",
                    "active:brightness-95 motion-reduce:transform-none",
                    "focus:outline-none",
                    // Highlight states
                    isSelected ? "brightness-125 ring-2 ring-inset ring-yellow-400" : "",
                    canMoveTo && !isSelected ? "ring-2 ring-inset ring-yellow-400/80" : "",
                    canSelect && !isSelected && !canMoveTo ? "ring-1 ring-inset ring-yellow-300/50" : "",
                  ].join(" ")}
                  aria-label={`Square ${pos.row}, ${pos.col}`}
                >
                  {/* Square texture overlay */}
                  <div className={[
                    "absolute inset-0 opacity-30",
                    dark ? "bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent)]" : "bg-[radial-gradient(circle_at_70%_70%,rgba(0,0,0,0.05),transparent)]"
                  ].join(" ")} />

                  {sq ? (
                    <div
                      className={[
                        "relative flex items-center justify-center rounded-full",
                        "h-[calc(var(--sq)*0.75)] w-[calc(var(--sq)*0.75)]",
                        "transition-transform duration-150 motion-reduce:transform-none",
                        "hover:scale-105",
                        // Piece styling with 3D effect
                        sq.color === "red"
                          ? "bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-lg shadow-red-900/50"
                          : "bg-gradient-to-br from-zinc-600 via-zinc-700 to-zinc-800 shadow-lg shadow-black/50 dark:from-zinc-200 dark:via-zinc-300 dark:to-zinc-400 dark:shadow-zinc-500/30",
                      ].join(" ")}
                    >
                      {/* Piece highlight */}
                      <div
                        className={[
                          "absolute inset-1 rounded-full",
                          sq.color === "red"
                            ? "bg-gradient-to-br from-red-400/60 via-transparent to-transparent"
                            : "bg-gradient-to-br from-zinc-400/40 via-transparent to-transparent dark:from-white/40",
                        ].join(" ")}
                      />

                      {/* Inner ring */}
                      <div
                        className={[
                          "absolute inset-2 rounded-full border-2",
                          sq.color === "red"
                            ? "border-red-400/30"
                            : "border-zinc-500/30 dark:border-white/20",
                        ].join(" ")}
                      />

                      {/* King crown */}
                      {sq.kind === "king" && (
                        <svg
                          className={[
                            "relative h-[calc(var(--sq)*0.35)] w-[calc(var(--sq)*0.35)]",
                            sq.color === "red" ? "text-yellow-300" : "text-yellow-400 dark:text-yellow-500",
                          ].join(" ")}
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                        </svg>
                      )}
                    </div>
                  ) : canMoveTo ? (
                    <div className="relative">
                      {/* Move indicator with pulse effect */}
                      <div className="absolute inset-0 animate-ping rounded-full bg-yellow-400/40" style={{ animationDuration: '1.5s' }} />
                      <div className="relative h-[calc(var(--sq)*0.25)] w-[calc(var(--sq)*0.25)] rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-md shadow-yellow-600/30" />
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Board labels - optional coordinate markers */}
      <div className="pointer-events-none absolute -bottom-6 left-0 right-0 flex justify-around px-4 text-xs font-medium text-amber-900/60 dark:text-amber-100/40">
        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].slice(0, size).map((letter) => (
          <span key={letter}>{letter}</span>
        ))}
      </div>
      <div className="pointer-events-none absolute -left-4 bottom-0 top-0 flex flex-col justify-around py-4 text-xs font-medium text-amber-900/60 dark:text-amber-100/40">
        {Array.from({ length: size }, (_, i) => size - i).map((num) => (
          <span key={num}>{num}</span>
        ))}
      </div>
    </div>
  );
}
