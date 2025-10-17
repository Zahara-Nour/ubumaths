-- Migration: Geometry Exercises System
-- Description: Complete geometry exercise system with MathGraph32 integration
-- Features: Exercise management, step-by-step validation, hints, auto-save, grading

-- =======================
-- 1. GEOMETRY TEMPLATES (must be created first for FK references)
-- =======================

CREATE TABLE IF NOT EXISTS geometry_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template metadata
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Template data
    base_figure TEXT NOT NULL, -- Base64 encoded template figure
    configurable_params JSONB NOT NULL DEFAULT '{}', -- Parameters that can be randomized
    -- Example: {"numPoints": 3, "angleRange": [0, 180], "sideLength": [5, 20]}

    -- Template type
    template_type TEXT NOT NULL CHECK (template_type IN ('triangle', 'circle', 'transformation', 'angle', 'polygon', 'custom')),

    -- Usage
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    usage_count INTEGER NOT NULL DEFAULT 0,

    -- Tags
    tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

CREATE INDEX idx_geometry_templates_created_by ON geometry_templates(created_by);
CREATE INDEX idx_geometry_templates_type ON geometry_templates(template_type);
CREATE INDEX idx_geometry_templates_public ON geometry_templates(is_public);

-- =======================
-- 2. GEOMETRY EXERCISES
-- =======================

CREATE TABLE IF NOT EXISTS geometry_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Metadata
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Exercise configuration
    exercise_type TEXT NOT NULL CHECK (exercise_type IN ('view', 'measure', 'construct', 'proof', 'explore')),
    difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5) DEFAULT 2,
    grade_level TEXT NOT NULL CHECK (grade_level IN ('elementary', 'middle', 'high', 'advanced')) DEFAULT 'middle',

    -- Figure data
    initial_figure TEXT, -- Base64 encoded MathGraph32 figure
    template_id UUID REFERENCES geometry_templates(id) ON DELETE SET NULL,

    -- Randomization
    is_randomized BOOLEAN NOT NULL DEFAULT FALSE,
    randomization_params JSONB, -- Parameters for programmatic generation
    -- Example: {"pointA": {"x": "random(0, 100)", "y": "random(0, 100)"}}

    -- Validation configuration
    validation_mode TEXT NOT NULL CHECK (validation_mode IN ('automatic', 'step_by_step', 'teacher_review', 'self_check')) DEFAULT 'automatic',
    validation_config JSONB NOT NULL DEFAULT '{}', -- Validation rules and tolerances
    -- Example: {"tolerance": 2, "checkAngle": true, "expectedAngle": 90, "partialCredit": true}

    -- Time limits
    time_limit_seconds INTEGER, -- NULL = no limit
    suggested_time_seconds INTEGER,

    -- Scoring
    max_score INTEGER NOT NULL DEFAULT 100,
    passing_score INTEGER NOT NULL DEFAULT 60,
    hint_penalty_percent INTEGER NOT NULL DEFAULT 5 CHECK (hint_penalty_percent >= 0 AND hint_penalty_percent <= 100),

    -- Display settings
    tools_allowed TEXT[] NOT NULL DEFAULT ARRAY['point', 'line', 'circle', 'segment'], -- MathGraph32 tools
    grid_visible BOOLEAN NOT NULL DEFAULT TRUE,
    axis_visible BOOLEAN NOT NULL DEFAULT FALSE,
    measurements_visible BOOLEAN NOT NULL DEFAULT TRUE,

    -- Tagging and organization
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    topics TEXT[] DEFAULT ARRAY[]::TEXT[], -- e.g., ['perpendicular_bisector', 'circles', 'triangles']
    learning_objectives TEXT[],

    -- Assignment settings
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,

    -- Gamification
    gidouilles_reward INTEGER NOT NULL DEFAULT 10,
    bonus_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- Multiplier for perfect scores

    CONSTRAINT valid_scores CHECK (passing_score <= max_score)
);

-- Indexes for geometry_exercises
CREATE INDEX idx_geometry_exercises_created_by ON geometry_exercises(created_by);
CREATE INDEX idx_geometry_exercises_type ON geometry_exercises(exercise_type);
CREATE INDEX idx_geometry_exercises_difficulty ON geometry_exercises(difficulty_level);
CREATE INDEX idx_geometry_exercises_grade_level ON geometry_exercises(grade_level);
CREATE INDEX idx_geometry_exercises_published ON geometry_exercises(is_published);
CREATE INDEX idx_geometry_exercises_topics ON geometry_exercises USING GIN(topics);
CREATE INDEX idx_geometry_exercises_tags ON geometry_exercises USING GIN(tags);

-- =======================
-- 3. GEOMETRY EXERCISE STEPS
-- =======================

CREATE TABLE IF NOT EXISTS geometry_exercise_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES geometry_exercises(id) ON DELETE CASCADE,

    -- Step metadata
    step_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Validation
    validation_function TEXT NOT NULL, -- Name of the validation function to call
    validation_params JSONB NOT NULL DEFAULT '{}', -- Parameters for validation
    -- Example: {"lineTag": "perpendicularBisector", "segmentTag": "AB", "tolerance": 2}

    -- Hints
    hint_general TEXT, -- Free hint
    hint_specific TEXT, -- -5% penalty
    hint_step_by_step TEXT, -- -10% penalty

    -- Scoring
    points INTEGER NOT NULL DEFAULT 10,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    can_skip BOOLEAN NOT NULL DEFAULT FALSE,

    -- Display
    display_order INTEGER NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(exercise_id, step_number),
    CONSTRAINT valid_step_number CHECK (step_number > 0)
);

CREATE INDEX idx_geometry_exercise_steps_exercise ON geometry_exercise_steps(exercise_id);
CREATE INDEX idx_geometry_exercise_steps_order ON geometry_exercise_steps(exercise_id, display_order);

-- =======================
-- 4. GEOMETRY EXERCISE ATTEMPTS
-- =======================

CREATE TABLE IF NOT EXISTS geometry_exercise_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES geometry_exercises(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Attempt metadata
    attempt_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Status
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'submitted', 'graded', 'abandoned')) DEFAULT 'in_progress',

    -- Figure state
    current_figure_state TEXT, -- Base64 encoded current state
    figure_history JSONB DEFAULT '[]', -- Array of {timestamp, figureState}

    -- Progress
    completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    current_step INTEGER,

    -- Validation results
    validation_results JSONB DEFAULT '{}', -- Results of automatic validation
    -- Example: {"angleCorrect": true, "linePerpendicular": true, "score": 95}

    -- Scoring
    raw_score INTEGER, -- Score before penalties
    hint_penalties INTEGER NOT NULL DEFAULT 0,
    time_penalties INTEGER NOT NULL DEFAULT 0,
    final_score INTEGER,

    -- Hints used
    hints_used JSONB DEFAULT '[]', -- Array of {stepId, hintLevel, timestamp}

    -- Time tracking
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    active_time_seconds INTEGER NOT NULL DEFAULT 0, -- Actual working time (excludes idle)

    -- Teacher feedback
    teacher_feedback TEXT,
    graded_by UUID REFERENCES profiles(id),
    graded_at TIMESTAMPTZ,

    -- Metadata
    randomization_seed INTEGER, -- For reproducible randomization
    exercise_version_snapshot JSONB, -- Snapshot of exercise config at attempt time

    UNIQUE(exercise_id, student_id, attempt_number),
    CONSTRAINT valid_scores CHECK (
        (final_score IS NULL OR (final_score >= 0 AND final_score <= 100)) AND
        (raw_score IS NULL OR (raw_score >= 0 AND raw_score <= 100))
    )
);

CREATE INDEX idx_geometry_attempts_exercise ON geometry_exercise_attempts(exercise_id);
CREATE INDEX idx_geometry_attempts_student ON geometry_exercise_attempts(student_id);
CREATE INDEX idx_geometry_attempts_status ON geometry_exercise_attempts(status);
CREATE INDEX idx_geometry_attempts_submitted ON geometry_exercise_attempts(submitted_at);

-- =======================
-- 5. GEOMETRY HINTS
-- =======================

CREATE TABLE IF NOT EXISTS geometry_hints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID REFERENCES geometry_exercises(id) ON DELETE CASCADE,
    step_id UUID REFERENCES geometry_exercise_steps(id) ON DELETE CASCADE,

    -- Hint metadata
    hint_level TEXT NOT NULL CHECK (hint_level IN ('general', 'specific', 'step_by_step')),
    hint_text TEXT NOT NULL,
    hint_order INTEGER NOT NULL DEFAULT 1,

    -- Triggering conditions
    trigger_condition JSONB, -- Conditions for when to show this hint
    -- Example: {"timeSpent": 120, "attemptsFailed": 2, "constructionState": "hasPoints"}

    -- Scoring impact
    score_penalty INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT hint_belongs_to_exercise_or_step CHECK (
        (exercise_id IS NOT NULL AND step_id IS NULL) OR
        (exercise_id IS NULL AND step_id IS NOT NULL)
    )
);

CREATE INDEX idx_geometry_hints_exercise ON geometry_hints(exercise_id);
CREATE INDEX idx_geometry_hints_step ON geometry_hints(step_id);

-- =======================
-- 6. GEOMETRY ASSIGNMENTS
-- =======================

CREATE TABLE IF NOT EXISTS geometry_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES geometry_exercises(id) ON DELETE CASCADE,

    -- Assignment details
    assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_to_class UUID REFERENCES classes(id) ON DELETE CASCADE,
    assigned_to_student UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- Dates
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    available_from TIMESTAMPTZ DEFAULT NOW(),
    available_until TIMESTAMPTZ,

    -- Settings
    max_attempts INTEGER, -- NULL = unlimited
    allow_late_submission BOOLEAN NOT NULL DEFAULT FALSE,
    show_correct_answer_after_submission BOOLEAN NOT NULL DEFAULT FALSE,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT assignment_has_target CHECK (
        (assigned_to_class IS NOT NULL AND assigned_to_student IS NULL) OR
        (assigned_to_class IS NULL AND assigned_to_student IS NOT NULL)
    )
);

CREATE INDEX idx_geometry_assignments_exercise ON geometry_assignments(exercise_id);
CREATE INDEX idx_geometry_assignments_assigned_by ON geometry_assignments(assigned_by);
CREATE INDEX idx_geometry_assignments_class ON geometry_assignments(assigned_to_class);
CREATE INDEX idx_geometry_assignments_student ON geometry_assignments(assigned_to_student);
CREATE INDEX idx_geometry_assignments_due_date ON geometry_assignments(due_date);

-- =======================
-- 7. ROW LEVEL SECURITY
-- =======================

ALTER TABLE geometry_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE geometry_exercise_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE geometry_exercise_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE geometry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE geometry_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE geometry_assignments ENABLE ROW LEVEL SECURITY;

-- geometry_exercises policies
CREATE POLICY "Teachers can manage their own exercises"
    ON geometry_exercises FOR ALL
    USING (created_by = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher');

CREATE POLICY "Students can view published exercises assigned to them"
    ON geometry_exercises FOR SELECT
    USING (
        is_published = TRUE AND
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'student' AND
        id IN (
            SELECT exercise_id FROM geometry_assignments
            WHERE (assigned_to_student = auth.uid() OR assigned_to_class IN (
                SELECT class_id FROM class_members WHERE student_id = auth.uid()
            ))
            AND is_active = TRUE
        )
    );

CREATE POLICY "Admins can view all exercises"
    ON geometry_exercises FOR SELECT
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- geometry_exercise_steps policies
CREATE POLICY "Teachers can manage steps for their exercises"
    ON geometry_exercise_steps FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM geometry_exercises
            WHERE id = geometry_exercise_steps.exercise_id
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Students can view steps for accessible exercises"
    ON geometry_exercise_steps FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM geometry_exercises
            WHERE id = geometry_exercise_steps.exercise_id
            AND is_published = TRUE
        )
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
    );

-- geometry_exercise_attempts policies
CREATE POLICY "Students can manage their own attempts"
    ON geometry_exercise_attempts FOR ALL
    USING (student_id = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student');

CREATE POLICY "Teachers can view attempts for their exercises"
    ON geometry_exercise_attempts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM geometry_exercises
            WHERE id = geometry_exercise_attempts.exercise_id
            AND created_by = auth.uid()
        )
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    );

CREATE POLICY "Admins can view all attempts"
    ON geometry_exercise_attempts FOR SELECT
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- geometry_templates policies
CREATE POLICY "Teachers can manage their own templates"
    ON geometry_templates FOR ALL
    USING (created_by = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher');

CREATE POLICY "Anyone can view public templates"
    ON geometry_templates FOR SELECT
    USING (is_public = TRUE);

-- geometry_hints policies
CREATE POLICY "Teachers can manage hints for their exercises"
    ON geometry_hints FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM geometry_exercises
            WHERE id = geometry_hints.exercise_id
            AND created_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM geometry_exercise_steps ges
            JOIN geometry_exercises ge ON ges.exercise_id = ge.id
            WHERE ges.id = geometry_hints.step_id
            AND ge.created_by = auth.uid()
        )
    );

CREATE POLICY "Students can view hints for accessible exercises"
    ON geometry_hints FOR SELECT
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
    );

-- geometry_assignments policies
CREATE POLICY "Teachers can manage their own assignments"
    ON geometry_assignments FOR ALL
    USING (assigned_by = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher');

CREATE POLICY "Students can view their assignments"
    ON geometry_assignments FOR SELECT
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'student' AND
        (assigned_to_student = auth.uid() OR assigned_to_class IN (
            SELECT class_id FROM class_members WHERE student_id = auth.uid()
        ))
    );

-- =======================
-- 8. TRIGGERS
-- =======================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_geometry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_geometry_exercises_updated_at
    BEFORE UPDATE ON geometry_exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_geometry_updated_at();

CREATE TRIGGER update_geometry_templates_updated_at
    BEFORE UPDATE ON geometry_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_geometry_updated_at();

-- Update last_saved_at on attempt updates
CREATE OR REPLACE FUNCTION update_attempt_last_saved_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'in_progress' THEN
        NEW.last_saved_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_geometry_attempts_last_saved
    BEFORE UPDATE ON geometry_exercise_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_attempt_last_saved_at();

-- Calculate final score with penalties
CREATE OR REPLACE FUNCTION calculate_geometry_final_score()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.raw_score IS NOT NULL THEN
        NEW.final_score = GREATEST(0, NEW.raw_score - NEW.hint_penalties - NEW.time_penalties);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_geometry_score
    BEFORE INSERT OR UPDATE ON geometry_exercise_attempts
    FOR EACH ROW
    WHEN (NEW.raw_score IS NOT NULL)
    EXECUTE FUNCTION calculate_geometry_final_score();

-- =======================
-- 9. HELPER FUNCTIONS
-- =======================

-- Get student's best score for an exercise
CREATE OR REPLACE FUNCTION get_best_geometry_score(
    p_student_id UUID,
    p_exercise_id UUID
)
RETURNS INTEGER AS $$
    SELECT COALESCE(MAX(final_score), 0)
    FROM geometry_exercise_attempts
    WHERE student_id = p_student_id
    AND exercise_id = p_exercise_id
    AND status = 'graded';
$$ LANGUAGE SQL STABLE;

-- Get student's progress for an exercise
CREATE OR REPLACE FUNCTION get_geometry_progress(
    p_student_id UUID,
    p_exercise_id UUID
)
RETURNS JSONB AS $$
    SELECT jsonb_build_object(
        'attempts', COUNT(*),
        'best_score', COALESCE(MAX(final_score), 0),
        'average_score', COALESCE(AVG(final_score), 0),
        'completed', BOOL_OR(status = 'graded' AND final_score >= (SELECT passing_score FROM geometry_exercises WHERE id = p_exercise_id)),
        'last_attempt', MAX(started_at),
        'total_time_spent', SUM(time_spent_seconds)
    )
    FROM geometry_exercise_attempts
    WHERE student_id = p_student_id
    AND exercise_id = p_exercise_id;
$$ LANGUAGE SQL STABLE;

-- Get class statistics for an exercise
CREATE OR REPLACE FUNCTION get_class_geometry_stats(
    p_exercise_id UUID,
    p_class_id UUID
)
RETURNS JSONB AS $$
    SELECT jsonb_build_object(
        'total_students', COUNT(DISTINCT cm.student_id),
        'students_attempted', COUNT(DISTINCT gea.student_id),
        'students_completed', COUNT(DISTINCT CASE WHEN gea.status = 'graded' THEN gea.student_id END),
        'average_score', COALESCE(AVG(gea.final_score), 0),
        'average_time', COALESCE(AVG(gea.time_spent_seconds), 0),
        'pass_rate', COALESCE(
            COUNT(DISTINCT CASE WHEN gea.final_score >= ge.passing_score THEN gea.student_id END)::FLOAT /
            NULLIF(COUNT(DISTINCT gea.student_id), 0) * 100,
            0
        )
    )
    FROM class_members cm
    LEFT JOIN geometry_exercise_attempts gea ON gea.student_id = cm.student_id AND gea.exercise_id = p_exercise_id
    LEFT JOIN geometry_exercises ge ON ge.id = p_exercise_id
    WHERE cm.class_id = p_class_id;
$$ LANGUAGE SQL STABLE;

-- =======================
-- 10. COMMENTS
-- =======================

COMMENT ON TABLE geometry_exercises IS 'Geometry exercises using MathGraph32 - supports multiple types: view, measure, construct, proof, explore';
COMMENT ON TABLE geometry_exercise_steps IS 'Step-by-step validation for construction exercises';
COMMENT ON TABLE geometry_exercise_attempts IS 'Student attempts at geometry exercises with auto-save and validation';
COMMENT ON TABLE geometry_templates IS 'Reusable figure templates for exercise generation';
COMMENT ON TABLE geometry_hints IS 'Progressive hint system with scoring penalties';
COMMENT ON TABLE geometry_assignments IS 'Assignment of geometry exercises to classes or individual students';

COMMENT ON COLUMN geometry_exercises.randomization_params IS 'JSONB parameters for programmatic figure generation with random values';
COMMENT ON COLUMN geometry_exercises.validation_config IS 'JSONB validation rules: tolerance, expected values, partial credit settings';
COMMENT ON COLUMN geometry_exercise_attempts.figure_history IS 'Array of figure state snapshots with timestamps for replay/review';
COMMENT ON COLUMN geometry_exercise_attempts.active_time_seconds IS 'Actual working time excluding idle periods';
