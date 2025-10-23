-- Migration 104: Fix role type casting in get_message_details function
-- Description: Cast user_role enum to TEXT in get_message_details to match function signature

-- =====================================================
-- FUNCTION: Get message with details (TYPE CAST FIX)
-- =====================================================
CREATE OR REPLACE FUNCTION get_message_details(
  p_message_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  message_id UUID,
  sender_id UUID,
  sender_name TEXT,
  sender_avatar_url TEXT,
  sender_role TEXT,
  subject TEXT,
  content JSONB,
  plain_text TEXT,
  sent_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  is_group_message BOOLEAN,
  recipient_count INT,
  parent_message_id UUID,
  thread_root_id UUID,
  read_at TIMESTAMPTZ,
  is_starred BOOLEAN,
  status TEXT,
  attachments JSONB,
  recipients JSONB
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify user has access
  IF NOT EXISTS (
    SELECT 1 FROM private_messages pm
    LEFT JOIN message_inbox mi ON mi.message_id = pm.id
    WHERE pm.id = p_message_id
      AND (pm.sender_id = p_user_id OR mi.recipient_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'You do not have access to this message';
  END IF;

  RETURN QUERY
  SELECT
    pm.id AS message_id,
    pm.sender_id,
    p.full_name AS sender_name,
    p.avatar_url AS sender_avatar_url,
    p.role::TEXT AS sender_role,  -- Cast to TEXT
    pm.subject,
    pm.content,
    pm.plain_text,
    pm.sent_at,
    pm.edited_at,
    pm.is_group_message,
    pm.recipient_count,
    pm.parent_message_id,
    pm.thread_root_id,
    mi.read_at,
    COALESCE(mi.is_starred, FALSE) AS is_starred,
    COALESCE(mi.status, 'sent') AS status,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', ma.id,
        'file_name', ma.file_name,
        'file_type', ma.file_type,
        'file_size', ma.file_size,
        'public_url', ma.public_url,
        'uploaded_at', ma.uploaded_at
      ))
      FROM message_attachments_v2 ma
      WHERE ma.message_id = pm.id
    ) AS attachments,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'name', pr.full_name,
        'avatar_url', pr.avatar_url,
        'role', pr.role::TEXT  -- Cast to TEXT
      ))
      FROM message_inbox mi2
      JOIN profiles pr ON pr.id = mi2.recipient_id
      WHERE mi2.message_id = pm.id
    ) AS recipients
  FROM private_messages pm
  JOIN profiles p ON p.id = pm.sender_id
  LEFT JOIN message_inbox mi ON mi.message_id = pm.id AND mi.recipient_id = p_user_id
  WHERE pm.id = p_message_id;
END;
$$;

COMMENT ON FUNCTION get_message_details IS 'Returns full message details with attachments and recipients';
