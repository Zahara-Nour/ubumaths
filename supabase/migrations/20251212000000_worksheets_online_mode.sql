-- Migration: Worksheets Online Mode
-- ============================================================================
-- Purpose: Enable online consultation mode for worksheet assignments with:
--   - Individual student assignments (in addition to class assignments)
--   - Per-exercise correction visibility override at assignment level
--   - Global and granular correction visibility controls
--
-- Date: 2025-12-12
--
-- Tables Created:
--   1. worksheet_assignment_students - Individual student assignments
--   2. worksheet_assignment_exercise_settings - Per-exercise visibility overrides
--
-- Columns Added:
--   - worksheet_assignments.show_corrections - Global toggle for corrections
--   - worksheet_exercises.correction_visible - Default visibility on template
--
-- ============================================================================

-- ============================================================================
-- 1. NEW COLUMNS ON EXISTING TABLES
-- ============================================================================

-- Add global corrections toggle to worksheet_assignments
ALTER TABLE public.worksheet_assignments
ADD COLUMN IF NOT EXISTS show_corrections BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.worksheet_assignments.show_corrections IS 'Global toggle to show/hide all corrections for this assignment';

-- Add default correction visibility to worksheet_exercises (template level)
ALTER TABLE public.worksheet_exercises
ADD COLUMN IF NOT EXISTS correction_visible BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.worksheet_exercises.correction_visible IS 'Default correction visibility for this exercise in the worksheet template';

-- ============================================================================
-- 2. TABLE: worksheet_assignment_students
-- Purpose: Assign worksheets to individual students (in addition to class assignments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.worksheet_assignment_students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.worksheet_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints: One assignment per student per assignment
    CONSTRAINT was_unique UNIQUE (assignment_id, student_id)
);

COMMENT ON TABLE public.worksheet_assignment_students IS 'Individual student assignments for worksheets (complement to class-based assignments)';
COMMENT ON COLUMN public.worksheet_assignment_students.assignment_id IS 'Reference to the worksheet assignment';
COMMENT ON COLUMN public.worksheet_assignment_students.student_id IS 'Student assigned to this worksheet';

-- Indexes for worksheet_assignment_students
CREATE INDEX idx_was_assignment_id ON public.worksheet_assignment_students(assignment_id);
CREATE INDEX idx_was_student_id ON public.worksheet_assignment_students(student_id);
-- Composite index for common query pattern
CREATE INDEX idx_was_student_assignment ON public.worksheet_assignment_students(student_id, assignment_id);

-- Enable RLS
ALTER TABLE public.worksheet_assignment_students ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. TABLE: worksheet_assignment_exercise_settings
-- Purpose: Override correction visibility per exercise at assignment level
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.worksheet_assignment_exercise_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.worksheet_assignments(id) ON DELETE CASCADE,
    worksheet_exercise_id UUID NOT NULL REFERENCES public.worksheet_exercises(id) ON DELETE CASCADE,

    -- Settings
    show_correction BOOLEAN NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints: One setting per exercise per assignment
    CONSTRAINT waes_unique UNIQUE (assignment_id, worksheet_exercise_id)
);

COMMENT ON TABLE public.worksheet_assignment_exercise_settings IS 'Per-exercise correction visibility overrides at assignment level';
COMMENT ON COLUMN public.worksheet_assignment_exercise_settings.assignment_id IS 'Reference to the worksheet assignment';
COMMENT ON COLUMN public.worksheet_assignment_exercise_settings.worksheet_exercise_id IS 'Reference to the worksheet exercise';
COMMENT ON COLUMN public.worksheet_assignment_exercise_settings.show_correction IS 'Whether to show correction for this specific exercise in this assignment';

-- Indexes for worksheet_assignment_exercise_settings
CREATE INDEX idx_waes_assignment_id ON public.worksheet_assignment_exercise_settings(assignment_id);
CREATE INDEX idx_waes_worksheet_exercise_id ON public.worksheet_assignment_exercise_settings(worksheet_exercise_id);
-- Composite index for common query pattern (fetch all settings for an assignment)
CREATE INDEX idx_waes_assignment_exercise ON public.worksheet_assignment_exercise_settings(assignment_id, worksheet_exercise_id);

-- Enable RLS
ALTER TABLE public.worksheet_assignment_exercise_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. TRIGGER: updated_at for worksheet_assignment_exercise_settings
-- ============================================================================
CREATE TRIGGER update_waes_updated_at
    BEFORE UPDATE ON public.worksheet_assignment_exercise_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. HELPER FUNCTION: Check if user can access assignment
-- Purpose: Security definer function to check assignment access
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_access_assignment(p_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Check if user is:
    -- 1. The assignment creator (teacher) - always has access
    -- 2. A student in the assigned class (with timing/status checks)
    -- 3. An individually assigned student (with timing/status checks)
    RETURN EXISTS (
        SELECT 1 FROM public.worksheet_assignments wa
        WHERE wa.id = p_assignment_id
        AND (
            -- Creator/teacher access (always)
            wa.created_by = v_user_id
            OR
            -- Student access requires:
            -- - Assignment status = 'active'
            -- - Current time >= available_from (if set)
            (
                wa.status = 'active'
                AND (wa.available_from IS NULL OR wa.available_from <= NOW())
                AND (
                    -- Class member access (active classes only)
                    EXISTS (
                        SELECT 1 FROM public.class_members cm
                        JOIN public.classes c ON c.id = cm.class_id
                        WHERE cm.class_id = wa.class_id
                        AND cm.student_id = v_user_id
                        AND c.is_active = TRUE
                    )
                    OR
                    -- Individual student assignment access
                    EXISTS (
                        SELECT 1 FROM public.worksheet_assignment_students was
                        WHERE was.assignment_id = wa.id
                        AND was.student_id = v_user_id
                    )
                )
            )
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.can_access_assignment(UUID) IS 'Security definer function to check if current user can access a worksheet assignment';
GRANT EXECUTE ON FUNCTION public.can_access_assignment(UUID) TO authenticated;

-- ============================================================================
-- 6. RLS POLICIES: worksheet_assignment_students
-- ============================================================================

-- Teachers can manage individual assignments they created
CREATE POLICY "Teachers can manage own individual assignments"
ON public.worksheet_assignment_students
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.worksheet_assignments wa
        WHERE wa.id = worksheet_assignment_students.assignment_id
        AND wa.created_by = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.worksheet_assignments wa
        WHERE wa.id = worksheet_assignment_students.assignment_id
        AND wa.created_by = auth.uid()
    )
);

-- Students can view their own individual assignments
CREATE POLICY "Students can view own individual assignments"
ON public.worksheet_assignment_students
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Admins can manage all individual assignments
CREATE POLICY "Admins can manage all individual assignments"
ON public.worksheet_assignment_students
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- 7. RLS POLICIES: worksheet_assignment_exercise_settings
-- ============================================================================

-- Teachers can manage exercise settings for their assignments
CREATE POLICY "Teachers can manage exercise settings for own assignments"
ON public.worksheet_assignment_exercise_settings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.worksheet_assignments wa
        WHERE wa.id = worksheet_assignment_exercise_settings.assignment_id
        AND wa.created_by = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.worksheet_assignments wa
        WHERE wa.id = worksheet_assignment_exercise_settings.assignment_id
        AND wa.created_by = auth.uid()
    )
);

-- Students can view exercise settings for their assignments
CREATE POLICY "Students can view exercise settings for their assignments"
ON public.worksheet_assignment_exercise_settings
FOR SELECT
TO authenticated
USING (
    can_access_assignment(assignment_id)
);

-- Admins can manage all exercise settings
CREATE POLICY "Admins can manage all exercise settings"
ON public.worksheet_assignment_exercise_settings
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- 8. UPDATE EXISTING RLS POLICY: worksheet_assignments
-- Purpose: Allow students with individual assignments to view them
-- ============================================================================

-- Drop the existing student policy and recreate with individual assignment support
DROP POLICY IF EXISTS "Students can view class assignments" ON public.worksheet_assignments;

CREATE POLICY "Students can view their assignments"
ON public.worksheet_assignments
FOR SELECT
TO authenticated
USING (
    -- Student access requires:
    -- - Assignment status = 'active'
    -- - Current time >= available_from (if set)
    worksheet_assignments.status = 'active'
    AND (worksheet_assignments.available_from IS NULL OR worksheet_assignments.available_from <= NOW())
    AND (
        -- Class-based assignment
        EXISTS (
            SELECT 1 FROM public.class_members cm
            JOIN public.classes c ON c.id = cm.class_id
            WHERE cm.class_id = worksheet_assignments.class_id
            AND cm.student_id = auth.uid()
            AND c.is_active = TRUE
        )
        OR
        -- Individual assignment
        EXISTS (
            SELECT 1 FROM public.worksheet_assignment_students was
            WHERE was.assignment_id = worksheet_assignments.id
            AND was.student_id = auth.uid()
        )
    )
);

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on new tables
GRANT ALL ON public.worksheet_assignment_students TO authenticated;
GRANT ALL ON public.worksheet_assignment_exercise_settings TO authenticated;

-- ============================================================================
-- 10. VERIFICATION
-- ============================================================================
DO $$
DECLARE
    v_table_count INTEGER;
    v_column_count INTEGER;
    v_policy_count INTEGER;
    v_index_count INTEGER;
BEGIN
    -- Count new tables
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'worksheet_assignment_students',
        'worksheet_assignment_exercise_settings'
    );

    -- Count new columns
    SELECT COUNT(*) INTO v_column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND (
        (table_name = 'worksheet_assignments' AND column_name = 'show_corrections')
        OR (table_name = 'worksheet_exercises' AND column_name = 'correction_visible')
    );

    -- Count RLS policies on new tables
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
        'worksheet_assignment_students',
        'worksheet_assignment_exercise_settings'
    );

    -- Count indexes on new tables
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND (indexname LIKE 'idx_was_%' OR indexname LIKE 'idx_waes_%');

    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Worksheets Online Mode';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'New tables created: % / 2', v_table_count;
    RAISE NOTICE '  - worksheet_assignment_students';
    RAISE NOTICE '  - worksheet_assignment_exercise_settings';
    RAISE NOTICE '';
    RAISE NOTICE 'New columns added: % / 2', v_column_count;
    RAISE NOTICE '  - worksheet_assignments.show_corrections';
    RAISE NOTICE '  - worksheet_exercises.correction_visible';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies on new tables: %', v_policy_count;
    RAISE NOTICE 'Indexes on new tables: %', v_index_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Helper function: can_access_assignment(UUID)';
    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run: pnpm db:migrate';
    RAISE NOTICE '  2. Update: src/lib/types/database.ts';
    RAISE NOTICE '  3. Update: docs/architecture/database-schema.md';
    RAISE NOTICE '===============================================';

    -- Validate all tables exist
    IF v_table_count < 2 THEN
        RAISE EXCEPTION 'Not all tables were created! Expected 2, got %', v_table_count;
    END IF;

    -- Validate columns exist
    IF v_column_count < 2 THEN
        RAISE EXCEPTION 'Not all columns were added! Expected 2, got %', v_column_count;
    END IF;

    -- Validate RLS is enabled on new tables
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'worksheet_assignment_students'
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS is not enabled on worksheet_assignment_students table!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'worksheet_assignment_exercise_settings'
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS is not enabled on worksheet_assignment_exercise_settings table!';
    END IF;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
