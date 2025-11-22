-- ============================================================================
-- MIGRATION: Standardize Grade Values
-- ============================================================================
-- Description: Standardize all grade values across tables to use canonical GradeCode format
--
-- Canonical grade codes (from src/lib/types/grades.ts):
-- Primary: 'CP', 'CE1', 'CE2', 'CM1', 'CM2'
-- Middle: '6', '5', '4', '3'
-- High: '2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG'
--
-- Tables affected:
-- - profiles.grade (TEXT, nullable)
-- - assessments.grade (TEXT, NOT NULL)
-- - pending_students.grade (TEXT, nullable)
-- - question_templates.grades (TEXT[] array)
-- - exercises.grade_levels (TEXT[] array)
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Convert legacy grade string to canonical format
-- ============================================================================
-- This function handles all known legacy formats and returns the canonical code

CREATE OR REPLACE FUNCTION public.normalize_grade_value(input_grade TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Return NULL for NULL input
    IF input_grade IS NULL THEN
        RETURN NULL;
    END IF;

    -- Normalize to lowercase for comparison
    CASE lower(trim(input_grade))
        -- Already canonical (return as-is to preserve case)
        WHEN 'cp' THEN RETURN 'CP';
        WHEN 'ce1' THEN RETURN 'CE1';
        WHEN 'ce2' THEN RETURN 'CE2';
        WHEN 'cm1' THEN RETURN 'CM1';
        WHEN 'cm2' THEN RETURN 'CM2';
        WHEN '6' THEN RETURN '6';
        WHEN '5' THEN RETURN '5';
        WHEN '4' THEN RETURN '4';
        WHEN '3' THEN RETURN '3';
        WHEN '2' THEN RETURN '2';
        WHEN '1_gen' THEN RETURN '1_GEN';
        WHEN 't_gen' THEN RETURN 'T_GEN';
        WHEN '1_spe' THEN RETURN '1_SPE';
        WHEN 't_spe' THEN RETURN 'T_SPE';
        WHEN 't_exp' THEN RETURN 'T_EXP';
        WHEN 't_comp' THEN RETURN 'T_COMP';
        WHEN '1_stmg' THEN RETURN '1_STMG';
        WHEN 't_stmg' THEN RETURN 'T_STMG';

        -- Middle school variations (6ème, 6eme, 6e, etc.)
        WHEN '6ème' THEN RETURN '6';
        WHEN '6eme' THEN RETURN '6';
        WHEN '6e' THEN RETURN '6';
        WHEN 'sixième' THEN RETURN '6';
        WHEN 'sixieme' THEN RETURN '6';
        WHEN '5ème' THEN RETURN '5';
        WHEN '5eme' THEN RETURN '5';
        WHEN '5e' THEN RETURN '5';
        WHEN 'cinquième' THEN RETURN '5';
        WHEN 'cinquieme' THEN RETURN '5';
        WHEN '4ème' THEN RETURN '4';
        WHEN '4eme' THEN RETURN '4';
        WHEN '4e' THEN RETURN '4';
        WHEN 'quatrième' THEN RETURN '4';
        WHEN 'quatrieme' THEN RETURN '4';
        WHEN '3ème' THEN RETURN '3';
        WHEN '3eme' THEN RETURN '3';
        WHEN '3e' THEN RETURN '3';
        WHEN 'troisième' THEN RETURN '3';
        WHEN 'troisieme' THEN RETURN '3';

        -- High school variations
        -- Seconde
        WHEN '2nde' THEN RETURN '2';
        WHEN '2de' THEN RETURN '2';
        WHEN 'seconde' THEN RETURN '2';

        -- 1ère générale
        WHEN '1ère' THEN RETURN '1_GEN';
        WHEN '1ere' THEN RETURN '1_GEN';
        WHEN '1gen' THEN RETURN '1_GEN';
        WHEN '1ère générale' THEN RETURN '1_GEN';
        WHEN '1ere generale' THEN RETURN '1_GEN';
        WHEN '1ère g' THEN RETURN '1_GEN';
        WHEN 'première générale' THEN RETURN '1_GEN';
        WHEN 'premiere generale' THEN RETURN '1_GEN';
        WHEN 'première' THEN RETURN '1_GEN';
        WHEN 'premiere' THEN RETURN '1_GEN';

        -- 1ère spécialité maths
        WHEN 'spe_1' THEN RETURN '1_SPE';
        WHEN '1spe' THEN RETURN '1_SPE';
        WHEN '1ère spé' THEN RETURN '1_SPE';
        WHEN '1ere spe' THEN RETURN '1_SPE';
        WHEN '1ère spécialité' THEN RETURN '1_SPE';
        WHEN '1ere specialite' THEN RETURN '1_SPE';
        WHEN 'première spécialité maths' THEN RETURN '1_SPE';
        WHEN 'premiere specialite maths' THEN RETURN '1_SPE';

        -- 1ère STMG
        WHEN '1stmg' THEN RETURN '1_STMG';
        WHEN '1ère stmg' THEN RETURN '1_STMG';
        WHEN '1ere stmg' THEN RETURN '1_STMG';
        WHEN 'première stmg' THEN RETURN '1_STMG';
        WHEN 'premiere stmg' THEN RETURN '1_STMG';

        -- Terminale générale
        WHEN 'terminale' THEN RETURN 'T_GEN';
        WHEN 'tgen' THEN RETURN 'T_GEN';
        WHEN 'terminale générale' THEN RETURN 'T_GEN';
        WHEN 'terminale generale' THEN RETURN 'T_GEN';
        WHEN 'term g' THEN RETURN 'T_GEN';
        WHEN 'tle générale' THEN RETURN 'T_GEN';
        WHEN 'tle generale' THEN RETURN 'T_GEN';
        WHEN 'tle' THEN RETURN 'T_GEN';
        WHEN 'term' THEN RETURN 'T_GEN';

        -- Terminale spécialité maths
        WHEN 'spe_t' THEN RETURN 'T_SPE';
        WHEN 'tspe' THEN RETURN 'T_SPE';
        WHEN 'terminale spé' THEN RETURN 'T_SPE';
        WHEN 'terminale spe' THEN RETURN 'T_SPE';
        WHEN 'terminale spécialité' THEN RETURN 'T_SPE';
        WHEN 'terminale specialite' THEN RETURN 'T_SPE';
        WHEN 'term spé' THEN RETURN 'T_SPE';
        WHEN 'term spe' THEN RETURN 'T_SPE';

        -- Terminale expertes
        WHEN 'texp' THEN RETURN 'T_EXP';
        WHEN 'terminale expertes' THEN RETURN 'T_EXP';
        WHEN 'terminale maths expertes' THEN RETURN 'T_EXP';
        WHEN 'term exp' THEN RETURN 'T_EXP';

        -- Terminale complémentaires
        WHEN 'tcomp' THEN RETURN 'T_COMP';
        WHEN 'terminale comp' THEN RETURN 'T_COMP';
        WHEN 'terminale complémentaires' THEN RETURN 'T_COMP';
        WHEN 'terminale complementaires' THEN RETURN 'T_COMP';
        WHEN 'terminale maths complémentaires' THEN RETURN 'T_COMP';
        WHEN 'terminale maths complementaires' THEN RETURN 'T_COMP';
        WHEN 'term comp' THEN RETURN 'T_COMP';

        -- Terminale STMG
        WHEN 'stmg' THEN RETURN 'T_STMG';
        WHEN 'tstmg' THEN RETURN 'T_STMG';
        WHEN 'terminale stmg' THEN RETURN 'T_STMG';
        WHEN 'term stmg' THEN RETURN 'T_STMG';
        WHEN 'tle stmg' THEN RETURN 'T_STMG';

        -- Unknown value - return as-is (will fail constraint check if invalid)
        ELSE RETURN input_grade;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.normalize_grade_value(TEXT) IS
    'Converts legacy grade format strings to canonical GradeCode format. Returns NULL for NULL input. Unknown values pass through unchanged.';

-- ============================================================================
-- HELPER FUNCTION: Normalize an array of grades
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_grade_array(input_grades TEXT[])
RETURNS TEXT[] AS $$
DECLARE
    result TEXT[] := '{}';
    grade TEXT;
    normalized TEXT;
BEGIN
    -- Return NULL for NULL input
    IF input_grades IS NULL THEN
        RETURN NULL;
    END IF;

    -- Process each element
    FOREACH grade IN ARRAY input_grades
    LOOP
        normalized := public.normalize_grade_value(grade);
        IF normalized IS NOT NULL THEN
            result := array_append(result, normalized);
        END IF;
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.normalize_grade_array(TEXT[]) IS
    'Converts an array of legacy grade format strings to canonical GradeCode format.';

-- ============================================================================
-- SECTION 1: Update profiles.grade (scalar TEXT, nullable)
-- ============================================================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update profiles with non-canonical grade values
    UPDATE public.profiles
    SET grade = public.normalize_grade_value(grade)
    WHERE grade IS NOT NULL
      AND grade != public.normalize_grade_value(grade);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'profiles.grade: Updated % rows', updated_count;
END $$;

-- ============================================================================
-- SECTION 2: Update assessments.grade (scalar TEXT, NOT NULL)
-- ============================================================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update assessments with non-canonical grade values
    UPDATE public.assessments
    SET grade = public.normalize_grade_value(grade)
    WHERE grade != public.normalize_grade_value(grade);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'assessments.grade: Updated % rows', updated_count;
END $$;

-- ============================================================================
-- SECTION 3: Update pending_students.grade (scalar TEXT, nullable)
-- ============================================================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update pending_students with non-canonical grade values
    UPDATE public.pending_students
    SET grade = public.normalize_grade_value(grade)
    WHERE grade IS NOT NULL
      AND grade != public.normalize_grade_value(grade);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'pending_students.grade: Updated % rows', updated_count;
END $$;

-- ============================================================================
-- SECTION 4: Update question_templates.grades (TEXT[] array)
-- ============================================================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update question_templates with non-canonical grade values in the array
    UPDATE public.question_templates
    SET grades = public.normalize_grade_array(grades)
    WHERE grades IS NOT NULL
      AND grades != public.normalize_grade_array(grades);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'question_templates.grades: Updated % rows', updated_count;
END $$;

-- ============================================================================
-- SECTION 5: Update exercises.grade_levels (TEXT[] array)
-- ============================================================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update exercises with non-canonical grade values in the array
    UPDATE public.exercises
    SET grade_levels = public.normalize_grade_array(grade_levels)
    WHERE grade_levels IS NOT NULL
      AND grade_levels != public.normalize_grade_array(grade_levels);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'exercises.grade_levels: Updated % rows', updated_count;
END $$;

-- ============================================================================
-- SECTION 6: Add CHECK constraints to ensure only valid grades are stored
-- ============================================================================

-- Define valid grade codes as an array constant for use in constraints
-- Note: PostgreSQL doesn't support constants in CHECK constraints, so we inline the values

-- Valid grade codes list (for reference):
-- 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3', '2',
-- '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG'

-- 6.1 Add constraint to profiles.grade
DO $$
BEGIN
    -- Drop existing constraint if it exists (for idempotency)
    ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_valid_grade;

    -- Add the new constraint (allows NULL)
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_valid_grade CHECK (
        grade IS NULL OR grade IN (
            'CP', 'CE1', 'CE2', 'CM1', 'CM2',
            '6', '5', '4', '3',
            '2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG'
        )
    );

    RAISE NOTICE 'profiles.grade: CHECK constraint added';
EXCEPTION
    WHEN check_violation THEN
        RAISE EXCEPTION 'Cannot add constraint to profiles.grade - invalid values exist. Please run the data migration first.';
END $$;

-- 6.2 Add constraint to assessments.grade
DO $$
BEGIN
    -- Drop existing constraint if it exists (for idempotency)
    ALTER TABLE public.assessments
    DROP CONSTRAINT IF EXISTS assessments_valid_grade;

    -- Add the new constraint (NOT NULL, so no NULL check needed)
    ALTER TABLE public.assessments
    ADD CONSTRAINT assessments_valid_grade CHECK (
        grade IN (
            'CP', 'CE1', 'CE2', 'CM1', 'CM2',
            '6', '5', '4', '3',
            '2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG'
        )
    );

    RAISE NOTICE 'assessments.grade: CHECK constraint added';
EXCEPTION
    WHEN check_violation THEN
        RAISE EXCEPTION 'Cannot add constraint to assessments.grade - invalid values exist. Please run the data migration first.';
END $$;

-- 6.3 Add constraint to pending_students.grade
DO $$
BEGIN
    -- Drop existing constraint if it exists (for idempotency)
    ALTER TABLE public.pending_students
    DROP CONSTRAINT IF EXISTS pending_students_valid_grade;

    -- Add the new constraint (allows NULL)
    ALTER TABLE public.pending_students
    ADD CONSTRAINT pending_students_valid_grade CHECK (
        grade IS NULL OR grade IN (
            'CP', 'CE1', 'CE2', 'CM1', 'CM2',
            '6', '5', '4', '3',
            '2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG'
        )
    );

    RAISE NOTICE 'pending_students.grade: CHECK constraint added';
EXCEPTION
    WHEN check_violation THEN
        RAISE EXCEPTION 'Cannot add constraint to pending_students.grade - invalid values exist. Please run the data migration first.';
END $$;

-- 6.4 Helper function to validate grade arrays
-- This is needed because CHECK constraints can't easily validate array elements
CREATE OR REPLACE FUNCTION public.is_valid_grade_array(grades TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
    grade TEXT;
    valid_grades TEXT[] := ARRAY[
        'CP', 'CE1', 'CE2', 'CM1', 'CM2',
        '6', '5', '4', '3',
        '2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG'
    ];
BEGIN
    -- NULL array is valid
    IF grades IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Empty array is valid
    IF array_length(grades, 1) IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check each element
    FOREACH grade IN ARRAY grades
    LOOP
        IF NOT (grade = ANY(valid_grades)) THEN
            RETURN FALSE;
        END IF;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.is_valid_grade_array(TEXT[]) IS
    'Validates that all elements in a grade array are canonical GradeCode values.';

-- 6.5 Add constraint to question_templates.grades
DO $$
BEGIN
    -- Drop existing constraint if it exists (for idempotency)
    ALTER TABLE public.question_templates
    DROP CONSTRAINT IF EXISTS question_templates_valid_grades;

    -- Add the new constraint using the helper function
    ALTER TABLE public.question_templates
    ADD CONSTRAINT question_templates_valid_grades CHECK (
        public.is_valid_grade_array(grades)
    );

    RAISE NOTICE 'question_templates.grades: CHECK constraint added';
EXCEPTION
    WHEN check_violation THEN
        RAISE EXCEPTION 'Cannot add constraint to question_templates.grades - invalid values exist. Please run the data migration first.';
END $$;

-- 6.6 Add constraint to exercises.grade_levels
DO $$
BEGIN
    -- Drop existing constraint if it exists (for idempotency)
    ALTER TABLE public.exercises
    DROP CONSTRAINT IF EXISTS exercises_valid_grade_levels;

    -- Add the new constraint using the helper function
    ALTER TABLE public.exercises
    ADD CONSTRAINT exercises_valid_grade_levels CHECK (
        public.is_valid_grade_array(grade_levels)
    );

    RAISE NOTICE 'exercises.grade_levels: CHECK constraint added';
EXCEPTION
    WHEN check_violation THEN
        RAISE EXCEPTION 'Cannot add constraint to exercises.grade_levels - invalid values exist. Please run the data migration first.';
END $$;

-- ============================================================================
-- SECTION 7: Update column comments to reflect new format
-- ============================================================================

COMMENT ON COLUMN public.profiles.grade IS
    'Student grade level using canonical codes: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_STMG, T_STMG';

COMMENT ON COLUMN public.assessments.grade IS
    'Assessment grade level using canonical codes: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_STMG, T_STMG';

COMMENT ON COLUMN public.pending_students.grade IS
    'Student grade level using canonical codes: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_STMG, T_STMG';

COMMENT ON COLUMN public.question_templates.grades IS
    'Applicable grade levels using canonical codes: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_STMG, T_STMG';

COMMENT ON COLUMN public.exercises.grade_levels IS
    'Applicable grade levels using canonical codes: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_STMG, T_STMG';

-- ============================================================================
-- SECTION 8: Verification queries (for manual inspection if needed)
-- ============================================================================

-- Run these queries after migration to verify results:
--
-- SELECT DISTINCT grade FROM profiles WHERE grade IS NOT NULL ORDER BY grade;
-- SELECT DISTINCT grade FROM assessments ORDER BY grade;
-- SELECT DISTINCT grade FROM pending_students WHERE grade IS NOT NULL ORDER BY grade;
-- SELECT DISTINCT unnest(grades) FROM question_templates ORDER BY 1;
-- SELECT DISTINCT unnest(grade_levels) FROM exercises WHERE grade_levels IS NOT NULL ORDER BY 1;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Summary:
-- 1. Created helper functions normalize_grade_value() and normalize_grade_array()
-- 2. Updated scalar grade columns: profiles.grade, assessments.grade, pending_students.grade
-- 3. Updated array grade columns: question_templates.grades, exercises.grade_levels
-- 4. Added CHECK constraints to all grade columns to prevent future invalid values
-- 5. Updated column comments with canonical code documentation
--
-- Next steps:
-- 1. Run: pnpm db:migrate
-- 2. Update src/lib/types/database.ts with any necessary type changes
-- 3. Update docs/architecture/database-schema.md if needed
-- ============================================================================
