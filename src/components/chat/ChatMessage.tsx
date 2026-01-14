import type { ChatMessage as ChatMessageT } from '@/hooks/useChat';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function ChatMessage({
  message,
  isMine,
}: {
  message: ChatMessageT;
  isMine: boolean;
}) {
  const name =
    message.player?.username ?? (message.player_id ? message.player_id.slice(0, 8) : '—');

  return (
    <div
      className={[
        'rounded-md border px-3 py-2',
        'border-zinc-200 dark:border-white/15',
        isMine ? 'bg-zinc-50 dark:bg-white/5' : 'bg-white dark:bg-black',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {isMine ? <span className="font-medium">You</span> : name}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{formatTime(message.created_at)}</div>
      </div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-50">{message.message}</div>
    </div>
  );
}

