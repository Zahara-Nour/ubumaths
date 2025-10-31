-- ============================================================================
-- Phase 4: Exercise Assignment System Tables
-- ============================================================================
--
-- Creates tables for exercise assignment and completion tracking:
-- - exercise_assignments: Teacher assigns exercises to students/classes
-- - exercise_completions: Track student views and completion status
--
-- Migration: 20251031160000_create_exercise_assignments_tables.sql
-- ============================================================================

-- ============================================================================
-- EXERCISE_ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.exercise_assignments (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,

    -- Assignment metadata
    assigned_to_type TEXT NOT NULL CHECK (assigned_to_type IN ('student', 'class', 'public')),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    optional_deadline TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Constraints
    CONSTRAINT exercise_assignments_student_check CHECK (
        (assigned_to_type = 'student' AND student_id IS NOT NULL AND class_id IS NULL) OR
        (assigned_to_type = 'class' AND class_id IS NOT NULL AND student_id IS NULL) OR
        (assigned_to_type = 'public' AND student_id IS NULL AND class_id IS NULL)
    )
);

-- Unique indexes to prevent duplicate assignments (partial indexes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_assignments_unique_student
    ON public.exercise_assignments(exercise_id, student_id)
    WHERE assigned_to_type = 'student';

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_assignments_unique_class
    ON public.exercise_assignments(exercise_id, class_id)
    WHERE assigned_to_type = 'class';

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_assignments_unique_public
    ON public.exercise_assignments(exercise_id, assigned_by)
    WHERE assigned_to_type = 'public';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_exercise ON public.exercise_assignments(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_assigned_by ON public.exercise_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_student ON public.exercise_assignments(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_class ON public.exercise_assignments(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_active ON public.exercise_assignments(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_type ON public.exercise_assignments(assigned_to_type);

-- Comments
COMMENT ON TABLE public.exercise_assignments IS 'Exercise assignments created by teachers for students, classes, or public access';
COMMENT ON COLUMN public.exercise_assignments.assigned_to_type IS 'Type of assignment target: student, class, or public';
COMMENT ON COLUMN public.exercise_assignments.optional_deadline IS 'Optional deadline for completion';
COMMENT ON COLUMN public.exercise_assignments.is_active IS 'Whether assignment is active (false = hidden from students)';

-- ============================================================================
-- EXERCISE_COMPLETIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.exercise_completions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.exercise_assignments(id) ON DELETE SET NULL,

    -- Tracking data
    completed_at TIMESTAMP WITH TIME ZONE,
    last_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    view_count INTEGER NOT NULL DEFAULT 1 CHECK (view_count > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Unique constraint: one completion record per student per exercise
    CONSTRAINT exercise_completions_unique UNIQUE (exercise_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercise_completions_exercise ON public.exercise_completions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_completions_student ON public.exercise_completions(student_id);
CREATE INDEX IF NOT EXISTS idx_exercise_completions_assignment ON public.exercise_completions(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercise_completions_completed ON public.exercise_completions(completed_at) WHERE completed_at IS NOT NULL;

-- Comments
COMMENT ON TABLE public.exercise_completions IS 'Track student views and completion of exercises';
COMMENT ON COLUMN public.exercise_completions.completed_at IS 'When student marked exercise as complete (null if not completed)';
COMMENT ON COLUMN public.exercise_completions.view_count IS 'Number of times student has viewed this exercise';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.exercise_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_completions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: exercise_assignments
-- ============================================================================

-- Teachers can view their own assignments
DROP POLICY IF EXISTS exercise_assignments_select_own ON public.exercise_assignments;
CREATE POLICY exercise_assignments_select_own ON public.exercise_assignments
    FOR SELECT
    USING (
        auth.uid() = assigned_by
        OR auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Students can view assignments assigned to them
DROP POLICY IF EXISTS exercise_assignments_select_student ON public.exercise_assignments;
CREATE POLICY exercise_assignments_select_student ON public.exercise_assignments
    FOR SELECT
    USING (
        is_active = TRUE
        AND (
            -- Directly assigned to student
            (assigned_to_type = 'student' AND student_id = auth.uid())
            OR
            -- Assigned to student's class
            (assigned_to_type = 'class' AND class_id IN (
                SELECT class_id FROM public.class_members WHERE student_id = auth.uid()
            ))
            OR
            -- Public assignment
            assigned_to_type = 'public'
        )
    );

-- Teachers can insert their own assignments
DROP POLICY IF EXISTS exercise_assignments_insert ON public.exercise_assignments;
CREATE POLICY exercise_assignments_insert ON public.exercise_assignments
    FOR INSERT
    WITH CHECK (
        auth.uid() = assigned_by
        AND auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('teacher', 'admin')
        )
    );

-- Teachers can update their own assignments
DROP POLICY IF EXISTS exercise_assignments_update ON public.exercise_assignments;
CREATE POLICY exercise_assignments_update ON public.exercise_assignments
    FOR UPDATE
    USING (
        auth.uid() = assigned_by
        OR auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Teachers can delete their own assignments
DROP POLICY IF EXISTS exercise_assignments_delete ON public.exercise_assignments;
CREATE POLICY exercise_assignments_delete ON public.exercise_assignments
    FOR DELETE
    USING (
        auth.uid() = assigned_by
        OR auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );

-- ============================================================================
-- RLS POLICIES: exercise_completions
-- ============================================================================

-- Students can view their own completion records
DROP POLICY IF EXISTS exercise_completions_select_own ON public.exercise_completions;
CREATE POLICY exercise_completions_select_own ON public.exercise_completions
    FOR SELECT
    USING (auth.uid() = student_id);

-- Teachers can view completion records for their exercises or their students
DROP POLICY IF EXISTS exercise_completions_select_teacher ON public.exercise_completions;
CREATE POLICY exercise_completions_select_teacher ON public.exercise_completions
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('teacher', 'admin')
        )
        AND (
            -- Exercise created by this teacher
            exercise_id IN (
                SELECT id FROM public.exercises WHERE created_by = auth.uid()
            )
            OR
            -- Student in teacher's class
            student_id IN (
                SELECT cm.student_id
                FROM public.class_members cm
                JOIN public.classes c ON c.id = cm.class_id
                WHERE c.teacher_id = auth.uid()
            )
        )
    );

-- Students can insert their own completion records
DROP POLICY IF EXISTS exercise_completions_insert ON public.exercise_completions;
CREATE POLICY exercise_completions_insert ON public.exercise_completions
    FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Students can update their own completion records
DROP POLICY IF EXISTS exercise_completions_update ON public.exercise_completions;
CREATE POLICY exercise_completions_update ON public.exercise_completions
    FOR UPDATE
    USING (auth.uid() = student_id);

-- No delete policy for completion records (audit trail)
