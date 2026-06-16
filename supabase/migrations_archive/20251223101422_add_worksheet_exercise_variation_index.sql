-- Migration: Add variation_index to worksheet_exercises
-- Purpose: Allow teachers to optionally force a specific variation for an exercise
--
-- When NULL: variation is selected based on seed (current behavior)
-- When set: forces the specific variation index (0-based) from the exercise's variations array
--
-- Example: If an exercise has variations ["guided", "intermediate", "autonomous"],
--          setting variation_index = 0 forces "guided" for all students

-- Add the variation_index column
ALTER TABLE public.worksheet_exercises
ADD COLUMN IF NOT EXISTS variation_index INTEGER DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN public.worksheet_exercises.variation_index IS
  'Optional: Force a specific variation index (0-based). NULL = seed-based selection.';

-- Add a check constraint to ensure non-negative values
ALTER TABLE public.worksheet_exercises
ADD CONSTRAINT worksheet_exercises_variation_index_non_negative
CHECK (variation_index IS NULL OR variation_index >= 0);
