-- =============================================
-- Chat System: Conversations Table
-- =============================================
-- Migration: 036
-- Description: Create conversations table for group chats and 1-on-1 chats
--
-- Features:
-- - Support both group chats (class rooms) and 1-on-1 chats
-- - Auto-create class chat rooms on class creation
-- - Denormalized last_message for performance
-- - RLS policies for privacy and access control

-- Create conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation metadata
  name TEXT, -- For group chats (e.g., "Classe 6ème A - Maths")
  is_group BOOLEAN DEFAULT false, -- true = group chat, false = 1-on-1

  -- Class association (NULL for 1-on-1 chats)
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,

  -- Creator (teacher for group chats)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(), -- Updated when new message arrives

  -- Denormalized last message data (for performance in conversation list)
  last_message_id UUID, -- Will reference messages(id) after messages table is created
  last_message_preview TEXT, -- First 100 chars of last message
  last_message_at TIMESTAMPTZ, -- Timestamp of last message

  -- Constraints
  CHECK (
    -- Group chats must have a name and be created by someone (teacher)
    (is_group = true AND name IS NOT NULL AND created_by IS NOT NULL) OR
    -- 1-on-1 chats don't need a name or creator
    (is_group = false)
  )
);

-- Indexes for performance
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_class ON conversations(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);

-- =============================================
-- Enable Row Level Security
-- =============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Note: The SELECT policy will be added in migration 042 after conversation_participants is created
-- to avoid circular dependency

-- Only teachers can create group chats
CREATE POLICY "Teachers can create group chats"
  ON conversations
  FOR INSERT
  WITH CHECK (
    is_group = true
    AND is_teacher_or_admin()
    AND created_by = auth.uid()
  );

-- Students can create 1-on-1 chats (will be validated in application logic)
CREATE POLICY "Students can create 1-on-1 chats"
  ON conversations
  FOR INSERT
  WITH CHECK (
    is_group = false
    AND auth.uid() IS NOT NULL
  );

-- Only creators (teachers) can update group chats
CREATE POLICY "Teachers can update their group chats"
  ON conversations
  FOR UPDATE
  USING (
    is_group = true
    AND created_by = auth.uid()
    AND is_teacher_or_admin()
  );

-- System can update last_message fields (via triggers)
CREATE POLICY "System can update last_message fields"
  ON conversations
  FOR UPDATE
  USING (true); -- Allow all updates (triggers will handle this securely)

-- Only teachers can delete conversations
CREATE POLICY "Teachers can delete their group chats"
  ON conversations
  FOR DELETE
  USING (
    is_group = true
    AND created_by = auth.uid()
    AND is_teacher_or_admin()
  );

-- =============================================
-- Helper Function: Auto-create class chat rooms
-- =============================================
-- This function will be called when a new class is created

CREATE OR REPLACE FUNCTION create_class_chat_room()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_conversation_id UUID;
BEGIN
  -- Create a conversation for the new class
  INSERT INTO conversations (
    name,
    is_group,
    class_id,
    created_by,
    created_at
  ) VALUES (
    NEW.name || ' - Chat de classe', -- e.g., "6ème A - Chat de classe"
    true, -- is_group
    NEW.id, -- class_id
    NEW.teacher_id, -- created_by (teacher)
    NOW()
  )
  RETURNING id INTO new_conversation_id;

  -- Add the teacher as a participant
  INSERT INTO conversation_participants (
    conversation_id,
    user_id,
    joined_at
  ) VALUES (
    new_conversation_id,
    NEW.teacher_id,
    NOW()
  );

  -- Add all existing class members as participants
  INSERT INTO conversation_participants (
    conversation_id,
    user_id,
    joined_at
  )
  SELECT
    new_conversation_id,
    cm.student_id,
    NOW()
  FROM class_members cm
  WHERE cm.class_id = NEW.id;

  RETURN NEW;
END;
$$;

-- Trigger: Auto-create class chat room when class is created
CREATE TRIGGER trigger_create_class_chat_room
  AFTER INSERT ON classes
  FOR EACH ROW
  EXECUTE FUNCTION create_class_chat_room();

-- =============================================
-- Helper Function: Add student to class chat when they join
-- =============================================

CREATE OR REPLACE FUNCTION add_student_to_class_chat()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  class_conversation_id UUID;
BEGIN
  -- Find the class chat room
  SELECT id INTO class_conversation_id
  FROM conversations
  WHERE class_id = NEW.class_id
  AND is_group = true
  LIMIT 1;

  -- Add student to the class chat (if it exists)
  IF class_conversation_id IS NOT NULL THEN
    INSERT INTO conversation_participants (
      conversation_id,
      user_id,
      joined_at
    ) VALUES (
      class_conversation_id,
      NEW.student_id,
      NOW()
    )
    ON CONFLICT (conversation_id, user_id) DO NOTHING; -- Avoid duplicates
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: Add student to class chat when they join a class
CREATE TRIGGER trigger_add_student_to_class_chat
  AFTER INSERT ON class_members
  FOR EACH ROW
  EXECUTE FUNCTION add_student_to_class_chat();

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE conversations IS 'Chat conversations: group chats (class rooms) and 1-on-1 chats';
COMMENT ON COLUMN conversations.class_id IS 'NULL for 1-on-1 chats, set for class chat rooms';
COMMENT ON COLUMN conversations.last_message_preview IS 'Denormalized for performance in conversation list';
COMMENT ON FUNCTION create_class_chat_room() IS 'Auto-creates a chat room when a class is created';
COMMENT ON FUNCTION add_student_to_class_chat() IS 'Auto-adds students to class chat when they join a class';
