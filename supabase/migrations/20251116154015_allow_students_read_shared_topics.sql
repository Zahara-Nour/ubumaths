-- Migration: Allow Students to Read Shared Google Classroom Topics
-- Purpose: Fix bug where students can't see topics for shared materials
-- Date: 2025-11-16
-- Issue: Students get NULL for google_classroom_topics JOIN because RLS blocks access
-- Solution: Add policy allowing students to read topics for materials shared with their classes

-- ============================================================================
-- RLS POLICY: Students can view topics for materials shared with their classes
-- ============================================================================

CREATE POLICY "Students can view topics for shared materials"
ON public.google_classroom_topics
FOR SELECT
TO authenticated
USING (
    -- Allow if topic is referenced by a material that is shared with student's class
    EXISTS (
        SELECT 1
        FROM public.shared_materials sm
        INNER JOIN public.class_members cm ON cm.class_id = sm.class_id
        WHERE sm.topic_id = google_classroom_topics.id
        AND cm.student_id = auth.uid()
        AND sm.visible = TRUE
    )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Student Topic Access';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'RLS Policy added: Students can view topics for shared materials';
    RAISE NOTICE '';
    RAISE NOTICE 'This fixes the bug where shared materials appear as "Non classé"';
    RAISE NOTICE 'because students could not read google_classroom_topics table.';
    RAISE NOTICE '===============================================';
END $$;
