-- Migration: Create Python Exercise System Tables
-- Created: 2025-12-06
-- Description: Tables for python_exercises, assignments, and submissions with 3 validation strategies

-- ============================================================================
-- TABLE: python_exercises
-- ============================================================================
-- Stores exercise definitions with validation configurations
CREATE TABLE IF NOT EXISTS python_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT, -- Markdown format
    starter_code TEXT, -- Optional code template for students
    solution_code TEXT NOT NULL, -- Teacher's reference solution
    validation_config JSONB NOT NULL, -- Validation strategy configuration
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    tags TEXT[] DEFAULT '{}', -- Categorization tags
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for python_exercises
CREATE INDEX idx_python_exercises_author_id ON python_exercises(author_id);
CREATE INDEX idx_python_exercises_is_public ON python_exercises(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_python_exercises_difficulty ON python_exercises(difficulty);
CREATE INDEX idx_python_exercises_tags ON python_exercises USING GIN(tags);
CREATE INDEX idx_python_exercises_created_at ON python_exercises(created_at DESC);

-- Updated_at trigger for python_exercises
CREATE TRIGGER update_python_exercises_updated_at
    BEFORE UPDATE ON python_exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE python_exercises IS 'Exercise definitions with validation strategies (output comparison, unit tests, AST analysis)';
COMMENT ON COLUMN python_exercises.validation_config IS 'JSONB config with type: "output"|"unit_test"|"ast" and strategy-specific fields';
COMMENT ON COLUMN python_exercises.starter_code IS 'Optional code template shown to students';
COMMENT ON COLUMN python_exercises.solution_code IS 'Teacher reference solution (not shown to students)';
COMMENT ON COLUMN python_exercises.is_public IS 'If true, visible to all teachers for sharing exercises';

-- ============================================================================
-- TABLE: python_exercise_assignments
-- ============================================================================
-- Assigns exercises to classes or individual students
CREATE TABLE IF NOT EXISTS python_exercise_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES python_exercises(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ,
    max_attempts INTEGER CHECK (max_attempts > 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraint: Must assign to either class or student, not both
    CONSTRAINT assignment_target_check CHECK (
        (class_id IS NOT NULL AND student_id IS NULL) OR
        (class_id IS NULL AND student_id IS NOT NULL)
    )
);

-- Indexes for python_exercise_assignments
CREATE INDEX idx_python_exercise_assignments_exercise_id ON python_exercise_assignments(exercise_id);
CREATE INDEX idx_python_exercise_assignments_class_id ON python_exercise_assignments(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_python_exercise_assignments_student_id ON python_exercise_assignments(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_python_exercise_assignments_assigned_by ON python_exercise_assignments(assigned_by);
CREATE INDEX idx_python_exercise_assignments_due_date ON python_exercise_assignments(due_date) WHERE due_date IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE python_exercise_assignments IS 'Assigns exercises to classes or individual students';
COMMENT ON COLUMN python_exercise_assignments.class_id IS 'If set, exercise is assigned to entire class';
COMMENT ON COLUMN python_exercise_assignments.student_id IS 'If set, exercise is assigned to individual student';
COMMENT ON COLUMN python_exercise_assignments.max_attempts IS 'NULL = unlimited attempts';
COMMENT ON CONSTRAINT assignment_target_check ON python_exercise_assignments IS 'Exercise must be assigned to either class OR student, not both';

-- ============================================================================
-- TABLE: python_exercise_submissions
-- ============================================================================
-- Student submissions with validation results
CREATE TABLE IF NOT EXISTS python_exercise_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES python_exercises(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES python_exercise_assignments(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    validation_result JSONB NOT NULL,
    is_correct BOOLEAN NOT NULL,
    attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
    execution_time_ms INTEGER CHECK (execution_time_ms >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for python_exercise_submissions
CREATE INDEX idx_python_exercise_submissions_exercise_id ON python_exercise_submissions(exercise_id);
CREATE INDEX idx_python_exercise_submissions_assignment_id ON python_exercise_submissions(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX idx_python_exercise_submissions_student_id ON python_exercise_submissions(student_id);
CREATE INDEX idx_python_exercise_submissions_student_exercise ON python_exercise_submissions(student_id, exercise_id);
CREATE INDEX idx_python_exercise_submissions_is_correct ON python_exercise_submissions(is_correct) WHERE is_correct = TRUE;
CREATE INDEX idx_python_exercise_submissions_created_at ON python_exercise_submissions(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE python_exercise_submissions IS 'Student code submissions with validation results';
COMMENT ON COLUMN python_exercise_submissions.assignment_id IS 'NULL if submission is for practice (no active assignment)';
COMMENT ON COLUMN python_exercise_submissions.validation_result IS 'JSONB result from validation (output comparison, unit tests, or AST analysis)';
COMMENT ON COLUMN python_exercise_submissions.attempt_number IS 'Sequential attempt number for this student+exercise';
COMMENT ON COLUMN python_exercise_submissions.execution_time_ms IS 'Code execution time in milliseconds';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE python_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE python_exercise_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE python_exercise_submissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: python_exercises
-- ============================================================================

-- Teachers can select their own exercises
CREATE POLICY python_exercises_select_own ON python_exercises
    FOR SELECT
    TO authenticated
    USING (
        author_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

-- Teachers can select public exercises created by other teachers
CREATE POLICY python_exercises_select_public ON python_exercises
    FOR SELECT
    TO authenticated
    USING (
        is_public = TRUE
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

-- Students can select exercises assigned to them
CREATE POLICY python_exercises_select_assigned ON python_exercises
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'student'
        )
        AND (
            -- Exercises assigned to student's classes
            EXISTS (
                SELECT 1 FROM python_exercise_assignments pea
                JOIN class_members cm ON cm.class_id = pea.class_id
                WHERE pea.exercise_id = python_exercises.id
                    AND cm.student_id = auth.uid()
            )
            OR
            -- Exercises assigned directly to student
            EXISTS (
                SELECT 1 FROM python_exercise_assignments pea
                WHERE pea.exercise_id = python_exercises.id
                    AND pea.student_id = auth.uid()
            )
        )
    );

-- Teachers can insert their own exercises
CREATE POLICY python_exercises_insert ON python_exercises
    FOR INSERT
    TO authenticated
    WITH CHECK (
        author_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

-- Teachers can update their own exercises
CREATE POLICY python_exercises_update_own ON python_exercises
    FOR UPDATE
    TO authenticated
    USING (
        author_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
    )
    WITH CHECK (
        author_id = auth.uid()
    );

-- Teachers can delete their own exercises
CREATE POLICY python_exercises_delete_own ON python_exercises
    FOR DELETE
    TO authenticated
    USING (
        author_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

-- ============================================================================
-- RLS POLICIES: python_exercise_assignments
-- ============================================================================

-- Teachers can select assignments for their classes
CREATE POLICY python_exercise_assignments_select_teacher ON python_exercise_assignments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
        AND (
            -- Assignments created by this teacher
            assigned_by = auth.uid()
            OR
            -- Assignments for classes taught by this teacher
            EXISTS (
                SELECT 1 FROM classes
                WHERE classes.id = python_exercise_assignments.class_id
                    AND classes.teacher_id = auth.uid()
            )
        )
    );

-- Students can select their assignments
CREATE POLICY python_exercise_assignments_select_student ON python_exercise_assignments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'student'
        )
        AND (
            -- Assignments for student's classes
            EXISTS (
                SELECT 1 FROM class_members cm
                WHERE cm.class_id = python_exercise_assignments.class_id
                    AND cm.student_id = auth.uid()
            )
            OR
            -- Assignments directly to student
            student_id = auth.uid()
        )
    );

-- Teachers can insert assignments for their classes or any student
CREATE POLICY python_exercise_assignments_insert ON python_exercise_assignments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        assigned_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
        AND (
            -- If assigning to class, must be teacher of that class
            (class_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM classes
                WHERE classes.id = python_exercise_assignments.class_id
                    AND classes.teacher_id = auth.uid()
            ))
            OR
            -- If assigning to individual student, must be in teacher's class
            (student_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM class_members cm
                JOIN classes c ON c.id = cm.class_id
                WHERE cm.student_id = python_exercise_assignments.student_id
                    AND c.teacher_id = auth.uid()
            ))
        )
    );

-- Teachers can update their assignments
CREATE POLICY python_exercise_assignments_update ON python_exercise_assignments
    FOR UPDATE
    TO authenticated
    USING (
        assigned_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
    )
    WITH CHECK (
        assigned_by = auth.uid()
    );

-- Teachers can delete their assignments
CREATE POLICY python_exercise_assignments_delete ON python_exercise_assignments
    FOR DELETE
    TO authenticated
    USING (
        assigned_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

-- ============================================================================
-- RLS POLICIES: python_exercise_submissions
-- ============================================================================

-- Students can select their own submissions
CREATE POLICY python_exercise_submissions_select_student ON python_exercise_submissions
    FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'student'
        )
    );

-- Teachers can select submissions from their classes
CREATE POLICY python_exercise_submissions_select_teacher ON python_exercise_submissions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
        AND (
            -- Submissions for exercises they created
            EXISTS (
                SELECT 1 FROM python_exercises pe
                WHERE pe.id = python_exercise_submissions.exercise_id
                    AND pe.author_id = auth.uid()
            )
            OR
            -- Submissions from students in their classes
            EXISTS (
                SELECT 1 FROM class_members cm
                JOIN classes c ON c.id = cm.class_id
                WHERE cm.student_id = python_exercise_submissions.student_id
                    AND c.teacher_id = auth.uid()
            )
            OR
            -- Submissions for assignments they created
            EXISTS (
                SELECT 1 FROM python_exercise_assignments pea
                WHERE pea.id = python_exercise_submissions.assignment_id
                    AND pea.assigned_by = auth.uid()
            )
        )
    );

-- Students can insert their own submissions
CREATE POLICY python_exercise_submissions_insert ON python_exercise_submissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'student'
        )
        -- Validate assignment_id if provided
        AND (
            assignment_id IS NULL  -- Practice mode (no assignment)
            OR
            -- Assignment must belong to this student and match the exercise
            EXISTS (
                SELECT 1 FROM python_exercise_assignments pea
                WHERE pea.id = python_exercise_submissions.assignment_id
                    AND pea.exercise_id = python_exercise_submissions.exercise_id
                    AND (
                        pea.student_id = auth.uid()
                        OR EXISTS (
                            SELECT 1 FROM class_members cm
                            WHERE cm.class_id = pea.class_id
                                AND cm.student_id = auth.uid()
                        )
                    )
            )
        )
        -- Must have access to the exercise (through assignment or class assignment)
        AND EXISTS (
            SELECT 1 FROM python_exercises pe
            WHERE pe.id = python_exercise_submissions.exercise_id
                AND (
                    -- Exercise assigned to student's classes
                    EXISTS (
                        SELECT 1 FROM python_exercise_assignments pea
                        JOIN class_members cm ON cm.class_id = pea.class_id
                        WHERE pea.exercise_id = pe.id
                            AND cm.student_id = auth.uid()
                    )
                    OR
                    -- Exercise assigned directly to student
                    EXISTS (
                        SELECT 1 FROM python_exercise_assignments pea
                        WHERE pea.exercise_id = pe.id
                            AND pea.student_id = auth.uid()
                    )
                )
        )
    );

-- SECURITY: Submissions are immutable - no UPDATE policy
-- Students cannot modify submitted code, results, or attempt numbers
-- If re-validation is needed, create new submission with incremented attempt_number

-- No delete policy - submissions are permanent for audit trail
-- Teachers/admins can delete via service role if needed

-- ============================================================================
-- TRIGGERS: Business Logic Enforcement
-- ============================================================================

-- Auto-increment attempt_number for submissions
CREATE OR REPLACE FUNCTION set_submission_attempt_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.attempt_number := (
        SELECT COALESCE(MAX(attempt_number), 0) + 1
        FROM python_exercise_submissions
        WHERE student_id = NEW.student_id
            AND exercise_id = NEW.exercise_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_submission_attempt_number
    BEFORE INSERT ON python_exercise_submissions
    FOR EACH ROW
    EXECUTE FUNCTION set_submission_attempt_number();

-- Enforce max_attempts limit
CREATE OR REPLACE FUNCTION check_max_attempts()
RETURNS TRIGGER AS $$
DECLARE
    max_allowed INTEGER;
BEGIN
    -- Get max_attempts from assignment (if any)
    SELECT pea.max_attempts INTO max_allowed
    FROM python_exercise_assignments pea
    WHERE pea.id = NEW.assignment_id;

    -- If no assignment or no limit, allow submission
    IF max_allowed IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check if already at max attempts
    IF NEW.attempt_number > max_allowed THEN
        RAISE EXCEPTION 'Nombre maximum de tentatives atteint (%)' , max_allowed;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_attempts
    BEFORE INSERT ON python_exercise_submissions
    FOR EACH ROW
    EXECUTE FUNCTION check_max_attempts();

-- Rate limiting: Max 10 submissions per minute per student per exercise
CREATE OR REPLACE FUNCTION rate_limit_submissions()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM python_exercise_submissions
        WHERE student_id = NEW.student_id
            AND exercise_id = NEW.exercise_id
            AND created_at > NOW() - INTERVAL '1 minute'
    ) >= 10 THEN
        RAISE EXCEPTION 'Limite de taux dépassée: maximum 10 soumissions par minute';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER submission_rate_limit
    BEFORE INSERT ON python_exercise_submissions
    FOR EACH ROW
    EXECUTE FUNCTION rate_limit_submissions();

-- ============================================================================
-- VALIDATION CONFIG EXAMPLES (for documentation)
-- ============================================================================

/*
Output Comparison:
{
  "type": "output",
  "test_cases": [
    {"input": "", "expected_output": "Hello World"},
    {"input": "5", "expected_output": "25"}
  ],
  "ignore_whitespace": true,
  "timeout_ms": 5000
}

Unit Tests:
{
  "type": "unit_test",
  "function_name": "add",
  "test_cases": [
    {"args": [1, 2], "expected": 3},
    {"args": [-1, 1], "expected": 0}
  ],
  "timeout_ms": 5000
}

AST Analysis:
{
  "type": "ast",
  "requirements": [
    {"type": "uses_loop", "message": "Vous devez utiliser une boucle"},
    {"type": "defines_function", "name": "calculate", "message": "Définissez une fonction 'calculate'"},
    {"type": "no_global_variables", "message": "Pas de variables globales"}
  ],
  "output_tests": [
    {"input": "", "expected_output": "42"}
  ],
  "timeout_ms": 5000
}
*/
