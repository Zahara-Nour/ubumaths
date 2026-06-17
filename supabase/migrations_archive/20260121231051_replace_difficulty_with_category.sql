-- Migration: Replace difficulty with category for exercises
-- Description: Replaces the numeric difficulty (1-3) with a text category field
-- Categories: automatisme, application, adaptation, recherche, tache_complexe,
--             situation_probleme, challenge, mission, synthese

-- Step 1: Add category column (nullable initially for migration)
ALTER TABLE public.exercises ADD COLUMN category TEXT;

-- Step 2: Migrate existing data (all to 'application', manual reclassification later)
UPDATE public.exercises SET category = 'application';

-- Step 3: Make NOT NULL and add constraint
ALTER TABLE public.exercises ALTER COLUMN category SET NOT NULL;
ALTER TABLE public.exercises ADD CONSTRAINT exercises_category_check
  CHECK (category IN ('automatisme', 'application', 'adaptation', 'recherche',
                      'tache_complexe', 'situation_probleme', 'challenge', 'mission', 'synthese'));

-- Step 4: Drop old difficulty column and index
DROP INDEX IF EXISTS idx_exercises_difficulty;
ALTER TABLE public.exercises DROP COLUMN difficulty;

-- Step 5: Create new index on category
CREATE INDEX idx_exercises_category ON public.exercises(category);

-- Add comment for documentation
COMMENT ON COLUMN public.exercises.category IS 'Exercise category: automatisme, application, adaptation, recherche, tache_complexe, situation_probleme, challenge, mission, synthese';
