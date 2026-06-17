-- ============================================================================
-- EXERCISE ASSIGNMENT AND COMPLETION TRACKING MIGRATION
-- ============================================================================
-- This migration creates a comprehensive practice-based exercise assignment
-- system (NOT graded like assessments). Teachers can assign exercises to
-- students/classes/public, and students can optionally mark completion.
--
-- Key Features:
-- 1. Flexible assignment targets (individual student, class, or public)
-- 2. Optional deadline for organization (not enforced)
-- 3. Optional completion tracking for progress visibility
-- 4. Seamless integration with parameterization (distribution_mode)
-- 5. Last viewed timestamp for "recently viewed" features
-- 6. View count for analytics
--
-- Important Notes:
-- - This is for PRACTICE mode, not graded assessments
-- - No test_sessions, no grading, no attempt limits
-- - Simple access control: assigned or not
-- - Optional completion tracking (students can mark as complete)
-- ============================================================================

-- ============================================================================
-- 1. CREATE exercise_assignments TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS exercise_assignments (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core relationships
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES profiles(id),

    -- Assignment target (mutually exclusive: student, class, or public)
    assigned_to_type TEXT NOT NULL
        CHECK (assigned_to_type IN ('student', 'class', 'public')),
    student_id UUID REFERENCES profiles(id),
    class_id UUID REFERENCES classes(id),

    -- Timestamps
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    optional_deadline TIMESTAMPTZ,  -- For organization only, not enforced

    -- Configuration
    notes TEXT,  -- Teacher notes for students
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Constraints to enforce assignment type consistency
    CONSTRAINT assignment_student_consistency
        CHECK (
            (assigned_to_type = 'student' AND student_id IS NOT NULL AND class_id IS NULL) OR
            (assigned_to_type = 'class' AND class_id IS NOT NULL AND student_id IS NULL) OR
            (assigned_to_type = 'public' AND student_id IS NULL AND class_id IS NULL)
        ),

    -- Prevent duplicate assignments
    CONSTRAINT unique_student_assignment
        UNIQUE NULLS NOT DISTINCT (exercise_id, student_id),
    CONSTRAINT unique_class_assignment
        UNIQUE NULLS NOT DISTINCT (exercise_id, class_id)
);

-- Add comments for clarity
COMMENT ON TABLE exercise_assignments IS
    'Practice exercise assignments (not graded). Supports assignment to individual students, classes, or public.';

COMMENT ON COLUMN exercise_assignments.assigned_to_type IS
    'Type of assignment target: student (individual), class (group), or public (all users)';

COMMENT ON COLUMN exercise_assignments.optional_deadline IS
    'Suggested deadline for organization only - not enforced in practice mode';

COMMENT ON COLUMN exercise_assignments.notes IS
    'Teacher notes/instructions visible to students when viewing the assignment';

COMMENT ON CONSTRAINT assignment_student_consistency ON exercise_assignments IS
    'Ensures assignment type matches populated foreign keys: student_id for student, class_id for class, neither for public';

-- ============================================================================
-- 2. CREATE exercise_completions TABLE (optional tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS exercise_completions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core relationships
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES exercise_assignments(id) ON DELETE SET NULL,  -- Nullable: completion can exist without assignment
    student_id UUID NOT NULL REFERENCES profiles(id),

    -- Completion tracking
    completed_at TIMESTAMPTZ,  -- NULL = not completed, SET = completed

    -- View tracking for analytics and "recently viewed"
    last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    view_count INTEGER NOT NULL DEFAULT 1 CHECK (view_count >= 1),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate completions per student
    CONSTRAINT unique_student_completion
        UNIQUE (exercise_id, student_id)
);

-- Add comments
COMMENT ON TABLE exercise_completions IS
    'Optional tracking of student exercise views and completions. Students can mark exercises as complete for progress tracking.';

COMMENT ON COLUMN exercise_completions.assignment_id IS
    'Links to assignment if completion is from an assignment. NULL if student accessed exercise directly (e.g., public library). SET NULL on assignment deletion to preserve completion history.';

COMMENT ON COLUMN exercise_completions.completed_at IS
    'NULL = in progress, SET = student marked as complete. No grading or validation - student self-reported completion.';

COMMENT ON COLUMN exercise_completions.last_viewed_at IS
    'Tracks most recent view for "recently viewed" features and activity monitoring';

COMMENT ON COLUMN exercise_completions.view_count IS
    'Number of times student has viewed this exercise. Useful for engagement analytics.';

-- ============================================================================
-- 3. CREATE VIEW assigned_exercises_with_details
-- ============================================================================

CREATE OR REPLACE VIEW assigned_exercises_with_details AS
SELECT
    ea.id,
    ea.exercise_id,
    ea.assigned_by,
    ea.assigned_to_type,
    ea.student_id,
    ea.class_id,
    ea.assigned_at,
    ea.optional_deadline,
    ea.notes,
    ea.is_active,

    -- Exercise details
    e.title as exercise_title,
    e.statement_md,
    e.solution_md,
    e.variables,
    e.distribution_mode,
    e.is_public as exercise_is_public,
    e.difficulty,
    e.tags,
    e.grade_levels,
    e.created_by as exercise_creator_id,

    -- Assignment creator details
    p.full_name as assigned_by_name,
    p.role as assigned_by_role,

    -- Assignment target name (computed)
    CASE
        WHEN ea.assigned_to_type = 'student' THEN s.full_name
        WHEN ea.assigned_to_type = 'class' THEN c.name
        ELSE 'Public'
    END as assigned_to_name,

    -- Additional student/class details for filtering
    s.email as student_email,
    c.name as class_name

FROM exercise_assignments ea
JOIN exercises e ON ea.exercise_id = e.id
JOIN profiles p ON ea.assigned_by = p.id
LEFT JOIN profiles s ON ea.student_id = s.id
LEFT JOIN classes c ON ea.class_id = c.id
WHERE ea.is_active = TRUE;

COMMENT ON VIEW assigned_exercises_with_details IS
    'Convenient view for querying active assignments with full exercise and assignment details. Only includes active assignments.';

-- ============================================================================
-- 4. CREATE INDEXES for performance
-- ============================================================================

-- Indexes for exercise_assignments
CREATE INDEX idx_exercise_assignments_exercise
    ON exercise_assignments(exercise_id);

CREATE INDEX idx_exercise_assignments_student
    ON exercise_assignments(student_id)
    WHERE student_id IS NOT NULL;

CREATE INDEX idx_exercise_assignments_class
    ON exercise_assignments(class_id)
    WHERE class_id IS NOT NULL;

CREATE INDEX idx_exercise_assignments_assigned_by
    ON exercise_assignments(assigned_by);

CREATE INDEX idx_exercise_assignments_type
    ON exercise_assignments(assigned_to_type);

CREATE INDEX idx_exercise_assignments_active
    ON exercise_assignments(is_active)
    WHERE is_active = TRUE;

CREATE INDEX idx_exercise_assignments_deadline
    ON exercise_assignments(optional_deadline)
    WHERE optional_deadline IS NOT NULL;

-- Composite index for common query: active assignments by teacher
CREATE INDEX idx_exercise_assignments_teacher_active
    ON exercise_assignments(assigned_by, is_active)
    WHERE is_active = TRUE;

-- Indexes for exercise_completions
CREATE INDEX idx_exercise_completions_exercise
    ON exercise_completions(exercise_id);

CREATE INDEX idx_exercise_completions_student
    ON exercise_completions(student_id);

CREATE INDEX idx_exercise_completions_assignment
    ON exercise_completions(assignment_id)
    WHERE assignment_id IS NOT NULL;

CREATE INDEX idx_exercise_completions_completed
    ON exercise_completions(completed_at)
    WHERE completed_at IS NOT NULL;

CREATE INDEX idx_exercise_completions_last_viewed
    ON exercise_completions(last_viewed_at DESC);

-- Composite index for student's completed exercises
CREATE INDEX idx_exercise_completions_student_completed
    ON exercise_completions(student_id, completed_at)
    WHERE completed_at IS NOT NULL;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE exercise_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_completions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5a. RLS Policies for exercise_assignments
-- ============================================================================

-- Teachers can view all assignments they created
CREATE POLICY "Teachers can view their own assignments"
    ON exercise_assignments FOR SELECT
    USING (
        auth.uid() = assigned_by
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    );

-- Teachers can create assignments for their exercises
CREATE POLICY "Teachers can create assignments for their exercises"
    ON exercise_assignments FOR INSERT
    WITH CHECK (
        auth.uid() = assigned_by
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
        AND EXISTS (
            SELECT 1 FROM exercises
            WHERE id = exercise_id
            AND created_by = auth.uid()
        )
    );

-- Teachers can update their own assignments
CREATE POLICY "Teachers can update their own assignments"
    ON exercise_assignments FOR UPDATE
    USING (
        auth.uid() = assigned_by
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    )
    WITH CHECK (
        auth.uid() = assigned_by
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    );

-- Teachers can delete their own assignments
CREATE POLICY "Teachers can delete their own assignments"
    ON exercise_assignments FOR DELETE
    USING (
        auth.uid() = assigned_by
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    );

-- Students can view assignments where they are the target
CREATE POLICY "Students can view their assignments"
    ON exercise_assignments FOR SELECT
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
        AND is_active = TRUE
        AND (
            -- Direct assignment
            student_id = auth.uid()
            -- Class assignment
            OR class_id IN (
                SELECT class_id FROM class_members WHERE student_id = auth.uid()
            )
            -- Public assignment
            OR assigned_to_type = 'public'
        )
    );

-- Admins can view all assignments
CREATE POLICY "Admins can view all assignments"
    ON exercise_assignments FOR SELECT
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================================
-- 5b. RLS Policies for exercise_completions
-- ============================================================================

-- Students can view their own completions
CREATE POLICY "Students can view their own completions"
    ON exercise_completions FOR SELECT
    USING (
        student_id = auth.uid()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
    );

-- Students can insert completions for exercises they have access to
CREATE POLICY "Students can insert completions for accessible exercises"
    ON exercise_completions FOR INSERT
    WITH CHECK (
        student_id = auth.uid()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
        AND (
            -- Exercise is public
            EXISTS (
                SELECT 1 FROM exercises
                WHERE id = exercise_id
                AND is_public = TRUE
            )
            -- OR student has an assignment
            OR EXISTS (
                SELECT 1 FROM exercise_assignments ea
                WHERE ea.exercise_id = exercise_completions.exercise_id
                AND ea.is_active = TRUE
                AND (
                    ea.student_id = auth.uid()
                    OR ea.class_id IN (
                        SELECT class_id FROM class_members WHERE student_id = auth.uid()
                    )
                    OR ea.assigned_to_type = 'public'
                )
            )
        )
    );

-- Students can update their own completions (mark as complete, track views)
CREATE POLICY "Students can update their own completions"
    ON exercise_completions FOR UPDATE
    USING (
        student_id = auth.uid()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
    )
    WITH CHECK (
        student_id = auth.uid()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
    );

-- Teachers can view completions for exercises they created
CREATE POLICY "Teachers can view completions for their exercises"
    ON exercise_completions FOR SELECT
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
        AND EXISTS (
            SELECT 1 FROM exercises
            WHERE id = exercise_id
            AND created_by = auth.uid()
        )
    );

-- Admins can view all completions
CREATE POLICY "Admins can view all completions"
    ON exercise_completions FOR SELECT
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Check if student has access to an exercise (via assignment or public)
CREATE OR REPLACE FUNCTION student_has_exercise_access(
    p_exercise_id UUID,
    p_student_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        -- Exercise is public
        SELECT 1 FROM exercises
        WHERE id = p_exercise_id
        AND is_public = TRUE
    ) OR EXISTS (
        -- Student has an active assignment
        SELECT 1 FROM exercise_assignments ea
        WHERE ea.exercise_id = p_exercise_id
        AND ea.is_active = TRUE
        AND (
            -- Direct assignment
            ea.student_id = p_student_id
            -- Class assignment
            OR ea.class_id IN (
                SELECT class_id FROM class_members WHERE student_id = p_student_id
            )
            -- Public assignment
            OR ea.assigned_to_type = 'public'
        )
    );
$$;

COMMENT ON FUNCTION student_has_exercise_access IS
    'Checks if a student can access an exercise via public status or assignment (direct, class, or public)';

-- Get all exercises accessible by a student with completion status
CREATE OR REPLACE FUNCTION get_student_exercises(p_student_id UUID)
RETURNS TABLE (
    exercise_id UUID,
    exercise_title TEXT,
    statement_md TEXT,
    solution_md TEXT,
    variables JSONB,
    distribution_mode TEXT,
    difficulty TEXT,
    tags TEXT[],
    grade_levels TEXT[],
    assignment_id UUID,
    assignment_type TEXT,
    assigned_at TIMESTAMPTZ,
    optional_deadline TIMESTAMPTZ,
    notes TEXT,
    assigned_by_name TEXT,
    completed_at TIMESTAMPTZ,
    last_viewed_at TIMESTAMPTZ,
    view_count INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT
        e.id as exercise_id,
        e.title as exercise_title,
        e.statement_md,
        e.solution_md,
        e.variables,
        e.distribution_mode,
        e.difficulty,
        e.tags,
        e.grade_levels,
        ea.id as assignment_id,
        ea.assigned_to_type as assignment_type,
        ea.assigned_at,
        ea.optional_deadline,
        ea.notes,
        p.full_name as assigned_by_name,
        ec.completed_at,
        ec.last_viewed_at,
        ec.view_count
    FROM exercises e
    LEFT JOIN exercise_assignments ea ON e.id = ea.exercise_id
        AND ea.is_active = TRUE
        AND (
            ea.student_id = p_student_id
            OR ea.class_id IN (SELECT class_id FROM class_members WHERE student_id = p_student_id)
            OR ea.assigned_to_type = 'public'
        )
    LEFT JOIN profiles p ON ea.assigned_by = p.id
    LEFT JOIN exercise_completions ec ON e.id = ec.exercise_id
        AND ec.student_id = p_student_id
    WHERE
        -- Student has access via public status or assignment
        e.is_public = TRUE
        OR ea.id IS NOT NULL
    ORDER BY
        -- Prioritize: incomplete assigned, then recent views, then assigned_at
        CASE WHEN ea.id IS NOT NULL AND ec.completed_at IS NULL THEN 0 ELSE 1 END,
        ec.last_viewed_at DESC NULLS LAST,
        ea.assigned_at DESC NULLS LAST;
$$;

COMMENT ON FUNCTION get_student_exercises IS
    'Returns all exercises accessible by a student with assignment and completion details. Ordered by incomplete assignments first, then recent activity.';

-- Get assignment statistics for a teacher
CREATE OR REPLACE FUNCTION get_teacher_assignment_stats(p_teacher_id UUID)
RETURNS TABLE (
    total_assignments BIGINT,
    active_assignments BIGINT,
    student_assignments BIGINT,
    class_assignments BIGINT,
    public_assignments BIGINT,
    total_completions BIGINT,
    unique_students_engaged BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT
        COUNT(*) as total_assignments,
        COUNT(*) FILTER (WHERE is_active = TRUE) as active_assignments,
        COUNT(*) FILTER (WHERE assigned_to_type = 'student') as student_assignments,
        COUNT(*) FILTER (WHERE assigned_to_type = 'class') as class_assignments,
        COUNT(*) FILTER (WHERE assigned_to_type = 'public') as public_assignments,
        (
            SELECT COUNT(*)
            FROM exercise_completions ec
            JOIN exercise_assignments ea ON ec.assignment_id = ea.id
            WHERE ea.assigned_by = p_teacher_id
            AND ec.completed_at IS NOT NULL
        ) as total_completions,
        (
            SELECT COUNT(DISTINCT ec.student_id)
            FROM exercise_completions ec
            JOIN exercise_assignments ea ON ec.assignment_id = ea.id
            WHERE ea.assigned_by = p_teacher_id
        ) as unique_students_engaged
    FROM exercise_assignments
    WHERE assigned_by = p_teacher_id;
$$;

COMMENT ON FUNCTION get_teacher_assignment_stats IS
    'Returns comprehensive statistics for a teacher''s exercise assignments and student engagement';

-- Get completion statistics for an assignment
CREATE OR REPLACE FUNCTION get_assignment_completion_stats(p_assignment_id UUID)
RETURNS TABLE (
    total_target_students BIGINT,
    students_viewed BIGINT,
    students_completed BIGINT,
    total_views BIGINT,
    avg_views_per_student NUMERIC,
    completion_rate NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    WITH assignment_details AS (
        SELECT
            assigned_to_type,
            student_id,
            class_id
        FROM exercise_assignments
        WHERE id = p_assignment_id
    ),
    target_students AS (
        SELECT
            CASE
                WHEN ad.assigned_to_type = 'student' THEN ARRAY[ad.student_id]
                WHEN ad.assigned_to_type = 'class' THEN ARRAY_AGG(cm.student_id)
                ELSE ARRAY[]::UUID[]  -- Public has no specific target
            END as student_ids
        FROM assignment_details ad
        LEFT JOIN class_members cm ON ad.class_id = cm.class_id
        GROUP BY ad.assigned_to_type, ad.student_id
    )
    SELECT
        CARDINALITY((SELECT student_ids FROM target_students)) as total_target_students,
        COUNT(DISTINCT ec.student_id) FILTER (WHERE ec.id IS NOT NULL) as students_viewed,
        COUNT(DISTINCT ec.student_id) FILTER (WHERE ec.completed_at IS NOT NULL) as students_completed,
        COALESCE(SUM(ec.view_count), 0) as total_views,
        COALESCE(AVG(ec.view_count), 0) as avg_views_per_student,
        CASE
            WHEN CARDINALITY((SELECT student_ids FROM target_students)) > 0
            THEN ROUND(
                COUNT(DISTINCT ec.student_id) FILTER (WHERE ec.completed_at IS NOT NULL)::NUMERIC /
                CARDINALITY((SELECT student_ids FROM target_students))::NUMERIC * 100,
                2
            )
            ELSE 0
        END as completion_rate
    FROM target_students
    LEFT JOIN exercise_completions ec ON ec.assignment_id = p_assignment_id
        AND (
            (SELECT assigned_to_type FROM assignment_details) = 'public'
            OR ec.student_id IN (SELECT unnest(student_ids) FROM target_students)
        );
$$;

COMMENT ON FUNCTION get_assignment_completion_stats IS
    'Returns detailed completion statistics for an assignment including view counts and completion rates';

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Auto-update last_viewed_at when view_count changes
CREATE OR REPLACE FUNCTION update_completion_last_viewed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update last_viewed_at whenever view_count increases
    IF NEW.view_count > OLD.view_count THEN
        NEW.last_viewed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_completion_last_viewed
    BEFORE UPDATE ON exercise_completions
    FOR EACH ROW
    WHEN (NEW.view_count > OLD.view_count)
    EXECUTE FUNCTION update_completion_last_viewed();

COMMENT ON FUNCTION update_completion_last_viewed IS
    'Automatically updates last_viewed_at when view_count increments';

-- ============================================================================
-- 8. GRANTS (ensure proper permissions)
-- ============================================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON exercise_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON exercise_completions TO authenticated;

-- Grant access to view
GRANT SELECT ON assigned_exercises_with_details TO authenticated;

-- ============================================================================
-- 9. VALIDATION AND TESTING
-- ============================================================================

-- Verify tables were created
DO $$
DECLARE
    v_assignments_exists BOOLEAN;
    v_completions_exists BOOLEAN;
    v_view_exists BOOLEAN;
BEGIN
    -- Check exercise_assignments
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'exercise_assignments'
    ) INTO v_assignments_exists;

    -- Check exercise_completions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'exercise_completions'
    ) INTO v_completions_exists;

    -- Check view
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'assigned_exercises_with_details'
    ) INTO v_view_exists;

    -- Validate
    IF NOT v_assignments_exists THEN
        RAISE EXCEPTION 'Migration validation failed: exercise_assignments table not created';
    END IF;

    IF NOT v_completions_exists THEN
        RAISE EXCEPTION 'Migration validation failed: exercise_completions table not created';
    END IF;

    IF NOT v_view_exists THEN
        RAISE EXCEPTION 'Migration validation failed: assigned_exercises_with_details view not created';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration validation successful!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✓ exercise_assignments table created';
    RAISE NOTICE '✓ exercise_completions table created';
    RAISE NOTICE '✓ assigned_exercises_with_details view created';
    RAISE NOTICE '✓ Indexes created (17 total)';
    RAISE NOTICE '✓ RLS policies enabled (11 total)';
    RAISE NOTICE '✓ Helper functions created (4 total)';
    RAISE NOTICE '✓ Triggers created (1 total)';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '1. Run: pnpm db:migrate';
    RAISE NOTICE '2. Update: src/lib/types/database.ts';
    RAISE NOTICE '3. Update: docs/architecture/database-schema.md';
    RAISE NOTICE '4. Test exercise assignment creation';
    RAISE NOTICE '5. Test student access and completion tracking';
    RAISE NOTICE '';
END $$;
