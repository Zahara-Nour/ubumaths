-- Migration: Create Assessment System
-- Description: Add tables for teacher-created assessments with assignments to classes/students
-- This system allows teachers to create graded evaluations based on question cart categories

-- ===========================================================================
-- TABLE: assessments
-- ===========================================================================
-- Stores assessment definitions created by teachers

CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  title TEXT NOT NULL,
  grade TEXT NOT NULL, -- '6ème', '5ème', '4ème', '3ème', etc.
  description TEXT,

  -- Creator
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Question Configuration (reuses cart structure)
  categories JSONB NOT NULL, -- CartItem[] - same structure as question cart

  -- Settings
  settings JSONB NOT NULL DEFAULT '{
    "max_attempts": null,
    "time_limit": null,
    "deadline": null,
    "shuffle_questions": true
  }'::jsonb,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================================================
-- TABLE: assessment_assignments
-- ===========================================================================
-- Tracks which assessments are assigned to which classes/students

CREATE TABLE IF NOT EXISTS public.assessment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Assessment reference
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,

  -- Target (either class OR specific student, not both)
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Assignment metadata
  assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint: Must target either a class OR a student, not both or neither
  CONSTRAINT assignment_target_check CHECK (
    (class_id IS NOT NULL AND student_id IS NULL) OR
    (class_id IS NULL AND student_id IS NOT NULL)
  )
);

-- ===========================================================================
-- MODIFY: test_sessions
-- ===========================================================================
-- Add reference to assessment assignment (null = free practice test)

ALTER TABLE public.test_sessions
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.assessment_assignments(id) ON DELETE SET NULL;

-- ===========================================================================
-- VIEW: assessment_results
-- ===========================================================================
-- Aggregated results for teacher dashboard
-- Shows best attempt per student for each assignment

CREATE OR REPLACE VIEW public.assessment_results AS
SELECT
  aa.id AS assignment_id,
  aa.assessment_id,
  a.title AS assessment_title,
  a.grade AS assessment_grade,
  aa.class_id,
  aa.student_id,
  p.id AS student_user_id,
  p.firstname AS student_firstname,
  p.lastname AS student_lastname,
  c.name AS class_name,

  -- Best score (highest score among all attempts)
  MAX(ts.score) AS best_score,

  -- Number of attempts
  COUNT(ts.id) AS attempts_count,

  -- Last attempt date
  MAX(ts.completed_at) AS last_attempt_at,

  -- Status
  CASE
    WHEN COUNT(ts.id) = 0 THEN 'not_started'
    WHEN MAX(ts.completed_at) IS NULL THEN 'in_progress'
    ELSE 'completed'
  END AS status,

  -- Total questions (from first attempt to avoid recalculation)
  (SELECT total_questions FROM test_sessions WHERE assignment_id = aa.id LIMIT 1) AS total_questions

FROM public.assessment_assignments aa
JOIN public.assessments a ON a.id = aa.assessment_id
LEFT JOIN public.classes c ON c.id = aa.class_id
LEFT JOIN profiles p ON p.id = COALESCE(aa.student_id, NULL)
LEFT JOIN public.test_sessions ts ON ts.assignment_id = aa.id AND ts.user_id = p.id
WHERE a.status != 'archived'
GROUP BY aa.id, aa.assessment_id, a.title, a.grade, aa.class_id, aa.student_id,
         p.id, p.firstname, p.lastname, c.name;

-- ===========================================================================
-- INDEXES
-- ===========================================================================

-- Assessments indexes
CREATE INDEX IF NOT EXISTS idx_assessments_created_by
  ON public.assessments(created_by);

CREATE INDEX IF NOT EXISTS idx_assessments_grade
  ON public.assessments(grade);

CREATE INDEX IF NOT EXISTS idx_assessments_status
  ON public.assessments(status);

CREATE INDEX IF NOT EXISTS idx_assessments_created_at
  ON public.assessments(created_at DESC);

-- Assessment assignments indexes
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_assessment_id
  ON public.assessment_assignments(assessment_id);

CREATE INDEX IF NOT EXISTS idx_assessment_assignments_class_id
  ON public.assessment_assignments(class_id)
  WHERE class_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_assignments_student_id
  ON public.assessment_assignments(student_id)
  WHERE student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_assignments_assigned_by
  ON public.assessment_assignments(assigned_by);

-- Test sessions index for assignment lookup
CREATE INDEX IF NOT EXISTS idx_test_sessions_assignment_id
  ON public.test_sessions(assignment_id)
  WHERE assignment_id IS NOT NULL;

-- Composite index for student assignment lookup
CREATE INDEX IF NOT EXISTS idx_test_sessions_assignment_user
  ON public.test_sessions(assignment_id, user_id)
  WHERE assignment_id IS NOT NULL;

-- ===========================================================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================================================

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_assignments ENABLE ROW LEVEL SECURITY;

-- ===== ASSESSMENTS POLICIES =====

-- Teachers can view their own assessments
CREATE POLICY "Teachers can view own assessments"
  ON public.assessments
  FOR SELECT
  USING (created_by = auth.uid());

-- Teachers can create assessments
CREATE POLICY "Teachers can create assessments"
  ON public.assessments
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    AND created_by = auth.uid()
  );

-- Teachers can update their own assessments (title, description, settings, status)
CREATE POLICY "Teachers can update own assessments"
  ON public.assessments
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Teachers can delete their own assessments
CREATE POLICY "Teachers can delete own assessments"
  ON public.assessments
  FOR DELETE
  USING (created_by = auth.uid());

-- Students can view published assessments that are assigned to them
CREATE POLICY "Students can view assigned assessments"
  ON public.assessments
  FOR SELECT
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.assessment_assignments aa
      WHERE aa.assessment_id = assessments.id
      AND (
        -- Directly assigned to student
        aa.student_id = auth.uid()
        -- Or student is in assigned class
        OR EXISTS (
          SELECT 1 FROM public.class_members cm
          WHERE cm.class_id = aa.class_id
          AND cm.student_id = auth.uid()
        )
      )
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all assessments"
  ON public.assessments
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ===== ASSESSMENT ASSIGNMENTS POLICIES =====

-- Teachers can view assignments for their assessments
CREATE POLICY "Teachers can view assignments for their assessments"
  ON public.assessment_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_assignments.assessment_id
      AND a.created_by = auth.uid()
    )
  );

-- Teachers can create assignments for their own assessments and classes/students
CREATE POLICY "Teachers can create assignments for their assessments"
  ON public.assessment_assignments
  FOR INSERT
  WITH CHECK (
    -- Must be assignment creator
    assigned_by = auth.uid()
    -- Assessment must be owned by teacher
    AND EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_assignments.assessment_id
      AND a.created_by = auth.uid()
    )
    -- If assigning to class, must be teacher of that class
    AND (
      class_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = assessment_assignments.class_id
        AND c.teacher_id = auth.uid()
      )
    )
    -- If assigning to student, student must be in teacher's class
    AND (
      student_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.class_members cm
        JOIN public.classes c ON c.id = cm.class_id
        WHERE cm.student_id = assessment_assignments.student_id
        AND c.teacher_id = auth.uid()
      )
    )
  );

-- Teachers can delete assignments for their assessments
CREATE POLICY "Teachers can delete assignments for their assessments"
  ON public.assessment_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_assignments.assessment_id
      AND a.created_by = auth.uid()
    )
  );

-- Students can view their own assignments
CREATE POLICY "Students can view own assignments"
  ON public.assessment_assignments
  FOR SELECT
  USING (
    -- Directly assigned
    student_id = auth.uid()
    -- Or member of assigned class
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = assessment_assignments.class_id
      AND cm.student_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all assignments"
  ON public.assessment_assignments
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ===========================================================================
-- FUNCTIONS
-- ===========================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_assessments_updated_at_trigger
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_assessments_updated_at();

-- ===========================================================================
-- GRANTS
-- ===========================================================================

GRANT ALL ON public.assessments TO authenticated;
GRANT ALL ON public.assessment_assignments TO authenticated;
GRANT SELECT ON public.assessment_results TO authenticated;

-- ===========================================================================
-- COMMENTS
-- ===========================================================================

COMMENT ON TABLE public.assessments IS
  'Teacher-created assessments/evaluations based on question categories';

COMMENT ON TABLE public.assessment_assignments IS
  'Tracks which assessments are assigned to which classes or students';

COMMENT ON COLUMN public.assessments.categories IS
  'JSONB array of CartItem objects defining question selection';

COMMENT ON COLUMN public.assessments.settings IS
  'JSONB object: max_attempts (int|null), time_limit (seconds|null), deadline (ISO timestamp|null), shuffle_questions (boolean)';

COMMENT ON COLUMN public.test_sessions.assignment_id IS
  'Reference to assessment assignment if this is a graded test (null = free practice)';

COMMENT ON VIEW public.assessment_results IS
  'Aggregated view of student results per assessment assignment for teacher dashboard';
