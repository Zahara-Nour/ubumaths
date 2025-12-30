-- =============================================
-- Migration: Add message context for moderation
-- =============================================
-- Description: Function to get surrounding messages for context
-- when reviewing a reported message
--
-- Returns the reported message plus N messages before it
-- for teachers/admins to understand the context

CREATE OR REPLACE FUNCTION get_message_context_for_moderation(
  p_message_id UUID,
  p_before_count INTEGER DEFAULT 10
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
  is_reported_message BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversation_id UUID;
  v_message_created_at TIMESTAMPTZ;
BEGIN
  -- Only teachers/admins can access this
  IF NOT is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Permission denied: teachers only';
  END IF;

  -- Get the reported message's conversation and timestamp
  SELECT m.conversation_id, m.created_at
  INTO v_conversation_id, v_message_created_at
  FROM messages m
  WHERE m.id = p_message_id;

  IF v_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Return context messages (before) + the reported message
  RETURN QUERY
  WITH context_messages AS (
    -- Get messages before the reported message
    SELECT
      m.id,
      m.conversation_id,
      m.sender_id,
      p.firstname AS sender_firstname,
      p.lastname AS sender_lastname,
      p.avatar_url AS sender_avatar_url,
      -- Don't mask content for moderation context (teachers need to see it)
      m.content,
      m.plain_text,
      m.created_at,
      FALSE AS is_reported_message
    FROM messages m
    LEFT JOIN profiles p ON p.id = m.sender_id
    WHERE m.conversation_id = v_conversation_id
      AND m.created_at < v_message_created_at
      AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT p_before_count
  ),
  reported_message AS (
    -- Get the reported message itself (even if deleted, show content for moderation)
    SELECT
      m.id,
      m.conversation_id,
      m.sender_id,
      p.firstname AS sender_firstname,
      p.lastname AS sender_lastname,
      p.avatar_url AS sender_avatar_url,
      m.content,
      m.plain_text,
      m.created_at,
      TRUE AS is_reported_message
    FROM messages m
    LEFT JOIN profiles p ON p.id = m.sender_id
    WHERE m.id = p_message_id
  )
  -- Combine and order chronologically
  SELECT * FROM context_messages
  UNION ALL
  SELECT * FROM reported_message
  ORDER BY created_at ASC;
END;
$$;

COMMENT ON FUNCTION get_message_context_for_moderation IS 'Get surrounding messages for context when reviewing a reported message (teachers only)';
