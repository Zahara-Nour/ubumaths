-- Migration: Add DELETE policy for tutor_messages
-- Description: Allow students to delete messages from their own conversations
-- Created: 2025-12-27

-- ============================================================================
-- Add DELETE RLS Policy for tutor_messages
-- ============================================================================

-- Students can delete messages from their own conversations
CREATE POLICY "Students can delete messages from own conversations"
ON tutor_messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tutor_conversations tc
    WHERE tc.id = tutor_messages.conversation_id
    AND tc.student_id = auth.uid()
  )
);

-- ============================================================================
-- Grant DELETE permission to authenticated users
-- ============================================================================

GRANT DELETE ON tutor_messages TO authenticated;

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON POLICY "Students can delete messages from own conversations" ON tutor_messages
IS 'Allows students to clear their tutor conversation history';
