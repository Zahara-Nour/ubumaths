-- Migration: Create tutor system tables
-- Description: Creates tutor_conversations and tutor_messages tables with comprehensive RLS policies
-- Created: 2025-11-26

-- ============================================================================
-- Table: tutor_conversations
-- ============================================================================
-- Stores conversation sessions between students and the AI tutor
-- Each conversation is tied to a student, class, and optionally an exercise

CREATE TABLE IF NOT EXISTS tutor_conversations (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  exercise_id UUID,  -- Can be NULL for free chat conversations

  -- Exercise context (denormalized for analytics after exercise deletion)
  exercise_statement TEXT,  -- The full exercise text
  exercise_topic TEXT,      -- The topic/subject area

  -- Conversation metadata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,  -- NULL while conversation is active
  message_count INTEGER DEFAULT 0,
  max_help_level_reached INTEGER DEFAULT 0,  -- Highest help level used in conversation
  effort_score INTEGER,  -- Calculated score based on interactions (0-100)
  topics_covered TEXT[] DEFAULT '{}',  -- Array of mathematical topics discussed
  is_active BOOLEAN DEFAULT true,  -- Active conversations can receive new messages

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add helpful documentation
COMMENT ON TABLE tutor_conversations IS 'AI tutor conversation sessions with students';
COMMENT ON COLUMN tutor_conversations.student_id IS 'The student participating in this conversation';
COMMENT ON COLUMN tutor_conversations.class_id IS 'The class context (NULL if not class-specific)';
COMMENT ON COLUMN tutor_conversations.exercise_id IS 'The exercise being discussed (NULL for free chat)';
COMMENT ON COLUMN tutor_conversations.exercise_statement IS 'Denormalized exercise text for analytics';
COMMENT ON COLUMN tutor_conversations.max_help_level_reached IS 'Highest help level used (1-7, tracks student independence)';
COMMENT ON COLUMN tutor_conversations.effort_score IS 'Calculated score: attempts, time, help level (0-100)';
COMMENT ON COLUMN tutor_conversations.is_active IS 'Whether conversation can still receive messages';

-- ============================================================================
-- Table: tutor_messages
-- ============================================================================
-- Stores individual messages within conversations (both student and AI messages)

CREATE TABLE IF NOT EXISTS tutor_messages (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  conversation_id UUID NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,

  -- Interaction metadata
  help_method_used TEXT,  -- Which help method was selected (e.g., 'hint', 'example', 'explanation')
  help_level INTEGER,  -- Current help level when message was sent (1-7)
  cheat_detected BOOLEAN DEFAULT false,  -- Whether message appears to be copy-pasted solution

  -- Performance metrics
  response_time_ms INTEGER,  -- How long AI took to respond (milliseconds)
  tokens_used INTEGER,  -- Token count for AI response

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add helpful documentation
COMMENT ON TABLE tutor_messages IS 'Individual messages in tutor conversations';
COMMENT ON COLUMN tutor_messages.role IS 'Message author: user (student) or assistant (AI)';
COMMENT ON COLUMN tutor_messages.help_method_used IS 'Which help strategy was applied (hint/example/explanation)';
COMMENT ON COLUMN tutor_messages.help_level IS 'Progressive help level (1=minimal, 7=detailed solution)';
COMMENT ON COLUMN tutor_messages.cheat_detected IS 'Flagged if message appears to be copied solution';
COMMENT ON COLUMN tutor_messages.response_time_ms IS 'AI response latency for performance monitoring';
COMMENT ON COLUMN tutor_messages.tokens_used IS 'Token usage for cost tracking';

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Conversation lookups
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_student
ON tutor_conversations(student_id);

CREATE INDEX IF NOT EXISTS idx_tutor_conversations_class
ON tutor_conversations(class_id);

CREATE INDEX IF NOT EXISTS idx_tutor_conversations_exercise
ON tutor_conversations(exercise_id);

-- Active conversation queries (filtered index)
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_active
ON tutor_conversations(is_active)
WHERE is_active = true;

-- Date-based queries for analytics
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_started
ON tutor_conversations(started_at DESC);

-- Message lookups
CREATE INDEX IF NOT EXISTS idx_tutor_messages_conversation
ON tutor_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_tutor_messages_created
ON tutor_messages(created_at DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_messages ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Conversation Policies
-- ----------------------------------------------------------------------------

-- Students can view their own conversations
CREATE POLICY "Students can view own conversations"
ON tutor_conversations
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Students can insert their own conversations
CREATE POLICY "Students can create own conversations"
ON tutor_conversations
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

-- Students can update their own active conversations
-- (Only while active - prevents tampering with closed conversations)
CREATE POLICY "Students can update own active conversations"
ON tutor_conversations
FOR UPDATE
TO authenticated
USING (student_id = auth.uid() AND is_active = true)
WITH CHECK (student_id = auth.uid() AND is_active = true);

-- Teachers can view conversations in their classes
CREATE POLICY "Teachers can view class conversations"
ON tutor_conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = tutor_conversations.class_id
    AND c.teacher_id = auth.uid()
  )
);

-- Admins can view all conversations
CREATE POLICY "Admins can view all conversations"
ON tutor_conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ----------------------------------------------------------------------------
-- Message Policies
-- ----------------------------------------------------------------------------

-- Users can view messages if they can access the conversation
CREATE POLICY "Users can view messages of accessible conversations"
ON tutor_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tutor_conversations tc
    WHERE tc.id = tutor_messages.conversation_id
    AND (
      -- Student owns conversation
      tc.student_id = auth.uid()
      -- OR teacher owns class
      OR EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = tc.class_id
        AND c.teacher_id = auth.uid()
      )
      -- OR user is admin
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  )
);

-- Students can insert messages in their own active conversations
CREATE POLICY "Students can insert messages in own conversations"
ON tutor_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tutor_conversations tc
    WHERE tc.id = tutor_messages.conversation_id
    AND tc.student_id = auth.uid()
    AND tc.is_active = true
  )
);

-- Service role can insert messages (for AI responses)
-- This allows the backend to insert AI messages without user context
CREATE POLICY "Service role can insert messages"
ON tutor_messages
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================================
-- Triggers and Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: Auto-update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_tutor_conversation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists (for migration re-runs)
DROP TRIGGER IF EXISTS trg_tutor_conversation_updated ON tutor_conversations;

-- Create trigger for updated_at
CREATE TRIGGER trg_tutor_conversation_updated
BEFORE UPDATE ON tutor_conversations
FOR EACH ROW
EXECUTE FUNCTION update_tutor_conversation_updated_at();

COMMENT ON FUNCTION update_tutor_conversation_updated_at() IS 'Automatically updates updated_at timestamp on conversation modifications';

-- ----------------------------------------------------------------------------
-- Function: Auto-increment message count and track max help level
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_tutor_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update conversation statistics
  UPDATE tutor_conversations
  SET
    message_count = message_count + 1,
    max_help_level_reached = GREATEST(
      max_help_level_reached,
      COALESCE(NEW.help_level, 0)
    )
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

-- Drop trigger if it exists (for migration re-runs)
DROP TRIGGER IF EXISTS trg_tutor_message_count ON tutor_messages;

-- Create trigger for message count
CREATE TRIGGER trg_tutor_message_count
AFTER INSERT ON tutor_messages
FOR EACH ROW
EXECUTE FUNCTION increment_tutor_message_count();

COMMENT ON FUNCTION increment_tutor_message_count() IS 'Automatically updates conversation statistics when messages are added';

-- ============================================================================
-- Permissions
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON tutor_conversations TO authenticated;
GRANT SELECT, INSERT ON tutor_messages TO authenticated;

-- Grant full permissions to service role (for backend operations)
GRANT ALL ON tutor_conversations TO service_role;
GRANT ALL ON tutor_messages TO service_role;

-- Grant sequence permissions (for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
