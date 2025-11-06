import supabase from './supabase';

export type ChatChannelType = 'organization' | 'direct' | 'custom';

export interface ChatChannel {
  id: string;
  org_id: string;
  type: ChatChannelType;
  name: string;
  slug: string | null;
  is_private: boolean;
  created_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  org_id: string;
  sender_id: string;
  body: string | null;
  attachments: unknown[] | null;
  reply_to: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface ChatChannelMember {
  id: string;
  channel_id: string;
  org_id: string;
  user_id: string;
  role: 'member' | 'moderator' | 'owner';
  last_read_at: string | null;
  joined_at: string;
}

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export async function fetchChannels(orgId: string) {
  if (isDemoMode) {
    return { data: [] as ChatChannel[], error: null };
  }

  return await supabase
    .from('chat_channels')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });
}

export async function fetchChannelMembers(channelId: string) {
  if (isDemoMode) {
    return { data: [] as ChatChannelMember[], error: null };
  }

  return await supabase
    .from('chat_channel_members')
    .select('*')
    .eq('channel_id', channelId)
    .order('joined_at', { ascending: true });
}

export async function fetchMessages(channelId: string, limit = 50) {
  if (isDemoMode) {
    return { data: [] as ChatMessage[], error: null };
  }

  return await supabase
    .from('chat_messages')
    .select('*')
    .eq('channel_id', channelId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);
}

interface SendMessageParams {
  channelId: string;
  orgId: string;
  body: string;
  attachments?: unknown[];
  replyTo?: string | null;
}

export async function sendMessage({ channelId, orgId, body, attachments = [], replyTo = null }: SendMessageParams) {
  if (!body.trim()) {
    throw new Error('El mensaje no puede estar vacío');
  }

  if (isDemoMode) {
    return { data: null, error: new Error('Demo mode: mensajes no persistidos') };
  }

  return await supabase
    .from('chat_messages')
    .insert({
      channel_id: channelId,
      org_id: orgId,
      body,
      attachments,
      reply_to: replyTo,
    })
    .select()
    .single();
}

interface CreateChannelParams {
  orgId: string;
  name: string;
  type?: ChatChannelType;
  isPrivate?: boolean;
  memberIds?: string[];
}

export async function createChannel({ orgId, name, type = 'organization', isPrivate = false, memberIds = [] }: CreateChannelParams) {
  if (isDemoMode) {
    return { data: null, error: new Error('Demo mode: canales no persistidos') };
  }

  return await supabase.rpc('create_chat_channel', {
    p_org_id: orgId,
    p_name: name,
    p_type: type,
    p_is_private: isPrivate,
    p_member_ids: memberIds,
  });
}

export async function markChannelAsRead(channelId: string) {
  if (isDemoMode) return { data: null, error: null };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    return { data: null, error: authError };
  }

  const userId = authData.user?.id;
  if (!userId) {
    return { data: null, error: new Error('Usuario no autenticado') };
  }

  return await supabase
    .from('chat_channel_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('channel_id', channelId)
    .eq('user_id', userId);
}


