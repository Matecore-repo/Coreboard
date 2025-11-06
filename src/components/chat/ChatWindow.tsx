import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '../ui/utils';
import type { ChatChannel, ChatMessage } from '../../lib/chat';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';

interface MemberDirectory {
  [userId: string]: {
    label: string;
  };
}

interface ChatWindowProps {
  orgId?: string | null;
  currentChannel: ChatChannel | null;
  messages: ChatMessage[];
  loading: boolean;
  onSendMessage: (channelId: string, params: { body: string; attachments?: unknown[]; replyTo?: string | null }) => Promise<void>;
  realtimeStatus: 'idle' | 'connecting' | 'subscribed' | 'error';
  memberDirectory: MemberDirectory;
  currentUserId?: string;
  className?: string;
}

export function ChatWindow({
  orgId,
  currentChannel,
  messages,
  loading,
  onSendMessage,
  realtimeStatus,
  memberDirectory,
  currentUserId,
  className,
}: ChatWindowProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const viewRef = useRef<HTMLDivElement | null>(null);

  const statusLabel = useMemo(() => {
    switch (realtimeStatus) {
      case 'connecting':
        return 'Conectando...';
      case 'subscribed':
        return 'En tiempo real';
      case 'error':
        return 'Sin conexión';
      default:
        return 'Sincronización pausada';
    }
  }, [realtimeStatus]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.scrollTop = viewRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async () => {
    if (!currentChannel || !orgId || !draft.trim()) return;

    try {
      setSending(true);
      await onSendMessage(currentChannel.id, { body: draft.trim() });
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm', className)}>
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {currentChannel ? currentChannel.name : 'Selecciona un canal'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {currentChannel?.is_private ? 'Chat privado' : 'Canal de la organización'}
          </p>
        </div>
        <Badge variant={realtimeStatus === 'error' ? 'destructive' : 'outline'} className="text-[11px] uppercase tracking-wide">
          {statusLabel}
        </Badge>
      </div>

      <ScrollArea className="flex-1 px-5">
        <div ref={viewRef} className="flex min-h-full flex-col gap-3 py-4">
          {loading && <p className="text-xs text-muted-foreground">Cargando mensajes...</p>}
          {!loading && messages.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-12 text-center text-sm text-muted-foreground">
              No hay mensajes todavía. ¡Escribe el primero!
            </div>
          )}

          {messages.map((message) => {
            const isOwn = message.sender_id === currentUserId;
            const sender = memberDirectory[message.sender_id]?.label ?? 'Miembro';
            return (
              <div
                key={message.id}
                className={`flex flex-col gap-1 ${isOwn ? 'items-end text-right' : 'items-start text-left'}`}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{sender}</span>
                  <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div
                  className={`max-w-full rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
                    isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  }`}
                >
                  {message.body}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t border-border/60 px-5 py-4">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentChannel ? 'Escribe un mensaje y presiona Enter para enviar' : 'Selecciona un canal para escribir'}
          disabled={!currentChannel || sending}
          className="min-h-[80px] resize-none"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={handleSubmit} disabled={!currentChannel || !draft.trim() || sending}>
            {sending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;


