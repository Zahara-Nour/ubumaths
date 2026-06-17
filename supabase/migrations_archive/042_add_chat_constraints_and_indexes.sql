-- =============================================
-- Chat System: Final Constraints and Indexes
-- =============================================
-- Migration: 042
-- Description: Add foreign key for last_message_id and additional optimizations
--
-- Features:
-- - Add FK constraint from conversations to messages
-- - Additional performance indexes
-- - Grant permissions for RPC functions

-- =============================================
-- Add missing RLS policy for conversations
-- =============================================
-- This was deferred to avoid circular dependency with conversation_participants

CREATE POLICY "Users can view their conversations"
  ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- =============================================
-- Add foreign key constraint for last_message_id
-- =============================================
-- This was deferred until after messages table was created

ALTER TABLE conversations
  ADD CONSTRAINT fk_conversations_last_message
  FOREIGN KEY (last_message_id)
  REFERENCES messages(id)
  ON DELETE SET NULL;

-- Index for the FK
CREATE INDEX idx_conversations_last_message_id
  ON conversations(last_message_id)
  WHERE last_message_id IS NOT NULL;

-- =============================================
-- Additional Performance Indexes
-- =============================================

-- Composite index for user's conversations list query
CREATE INDEX idx_participants_user_conversations
  ON conversation_participants(user_id, is_archived)
  WHERE is_archived = false;

-- Index for finding 1-on-1 conversations
CREATE INDEX idx_conversations_1on1
  ON conversations(is_group)
  WHERE is_group = false;

-- Index for class chat rooms
CREATE INDEX idx_conversations_class_chats
  ON conversations(class_id, is_group)
  WHERE is_group = true AND class_id IS NOT NULL;

-- Index for flagged/reported messages (moderation)
CREATE INDEX idx_messages_moderation
  ON messages(conversation_id, is_flagged, is_reported)
  WHERE is_flagged = true OR is_reported = true;

-- =============================================
-- Update Database Types
-- =============================================
-- Update the Database TypeScript interface
-- This will be done in a separate file

-- =============================================
-- Grant Execute Permissions on RPC Functions
-- =============================================
-- Ensure authenticated users can call these functions

GRANT EXECUTE ON FUNCTION get_unread_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_participants TO authenticated;
GRANT EXECUTE ON FUNCTION validate_1on1_chat_creation TO authenticated;
GRANT EXECUTE ON FUNCTION create_1on1_chat TO authenticated;
GRANT EXECUTE ON FUNCTION get_messages_paginated TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_message TO authenticated;
GRANT EXECUTE ON FUNCTION validate_attachment_upload TO authenticated;
GRANT EXECUTE ON FUNCTION get_message_attachments TO authenticated;
GRANT EXECUTE ON FUNCTION delete_attachment TO authenticated;
GRANT EXECUTE ON FUNCTION get_message_reaction_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_reaction_users TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_reaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_reports_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_reports_for_moderation TO authenticated;
GRANT EXECUTE ON FUNCTION report_message TO authenticated;
GRANT EXECUTE ON FUNCTION review_report TO authenticated;

-- =============================================
-- Helper View: User's Conversations List
-- =============================================
-- Materialized view for better performance on conversation list queries

CREATE OR REPLACE VIEW user_conversations_view AS
SELECT
  c.id AS conversation_id,
  c.name,
  c.is_group,
  c.class_id,
  c.created_by,
  c.last_message_preview,
  c.last_message_at,
  c.updated_at,
  cp.user_id,
  cp.last_read_at,
  cp.is_archived,
  cp.is_muted,
  -- Unread count (calculated)
  (
    SELECT COUNT(*)
    FROM messages m
    WHERE m.conversation_id = c.id
    AND m.deleted_at IS NULL
    AND m.sender_id != cp.user_id
    AND (
      cp.last_read_at IS NULL
      OR m.created_at > cp.last_read_at
    )
  ) AS unread_count,
  -- Participant count (for group chats)
  (
    SELECT COUNT(*)
    FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id
  ) AS participant_count,
  -- For 1-on-1 chats, get the other user's info
  CASE
    WHEN c.is_group = false THEN (
      SELECT p.id
      FROM conversation_participants cp2
      JOIN profiles p ON p.id = cp2.user_id
      WHERE cp2.conversation_id = c.id
      AND cp2.user_id != cp.user_id
      LIMIT 1
    )
    ELSE NULL
  END AS other_user_id,
  CASE
    WHEN c.is_group = false THEN (
      SELECT p.firstname
      FROM conversation_participants cp2
      JOIN profiles p ON p.id = cp2.user_id
      WHERE cp2.conversation_id = c.id
      AND cp2.user_id != cp.user_id
      LIMIT 1
    )
    ELSE NULL
  END AS other_user_firstname,
  CASE
    WHEN c.is_group = false THEN (
      SELECT p.lastname
      FROM conversation_participants cp2
      JOIN profiles p ON p.id = cp2.user_id
      WHERE cp2.conversation_id = c.id
      AND cp2.user_id != cp.user_id
      LIMIT 1
    )
    ELSE NULL
  END AS other_user_lastname,
  CASE
    WHEN c.is_group = false THEN (
      SELECT p.avatar_url
      FROM conversation_participants cp2
      JOIN profiles p ON p.id = cp2.user_id
      WHERE cp2.conversation_id = c.id
      AND cp2.user_id != cp.user_id
      LIMIT 1
    )
    ELSE NULL
  END AS other_user_avatar_url
FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
WHERE cp.is_archived = false;

-- Grant select on view
GRANT SELECT ON user_conversations_view TO authenticated;

-- RLS on view (users can only see their own conversations)
ALTER VIEW user_conversations_view SET (security_invoker = true);

-- =============================================
-- Helper Function: Get user's conversation list
-- =============================================

CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  conversation_id UUID,
  name TEXT,
  is_group BOOLEAN,
  class_id UUID,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  participant_count BIGINT,
  other_user_id UUID,
  other_user_firstname TEXT,
  other_user_lastname TEXT,
  other_user_avatar_url TEXT,
  is_muted BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  RETURN QUERY
  SELECT
    ucv.conversation_id,
    ucv.name,
    ucv.is_group,
    ucv.class_id,
    ucv.last_message_preview,
    ucv.last_message_at,
    ucv.unread_count,
    ucv.participant_count,
    ucv.other_user_id,
    ucv.other_user_firstname,
    ucv.other_user_lastname,
    ucv.other_user_avatar_url,
    ucv.is_muted
  FROM user_conversations_view ucv
  WHERE ucv.user_id = v_user_id
  ORDER BY
    ucv.last_message_at DESC NULLS LAST,
    ucv.updated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_conversations TO authenticated;

-- =============================================
-- Comments
-- =============================================
COMMENT ON VIEW user_conversations_view IS 'Optimized view for user conversation list with unread counts';
COMMENT ON FUNCTION get_user_conversations IS 'Get all conversations for a user with metadata';

-- =============================================
-- Success Message
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Chat system database schema created successfully!';
  RAISE NOTICE 'Tables created: conversations, conversation_participants, messages, message_attachments, message_reactions, message_reports';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Create Supabase Storage bucket: chat-attachments';
  RAISE NOTICE '  2. Configure bucket policies for authenticated users';
  RAISE NOTICE '  3. Update TypeScript types in src/lib/types/database.ts';
END $$;
