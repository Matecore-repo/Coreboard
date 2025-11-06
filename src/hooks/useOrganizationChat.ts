import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import supabase from '../lib/supabase';
import {
  ChatChannel,
  ChatMessage,
  createChannel,
  fetchChannels,
  fetchMessages,
  markChannelAsRead,
  sendMessage,
} from '../lib/chat';
import { toastError } from '../lib/toast';

interface UseOrganizationChatOptions {
  initialChannelId?: string | null;
  pageSize?: number;
}

interface SendMessageOptions {
  body: string;
  attachments?: unknown[];
  replyTo?: string | null;
}

interface CreateChannelOptions {
  name: string;
  type?: 'organization' | 'direct' | 'custom';
  isPrivate?: boolean;
  memberIds?: string[];
}

type RealtimeStatus = 'idle' | 'connecting' | 'subscribed' | 'error';

export function useOrganizationChat(
  orgId: string | null | undefined,
  options: UseOrganizationChatOptions = {}
) {
  const { initialChannelId = null, pageSize = 50 } = options;
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(initialChannelId);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const orgSubscription = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messagesSubscription = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const sortedChannels = useMemo(() => {
    return [...channels].sort((a, b) => a.name.localeCompare(b.name));
  }, [channels]);

  const currentChannel = useMemo(() => {
    return channels.find((c) => c.id === selectedChannelId) ?? null;
  }, [channels, selectedChannelId]);

  const handleError = useCallback((message: string, error?: unknown) => {
    console.error('[useOrganizationChat]', message, error);
    setLastError(message);
    toastError(message);
  }, []);

  const loadChannels = useCallback(async () => {
    if (!orgId || isDemoMode) {
      setChannels([]);
      return;
    }

    setLoadingChannels(true);
    try {
      const { data, error } = await fetchChannels(orgId);
      if (error) {
        handleError('No se pudieron cargar los canales', error);
        return;
      }
      setChannels(data ?? []);
      if (!selectedChannelId && data && data.length > 0) {
        setSelectedChannelId(data[0].id);
      }
    } finally {
      setLoadingChannels(false);
    }
  }, [orgId, isDemoMode, handleError, selectedChannelId]);

  const loadMessages = useCallback(
    async (channelId: string | null) => {
      if (!channelId || isDemoMode) {
        setMessages([]);
        return;
      }

      setLoadingMessages(true);
      try {
        const { data, error } = await fetchMessages(channelId, pageSize);
        if (error) {
          handleError('No se pudieron cargar los mensajes', error);
          return;
        }
        const sortedData = (data ?? []).sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(sortedData);
        await markChannelAsRead(channelId);
      } finally {
        setLoadingMessages(false);
      }
    },
    [handleError, isDemoMode, pageSize]
  );

  const upsertChannel = useCallback((channel: ChatChannel) => {
    setChannels((prev) => {
      const exists = prev.find((c) => c.id === channel.id);
      if (exists) {
        return prev.map((c) => (c.id === channel.id ? { ...c, ...channel } : c));
      }
      return [...prev, channel];
    });
  }, []);

  const removeChannel = useCallback((channelId: string) => {
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    setMessages((prev) => prev.filter((m) => m.channel_id !== channelId));
    setSelectedChannelId((current) => (current === channelId ? null : current));
  }, []);

  const upsertMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      if (message.channel_id !== selectedChannelId) {
        return prev;
      }
      const idx = prev.findIndex((m) => m.id === message.id);
      if (idx === -1) {
        return [...prev, message].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...message };
      return next.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, [selectedChannelId]);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const subscribeToOrg = useCallback(() => {
    if (!orgId || isDemoMode) return;

    setRealtimeStatus('connecting');
    orgSubscription.current?.unsubscribe();

    const channel = supabase
      .channel(`org-chat:${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_channels', filter: `org_id=eq.${orgId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            removeChannel(payload.old.id as string);
          } else if (payload.new) {
            upsertChannel(payload.new as ChatChannel);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('subscribed');
        if (status === 'CHANNEL_ERROR') setRealtimeStatus('error');
      });

    orgSubscription.current = channel;
  }, [orgId, isDemoMode, removeChannel, upsertChannel]);

  const subscribeToMessages = useCallback(
    (channelId: string | null) => {
      if (!channelId || isDemoMode) return;

      messagesSubscription.current?.unsubscribe();

      const realtimeChannel = supabase
        .channel(`chat-messages:${channelId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
          (payload) => {
            switch (payload.eventType) {
              case 'INSERT':
              case 'UPDATE':
                if (payload.new) {
                  upsertMessage(payload.new as ChatMessage);
                }
                break;
              case 'DELETE':
                if (payload.old) {
                  deleteMessage(payload.old.id as string);
                }
                break;
              default:
                break;
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            setRealtimeStatus('error');
          }
        });

      messagesSubscription.current = realtimeChannel;
    },
    [deleteMessage, isDemoMode, upsertMessage]
  );

  useEffect(() => {
    loadChannels();
    subscribeToOrg();

    return () => {
      orgSubscription.current?.unsubscribe();
      orgSubscription.current = null;
    };
  }, [loadChannels, subscribeToOrg]);

  useEffect(() => {
    if (!selectedChannelId) {
      setMessages([]);
      return;
    }

    loadMessages(selectedChannelId);
    subscribeToMessages(selectedChannelId);

    return () => {
      messagesSubscription.current?.unsubscribe();
      messagesSubscription.current = null;
    };
  }, [loadMessages, selectedChannelId, subscribeToMessages]);

  const handleSelectChannel = useCallback(
    (channelId: string) => {
      setSelectedChannelId(channelId);
    },
    []
  );

  const handleSendMessage = useCallback(
    async (channelId: string, orgUuid: string, { body, attachments = [], replyTo = null }: SendMessageOptions) => {
      try {
        const { error } = await sendMessage({
          channelId,
          orgId: orgUuid,
          body,
          attachments,
          replyTo,
        });
        if (error) {
          handleError('No se pudo enviar el mensaje', error);
        }
      } catch (error) {
        handleError('No se pudo enviar el mensaje', error);
      }
    },
    [handleError]
  );

  const handleCreateChannel = useCallback(
    async (orgUuid: string, params: CreateChannelOptions) => {
      try {
        const { error, data } = await createChannel({
          orgId: orgUuid,
          name: params.name,
          type: params.type,
          isPrivate: params.isPrivate,
          memberIds: params.memberIds,
        });
        if (error) {
          handleError('No se pudo crear el canal', error);
          return null;
        }
        const createdId = Array.isArray(data) ? data[0] : data;
        if (typeof createdId === 'string') {
          setSelectedChannelId(createdId);
        }
        return createdId;
      } catch (error) {
        handleError('No se pudo crear el canal', error);
        return null;
      }
    },
    [handleError]
  );

  return {
    channels: sortedChannels,
    currentChannel,
    messages,
    loadingChannels,
    loadingMessages,
    realtimeStatus,
    lastError,
    selectedChannelId,
    selectChannel: handleSelectChannel,
    reloadChannels: loadChannels,
    reloadMessages: loadMessages,
    sendMessage: handleSendMessage,
    createChannel: handleCreateChannel,
  };
}

export default useOrganizationChat;


