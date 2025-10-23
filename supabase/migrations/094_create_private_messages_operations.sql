-- Migration 094: Private Messages System - Operation Functions
-- Description: Core functions for sending, receiving, and managing private messages

-- =====================================================
-- FUNCTION: send_private_message
-- Description: Send a private message with validation
-- Returns: message_id of the created message
-- =====================================================
CREATE OR REPLACE FUNCTION send_private_message(
  p_sender_id UUID,
  p_recipient_ids UUID[],
  p_subject TEXT,
  p_content JSONB,
  p_is_group_message BOOLEAN DEFAULT FALSE,
  p_class_id UUID DEFAULT NULL,
  p_parent_message_id UUID DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_message_id UUID;
  v_recipient_id UUID;
  v_plain_text TEXT;
  v_thread_root_id UUID;
BEGIN
  -- Validate permissions
  IF p_is_group_message AND p_class_id IS NOT NULL THEN
    -- Validate class message
    IF NOT validate_class_message_recipients(p_sender_id, p_class_id) THEN
      RAISE EXCEPTION 'You do not have permission to send messages to this class';
    END IF;

    -- Get all students in the class
    SELECT array_agg(student_id)
    INTO p_recipient_ids
    FROM get_students_in_class(p_class_id);

  ELSE
    -- Validate individual recipients
    IF NOT validate_message_recipients(p_sender_id, p_recipient_ids) THEN
      RAISE EXCEPTION 'You do not have permission to send messages to one or more recipients';
    END IF;
  END IF;

  -- Extract plain text from TipTap JSON for search
  v_plain_text := p_content->>'text';
  IF v_plain_text IS NULL OR v_plain_text = '' THEN
    -- Try to extract from content structure
    v_plain_text := regexp_replace(p_content::text, '<[^>]+>', '', 'g');
    v_plain_text := substring(v_plain_text, 1, 5000); -- Limit length
  END IF;

  -- Determine thread root
  IF p_parent_message_id IS NOT NULL THEN
    -- Get thread root from parent
    SELECT COALESCE(thread_root_id, id)
    INTO v_thread_root_id
    FROM private_messages
    WHERE id = p_parent_message_id;
  ELSE
    v_thread_root_id := NULL; -- This will be the root
  END IF;

  -- Insert message
  INSERT INTO private_messages (
    sender_id,
    subject,
    content,
    plain_text,
    parent_message_id,
    thread_root_id,
    is_group_message,
    class_id,
    recipient_count
  ) VALUES (
    p_sender_id,
    p_subject,
    p_content,
    v_plain_text,
    p_parent_message_id,
    v_thread_root_id,
    p_is_group_message,
    p_class_id,
    array_length(p_recipient_ids, 1)
  )
  RETURNING id INTO v_message_id;

  -- If this is a root message, set its own thread_root_id
  IF v_thread_root_id IS NULL THEN
    UPDATE private_messages
    SET thread_root_id = v_message_id
    WHERE id = v_message_id;
  END IF;

  -- Create inbox entries for each recipient
  FOREACH v_recipient_id IN ARRAY p_recipient_ids
  LOOP
    INSERT INTO message_inbox (
      message_id,
      recipient_id,
      status
    ) VALUES (
      v_message_id,
      v_recipient_id,
      'inbox'
    );
  END LOOP;

  RETURN v_message_id;
END;
$$;

COMMENT ON FUNCTION send_private_message IS 'Sends a private message with validation and creates inbox entries for recipients';

-- =====================================================
-- FUNCTION: get_user_inbox
-- Description: Get inbox messages for a user with pagination
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_inbox(
  p_user_id UUID,
  p_status TEXT DEFAULT 'inbox',
  p_folder_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  message_id UUID,
  sender_id UUID,
  sender_name TEXT,
  sender_avatar_url TEXT,
  subject TEXT,
  content JSONB,
  plain_text TEXT,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  is_starred BOOLEAN,
  status TEXT,
  is_group_message BOOLEAN,
  recipient_count INT,
  has_attachments BOOLEAN,
  attachment_count INT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.id AS message_id,
    pm.sender_id,
    p.full_name AS sender_name,
    p.avatar_url AS sender_avatar_url,
    pm.subject,
    pm.content,
    substring(pm.plain_text, 1, 200) AS plain_text,
    pm.sent_at,
    mi.read_at,
    mi.is_starred,
    mi.status,
    pm.is_group_message,
    pm.recipient_count,
    (EXISTS (SELECT 1 FROM message_attachments_v2 ma WHERE ma.message_id = pm.id)) AS has_attachments,
    (SELECT COUNT(*)::INT FROM message_attachments_v2 ma WHERE ma.message_id = pm.id) AS attachment_count
  FROM message_inbox mi
  JOIN private_messages pm ON pm.id = mi.message_id
  JOIN profiles p ON p.id = pm.sender_id
  WHERE mi.recipient_id = p_user_id
    AND mi.deleted = FALSE
    AND pm.deleted_by_sender = FALSE
    AND mi.status = p_status
    AND (p_folder_id IS NULL OR mi.folder_id = p_folder_id)
  ORDER BY pm.sent_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_user_inbox IS 'Returns paginated inbox messages for a user';

-- =====================================================
-- FUNCTION: get_user_sent_messages
-- Description: Get sent messages for a user with pagination
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_sent_messages(
  p_user_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  message_id UUID,
  subject TEXT,
  content JSONB,
  plain_text TEXT,
  sent_at TIMESTAMPTZ,
  is_group_message BOOLEAN,
  recipient_count INT,
  has_attachments BOOLEAN,
  recipients JSONB
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.id AS message_id,
    pm.subject,
    pm.content,
    substring(pm.plain_text, 1, 200) AS plain_text,
    pm.sent_at,
    pm.is_group_message,
    pm.recipient_count,
    (EXISTS (SELECT 1 FROM message_attachments_v2 ma WHERE ma.message_id = pm.id)) AS has_attachments,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.full_name,
        'avatar_url', p.avatar_url
      ))
      FROM message_inbox mi
      JOIN profiles p ON p.id = mi.recipient_id
      WHERE mi.message_id = pm.id
    ) AS recipients
  FROM private_messages pm
  WHERE pm.sender_id = p_user_id
    AND pm.deleted_by_sender = FALSE
  ORDER BY pm.sent_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_user_sent_messages IS 'Returns paginated sent messages for a user';

-- =====================================================
-- FUNCTION: get_message_thread
-- Description: Get all messages in a thread
-- =====================================================
CREATE OR REPLACE FUNCTION get_message_thread(
  p_thread_root_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  message_id UUID,
  sender_id UUID,
  sender_name TEXT,
  sender_avatar_url TEXT,
  subject TEXT,
  content JSONB,
  sent_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  parent_message_id UUID,
  level INT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify user has access to this thread
  IF NOT EXISTS (
    SELECT 1 FROM private_messages pm
    LEFT JOIN message_inbox mi ON mi.message_id = pm.id
    WHERE (pm.id = p_thread_root_id OR pm.thread_root_id = p_thread_root_id)
      AND (pm.sender_id = p_user_id OR mi.recipient_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'You do not have access to this message thread';
  END IF;

  RETURN QUERY
  WITH RECURSIVE thread_messages AS (
    -- Root message
    SELECT
      pm.id,
      pm.sender_id,
      p.full_name AS sender_name,
      p.avatar_url AS sender_avatar_url,
      pm.subject,
      pm.content,
      pm.sent_at,
      pm.edited_at,
      pm.parent_message_id,
      0 AS level
    FROM private_messages pm
    JOIN profiles p ON p.id = pm.sender_id
    WHERE pm.id = p_thread_root_id
      AND pm.deleted_by_sender = FALSE

    UNION ALL

    -- Recursive: get replies
    SELECT
      pm.id,
      pm.sender_id,
      p.full_name,
      p.avatar_url,
      pm.subject,
      pm.content,
      pm.sent_at,
      pm.edited_at,
      pm.parent_message_id,
      tm.level + 1
    FROM private_messages pm
    JOIN profiles p ON p.id = pm.sender_id
    JOIN thread_messages tm ON pm.parent_message_id = tm.id
    WHERE pm.deleted_by_sender = FALSE
  )
  SELECT * FROM thread_messages
  ORDER BY sent_at ASC;
END;
$$;

COMMENT ON FUNCTION get_message_thread IS 'Returns all messages in a thread (recursive)';

-- =====================================================
-- FUNCTION: mark_message_as_read
-- Description: Mark a message as read
-- =====================================================
CREATE OR REPLACE FUNCTION mark_message_as_read(
  p_message_id UUID,
  p_user_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE message_inbox
  SET read_at = NOW()
  WHERE message_id = p_message_id
    AND recipient_id = p_user_id
    AND read_at IS NULL; -- Only update if not already read
END;
$$;

COMMENT ON FUNCTION mark_message_as_read IS 'Marks a message as read for a specific user';

-- =====================================================
-- FUNCTION: get_private_messages_unread_count
-- Description: Get count of unread private messages for a user
-- =====================================================
CREATE OR REPLACE FUNCTION get_private_messages_unread_count(p_user_id UUID)
RETURNS INT
SECURITY DEFINER
SET search_path = public
LANGUAGE SQL
AS $$
  SELECT COUNT(*)::INT
  FROM message_inbox
  WHERE recipient_id = p_user_id
    AND read_at IS NULL
    AND deleted = FALSE
    AND status = 'inbox';
$$;

COMMENT ON FUNCTION get_private_messages_unread_count IS 'Returns count of unread private messages for a user';

-- =====================================================
-- FUNCTION: move_message_to_folder
-- Description: Move a message to a folder
-- =====================================================
CREATE OR REPLACE FUNCTION move_message_to_folder(
  p_message_id UUID,
  p_user_id UUID,
  p_folder_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify folder belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM user_folders
    WHERE id = p_folder_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Folder not found or does not belong to you';
  END IF;

  UPDATE message_inbox
  SET folder_id = p_folder_id
  WHERE message_id = p_message_id
    AND recipient_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION move_message_to_folder IS 'Moves a message to a user folder';

-- =====================================================
-- FUNCTION: toggle_message_star
-- Description: Toggle star status of a message
-- =====================================================
CREATE OR REPLACE FUNCTION toggle_message_star(
  p_message_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_value BOOLEAN;
BEGIN
  UPDATE message_inbox
  SET is_starred = NOT is_starred
  WHERE message_id = p_message_id
    AND recipient_id = p_user_id
  RETURNING is_starred INTO v_new_value;

  RETURN v_new_value;
END;
$$;

COMMENT ON FUNCTION toggle_message_star IS 'Toggles star status and returns new value';

-- =====================================================
-- FUNCTION: update_message_status
-- Description: Update message status (inbox, archived, trash)
-- =====================================================
CREATE OR REPLACE FUNCTION update_message_status(
  p_message_id UUID,
  p_user_id UUID,
  p_status TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_status NOT IN ('inbox', 'archived', 'trash') THEN
    RAISE EXCEPTION 'Invalid status. Must be inbox, archived, or trash';
  END IF;

  UPDATE message_inbox
  SET status = p_status
  WHERE message_id = p_message_id
    AND recipient_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION update_message_status IS 'Updates message status (inbox, archived, trash)';
