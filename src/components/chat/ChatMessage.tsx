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
        'rounded-md px-2 py-1.5 lg:rounded-lg lg:px-3 lg:py-2',
        isMine ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-zinc-50 dark:bg-zinc-800/50',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={['text-[10px] font-medium lg:text-xs', isMine ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'].join(' ')}>
          {isMine ? 'You' : name}
        </div>
        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 lg:text-xs">{formatTime(message.created_at)}</div>
      </div>
      <div className="mt-0.5 whitespace-pre-wrap text-xs text-zinc-700 dark:text-zinc-200 lg:mt-1 lg:text-sm">{message.message}</div>
    </div>
  );
}

