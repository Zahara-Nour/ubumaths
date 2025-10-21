-- Migration: Add exercise_instruction field to question templates
-- Description: Adds optional exercise instruction that serves as a shared prompt for all variations.
--              When generating worksheets, this instruction becomes the exercise title instead of
--              being repeated in each question.

-- Add exercise_instruction column (nullable, default NULL)
ALTER TABLE question_templates
ADD COLUMN exercise_instruction TEXT DEFAULT NULL;

-- Add comment to document the column's purpose
COMMENT ON COLUMN question_templates.exercise_instruction IS 'Optional shared instruction for all variations (e.g., "Calculer", "Résoudre"). In normal display: shown before statement. In worksheets: used as exercise title.';
