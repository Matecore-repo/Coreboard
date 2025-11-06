-- Módulo de chat organizacional
-- Crea tablas para canales, miembros y mensajes, además de políticas RLS y una función auxiliar

-- ============================================================================
-- 1. TABLAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('organization', 'direct', 'custom')) DEFAULT 'organization',
  name text NOT NULL,
  slug text,
  is_private boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, slug) WHERE slug IS NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_org ON public.chat_channels(org_id);

CREATE TABLE IF NOT EXISTS public.chat_channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'owner')),
  last_read_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_channel_members_channel ON public.chat_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user ON public.chat_channel_members(user_id);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  body text,
  attachments jsonb DEFAULT '[]'::jsonb,
  reply_to uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created_at ON public.chat_messages(channel_id, created_at DESC);

-- ============================================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Canales
CREATE POLICY "Chat channels visible for org members" ON public.chat_channels
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
    )
    AND (
      NOT is_private
      OR EXISTS (
        SELECT 1 FROM public.chat_channel_members m
        WHERE m.channel_id = chat_channels.id AND m.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Chat channels insert" ON public.chat_channels
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'employee')
    )
  );

CREATE POLICY "Chat channels update" ON public.chat_channels
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = chat_channels.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Chat channels delete" ON public.chat_channels
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = chat_channels.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

-- Miembros de canales
CREATE POLICY "Chat channel members select" ON public.chat_channel_members
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Chat channel members manage" ON public.chat_channel_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = chat_channel_members.channel_id
        AND c.org_id IN (
          SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
        )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = chat_channel_members.channel_id
        AND c.org_id IN (
          SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
        )
    )
  );

-- Mensajes
CREATE POLICY "Chat messages select" ON public.chat_messages
  FOR SELECT USING (
    channel_id IN (
      SELECT channel_id FROM public.chat_channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Chat messages insert" ON public.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_channel_members m
      WHERE m.channel_id = chat_messages.channel_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Chat messages update" ON public.chat_messages
  FOR UPDATE USING (
    sender_id = auth.uid()
  );

CREATE POLICY "Chat messages delete" ON public.chat_messages
  FOR DELETE USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = chat_messages.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 3. FUNCIÓN AUXILIAR PARA CREAR CANALES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_chat_channel(
  p_org_id uuid,
  p_name text,
  p_type text DEFAULT 'organization',
  p_is_private boolean DEFAULT false,
  p_member_ids uuid[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel_id uuid;
  v_requester uuid := auth.uid();
BEGIN
  IF v_requester IS NULL THEN
    RAISE EXCEPTION 'Auth UID requerido';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.org_id = p_org_id
      AND m.user_id = v_requester
      AND m.role IN ('owner', 'admin', 'employee')
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para crear canales en esta organización';
  END IF;

  INSERT INTO public.chat_channels(org_id, name, type, is_private, created_by)
  VALUES (p_org_id, p_name, COALESCE(p_type, 'organization'), COALESCE(p_is_private, false), v_requester)
  RETURNING id INTO v_channel_id;

  INSERT INTO public.chat_channel_members(channel_id, org_id, user_id, role)
  VALUES (v_channel_id, p_org_id, v_requester, 'owner')
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  INSERT INTO public.chat_channel_members(channel_id, org_id, user_id, role)
  SELECT v_channel_id, p_org_id, member_id, 'member'
  FROM unnest(COALESCE(p_member_ids, '{}')) AS member_id
  WHERE member_id IS NOT NULL
    AND member_id <> v_requester
    AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = p_org_id AND m.user_id = member_id
    )
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  RETURN v_channel_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_chat_channel(uuid, text, text, boolean, uuid[]) TO authenticated;

-- ============================================================================
-- 4. TRIGGERS DE ACTUALIZACIÓN DE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_chat_channel_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_channels_updated_at ON public.chat_channels;
CREATE TRIGGER trg_chat_channels_updated_at
  BEFORE UPDATE ON public.chat_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.set_chat_channel_updated_at();


