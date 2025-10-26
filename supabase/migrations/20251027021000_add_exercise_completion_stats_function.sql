-- ============================================================================
-- ADD EXERCISE COMPLETION STATS FUNCTION
-- ============================================================================
-- This migration adds a database function to get completion statistics
-- for an exercise across ALL assignments (not just a single assignment).
--
-- The existing get_assignment_completion_stats(p_assignment_id) function
-- gets stats for a specific assignment. This new function aggregates stats
-- across all assignments for an exercise.
--
-- Use cases:
-- - Teacher dashboard: "How is this exercise performing overall?"
-- - Exercise library: Show completion rates for public exercises
-- - Analytics: Track exercise effectiveness across all uses
-- ============================================================================

-- ============================================================================
-- 1. CREATE FUNCTION get_exercise_completion_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_exercise_completion_stats(p_exercise_id UUID)
RETURNS TABLE (
    total_assignments BIGINT,
    total_students BIGINT,
    completed_count BIGINT,
    in_progress_count BIGINT,
    not_started_count BIGINT,
    completion_percentage NUMERIC,
    total_viewed BIGINT,
    average_view_count NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    WITH assignment_students AS (
        -- Get all students who have access to this exercise via assignments
        SELECT DISTINCT
            ea.exercise_id,
            CASE
                -- Direct student assignment
                WHEN ea.assigned_to_type = 'student' THEN ea.student_id
                -- Class assignment - expand to all students in class
                WHEN ea.assigned_to_type = 'class' THEN cm.student_id
                -- Public assignment - we can't count specific students
                ELSE NULL
            END as student_id
        FROM exercise_assignments ea
        LEFT JOIN class_members cm ON ea.assigned_to_type = 'class' AND ea.class_id = cm.class_id
        WHERE ea.exercise_id = p_exercise_id
            AND ea.is_active = TRUE
            AND (ea.assigned_to_type != 'public')  -- Exclude public (can't count students)
    ),
    completion_data AS (
        -- Get completion data for all students who have access
        SELECT
            asts.student_id,
            ec.completed_at,
            ec.view_count,
            ec.last_viewed_at
        FROM assignment_students asts
        LEFT JOIN exercise_completions ec
            ON asts.exercise_id = ec.exercise_id
            AND asts.student_id = ec.student_id
        WHERE asts.student_id IS NOT NULL  -- Exclude NULL from public assignments
    )
    SELECT
        -- Total number of assignments (not students - a class assignment = 1 assignment)
        (SELECT COUNT(*) FROM exercise_assignments WHERE exercise_id = p_exercise_id AND is_active = TRUE)::BIGINT as total_assignments,

        -- Total unique students with access
        COUNT(DISTINCT cd.student_id)::BIGINT as total_students,

        -- Students who completed
        COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.completed_at IS NOT NULL)::BIGINT as completed_count,

        -- Students who viewed but not completed
        COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.completed_at IS NULL AND cd.view_count > 0)::BIGINT as in_progress_count,

        -- Students who haven't viewed yet
        (COUNT(DISTINCT cd.student_id) - COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.view_count > 0))::BIGINT as not_started_count,

        -- Completion percentage
        CASE
            WHEN COUNT(DISTINCT cd.student_id) > 0
            THEN ROUND(
                (COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.completed_at IS NOT NULL)::NUMERIC /
                 COUNT(DISTINCT cd.student_id)::NUMERIC) * 100,
                2
            )
            ELSE 0
        END as completion_percentage,

        -- Total students who viewed
        COUNT(DISTINCT cd.student_id) FILTER (WHERE cd.view_count > 0)::BIGINT as total_viewed,

        -- Average views per student (only students who viewed)
        COALESCE(
            AVG(cd.view_count) FILTER (WHERE cd.view_count > 0),
            0
        ) as average_view_count

    FROM completion_data cd;
$$;

COMMENT ON FUNCTION get_exercise_completion_stats IS
    'Returns aggregate completion statistics for an exercise across ALL assignments.
    Use this for exercise-level analytics (teacher dashboard, library).
    For single-assignment stats, use get_assignment_completion_stats(p_assignment_id).';

-- ============================================================================
-- 2. GRANT PERMISSIONS
-- ============================================================================

-- Allow authenticated users to execute the function
GRANT EXECUTE ON FUNCTION get_exercise_completion_stats(UUID) TO authenticated;

-- ============================================================================
-- 3. VALIDATION
-- ============================================================================

DO $$
DECLARE
    v_function_exists BOOLEAN;
BEGIN
    -- Check if function was created
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'get_exercise_completion_stats'
    ) INTO v_function_exists;

    IF NOT v_function_exists THEN
        RAISE EXCEPTION 'Migration validation failed: get_exercise_completion_stats function not created';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration successful!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✓ get_exercise_completion_stats() function created';
    RAISE NOTICE '✓ Function permissions granted';
    RAISE NOTICE '';
    RAISE NOTICE 'Function signature:';
    RAISE NOTICE '  get_exercise_completion_stats(p_exercise_id UUID)';
    RAISE NOTICE '';
    RAISE NOTICE 'Returns:';
    RAISE NOTICE '  - total_assignments: Number of active assignments';
    RAISE NOTICE '  - total_students: Unique students with access';
    RAISE NOTICE '  - completed_count: Students who completed';
    RAISE NOTICE '  - in_progress_count: Students who viewed but not completed';
    RAISE NOTICE '  - not_started_count: Students who have not viewed';
    RAISE NOTICE '  - completion_percentage: Completion rate (0-100)';
    RAISE NOTICE '  - total_viewed: Students who viewed at least once';
    RAISE NOTICE '  - average_view_count: Average views per viewing student';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
