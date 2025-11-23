-- Migration: Worksheets and Assessments Feature
-- Description: Complete schema for creating, managing, and distributing worksheets/assessments
-- with individualized student variants, correction sheets, and PDF generation support
-- Date: 2025-01-23

-- ============================================================================
-- 1. WORKSHEET TEMPLATES TABLE
-- ============================================================================
-- Reusable Typst templates for PDF generation
CREATE TABLE IF NOT EXISTS public.worksheet_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL, -- Typst template code
  placeholders JSONB DEFAULT '[]'::JSONB, -- Array of placeholder definitions
  is_public BOOLEAN DEFAULT false, -- Public templates available to all teachers
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT worksheet_templates_name_check CHECK (char_length(name) BETWEEN 1 AND 255),
  CONSTRAINT worksheet_templates_content_check CHECK (char_length(template_content) > 0)
);

-- Enable RLS
ALTER TABLE public.worksheet_templates ENABLE ROW LEVEL SECURITY;

-- Indexes for worksheet_templates
CREATE INDEX idx_worksheet_templates_created_by ON public.worksheet_templates(created_by);
CREATE INDEX idx_worksheet_templates_is_public ON public.worksheet_templates(is_public) WHERE is_public = true;

-- Comments
COMMENT ON TABLE public.worksheet_templates IS 'Reusable Typst templates for worksheet PDF generation';
COMMENT ON COLUMN public.worksheet_templates.template_content IS 'Typst template code with placeholders like {{title}}, {{exercises}}';
COMMENT ON COLUMN public.worksheet_templates.placeholders IS 'JSON array defining available placeholders and their types';

-- ============================================================================
-- 2. WORKSHEETS TABLE
-- ============================================================================
-- Main table for worksheets and assessments
CREATE TABLE IF NOT EXISTS public.worksheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'worksheet',

  -- Configuration
  config JSONB DEFAULT '{}'::JSONB,
  /* config structure:
    {
      "show_title": true,
      "show_date": true,
      "show_student_name": true,
      "show_class": true,
      "show_points": true,
      "numbering_style": "numeric", // numeric, alphabetic, roman
      "shuffle_exercises": false,
      "shuffle_within_sections": false,
      "page_layout": "A4",
      "font_size": 12,
      "margins": { "top": 20, "bottom": 20, "left": 15, "right": 15 }
    }
  */

  -- Status and versioning
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Template reference (optional)
  template_id UUID REFERENCES public.worksheet_templates(id) ON DELETE SET NULL,

  -- Metadata
  estimated_duration_minutes INTEGER,
  total_points NUMERIC(10, 2),
  grade_levels INTEGER[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',

  -- Ownership and tracking
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT worksheets_title_check CHECK (char_length(title) BETWEEN 1 AND 255),
  CONSTRAINT worksheets_type_check CHECK (type IN ('worksheet', 'assessment', 'exam', 'quiz', 'homework')),
  CONSTRAINT worksheets_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT worksheets_duration_check CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0),
  CONSTRAINT worksheets_points_check CHECK (total_points IS NULL OR total_points >= 0),
  CONSTRAINT worksheets_version_check CHECK (version > 0)
);

-- Enable RLS
ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;

-- Indexes for worksheets
CREATE INDEX idx_worksheets_created_by ON public.worksheets(created_by);
CREATE INDEX idx_worksheets_status ON public.worksheets(status);
CREATE INDEX idx_worksheets_type ON public.worksheets(type);
CREATE INDEX idx_worksheets_school_id ON public.worksheets(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX idx_worksheets_template_id ON public.worksheets(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX idx_worksheets_created_at ON public.worksheets(created_at DESC);
CREATE INDEX idx_worksheets_grade_levels ON public.worksheets USING GIN(grade_levels);
CREATE INDEX idx_worksheets_tags ON public.worksheets USING GIN(tags);
-- Full-text search index
CREATE INDEX idx_worksheets_search ON public.worksheets
  USING gin(to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Comments
COMMENT ON TABLE public.worksheets IS 'Main table for worksheets, assessments, and exams';
COMMENT ON COLUMN public.worksheets.config IS 'JSON configuration for display and layout options';
COMMENT ON COLUMN public.worksheets.grade_levels IS 'Array of grade levels this worksheet targets';

-- ============================================================================
-- 3. WORKSHEET SECTIONS TABLE
-- ============================================================================
-- Optional sections to organize exercises within a worksheet
CREATE TABLE IF NOT EXISTS public.worksheet_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worksheet_id UUID NOT NULL REFERENCES public.worksheets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT,
  position INTEGER NOT NULL,
  points_total NUMERIC(10, 2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT worksheet_sections_title_check CHECK (char_length(title) BETWEEN 1 AND 255),
  CONSTRAINT worksheet_sections_position_check CHECK (position >= 0),
  CONSTRAINT worksheet_sections_points_check CHECK (points_total IS NULL OR points_total >= 0),
  -- Ensure unique position within worksheet
  CONSTRAINT worksheet_sections_unique_position UNIQUE (worksheet_id, position)
);

-- Enable RLS
ALTER TABLE public.worksheet_sections ENABLE ROW LEVEL SECURITY;

-- Indexes for worksheet_sections (composite index serves both queries)
CREATE INDEX idx_worksheet_sections_position ON public.worksheet_sections(worksheet_id, position);

-- Comments
COMMENT ON TABLE public.worksheet_sections IS 'Optional sections to group and organize exercises within a worksheet';
COMMENT ON COLUMN public.worksheet_sections.position IS 'Order of section within worksheet (0-based)';

-- ============================================================================
-- 4. WORKSHEET EXERCISES TABLE
-- ============================================================================
-- Junction table linking exercises to worksheets with configuration
CREATE TABLE IF NOT EXISTS public.worksheet_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worksheet_id UUID NOT NULL REFERENCES public.worksheets(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.worksheet_sections(id) ON DELETE SET NULL,

  -- Ordering
  position INTEGER NOT NULL,

  -- Scoring
  points NUMERIC(10, 2),

  -- Variant configuration
  variant_mode TEXT DEFAULT 'none',
  variant_config JSONB DEFAULT '{}'::JSONB,
  /* variant_config structure:
    {
      "mode": "individual", // none, individual, n_versions, group
      "n_versions": 3, // if mode is n_versions
      "group_size": 4, // if mode is group
      "seed_base": 12345, // for reproducible random generation
      "parameter_overrides": {} // force specific parameter values
    }
  */

  -- Custom instructions for this specific inclusion
  custom_instructions TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT worksheet_exercises_position_check CHECK (position >= 0),
  CONSTRAINT worksheet_exercises_points_check CHECK (points IS NULL OR points >= 0),
  CONSTRAINT worksheet_exercises_variant_mode_check CHECK (variant_mode IN ('none', 'individual', 'n_versions', 'group'))
);

-- Enable RLS
ALTER TABLE public.worksheet_exercises ENABLE ROW LEVEL SECURITY;

-- Indexes for worksheet_exercises
CREATE INDEX idx_worksheet_exercises_worksheet_id ON public.worksheet_exercises(worksheet_id);
CREATE INDEX idx_worksheet_exercises_exercise_id ON public.worksheet_exercises(exercise_id);
CREATE INDEX idx_worksheet_exercises_section_id ON public.worksheet_exercises(section_id) WHERE section_id IS NOT NULL;
CREATE INDEX idx_worksheet_exercises_position ON public.worksheet_exercises(worksheet_id, position);
-- Unique constraint on position within worksheet/section (using index because COALESCE not allowed in UNIQUE constraint)
CREATE UNIQUE INDEX idx_worksheet_exercises_unique_position
  ON public.worksheet_exercises(worksheet_id, COALESCE(section_id, '00000000-0000-0000-0000-000000000000'::UUID), position);

-- Comments
COMMENT ON TABLE public.worksheet_exercises IS 'Links exercises to worksheets with order, points, and variant configuration';
COMMENT ON COLUMN public.worksheet_exercises.variant_mode IS 'How to generate variants: none (same for all), individual (unique per student), n_versions (limited variants), group (shared by groups)';
COMMENT ON COLUMN public.worksheet_exercises.variant_config IS 'JSON configuration for variant generation including seeds and overrides';

-- ============================================================================
-- 5. WORKSHEET INSTANCES TABLE
-- ============================================================================
-- Generated worksheet instances for specific students with resolved parameters
CREATE TABLE IF NOT EXISTS public.worksheet_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worksheet_id UUID NOT NULL REFERENCES public.worksheets(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Instance data with resolved parameters
  instance_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  /* instance_data structure:
    {
      "exercises": [
        {
          "exercise_id": "uuid",
          "position": 0,
          "parameters": { "a": 5, "b": 10 }, // resolved parameter values
          "statement": "Resolved statement with values",
          "solution": "Resolved solution with values"
        }
      ],
      "exercise_order": [0, 2, 1], // if shuffled
      "variant_info": {
        "seed": 12345,
        "version": "A", // if using n_versions mode
        "group_id": "group1" // if using group mode
      }
    }
  */

  -- Variant tracking
  variant_seed INTEGER NOT NULL,
  variant_version TEXT,

  -- Status tracking
  status TEXT DEFAULT 'generated',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,

  -- Performance tracking
  time_spent_seconds INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT worksheet_instances_seed_check CHECK (variant_seed >= 0),
  CONSTRAINT worksheet_instances_status_check CHECK (status IN ('generated', 'in_progress', 'submitted', 'graded')),
  CONSTRAINT worksheet_instances_time_check CHECK (time_spent_seconds >= 0),
  -- Ensure one instance per student per worksheet
  CONSTRAINT worksheet_instances_unique_student UNIQUE (worksheet_id, student_id)
);

-- Enable RLS
ALTER TABLE public.worksheet_instances ENABLE ROW LEVEL SECURITY;

-- Indexes for worksheet_instances
CREATE INDEX idx_worksheet_instances_worksheet_id ON public.worksheet_instances(worksheet_id);
CREATE INDEX idx_worksheet_instances_student_id ON public.worksheet_instances(student_id);
CREATE INDEX idx_worksheet_instances_status ON public.worksheet_instances(status);
CREATE INDEX idx_worksheet_instances_generated_at ON public.worksheet_instances(generated_at DESC);
CREATE INDEX idx_worksheet_instances_variant_version ON public.worksheet_instances(variant_version) WHERE variant_version IS NOT NULL;

-- Comments
COMMENT ON TABLE public.worksheet_instances IS 'Generated worksheet instances for individual students with resolved parameter values';
COMMENT ON COLUMN public.worksheet_instances.instance_data IS 'Complete instance data with resolved exercises, parameters, and ordering';
COMMENT ON COLUMN public.worksheet_instances.variant_seed IS 'Seed used for reproducible random parameter generation';

-- ============================================================================
-- 6. WORKSHEET ASSIGNMENTS TABLE
-- ============================================================================
-- Assigns worksheets to classes or individual students
CREATE TABLE IF NOT EXISTS public.worksheet_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worksheet_id UUID NOT NULL REFERENCES public.worksheets(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,

  -- Assignment configuration
  title TEXT, -- Override worksheet title for this assignment
  instructions TEXT,

  -- Individualization
  individualized BOOLEAN DEFAULT true, -- Generate unique instances per student

  -- Timing
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  available_from TIMESTAMPTZ DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ, -- Hard deadline, no submissions after

  -- Correction/solutions
  correction_release_mode TEXT DEFAULT 'manual',
  correction_release_at TIMESTAMPTZ,
  show_solutions_before_due BOOLEAN DEFAULT false,

  -- Settings
  allow_late_submission BOOLEAN DEFAULT true,
  max_attempts INTEGER DEFAULT 1,
  time_limit_minutes INTEGER,

  -- Status
  status TEXT DEFAULT 'draft',

  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT worksheet_assignments_attempts_check CHECK (max_attempts > 0),
  CONSTRAINT worksheet_assignments_time_limit_check CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
  CONSTRAINT worksheet_assignments_release_mode_check CHECK (correction_release_mode IN ('manual', 'immediate', 'scheduled', 'after_due')),
  CONSTRAINT worksheet_assignments_status_check CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  CONSTRAINT worksheet_assignments_dates_check CHECK (
    (due_at IS NULL OR available_from <= due_at) AND
    (closes_at IS NULL OR due_at IS NULL OR due_at <= closes_at)
  )
);

-- Enable RLS
ALTER TABLE public.worksheet_assignments ENABLE ROW LEVEL SECURITY;

-- Indexes for worksheet_assignments
CREATE INDEX idx_worksheet_assignments_worksheet_id ON public.worksheet_assignments(worksheet_id);
CREATE INDEX idx_worksheet_assignments_class_id ON public.worksheet_assignments(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_worksheet_assignments_created_by ON public.worksheet_assignments(created_by);
CREATE INDEX idx_worksheet_assignments_status ON public.worksheet_assignments(status);
CREATE INDEX idx_worksheet_assignments_due_at ON public.worksheet_assignments(due_at) WHERE due_at IS NOT NULL;

-- Comments
COMMENT ON TABLE public.worksheet_assignments IS 'Assigns worksheets to classes with timing and correction settings';
COMMENT ON COLUMN public.worksheet_assignments.correction_release_mode IS 'When to release corrections: manual, immediate, scheduled, after_due';
COMMENT ON COLUMN public.worksheet_assignments.individualized IS 'Whether to generate unique parameter values per student';

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Note: update_updated_at_column() function already exists from 001_initial_schema.sql

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_worksheet_templates_updated_at
  BEFORE UPDATE ON public.worksheet_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worksheets_updated_at
  BEFORE UPDATE ON public.worksheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worksheet_sections_updated_at
  BEFORE UPDATE ON public.worksheet_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worksheet_exercises_updated_at
  BEFORE UPDATE ON public.worksheet_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worksheet_instances_updated_at
  BEFORE UPDATE ON public.worksheet_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worksheet_assignments_updated_at
  BEFORE UPDATE ON public.worksheet_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECURITY: Prevent instance tampering by students
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_worksheet_instance_tampering()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow modification of specific fields by students
  -- Critical fields must remain unchanged
  IF OLD.instance_data IS DISTINCT FROM NEW.instance_data THEN
    RAISE EXCEPTION 'Cannot modify instance_data after generation';
  END IF;
  IF OLD.variant_seed IS DISTINCT FROM NEW.variant_seed THEN
    RAISE EXCEPTION 'Cannot modify variant_seed';
  END IF;
  IF OLD.worksheet_id IS DISTINCT FROM NEW.worksheet_id THEN
    RAISE EXCEPTION 'Cannot modify worksheet_id';
  END IF;
  IF OLD.student_id IS DISTINCT FROM NEW.student_id THEN
    RAISE EXCEPTION 'Cannot modify student_id';
  END IF;
  -- Allow legitimate updates: status, time_spent_seconds, accessed_at, submitted_at, updated_at
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_instance_tampering
  BEFORE UPDATE ON public.worksheet_instances
  FOR EACH ROW
  WHEN (
    -- Only apply to students (non-owners of the worksheet)
    NOT EXISTS (
      SELECT 1 FROM public.worksheets
      WHERE id = OLD.worksheet_id
      AND created_by = auth.uid()
    )
  )
  EXECUTE FUNCTION prevent_worksheet_instance_tampering();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- ============================================================================
-- WORKSHEET TEMPLATES POLICIES
-- ============================================================================

-- Users can view public templates or their own templates (admins see all)
CREATE POLICY "Users can view templates"
  ON public.worksheet_templates
  FOR SELECT
  TO authenticated
  USING (
    is_public = true OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Teachers and admins can create templates
CREATE POLICY "Teachers can create templates"
  ON public.worksheet_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    ) AND created_by = auth.uid()
  );

-- Users can update their own templates (admins can update any)
CREATE POLICY "Users can update own templates"
  ON public.worksheet_templates
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can delete their own templates (admins can delete any)
CREATE POLICY "Users can delete own templates"
  ON public.worksheet_templates
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- WORKSHEETS POLICIES
-- ============================================================================

-- Teachers can view their own worksheets, admins can view all
-- Teachers in same school can view published worksheets
CREATE POLICY "Users can view worksheets"
  ON public.worksheets
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    -- Teachers in same school can view published worksheets
    (status = 'published' AND EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2
      WHERE p1.id = auth.uid()
      AND p2.id = worksheets.created_by
      AND p1.school_id = p2.school_id
      AND p1.school_id IS NOT NULL
      AND p1.role = 'teacher'
    ))
  );

-- Teachers and admins can create worksheets
CREATE POLICY "Teachers can create worksheets"
  ON public.worksheets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    ) AND created_by = auth.uid()
  );

-- Teachers can update their own worksheets (admins can update any)
CREATE POLICY "Users can update own worksheets"
  ON public.worksheets
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Teachers can delete their own draft worksheets (admins can delete any draft)
CREATE POLICY "Users can delete own draft worksheets"
  ON public.worksheets
  FOR DELETE
  TO authenticated
  USING (
    (created_by = auth.uid() AND status = 'draft') OR
    (status = 'draft' AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ))
  );

-- ============================================================================
-- WORKSHEET SECTIONS POLICIES
-- ============================================================================

-- Users can view sections of worksheets they can access
CREATE POLICY "Users can view worksheet sections"
  ON public.worksheet_sections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.worksheets
      WHERE id = worksheet_sections.worksheet_id
      AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        ) OR
        (status = 'published' AND EXISTS (
          SELECT 1 FROM public.profiles p1, public.profiles p2
          WHERE p1.id = auth.uid()
          AND p2.id = worksheets.created_by
          AND p1.school_id = p2.school_id
          AND p1.school_id IS NOT NULL
          AND p1.role = 'teacher'
        ))
      )
    )
  );

-- Teachers can manage sections of their own worksheets
CREATE POLICY "Teachers can manage own worksheet sections"
  ON public.worksheet_sections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.worksheets
      WHERE id = worksheet_sections.worksheet_id
      AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.worksheets
      WHERE id = worksheet_sections.worksheet_id
      AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- ============================================================================
-- WORKSHEET EXERCISES POLICIES
-- ============================================================================

-- Users can view exercises in worksheets they can access
CREATE POLICY "Users can view worksheet exercises"
  ON public.worksheet_exercises
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.worksheets
      WHERE id = worksheet_exercises.worksheet_id
      AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        ) OR
        (status = 'published' AND EXISTS (
          SELECT 1 FROM public.profiles p1, public.profiles p2
          WHERE p1.id = auth.uid()
          AND p2.id = worksheets.created_by
          AND p1.school_id = p2.school_id
          AND p1.school_id IS NOT NULL
          AND p1.role = 'teacher'
        ))
      )
    )
  );

-- Teachers can manage exercises in their own worksheets
CREATE POLICY "Teachers can manage own worksheet exercises"
  ON public.worksheet_exercises
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.worksheets
      WHERE id = worksheet_exercises.worksheet_id
      AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.worksheets
      WHERE id = worksheet_exercises.worksheet_id
      AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- ============================================================================
-- WORKSHEET INSTANCES POLICIES
-- ============================================================================

-- Students can view their own instances
CREATE POLICY "Students can view own instances"
  ON public.worksheet_instances
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Teachers can view instances of their worksheets (admins can view all)
CREATE POLICY "Teachers can view worksheet instances"
  ON public.worksheet_instances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.worksheets
      WHERE id = worksheet_instances.worksheet_id
      AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Teachers can create instances for their worksheets
CREATE POLICY "Teachers can create instances"
  ON public.worksheet_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.worksheets
      WHERE id = worksheet_instances.worksheet_id
      AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- Students can update their own instances (limited fields via trigger)
-- Teachers can update any instance of their worksheets
CREATE POLICY "Users can update instances"
  ON public.worksheet_instances
  FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.worksheets
      WHERE id = worksheet_instances.worksheet_id
      AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.worksheets
      WHERE id = worksheet_instances.worksheet_id
      AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Teachers can delete instances of their worksheets
CREATE POLICY "Teachers can delete instances"
  ON public.worksheet_instances
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.worksheets
      WHERE id = worksheet_instances.worksheet_id
      AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- WORKSHEET ASSIGNMENTS POLICIES
-- ============================================================================

-- Teachers can view their own assignments (admins can view all)
CREATE POLICY "Teachers can view own assignments"
  ON public.worksheet_assignments
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Students can view assignments for their classes (active classes only)
CREATE POLICY "Students can view class assignments"
  ON public.worksheet_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.class_id = worksheet_assignments.class_id
      AND cm.student_id = auth.uid()
      AND c.archived = FALSE
    )
  );

-- Teachers and admins can create assignments
CREATE POLICY "Teachers can create assignments"
  ON public.worksheet_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    ) AND created_by = auth.uid()
  );

-- Teachers can update their own assignments (admins can update any)
CREATE POLICY "Users can update own assignments"
  ON public.worksheet_assignments
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Teachers can delete their own draft assignments (admins can delete any draft)
CREATE POLICY "Users can delete own draft assignments"
  ON public.worksheet_assignments
  FOR DELETE
  TO authenticated
  USING (
    (created_by = auth.uid() AND status = 'draft') OR
    (status = 'draft' AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ))
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate total points for a worksheet
CREATE OR REPLACE FUNCTION calculate_worksheet_total_points(p_worksheet_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(points)
     FROM public.worksheet_exercises
     WHERE worksheet_exercises.worksheet_id = p_worksheet_id),
    0
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to generate a unique variant seed
CREATE OR REPLACE FUNCTION generate_variant_seed(
  p_worksheet_id UUID,
  p_student_id UUID,
  p_base_seed INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  seed_value INTEGER;
BEGIN
  IF p_base_seed IS NOT NULL THEN
    -- Use provided base seed with student-specific offset
    seed_value := p_base_seed + hashtext(p_student_id::TEXT) % 10000;
  ELSE
    -- Generate unique seed based on worksheet and student IDs
    seed_value := abs(hashtext(p_worksheet_id::TEXT || p_student_id::TEXT));
  END IF;

  RETURN seed_value % 2147483647; -- Ensure positive integer within PostgreSQL integer range
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on all tables to authenticated users (RLS will control access)
GRANT ALL ON public.worksheet_templates TO authenticated;
GRANT ALL ON public.worksheets TO authenticated;
GRANT ALL ON public.worksheet_sections TO authenticated;
GRANT ALL ON public.worksheet_exercises TO authenticated;
GRANT ALL ON public.worksheet_instances TO authenticated;
GRANT ALL ON public.worksheet_assignments TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION calculate_worksheet_total_points TO authenticated;
GRANT EXECUTE ON FUNCTION generate_variant_seed TO authenticated;
GRANT EXECUTE ON FUNCTION prevent_worksheet_instance_tampering TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
