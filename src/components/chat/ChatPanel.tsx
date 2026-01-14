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
    <div className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-md dark:border-white/10 dark:bg-zinc-900 lg:rounded-2xl lg:p-4">
      <div className="mb-2 flex items-center justify-between lg:mb-3">
        <h3 className="flex items-center gap-1.5 text-xs font-bold lg:gap-2 lg:text-sm">
          <svg className="h-3.5 w-3.5 text-blue-500 lg:h-4 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat
        </h3>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 lg:px-2.5 lg:text-xs">
          {messages.length}
        </span>
      </div>

      {error ? <div className="mb-2 text-[10px] text-red-600 dark:text-red-400 lg:text-xs">{error}</div> : null}

      <div
        ref={scrollRef}
        className="max-h-[80px] space-y-1.5 overflow-auto text-xs lg:max-h-[150px] lg:space-y-2"
        onScroll={() => {
          const el = scrollRef.current;
          if (!el) return;
          shouldAutoScrollRef.current = isNearBottom(el);
        }}
      >
        {loading ? (
          <div className="py-2 text-center text-[10px] text-zinc-500 lg:py-4 lg:text-xs">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-2 text-zinc-400 lg:py-4">
            <svg className="mb-1 h-5 w-5 opacity-50 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-[10px] lg:text-xs">No messages yet</span>
          </div>
        ) : (
          messages.map((m) => <ChatMessage key={m.id} message={m} isMine={!!myUserId && m.player_id === myUserId} />)
        )}
      </div>

      <div className="mt-2 flex gap-1.5 lg:mt-3 lg:gap-2">
        <input
          type="text"
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900/10 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:ring-zinc-100/20 lg:px-3 lg:py-2 lg:text-sm"
          placeholder={canChat ? 'Type a message…' : 'Sign in to chat'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!canChat}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            onSend();
          }}
        />
        <button
          type="button"
          disabled={!canChat || sending}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50 lg:px-4 lg:py-2 lg:text-sm"
          onClick={onSend}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

