-- Migration: Simplify worksheet_assignments
-- Remove submission-related columns since worksheets are view-only (PDF/online)
-- No student submissions expected

-- ============================================================================
-- 1. WORKSHEET_ASSIGNMENTS: Remove submission-related columns
-- ============================================================================

ALTER TABLE worksheet_assignments
  DROP COLUMN IF EXISTS due_at,
  DROP COLUMN IF EXISTS show_solutions_before_due,
  DROP COLUMN IF EXISTS allow_late_submission,
  DROP COLUMN IF EXISTS max_attempts,
  DROP COLUMN IF EXISTS time_limit_minutes;

-- ============================================================================
-- 2. WORKSHEET_INSTANCES: Remove submission tracking columns
-- ============================================================================

ALTER TABLE worksheet_instances
  DROP COLUMN IF EXISTS accessed_at,
  DROP COLUMN IF EXISTS submitted_at,
  DROP COLUMN IF EXISTS time_spent_seconds;

-- ============================================================================
-- 3. Update any 'after_due' correction mode to 'manual'
-- (Keep enum type as-is to avoid PostgreSQL enum complexity)
-- ============================================================================

UPDATE worksheet_assignments
SET correction_release_mode = 'manual'
WHERE correction_release_mode = 'after_due';

-- ============================================================================
-- 4. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE worksheet_assignments IS
'Worksheet assignments to classes. Simplified model - worksheets are view-only (PDF or online consultation). No student submissions.';

COMMENT ON TABLE worksheet_instances IS
'Individualized worksheet instances per student. Contains personalized exercise data generated from variant parameters.';

COMMENT ON COLUMN worksheet_assignments.correction_release_mode IS
'Valid modes: manual, immediate, scheduled. The after_due value is deprecated and should not be used.';
