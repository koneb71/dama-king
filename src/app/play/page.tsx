"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Board } from "@/components/game/Board";
import { chooseAiMove, getMaterialCounts, type AiDifficulty } from "@/game/ai";
import { applyMove, createInitialState, moveKey, otherPlayer } from "@/game/engine";
import { getLegalMoves } from "@/game/rules";
import type { Color, GameState, Move, Position } from "@/game/types";

function samePos(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function formatTurn(c: Color): string {
  return c === "black" ? "Black" : "Red";
}

function formatResult(state: GameState): string | null {
  if (state.result.status !== "finished") return null;
  return `${formatTurn(state.result.winner)} wins (${state.result.reason.replace("_", " ")}).`;
}

function pickMoveFromTo(moves: ReadonlyArray<Move>, from: Position, to: Position): Move | null {
  const candidates = moves.filter((m) => samePos(m.from, from) && samePos(m.to, to));
  if (candidates.length === 0) return null;
  // If multiple paths land on the same destination (possible with flying kings),
  // pick the most forcing line (more captures), then promotion.
  candidates.sort((a, b) => {
    if (b.captures.length !== a.captures.length) return b.captures.length - a.captures.length;
    if (b.promotes !== a.promotes) return Number(b.promotes) - Number(a.promotes);
    return moveKey(a).localeCompare(moveKey(b));
  });
  return candidates[0] ?? null;
}

export default function LocalPlayPage() {
  const [humanColor, setHumanColor] = useState<Color>("red");
  const aiColor = otherPlayer(humanColor);

  const [difficulty, setDifficulty] = useState<AiDifficulty>("medium");
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [history, setHistory] = useState<Move[]>([]);
  const [selected, setSelected] = useState<Position | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  const aiTimer = useRef<number | null>(null);

  const legalMoves = useMemo(() => getLegalMoves(state.board, state.turn), [state.board, state.turn]);
  const myTurn = started && state.turn === humanColor && state.result.status === "active";

  const counts = useMemo(() => getMaterialCounts(state), [state]);
  const resultText = formatResult(state);

  function reset(nextHuman: Color = humanColor) {
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    aiTimer.current = null;
    setAiThinking(false);
    setSelected(null);
    setHistory([]);
    setState(createInitialState());
    setHumanColor(nextHuman);
    setStarted(false);
  }

  function startGame(nextHuman: Color = humanColor) {
    reset(nextHuman);
    setStarted(true);
  }

  // Drive AI turns.
  useEffect(() => {
    if (!started) return;
    if (state.result.status !== "active") return;
    if (state.turn !== aiColor) return;

    // Prevent stacking timers across fast re-renders.
    if (aiTimer.current) return;

    // Avoid triggering state updates synchronously inside the effect body.
    const uiTimer = window.setTimeout(() => {
      setSelected(null);
      setAiThinking(true);
    }, 0);

    aiTimer.current = window.setTimeout(() => {
      aiTimer.current = null;
      setState((cur) => {
        const m = chooseAiMove(cur, aiColor, difficulty);
        if (!m) return cur;
        setHistory((h) => [...h, m]);
        return applyMove(cur, m);
      });
      setAiThinking(false);
    }, 450);

    return () => {
      window.clearTimeout(uiTimer);
    };
  }, [aiColor, difficulty, started, state.result.status, state.turn]);

  // Cleanup timer on unmount.
  useEffect(() => {
    return () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    };
  }, []);

  function onSquareClick(pos: Position) {
    if (!started) return;
    if (!myTurn) return;

    if (!selected) {
      // Select a piece if it has any legal move.
      const hasMove = legalMoves.some((m) => samePos(m.from, pos));
      if (hasMove) setSelected(pos);
      return;
    }

    // Deselect.
    if (samePos(selected, pos)) {
      setSelected(null);
      return;
    }

    // Switch selection to another movable piece.
    const canSelect = legalMoves.some((m) => samePos(m.from, pos));
    if (canSelect) {
      setSelected(pos);
      return;
    }

    // Attempt move.
    const move = pickMoveFromTo(legalMoves, selected, pos);
    if (!move) return;

    setState((cur) => applyMove(cur, move));
    setHistory((h) => [...h, move]);
    setSelected(null);
  }

  const humanWon = state.result.status === "finished" && state.result.winner === humanColor;
  const aiWon = state.result.status === "finished" && state.result.winner === aiColor;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      <main className="mx-auto h-full max-w-7xl px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
        <div className="flex flex-col gap-3 lg:h-[calc(100vh-5.5rem)] lg:flex-row lg:gap-4">
          {/* Left Column - Board */}
          <div className="flex min-h-0 flex-col lg:flex-1">
            {/* Result Banner */}
            {state.result.status === "finished" && (
              <div
                className={[
                  "mb-2 flex items-center justify-between gap-3 rounded-xl px-4 py-3 shadow-md lg:mb-3 lg:rounded-2xl lg:px-6 lg:py-4 lg:shadow-lg",
                  humanWon
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                    : "bg-gradient-to-r from-zinc-600 to-zinc-700 text-white",
                ].join(" ")}
              >
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="text-2xl lg:text-4xl">{humanWon ? "🎉" : "🤖"}</div>
                  <div>
                    <h2 className="text-base font-bold lg:text-xl">{humanWon ? "Victory!" : "Defeated"}</h2>
                    <p className="text-xs opacity-90 lg:text-sm">
                      {humanWon ? "You outsmarted the AI!" : "The AI was too strong this time"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => reset()}
                  className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur-sm transition-all hover:bg-white/30 lg:rounded-xl lg:px-5 lg:py-2.5 lg:text-sm"
                >
                  Rematch
                </button>
              </div>
            )}

            {/* Board Area */}
            <div className="mb-4 flex flex-1 items-center justify-center lg:mb-0">
              <Board
                board={state.board}
                perspective={humanColor}
                selected={selected}
                legalMoves={myTurn ? legalMoves : []}
                onSquareClick={onSquareClick}
                compact
              />
            </div>

            {/* Turn Indicator */}
            {state.result.status === "active" && started && (
              <div className="mt-2 flex items-center justify-center gap-4 lg:mt-3">
                <div
                  className={[
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm shadow-md transition-all lg:gap-3 lg:px-5 lg:py-2.5",
                    myTurn
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                      : "border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "h-5 w-5 rounded-full shadow-inner lg:h-6 lg:w-6",
                      state.turn === "red"
                        ? "bg-gradient-to-br from-red-400 to-red-600"
                        : "bg-gradient-to-br from-zinc-600 to-zinc-800 dark:from-zinc-300 dark:to-zinc-500",
                    ].join(" ")}
                  />
                  <span className="font-semibold">
                    {myTurn ? "Your Turn" : aiThinking ? "AI Thinking..." : "Waiting..."}
                  </span>
                  {myTurn && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                    </span>
                  )}
                  {aiThinking && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Game Panel */}
          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto lg:w-[340px] lg:shrink-0 lg:gap-3">
            {/* Player vs AI Card - Compact on mobile */}
            <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-md dark:border-white/10 dark:bg-zinc-900 lg:rounded-2xl lg:shadow-lg">
              {/* VS Header */}
              <div className="flex items-stretch">
                {/* You */}
                <div className={[
                  "flex flex-1 flex-col items-center justify-center gap-1 p-2 transition-all lg:gap-2 lg:p-4",
                  myTurn ? "bg-emerald-50 dark:bg-emerald-900/20" : "",
                ].join(" ")}>
                  <div className="relative">
                    <div
                      className={[
                        "h-10 w-10 rounded-full shadow-lg ring-2 lg:h-12 lg:w-12",
                        humanColor === "red"
                          ? "bg-gradient-to-br from-red-400 to-red-600 ring-red-300/50"
                          : "bg-gradient-to-br from-zinc-600 to-zinc-800 ring-zinc-400/50 dark:from-zinc-300 dark:to-zinc-500",
                      ].join(" ")}
                    />
                    {myTurn && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-zinc-900 lg:-bottom-1 lg:-right-1 lg:h-4 lg:w-4" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold lg:text-sm">You</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 lg:text-xs">{humanColor === "red" ? "Red" : "Black"}</div>
                  </div>
                  <div className="text-xl font-bold lg:text-2xl">{humanColor === "red" ? counts.red : counts.black}</div>
                </div>

                {/* VS Divider */}
                <div className="flex flex-col items-center justify-center bg-zinc-100 px-2 dark:bg-zinc-800 lg:px-3">
                  <div className="rounded-full bg-amber-100 px-2 py-0.5 dark:bg-amber-900/30 lg:px-3 lg:py-1">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 lg:text-xs">VS</span>
                  </div>
                </div>

                {/* AI */}
                <div className={[
                  "flex flex-1 flex-col items-center justify-center gap-1 p-2 transition-all lg:gap-2 lg:p-4",
                  !myTurn && started && state.result.status === "active" ? "bg-purple-50 dark:bg-purple-900/20" : "",
                ].join(" ")}>
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg ring-2 ring-purple-300/50 lg:h-12 lg:w-12">
                      <span className="text-base lg:text-lg">🤖</span>
                    </div>
                    {!myTurn && started && state.result.status === "active" && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-purple-400 ring-2 ring-white dark:ring-zinc-900 lg:-bottom-1 lg:-right-1 lg:h-4 lg:w-4" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold lg:text-sm">AI</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 lg:text-xs">{difficulty}</div>
                  </div>
                  <div className="text-xl font-bold lg:text-2xl">{humanColor === "red" ? counts.black : counts.red}</div>
                </div>
              </div>

              {/* Game Controls */}
              <div className="border-t border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/50 lg:p-3">
                <div className="flex items-center justify-between gap-2">
                  {/* Color Toggle */}
                  <div className="flex items-center rounded-md bg-zinc-200/80 p-0.5 dark:bg-zinc-700 lg:rounded-lg lg:p-1">
                    <button
                      onClick={() => reset("red")}
                      className={[
                        "flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-all lg:gap-1.5 lg:rounded-md lg:px-3 lg:py-1.5 lg:text-xs",
                        humanColor === "red"
                          ? "bg-red-500 text-white shadow-md"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
                      ].join(" ")}
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-red-400 to-red-600 lg:h-3 lg:w-3" />
                      Red
                    </button>
                    <button
                      onClick={() => reset("black")}
                      className={[
                        "flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-all lg:gap-1.5 lg:rounded-md lg:px-3 lg:py-1.5 lg:text-xs",
                        humanColor === "black"
                          ? "bg-zinc-600 text-white shadow-md dark:bg-zinc-500"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
                      ].join(" ")}
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 dark:from-zinc-300 dark:to-zinc-500 lg:h-3 lg:w-3" />
                      Black
                    </button>
                  </div>

                  {/* Difficulty */}
                  <div className="flex items-center rounded-md bg-zinc-200/80 p-0.5 dark:bg-zinc-700 lg:rounded-lg lg:p-1">
                    {(["easy", "medium", "hard"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={[
                          "rounded px-2 py-1 text-[10px] font-medium capitalize transition-all lg:rounded-md lg:px-2.5 lg:py-1.5 lg:text-xs",
                          difficulty === d
                            ? "bg-purple-500 text-white shadow-md"
                            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
                        ].join(" ")}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Start Game Button (when not started) */}
            {!started && state.result.status !== "finished" && (
              <button
                onClick={() => startGame()}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-3 shadow-md transition-all hover:shadow-xl hover:shadow-emerald-500/25 lg:rounded-2xl lg:p-4 lg:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="relative flex items-center justify-center gap-2 lg:gap-3">
                  <svg className="h-5 w-5 text-white lg:h-6 lg:w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="text-base font-bold text-white lg:text-lg">Start Game</span>
                </div>
              </button>
            )}

            {/* New Game Button (when game over) */}
            {state.result.status === "finished" && (
              <button
                onClick={() => reset()}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-3 shadow-md transition-all hover:shadow-xl lg:rounded-2xl lg:p-4 lg:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="relative flex items-center justify-center gap-2 lg:gap-3">
                  <svg className="h-4 w-4 text-white lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-base font-bold text-white lg:text-lg">New Game</span>
                </div>
              </button>
            )}

            {/* Move History - Constrained height on mobile */}
            <div className="flex max-h-[150px] min-h-0 flex-col rounded-xl border border-zinc-200/80 bg-white p-3 shadow-md dark:border-white/10 dark:bg-zinc-900 lg:max-h-none lg:flex-1 lg:rounded-2xl lg:p-4">
              <div className="mb-2 flex items-center justify-between lg:mb-3">
                <h3 className="flex items-center gap-1.5 text-xs font-bold lg:gap-2 lg:text-sm">
                  <svg className="h-3.5 w-3.5 text-amber-500 lg:h-4 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Move History
                </h3>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 lg:px-2.5 lg:text-xs">
                  {history.length}
                </span>
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto lg:space-y-2">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-4 text-zinc-400 lg:py-8">
                    <svg className="mb-1.5 h-6 w-6 opacity-50 lg:mb-2 lg:h-8 lg:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-[10px] lg:text-xs">No moves yet</span>
                  </div>
                ) : (
                  history.map((m, idx) => {
                    const isRed = m.player === "red";
                    return (
                      <div
                        key={`${idx}-${moveKey(m)}`}
                        className="flex items-center gap-2 rounded-lg bg-zinc-50 px-2 py-1.5 dark:bg-zinc-800/50 lg:gap-3 lg:rounded-xl lg:px-3 lg:py-2"
                      >
                        <div
                          className={[
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold lg:h-6 lg:w-6 lg:text-xs",
                            isRed
                              ? "bg-gradient-to-br from-red-400 to-red-600 text-white"
                              : "bg-gradient-to-br from-zinc-600 to-zinc-800 text-white dark:from-zinc-300 dark:to-zinc-500 dark:text-zinc-800",
                          ].join(" ")}
                        >
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium lg:text-sm">
                            {m.path.map((p) => `${String.fromCharCode(97 + p.col)}${8 - p.row}`).join(" → ")}
                          </div>
                        </div>
                        {m.captures.length > 0 && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 lg:px-2 lg:text-xs">
                            ×{m.captures.length}
                          </span>
                        )}
                        {m.promotes && (
                          <span className="text-amber-500 text-sm lg:text-base">👑</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Rules */}
            <div className="flex items-center justify-center gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-1.5 text-[10px] text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400 lg:gap-4 lg:rounded-xl lg:px-4 lg:py-2 lg:text-xs">
              <span className="flex items-center gap-1">
                <span className="text-emerald-500">●</span> Forced captures
              </span>
              <span className="flex items-center gap-1">
                <span className="text-amber-500">●</span> Flying kings
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

