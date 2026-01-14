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
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
          {/* Left Column - Board & Game Info */}
          <div className="space-y-4">
            {/* Header Card */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">Play vs AI</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Practice mode • Local game</p>
                  </div>
                </div>
                {started ? (
                  <button
                    onClick={() => reset()}
                    className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    New Game
                  </button>
                ) : (
                  <button
                    onClick={() => startGame()}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Game
                  </button>
                )}
              </div>
            </div>

            {/* Start Banner */}
            {!started && (
              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/80 p-5 shadow-lg backdrop-blur-sm dark:border-emerald-500/20 dark:bg-emerald-900/10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">Ready?</h2>
                    <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-300/80">
                      Choose your color and difficulty, then press <span className="font-semibold">Start Game</span>.
                      Black moves first.
                    </p>
                  </div>
                  <button
                    onClick={() => startGame()}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
                  >
                    Start Game
                  </button>
                </div>
              </div>
            )}

            {/* Result Banner */}
            {state.result.status === "finished" && (
              <div
                className={[
                  "rounded-2xl p-6 text-center shadow-lg",
                  humanWon
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                    : "bg-gradient-to-r from-zinc-600 to-zinc-700 text-white",
                ].join(" ")}
              >
                <div className="text-4xl mb-2">{humanWon ? "🎉" : "🤖"}</div>
                <h2 className="text-2xl font-bold">
                  {humanWon ? "You Won!" : "AI Wins!"}
                </h2>
                <p className="mt-1 opacity-90">
                  {humanWon ? "Great job defeating the AI!" : "The AI outsmarted you this time"}
                </p>
                <button
                  onClick={() => reset()}
                  className="mt-4 rounded-lg bg-white/20 px-6 py-2 font-semibold backdrop-blur-sm transition-all hover:bg-white/30"
                >
                  Play Again
                </button>
              </div>
            )}

            {/* Board */}
            <div className="flex justify-center">
              <Board
                board={state.board}
                perspective={humanColor}
                selected={selected}
                legalMoves={myTurn ? legalMoves : []}
                onSquareClick={onSquareClick}
              />
            </div>

            {/* Turn Indicator */}
            {state.result.status === "active" && started && (
              <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        "h-10 w-10 rounded-full shadow-lg",
                        state.turn === "red"
                          ? "bg-gradient-to-br from-red-500 to-red-700 ring-4 ring-red-200 dark:ring-red-900/50"
                          : "bg-gradient-to-br from-zinc-700 to-zinc-900 ring-4 ring-zinc-300 dark:from-zinc-300 dark:to-zinc-500 dark:ring-zinc-700",
                      ].join(" ")}
                    />
                    <div>
                      <div className="font-semibold">
                        {myTurn ? "Your turn!" : `${formatTurn(state.turn)}'s turn`}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        {myTurn
                          ? "Select a piece to move"
                          : aiThinking
                            ? "AI is thinking..."
                            : "Waiting for AI..."}
                      </div>
                    </div>
                  </div>
                  {myTurn && (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                      </span>
                      <span className="text-sm font-medium">Make your move</span>
                    </div>
                  )}
                  {aiThinking && (
                    <div className="flex items-center gap-2 text-zinc-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Settings & Info */}
          <div className="space-y-4">
            {/* Game Settings */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        "h-8 w-8 rounded-full shadow",
                        humanColor === "red"
                          ? "bg-gradient-to-br from-red-500 to-red-700"
                          : "bg-gradient-to-br from-zinc-700 to-zinc-900 dark:from-zinc-300 dark:to-zinc-500",
                      ].join(" ")}
                    />
                    <span className="font-medium">You play as</span>
                  </div>
                  <select
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium outline-none dark:border-zinc-700 dark:bg-zinc-800"
                    value={humanColor}
                    onChange={(e) => reset(e.target.value as Color)}
                  >
                    <option value="red">Red</option>
                    <option value="black">Black</option>
                  </select>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="font-medium">AI Difficulty</span>
                  </div>
                  <select
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium outline-none dark:border-zinc-700 dark:bg-zinc-800"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as AiDifficulty)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Material Count */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Material
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-red-50 p-4 text-center dark:bg-red-900/20">
                  <div className="flex justify-center">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-lg" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">{counts.red}</div>
                  <div className="text-xs text-red-600/70 dark:text-red-400/70">{counts.redKings} kings</div>
                </div>
                <div className="rounded-xl bg-zinc-100 p-4 text-center dark:bg-zinc-800">
                  <div className="flex justify-center">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-lg dark:from-zinc-300 dark:to-zinc-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-zinc-700 dark:text-zinc-300">{counts.black}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{counts.blackKings} kings</div>
                </div>
              </div>
            </div>

            {/* Move History */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Move History
                </h3>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {history.length} moves
                </span>
              </div>
              <div className="max-h-[300px] space-y-2 overflow-auto">
                {history.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-400">No moves yet</p>
                ) : (
                  history.map((m, idx) => {
                    const isRed = m.player === "red";
                    return (
                      <div
                        key={`${idx}-${moveKey(m)}`}
                        className="flex items-center gap-3 rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-800/50"
                      >
                        <div
                          className={[
                            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white",
                            isRed
                              ? "bg-gradient-to-br from-red-500 to-red-600"
                              : "bg-gradient-to-br from-zinc-600 to-zinc-800 dark:from-zinc-400 dark:to-zinc-600",
                          ].join(" ")}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {m.path.map((p) => `(${p.row},${p.col})`).join(" → ")}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            {m.captures.length > 0 && (
                              <span className="text-amber-600 dark:text-amber-400">
                                ⚔️ {m.captures.length} captured
                              </span>
                            )}
                            {m.promotes && (
                              <span className="text-purple-600 dark:text-purple-400">
                                👑 Promoted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Rules Info */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Rules
              </h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Mandatory captures
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Flying kings
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Men capture backward
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

