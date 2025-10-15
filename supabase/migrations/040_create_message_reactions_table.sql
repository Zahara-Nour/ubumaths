-- =============================================
-- Chat System: Message Reactions Table
-- =============================================
-- Migration: 040
-- Description: Emoji reactions for messages
--
-- Features:
-- - Unicode emoji support
-- - One reaction type per user per message
-- - Aggregate reaction counts
-- - RLS policies for privacy

-- Create message_reactions table
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Reaction data
  emoji TEXT NOT NULL, -- Unicode emoji (👍, ❤️, 😂, 🎉, 😮, 😢, 😡)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: One emoji type per user per message
  UNIQUE(message_id, user_id, emoji)
);

-- Indexes for performance
CREATE INDEX idx_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_reactions_user ON message_reactions(user_id);
CREATE INDEX idx_reactions_emoji ON message_reactions(message_id, emoji);

-- =============================================
-- Enable Row Level Security
-- =============================================
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Users can view reactions in conversations they participate in
CREATE POLICY "Users can view reactions in their conversations"
  ON message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
      AND cp.user_id = auth.uid()
    )
  );

-- Users can add reactions to messages in their conversations
CREATE POLICY "Users can add reactions to messages in their conversations"
  ON message_reactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
      AND cp.user_id = auth.uid()
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
  ON message_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- =============================================
-- Helper Function: Get reaction counts for a message
-- =============================================

CREATE OR REPLACE FUNCTION get_message_reaction_counts(p_message_id UUID)
RETURNS TABLE (
  emoji TEXT,
  count BIGINT,
  user_reacted BOOLEAN
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
    mr.emoji,
    COUNT(*) as count,
    BOOL_OR(mr.user_id = auth.uid()) as user_reacted
  FROM message_reactions mr
  WHERE mr.message_id = p_message_id
  GROUP BY mr.emoji
  ORDER BY COUNT(*) DESC, mr.emoji;
END;
$$;

-- =============================================
-- Helper Function: Get users who reacted with specific emoji
-- =============================================

CREATE OR REPLACE FUNCTION get_reaction_users(
  p_message_id UUID,
  p_emoji TEXT
)
RETURNS TABLE (
  user_id UUID,
  firstname TEXT,
  lastname TEXT,
  avatar_url TEXT,
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
    p.id,
    p.firstname,
    p.lastname,
    p.avatar_url,
    mr.created_at
  FROM message_reactions mr
  JOIN profiles p ON p.id = mr.user_id
  WHERE mr.message_id = p_message_id
  AND mr.emoji = p_emoji
  ORDER BY mr.created_at ASC;
END;
$$;

-- =============================================
-- Helper Function: Toggle reaction
-- =============================================
-- If user has already reacted with this emoji, remove it
-- Otherwise, add the reaction

CREATE OR REPLACE FUNCTION toggle_reaction(
  p_message_id UUID,
  p_emoji TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_reaction_exists BOOLEAN;
BEGIN
  -- Check if user is a participant in the conversation
  IF NOT EXISTS (
    SELECT 1
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = p_message_id
    AND cp.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a participant';
  END IF;

  -- Check if reaction already exists
  SELECT EXISTS (
    SELECT 1 FROM message_reactions
    WHERE message_id = p_message_id
    AND user_id = v_user_id
    AND emoji = p_emoji
  ) INTO v_reaction_exists;

  IF v_reaction_exists THEN
    -- Remove reaction
    DELETE FROM message_reactions
    WHERE message_id = p_message_id
    AND user_id = v_user_id
    AND emoji = p_emoji;

    RETURN false; -- Reaction removed
  ELSE
    -- Add reaction
    INSERT INTO message_reactions (message_id, user_id, emoji)
    VALUES (p_message_id, v_user_id, p_emoji)
    ON CONFLICT (message_id, user_id, emoji) DO NOTHING;

    RETURN true; -- Reaction added
  END IF;
END;
$$;

-- =============================================
-- Common emoji reactions (for quick access in UI)
-- =============================================
-- These are suggestions for the UI emoji picker
-- Not enforced by database - any Unicode emoji is allowed

-- Suggested emojis:
-- 👍 Thumbs up (U+1F44D)
-- ❤️  Red heart (U+2764 U+FE0F)
-- 😂 Face with tears of joy (U+1F602)
-- 🎉 Party popper (U+1F389)
-- 😮 Face with open mouth (U+1F62E)
-- 😢 Crying face (U+1F622)
-- 🤔 Thinking face (U+1F914)
-- ✅ Check mark (U+2705)

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE message_reactions IS 'Emoji reactions for chat messages';
COMMENT ON COLUMN message_reactions.emoji IS 'Unicode emoji character (e.g., 👍, ❤️, 😂)';
COMMENT ON FUNCTION get_message_reaction_counts IS 'Get aggregated reaction counts for a message';
COMMENT ON FUNCTION get_reaction_users IS 'Get list of users who reacted with a specific emoji';
COMMENT ON FUNCTION toggle_reaction IS 'Add or remove a reaction (toggle behavior)';
