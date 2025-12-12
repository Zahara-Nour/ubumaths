-- Migration: Multi-Class Worksheet Assignments
-- ============================================================================
-- Purpose: Enable assigning worksheets to multiple classes simultaneously
--
-- Problem: Current schema has 1-1 relationship (worksheet_assignments.class_id)
--          which limits assignments to a single class.
--
-- Solution: Create a junction table worksheet_assignment_classes for N-N relationship
--           while maintaining backward compatibility during transition.
--
-- Date: 2025-12-12
--
-- Tables Created:
--   1. worksheet_assignment_classes - Junction table for multi-class assignments
--
-- Functions Created:
--   1. is_in_assigned_class(UUID) - SECURITY DEFINER to check class membership
--
-- Changes:
--   - worksheet_assignments.class_id becomes nullable (backward compat)
--   - Updated RLS policies to use new junction table
--
-- ============================================================================

-- ============================================================================
-- 1. CREATE JUNCTION TABLE: worksheet_assignment_classes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.worksheet_assignment_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.worksheet_assignments(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints: One entry per class per assignment
    CONSTRAINT wac_unique UNIQUE (assignment_id, class_id)
);

COMMENT ON TABLE public.worksheet_assignment_classes IS 'Junction table linking worksheet assignments to multiple classes';
COMMENT ON COLUMN public.worksheet_assignment_classes.assignment_id IS 'Reference to the worksheet assignment';
COMMENT ON COLUMN public.worksheet_assignment_classes.class_id IS 'Reference to the class this assignment is distributed to';

-- Indexes for worksheet_assignment_classes
-- idx_wac_class_id: For queries fetching all assignments for a specific class
CREATE INDEX idx_wac_class_id ON public.worksheet_assignment_classes(class_id);

-- idx_wac_assignment_class: Composite index serves dual purpose:
--   1. Queries filtering on assignment_id alone (B-tree can use leading column)
--   2. Queries filtering on both assignment_id AND class_id
CREATE INDEX idx_wac_assignment_class ON public.worksheet_assignment_classes(assignment_id, class_id);

-- Enable RLS
ALTER TABLE public.worksheet_assignment_classes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. MIGRATE EXISTING DATA
-- ============================================================================
-- Copy existing class_id relationships to the new junction table
INSERT INTO public.worksheet_assignment_classes (assignment_id, class_id)
SELECT id, class_id
FROM public.worksheet_assignments
WHERE class_id IS NOT NULL
ON CONFLICT (assignment_id, class_id) DO NOTHING;

-- ============================================================================
-- 3. MAKE class_id NULLABLE (backward compatibility)
-- ============================================================================
-- Note: We keep the column for now to allow gradual migration of application code
-- A future migration can remove it entirely once all code uses the junction table
ALTER TABLE public.worksheet_assignments
ALTER COLUMN class_id DROP NOT NULL;

COMMENT ON COLUMN public.worksheet_assignments.class_id IS 'DEPRECATED: Use worksheet_assignment_classes table instead. Kept for backward compatibility.';

-- ============================================================================
-- 4. CREATE SECURITY DEFINER FUNCTION: is_in_assigned_class
-- ============================================================================
-- Purpose: Check if current user is a member of any class assigned to a worksheet
-- Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_in_assigned_class(p_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM worksheet_assignment_classes wac
        JOIN class_members cm ON cm.class_id = wac.class_id
        JOIN classes c ON c.id = wac.class_id
        WHERE wac.assignment_id = p_assignment_id
        AND cm.student_id = auth.uid()
        AND c.is_active = TRUE
    );
$$;

COMMENT ON FUNCTION public.is_in_assigned_class(UUID) IS 'Check if current user is in any class assigned to this worksheet (SECURITY DEFINER to bypass RLS)';
GRANT EXECUTE ON FUNCTION public.is_in_assigned_class(UUID) TO authenticated;

-- ============================================================================
-- 5. UPDATE RLS POLICIES ON worksheet_assignments
-- ============================================================================

-- Drop the existing student policy (uses old class_id column)
DROP POLICY IF EXISTS "Students can view their assignments" ON public.worksheet_assignments;
DROP POLICY IF EXISTS "Students can view class assignments" ON public.worksheet_assignments;

-- Recreate with support for both:
-- 1. Multi-class assignments (new junction table)
-- 2. Individual assignments (worksheet_assignment_students)
CREATE POLICY "Students can view their assignments"
ON public.worksheet_assignments
FOR SELECT
TO authenticated
USING (
    -- Assignment must be active and available
    status = 'active'
    AND (available_from IS NULL OR available_from <= NOW())
    AND (
        -- Class-based assignment via junction table (NEW)
        is_in_assigned_class(id)
        OR
        -- Legacy: Class-based assignment via class_id column (DEPRECATED, backward compat)
        EXISTS (
            SELECT 1 FROM class_members cm
            JOIN classes c ON c.id = cm.class_id
            WHERE cm.class_id = worksheet_assignments.class_id
            AND cm.student_id = auth.uid()
            AND c.is_active = TRUE
        )
        OR
        -- Individual assignment (use SECURITY DEFINER function to avoid recursion)
        has_individual_assignment(id)
    )
);

-- ============================================================================
-- 6. UPDATE can_access_assignment FUNCTION
-- ============================================================================
-- Update the existing function to use the new junction table
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
    -- 2. A student in an assigned class (with timing/status checks)
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
                    -- Class member access via junction table (NEW)
                    EXISTS (
                        SELECT 1 FROM public.worksheet_assignment_classes wac
                        JOIN public.class_members cm ON cm.class_id = wac.class_id
                        JOIN public.classes c ON c.id = wac.class_id
                        WHERE wac.assignment_id = wa.id
                        AND cm.student_id = v_user_id
                        AND c.is_active = TRUE
                    )
                    OR
                    -- Legacy: Class member access via class_id (DEPRECATED, backward compat)
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

-- ============================================================================
-- 7. RLS POLICIES FOR worksheet_assignment_classes
-- ============================================================================

-- Teachers can manage class assignments for their own assignments
CREATE POLICY "Teachers can manage own assignment classes"
ON public.worksheet_assignment_classes
FOR ALL
TO authenticated
USING (is_assignment_creator(assignment_id))
WITH CHECK (is_assignment_creator(assignment_id));

-- Students can view class assignments for classes they belong to
CREATE POLICY "Students can view their assignment classes"
ON public.worksheet_assignment_classes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM class_members cm
        JOIN classes c ON c.id = cm.class_id
        WHERE cm.class_id = worksheet_assignment_classes.class_id
        AND cm.student_id = auth.uid()
        AND c.is_active = TRUE
    )
);

-- Admins can manage all assignment classes
CREATE POLICY "Admins can manage all assignment classes"
ON public.worksheet_assignment_classes
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant only necessary permissions on new table (principle of least privilege)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worksheet_assignment_classes TO authenticated;

-- ============================================================================
-- 9. VERIFICATION
-- ============================================================================
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_data_migrated INTEGER;
    v_policy_count INTEGER;
    v_index_count INTEGER;
    v_function_exists BOOLEAN;
BEGIN
    -- Check table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'worksheet_assignment_classes'
    ) INTO v_table_exists;

    -- Count migrated data
    SELECT COUNT(*) INTO v_data_migrated
    FROM public.worksheet_assignment_classes;

    -- Count RLS policies on new table
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'worksheet_assignment_classes';

    -- Count indexes on new table
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_wac_%';

    -- Check function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'is_in_assigned_class'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) INTO v_function_exists;

    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Multi-Class Assignments';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Table created: worksheet_assignment_classes = %', v_table_exists;
    RAISE NOTICE 'Data migrated: % existing class assignments', v_data_migrated;
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies created: %', v_policy_count;
    RAISE NOTICE '  - Teachers can manage own assignment classes';
    RAISE NOTICE '  - Students can view their assignment classes';
    RAISE NOTICE '  - Admins can manage all assignment classes';
    RAISE NOTICE '';
    RAISE NOTICE 'Indexes created: %', v_index_count;
    RAISE NOTICE '  - idx_wac_class_id (for class-based queries)';
    RAISE NOTICE '  - idx_wac_assignment_class (composite for assignment queries)';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions:';
    RAISE NOTICE '  - is_in_assigned_class(UUID) = %', v_function_exists;
    RAISE NOTICE '  - can_access_assignment(UUID) updated';
    RAISE NOTICE '';
    RAISE NOTICE 'DEPRECATED (backward compat):';
    RAISE NOTICE '  - worksheet_assignments.class_id (now nullable)';
    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run: pnpm db:migrate';
    RAISE NOTICE '  2. Update: src/lib/types/database.ts';
    RAISE NOTICE '  3. Update: docs/architecture/database-schema.md';
    RAISE NOTICE '  4. Update application code to use junction table';
    RAISE NOTICE '===============================================';

    -- Validate table exists
    IF NOT v_table_exists THEN
        RAISE EXCEPTION 'Table worksheet_assignment_classes was not created!';
    END IF;

    -- Validate RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'worksheet_assignment_classes'
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS is not enabled on worksheet_assignment_classes table!';
    END IF;

    -- Validate function exists
    IF NOT v_function_exists THEN
        RAISE EXCEPTION 'Function is_in_assigned_class was not created!';
    END IF;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
