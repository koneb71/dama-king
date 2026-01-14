'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type SiteStats = {
  live_games: number;
  open_public_games: number;
  players_total: number;
  players_online_estimate: number;
};

let _statsCache: SiteStats | null = null;
let _pollStarted = false;
let _pollTimer: number | null = null;
let _listeners: Array<(s: SiteStats | null) => void> = [];
let _supabaseSingleton: ReturnType<typeof getSupabaseBrowserClient> | null = null;

async function _pollOnce() {
  if (!_supabaseSingleton) _supabaseSingleton = getSupabaseBrowserClient();
  const { data, error } = await _supabaseSingleton.rpc('site_stats');
  if (error) return;
  _statsCache = (data as SiteStats) ?? null;
  for (const fn of _listeners) fn(_statsCache);
}

export function __subscribeSiteStatsForCta(onChange: (s: SiteStats | null) => void) {
  _listeners = [..._listeners, onChange];
  onChange(_statsCache);

  if (!_pollStarted) {
    _pollStarted = true;
    void _pollOnce();
    _pollTimer = window.setInterval(() => void _pollOnce(), 4000);
  }

  return () => {
    _listeners = _listeners.filter((x) => x !== onChange);
    if (_listeners.length === 0 && _pollTimer !== null) {
      window.clearInterval(_pollTimer);
      _pollTimer = null;
      _pollStarted = false;
    }
  };
}

