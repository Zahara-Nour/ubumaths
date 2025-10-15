-- =============================================
-- Chat System: Conversation Participants Table
-- =============================================
-- Migration: 037
-- Description: Tracks which users are in which conversations
--
-- Features:
-- - Many-to-many relationship between users and conversations
-- - Track read status and unread counts
-- - Archive conversations without deleting
-- - RLS policies for privacy

-- Create conversation_participants table
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Participation metadata
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Read tracking
  last_read_at TIMESTAMPTZ, -- Last time user viewed conversation
  last_read_message_id UUID, -- Last message user read (for precise read receipts)

  -- UI preferences
  is_archived BOOLEAN DEFAULT false, -- Hide from conversation list
  is_muted BOOLEAN DEFAULT false, -- Disable notifications

  -- Unique constraint: User can only be in a conversation once
  UNIQUE(conversation_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_participants_user ON conversation_participants(user_id, joined_at DESC);
CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_read ON conversation_participants(user_id, last_read_at DESC);

-- =============================================
-- Enable Row Level Security
-- =============================================
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Users can view their own participation records
CREATE POLICY "Users can view their own participation"
  ON conversation_participants
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can view other participants in their conversations
CREATE POLICY "Users can view other participants in their conversations"
  ON conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- System (triggers) can insert participants
CREATE POLICY "System can insert participants"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (true); -- Triggers and application logic handle validation

-- Users can update their own participation (read status, archive, mute)
CREATE POLICY "Users can update their own participation"
  ON conversation_participants
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Teachers can add participants to group chats they created
CREATE POLICY "Teachers can add participants to their group chats"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
      AND c.is_group = true
      AND c.created_by = auth.uid()
      AND is_teacher_or_admin()
    )
  );

-- Teachers can remove participants from group chats they created
CREATE POLICY "Teachers can remove participants from their group chats"
  ON conversation_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
      AND c.is_group = true
      AND c.created_by = auth.uid()
      AND is_teacher_or_admin()
    )
  );

-- Users can leave conversations (delete their own participation)
CREATE POLICY "Users can leave conversations"
  ON conversation_participants
  FOR DELETE
  USING (user_id = auth.uid());

-- =============================================
-- Helper Function: Get unread message count
-- =============================================

CREATE OR REPLACE FUNCTION get_unread_count(p_conversation_id UUID, p_user_id UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_read_at TIMESTAMPTZ;
  v_unread_count INTEGER;
BEGIN
  -- Get user's last_read_at for this conversation
  SELECT last_read_at INTO v_last_read_at
  FROM conversation_participants
  WHERE conversation_id = p_conversation_id
  AND user_id = p_user_id;

  -- If never read, count all messages
  IF v_last_read_at IS NULL THEN
    SELECT COUNT(*) INTO v_unread_count
    FROM messages
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND deleted_at IS NULL;
  ELSE
    -- Count messages after last_read_at
    SELECT COUNT(*) INTO v_unread_count
    FROM messages
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND created_at > v_last_read_at
    AND deleted_at IS NULL;
  END IF;

  RETURN COALESCE(v_unread_count, 0);
END;
$$;

-- =============================================
-- Helper Function: Mark conversation as read
-- =============================================

CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID,
  p_message_id UUID DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update last_read_at and optionally last_read_message_id
  UPDATE conversation_participants
  SET
    last_read_at = NOW(),
    last_read_message_id = COALESCE(p_message_id, last_read_message_id)
  WHERE conversation_id = p_conversation_id
  AND user_id = p_user_id;
END;
$$;

-- =============================================
-- Helper Function: Get conversation participants
-- =============================================

CREATE OR REPLACE FUNCTION get_conversation_participants(p_conversation_id UUID)
RETURNS TABLE (
  user_id UUID,
  firstname TEXT,
  lastname TEXT,
  avatar_url TEXT,
  joined_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.firstname,
    p.lastname,
    p.avatar_url,
    cp.joined_at,
    cp.last_read_at
  FROM conversation_participants cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE cp.conversation_id = p_conversation_id
  ORDER BY cp.joined_at ASC;
END;
$$;

-- =============================================
-- Helper Function: Validate 1-on-1 chat creation
-- =============================================
-- Ensures:
-- 1. Users are friends
-- 2. No existing 1-on-1 conversation between them
-- 3. Exactly 2 participants

CREATE OR REPLACE FUNCTION validate_1on1_chat_creation(
  p_user1_id UUID,
  p_user2_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_are_friends BOOLEAN;
  v_existing_conversation UUID;
BEGIN
  -- Check if users are friends
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE (
      (requester_id = p_user1_id AND addressee_id = p_user2_id)
      OR (requester_id = p_user2_id AND addressee_id = p_user1_id)
    )
    AND status = 'accepted'
  ) INTO v_are_friends;

  IF NOT v_are_friends THEN
    RAISE EXCEPTION 'Users must be friends to create a 1-on-1 chat';
  END IF;

  -- Check if conversation already exists between these two users
  SELECT c.id INTO v_existing_conversation
  FROM conversations c
  WHERE c.is_group = false
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id
    AND cp1.user_id = p_user1_id
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id
    AND cp2.user_id = p_user2_id
  )
  LIMIT 1;

  IF v_existing_conversation IS NOT NULL THEN
    RAISE EXCEPTION 'Conversation already exists between these users';
  END IF;

  RETURN true;
END;
$$;

-- =============================================
-- Helper Function: Create 1-on-1 chat
-- =============================================

CREATE OR REPLACE FUNCTION create_1on1_chat(
  p_user1_id UUID,
  p_user2_id UUID
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Validate the chat creation
  PERFORM validate_1on1_chat_creation(p_user1_id, p_user2_id);

  -- Create the conversation
  INSERT INTO conversations (is_group, created_at)
  VALUES (false, NOW())
  RETURNING id INTO v_conversation_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
  VALUES
    (v_conversation_id, p_user1_id, NOW()),
    (v_conversation_id, p_user2_id, NOW());

  RETURN v_conversation_id;
END;
$$;

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE conversation_participants IS 'Tracks user participation in conversations';
COMMENT ON COLUMN conversation_participants.last_read_at IS 'Used to calculate unread message count';
COMMENT ON COLUMN conversation_participants.last_read_message_id IS 'For precise read receipts';
COMMENT ON FUNCTION get_unread_count IS 'Calculate unread message count for a user in a conversation';
COMMENT ON FUNCTION mark_conversation_read IS 'Update read status when user views messages';
COMMENT ON FUNCTION validate_1on1_chat_creation IS 'Validates that users are friends and no duplicate chat exists';
COMMENT ON FUNCTION create_1on1_chat IS 'Create a 1-on-1 chat between two friends';
