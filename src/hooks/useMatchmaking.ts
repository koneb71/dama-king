'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type MatchmakingStatus = 'idle' | 'searching' | 'matched' | 'error';

type QueueRow = {
  player_id: string;
  rating: number;
  joined_at: string;
};

type GameRow = {
  id: string;
};

export function useMatchmaking(options?: {
  /** Rating pairing window (+/-). */
  ratingWindow?: number;
  /** Whether created games are marked ranked. */
  isRanked?: boolean;
  /** Poll interval in ms while searching. */
  pollMs?: number;
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { isAuthenticated, user } = useAuth();

  const ratingWindow = options?.ratingWindow ?? 200;
  const isRanked = options?.isRanked ?? false;
  const pollMs = options?.pollMs ?? 2500;

  const [status, setStatus] = useState<MatchmakingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueRow | null>(null);
  const [rating, setRating] = useState<number | null>(null);

  const pollRef = useRef<number | null>(null);
  const statusRef = useRef<MatchmakingStatus>('idle');

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const refreshRating = useCallback(async () => {
    if (!user) return;
    const { data, error: selErr } = await supabase
      .from('player_stats')
      .select('rating')
      .eq('player_id', user.id)
      .maybeSingle();
    if (selErr) return;
    const r = (data as { rating?: number } | null)?.rating;
    if (typeof r === 'number') setRating(r);
  }, [supabase, user]);

  const refreshQueue = useCallback(async () => {
    if (!user) return;
    const { data, error: selErr } = await supabase
      .from('matchmaking_queue')
      .select('player_id, rating, joined_at')
      .eq('player_id', user.id)
      .maybeSingle();
    if (selErr) return;
    setQueue((data as QueueRow | null) ?? null);
  }, [supabase, user]);

  const leaveQueue = useCallback(async () => {
    if (!user) return;
    await supabase.from('matchmaking_queue').delete().eq('player_id', user.id);
    setQueue(null);
  }, [supabase, user]);

  const tryMatch = useCallback(async () => {
    if (!user) return null;

    const { data, error: rpcErr } = await supabase.rpc('matchmake', {
      p_is_ranked: isRanked,
      p_rating_window: ratingWindow,
    });

    if (rpcErr) throw rpcErr;
    return (data as GameRow | null) ?? null;
  }, [isRanked, ratingWindow, supabase, user]);

  const start = useCallback(async () => {
    setError(null);

    if (!isAuthenticated || !user) {
      setStatus('error');
      setError('Sign in to use matchmaking.');
      return;
    }

    stopPolling();
    setStatus('searching');

    try {
      await refreshRating();

      const game = await tryMatch();
      await refreshQueue();

      if (game?.id) {
        setStatus('matched');
        stopPolling();
        window.location.href = `/game/${game.id}`;
        return;
      }

      // Keep attempting until matched or cancelled.
      pollRef.current = window.setInterval(() => {
        void (async () => {
          try {
            const g = await tryMatch();
            await refreshQueue();
            if (g?.id) {
              setStatus('matched');
              stopPolling();
              window.location.href = `/game/${g.id}`;
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Matchmaking failed.';
            setStatus('error');
            setError(msg);
            stopPolling();
            await leaveQueue();
          }
        })();
      }, pollMs);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Matchmaking failed.';
      setStatus('error');
      setError(msg);
      stopPolling();
      await leaveQueue();
    }
  }, [
    isAuthenticated,
    leaveQueue,
    pollMs,
    refreshQueue,
    refreshRating,
    stopPolling,
    tryMatch,
    user,
  ]);

  const cancel = useCallback(async () => {
    setError(null);
    stopPolling();
    await leaveQueue();
    setStatus('idle');
  }, [leaveQueue, stopPolling]);

  // Note: this project disallows setState within effects (even indirectly).
  // We therefore avoid "bootstrap" effects that would set rating/queue on mount.
  // State is updated only by explicit user actions (start/cancel) + polling callbacks.

  // Cleanup: if component using the hook unmounts while searching, leave the queue.
  useEffect(() => {
    return () => {
      stopPolling();
      // Best-effort cleanup; don't await.
      if (statusRef.current === 'searching') void leaveQueue();
    };
  }, [leaveQueue, stopPolling]);

  const derivedStatus: MatchmakingStatus = user ? status : 'idle';
  const derivedQueue = user ? queue : null;
  const derivedRating = user ? rating : null;
  const derivedError = user ? error : null;

  return {
    isAuthenticated,
    status: derivedStatus,
    error: derivedError,
    queue: derivedQueue,
    rating: derivedRating,
    ratingWindow,
    isRanked,
    start,
    cancel,
    refreshQueue,
  };
}

