-- Migration: Fix create_1on1_chat to return existing conversation
-- ================================================================
--
-- Problem: create_1on1_chat raises an exception when conversation already exists
-- Solution: Return the existing conversation ID instead of raising an exception
--
-- This matches the documented behavior: "returns existing conversation if found"

-- Drop the old function
DROP FUNCTION IF EXISTS create_1on1_chat(UUID, UUID);

-- Create the improved function that returns existing conversation
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
  v_are_friends BOOLEAN;
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
  SELECT c.id INTO v_conversation_id
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

  -- If conversation exists, return it
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
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

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION create_1on1_chat TO authenticated;

-- Update comment
COMMENT ON FUNCTION create_1on1_chat IS 'Create a 1-on-1 chat between two friends, or return existing conversation if one exists';
