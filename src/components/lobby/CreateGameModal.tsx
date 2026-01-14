'use client';

import { useEffect, useMemo, useState } from 'react';

import { createInitialState } from '@/game/engine';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type Props = {
  open: boolean;
  onClose: () => void;
  canCreate: boolean;
  onCreated: () => void;
  initialIsPublic?: boolean;
  initialIsRanked?: boolean;
};

function randomCode(len = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function CreateGameModal({
  open,
  onClose,
  canCreate,
  onCreated,
  initialIsPublic,
  initialIsRanked,
}: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user, isGuest } = useAuth();

  const [isPublic, setIsPublic] = useState(initialIsPublic ?? true);
  const [isRanked, setIsRanked] = useState(initialIsRanked ?? false);
  const [bestOf, setBestOf] = useState<1 | 3 | 5>(1);

  // Guests cannot create ranked games
  const effectiveIsRanked = isGuest ? false : isRanked;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; room_code: string | null; is_public: boolean } | null>(
    null,
  );

  // Reset toggles each time the modal is opened (so "Private match" can preselect settings)
  useEffect(() => {
    if (!open) return;
    setIsPublic(initialIsPublic ?? true);
    setIsRanked(initialIsRanked ?? false);
    setBestOf(1);
    setError(null);
    setCreated(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  async function createGame() {
    setError(null);
    setCreated(null);

    if (!canCreate || !user) {
      setError('Sign in to create a game.');
      return;
    }
    if (busy) return;

    setBusy(true);
    try {
      const initial = createInitialState();
      const code = isPublic ? null : randomCode(6);

      const { data, error: insErr } = await supabase
        .from('games')
        .insert({
          red_player_id: user.id,
          black_player_id: null,
          current_turn: initial.turn,
          board_state: initial.board,
          status: 'waiting',
          winner_id: null,
          room_code: code,
          is_public: isPublic,
          is_ranked: effectiveIsRanked,
          best_of: bestOf,
        })
        .select('id, room_code, is_public')
        .maybeSingle();

      if (insErr) throw insErr;
      if (!data) throw new Error('Failed to create game.');

      const createdRow = data as { id: string; room_code: string | null; is_public: boolean };
      setCreated(createdRow);
      onCreated();

      // Public: host goes straight to the room.
      // Private: stay on the modal so the user can copy the room code.
      if (createdRow.is_public) {
        window.location.href = `/game/${createdRow.id}`;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create game.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dk-fade-in fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-[1px]">
      <div className="dk-pop-in w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-white/15 dark:bg-black">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Create game</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Create a public game (shows in the lobby) or a private match (share a 6‑char code).
            </div>
          </div>
          <button
            type="button"
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm transition-colors hover:bg-zinc-50 active:scale-[0.98] motion-reduce:transform-none dark:border-white/15 dark:bg-black dark:hover:bg-white/5"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-white/15">
            <div>
              <div className="text-sm font-medium">{isPublic ? 'Public game' : 'Private match'}</div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {isPublic
                  ? 'Appears in the lobby for anyone to join.'
                  : 'A 6‑character room code will be generated for your friend.'}
              </div>
            </div>
            <span
              className={[
                'rounded-full px-2.5 py-1 text-xs font-semibold',
                isPublic
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
              ].join(' ')}
            >
              {isPublic ? 'Public' : 'Private'}
            </span>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-white/15">
            <div>
              <div className="text-sm font-medium">Match length</div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                Best of {bestOf} (first to {Math.floor(bestOf / 2) + 1} wins).
              </div>
            </div>
            <select
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium outline-none dark:border-zinc-700 dark:bg-zinc-800"
              value={bestOf}
              onChange={(e) => setBestOf(Number(e.target.value) as 1 | 3 | 5)}
            >
              <option value={1}>Best of 1</option>
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
            </select>
          </label>

          <label className={`flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-white/15 ${isGuest ? 'opacity-50' : ''}`}>
            <div>
              <div className="text-sm font-medium">Ranked</div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {isGuest ? 'Sign in to create ranked games.' : '(Optional) mark this game as ranked.'}
              </div>
            </div>
            <input
              type="checkbox"
              checked={effectiveIsRanked}
              disabled={isGuest}
              onChange={(e) => setIsRanked(e.target.checked)}
              className="h-5 w-5 accent-zinc-900 dark:accent-zinc-100"
              title={isGuest ? 'Guests cannot create ranked games' : undefined}
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        {created && !created.is_public && created.room_code ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-white/15 dark:bg-white/5">
            <div className="font-medium">Room code</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <code className="rounded-md bg-white px-2 py-1 font-mono text-sm dark:bg-black">
                {created.room_code}
              </code>
              <button
                type="button"
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/15 dark:bg-black dark:hover:bg-white/5"
                onClick={() => void navigator.clipboard?.writeText(created.room_code ?? '')}
              >
                Copy
              </button>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/15 dark:bg-black dark:hover:bg-white/5"
                onClick={() => void navigator.clipboard?.writeText(created.room_code ?? '')}
              >
                Copy code
              </button>
              <button
                type="button"
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                onClick={() => {
                  window.location.href = `/game/${created.id}`;
                }}
              >
                Go to room
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 disabled:opacity-50 active:scale-[0.98] motion-reduce:transform-none dark:border-white/15 dark:bg-black dark:hover:bg-white/5"
            onClick={onClose}
          >
            {created && !created.is_public ? 'Close' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={busy || (!!created && !created.is_public)}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98] motion-reduce:transform-none dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            onClick={() => void createGame()}
          >
            {busy ? 'Creating…' : created && !created.is_public ? 'Created' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

