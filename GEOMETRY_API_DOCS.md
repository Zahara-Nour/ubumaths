# Geometry System - Complete API Documentation

**Version:** 1.0.0
**Last Updated:** 2025-01-16
**Language:** English (Developer Documentation)

---

## Table of Contents

### Part 1: Database Schema
1. [Database Overview](#database-overview)
2. [Table Schemas](#table-schemas)
3. [Row Level Security (RLS)](#row-level-security-rls)
4. [Triggers & Functions](#triggers--functions)
5. [Query Examples](#query-examples)

### Part 2: Core Services
6. [MathGraph32 API Service](#mathgraph32-api-service)
7. [Validation Engine](#validation-engine)
8. [Figure Generator](#figure-generator)

### Part 3: Exercise Components
9. [Component Architecture](#component-architecture)
10. [ViewExploreExercise](#viewexploreexercise)
11. [MeasurementExercise](#measurementexercise)
12. [ConstructionExercise](#constructionexercise)
13. [ProofExercise](#proofexercise)
14. [GeometryExerciseWrapper](#geometryexercisewrapper)

### Part 4: Grading System
15. [Grading Service](#grading-service)
16. [Grade Utilities](#grade-utilities)
17. [Grade Submission](#grade-submission)
18. [Grading Components](#grading-components)

### Part 5: Integration
19. [Rewards System Integration](#rewards-system-integration)
20. [Creating Custom Exercise Types](#creating-custom-exercise-types)
21. [Adding Custom Validators](#adding-custom-validators)
22. [Extending the Grading System](#extending-the-grading-system)

---

## Part 1: Database Schema

### Database Overview

The geometry system uses **6 main tables** in Supabase PostgreSQL:

```
geometry_exercises          (Exercise definitions)
    ↓
geometry_exercise_steps     (Step-by-step validation)
    ↓
geometry_exercise_attempts  (Student work & scores)
    ↓
geometry_templates          (Reusable figure templates)
    ↓
geometry_hints              (Progressive hints)
    ↓
geometry_assignments        (Class assignments)
```

**Migration File:** `supabase/migrations/062_geometry_exercises_system.sql`

---

### Table Schemas

#### 1. geometry_exercises

Stores exercise definitions, validation rules, and configuration.

```sql
CREATE TABLE geometry_exercises (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Authorship
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Exercise Details
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    exercise_type TEXT NOT NULL CHECK (exercise_type IN ('view', 'explore', 'measure', 'construct', 'proof')),
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),

    -- Figure Data
    base_figure TEXT NOT NULL DEFAULT '',  -- Base64 encoded MathGraph32 figure
    solution_figure TEXT,                   -- Optional solution figure

    -- Validation Configuration
    validation_mode TEXT NOT NULL DEFAULT 'automatic'
        CHECK (validation_mode IN ('automatic', 'step_by_step', 'teacher_review', 'self_check')),
    validation_config JSONB NOT NULL DEFAULT '{}',

    -- Randomization
    randomization_params JSONB,  -- Example: {"pointA": {"x": "random(0, 100)", "y": "random(0, 100)"}}

    -- Display Options
    display_grid BOOLEAN DEFAULT false,
    display_axes BOOLEAN DEFAULT false,
    display_measures BOOLEAN DEFAULT false,

    -- Tools & Constraints
    tools_allowed TEXT[],  -- Array of allowed tool names

    -- Grading
    max_score INTEGER DEFAULT 100,
    passing_score INTEGER,
    grading_rubric JSONB,

    -- Timing
    time_limit_minutes INTEGER,

    -- Metadata
    learning_objectives TEXT[],
    tags TEXT[],
    is_public BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_geometry_exercises_created_by ON geometry_exercises(created_by);
CREATE INDEX idx_geometry_exercises_type ON geometry_exercises(exercise_type);
CREATE INDEX idx_geometry_exercises_difficulty ON geometry_exercises(difficulty_level);
CREATE INDEX idx_geometry_exercises_public ON geometry_exercises(is_public) WHERE is_public = true;
```

**TypeScript Interface:**

```typescript
export interface GeometryExercise {
    id: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    title: string;
    description?: string;
    instructions?: string;
    exercise_type: ExerciseType;
    difficulty_level?: DifficultyLevel;
    base_figure: string;
    solution_figure?: string;
    validation_mode: ValidationMode;
    validation_config: ValidationConfig;
    randomization_params?: RandomizationParams;
    display_grid: boolean;
    display_axes: boolean;
    display_measures: boolean;
    tools_allowed?: MathGraphTool[];
    max_score: number;
    passing_score?: number;
    grading_rubric?: GradingRubric;
    time_limit_minutes?: number;
    learning_objectives?: string[];
    tags?: string[];
    is_public: boolean;
    is_template: boolean;
}

export type ExerciseType = 'view' | 'explore' | 'measure' | 'construct' | 'proof';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ValidationMode = 'automatic' | 'step_by_step' | 'teacher_review' | 'self_check';
```

---

#### 2. geometry_exercise_steps

Defines validation steps for step-by-step exercises.

```sql
CREATE TABLE geometry_exercise_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES geometry_exercises(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    validation_criteria JSONB NOT NULL,
    hint_text TEXT,
    max_score INTEGER DEFAULT 10,
    is_required BOOLEAN DEFAULT true,

    UNIQUE(exercise_id, step_number)
);

CREATE INDEX idx_geometry_steps_exercise ON geometry_exercise_steps(exercise_id);
```

**TypeScript Interface:**

```typescript
export interface GeometryExerciseStep {
    id: string;
    exercise_id: string;
    step_number: number;
    title: string;
    description?: string;
    validation_criteria: ValidationConfig;
    hint_text?: string;
    max_score: number;
    is_required: boolean;
}
```

**Example Step:**

```json
{
    "step_number": 1,
    "title": "Créer le point milieu M",
    "validation_criteria": {
        "requiredObjects": ["point_M"],
        "validateMidpoint": {
            "pointTag": "point_M",
            "point1Tag": "A",
            "point2Tag": "B",
            "tolerance": 2
        }
    },
    "hint_text": "Utilisez l'outil milieu sur le segment AB",
    "max_score": 10
}
```

---

#### 3. geometry_exercise_attempts

Stores student attempts with auto-save and history.

```sql
CREATE TABLE geometry_exercise_attempts (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Relationships
    exercise_id UUID NOT NULL REFERENCES geometry_exercises(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Attempt Tracking
    attempts_count INTEGER NOT NULL DEFAULT 1,

    -- Work State
    current_figure_state TEXT NOT NULL DEFAULT '',
    figure_history JSONB DEFAULT '[]',  -- Array of {timestamp, figureState, score?}
    student_answer JSONB,  -- For measurement/proof exercises

    -- Validation Results
    validation_results JSONB,

    -- Scoring
    score_earned NUMERIC(5,2) DEFAULT 0,
    max_score_possible INTEGER DEFAULT 100,

    -- Penalties
    hints_used INTEGER DEFAULT 0,
    hint_penalty NUMERIC(5,2) DEFAULT 0,

    -- Time Tracking
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    active_time_seconds INTEGER NOT NULL DEFAULT 0,

    -- Completion
    is_complete BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    last_saved_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(exercise_id, student_id, attempts_count)
);

-- Indexes
CREATE INDEX idx_geometry_attempts_exercise ON geometry_exercise_attempts(exercise_id);
CREATE INDEX idx_geometry_attempts_student ON geometry_exercise_attempts(student_id);
CREATE INDEX idx_geometry_attempts_complete ON geometry_exercise_attempts(is_complete);
```

**TypeScript Interface:**

```typescript
export interface GeometryExerciseAttempt {
    id: string;
    created_at: string;
    updated_at: string;
    exercise_id: string;
    student_id: string;
    attempts_count: number;
    current_figure_state: string;
    figure_history: FigureHistoryEntry[];
    student_answer?: any;
    validation_results?: ValidationResults;
    score_earned: number;
    max_score_possible: number;
    hints_used: number;
    hint_penalty: number;
    time_spent_seconds: number;
    active_time_seconds: number;
    is_complete: boolean;
    completed_at?: string;
    last_saved_at: string;
}

export interface FigureHistoryEntry {
    timestamp: string;
    figureState: string;
    score?: number;
}
```

---

#### 4. geometry_templates

Reusable figure templates for quick exercise creation.

```sql
CREATE TABLE geometry_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    figure_template TEXT NOT NULL,
    randomization_config JSONB,
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0
);

CREATE INDEX idx_geometry_templates_category ON geometry_templates(category);
CREATE INDEX idx_geometry_templates_public ON geometry_templates(is_public) WHERE is_public = true;
```

**TypeScript Interface:**

```typescript
export interface GeometryTemplate {
    id: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    name: string;
    description?: string;
    category?: string;
    figure_template: string;
    randomization_config?: RandomizationParams;
    is_public: boolean;
    usage_count: number;
}
```

---

#### 5. geometry_hints

Progressive hints with penalties.

```sql
CREATE TABLE geometry_hints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES geometry_exercises(id) ON DELETE CASCADE,
    hint_level TEXT NOT NULL CHECK (hint_level IN ('general', 'specific', 'step_by_step')),
    hint_text TEXT NOT NULL,
    trigger_condition JSONB,  -- Optional: When to show hint
    score_penalty INTEGER DEFAULT 0,  -- Percentage penalty (0, 5, or 10)
    display_order INTEGER DEFAULT 0
);

CREATE INDEX idx_geometry_hints_exercise ON geometry_hints(exercise_id);
```

**TypeScript Interface:**

```typescript
export interface GeometryHint {
    id: string;
    exercise_id: string;
    hint_level: HintLevel;
    hint_text: string;
    trigger_condition?: any;
    score_penalty: number;
    display_order: number;
}

export type HintLevel = 'general' | 'specific' | 'step_by_step';
```

**Hint Levels:**
- **General** (0% penalty): Broad guidance, no penalty
- **Specific** (5% penalty): Targeted help
- **Step-by-step** (10% penalty): Detailed solution steps

---

#### 6. geometry_assignments

Assigns exercises to classes or individual students.

```sql
CREATE TABLE geometry_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exercise_id UUID NOT NULL REFERENCES geometry_exercises(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Assignment Target
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- Timing
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,

    -- Configuration
    max_attempts INTEGER,
    require_completion BOOLEAN DEFAULT false,

    CHECK ((class_id IS NOT NULL) OR (student_id IS NOT NULL))
);

CREATE INDEX idx_geometry_assignments_exercise ON geometry_assignments(exercise_id);
CREATE INDEX idx_geometry_assignments_class ON geometry_assignments(class_id);
CREATE INDEX idx_geometry_assignments_student ON geometry_assignments(student_id);
```

**TypeScript Interface:**

```typescript
export interface GeometryAssignment {
    id: string;
    created_at: string;
    exercise_id: string;
    assigned_by: string;
    class_id?: string;
    student_id?: string;
    assigned_at: string;
    due_date?: string;
    max_attempts?: number;
    require_completion: boolean;
}
```

---

### Row Level Security (RLS)

All tables have RLS enabled with policies for teachers, students, and admins.

#### Example: geometry_exercises Policies

```sql
-- Enable RLS
ALTER TABLE geometry_exercises ENABLE ROW LEVEL SECURITY;

-- Teachers can create exercises
CREATE POLICY "Teachers can create exercises"
    ON geometry_exercises
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('teacher', 'admin')
        )
    );

-- Teachers can view their own exercises
CREATE POLICY "Teachers can view own exercises"
    ON geometry_exercises
    FOR SELECT
    TO authenticated
    USING (created_by = auth.uid());

-- Students can view public exercises
CREATE POLICY "Students can view public exercises"
    ON geometry_exercises
    FOR SELECT
    TO authenticated
    USING (is_public = true);

-- Students can view assigned exercises
CREATE POLICY "Students can view assigned exercises"
    ON geometry_exercises
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM geometry_assignments
            WHERE geometry_assignments.exercise_id = geometry_exercises.id
            AND (
                geometry_assignments.student_id = auth.uid()
                OR geometry_assignments.class_id IN (
                    SELECT class_id FROM class_members
                    WHERE student_id = auth.uid()
                )
            )
        )
    );

-- Teachers can update their own exercises
CREATE POLICY "Teachers can update own exercises"
    ON geometry_exercises
    FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Teachers can delete their own exercises
CREATE POLICY "Teachers can delete own exercises"
    ON geometry_exercises
    FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());
```

#### Example: geometry_exercise_attempts Policies

```sql
-- Students can insert their own attempts
CREATE POLICY "Students can insert own attempts"
    ON geometry_exercise_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

-- Students can view their own attempts
CREATE POLICY "Students can view own attempts"
    ON geometry_exercise_attempts
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

-- Students can update their own incomplete attempts
CREATE POLICY "Students can update own incomplete attempts"
    ON geometry_exercise_attempts
    FOR UPDATE
    TO authenticated
    USING (student_id = auth.uid() AND is_complete = false)
    WITH CHECK (student_id = auth.uid());

-- Teachers can view all attempts for their exercises
CREATE POLICY "Teachers can view attempts for own exercises"
    ON geometry_exercise_attempts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM geometry_exercises
            WHERE geometry_exercises.id = geometry_exercise_attempts.exercise_id
            AND geometry_exercises.created_by = auth.uid()
        )
    );
```

---

### Triggers & Functions

#### 1. Auto-update `updated_at` timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_geometry_exercises_updated_at
    BEFORE UPDATE ON geometry_exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_geometry_attempts_updated_at
    BEFORE UPDATE ON geometry_exercise_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### 2. Auto-update `last_saved_at` on attempts

```sql
CREATE OR REPLACE FUNCTION update_last_saved_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_saved_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attempts_last_saved_at
    BEFORE UPDATE ON geometry_exercise_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_last_saved_at();
```

#### 3. Auto-calculate final score with penalties

```sql
CREATE OR REPLACE FUNCTION calculate_final_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Apply hint penalty
    NEW.score_earned = NEW.score_earned - NEW.hint_penalty;

    -- Ensure score doesn't go below 0
    IF NEW.score_earned < 0 THEN
        NEW.score_earned = 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_attempt_final_score
    BEFORE INSERT OR UPDATE ON geometry_exercise_attempts
    FOR EACH ROW
    EXECUTE FUNCTION calculate_final_score();
```

#### 4. Helper: Get best geometry score for a student

```sql
CREATE OR REPLACE FUNCTION get_best_geometry_score(
    p_exercise_id UUID,
    p_student_id UUID
)
RETURNS NUMERIC AS $$
BEGIN
    RETURN (
        SELECT COALESCE(MAX(score_earned), 0)
        FROM geometry_exercise_attempts
        WHERE exercise_id = p_exercise_id
        AND student_id = p_student_id
    );
END;
$$ LANGUAGE plpgsql;
```

#### 5. Helper: Get geometry progress

```sql
CREATE OR REPLACE FUNCTION get_geometry_progress(
    p_student_id UUID
)
RETURNS TABLE (
    total_assigned INTEGER,
    total_completed INTEGER,
    average_score NUMERIC,
    total_time_spent INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT ga.exercise_id)::INTEGER AS total_assigned,
        COUNT(DISTINCT CASE WHEN gea.is_complete THEN ga.exercise_id END)::INTEGER AS total_completed,
        COALESCE(AVG(gea.score_earned), 0) AS average_score,
        COALESCE(SUM(gea.time_spent_seconds), 0)::INTEGER AS total_time_spent
    FROM geometry_assignments ga
    LEFT JOIN geometry_exercise_attempts gea ON gea.exercise_id = ga.exercise_id
        AND gea.student_id = p_student_id
    WHERE ga.student_id = p_student_id
    OR ga.class_id IN (
        SELECT class_id FROM class_members WHERE student_id = p_student_id
    );
END;
$$ LANGUAGE plpgsql;
```

#### 6. Helper: Get class geometry stats

```sql
CREATE OR REPLACE FUNCTION get_class_geometry_stats(
    p_class_id UUID
)
RETURNS TABLE (
    total_students INTEGER,
    total_exercises INTEGER,
    average_completion_rate NUMERIC,
    average_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT cm.student_id)::INTEGER AS total_students,
        COUNT(DISTINCT ga.exercise_id)::INTEGER AS total_exercises,
        COALESCE(
            AVG(
                CASE WHEN gea.is_complete THEN 100.0 ELSE 0.0 END
            ), 0
        ) AS average_completion_rate,
        COALESCE(AVG(gea.score_earned), 0) AS average_score
    FROM class_members cm
    CROSS JOIN geometry_assignments ga
    LEFT JOIN geometry_exercise_attempts gea ON gea.exercise_id = ga.exercise_id
        AND gea.student_id = cm.student_id
    WHERE cm.class_id = p_class_id
    AND ga.class_id = p_class_id;
END;
$$ LANGUAGE plpgsql;
```

---

### Query Examples

#### Example 1: Get all exercises for a student

```typescript
// Get all assigned exercises for current user
const { data: exercises, error } = await supabase
    .from('geometry_exercises')
    .select(`
        *,
        geometry_assignments!inner(
            id,
            due_date,
            max_attempts
        )
    `)
    .or(`
        geometry_assignments.student_id.eq.${userId},
        geometry_assignments.class_id.in.(${classIds.join(',')})
    `);
```

#### Example 2: Get student's best attempt

```typescript
const { data: bestAttempt } = await supabase
    .from('geometry_exercise_attempts')
    .select('*')
    .eq('exercise_id', exerciseId)
    .eq('student_id', studentId)
    .order('score_earned', { ascending: false })
    .limit(1)
    .single();
```

#### Example 3: Get all attempts with student info (teacher view)

```typescript
const { data: attempts } = await supabase
    .from('geometry_exercise_attempts')
    .select(`
        *,
        profiles:student_id (
            firstname,
            lastname,
            avatar_url
        )
    `)
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: false });
```

#### Example 4: Get exercise with hints

```typescript
const { data: exercise } = await supabase
    .from('geometry_exercises')
    .select(`
        *,
        geometry_hints (
            id,
            hint_level,
            hint_text,
            score_penalty,
            display_order
        )
    `)
    .eq('id', exerciseId)
    .single();

// Hints are automatically ordered by display_order
```

#### Example 5: Create exercise with steps

```typescript
// 1. Create exercise
const { data: exercise, error: exerciseError } = await supabase
    .from('geometry_exercises')
    .insert({
        title: 'Construct Perpendicular Bisector',
        exercise_type: 'construct',
        validation_mode: 'step_by_step',
        base_figure: baseFigureBase64,
        // ... other fields
    })
    .select()
    .single();

// 2. Create steps
const steps = [
    {
        exercise_id: exercise.id,
        step_number: 1,
        title: 'Create midpoint M',
        validation_criteria: { /* ... */ },
        max_score: 10
    },
    {
        exercise_id: exercise.id,
        step_number: 2,
        title: 'Create perpendicular line',
        validation_criteria: { /* ... */ },
        max_score: 15
    }
];

const { error: stepsError } = await supabase
    .from('geometry_exercise_steps')
    .insert(steps);
```

#### Example 6: Get student progress

```typescript
const { data: progress } = await supabase
    .rpc('get_geometry_progress', {
        p_student_id: studentId
    })
    .single();

console.log(`
    Assigned: ${progress.total_assigned}
    Completed: ${progress.total_completed}
    Average Score: ${progress.average_score}
    Total Time: ${progress.total_time_spent}s
`);
```

#### Example 7: Get class statistics

```typescript
const { data: stats } = await supabase
    .rpc('get_class_geometry_stats', {
        p_class_id: classId
    })
    .single();

console.log(`
    Students: ${stats.total_students}
    Exercises: ${stats.total_exercises}
    Completion Rate: ${stats.average_completion_rate}%
    Average Score: ${stats.average_score}
`);
```

---

## Part 2: Core Services

### MathGraph32 API Service

**File:** `src/lib/services/mathgraph-api.ts`

**Purpose:** Singleton service for loading MathGraph32 from CDN and initializing players/editors.

#### Class: MathGraphService

```typescript
export class MathGraphService {
    private static instance: MathGraphService;
    private loadingPromise: Promise<void> | null = null;
    private activeApps: Map<string, MathGraphApp> = new Map();

    /**
     * Get singleton instance
     */
    static getInstance(): MathGraphService {
        if (!MathGraphService.instance) {
            MathGraphService.instance = new MathGraphService();
        }
        return MathGraphService.instance;
    }

    /**
     * Load MathGraph32 from CDN
     * @param useDevelopmentCDN - Use dev.mathgraph32.org instead of production
     * @returns Promise that resolves when library is loaded
     */
    async loadMathGraph(useDevelopmentCDN = false): Promise<void>;

    /**
     * Initialize a read-only player
     * @param container - HTML element container
     * @param options - Player configuration options
     * @returns Promise resolving to MathGraphApp instance
     */
    async initializePlayer(
        container: HTMLElement,
        options: PlayerOptions
    ): Promise<MathGraphApp>;

    /**
     * Initialize an editable editor
     * @param container - HTML element container
     * @param options - Editor configuration options
     * @returns Promise resolving to MathGraphApp instance
     */
    async initializeEditor(
        container: HTMLElement,
        options: EditorOptions
    ): Promise<MathGraphApp>;
}
```

#### Interfaces

```typescript
export interface PlayerOptions {
    width: number;
    height: number;
    figure: string;              // Base64 encoded figure
    svgId?: string;
    level?: number;              // Display level 0-4
    interactive?: boolean;       // Allow dragging
    displayAxes?: boolean;
    displayMeasures?: boolean;
}

export interface EditorOptions extends PlayerOptions {
    toolsAllowed?: string[];     // Restrict tools
}
```

#### Usage Example

```typescript
import { MathGraphService } from '$lib/services/mathgraph-api';

const service = MathGraphService.getInstance();

// Load CDN (only once)
await service.loadMathGraph();

// Initialize player
const app = await service.initializePlayer(container, {
    width: 800,
    height: 600,
    figure: baseFigureBase64,
    interactive: true,
    displayAxes: false
});

// Use app
app.addPointXY({
    tag: 'A',
    name: 'A',
    x: 100,
    y: 100,
    visible: true
});
```

---

### Validation Engine

**File:** `src/lib/services/geometry-validator.ts`

**Purpose:** Validate student constructions against expected criteria.

#### Main Function

```typescript
/**
 * Validate a student's exercise attempt
 * @param app - MathGraphApp instance
 * @param exercise - Exercise definition
 * @returns Validation results with score, errors, warnings, feedback
 */
export async function validateExercise(
    app: MathGraphApp,
    exercise: GeometryExercise
): Promise<ValidationResults>;
```

#### Validation Results Interface

```typescript
export interface ValidationResults {
    isValid: boolean;
    score: number;
    maxScore: number;
    errors: string[];
    warnings: string[];
    feedback: string[];
    measurements: Record<string, number>;
    objectsCreated: string[];
    objectsMissing: string[];
    objectsIncorrect: string[];
}
```

#### Validator Functions (30+)

##### Point Validators

```typescript
/**
 * Check if a point exists by tag
 */
export function validatePointExists(
    app: MathGraphApp,
    pointTag: string
): boolean;

/**
 * Check if a point is on a line
 * @param tolerance - Distance tolerance in pixels (default: 2)
 */
export function validatePointOnLine(
    app: MathGraphApp,
    pointTag: string,
    lineTag: string,
    tolerance?: number
): boolean;

/**
 * Check if a point is on a circle
 * @param tolerance - Distance tolerance in pixels (default: 2)
 */
export function validatePointOnCircle(
    app: MathGraphApp,
    pointTag: string,
    circleTag: string,
    tolerance?: number
): boolean;

/**
 * Check if a point is the midpoint of two other points
 * @param tolerance - Distance tolerance in pixels (default: 2)
 */
export function validatePointIsMidpoint(
    app: MathGraphApp,
    midpointTag: string,
    point1Tag: string,
    point2Tag: string,
    tolerance?: number
): boolean;

/**
 * Check if a point has specific coordinates
 * @param tolerance - Coordinate tolerance in pixels (default: 5)
 */
export function validatePointCoordinates(
    app: MathGraphApp,
    pointTag: string,
    expectedX: number,
    expectedY: number,
    tolerance?: number
): boolean;
```

##### Line Validators

```typescript
/**
 * Check if two lines are parallel
 * @param angleTolerance - Angle tolerance in degrees (default: 2)
 */
export function validateLinesParallel(
    app: MathGraphApp,
    line1Tag: string,
    line2Tag: string,
    angleTolerance?: number
): boolean;

/**
 * Check if two lines are perpendicular
 * @param angleTolerance - Angle tolerance in degrees (default: 2)
 */
export function validateLinesPerpendicular(
    app: MathGraphApp,
    line1Tag: string,
    line2Tag: string,
    angleTolerance?: number
): boolean;

/**
 * Check if a line passes through specific points
 * @param tolerance - Distance tolerance in pixels (default: 2)
 */
export function validateLinePassesThroughPoints(
    app: MathGraphApp,
    lineTag: string,
    pointTags: string[],
    tolerance?: number
): boolean;

/**
 * Check if a line is the perpendicular bisector of a segment
 */
export function validateLineBisector(
    app: MathGraphApp,
    lineTag: string,
    point1Tag: string,
    point2Tag: string,
    tolerance?: number
): boolean;
```

##### Circle Validators

```typescript
/**
 * Check if a circle has the expected radius
 * @param tolerance - Radius tolerance in pixels (default: 2)
 */
export function validateCircleRadius(
    app: MathGraphApp,
    circleTag: string,
    expectedRadius: number,
    tolerance?: number
): boolean;

/**
 * Check if a circle has the expected center
 * @param tolerance - Distance tolerance in pixels (default: 2)
 */
export function validateCircleCenter(
    app: MathGraphApp,
    circleTag: string,
    centerTag: string,
    tolerance?: number
): boolean;

/**
 * Check if two circles intersect
 */
export function validateCirclesIntersect(
    app: MathGraphApp,
    circle1Tag: string,
    circle2Tag: string
): boolean;
```

##### Angle Validators

```typescript
/**
 * Measure an angle formed by three points
 * @returns Angle in degrees (0-360) or null if points don't exist
 */
export function measureAngle(
    app: MathGraphApp,
    point1Tag: string,
    vertexTag: string,
    point2Tag: string
): number | null;

/**
 * Validate angle measurement
 * @param tolerance - Angle tolerance in degrees (default: 2)
 */
export function validateAngleMeasure(
    app: MathGraphApp,
    point1Tag: string,
    vertexTag: string,
    point2Tag: string,
    expectedAngle: number,
    tolerance?: number
): boolean;

/**
 * Check if an angle is a right angle (90°)
 */
export function validateRightAngle(
    app: MathGraphApp,
    point1Tag: string,
    vertexTag: string,
    point2Tag: string,
    tolerance?: number
): boolean;

/**
 * Check if two angles are equal
 */
export function validateAnglesEqual(
    app: MathGraphApp,
    angle1: [string, string, string],
    angle2: [string, string, string],
    tolerance?: number
): boolean;
```

##### Distance Validators

```typescript
/**
 * Validate distance between two points
 * @param tolerance - Distance tolerance as percentage (default: 2%)
 */
export function validateDistance(
    app: MathGraphApp,
    point1Tag: string,
    point2Tag: string,
    expectedDistance: number,
    tolerance?: number
): boolean;

/**
 * Check if two segments have equal length
 */
export function validateSegmentsEqual(
    app: MathGraphApp,
    segment1: [string, string],
    segment2: [string, string],
    tolerance?: number
): boolean;
```

##### Triangle Validators

```typescript
/**
 * Check if three points form a valid triangle
 */
export function validateTriangle(
    app: MathGraphApp,
    point1Tag: string,
    point2Tag: string,
    point3Tag: string
): boolean;

/**
 * Check if a triangle is isosceles
 */
export function validateIsoscelesTriangle(
    app: MathGraphApp,
    point1Tag: string,
    point2Tag: string,
    point3Tag: string,
    tolerance?: number
): boolean;

/**
 * Check if a triangle is equilateral
 */
export function validateEquilateralTriangle(
    app: MathGraphApp,
    point1Tag: string,
    point2Tag: string,
    point3Tag: string,
    tolerance?: number
): boolean;

/**
 * Check if a triangle is right-angled
 */
export function validateRightTriangle(
    app: MathGraphApp,
    point1Tag: string,
    point2Tag: string,
    point3Tag: string,
    tolerance?: number
): boolean;
```

#### Usage Example

```typescript
import { validateExercise } from '$lib/services/geometry-validator';

const exercise: GeometryExercise = {
    // ... exercise definition
    validation_config: {
        requiredObjects: ['point_M', 'line_perpendicular'],
        checkPerpendicular: ['line_AB', 'line_perpendicular'],
        checkMidpoint: {
            midpointTag: 'point_M',
            point1Tag: 'A',
            point2Tag: 'B'
        },
        tolerance: 2
    }
};

const results = await validateExercise(mathGraphApp, exercise);

if (results.isValid) {
    console.log('✓ Construction is correct!');
    console.log(`Score: ${results.score}/${results.maxScore}`);
} else {
    console.log('✗ Construction has errors:');
    results.errors.forEach(error => console.log(`  - ${error}`));
}
```

---

### Figure Generator

**File:** `src/lib/services/geometry-generator.ts`

**Purpose:** Programmatically generate geometric figures with randomization.

#### Main Functions

```typescript
/**
 * Generate a random triangle
 * @param app - MathGraphApp instance
 * @param constraints - Triangle type and constraints
 * @returns Generated figure data with metadata
 */
export async function generateRandomTriangle(
    app: MathGraphApp,
    constraints?: TriangleConstraints
): Promise<GeneratedFigure>;

/**
 * Generate circle configurations
 * @param app - MathGraphApp instance
 * @param config - Circle configuration type
 * @returns Generated figure data with metadata
 */
export async function generateCircleConfiguration(
    app: MathGraphApp,
    config: CircleConfiguration
): Promise<GeneratedFigure>;

/**
 * Generate transformation problems
 * @param app - MathGraphApp instance
 * @param problem - Transformation type and config
 * @returns Generated figure data with metadata
 */
export async function generateTransformationProblem(
    app: MathGraphApp,
    problem: TransformationProblem
): Promise<GeneratedFigure>;

/**
 * Generate angle problems
 * @param app - MathGraphApp instance
 * @param problem - Angle problem configuration
 * @returns Generated figure data with metadata
 */
export async function generateAngleProblem(
    app: MathGraphApp,
    problem: AngleProblem
): Promise<GeneratedFigure>;

/**
 * Apply randomization parameters to a template
 * @param app - MathGraphApp instance
 * @param templateFigure - Base64 template figure
 * @param params - Randomization parameters
 * @returns Generated figure with applied randomization
 */
export async function applyRandomization(
    app: MathGraphApp,
    templateFigure: string,
    params: RandomizationParams
): Promise<GeneratedFigure>;
```

#### Interfaces

```typescript
export interface TriangleConstraints {
    type?: 'scalene' | 'isosceles' | 'equilateral' | 'right' | 'acute' | 'obtuse';
    minSideLength?: number;
    maxSideLength?: number;
    fixedSideLength?: number;
    fixedAngle?: number;
    pointLabels?: [string, string, string];
}

export interface CircleConfiguration {
    type: 'single' | 'two-intersecting' | 'two-tangent-external' |
          'two-tangent-internal' | 'concentric' | 'inscribed-triangle' |
          'circumscribed-triangle';
    minRadius?: number;
    maxRadius?: number;
    centerLabels?: string[];
    pointLabels?: string[];
}

export interface TransformationProblem {
    type: 'translation' | 'rotation' | 'reflection' | 'homothety';
    sourceShape: 'point' | 'segment' | 'triangle' | 'quadrilateral';
    includeGrid?: boolean;
    showConstruction?: boolean;
}

export interface AngleProblem {
    difficulty: 'easy' | 'medium' | 'hard';
    type: 'measure' | 'construct' | 'complementary' | 'supplementary' |
          'vertical' | 'parallel-lines';
    targetAngle?: number;
    includeProtractor?: boolean;
}

export interface GeneratedFigure {
    figureBase64: string;
    metadata: {
        objects: string[];
        measurements: Record<string, number>;
        correctAnswers?: Record<string, number | string>;
        randomizationSeed?: string;
    };
}

export interface RandomizationParams {
    [objectTag: string]: {
        x?: string;  // e.g., "random(0, 100)"
        y?: string;
        [key: string]: any;
    };
}
```

#### Usage Examples

##### Example 1: Generate Random Triangle

```typescript
import { generateRandomTriangle } from '$lib/services/geometry-generator';

const figure = await generateRandomTriangle(app, {
    type: 'right',
    minSideLength: 50,
    maxSideLength: 150,
    pointLabels: ['A', 'B', 'C']
});

console.log('Generated triangle:', figure.metadata.measurements);
// Output: { AB: 120, AC: 85, BC: 146.3, angle_A: 90, angle_B: 35.3, angle_C: 54.7 }

// Save figure
await saveExercise({
    base_figure: figure.figureBase64,
    validation_config: {
        expectedMeasurements: figure.metadata.measurements
    }
});
```

##### Example 2: Generate Circle with Inscribed Triangle

```typescript
const figure = await generateCircleConfiguration(app, {
    type: 'inscribed-triangle',
    minRadius: 60,
    maxRadius: 120
});

console.log('Circumradius:', figure.metadata.measurements.circumradius);
```

##### Example 3: Apply Randomization to Template

```typescript
const randomizationParams: RandomizationParams = {
    'point_A': {
        x: 'random(100, 300)',
        y: 'random(100, 300)'
    },
    'point_B': {
        x: 'random(400, 600)',
        y: 'random(100, 300)'
    }
};

const figure = await applyRandomization(
    app,
    templateFigure,
    randomizationParams
);

// Each student gets a unique version!
```

---

## Part 3: Exercise Components

### Component Architecture

All exercise components follow a consistent pattern:

1. **Props Interface** - TypeScript interface for component props
2. **State Management** - Using Svelte 5 runes ($state, $derived, $effect)
3. **Auto-save** - 30-second intervals
4. **Validation** - Integration with validation engine
5. **Events** - Callbacks for validation, save, completion

### ViewExploreExercise

**File:** `src/lib/components/geometry/exercises/ViewExploreExercise.svelte`

**Purpose:** Display pre-made figures for exploration (students can drag points).

#### Props

```typescript
interface Props {
    exercise: GeometryExercise;
    attempt?: GeometryExerciseAttempt | null;
    onComplete?: () => void;
    onSave?: (data: { viewTime: number; interactionCount: number }) => void;
}
```

#### Features

- ✅ Read-only MathGraph32 player
- ✅ Interactive dragging enabled
- ✅ Interaction tracking (counts drags)
- ✅ View time tracking (MM:SS format)
- ✅ Reset to initial state
- ✅ Mark as complete button
- ✅ Auto-save every 30s
- ✅ Learning objectives display

#### Usage

```svelte
<script>
    import { ViewExploreExercise } from '$lib/components/geometry/exercises';

    let exercise: GeometryExercise = {
        // ... exercise definition
    };
</script>

<ViewExploreExercise
    {exercise}
    onComplete={() => console.log('Completed!')}
    onSave={(data) => console.log('Saved:', data)}
/>
```

---

### MeasurementExercise

**File:** `src/lib/components/geometry/exercises/MeasurementExercise.svelte`

**Purpose:** Students measure geometric properties and input numerical answers.

#### Props

```typescript
interface Props {
    exercise: GeometryExercise;
    attempt?: GeometryExerciseAttempt | null;
    onValidate?: (results: ValidationResults) => void;
    onSave?: (data: { answers: Record<string, number>; attempts: number }) => void;
}
```

#### Features

- ✅ Read-only figure display
- ✅ Multiple measurement questions
- ✅ Numeric input fields with units (°, unités, unités²)
- ✅ Real-time validation feedback
- ✅ Color-coded status (green ✓ / red ✗)
- ✅ Tolerance-based validation
- ✅ Attempt tracking
- ✅ Reset and retry functionality
- ✅ Auto-save

#### Expected Config Format

```typescript
const exercise: GeometryExercise = {
    validation_config: {
        expectedMeasurements: {
            'angle_ABC': 45,      // Angle in degrees
            'distance_AB': 120,   // Distance in pixels
            'radius_O': 50,       // Radius in pixels
            'area_triangle': 3000, // Area in pixels²
            'perimeter_ABC': 340  // Perimeter in pixels
        },
        tolerance: 2  // ±2° for angles, ±2% for distances
    }
};
```

#### Usage

```svelte
<script>
    import { MeasurementExercise } from '$lib/components/geometry/exercises';

    function handleValidation(results: ValidationResults) {
        if (results.isValid) {
            awardGidouilles(studentId, 10);
        }
    }
</script>

<MeasurementExercise
    {exercise}
    onValidate={handleValidation}
/>
```

---

### ConstructionExercise

**File:** `src/lib/components/geometry/exercises/ConstructionExercise.svelte`

**Purpose:** Students construct geometric figures from scratch using tools.

#### Props

```typescript
interface Props {
    exercise: GeometryExercise;
    attempt?: GeometryExerciseAttempt | null;
    hints?: GeometryHint[];
    onValidate?: (results: ValidationResults) => void;
    onSave?: (data: {
        figureState: string;
        attempts: number;
        hintsUsed: number;
        hintPenalty: number;
    }) => void;
}
```

#### Features

- ✅ Full MathGraph32 editor
- ✅ Tool restrictions (configurable via `tools_allowed`)
- ✅ Change detection (500ms interval)
- ✅ Manual save button
- ✅ Auto-save every 30s
- ✅ Progressive hints system (3 levels)
- ✅ Hint penalty tracking (-5%, -10%)
- ✅ Validation with detailed feedback
- ✅ Tabbed interface (Construction / Validation)
- ✅ Validation criteria preview

#### Hints System

Three hint levels with penalties:

1. **General** (0% penalty) - Broad guidance
2. **Specific** (-5% penalty) - Targeted help
3. **Step-by-step** (-10% penalty) - Detailed solution

#### Usage

```svelte
<script>
    import { ConstructionExercise } from '$lib/components/geometry/exercises';

    const hints: GeometryHint[] = [
        {
            id: 'hint1',
            hint_level: 'general',
            hint_text: 'Utilisez l\'outil perpendiculaire.',
            score_penalty: 0
        },
        {
            id: 'hint2',
            hint_level: 'specific',
            hint_text: 'Sélectionnez d\'abord la droite (AB), puis le point C.',
            score_penalty: 5
        }
    ];
</script>

<ConstructionExercise
    {exercise}
    {hints}
    onValidate={(results) => console.log('Score:', results.score)}
/>
```

---

### ProofExercise

**File:** `src/lib/components/geometry/exercises/ProofExercise.svelte`

**Purpose:** Students write step-by-step geometric proofs.

#### Props

```typescript
interface Props {
    exercise: GeometryExercise;
    attempt?: GeometryExerciseAttempt | null;
    onValidate?: (results: ValidationResults) => void;
    onSave?: (data: { steps: ProofStep[]; attempts: number }) => void;
}

interface ProofStep {
    id: string;
    statement: string;
    justification: string;
}
```

#### Features

- ✅ Read-only figure display
- ✅ Dynamic proof steps (add/remove)
- ✅ Step reordering (move up/down)
- ✅ Statement input (textarea)
- ✅ Justification dropdown (15 common theorems)
- ✅ Custom justification support
- ✅ Step completion tracking
- ✅ Validation against expected steps (if configured)
- ✅ Manual review mode for teacher evaluation
- ✅ Auto-save

#### Common Justifications

```typescript
const commonJustifications = [
    'Définition',
    'Propriété des angles opposés par le sommet',
    'Propriété des angles alternes-internes',
    'Propriété des angles correspondants',
    'Somme des angles d\'un triangle',
    'Théorème de Pythagore',
    'Réciproque du théorème de Pythagore',
    'Propriété de la médiatrice',
    'Propriété de la bissectrice',
    'Propriété du cercle',
    'Propriété du parallélogramme',
    'Théorème de Thalès',
    'Réciproque du théorème de Thalès',
    'Autre'
];
```

#### Expected Config Format (Optional)

```typescript
const exercise: GeometryExercise = {
    validation_config: {
        expectedProofSteps: [
            {
                statement: 'AB = AC (hypothèse)',
                justification: 'Définition'
            },
            {
                statement: 'Les angles ABC et ACB sont égaux',
                justification: 'Propriété du triangle isocèle'
            },
            {
                statement: 'Donc le triangle ABC est isocèle en A',
                justification: 'Définition du triangle isocèle'
            }
        ]
    }
};
```

#### Usage

```svelte
<script>
    import { ProofExercise } from '$lib/components/geometry/exercises';
</script>

<ProofExercise
    {exercise}
    onValidate={(results) => {
        if (results.isValid) {
            console.log('Proof is correct!');
        } else if (results.warnings.includes('manual review')) {
            console.log('Requires teacher review');
        }
    }}
/>
```

---

### GeometryExerciseWrapper

**File:** `src/lib/components/geometry/GeometryExerciseWrapper.svelte`

**Purpose:** Dynamic component loader that selects the correct exercise type.

#### Props

```typescript
interface Props {
    exercise: GeometryExercise;
    attempt?: GeometryExerciseAttempt | null;
    hints?: GeometryHint[];
    onValidate?: (results: ValidationResults) => void;
    onSave?: (data: any) => void;
    onComplete?: () => void;
}
```

#### Component Selection Logic

```typescript
const ExerciseComponent = $derived(() => {
    switch (exercise.exercise_type) {
        case 'view':
        case 'explore':
            return ViewExploreExercise;
        case 'measure':
            return MeasurementExercise;
        case 'construct':
            return ConstructionExercise;
        case 'proof':
            return ProofExercise;
        default:
            return null;
    }
});
```

#### Usage

```svelte
<script>
    import { GeometryExerciseWrapper } from '$lib/components/geometry';

    // Just pass the exercise - wrapper handles type selection
    let exercise: GeometryExercise = {
        exercise_type: 'construct',  // Wrapper loads ConstructionExercise
        // ... other fields
    };
</script>

<GeometryExerciseWrapper
    {exercise}
    {attempt}
    {hints}
    onValidate={(results) => handleValidation(results)}
    onSave={(data) => saveToDatabase(data)}
/>
```

---

## Part 4: Grading System

### Grading Service

**File:** `src/lib/services/geometry-grader.ts`

**Purpose:** Calculate scores with penalties and generate grades.

#### Main Function

```typescript
/**
 * Calculate final grade for an exercise attempt
 * @param exercise - Exercise definition
 * @param validationResults - Results from validation engine
 * @param options - Hints used, time spent, attempt number
 * @returns Complete grade result with penalties
 */
export function calculateGrade(
    exercise: GeometryExercise,
    validationResults: ValidationResults,
    options?: {
        hintsUsed?: Array<{ level: HintLevel; penalty: number }>;
        timeSpent?: number;
        attemptNumber?: number;
    }
): GradeResult;
```

#### Grade Result Interface

```typescript
export interface GradeResult {
    rawScore: number;          // Score before penalties
    finalScore: number;        // Score after all penalties
    maxScore: number;
    percentage: number;        // 0-100
    passed: boolean;
    grade: string;             // A, B, C, D, F
    penalties: {
        hints?: HintPenalty;
        time?: TimePenalty;
        attempts?: number;
        total: number;
    };
    feedback: string[];
}
```

#### Penalty Functions

```typescript
/**
 * Calculate hint penalty
 * @returns Total penalty in points
 */
export function calculateHintPenalty(
    hintsUsed: Array<{ level: HintLevel; penalty: number }>,
    maxScore: number
): HintPenalty;

/**
 * Calculate time penalty (1% per minute overtime, max 20%)
 * @returns Time penalty in points
 */
export function calculateTimePenalty(
    timeSpent: number | undefined,
    timeLimit: number | undefined,
    maxScore: number
): TimePenalty;

/**
 * Calculate attempt penalty (2% per attempt, max 10%)
 * @returns Attempt penalty in points
 */
export function calculateAttemptPenalty(
    attemptNumber: number,
    maxScore: number
): number;
```

#### Scoring Functions

```typescript
/**
 * Get letter grade from percentage
 * A: 90-100%, B: 80-89%, C: 70-79%, D: 60-69%, F: 0-59%
 */
export function getLetterGrade(percentage: number): string;

/**
 * Calculate correctness score (0-100)
 */
export function calculateCorrectnessScore(
    validationResults: ValidationResults
): number;

/**
 * Calculate completeness score (0-100)
 */
export function calculateCompletenessScore(
    validationResults: ValidationResults
): number;

/**
 * Calculate efficiency score (0-100)
 */
export function calculateEfficiencyScore(
    validationResults: ValidationResults,
    expectedObjectCount: number
): number;

/**
 * Calculate weighted score based on rubric
 * Default: Correctness 70%, Completeness 20%, Efficiency 10%
 */
export function calculateWeightedScore(
    scores: {
        correctness: number;
        completeness: number;
        efficiency: number;
    },
    rubric?: GradingRubric
): number;
```

#### Usage Example

```typescript
import { GeometryGrader } from '$lib/services/geometry-grader';

const validationResults = await validateExercise(app, exercise);

const gradeResult = GeometryGrader.calculateGrade(
    exercise,
    validationResults,
    {
        hintsUsed: [
            { level: 'specific', penalty: 5 },
            { level: 'step_by_step', penalty: 10 }
        ],
        timeSpent: 600,  // 10 minutes
        attemptNumber: 2
    }
);

console.log(`
    Raw Score: ${gradeResult.rawScore}/${gradeResult.maxScore}
    Penalties: -${gradeResult.penalties.total} points
    Final Score: ${gradeResult.finalScore}/${gradeResult.maxScore}
    Grade: ${gradeResult.grade} (${gradeResult.percentage}%)
    Passed: ${gradeResult.passed}
`);
```

---

### Grade Utilities

**File:** `src/lib/services/geometry-grade-utils.ts`

**Purpose:** Formatting, statistics, achievements, and rankings.

#### Formatting Functions

```typescript
export function formatScore(score: number, maxScore: number): string;  // "85/100"
export function formatPercentage(percentage: number, decimals?: number): string;  // "85%"
export function formatTime(seconds: number): string;  // "5m 30s"
export function formatTimeMMSS(seconds: number): string;  // "05:30"
export function formatDate(date: string | Date): string;  // "16 janvier 2025, 14:30"
```

#### Color Coding

```typescript
/**
 * Get Tailwind color classes for score
 * @returns { text, bg, border } class names
 */
export function getScoreColor(percentage: number): {
    text: string;
    bg: string;
    border: string;
};

/**
 * Get color for letter grade
 */
export function getLetterGradeColor(grade: string): string;
```

#### Statistics Functions

```typescript
/**
 * Calculate statistics from multiple attempts
 */
export function calculateAttemptStatistics(
    attempts: GeometryExerciseAttempt[]
): {
    count: number;
    average: number;
    best: number;
    worst: number;
    median: number;
    standardDeviation: number;
};

/**
 * Calculate class-wide statistics
 */
export function calculateClassStatistics(
    allAttempts: GeometryExerciseAttempt[],
    exercise: GeometryExercise
): {
    totalStudents: number;
    completedStudents: number;
    averageScore: number;
    passRate: number;
    averageAttempts: number;
    averageTime: number;
};
```

#### Ranking Functions

```typescript
/**
 * Calculate student rank in class
 */
export function calculateRank(
    studentScore: number,
    allScores: number[]
): {
    rank: number;
    total: number;
    percentile: number;
};

/**
 * Get ranking tier
 * Top 10%, Top 25%, Top 50%, or "En progression"
 */
export function getRankingTier(percentile: number): {
    tier: string;
    color: string;
    icon: string;
};
```

#### Achievement Functions

```typescript
/**
 * Check for achievements based on performance
 *
 * Achievements:
 * - perfect: 100% without hints
 * - speedster: <50% of time limit
 * - first_try: 80%+ on first attempt
 * - persistent: 80%+ after 5+ attempts
 * - independent: 80%+ without hints
 */
export function checkAchievements(
    attempt: GeometryExerciseAttempt,
    exercise: GeometryExercise
): {
    earned: string[];
    descriptions: Record<string, string>;
};

/**
 * Get achievement display info
 */
export function getAchievementDisplay(achievement: string): {
    icon: string;
    color: string;
    name: string;
};
```

---

### Grade Submission

**File:** `src/lib/services/geometry-grade-submission.ts`

**Purpose:** Submit grades to database with full CRUD operations.

#### Submission Functions

```typescript
/**
 * Submit a new graded attempt
 */
export async function submitGrade(
    supabase: SupabaseClient,
    exercise: GeometryExercise,
    options: SubmitGradeOptions
): Promise<GradeSubmissionResult>;

/**
 * Update existing attempt (auto-save)
 */
export async function updateAttempt(
    supabase: SupabaseClient,
    options: UpdateAttemptOptions
): Promise<GradeSubmissionResult>;

/**
 * Get or create current attempt for student
 */
export async function getOrCreateAttempt(
    supabase: SupabaseClient,
    exerciseId: string,
    studentId: string
): Promise<{ attempt: GeometryExerciseAttempt | null; error?: string }>;

/**
 * Mark attempt as complete
 */
export async function markAttemptComplete(
    supabase: SupabaseClient,
    attemptId: string
): Promise<GradeSubmissionResult>;

/**
 * Reset attempt for retry
 */
export async function resetAttempt(
    supabase: SupabaseClient,
    attemptId: string
): Promise<GradeSubmissionResult>;

/**
 * Delete attempt
 */
export async function deleteAttempt(
    supabase: SupabaseClient,
    attemptId: string
): Promise<GradeSubmissionResult>;
```

#### Query Functions

```typescript
/**
 * Get all attempts for a student
 */
export async function getStudentAttempts(
    supabase: SupabaseClient,
    exerciseId: string,
    studentId: string
): Promise<{ attempts: GeometryExerciseAttempt[]; error?: string }>;

/**
 * Get best attempt for a student
 */
export async function getBestAttempt(
    supabase: SupabaseClient,
    exerciseId: string,
    studentId: string
): Promise<{ attempt: GeometryExerciseAttempt | null; error?: string }>;

/**
 * Get all attempts for an exercise (teacher view)
 */
export async function getAllExerciseAttempts(
    supabase: SupabaseClient,
    exerciseId: string
): Promise<{ attempts: GeometryExerciseAttempt[]; error?: string }>;

/**
 * Get student progress summary
 */
export async function getStudentProgress(
    supabase: SupabaseClient,
    exerciseId: string,
    studentId: string
): Promise<{
    progress: {
        totalAttempts: number;
        completedAttempts: number;
        bestScore: number;
        averageScore: number;
        latestAttempt: GeometryExerciseAttempt | null;
    } | null;
    error?: string;
}>;
```

#### Usage Example

```typescript
import { GradeSubmission } from '$lib/services/geometry-grade-submission';

// Submit grade
const result = await GradeSubmission.submitGrade(supabase, exercise, {
    exerciseId: exercise.id,
    studentId: user.id,
    validationResults,
    gradeResult,
    figureState: currentFigure,
    hintsUsed: 2,
    timeSpent: 480,
    isComplete: true
});

if (result.success) {
    console.log('Grade submitted:', result.attemptId);
}

// Get student progress
const { progress } = await GradeSubmission.getStudentProgress(
    supabase,
    exerciseId,
    studentId
);

console.log(`Attempts: ${progress.totalAttempts}, Best: ${progress.bestScore}`);
```

---

### Grading Components

#### GradeDisplay Component

**File:** `src/lib/components/geometry/grading/GradeDisplay.svelte`

**Purpose:** Display grade with visual feedback and breakdown.

**Props:**

```typescript
interface Props {
    gradeResult: GradeResult;
    showDetails?: boolean;      // Default: true
    showPenalties?: boolean;    // Default: true
}
```

**Features:**
- Large letter grade badge (A-F)
- Color-coded by performance
- Score and percentage
- Progress bar
- Score breakdown (raw, penalties, final)
- Performance tier message
- Feedback list

**Usage:**

```svelte
<script>
    import { GradeDisplay } from '$lib/components/geometry/grading';
</script>

<GradeDisplay {gradeResult} />
```

---

#### AttemptHistory Component

**File:** `src/lib/components/geometry/grading/AttemptHistory.svelte`

**Purpose:** Display attempt history with trends and statistics.

**Props:**

```typescript
interface Props {
    attempts: GeometryExerciseAttempt[];
    maxScore: number;
    onViewAttempt?: (attempt: GeometryExerciseAttempt) => void;
}
```

**Features:**
- Statistics summary (best, average, median, worst)
- Overall trend (improving/declining/stable)
- Attempt list with cards
- Individual attempt trends (↗/↘/→)
- Date, time, score, progress bar
- Optional view button

**Usage:**

```svelte
<script>
    import { AttemptHistory } from '$lib/components/geometry/grading';

    function viewAttempt(attempt) {
        // Load and display attempt details
    }
</script>

<AttemptHistory
    {attempts}
    maxScore={exercise.max_score}
    onViewAttempt={viewAttempt}
/>
```

---

## Part 5: Integration

### Rewards System Integration

**How to award gidouilles and VIP cards based on geometry performance:**

```typescript
import { GeometryGrader, GradeUtils } from '$lib/services/geometry-grader';

async function handleExerciseCompletion(
    supabase: SupabaseClient,
    studentId: string,
    exercise: GeometryExercise,
    gradeResult: GradeResult,
    attempt: GeometryExerciseAttempt
) {
    // 1. Base gidouilles (10 per 10 points)
    const baseGidouilles = Math.floor(gradeResult.finalScore / 10);
    await awardGidouilles(supabase, studentId, baseGidouilles, `Exercise: ${exercise.title}`);

    // 2. Check achievements
    const { earned, descriptions } = GradeUtils.checkAchievements(attempt, exercise);

    for (const achievement of earned) {
        if (achievement === 'perfect') {
            // Perfect score! Award legendary VIP card + bonus gidouilles
            await awardGidouilles(supabase, studentId, 100, 'Perfect Score Achievement!');
            await awardVIPCard(supabase, studentId, 'legendary');
        } else if (achievement === 'speedster') {
            // Speed achievement
            await awardGidouilles(supabase, studentId, 50, 'Speed Achievement!');
        } else if (achievement === 'first_try') {
            // First try success
            await awardGidouilles(supabase, studentId, 30, 'First Try Success!');
        }
    }

    // 3. Ranking bonuses
    const { attempts } = await GradeSubmission.getAllExerciseAttempts(supabase, exercise.id);
    const allScores = attempts.map(a => a.score_earned ?? 0);
    const { percentile } = GradeUtils.calculateRank(gradeResult.finalScore, allScores);

    if (percentile >= 90) {
        // Top 10%
        await awardGidouilles(supabase, studentId, 20, 'Top 10% Ranking!');
    } else if (percentile >= 75) {
        // Top 25%
        await awardGidouilles(supabase, studentId, 10, 'Top 25% Ranking!');
    }
}
```

---

### Creating Custom Exercise Types

**To add a new exercise type (e.g., "transformation"):**

1. **Add type to database enum:**

```sql
ALTER TABLE geometry_exercises
DROP CONSTRAINT geometry_exercises_exercise_type_check;

ALTER TABLE geometry_exercises
ADD CONSTRAINT geometry_exercises_exercise_type_check
CHECK (exercise_type IN ('view', 'explore', 'measure', 'construct', 'proof', 'transformation'));
```

2. **Update TypeScript type:**

```typescript
// In src/lib/types/geometry.ts
export type ExerciseType = 'view' | 'explore' | 'measure' | 'construct' | 'proof' | 'transformation';
```

3. **Create component:**

```svelte
<!-- src/lib/components/geometry/exercises/TransformationExercise.svelte -->
<script lang="ts">
    import type { GeometryExercise, ValidationResults } from '$lib/types/geometry';

    interface Props {
        exercise: GeometryExercise;
        onValidate?: (results: ValidationResults) => void;
    }

    let { exercise, onValidate }: Props = $props();

    // Your transformation exercise logic
</script>

<div class="transformation-exercise">
    <!-- Your UI -->
</div>
```

4. **Update wrapper:**

```typescript
// In GeometryExerciseWrapper.svelte
import TransformationExercise from './exercises/TransformationExercise.svelte';

const ExerciseComponent = $derived(() => {
    switch (exercise.exercise_type) {
        // ... existing cases
        case 'transformation':
            return TransformationExercise;
        default:
            return null;
    }
});
```

---

### Adding Custom Validators

**To add a new validator:**

1. **Add function to geometry-validator.ts:**

```typescript
/**
 * Check if a polygon is convex
 * @param app - MathGraphApp instance
 * @param polygonTag - Tag of the polygon
 * @returns true if polygon is convex
 */
export function validateConvexPolygon(
    app: MathGraphApp,
    polygonTag: string
): boolean {
    const polygon = app.getObjectByTag(polygonTag);
    if (!polygon || polygon.type !== 'polygon') return false;

    const points = polygon.points;  // Array of points
    if (points.length < 3) return false;

    // Check if all interior angles < 180°
    for (let i = 0; i < points.length; i++) {
        const prev = points[(i - 1 + points.length) % points.length];
        const curr = points[i];
        const next = points[(i + 1) % points.length];

        const angle = measureAngle(app, prev.tag, curr.tag, next.tag);
        if (angle === null || angle >= 180) {
            return false;
        }
    }

    return true;
}
```

2. **Use in validation config:**

```typescript
const exercise: GeometryExercise = {
    validation_config: {
        validateConvexPolygon: {
            polygonTag: 'student_polygon'
        }
    }
};
```

3. **Add to validateExercise function:**

```typescript
export async function validateExercise(
    app: MathGraphApp,
    exercise: GeometryExercise
): Promise<ValidationResults> {
    // ... existing validation

    // Add custom validation
    if (config.validateConvexPolygon) {
        const isConvex = validateConvexPolygon(
            app,
            config.validateConvexPolygon.polygonTag
        );

        if (!isConvex) {
            results.errors.push('Le polygone doit être convexe');
        }
    }

    return results;
}
```

---

### Extending the Grading System

**To add custom grading criteria:**

1. **Define custom rubric:**

```typescript
const customRubric: GradingRubric = {
    correctness: 0.5,   // 50%
    completeness: 0.3,  // 30%
    efficiency: 0.1,    // 10%
    elegance: 0.1       // 10% (NEW)
};
```

2. **Calculate elegance score:**

```typescript
function calculateEleganceScore(
    validationResults: ValidationResults,
    expectedObjectCount: number
): number {
    const actualCount = validationResults.objectsCreated.length;

    // Perfect elegance if using exactly expected number
    if (actualCount === expectedObjectCount) return 100;

    // Penalize for using extra objects
    if (actualCount > expectedObjectCount) {
        const extraObjects = actualCount - expectedObjectCount;
        return Math.max(0, 100 - (extraObjects * 10));
    }

    // Incomplete
    return 0;
}
```

3. **Use in grading:**

```typescript
const scores = {
    correctness: calculateCorrectnessScore(validationResults),
    completeness: calculateCompletenessScore(validationResults),
    efficiency: calculateEfficiencyScore(validationResults, 5),
    elegance: calculateEleganceScore(validationResults, 5)
};

const rawScore = calculateWeightedScore(scores, customRubric);
```

---

## Conclusion

This comprehensive API documentation covers all aspects of the Geometry Exercise System:

- **Database:** 6 tables with RLS, triggers, and helper functions
- **Services:** MathGraph32 API, validation (30+ functions), figure generation, grading
- **Components:** 4 exercise types + wrapper, 2 grading components
- **Integration:** Rewards, custom types, custom validators, custom grading

For French documentation see:
- **GEOMETRY_TEACHER_GUIDE.md** - Guide for teachers
- **GEOMETRY_STUDENT_GUIDE.md** - Guide for students
- **MATHGRAPH32_API_GUIDE.md** - Detailed MathGraph32 API
- **GEOMETRY_EXAMPLES.md** - 12 complete exercise examples

For interactive demos, visit: `/demo/geometry`

---

**Last Updated:** 2025-01-16
**Version:** 1.0.0
**License:** Internal use only (UbuMaths project)
