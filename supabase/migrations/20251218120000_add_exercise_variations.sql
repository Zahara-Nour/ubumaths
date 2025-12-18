-- ============================================================================
-- Migration: Add Exercise Variations System
-- Created: 2025-12-18
-- Description: Adds variations support to exercises table, enabling multiple
--              variants of the same exercise with different content while
--              sharing common metadata.
-- ============================================================================
--
-- This migration introduces:
-- 1. `variations` column: JSONB array of ExerciseVariation objects
-- 2. `shared` column: JSONB object with shared exercise defaults
-- 3. Data migration: Converts existing exercises to single-variation format
-- 4. Helper function: exercise_variation_count(uuid)
--
-- The legacy columns (statement_md, solution_md, variables) are kept for
-- backward compatibility during the transition period.
-- ============================================================================

-- ============================================================================
-- COLUMN ADDITIONS
-- ============================================================================

-- Add variations column to store array of exercise variants
ALTER TABLE public.exercises
ADD COLUMN IF NOT EXISTS variations JSONB;

-- Add shared column to store common defaults across variations
ALTER TABLE public.exercises
ADD COLUMN IF NOT EXISTS shared JSONB;

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Ensure variations is a JSON array when not null
-- Using DO block to make constraint creation idempotent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'exercises_variations_is_array'
        AND conrelid = 'public.exercises'::regclass
    ) THEN
        ALTER TABLE public.exercises
        ADD CONSTRAINT exercises_variations_is_array
        CHECK (variations IS NULL OR jsonb_typeof(variations) = 'array');
    END IF;
END $$;

-- Ensure shared is a JSON object when not null
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'exercises_shared_is_object'
        AND conrelid = 'public.exercises'::regclass
    ) THEN
        ALTER TABLE public.exercises
        ADD CONSTRAINT exercises_shared_is_object
        CHECK (shared IS NULL OR jsonb_typeof(shared) = 'object');
    END IF;
END $$;

-- ============================================================================
-- DATA MIGRATION
-- ============================================================================

-- Migrate existing exercises to single-variation format
-- This converts statement_md, solution_md, and variables into a variation
UPDATE public.exercises
SET variations = jsonb_build_array(
    jsonb_strip_nulls(
        jsonb_build_object(
            'label', 'default',
            'statement_md', statement_md,
            'solution_md', solution_md,
            'variables', CASE
                WHEN variables IS NOT NULL
                     AND variables != '[]'::jsonb
                     AND variables != 'null'::jsonb
                THEN variables
                ELSE NULL
            END,
            'hints', NULL
        )
    )
)
WHERE variations IS NULL
  AND statement_md IS NOT NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for filtering exercises with multiple variations
-- This partial index only includes exercises that have more than one variation
CREATE INDEX IF NOT EXISTS idx_exercises_has_variations
ON public.exercises ((jsonb_array_length(variations)))
WHERE variations IS NOT NULL AND jsonb_array_length(variations) > 1;

-- Index for efficient variation count queries
CREATE INDEX IF NOT EXISTS idx_exercises_variation_count
ON public.exercises ((jsonb_array_length(COALESCE(variations, '[]'::jsonb))))
WHERE variations IS NOT NULL;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get the number of variations for an exercise
CREATE OR REPLACE FUNCTION public.exercise_variation_count(exercise_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(jsonb_array_length(variations), 0)
    FROM public.exercises
    WHERE id = exercise_id;
$$;

-- Function to check if an exercise has multiple variations
CREATE OR REPLACE FUNCTION public.exercise_has_multiple_variations(exercise_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(jsonb_array_length(variations), 0) > 1
    FROM public.exercises
    WHERE id = exercise_id;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.exercises.variations IS
'JSONB array of exercise variations. Each variation contains:
- label: string (unique identifier, e.g., "default", "variant_a")
- statement_md: string (exercise statement in markdown)
- solution_md: string (solution in markdown)
- variables: array (optional, variable definitions for parameterization)
- hints: array (optional, progressive hints)
One variation is selected when presenting the exercise.';

COMMENT ON COLUMN public.exercises.shared IS
'JSONB object with shared defaults applied to all variations:
- default_hints: array (hints shared across all variations)
- default_variables: array (common variable definitions)
- metadata: object (additional shared metadata)
Values in individual variations override these defaults.';

COMMENT ON CONSTRAINT exercises_variations_is_array ON public.exercises IS
'Ensures variations column contains a JSON array when not null';

COMMENT ON CONSTRAINT exercises_shared_is_object ON public.exercises IS
'Ensures shared column contains a JSON object when not null';

COMMENT ON FUNCTION public.exercise_variation_count(uuid) IS
'Returns the number of variations for a given exercise ID. Returns 0 if no variations exist.';

COMMENT ON FUNCTION public.exercise_has_multiple_variations(uuid) IS
'Returns true if the exercise has more than one variation.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_variations_exists boolean;
    v_shared_exists boolean;
    v_migrated_count integer;
BEGIN
    -- Verify columns exist
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'exercises'
        AND column_name = 'variations'
    ) INTO v_variations_exists;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'exercises'
        AND column_name = 'shared'
    ) INTO v_shared_exists;

    -- Count migrated exercises
    SELECT COUNT(*)
    INTO v_migrated_count
    FROM public.exercises
    WHERE variations IS NOT NULL;

    -- Validate
    IF NOT v_variations_exists THEN
        RAISE EXCEPTION 'Migration validation failed: variations column not created';
    END IF;

    IF NOT v_shared_exists THEN
        RAISE EXCEPTION 'Migration validation failed: shared column not created';
    END IF;

    RAISE NOTICE 'Migration validation successful!';
    RAISE NOTICE '  - variations column created';
    RAISE NOTICE '  - shared column created';
    RAISE NOTICE '  - % exercises migrated to variations format', v_migrated_count;
END $$;

-- ============================================================================
-- ROLLBACK SCRIPT (for reference, do not run automatically)
-- ============================================================================
/*
-- To rollback this migration, run the following:

-- Drop helper functions
DROP FUNCTION IF EXISTS public.exercise_variation_count(uuid);
DROP FUNCTION IF EXISTS public.exercise_has_multiple_variations(uuid);

-- Drop indexes
DROP INDEX IF EXISTS public.idx_exercises_has_variations;
DROP INDEX IF EXISTS public.idx_exercises_variation_count;

-- Drop constraints
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_variations_is_array;
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_shared_is_object;

-- Drop columns (WARNING: This will delete all variation data!)
ALTER TABLE public.exercises DROP COLUMN IF EXISTS variations;
ALTER TABLE public.exercises DROP COLUMN IF EXISTS shared;
*/
