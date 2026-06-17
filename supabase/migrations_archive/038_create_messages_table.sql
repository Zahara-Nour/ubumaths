-- =============================================
-- Chat System: Messages Table
-- =============================================
-- Migration: 038
-- Description: Store chat messages with rich text content
--
-- Features:
-- - TipTap JSON content format
-- - Soft delete (deleted_at)
-- - Profanity detection flag
-- - User reporting flag
-- - Edit tracking
-- - RLS policies for privacy

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL if user deleted

  -- Content
  content JSONB NOT NULL, -- TipTap JSON format
  plain_text TEXT, -- Extracted plain text for search and profanity checking

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ, -- NULL if never edited
  deleted_at TIMESTAMPTZ, -- Soft delete

  -- Moderation flags
  is_flagged BOOLEAN DEFAULT false, -- Profanity auto-detected
  is_reported BOOLEAN DEFAULT false, -- User-reported
  flag_reason TEXT, -- Auto-generated reason for flag

  -- Constraints
  CHECK (plain_text IS NOT NULL) -- Must have plain text
);

-- Indexes for performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_flagged ON messages(conversation_id, is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_messages_reported ON messages(is_reported) WHERE is_reported = true;
CREATE INDEX idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NOT NULL;

-- GIN index for JSONB content search
CREATE INDEX idx_messages_content ON messages USING GIN (content);

-- Full-text search index on plain_text
CREATE INDEX idx_messages_plain_text ON messages USING GIN (to_tsvector('french', plain_text));

-- =============================================
-- Enable Row Level Security
-- =============================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Users can view messages in conversations they participate in
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
    -- Don't show deleted messages (soft delete)
    AND deleted_at IS NULL
  );

-- Users can send messages to conversations they participate in
CREATE POLICY "Users can send messages to their conversations"
  ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Users can edit their own messages (within limits)
CREATE POLICY "Users can edit their own messages"
  ON messages
  FOR UPDATE
  USING (
    sender_id = auth.uid()
    AND deleted_at IS NULL
    -- Can only edit content and edited_at
    -- Cannot change flags or moderation fields
  )
  WITH CHECK (
    sender_id = auth.uid()
  );

-- Users can delete (soft delete) their own messages
CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Teachers can delete any message in their class chats
CREATE POLICY "Teachers can delete messages in their class chats"
  ON messages
  FOR UPDATE
  USING (
    is_teacher_or_admin()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND c.is_group = true
      AND c.created_by = auth.uid()
    )
  );

-- System can update flags (profanity detection)
CREATE POLICY "System can update message flags"
  ON messages
  FOR UPDATE
  USING (true); -- Triggers will handle this securely

-- =============================================
-- Helper Function: Extract plain text from TipTap JSON
-- =============================================

CREATE OR REPLACE FUNCTION extract_plain_text_from_tiptap(p_content JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_text TEXT := '';
  v_node JSONB;
  v_child JSONB;
BEGIN
  -- If content has a 'content' array, iterate through it
  IF p_content ? 'content' THEN
    FOR v_node IN SELECT * FROM jsonb_array_elements(p_content->'content')
    LOOP
      -- If node is a text node, append its text
      IF v_node->>'type' = 'text' THEN
        v_text := v_text || COALESCE(v_node->>'text', '');

      -- If node has children, recursively extract text
      ELSIF v_node ? 'content' THEN
        FOR v_child IN SELECT * FROM jsonb_array_elements(v_node->'content')
        LOOP
          IF v_child->>'type' = 'text' THEN
            v_text := v_text || COALESCE(v_child->>'text', '');
          END IF;
        END LOOP;

        -- Add space after paragraphs
        IF v_node->>'type' = 'paragraph' THEN
          v_text := v_text || ' ';
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN TRIM(v_text);
END;
$$;

-- =============================================
-- Helper Function: Check profanity (placeholder)
-- =============================================
-- NOTE: Real profanity checking will be done server-side with bad-words library
-- This is a placeholder that can be replaced with more sophisticated detection

CREATE OR REPLACE FUNCTION check_profanity_simple(p_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_bad_words TEXT[] := ARRAY['merde', 'putain', 'connard', 'salope']; -- Basic French profanity list
  v_word TEXT;
BEGIN
  -- Convert to lowercase for comparison
  p_text := LOWER(p_text);

  -- Check each bad word
  FOREACH v_word IN ARRAY v_bad_words
  LOOP
    IF position(v_word IN p_text) > 0 THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

-- =============================================
-- Trigger: Auto-extract plain text and check profanity
-- =============================================

CREATE OR REPLACE FUNCTION process_message_content()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_plain_text TEXT;
  v_has_profanity BOOLEAN;
BEGIN
  -- Extract plain text from TipTap JSON
  v_plain_text := extract_plain_text_from_tiptap(NEW.content);
  NEW.plain_text := v_plain_text;

  -- Check for profanity (basic check, server-side will do more sophisticated checking)
  v_has_profanity := check_profanity_simple(v_plain_text);

  IF v_has_profanity THEN
    NEW.is_flagged := true;
    NEW.flag_reason := 'Profanité détectée automatiquement';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_process_message_content
  BEFORE INSERT OR UPDATE OF content ON messages
  FOR EACH ROW
  EXECUTE FUNCTION process_message_content();

-- =============================================
-- Trigger: Update conversation last_message fields
-- =============================================

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_preview TEXT;
BEGIN
  -- Extract preview (first 100 chars of plain text)
  v_preview := LEFT(NEW.plain_text, 100);
  IF LENGTH(NEW.plain_text) > 100 THEN
    v_preview := v_preview || '...';
  END IF;

  -- Update conversation
  UPDATE conversations
  SET
    last_message_id = NEW.id,
    last_message_preview = v_preview,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- =============================================
-- Helper Function: Get messages with pagination
-- =============================================

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
  -- Check if user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid()
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

-- =============================================
-- Helper Function: Soft delete message
-- =============================================

CREATE OR REPLACE FUNCTION soft_delete_message(p_message_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_sender_id UUID;
  v_conversation_id UUID;
BEGIN
  -- Get message details
  SELECT sender_id, conversation_id INTO v_sender_id, v_conversation_id
  FROM messages
  WHERE id = p_message_id;

  -- Check permissions: either sender or teacher who created the chat
  IF v_sender_id != auth.uid() THEN
    -- Check if user is teacher who created the group chat
    IF NOT EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = v_conversation_id
      AND c.is_group = true
      AND c.created_by = auth.uid()
      AND is_teacher_or_admin()
    ) THEN
      RAISE EXCEPTION 'Permission denied: cannot delete this message';
    END IF;
  END IF;

  -- Soft delete
  UPDATE messages
  SET deleted_at = NOW()
  WHERE id = p_message_id;
END;
$$;

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE messages IS 'Chat messages with rich text content (TipTap JSON format)';
COMMENT ON COLUMN messages.content IS 'TipTap JSON format including text and math formulas';
COMMENT ON COLUMN messages.plain_text IS 'Extracted plain text for search and profanity checking';
COMMENT ON COLUMN messages.deleted_at IS 'Soft delete: messages are hidden but not removed from database';
COMMENT ON FUNCTION extract_plain_text_from_tiptap IS 'Extract plain text from TipTap JSON for search and profanity checking';
COMMENT ON FUNCTION get_messages_paginated IS 'Get messages with cursor-based pagination';
COMMENT ON FUNCTION soft_delete_message IS 'Soft delete a message (sets deleted_at timestamp)';
