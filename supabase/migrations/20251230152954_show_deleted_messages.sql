-- =============================================
-- Migration: Show deleted messages in chat
-- =============================================
-- Description: Modify get_messages_paginated to return deleted messages
-- with masked content, so they appear as "Message supprimé par un modérateur"
--
-- Changes:
-- - Add deleted_at to return type
-- - Remove filter on deleted_at IS NULL
-- - Return NULL for content/plain_text when message is deleted

-- Must drop first because return type is changing
DROP FUNCTION IF EXISTS get_messages_paginated(UUID, INTEGER, UUID, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_messages_paginated(
  p_conversation_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_before_id UUID DEFAULT NULL,
  p_before_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  sender_firstname TEXT,
  sender_lastname TEXT,
  sender_avatar_url TEXT,
  content JSONB,
  plain_text TEXT,
  created_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  is_flagged BOOLEAN,
  deleted_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is a participant (prefix with table name to avoid ambiguity)
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
    AND cp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not a participant in this conversation';
  END IF;

  -- Return messages with pagination (including deleted messages with masked content)
  RETURN QUERY
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    p.firstname,
    p.lastname,
    p.avatar_url,
    -- Mask content for deleted messages
    CASE WHEN m.deleted_at IS NOT NULL THEN NULL ELSE m.content END,
    CASE WHEN m.deleted_at IS NOT NULL THEN NULL ELSE m.plain_text END,
    m.created_at,
    m.edited_at,
    m.is_flagged,
    m.deleted_at
  FROM messages m
  LEFT JOIN profiles p ON p.id = m.sender_id
  WHERE m.conversation_id = p_conversation_id
    -- No longer filter out deleted messages
    -- Cursor-based pagination
    AND (
      p_before_timestamp IS NULL
      OR m.created_at < p_before_timestamp
      OR (m.created_at = p_before_timestamp AND m.id < p_before_id)
    )
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_messages_paginated IS 'Get messages with cursor-based pagination (includes deleted messages with masked content)';
