import { useCallback, useEffect, useRef, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

export type ChatPlayer = {
  username: string;
  avatar_url: string | null;
};

export type ChatMessage = {
  id: string;
  game_id: string;
  player_id: string | null;
  message: string;
  created_at: string;
  player: ChatPlayer | null;
};

type ChatRowSelect = {
  id: string;
  game_id: string;
  player_id: string | null;
  message: string;
  created_at: string;
  // PostgREST embed can come back as an object or a 1-element array depending on relationship inference.
  players?: { username: string; avatar_url: string | null } | { username: string; avatar_url: string | null }[] | null;
};

type PlayerRow = { id: string; username: string; avatar_url: string | null };

function normalizeRow(row: ChatRowSelect): ChatMessage {
  const embedded = Array.isArray(row.players) ? (row.players[0] ?? null) : (row.players ?? null);
  return {
    id: row.id,
    game_id: row.game_id,
    player_id: row.player_id,
    message: row.message,
    created_at: row.created_at,
    player: embedded ? { username: embedded.username, avatar_url: embedded.avatar_url } : null,
  };
}

async function fetchPlayersByIds(supabase: SupabaseClient, ids: string[]): Promise<Map<string, ChatPlayer>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from('players')
    .select('id, username, avatar_url')
    .in('id', ids)
    .limit(ids.length);
  if (error) throw error;
  const map = new Map<string, ChatPlayer>();
  for (const row of (data as PlayerRow[] | null) ?? []) {
    map.set(row.id, { username: row.username, avatar_url: row.avatar_url });
  }
  return map;
}

export function useChat(args: { supabase: SupabaseClient; gameId: string; userId?: string | null }) {
  const { supabase, gameId, userId } = args;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const playerCacheRef = useRef<Map<string, ChatPlayer>>(new Map());

  const canChat = !!userId;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: selErr } = await supabase
        .from('chat_messages')
        .select('id, game_id, player_id, message, created_at, players(username, avatar_url)')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (selErr) throw selErr;

      const normalized = ((data as ChatRowSelect[] | null) ?? []).map(normalizeRow);
      setMessages(normalized);

      for (const m of normalized) {
        if (m.player_id && m.player) playerCacheRef.current.set(m.player_id, m.player);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load chat.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [gameId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: new messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as Omit<ChatMessage, 'player'> & { player?: never };
          const cached = row.player_id ? playerCacheRef.current.get(row.player_id) ?? null : null;
          setMessages((cur) => {
            if (cur.some((m) => m.id === row.id)) return cur;
            return [
              ...cur,
              {
                id: row.id,
                game_id: row.game_id,
                player_id: row.player_id,
                message: row.message,
                created_at: row.created_at,
                player: cached,
              },
            ];
          });

          // If we don't know the sender yet, fetch their profile (best-effort).
          if (row.player_id && !cached) {
            void (async () => {
              try {
                const map = await fetchPlayersByIds(supabase, [row.player_id!]);
                const p = map.get(row.player_id!) ?? null;
                if (!p) return;
                playerCacheRef.current.set(row.player_id!, p);
                setMessages((cur) =>
                  cur.map((m) => (m.player_id === row.player_id && !m.player ? { ...m, player: p } : m)),
                );
              } catch {
                // ignore
              }
            })();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, supabase]);

  const send = useCallback(async () => {
    if (!userId) return;
    const text = draft.trim();
    if (!text) return;
    if (sending) return;

    setError(null);
    setSending(true);
    try {
      const { error: insErr } = await supabase.from('chat_messages').insert({
        game_id: gameId,
        player_id: userId,
        message: text,
      });
      if (insErr) throw insErr;
      setDraft('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send message.';
      setError(msg);
    } finally {
      setSending(false);
    }
  }, [draft, gameId, sending, supabase, userId]);

  const myUsername = userId ? playerCacheRef.current.get(userId)?.username ?? null : null;

  return {
    canChat,
    loading,
    error,
    messages,
    draft,
    setDraft,
    sending,
    send,
    reload: load,
    myUsername,
  };
}

