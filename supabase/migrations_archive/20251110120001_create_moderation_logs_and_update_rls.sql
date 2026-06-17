-- =============================================
-- Moderation System Phase 1: Moderation Logs + RLS Updates
-- =============================================
-- Migration: Create moderation_logs table and update existing RLS policies
-- Description: Audit trail for all moderation actions + enable teacher visibility
--
-- Features:
-- - Complete audit trail of moderation actions
-- - Update conversations RLS: teachers can view student 1-on-1 chats
-- - Update messages RLS: block sending if user is restricted
-- - Teacher moderation capabilities

-- =============================================
-- Part 1: Create moderation_logs table
-- =============================================

CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who performed the action
  moderator_id UUID NOT NULL REFERENCES public.profiles(id),

  -- What action was performed
  action TEXT NOT NULL CHECK (action IN (
    'delete_message',
    'mute_user',
    'unmute_user',
    'timeout_user',
    'ban_user',
    'unban_user',
    'review_report',
    'export_conversation'
  )),

  -- What was affected
  target_type TEXT NOT NULL CHECK (target_type IN ('message', 'user', 'conversation', 'report')),
  target_id UUID NOT NULL, -- No FK constraint: audit logs must persist even if target is deleted

  -- Context
  reason TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Indexes for Audit Queries
-- =============================================

-- Query by moderator (who did what, ordered by time)
CREATE INDEX IF NOT EXISTS idx_moderation_logs_moderator
  ON public.moderation_logs(moderator_id, created_at DESC);

-- Query by target (what happened to this message/user/conversation)
CREATE INDEX IF NOT EXISTS idx_moderation_logs_target
  ON public.moderation_logs(target_type, target_id);

-- Query by action (all mutes, bans, etc.)
CREATE INDEX IF NOT EXISTS idx_moderation_logs_action
  ON public.moderation_logs(action, created_at DESC);

-- =============================================
-- Performance Optimization for RLS Policies
-- =============================================

-- Optimize teacher-student relationship lookups in RLS policies
-- Used by conversations and messages SELECT policies to check if both
-- participants are students of the requesting teacher
CREATE INDEX IF NOT EXISTS idx_class_members_student_lookup
  ON public.class_members(student_id, class_id);

COMMENT ON INDEX idx_class_members_student_lookup IS
  'Optimizes RLS policy checks for teacher access to student conversations';

-- =============================================
-- Enable Row Level Security
-- =============================================

ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies for moderation_logs
-- =============================================

-- Teachers and admins can view all moderation logs
CREATE POLICY "Teachers can view moderation logs"
  ON public.moderation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- Teachers and admins can create moderation logs
CREATE POLICY "Teachers can create moderation logs"
  ON public.moderation_logs FOR INSERT
  WITH CHECK (
    auth.uid() = moderator_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- =============================================
-- Part 2: Update conversations RLS
-- =============================================
-- Allow teachers to view student 1-on-1 chats when both are their students

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

-- Recreate with teacher visibility for student 1-on-1 chats
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT
  USING (
    -- Original: user is a participant in this conversation
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
    OR
    -- NEW: Teachers can view conversations where BOTH participants are their students
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('teacher', 'admin')
      )
      AND (
        -- Class channels (is_group = true) - teachers are already participants
        conversations.is_group = true
        OR
        -- 1-on-1 chats where BOTH participants are this teacher's students
        (
          conversations.is_group = false
          AND EXISTS (
            -- Find the two participants of this 1-on-1 conversation
            SELECT 1
            FROM public.conversation_participants cp1
            JOIN public.conversation_participants cp2
              ON cp1.conversation_id = cp2.conversation_id
              AND cp1.user_id < cp2.user_id -- Prevent duplicate pairs
            WHERE cp1.conversation_id = conversations.id
            -- CRITICAL: Ensure exactly 2 participants (not 3+)
            AND (
              SELECT COUNT(*)
              FROM public.conversation_participants
              WHERE conversation_id = conversations.id
            ) = 2
            -- BOTH participants must be students of this teacher
            AND EXISTS (
              SELECT 1 FROM public.class_members cm1
              JOIN public.classes c1 ON c1.id = cm1.class_id
              WHERE cm1.student_id = cp1.user_id
              AND c1.teacher_id = auth.uid()
            )
            AND EXISTS (
              SELECT 1 FROM public.class_members cm2
              JOIN public.classes c2 ON c2.id = cm2.class_id
              WHERE cm2.student_id = cp2.user_id
              AND c2.teacher_id = auth.uid()
            )
          )
        )
      )
    )
  );

-- =============================================
-- Part 3: Update messages RLS - SELECT policy
-- =============================================
-- Teachers can view messages in student 1-on-1 chats

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

-- Recreate with teacher visibility
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    -- Don't show soft-deleted messages to regular users
    deleted_at IS NULL
    AND (
      -- Original: User is a participant in this conversation
      EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
      )
      OR
      -- NEW: Teachers can view messages in conversations where both participants are their students
      (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('teacher', 'admin')
        )
        AND EXISTS (
          SELECT 1 FROM public.conversations c
          WHERE c.id = messages.conversation_id
          AND (
            -- Class channels (teachers are participants)
            c.is_group = true
            OR
            -- 1-on-1 where both are teacher's students
            (
              c.is_group = false
              AND EXISTS (
                SELECT 1
                FROM public.conversation_participants cp1
                JOIN public.conversation_participants cp2
                  ON cp1.conversation_id = cp2.conversation_id
                  AND cp1.user_id < cp2.user_id
                WHERE cp1.conversation_id = c.id
                AND EXISTS (
                  SELECT 1 FROM public.class_members cm1
                  JOIN public.classes c1 ON c1.id = cm1.class_id
                  WHERE cm1.student_id = cp1.user_id
                  AND c1.teacher_id = auth.uid()
                )
                AND EXISTS (
                  SELECT 1 FROM public.class_members cm2
                  JOIN public.classes c2 ON c2.id = cm2.class_id
                  WHERE cm2.student_id = cp2.user_id
                  AND c2.teacher_id = auth.uid()
                )
              )
            )
          )
        )
      )
    )
  );

-- =============================================
-- Part 4: Update messages RLS - INSERT policy
-- =============================================
-- Block sending messages if user is restricted

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

-- Recreate with restriction check
CREATE POLICY "Users can send messages to their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
    -- NEW: Block if user has active restriction
    AND NOT EXISTS (
      SELECT 1 FROM public.user_restrictions ur
      WHERE ur.user_id = auth.uid()
      AND (
        -- Global restriction (affects all conversations)
        (ur.scope_type = 'global' AND ur.scope_id IS NULL)
        OR
        -- Conversation-specific restriction
        (ur.scope_type = 'conversation' AND ur.scope_id = messages.conversation_id)
      )
      -- Must be active (not expired)
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  );

-- =============================================
-- Helper Function: Log moderation action
-- =============================================

CREATE OR REPLACE FUNCTION log_moderation_action(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Verify caller is a teacher/admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('teacher', 'admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: only teachers can perform moderation actions';
  END IF;

  -- Insert log entry
  INSERT INTO moderation_logs (
    moderator_id,
    action,
    target_type,
    target_id,
    reason,
    metadata
  ) VALUES (
    auth.uid(),
    p_action,
    p_target_type,
    p_target_id,
    p_reason,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_moderation_action TO authenticated;

-- =============================================
-- Helper Function: Get moderation history for user
-- =============================================

CREATE OR REPLACE FUNCTION get_user_moderation_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  moderator_id UUID,
  moderator_name TEXT,
  action TEXT,
  target_type TEXT,
  target_id UUID,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify caller is a teacher/admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: only teachers can view moderation history';
  END IF;

  -- Return moderation logs for this user
  RETURN QUERY
  SELECT
    ml.id,
    ml.moderator_id,
    p.firstname || ' ' || p.lastname AS moderator_name,
    ml.action,
    ml.target_type,
    ml.target_id,
    ml.reason,
    ml.metadata,
    ml.created_at
  FROM moderation_logs ml
  JOIN profiles p ON p.id = ml.moderator_id
  WHERE ml.target_type = 'user'
  AND ml.target_id = p_user_id
  ORDER BY ml.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_moderation_history TO authenticated;

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE public.moderation_logs IS 'Audit trail of all moderation actions performed by teachers';
COMMENT ON COLUMN public.moderation_logs.action IS 'Type of moderation action performed';
COMMENT ON COLUMN public.moderation_logs.target_type IS 'What entity was affected (message, user, conversation, report)';
COMMENT ON COLUMN public.moderation_logs.metadata IS 'Additional context (conversation_id, message content snapshot, etc.)';
COMMENT ON FUNCTION log_moderation_action IS 'Create a moderation log entry (teacher-only)';
COMMENT ON FUNCTION get_user_moderation_history IS 'Get moderation history for a specific user (teacher-only)';

-- =============================================
-- Success Message
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Moderation logs table created and RLS policies updated!';
  RAISE NOTICE 'Teachers can now:';
  RAISE NOTICE '  - View student 1-on-1 conversations';
  RAISE NOTICE '  - View all messages in student chats';
  RAISE NOTICE '  - See complete moderation audit trail';
  RAISE NOTICE 'Students cannot send messages if restricted (mute/timeout/ban)';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run pnpm db:migrate to push changes';
  RAISE NOTICE '  2. Run pnpm db:types to update TypeScript types';
  RAISE NOTICE '  3. Test with: SELECT * FROM user_restrictions; SELECT * FROM moderation_logs;';
END $$;
