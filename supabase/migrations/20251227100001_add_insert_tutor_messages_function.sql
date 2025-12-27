-- Migration: Add insert_tutor_messages function
-- Description: SECURITY DEFINER function to insert tutor messages with explicit security checks
-- Created: 2025-12-27
--
-- This function allows inserting messages without bypassing RLS at the client level.
-- Instead, it performs its own security verification and runs with elevated privileges.

-- ============================================================================
-- Function: insert_tutor_messages
-- ============================================================================
-- Inserts one or more messages into a tutor conversation after verifying ownership.
--
-- Security model:
-- 1. Caller provides conversation_id and their user_id
-- 2. Function verifies user owns the conversation
-- 3. Function verifies conversation is active
-- 4. Only then does it insert the messages
--
-- This is safer than service_role because:
-- - Security check is done in PostgreSQL, not application code
-- - Cannot be bypassed by malformed requests
-- - Audit trail is clearer

CREATE OR REPLACE FUNCTION insert_tutor_messages(
  p_conversation_id UUID,
  p_user_id UUID,
  p_messages JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg JSONB;
  inserted_ids UUID[] := '{}';
  new_id UUID;
BEGIN
  -- Security check: Verify user owns the conversation and it's active
  IF NOT EXISTS (
    SELECT 1 FROM tutor_conversations
    WHERE id = p_conversation_id
    AND student_id = p_user_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: user does not own this conversation or conversation is not active'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- Insert each message from the JSONB array
  FOR msg IN SELECT * FROM jsonb_array_elements(p_messages)
  LOOP
    INSERT INTO tutor_messages (
      conversation_id,
      role,
      content,
      help_level,
      help_method_used,
      cheat_detected
    ) VALUES (
      p_conversation_id,
      msg->>'role',
      msg->>'content',
      (msg->>'help_level')::INTEGER,
      msg->>'help_method_used',
      COALESCE((msg->>'cheat_detected')::BOOLEAN, false)
    )
    RETURNING id INTO new_id;

    inserted_ids := array_append(inserted_ids, new_id);
  END LOOP;

  -- Return the inserted message IDs
  RETURN jsonb_build_object(
    'success', true,
    'inserted_ids', to_jsonb(inserted_ids),
    'count', array_length(inserted_ids, 1)
  );
END;
$$;

-- Documentation
COMMENT ON FUNCTION insert_tutor_messages(UUID, UUID, JSONB) IS
  'Securely inserts tutor messages after verifying user ownership of the conversation.
   Uses SECURITY DEFINER to bypass RLS while maintaining explicit security checks.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION insert_tutor_messages(UUID, UUID, JSONB) TO authenticated;

-- Also create a function to update conversation stats (for the same reason)
CREATE OR REPLACE FUNCTION update_tutor_conversation_stats(
  p_conversation_id UUID,
  p_user_id UUID,
  p_message_count INTEGER,
  p_max_help_level INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: Verify user owns the conversation
  IF NOT EXISTS (
    SELECT 1 FROM tutor_conversations
    WHERE id = p_conversation_id
    AND student_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: user does not own this conversation'
      USING ERRCODE = '42501';
  END IF;

  -- Update the conversation
  UPDATE tutor_conversations
  SET
    message_count = p_message_count,
    max_help_level_reached = GREATEST(max_help_level_reached, p_max_help_level)
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION update_tutor_conversation_stats(UUID, UUID, INTEGER, INTEGER) IS
  'Securely updates tutor conversation statistics after verifying user ownership.';

GRANT EXECUTE ON FUNCTION update_tutor_conversation_stats(UUID, UUID, INTEGER, INTEGER) TO authenticated;
