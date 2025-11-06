import { useMemo } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { ChatChannel, ChatChannelType } from '../../lib/chat';

interface MemberOption {
  id: string;
  label: string;
  initials: string;
}

interface ChatSidebarProps {
  channels: ChatChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel: (params: { name: string; type: ChatChannelType; isPrivate: boolean; memberIds?: string[] }) => Promise<void>;
  members: MemberOption[];
  loading: boolean;
  currentUserId?: string;
}

export function ChatSidebar({
  channels,
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
  members,
  loading,
  currentUserId,
}: ChatSidebarProps) {
  const organizedChannels = useMemo(() => {
    const conversations = channels.filter((c) => !c.is_private);
    const privateConversations = channels.filter((c) => c.is_private);
    return { conversations, privateConversations };
  }, [channels]);

  const handleCreateChannel = async () => {
    const name = window.prompt('Nombre para el nuevo canal');
    if (!name) return;
    await onCreateChannel({ name, type: 'custom', isPrivate: false });
  };

  const handleDirectChat = async (memberId: string, label: string) => {
    if (!currentUserId || memberId === currentUserId) return;
    await onCreateChannel({
      name: label,
      type: 'direct',
      isPrivate: true,
      memberIds: [memberId],
    });
  };

  const renderBubble = (opts: { id: string; label: string; subtitle?: string | null; active: boolean; onClick: () => void }) => (
    <button
      key={opts.id}
      onClick={opts.onClick}
      className={`flex min-w-[84px] snap-start flex-col items-center gap-2 rounded-2xl px-2 py-1.5 transition-all hover:text-primary ${
        opts.active ? 'text-primary drop-shadow-sm' : 'text-muted-foreground'
      }`}
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-sm font-semibold ${
          opts.active ? 'border-primary/60 bg-primary/10' : ''
        }`}
      >
        {opts.label
          .split(' ')
          .filter(Boolean)
          .map((word) => word.charAt(0).toUpperCase())
          .slice(0, 2)
          .join('') || opts.label.charAt(0).toUpperCase()}
      </span>
      <span className="text-[11px] font-medium leading-tight text-center line-clamp-2">
        {opts.label}
      </span>
      {opts.subtitle ? (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
          {opts.subtitle}
        </span>
      ) : null}
    </button>
  );

  const renderMemberChip = (member: MemberOption) => (
    <button
      key={member.id}
      onClick={() => handleDirectChat(member.id, member.label)}
      className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
    >
      <Avatar className="h-8 w-8 border">
        <AvatarFallback className="text-[11px] font-semibold uppercase">{member.initials}</AvatarFallback>
      </Avatar>
      <span className="whitespace-nowrap">{member.label}</span>
    </button>
  );

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/80">Chats</h3>
          <p className="text-xs text-muted-foreground/70">Conversaciones de la organización y directos</p>
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={handleCreateChannel}
          title="Crear canal"
          className="rounded-full border-dashed"
        >
          +
        </Button>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground/80">
            <span>Canales</span>
            {loading && <span className="animate-pulse">Cargando…</span>}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [-ms-overflow-style:none]" style={{ scrollSnapType: 'x proximity' }}>
            <span className="invisible h-0 w-1" aria-hidden="true"></span>
            {organizedChannels.conversations.length === 0 && !loading ? (
              <div className="flex min-w-[180px] snap-start flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground/70">
                No hay canales aún.
                <Button variant="ghost" size="sm" className="mt-2" onClick={handleCreateChannel}>
                  Crear canal
                </Button>
              </div>
            ) : (
              organizedChannels.conversations.map((channel) =>
                renderBubble({
                  id: channel.id,
                  label: channel.name,
                  subtitle: channel.slug ? `#${channel.slug}` : null,
                  active: selectedChannelId === channel.id,
                  onClick: () => onSelectChannel(channel.id),
                })
              )
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-medium uppercase text-muted-foreground/80">Accesos rápidos</div>
          <div className="flex flex-wrap gap-2">
            {members.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay miembros disponibles.</p>
            ) : (
              members.slice(0, 6).map(renderMemberChip)
            )}
          </div>
        </div>

        {organizedChannels.privateConversations.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-medium uppercase text-muted-foreground/80">Directos recientes</div>
            <div className="flex flex-col gap-2">
              {organizedChannels.privateConversations.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm transition hover:border-primary/40 hover:text-primary ${
                    selectedChannelId === channel.id ? 'border-primary/50 text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border">
                      <AvatarFallback>
                        {channel.name
                          .split(' ')
                          .filter(Boolean)
                          .map((word) => word.charAt(0).toUpperCase())
                          .slice(0, 2)
                          .join('') || channel.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium leading-tight">{channel.name}</span>
                  </span>
                  <Badge variant="outline" className="border-border/60 text-[10px] uppercase tracking-wide">
                    Privado
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatSidebar;


