/**
 * Migration: Create Question Templates Table
 * ==========================================
 *
 * Creates the question_templates table for storing mathematical question templates
 * with full support for:
 * - Multiple question types (numerical, algebraic, QCM, fill-in-blanks)
 * - Variable definitions with random generation
 * - Precision specifications for numerical answers
 * - Validation options and metadata
 *
 * IMPORTANT: Templates are stored in database, instances are generated on-demand as JSON
 */

-- ============================================================================
-- CREATE QUESTION TEMPLATES TABLE
-- ============================================================================

CREATE TABLE question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Question Type
  type TEXT NOT NULL CHECK (type IN (
    'numerical_exact',
    'numerical_decimal',
    'numerical_rounded',
    'algebraic_transform',
    'fill_in_blanks',
    'multiple_choice'
  )),

  -- Core Content (JSONB)
  statement JSONB NOT NULL,           -- ContentField[] - Question statement
  variables JSONB,                    -- QuestionVariable[] - Variables in declaration order
  answer JSONB NOT NULL,              -- string | string[] - Expected answer(s)

  -- Validation & Precision
  options JSONB,                      -- { allowEquivalent, allowDifferentForms, ... }
  precision JSONB,                    -- PrecisionType - For numerical questions

  -- Metadata
  grades TEXT[] NOT NULL,             -- GradeLevel[] - Applicable grade levels
  delay INTEGER,                      -- Seconds - Time limit (optional)
  correction JSONB,                   -- ContentField[] - Detailed correction (optional)

  -- Type-specific Fields
  transform_type TEXT CHECK (transform_type IN ('factor', 'expand', 'simplify', 'solve')),
  blanks JSONB,                       -- { position, expectedAnswer }[] - For fill_in_blanks
  choices JSONB,                      -- { content, isCorrect }[] - For multiple_choice
  multiple_answers BOOLEAN,           -- For multiple_choice - Allow multiple correct

  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_transform_type CHECK (
    (type = 'algebraic_transform' AND transform_type IS NOT NULL)
    OR (type != 'algebraic_transform')
  ),
  CONSTRAINT valid_choices CHECK (
    (type = 'multiple_choice' AND choices IS NOT NULL)
    OR (type != 'multiple_choice')
  ),
  CONSTRAINT valid_blanks CHECK (
    (type = 'fill_in_blanks' AND blanks IS NOT NULL)
    OR (type != 'fill_in_blanks')
  )
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Type-based queries (filter by question type)
CREATE INDEX idx_question_templates_type ON question_templates(type);

-- Grade-based queries (find questions for specific grade)
CREATE INDEX idx_question_templates_grades ON question_templates USING GIN(grades);

-- Author queries (find templates by creator)
CREATE INDEX idx_question_templates_created_by ON question_templates(created_by);

-- Recent templates (order by creation date)
CREATE INDEX idx_question_templates_created_at ON question_templates(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE question_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage question templates" ON question_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Teachers can view all templates
CREATE POLICY "Teachers can view question templates" ON question_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- ============================================================================
-- TRIGGER: AUTO-UPDATE updated_at
-- ============================================================================

CREATE TRIGGER update_question_templates_updated_at
  BEFORE UPDATE ON question_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE question_templates IS
  'Question templates for mathematical questions with variable support and random generation';

COMMENT ON COLUMN question_templates.type IS
  'Type of question: numerical_exact, numerical_decimal, numerical_rounded, algebraic_transform, fill_in_blanks, multiple_choice';

COMMENT ON COLUMN question_templates.statement IS
  'Question statement as ContentField[] (text or image)';

COMMENT ON COLUMN question_templates.variables IS
  'Variable definitions with support for {@:}, {#:}, {eval:} syntax';

COMMENT ON COLUMN question_templates.answer IS
  'Expected answer(s) - can contain variable references and special syntax';

COMMENT ON COLUMN question_templates.options IS
  'Validation options: allowEquivalent, allowDifferentForms, validator, etc.';

COMMENT ON COLUMN question_templates.precision IS
  'Precision specification for numerical answers: none, decimal, significant, magnitude, tolerance';

COMMENT ON COLUMN question_templates.grades IS
  'Applicable grade levels (CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, SPE_1, SPE_T, T_EXP, T_COMP, STMG)';

COMMENT ON COLUMN question_templates.delay IS
  'Time limit in seconds (optional)';

COMMENT ON COLUMN question_templates.correction IS
  'Detailed correction/explanation as ContentField[] (optional)';
