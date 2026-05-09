-- Migration: Python exercise mastery tracking (auto-derived from submissions)
-- Created: 2026-05-09
--
-- Mirrors the math `student_exercise_mastery` table but with two key differences:
--
-- 1. AUTOMATIC: status is derived from `python_exercise_submissions` via a
--    trigger, not set by the student manually. The math system is opt-in
--    (student clicks "mastered"); the Python system is objective.
--
-- 2. VISIBLE TO TEACHER: RLS allows teachers to read the mastery of students
--    in their classes, via the existing `is_teacher_of_student()` helper.
--    The math system is private to the student.
--
-- Sticky-mastered semantics: once a student has at least one correct
-- submission on an exercise, the row is `mastered` permanently — subsequent
-- failed submissions do NOT downgrade it. Time-based regression will be
-- introduced by the V3 SRS feature on top of this table.
--
-- The implicit `not_worked` state is the absence of a row, hence the CHECK
-- constraint allows only ('mastered', 'needs_review').

-- ============================================================================
-- 1. TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS python_exercise_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES python_exercises(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('mastered', 'needs_review')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_python_mastery UNIQUE (student_id, exercise_id)
);

COMMENT ON TABLE python_exercise_mastery IS
    'Per-student mastery status on Python exercises, auto-derived from python_exercise_submissions via trigger. Sticky-mastered: once acquired, never downgrades automatically.';
COMMENT ON COLUMN python_exercise_mastery.status IS
    '"mastered" if the student has had at least one correct submission, otherwise "needs_review". Absence of row = "not_worked" (implicit).';

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pem_student
    ON python_exercise_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_pem_exercise
    ON python_exercise_mastery(exercise_id);
CREATE INDEX IF NOT EXISTS idx_pem_student_status
    ON python_exercise_mastery(student_id, status);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE python_exercise_mastery ENABLE ROW LEVEL SECURITY;

-- Students can SELECT their own mastery rows
DROP POLICY IF EXISTS pem_select_own ON python_exercise_mastery;
CREATE POLICY pem_select_own ON python_exercise_mastery
    FOR SELECT TO authenticated
    USING (auth.uid() = student_id);

-- Teachers can SELECT mastery of students in their classes
-- (via the SECURITY DEFINER helper from migration 20251205100000)
DROP POLICY IF EXISTS pem_select_teacher ON python_exercise_mastery;
CREATE POLICY pem_select_teacher ON python_exercise_mastery
    FOR SELECT TO authenticated
    USING (is_teacher_of_student(student_id));

-- Note: no INSERT/UPDATE/DELETE policies for users. Only the trigger
-- (which runs with table-owner privileges) modifies rows. Manual override
-- will be introduced by the V3 SRS feature.

-- ============================================================================
-- 4. updated_at TRIGGER (BEFORE UPDATE)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_pem_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pem_updated_at_trigger ON python_exercise_mastery;
CREATE TRIGGER pem_updated_at_trigger
    BEFORE UPDATE ON python_exercise_mastery
    FOR EACH ROW EXECUTE FUNCTION update_pem_updated_at();

-- ============================================================================
-- 5. AUTO-UPDATE TRIGGER on submissions (the core of the feature)
-- ============================================================================
--
-- Behaviour, in plain words:
--
--   B2: submission(is_correct=true) on an exercise without a row
--       → INSERT row with status='mastered'.
--   B3: submission(is_correct=false) on an exercise without a row
--       → INSERT row with status='needs_review'.
--   B4: submission(is_correct=true) on a 'needs_review' row
--       → UPDATE status='mastered' (and updated_at via the BEFORE UPDATE trigger).
--   B5: submission(is_correct=false) on a 'mastered' row
--       → NO-OP (sticky). The row is left alone, updated_at unchanged.
--
-- These 4 cases are validated manually after each submission via the UI; see
-- docs/wip/mastery-auto-progress.md.

CREATE OR REPLACE FUNCTION update_python_mastery_on_submission()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_correct THEN
        -- B2 (insert) or B4 (upgrade from needs_review).
        -- The WHERE clause makes B5 -> NO-OP for 'mastered' rows (idempotent).
        INSERT INTO python_exercise_mastery (student_id, exercise_id, status)
        VALUES (NEW.student_id, NEW.exercise_id, 'mastered')
        ON CONFLICT (student_id, exercise_id)
        DO UPDATE SET status = 'mastered'
        WHERE python_exercise_mastery.status != 'mastered';
    ELSE
        -- B3: insert 'needs_review' on first failed attempt only.
        -- B5 path: ON CONFLICT DO NOTHING preserves an existing 'mastered'.
        INSERT INTO python_exercise_mastery (student_id, exercise_id, status)
        VALUES (NEW.student_id, NEW.exercise_id, 'needs_review')
        ON CONFLICT (student_id, exercise_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS python_mastery_on_submission ON python_exercise_submissions;
CREATE TRIGGER python_mastery_on_submission
    AFTER INSERT ON python_exercise_submissions
    FOR EACH ROW EXECUTE FUNCTION update_python_mastery_on_submission();
