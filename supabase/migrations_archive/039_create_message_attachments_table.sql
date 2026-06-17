-- =============================================
-- Chat System: Message Attachments Table
-- =============================================
-- Migration: 039
-- Description: Store file/image attachments for messages
--
-- Features:
-- - Only teachers can upload files (1MB limit enforced in application)
-- - Track file metadata (name, type, size, storage path)
-- - Supabase Storage integration
-- - RLS policies for access control

-- Create message_attachments table
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,

  -- File metadata
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type (e.g., 'image/png', 'application/pdf')
  file_size INTEGER NOT NULL, -- Size in bytes

  -- Storage paths
  storage_path TEXT NOT NULL, -- Path in Supabase Storage bucket
  public_url TEXT NOT NULL, -- Public URL for access

  -- Uploader
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (file_size > 0 AND file_size <= 1048576) -- Max 1MB (1024 * 1024 bytes)
);

-- Indexes for performance
CREATE INDEX idx_attachments_message ON message_attachments(message_id);
CREATE INDEX idx_attachments_uploader ON message_attachments(uploaded_by);
CREATE INDEX idx_attachments_created ON message_attachments(created_at DESC);

-- =============================================
-- Enable Row Level Security
-- =============================================
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Users can view attachments in conversations they participate in
CREATE POLICY "Users can view attachments in their conversations"
  ON message_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id
      AND cp.user_id = auth.uid()
    )
  );

-- Only teachers can upload attachments
CREATE POLICY "Only teachers can upload attachments"
  ON message_attachments
  FOR INSERT
  WITH CHECK (
    is_teacher_or_admin()
    AND uploaded_by = auth.uid()
  );

-- Teachers can delete their own attachments
CREATE POLICY "Teachers can delete their own attachments"
  ON message_attachments
  FOR DELETE
  USING (
    is_teacher_or_admin()
    AND uploaded_by = auth.uid()
  );

-- Teachers who own the group chat can delete any attachment in it
CREATE POLICY "Teachers can delete attachments in their group chats"
  ON message_attachments
  FOR DELETE
  USING (
    is_teacher_or_admin()
    AND EXISTS (
      SELECT 1
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_attachments.message_id
      AND c.is_group = true
      AND c.created_by = auth.uid()
    )
  );

-- =============================================
-- Helper Function: Validate attachment upload
-- =============================================

CREATE OR REPLACE FUNCTION validate_attachment_upload(
  p_message_id UUID,
  p_user_id UUID,
  p_file_size INTEGER
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_teacher BOOLEAN;
  v_is_participant BOOLEAN;
BEGIN
  -- Check if user is a teacher
  SELECT role IN ('teacher', 'admin') INTO v_is_teacher
  FROM profiles
  WHERE id = p_user_id;

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Only teachers can upload files';
  END IF;

  -- Check file size (1MB = 1048576 bytes)
  IF p_file_size > 1048576 THEN
    RAISE EXCEPTION 'File size exceeds 1MB limit';
  END IF;

  -- Check if user is a participant in the conversation
  SELECT EXISTS (
    SELECT 1
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = p_message_id
    AND cp.user_id = p_user_id
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'User is not a participant in this conversation';
  END IF;

  RETURN true;
END;
$$;

-- =============================================
-- Helper Function: Get attachments for message
-- =============================================

CREATE OR REPLACE FUNCTION get_message_attachments(p_message_id UUID)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  public_url TEXT,
  uploaded_by UUID,
  uploader_firstname TEXT,
  uploader_lastname TEXT,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is a participant in the conversation
  IF NOT EXISTS (
    SELECT 1
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = p_message_id
    AND cp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a participant';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.file_name,
    a.file_type,
    a.file_size,
    a.public_url,
    a.uploaded_by,
    p.firstname,
    p.lastname,
    a.created_at
  FROM message_attachments a
  LEFT JOIN profiles p ON p.id = a.uploaded_by
  WHERE a.message_id = p_message_id
  ORDER BY a.created_at ASC;
END;
$$;

-- =============================================
-- Helper Function: Delete attachment (with storage cleanup)
-- =============================================
-- NOTE: Storage cleanup should be handled by the application
-- This function just marks for deletion

CREATE OR REPLACE FUNCTION delete_attachment(p_attachment_id UUID)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_storage_path TEXT;
  v_uploaded_by UUID;
  v_conversation_created_by UUID;
BEGIN
  -- Get attachment details
  SELECT
    a.storage_path,
    a.uploaded_by,
    c.created_by
  INTO
    v_storage_path,
    v_uploaded_by,
    v_conversation_created_by
  FROM message_attachments a
  JOIN messages m ON m.id = a.message_id
  JOIN conversations c ON c.id = m.conversation_id
  WHERE a.id = p_attachment_id;

  -- Check permissions: either uploader or teacher who owns the chat
  IF v_uploaded_by != auth.uid() THEN
    IF v_conversation_created_by != auth.uid() OR NOT is_teacher_or_admin() THEN
      RAISE EXCEPTION 'Permission denied: cannot delete this attachment';
    END IF;
  END IF;

  -- Delete the attachment record
  DELETE FROM message_attachments
  WHERE id = p_attachment_id;

  -- Return storage path so application can delete from Supabase Storage
  RETURN v_storage_path;
END;
$$;

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE message_attachments IS 'File attachments for chat messages (teachers only, 1MB limit)';
COMMENT ON COLUMN message_attachments.storage_path IS 'Path in Supabase Storage bucket (chat-attachments/)';
COMMENT ON COLUMN message_attachments.file_size IS 'File size in bytes (max 1048576 = 1MB)';
COMMENT ON FUNCTION validate_attachment_upload IS 'Validates file upload permissions and size limit';
COMMENT ON FUNCTION get_message_attachments IS 'Get all attachments for a message';
COMMENT ON FUNCTION delete_attachment IS 'Delete attachment and return storage path for cleanup';
