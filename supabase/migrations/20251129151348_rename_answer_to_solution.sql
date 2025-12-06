/**
 * Migration: Rename answer to solution in question_templates
 * ==========================================================
 *
 * Renames the 'answer' field to 'solution' in question_templates table
 * and within JSONB variations. This improves clarity:
 * - 'solution' = expected answer defined in template
 * - 'answer' = student's submitted response (used elsewhere)
 *
 * Affects:
 * - question_templates.answer column -> question_templates.solution (if exists)
 * - JSONB 'answer' key in variations -> 'solution'
 */

-- ============================================================================
-- STEP 1: Rename the main column
-- ============================================================================

-- Note: The 'answer' column was removed in migration 074_add_template_variations.sql
-- It now lives inside the 'variations' JSONB array and 'shared' JSONB object
-- Check if column exists first (for safety)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'question_templates' AND column_name = 'answer'
    ) THEN
        ALTER TABLE question_templates RENAME COLUMN answer TO solution;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Update JSONB keys in variations array
-- ============================================================================

-- Rename 'answer' to 'solution' in each variation object
UPDATE question_templates
SET variations = (
    SELECT jsonb_agg(
        CASE
            WHEN variation ? 'answer' THEN
                (variation - 'answer') || jsonb_build_object('solution', variation->'answer')
            ELSE
                variation
        END
    )
    FROM jsonb_array_elements(variations) AS variation
)
WHERE variations IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(variations) AS v WHERE v ? 'answer'
  );

-- ============================================================================
-- STEP 3: Update comments
-- ============================================================================

-- Update comment if the column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'question_templates' AND column_name = 'solution'
    ) THEN
        COMMENT ON COLUMN question_templates.solution IS
            'Expected solution(s) - can contain variable references and special syntax. Renamed from "answer" for clarity (solution = expected, answer = student response)';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Log migration success
DO $$
DECLARE
    variations_with_answer INTEGER;
    variations_with_solution INTEGER;
BEGIN
    -- Count remaining 'answer' keys (should be 0)
    SELECT COUNT(*) INTO variations_with_answer
    FROM question_templates, jsonb_array_elements(variations) AS v
    WHERE v ? 'answer';

    -- Count 'solution' keys (should match total variations)
    SELECT COUNT(*) INTO variations_with_solution
    FROM question_templates, jsonb_array_elements(variations) AS v
    WHERE v ? 'solution';

    RAISE NOTICE 'Migration complete: % variations with answer (should be 0), % variations with solution',
        variations_with_answer, variations_with_solution;
END $$;
