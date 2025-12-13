-- Migration: Add assignment_id to tutor_conversations
-- Description: Adds assignment_id column for worksheet assignment context in tutor conversations
-- Created: 2025-12-13

-- ============================================================================
-- Add assignment_id column
-- ============================================================================

-- Add the column with foreign key reference
ALTER TABLE tutor_conversations
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES worksheet_assignments(id) ON DELETE SET NULL;

-- Add helpful documentation
COMMENT ON COLUMN tutor_conversations.assignment_id IS 'Worksheet assignment context for exercise-specific conversations';

-- ============================================================================
-- Add composite index for conversation lookup
-- ============================================================================
-- This index optimizes queries to find existing conversations for a specific
-- student + exercise + assignment combination

CREATE INDEX IF NOT EXISTS idx_tutor_conversations_composite
ON tutor_conversations(student_id, exercise_id, assignment_id)
WHERE exercise_id IS NOT NULL AND assignment_id IS NOT NULL;

-- ============================================================================
-- Add column for exercise correction (hidden from student)
-- ============================================================================
-- Store the correction/solution separately so the tutor can reference it
-- without exposing it to the student client

ALTER TABLE tutor_conversations
ADD COLUMN IF NOT EXISTS exercise_correction TEXT;

COMMENT ON COLUMN tutor_conversations.exercise_correction IS 'Exercise correction/solution for tutor context (never sent to client)';
