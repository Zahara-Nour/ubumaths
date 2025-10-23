-- Migration: Create Riddles (Enigmas) System
-- Description: Math riddles/enigmas bank with automatic and manual validation,
--              riddle of the day, degressive rewards, and statistics
-- This system allows teachers to create riddles for students with gamification

-- ===========================================================================
-- TABLE: riddles
-- ===========================================================================
-- Stores riddle definitions created by teachers

CREATE TABLE IF NOT EXISTS public.riddles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auto-incrementing display number (global across all riddles)
  riddle_number SERIAL UNIQUE NOT NULL,

  -- Basic Info
  title TEXT NOT NULL,
  genre TEXT, -- Free-form tag (e.g., "logique", "géométrie", "algèbre")
  difficulty INTEGER NOT NULL CHECK (difficulty IN (1, 2, 3)),

  -- Content (rich text HTML)
  statement TEXT NOT NULL, -- Problem statement
  correction TEXT NOT NULL, -- Solution/explanation (visible to teachers only)

  -- Optional image
  image_url TEXT,

  -- Optional automatic validation configuration
  -- If NULL, requires manual validation by teacher via messaging
  -- Structure: { type: 'numerical' | 'text' | 'qcm' | 'math', value: ..., options: {...} }
  answer JSONB,

  -- Creator
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================================================
-- TABLE: riddle_assignments
-- ===========================================================================
-- Tracks which riddles are assigned to which classes/students (specific assignments)
-- Note: Riddle of the day is accessible to everyone, this is for specific assignments

CREATE TABLE IF NOT EXISTS public.riddle_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Riddle reference
  riddle_id UUID NOT NULL REFERENCES public.riddles(id) ON DELETE CASCADE,

  -- Target (either class OR specific student, not both)
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Assignment metadata
  assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint: Must target either a class OR a student, not both or neither
  CONSTRAINT riddle_assignment_target_check CHECK (
    (class_id IS NOT NULL AND student_id IS NULL) OR
    (class_id IS NULL AND student_id IS NOT NULL)
  )
);

-- ===========================================================================
-- TABLE: riddle_of_the_day
-- ===========================================================================
-- Stores the riddle of the day (one per day for entire school)

CREATE TABLE IF NOT EXISTS public.riddle_of_the_day (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Riddle reference
  riddle_id UUID NOT NULL REFERENCES public.riddles(id) ON DELETE CASCADE,

  -- Date (unique - only one riddle per day)
  date DATE NOT NULL UNIQUE,

  -- Selection metadata
  auto_selected BOOLEAN NOT NULL DEFAULT true, -- true = automatic rotation, false = manual selection
  selected_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- who selected (if manual)

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================================================
-- TABLE: riddle_attempts
-- ===========================================================================
-- Stores student attempts at solving riddles

CREATE TABLE IF NOT EXISTS public.riddle_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  riddle_id UUID NOT NULL REFERENCES public.riddles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Attempt info
  attempt_number INTEGER NOT NULL, -- 1, 2, 3, ... (per student per riddle)
  submitted_answer JSONB NOT NULL, -- Student's answer (structure depends on riddle type)

  -- Validation
  is_correct BOOLEAN, -- NULL = awaiting manual validation, true/false = validated
  validated_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- teacher who validated (if manual)
  validated_at TIMESTAMPTZ,

  -- Rewards
  gidouilles_awarded INTEGER NOT NULL DEFAULT 0, -- Calculated with degressive formula

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE (riddle_id, student_id, attempt_number),
  CHECK (attempt_number > 0)
);

-- ===========================================================================
-- VIEW: riddle_stats
-- ===========================================================================
-- Statistics per riddle for teachers

CREATE OR REPLACE VIEW public.riddle_stats AS
SELECT
  r.id AS riddle_id,
  r.riddle_number,
  r.title,
  r.genre,
  r.difficulty,
  r.created_by,

  -- Attempt statistics
  COUNT(DISTINCT ra.student_id) AS unique_students,
  COUNT(ra.id) AS total_attempts,
  COALESCE(AVG(ra.attempt_number), 0) AS avg_attempts_to_success,

  -- Success statistics (only counting successful attempts)
  COUNT(ra.id) FILTER (WHERE ra.is_correct = true) AS successful_attempts,
  CASE
    WHEN COUNT(ra.id) > 0 THEN
      ROUND((COUNT(ra.id) FILTER (WHERE ra.is_correct = true)::DECIMAL / COUNT(ra.id)) * 100, 2)
    ELSE 0
  END AS success_rate_percent,

  -- Distribution by attempt number
  COUNT(ra.id) FILTER (WHERE ra.attempt_number = 1) AS first_attempts,
  COUNT(ra.id) FILTER (WHERE ra.attempt_number = 2) AS second_attempts,
  COUNT(ra.id) FILTER (WHERE ra.attempt_number >= 3) AS third_plus_attempts,

  -- Pending manual validations
  COUNT(ra.id) FILTER (WHERE ra.is_correct IS NULL) AS pending_validations,

  -- Gidouilles distributed
  COALESCE(SUM(ra.gidouilles_awarded), 0) AS total_gidouilles_awarded

FROM public.riddles r
LEFT JOIN public.riddle_attempts ra ON ra.riddle_id = r.id
GROUP BY r.id, r.riddle_number, r.title, r.genre, r.difficulty, r.created_by;

-- ===========================================================================
-- VIEW: riddle_progress
-- ===========================================================================
-- Student progress and leaderboard data

CREATE OR REPLACE VIEW public.riddle_progress AS
SELECT
  p.id AS student_id,
  p.firstname,
  p.lastname,
  p.avatar_url,

  -- Completion stats
  COUNT(DISTINCT CASE WHEN ra.is_correct = true THEN ra.riddle_id END) AS riddles_completed,
  COUNT(ra.id) AS total_attempts,

  -- Gidouilles from riddles
  COALESCE(SUM(ra.gidouilles_awarded), 0) AS riddles_gidouilles,

  -- Best/latest
  MAX(ra.created_at) FILTER (WHERE ra.is_correct = true) AS last_success_at,

  -- Rank (will be calculated in application layer)
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ra.gidouilles_awarded), 0) DESC) AS rank

FROM public.profiles p
LEFT JOIN public.riddle_attempts ra ON ra.student_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.firstname, p.lastname, p.avatar_url
ORDER BY riddles_gidouilles DESC;

-- ===========================================================================
-- VIEW: riddle_student_history
-- ===========================================================================
-- Individual student riddle history

CREATE OR REPLACE VIEW public.riddle_student_history AS
SELECT
  ra.student_id,
  ra.riddle_id,
  r.riddle_number,
  r.title AS riddle_title,
  r.genre,
  r.difficulty,

  -- Attempt info
  MIN(ra.attempt_number) AS first_attempt_number,
  MAX(ra.attempt_number) AS latest_attempt_number,
  COUNT(ra.id) AS total_attempts,

  -- Success info
  BOOL_OR(ra.is_correct = true) AS ever_succeeded,
  MIN(ra.created_at) FILTER (WHERE ra.is_correct = true) AS first_success_at,
  MAX(ra.gidouilles_awarded) AS max_gidouilles_earned,
  COALESCE(SUM(ra.gidouilles_awarded), 0) AS total_gidouilles_earned,

  -- Latest attempt
  (SELECT created_at FROM riddle_attempts
   WHERE student_id = ra.student_id AND riddle_id = ra.riddle_id
   ORDER BY attempt_number DESC LIMIT 1) AS last_attempt_at

FROM public.riddle_attempts ra
JOIN public.riddles r ON r.id = ra.riddle_id
GROUP BY ra.student_id, ra.riddle_id, r.riddle_number, r.title, r.genre, r.difficulty;

-- ===========================================================================
-- INDEXES
-- ===========================================================================

-- Riddles indexes
CREATE INDEX IF NOT EXISTS idx_riddles_created_by
  ON public.riddles(created_by);

CREATE INDEX IF NOT EXISTS idx_riddles_status
  ON public.riddles(status);

CREATE INDEX IF NOT EXISTS idx_riddles_difficulty
  ON public.riddles(difficulty);

CREATE INDEX IF NOT EXISTS idx_riddles_genre
  ON public.riddles(genre);

CREATE INDEX IF NOT EXISTS idx_riddles_number
  ON public.riddles(riddle_number);

-- Riddle assignments indexes
CREATE INDEX IF NOT EXISTS idx_riddle_assignments_riddle_id
  ON public.riddle_assignments(riddle_id);

CREATE INDEX IF NOT EXISTS idx_riddle_assignments_class_id
  ON public.riddle_assignments(class_id)
  WHERE class_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_riddle_assignments_student_id
  ON public.riddle_assignments(student_id)
  WHERE student_id IS NOT NULL;

-- Riddle of the day indexes
CREATE INDEX IF NOT EXISTS idx_riddle_of_the_day_date
  ON public.riddle_of_the_day(date DESC);

CREATE INDEX IF NOT EXISTS idx_riddle_of_the_day_riddle_id
  ON public.riddle_of_the_day(riddle_id);

-- Riddle attempts indexes
CREATE INDEX IF NOT EXISTS idx_riddle_attempts_riddle_id
  ON public.riddle_attempts(riddle_id);

CREATE INDEX IF NOT EXISTS idx_riddle_attempts_student_id
  ON public.riddle_attempts(student_id);

CREATE INDEX IF NOT EXISTS idx_riddle_attempts_is_correct
  ON public.riddle_attempts(is_correct);

-- Composite index for student attempt lookup
CREATE INDEX IF NOT EXISTS idx_riddle_attempts_student_riddle
  ON public.riddle_attempts(student_id, riddle_id);

-- Index for pending validations
CREATE INDEX IF NOT EXISTS idx_riddle_attempts_pending
  ON public.riddle_attempts(riddle_id, is_correct)
  WHERE is_correct IS NULL;

-- ===========================================================================
-- FUNCTIONS: Riddle Management
-- ===========================================================================

-- Function: Get next attempt number for a student on a riddle
CREATE OR REPLACE FUNCTION public.get_next_riddle_attempt_number(
  p_riddle_id UUID,
  p_student_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(attempt_number) + 1
     FROM riddle_attempts
     WHERE riddle_id = p_riddle_id AND student_id = p_student_id),
    1
  );
END;
$$;

-- Function: Calculate degressive gidouilles reward
-- Formula: difficulty × multiplier
-- Multiplier: 1st attempt = 3, 2nd = 2, 3rd+ = 1
CREATE OR REPLACE FUNCTION public.calculate_riddle_gidouilles(
  p_difficulty INTEGER,
  p_attempt_number INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_multiplier INTEGER;
BEGIN
  -- Degressive multiplier based on attempt number
  v_multiplier := CASE
    WHEN p_attempt_number = 1 THEN 3
    WHEN p_attempt_number = 2 THEN 2
    ELSE 1
  END;

  RETURN p_difficulty * v_multiplier;
END;
$$;

-- Function: Submit riddle attempt and award gidouilles if correct
CREATE OR REPLACE FUNCTION public.submit_riddle_attempt(
  p_riddle_id UUID,
  p_student_id UUID,
  p_submitted_answer JSONB,
  p_is_correct BOOLEAN DEFAULT NULL -- NULL for manual validation, true/false for auto
)
RETURNS UUID -- Returns attempt_id
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt_number INTEGER;
  v_difficulty INTEGER;
  v_gidouilles INTEGER;
  v_attempt_id UUID;
BEGIN
  -- Get riddle difficulty
  SELECT difficulty INTO v_difficulty
  FROM riddles
  WHERE id = p_riddle_id;

  IF v_difficulty IS NULL THEN
    RAISE EXCEPTION 'Riddle not found';
  END IF;

  -- Get next attempt number
  v_attempt_number := public.get_next_riddle_attempt_number(p_riddle_id, p_student_id);

  -- Calculate gidouilles (only if correct)
  IF p_is_correct = true THEN
    v_gidouilles := public.calculate_riddle_gidouilles(v_difficulty, v_attempt_number);
  ELSE
    v_gidouilles := 0;
  END IF;

  -- Create attempt record
  INSERT INTO riddle_attempts (
    riddle_id,
    student_id,
    attempt_number,
    submitted_answer,
    is_correct,
    gidouilles_awarded,
    validated_at
  ) VALUES (
    p_riddle_id,
    p_student_id,
    v_attempt_number,
    p_submitted_answer,
    p_is_correct,
    v_gidouilles,
    CASE WHEN p_is_correct IS NOT NULL THEN now() ELSE NULL END
  )
  RETURNING id INTO v_attempt_id;

  -- Award gidouilles if correct
  IF p_is_correct = true AND v_gidouilles > 0 THEN
    UPDATE profiles
    SET gidouilles = gidouilles + v_gidouilles
    WHERE id = p_student_id;
  END IF;

  RETURN v_attempt_id;
END;
$$;

-- Function: Validate riddle attempt (manual validation by teacher)
CREATE OR REPLACE FUNCTION public.validate_riddle_attempt(
  p_attempt_id UUID,
  p_teacher_id UUID,
  p_is_correct BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
  v_riddle_id UUID;
  v_difficulty INTEGER;
  v_attempt_number INTEGER;
  v_gidouilles INTEGER;
BEGIN
  -- Get attempt details
  SELECT student_id, riddle_id, attempt_number
  INTO v_student_id, v_riddle_id, v_attempt_number
  FROM riddle_attempts
  WHERE id = p_attempt_id AND is_correct IS NULL; -- Only validate pending attempts

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found or already validated';
  END IF;

  -- Get riddle difficulty
  SELECT difficulty INTO v_difficulty FROM riddles WHERE id = v_riddle_id;

  -- Calculate gidouilles if correct
  IF p_is_correct = true THEN
    v_gidouilles := public.calculate_riddle_gidouilles(v_difficulty, v_attempt_number);
  ELSE
    v_gidouilles := 0;
  END IF;

  -- Update attempt
  UPDATE riddle_attempts
  SET
    is_correct = p_is_correct,
    validated_by = p_teacher_id,
    validated_at = now(),
    gidouilles_awarded = v_gidouilles
  WHERE id = p_attempt_id;

  -- Award gidouilles if correct
  IF p_is_correct = true AND v_gidouilles > 0 THEN
    UPDATE profiles
    SET gidouilles = gidouilles + v_gidouilles
    WHERE id = v_student_id;
  END IF;

  RETURN true;
END;
$$;

-- Function: Get or create today's riddle of the day
CREATE OR REPLACE FUNCTION public.get_riddle_of_the_day(p_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID -- Returns riddle_id
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_riddle_id UUID;
BEGIN
  -- Try to get existing riddle of the day
  SELECT riddle_id INTO v_riddle_id
  FROM riddle_of_the_day
  WHERE date = p_date;

  RETURN v_riddle_id;
END;
$$;

-- Function: Set riddle of the day (manual override)
CREATE OR REPLACE FUNCTION public.set_riddle_of_the_day(
  p_riddle_id UUID,
  p_date DATE,
  p_selected_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Upsert riddle of the day
  INSERT INTO riddle_of_the_day (riddle_id, date, auto_selected, selected_by)
  VALUES (p_riddle_id, p_date, false, p_selected_by)
  ON CONFLICT (date)
  DO UPDATE SET
    riddle_id = EXCLUDED.riddle_id,
    auto_selected = false,
    selected_by = EXCLUDED.selected_by,
    created_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ===========================================================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================================================

ALTER TABLE public.riddles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riddle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riddle_of_the_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riddle_attempts ENABLE ROW LEVEL SECURITY;

-- ===== RIDDLES POLICIES =====

-- Teachers can view their own riddles
CREATE POLICY "Teachers can view own riddles"
  ON public.riddles
  FOR SELECT
  USING (created_by = auth.uid());

-- Teachers can create riddles
CREATE POLICY "Teachers can create riddles"
  ON public.riddles
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    AND created_by = auth.uid()
  );

-- Teachers can update their own riddles
CREATE POLICY "Teachers can update own riddles"
  ON public.riddles
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Teachers can delete their own riddles
CREATE POLICY "Teachers can delete own riddles"
  ON public.riddles
  FOR DELETE
  USING (created_by = auth.uid());

-- Students can view published riddles that are assigned to them OR riddle of the day
CREATE POLICY "Students can view assigned riddles and riddle of the day"
  ON public.riddles
  FOR SELECT
  USING (
    status = 'published'
    AND (
      -- Riddle of the day (accessible to all students)
      EXISTS (
        SELECT 1 FROM public.riddle_of_the_day rotd
        WHERE rotd.riddle_id = riddles.id
      )
      -- OR assigned to student
      OR EXISTS (
        SELECT 1 FROM public.riddle_assignments ra
        WHERE ra.riddle_id = riddles.id
        AND (
          ra.student_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.class_members cm
            WHERE cm.class_id = ra.class_id AND cm.student_id = auth.uid()
          )
        )
      )
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all riddles"
  ON public.riddles
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ===== RIDDLE ASSIGNMENTS POLICIES =====

-- Teachers can view assignments for their riddles
CREATE POLICY "Teachers can view assignments for their riddles"
  ON public.riddle_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.riddles r
      WHERE r.id = riddle_assignments.riddle_id
      AND r.created_by = auth.uid()
    )
  );

-- Teachers can create assignments for their own riddles
CREATE POLICY "Teachers can create assignments for their riddles"
  ON public.riddle_assignments
  FOR INSERT
  WITH CHECK (
    assigned_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.riddles r
      WHERE r.id = riddle_assignments.riddle_id
      AND r.created_by = auth.uid()
    )
    AND (
      class_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = riddle_assignments.class_id
        AND c.teacher_id = auth.uid()
      )
    )
    AND (
      student_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.class_members cm
        JOIN public.classes c ON c.id = cm.class_id
        WHERE cm.student_id = riddle_assignments.student_id
        AND c.teacher_id = auth.uid()
      )
    )
  );

-- Teachers can delete assignments for their riddles
CREATE POLICY "Teachers can delete assignments for their riddles"
  ON public.riddle_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.riddles r
      WHERE r.id = riddle_assignments.riddle_id
      AND r.created_by = auth.uid()
    )
  );

-- Students can view their own assignments
CREATE POLICY "Students can view own assignments"
  ON public.riddle_assignments
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = riddle_assignments.class_id
      AND cm.student_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all riddle assignments"
  ON public.riddle_assignments
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ===== RIDDLE OF THE DAY POLICIES =====

-- Everyone can view riddle of the day
CREATE POLICY "Everyone can view riddle of the day"
  ON public.riddle_of_the_day
  FOR SELECT
  USING (true);

-- Teachers and admins can set riddle of the day
CREATE POLICY "Teachers and admins can set riddle of the day"
  ON public.riddle_of_the_day
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
    AND selected_by = auth.uid()
  );

-- Teachers and admins can update riddle of the day
CREATE POLICY "Teachers and admins can update riddle of the day"
  ON public.riddle_of_the_day
  FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin'));

-- Admins can delete riddle of the day
CREATE POLICY "Admins can delete riddle of the day"
  ON public.riddle_of_the_day
  FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ===== RIDDLE ATTEMPTS POLICIES =====

-- Students can view their own attempts
CREATE POLICY "Students can view own attempts"
  ON public.riddle_attempts
  FOR SELECT
  USING (student_id = auth.uid());

-- Students can create their own attempts
CREATE POLICY "Students can create own attempts"
  ON public.riddle_attempts
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

-- Teachers can view attempts for their students
CREATE POLICY "Teachers can view student attempts"
  ON public.riddle_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.student_id = riddle_attempts.student_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Teachers can update attempts (for manual validation)
CREATE POLICY "Teachers can validate attempts"
  ON public.riddle_attempts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.student_id = riddle_attempts.student_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all attempts"
  ON public.riddle_attempts
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ===========================================================================
-- TRIGGERS
-- ===========================================================================

-- Update updated_at timestamp on riddles
CREATE OR REPLACE FUNCTION public.update_riddles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_riddles_updated_at
  BEFORE UPDATE ON public.riddles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_riddles_updated_at();

-- ===========================================================================
-- GRANT PERMISSIONS
-- ===========================================================================

-- Grant access to authenticated users
GRANT SELECT ON public.riddles TO authenticated;
GRANT SELECT ON public.riddle_assignments TO authenticated;
GRANT SELECT ON public.riddle_of_the_day TO authenticated;
GRANT SELECT ON public.riddle_attempts TO authenticated;
GRANT SELECT ON public.riddle_stats TO authenticated;
GRANT SELECT ON public.riddle_progress TO authenticated;
GRANT SELECT ON public.riddle_student_history TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_next_riddle_attempt_number TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_riddle_gidouilles TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_riddle_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_riddle_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_riddle_of_the_day TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_riddle_of_the_day TO authenticated;
