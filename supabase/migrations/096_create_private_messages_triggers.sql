-- Migration 096: Private Messages System - Triggers
-- Description: Triggers for automatic updates to search index, folder counts, etc.

-- =====================================================
-- TRIGGER: Update message_search_index on new message
-- =====================================================
CREATE OR REPLACE FUNCTION update_message_search_index()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_sender_role TEXT;
  v_has_attachments BOOLEAN;
BEGIN
  -- Get sender info
  SELECT full_name, role
  INTO v_sender_name, v_sender_role
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Check for attachments
  SELECT EXISTS (
    SELECT 1 FROM message_attachments_v2
    WHERE message_id = NEW.id
  ) INTO v_has_attachments;

  -- Insert or update search index
  INSERT INTO message_search_index (
    message_id,
    sender_name,
    sender_role,
    subject_tsv,
    content_tsv,
    sent_at,
    has_attachments,
    recipient_count
  ) VALUES (
    NEW.id,
    v_sender_name,
    v_sender_role,
    to_tsvector('french', COALESCE(NEW.subject, '')),
    to_tsvector('french', COALESCE(NEW.plain_text, '')),
    NEW.sent_at,
    v_has_attachments,
    NEW.recipient_count
  )
  ON CONFLICT (message_id) DO UPDATE SET
    subject_tsv = to_tsvector('french', COALESCE(NEW.subject, '')),
    content_tsv = to_tsvector('french', COALESCE(NEW.plain_text, '')),
    has_attachments = v_has_attachments;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_message_search_index
  AFTER INSERT OR UPDATE ON private_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_search_index();

COMMENT ON FUNCTION update_message_search_index IS 'Updates search index when a message is created or updated';

-- =====================================================
-- TRIGGER: Update search index when attachment added
-- =====================================================
CREATE OR REPLACE FUNCTION update_search_index_on_attachment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update has_attachments flag in search index
  UPDATE message_search_index
  SET has_attachments = TRUE
  WHERE message_id = NEW.message_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_search_index_on_attachment
  AFTER INSERT ON message_attachments_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_search_index_on_attachment();

-- =====================================================
-- TRIGGER: Update folder message count
-- =====================================================
CREATE OR REPLACE FUNCTION update_folder_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle INSERT: increment new folder count
  IF TG_OP = 'INSERT' AND NEW.folder_id IS NOT NULL THEN
    UPDATE user_folders
    SET message_count = message_count + 1
    WHERE id = NEW.folder_id;
  END IF;

  -- Handle UPDATE: adjust counts if folder changed
  IF TG_OP = 'UPDATE' AND (OLD.folder_id IS DISTINCT FROM NEW.folder_id) THEN
    -- Decrement old folder
    IF OLD.folder_id IS NOT NULL THEN
      UPDATE user_folders
      SET message_count = GREATEST(message_count - 1, 0)
      WHERE id = OLD.folder_id;
    END IF;

    -- Increment new folder
    IF NEW.folder_id IS NOT NULL THEN
      UPDATE user_folders
      SET message_count = message_count + 1
      WHERE id = NEW.folder_id;
    END IF;
  END IF;

  -- Handle DELETE: decrement folder count
  IF TG_OP = 'DELETE' AND OLD.folder_id IS NOT NULL THEN
    UPDATE user_folders
    SET message_count = GREATEST(message_count - 1, 0)
    WHERE id = OLD.folder_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_folder_count_on_insert
  AFTER INSERT ON message_inbox
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_message_count();

CREATE TRIGGER trigger_update_folder_count_on_update
  AFTER UPDATE ON message_inbox
  FOR EACH ROW
  WHEN (OLD.folder_id IS DISTINCT FROM NEW.folder_id)
  EXECUTE FUNCTION update_folder_message_count();

CREATE TRIGGER trigger_update_folder_count_on_delete
  AFTER DELETE ON message_inbox
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_message_count();

COMMENT ON FUNCTION update_folder_message_count IS 'Updates folder message counts when messages are moved';

-- =====================================================
-- FUNCTION: Search messages with full-text search
-- =====================================================
CREATE OR REPLACE FUNCTION search_private_messages(
  p_user_id UUID,
  p_query TEXT,
  p_search_in TEXT DEFAULT 'all', -- 'inbox', 'sent', 'all'
  p_has_attachments BOOLEAN DEFAULT NULL,
  p_sender_name TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  message_id UUID,
  sender_id UUID,
  sender_name TEXT,
  subject TEXT,
  plain_text TEXT,
  sent_at TIMESTAMPTZ,
  is_starred BOOLEAN,
  has_attachments BOOLEAN,
  rank REAL
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_tsquery TSQUERY;
BEGIN
  -- Convert search query to tsquery
  v_tsquery := plainto_tsquery('french', p_query);

  RETURN QUERY
  SELECT
    msi.message_id,
    pm.sender_id,
    msi.sender_name,
    pm.subject,
    substring(pm.plain_text, 1, 200) AS plain_text,
    msi.sent_at,
    COALESCE(mi.is_starred, FALSE) AS is_starred,
    msi.has_attachments,
    ts_rank(msi.search_tsv, v_tsquery) AS rank
  FROM message_search_index msi
  JOIN private_messages pm ON pm.id = msi.message_id
  LEFT JOIN message_inbox mi ON mi.message_id = msi.message_id AND mi.recipient_id = p_user_id
  WHERE
    -- Full-text search match
    msi.search_tsv @@ v_tsquery

    -- User has access
    AND (
      pm.sender_id = p_user_id
      OR (mi.recipient_id = p_user_id AND mi.deleted = FALSE)
    )

    -- Search scope filter
    AND (
      (p_search_in = 'all')
      OR (p_search_in = 'inbox' AND mi.recipient_id = p_user_id)
      OR (p_search_in = 'sent' AND pm.sender_id = p_user_id)
    )

    -- Optional filters
    AND (p_has_attachments IS NULL OR msi.has_attachments = p_has_attachments)
    AND (p_sender_name IS NULL OR msi.sender_name ILIKE '%' || p_sender_name || '%')
    AND (p_date_from IS NULL OR msi.sent_at >= p_date_from)
    AND (p_date_to IS NULL OR msi.sent_at <= p_date_to)

    -- Exclude soft-deleted
    AND pm.deleted_by_sender = FALSE

  ORDER BY rank DESC, msi.sent_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION search_private_messages IS 'Full-text search for private messages with filters';

-- =====================================================
-- FUNCTION: Get message with details (for single message view)
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
    p.role AS sender_role,
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
        'role', pr.role
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

-- =====================================================
-- FUNCTION: Get allowed recipients for a user
-- =====================================================
CREATE OR REPLACE FUNCTION get_allowed_recipients(p_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT,
  relationship TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = p_user_id;

  -- Students can message their teachers
  IF v_user_role = 'student' THEN
    RETURN QUERY
    SELECT
      p.id AS user_id,
      p.full_name,
      p.avatar_url,
      p.role,
      'teacher'::TEXT AS relationship
    FROM get_student_teachers(p_user_id) gst
    JOIN profiles p ON p.id = gst.teacher_id
    ORDER BY p.full_name;

  -- Teachers can message their students
  ELSIF v_user_role = 'teacher' THEN
    RETURN QUERY
    SELECT
      p.id AS user_id,
      p.full_name,
      p.avatar_url,
      p.role,
      'student'::TEXT AS relationship
    FROM get_teacher_students(p_user_id) gts
    JOIN profiles p ON p.id = gts.student_id
    ORDER BY p.full_name;

  -- Admins can message anyone
  ELSIF v_user_role = 'admin' THEN
    RETURN QUERY
    SELECT
      p.id AS user_id,
      p.full_name,
      p.avatar_url,
      p.role,
      'any'::TEXT AS relationship
    FROM profiles p
    WHERE p.id != p_user_id
    ORDER BY p.full_name;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_allowed_recipients IS 'Returns list of users that the given user can send messages to';

-- =====================================================
-- FUNCTION: Get teacher's classes for group messaging
-- =====================================================
CREATE OR REPLACE FUNCTION get_teacher_classes_for_messaging(p_teacher_id UUID)
RETURNS TABLE(
  class_id UUID,
  class_name TEXT,
  student_count INT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS class_id,
    c.name AS class_name,
    COUNT(cm.student_id)::INT AS student_count
  FROM classes c
  LEFT JOIN class_members cm ON cm.class_id = c.id AND cm.status = 'active'
  WHERE c.teacher_id = p_teacher_id
    AND c.archived = FALSE
  GROUP BY c.id, c.name
  ORDER BY c.name;
END;
$$;

COMMENT ON FUNCTION get_teacher_classes_for_messaging IS 'Returns teacher classes for group messaging with student counts';
