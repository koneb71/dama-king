import { useEffect, useMemo, useRef } from 'react';

import { ChatMessage } from '@/components/chat/ChatMessage';
import type { ChatMessage as ChatMessageT } from '@/hooks/useChat';

function isNearBottom(el: HTMLElement, thresholdPx = 80): boolean {
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
  return distance <= thresholdPx;
}

export function ChatPanel({
  messages,
  loading,
  error,
  draft,
  setDraft,
  canChat,
  sending,
  onSend,
  myUserId,
}: {
  messages: ChatMessageT[];
  loading: boolean;
  error: string | null;
  draft: string;
  setDraft: (next: string) => void;
  canChat: boolean;
  sending: boolean;
  onSend: () => void;
  myUserId?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const countLabel = useMemo(() => `${messages.length} message${messages.length === 1 ? '' : 's'}`, [messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!shouldAutoScrollRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-white/15 dark:bg-black">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Chat</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">{countLabel}</div>
      </div>

      {error ? <div className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</div> : null}

      <div
        ref={scrollRef}
        className="mt-3 max-h-[40vh] space-y-2 overflow-auto text-sm lg:max-h-[260px]"
        onScroll={() => {
          const el = scrollRef.current;
          if (!el) return;
          shouldAutoScrollRef.current = isNearBottom(el);
        }}
      >
        {loading ? (
          <div className="text-zinc-600 dark:text-zinc-400">Loading chat…</div>
        ) : messages.length === 0 ? (
          <div className="text-zinc-600 dark:text-zinc-400">No messages yet.</div>
        ) : (
          messages.map((m) => <ChatMessage key={m.id} message={m} isMine={!!myUserId && m.player_id === myUserId} />)
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <textarea
          rows={2}
          className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/20 disabled:opacity-70 dark:border-white/15 dark:bg-black dark:focus:ring-zinc-100/20"
          placeholder={canChat ? 'Type a message…' : 'Sign in to chat…'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!canChat}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            if (e.shiftKey) return; // newline
            e.preventDefault();
            onSend();
          }}
        />
        <button
          type="button"
          disabled={!canChat || sending}
          className="h-[52px] rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98] motion-reduce:transform-none dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
          onClick={onSend}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

