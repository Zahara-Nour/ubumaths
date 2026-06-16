-- Fix ambiguous column reference in get_messages_paginated function
-- Migration: 20251230100002_fix_get_messages_paginated_ambiguous_column
--
-- Problem: The function declares 'conversation_id' as a return column,
-- which conflicts with the column reference in the WHERE clause.
-- PostgreSQL error: "column reference 'conversation_id' is ambiguous"
--
-- Solution: Prefix column references with table names to disambiguate.

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
  is_flagged BOOLEAN
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

  -- Return messages with pagination
  RETURN QUERY
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    p.firstname,
    p.lastname,
    p.avatar_url,
    m.content,
    m.plain_text,
    m.created_at,
    m.edited_at,
    m.is_flagged
  FROM messages m
  LEFT JOIN profiles p ON p.id = m.sender_id
  WHERE m.conversation_id = p_conversation_id
    AND m.deleted_at IS NULL
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

COMMENT ON FUNCTION get_messages_paginated IS 'Get messages with cursor-based pagination (fixed ambiguous column reference)';
