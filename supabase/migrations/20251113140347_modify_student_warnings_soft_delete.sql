-- Migration: Modify student_warnings for soft delete
-- Purpose: Track when warnings are removed (currently permanent)
-- Date: 2025-11-13

-- Add soft delete columns to existing table
ALTER TABLE public.student_warnings
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.student_warnings.deleted_at IS 'Timestamp when warning was soft-deleted (NULL = active warning)';
COMMENT ON COLUMN public.student_warnings.deleted_by IS 'Teacher who deleted the warning';

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_student_warnings_deleted ON public.student_warnings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_student_warnings_active ON public.student_warnings(student_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Drop existing SELECT policies to replace them with soft-delete-aware versions
DROP POLICY IF EXISTS "Students can view their own warnings" ON public.student_warnings;
DROP POLICY IF EXISTS "Teachers can view warnings for their students" ON public.student_warnings;
DROP POLICY IF EXISTS "Admins can view all warnings" ON public.student_warnings;

-- RLS Policy: Students can view their own ACTIVE warnings
CREATE POLICY "Students can view their own active warnings"
ON public.student_warnings
FOR SELECT
TO authenticated
USING (
    student_id = auth.uid()
    AND deleted_at IS NULL
);

-- RLS Policy: Teachers can view ACTIVE warnings for their students
CREATE POLICY "Teachers can view active warnings for their students"
ON public.student_warnings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
    AND EXISTS (
        SELECT 1 FROM public.class_members cm
        WHERE cm.student_id = student_warnings.student_id
        AND cm.class_id IN (
            SELECT c.id FROM public.classes c
            WHERE c.teacher_id = auth.uid()
        )
    )
    AND deleted_at IS NULL
);

-- RLS Policy: Admins can view ALL warnings (including deleted)
CREATE POLICY "Admins can view all warnings including deleted"
ON public.student_warnings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- RLS Policy: Teachers can view deleted warnings for their students (audit trail)
CREATE POLICY "Teachers can view deleted warnings for their students"
ON public.student_warnings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
    AND EXISTS (
        SELECT 1 FROM public.class_members cm
        WHERE cm.student_id = student_warnings.student_id
        AND cm.class_id IN (
            SELECT c.id FROM public.classes c
            WHERE c.teacher_id = auth.uid()
        )
    )
    AND deleted_at IS NOT NULL
);

-- RLS Policy: Teachers can soft-delete warnings for their students
CREATE POLICY "Teachers can soft delete warnings for their students"
ON public.student_warnings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
    AND EXISTS (
        SELECT 1 FROM public.class_members cm
        WHERE cm.student_id = student_warnings.student_id
        AND cm.class_id IN (
            SELECT c.id FROM public.classes c
            WHERE c.teacher_id = auth.uid()
        )
    )
    AND deleted_at IS NULL  -- Can only delete active warnings
)
WITH CHECK (
    -- Only allow setting deleted_at and deleted_by
    deleted_at IS NOT NULL
    AND deleted_by = auth.uid()
);

-- Drop existing versions of soft_delete_warning to avoid overload conflicts
DROP FUNCTION IF EXISTS public.soft_delete_warning(UUID);

-- Create helper function for soft-deleting warnings
CREATE OR REPLACE FUNCTION public.soft_delete_warning(
    p_warning_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_affected INTEGER;
    v_caller_role TEXT;
BEGIN
    -- SECURITY CHECK (Issue #1 & #3): Get caller's role to enforce authorization
    -- SECURITY DEFINER functions bypass RLS, so we must check permissions explicitly
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- FIX (Issue #3): Only teachers and admins can delete warnings
    -- Students should NOT be able to delete their own warnings
    IF v_caller_role NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only teachers and admins can delete warnings';
    END IF;

    -- Attempt to soft delete the warning
    UPDATE public.student_warnings
    SET
        deleted_at = NOW(),
        deleted_by = auth.uid()
    WHERE id = p_warning_id
    AND deleted_at IS NULL  -- Only delete active warnings
    AND EXISTS (
        -- Teacher must be teaching this student
        SELECT 1 FROM public.class_members cm
        JOIN public.classes c ON c.id = cm.class_id
        WHERE cm.student_id = student_warnings.student_id
        AND cm.class_id = student_warnings.class_id
        AND (
            c.teacher_id = auth.uid()  -- Teacher owns the class
            OR v_caller_role = 'admin'  -- Or user is admin
        )
    );

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    RETURN v_affected > 0;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.soft_delete_warning(UUID) TO authenticated;

-- Create view for active warnings only (convenience)
CREATE OR REPLACE VIEW public.active_student_warnings AS
SELECT
    id,
    student_id,
    class_id,
    academic_period_id,
    warning_type,
    created_by,
    created_at,
    updated_at
FROM public.student_warnings
WHERE deleted_at IS NULL;

-- Grant permissions on the view
GRANT SELECT ON public.active_student_warnings TO authenticated;

-- Add RLS to the view (inherits from base table)
ALTER VIEW public.active_student_warnings SET (security_invoker = true);

-- Verification
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Check that columns were added
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'student_warnings'
    AND column_name IN ('deleted_at', 'deleted_by');

    IF v_count = 2 THEN
        RAISE NOTICE 'Migration completed: student_warnings table modified for soft delete';
        RAISE NOTICE 'Columns added: deleted_at, deleted_by';
        RAISE NOTICE 'Indexes created: idx_student_warnings_deleted, idx_student_warnings_active';
        RAISE NOTICE 'RLS policies updated to handle soft deletes';
        RAISE NOTICE 'Helper function created: soft_delete_warning()';
        RAISE NOTICE 'View created: active_student_warnings';
    ELSE
        RAISE EXCEPTION 'Migration failed: columns not added correctly';
    END IF;
END $$;
