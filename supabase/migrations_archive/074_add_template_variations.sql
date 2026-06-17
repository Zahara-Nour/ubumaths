-- Migration: Add Template Variations Support
-- ============================================
--
-- This migration refactors the question_templates table to support
-- multiple variations per template. Each variation contains its own
-- statement, variables, answer, correction, blanks, and choices.
--
-- Changes:
-- 1. Add `variations` JSONB column
-- 2. Migrate existing data to variations format
-- 3. Drop old columns (statement, variables, answer, correction, blanks, choices)
-- 4. Add constraints (at least 1 variation required)

-- Step 1: Add variations column (nullable for migration)
ALTER TABLE question_templates
ADD COLUMN variations JSONB;

-- Step 2: Migrate existing data to variations format
UPDATE question_templates
SET variations = jsonb_build_array(
  jsonb_build_object(
    'statement', statement,
    'variables', COALESCE(variables, '[]'::jsonb),
    'answer', answer,
    'correction', COALESCE(correction, '[]'::jsonb),
    'blanks', COALESCE(blanks, '[]'::jsonb),
    'choices', COALESCE(choices, '[]'::jsonb)
  )
)
WHERE variations IS NULL;

-- Step 3: Make variations NOT NULL and add constraint
ALTER TABLE question_templates
ALTER COLUMN variations SET NOT NULL;

-- Add constraint: at least 1 variation
ALTER TABLE question_templates
ADD CONSTRAINT variations_minimum_one CHECK (jsonb_array_length(variations) >= 1);

-- Step 4: Drop old columns (data already migrated to variations)
ALTER TABLE question_templates
DROP COLUMN statement,
DROP COLUMN variables,
DROP COLUMN answer,
DROP COLUMN correction,
DROP COLUMN blanks,
DROP COLUMN choices;

-- Add comment explaining the new structure
COMMENT ON COLUMN question_templates.variations IS
'Array of question variations (JSONB). Each variation contains: statement, variables, answer, correction, blanks (for fill_in_blanks), choices (for multiple_choice). One variation is randomly selected during instance generation.';
