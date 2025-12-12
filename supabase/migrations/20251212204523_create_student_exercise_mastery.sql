-- ============================================================================
-- STUDENT EXERCISE MASTERY TRACKING MIGRATION
-- ============================================================================
-- This migration creates a private tracking table for students to mark their
-- mastery level of exercises. This is a personal tracking feature that teachers
-- CANNOT see - it's purely for student self-organization.
--
-- Key Features:
-- 1. Students can mark exercises as 'not_worked', 'mastered', or 'needs_review'
-- 2. Completely private - only the student can see their own mastery records
-- 3. Simple status tracking with automatic timestamp updates
--
-- Privacy Note:
-- This table intentionally has NO policies for teachers to view data.
-- Students use this for their own organization, not for teacher monitoring.
-- ============================================================================

-- ============================================================================
-- 1. CREATE student_exercise_mastery TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_exercise_mastery (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core relationships
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

    -- Mastery status
    status TEXT NOT NULL DEFAULT 'not_worked'
        CHECK (status IN ('not_worked', 'mastered', 'needs_review')),

    -- Timestamp
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate entries per student/exercise
    CONSTRAINT unique_student_exercise_mastery
        UNIQUE (student_id, exercise_id)
);

-- Add comments for clarity
COMMENT ON TABLE student_exercise_mastery IS
    'Private tracking of student exercise mastery levels. Only visible to the student themselves - teachers cannot access this data.';

COMMENT ON COLUMN student_exercise_mastery.status IS
    'Mastery status: not_worked (default), mastered (student feels confident), needs_review (student wants to revisit)';

COMMENT ON COLUMN student_exercise_mastery.updated_at IS
    'Timestamp of last status change, auto-updated via trigger';

-- ============================================================================
-- 2. CREATE INDEXES for performance
-- ============================================================================

-- Index for student queries (most common: "show my mastery status")
CREATE INDEX idx_student_exercise_mastery_student
    ON student_exercise_mastery(student_id);

-- Index for exercise queries (for potential analytics)
CREATE INDEX idx_student_exercise_mastery_exercise
    ON student_exercise_mastery(exercise_id);

-- Index for filtering by status (e.g., "show exercises I need to review")
CREATE INDEX idx_student_exercise_mastery_status
    ON student_exercise_mastery(student_id, status);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) - PRIVATE TO STUDENT
-- ============================================================================

-- Enable RLS
ALTER TABLE student_exercise_mastery ENABLE ROW LEVEL SECURITY;

-- Students can SELECT their own mastery records
CREATE POLICY "Students can view their own mastery records"
    ON student_exercise_mastery FOR SELECT
    USING (auth.uid() = student_id);

-- Students can INSERT mastery records for themselves
CREATE POLICY "Students can insert their own mastery records"
    ON student_exercise_mastery FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Students can UPDATE their own mastery records
CREATE POLICY "Students can update their own mastery records"
    ON student_exercise_mastery FOR UPDATE
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Students can DELETE their own mastery records
CREATE POLICY "Students can delete their own mastery records"
    ON student_exercise_mastery FOR DELETE
    USING (auth.uid() = student_id);

-- NOTE: No policies for teachers or admins - this data is intentionally private

-- ============================================================================
-- 4. TRIGGER for auto-updating updated_at
-- ============================================================================

-- Create the trigger function (specific to this table to avoid conflicts)
CREATE OR REPLACE FUNCTION update_student_exercise_mastery_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_student_exercise_mastery_updated_at IS
    'Automatically updates updated_at timestamp when mastery status changes';

-- Create the trigger
CREATE TRIGGER trigger_update_student_exercise_mastery_updated_at
    BEFORE UPDATE ON student_exercise_mastery
    FOR EACH ROW
    EXECUTE FUNCTION update_student_exercise_mastery_updated_at();

-- ============================================================================
-- 5. GRANTS (ensure proper permissions)
-- ============================================================================

-- Grant access to authenticated users (RLS will filter appropriately)
GRANT SELECT, INSERT, UPDATE, DELETE ON student_exercise_mastery TO authenticated;

-- ============================================================================
-- 6. VALIDATION
-- ============================================================================

DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_rls_enabled BOOLEAN;
    v_policy_count INTEGER;
BEGIN
    -- Check table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'student_exercise_mastery'
    ) INTO v_table_exists;

    -- Check RLS is enabled
    SELECT relrowsecurity
    FROM pg_class
    WHERE relname = 'student_exercise_mastery'
    INTO v_rls_enabled;

    -- Count policies
    SELECT COUNT(*)
    FROM pg_policies
    WHERE tablename = 'student_exercise_mastery'
    INTO v_policy_count;

    -- Validate
    IF NOT v_table_exists THEN
        RAISE EXCEPTION 'Migration validation failed: student_exercise_mastery table not created';
    END IF;

    IF NOT v_rls_enabled THEN
        RAISE EXCEPTION 'Migration validation failed: RLS not enabled on student_exercise_mastery';
    END IF;

    IF v_policy_count < 4 THEN
        RAISE EXCEPTION 'Migration validation failed: Expected 4 RLS policies, found %', v_policy_count;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration validation successful!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created: student_exercise_mastery table';
    RAISE NOTICE 'Indexes: 3 (student_id, exercise_id, status)';
    RAISE NOTICE 'RLS Policies: 4 (SELECT, INSERT, UPDATE, DELETE)';
    RAISE NOTICE 'Trigger: auto-update updated_at';
    RAISE NOTICE '';
    RAISE NOTICE 'Privacy: This table is PRIVATE to students only.';
    RAISE NOTICE 'Teachers cannot see student mastery data.';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '1. Run: pnpm db:migrate';
    RAISE NOTICE '2. Update: src/lib/types/database.ts';
    RAISE NOTICE '3. Update: docs/architecture/database-schema.md';
    RAISE NOTICE '';
END $$;
