'use client';

import { useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type Props = {
  open: boolean;
  onClose: () => void;
  onJoined: () => void;
};

function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function JoinByCodeModal({ open, onClose, onJoined }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { isLoading: authLoading, isAuthenticated, signInAsGuest } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function join() {
    setError(null);
    const c = normalizeCode(code);
    if (c.length !== 6) {
      setError('Enter a 6-character room code.');
      return;
    }
    if (busy) return;

    setBusy(true);
    try {
      // If not authenticated, sign in as guest first (best UX).
      if (!isAuthenticated) {
        await signInAsGuest();
      }

      // Uses a security-definer RPC so private rooms can be joined by code even
      // when the row is not selectable under RLS.
      const { data, error: joinErr } = await supabase.rpc('join_game_by_code', {
        p_room_code: c,
      });
      if (joinErr) throw joinErr;

      const joined = data as { id: string } | null;
      if (!joined?.id) throw new Error('Game not joinable.');

      onJoined();
      window.location.href = `/game/${joined.id}`;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to join by code.';
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
            <div className="text-sm font-medium">Join by code</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Enter the 6-character room code from your friend.
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

        <div className="mt-4 flex gap-2">
          <input
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-sm tracking-widest uppercase outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-white/15 dark:bg-black dark:focus:ring-zinc-100/20"
            placeholder="ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={12}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="button"
            disabled={busy || authLoading}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98] motion-reduce:transform-none dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            onClick={() => void join()}
          >
            {busy ? 'Joining…' : 'Join'}
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        {!authLoading && !isAuthenticated ? (
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            Not signed in? We’ll automatically sign you in as a guest to join.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 active:scale-[0.98] motion-reduce:transform-none dark:border-white/15 dark:bg-black dark:hover:bg-white/5"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

