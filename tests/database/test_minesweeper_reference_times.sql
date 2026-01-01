-- Test Script: Minesweeper Reference Times Migration
-- Purpose: Verify tables, functions, RLS policies, and seed data
-- Usage: Run this AFTER applying the migration with `pnpm db:migrate`

-- =============================================================================
-- PART 1: Basic Schema Verification
-- =============================================================================

\echo '=== Part 1: Verifying tables exist ==='

SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'minesweeper_reference_times'
) AS reference_times_exists;

SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'minesweeper_reference_times_history'
) AS history_table_exists;

\echo '=== Verifying column types ==='

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'minesweeper_reference_times'
ORDER BY ordinal_position;

-- =============================================================================
-- PART 2: Seed Data Verification
-- =============================================================================

\echo '=== Part 2: Verifying seed data (15 rows expected) ==='

SELECT COUNT(*) AS total_rows FROM public.minesweeper_reference_times;

-- Verify 5 cycles
SELECT cycle, COUNT(*) AS difficulties_count
FROM public.minesweeper_reference_times
GROUP BY cycle
ORDER BY cycle;

-- Verify all 15 rows with correct values
SELECT cycle, difficulty, reference_time, fallback_time, min_bound, max_bound
FROM public.minesweeper_reference_times
ORDER BY
  CASE cycle
    WHEN 'cycle_2' THEN 1
    WHEN 'cycle_3' THEN 2
    WHEN 'cycle_4' THEN 3
    WHEN 'seconde' THEN 4
    WHEN 'cycle_terminal' THEN 5
  END,
  CASE difficulty
    WHEN 'beginner' THEN 1
    WHEN 'intermediate' THEN 2
    WHEN 'expert' THEN 3
  END;

-- =============================================================================
-- PART 3: Function Tests - get_cycle_for_grade()
-- =============================================================================

\echo '=== Part 3: Testing get_cycle_for_grade() function ==='

-- Test cycle_2 grades
DO $$
DECLARE
  v_result TEXT;
BEGIN
  -- CP
  v_result := public.get_cycle_for_grade('CP');
  IF v_result != 'cycle_2' THEN
    RAISE EXCEPTION 'Test FAILED: CP should return cycle_2, got %', v_result;
  END IF;

  -- CE1
  v_result := public.get_cycle_for_grade('CE1');
  IF v_result != 'cycle_2' THEN
    RAISE EXCEPTION 'Test FAILED: CE1 should return cycle_2, got %', v_result;
  END IF;

  -- CE2
  v_result := public.get_cycle_for_grade('CE2');
  IF v_result != 'cycle_2' THEN
    RAISE EXCEPTION 'Test FAILED: CE2 should return cycle_2, got %', v_result;
  END IF;

  RAISE NOTICE 'Test PASSED: cycle_2 grades (CP, CE1, CE2)';
END $$;

-- Test cycle_3 grades (includes 6ème!)
DO $$
DECLARE
  v_result TEXT;
BEGIN
  v_result := public.get_cycle_for_grade('CM1');
  IF v_result != 'cycle_3' THEN
    RAISE EXCEPTION 'Test FAILED: CM1 should return cycle_3, got %', v_result;
  END IF;

  v_result := public.get_cycle_for_grade('CM2');
  IF v_result != 'cycle_3' THEN
    RAISE EXCEPTION 'Test FAILED: CM2 should return cycle_3, got %', v_result;
  END IF;

  -- 6ème is in cycle_3, not cycle_4!
  v_result := public.get_cycle_for_grade('6');
  IF v_result != 'cycle_3' THEN
    RAISE EXCEPTION 'Test FAILED: 6 should return cycle_3 (not cycle_4!), got %', v_result;
  END IF;

  RAISE NOTICE 'Test PASSED: cycle_3 grades (CM1, CM2, 6)';
END $$;

-- Test cycle_4 grades
DO $$
DECLARE
  v_result TEXT;
BEGIN
  v_result := public.get_cycle_for_grade('5');
  IF v_result != 'cycle_4' THEN
    RAISE EXCEPTION 'Test FAILED: 5 should return cycle_4, got %', v_result;
  END IF;

  v_result := public.get_cycle_for_grade('4');
  IF v_result != 'cycle_4' THEN
    RAISE EXCEPTION 'Test FAILED: 4 should return cycle_4, got %', v_result;
  END IF;

  v_result := public.get_cycle_for_grade('3');
  IF v_result != 'cycle_4' THEN
    RAISE EXCEPTION 'Test FAILED: 3 should return cycle_4, got %', v_result;
  END IF;

  RAISE NOTICE 'Test PASSED: cycle_4 grades (5, 4, 3)';
END $$;

-- Test seconde
DO $$
DECLARE
  v_result TEXT;
BEGIN
  v_result := public.get_cycle_for_grade('2');
  IF v_result != 'seconde' THEN
    RAISE EXCEPTION 'Test FAILED: 2 should return seconde, got %', v_result;
  END IF;

  RAISE NOTICE 'Test PASSED: seconde grade (2)';
END $$;

-- Test cycle_terminal grades
DO $$
DECLARE
  v_result TEXT;
BEGIN
  v_result := public.get_cycle_for_grade('1_GEN');
  IF v_result != 'cycle_terminal' THEN
    RAISE EXCEPTION 'Test FAILED: 1_GEN should return cycle_terminal, got %', v_result;
  END IF;

  v_result := public.get_cycle_for_grade('T_GEN');
  IF v_result != 'cycle_terminal' THEN
    RAISE EXCEPTION 'Test FAILED: T_GEN should return cycle_terminal, got %', v_result;
  END IF;

  v_result := public.get_cycle_for_grade('T_SPE');
  IF v_result != 'cycle_terminal' THEN
    RAISE EXCEPTION 'Test FAILED: T_SPE should return cycle_terminal, got %', v_result;
  END IF;

  v_result := public.get_cycle_for_grade('T_EXP');
  IF v_result != 'cycle_terminal' THEN
    RAISE EXCEPTION 'Test FAILED: T_EXP should return cycle_terminal, got %', v_result;
  END IF;

  RAISE NOTICE 'Test PASSED: cycle_terminal grades';
END $$;

-- Test NULL/invalid inputs
DO $$
DECLARE
  v_result TEXT;
BEGIN
  v_result := public.get_cycle_for_grade(NULL);
  IF v_result IS NOT NULL THEN
    RAISE EXCEPTION 'Test FAILED: NULL should return NULL, got %', v_result;
  END IF;

  v_result := public.get_cycle_for_grade('INVALID');
  IF v_result IS NOT NULL THEN
    RAISE EXCEPTION 'Test FAILED: INVALID grade should return NULL, got %', v_result;
  END IF;

  v_result := public.get_cycle_for_grade('');
  IF v_result IS NOT NULL THEN
    RAISE EXCEPTION 'Test FAILED: Empty string should return NULL, got %', v_result;
  END IF;

  RAISE NOTICE 'Test PASSED: NULL/invalid inputs return NULL';
END $$;

-- =============================================================================
-- PART 4: Function Tests - get_minesweeper_reference_time()
-- =============================================================================

\echo '=== Part 4: Testing get_minesweeper_reference_time() function ==='

-- Test returns fallback_time when sample_count < min_samples (initial state)
DO $$
DECLARE
  v_result INTEGER;
BEGIN
  -- All rows start with sample_count = 0, so should return fallback_time
  v_result := public.get_minesweeper_reference_time('cycle_3', 'beginner');
  IF v_result != 180 THEN
    RAISE EXCEPTION 'Test FAILED: cycle_3/beginner should return 180 (fallback), got %', v_result;
  END IF;

  v_result := public.get_minesweeper_reference_time('cycle_3', 'intermediate');
  IF v_result != 600 THEN
    RAISE EXCEPTION 'Test FAILED: cycle_3/intermediate should return 600 (fallback), got %', v_result;
  END IF;

  v_result := public.get_minesweeper_reference_time('cycle_3', 'expert');
  IF v_result != 1200 THEN
    RAISE EXCEPTION 'Test FAILED: cycle_3/expert should return 1200 (fallback), got %', v_result;
  END IF;

  RAISE NOTICE 'Test PASSED: Returns fallback_time when sample_count < min_samples';
END $$;

-- Test returns reference_time when sample_count >= min_samples
DO $$
DECLARE
  v_result INTEGER;
BEGIN
  -- Temporarily update sample_count and reference_time
  UPDATE public.minesweeper_reference_times
  SET sample_count = 50, reference_time = 150
  WHERE cycle = 'cycle_3' AND difficulty = 'beginner';

  v_result := public.get_minesweeper_reference_time('cycle_3', 'beginner');
  IF v_result != 150 THEN
    RAISE EXCEPTION 'Test FAILED: Should return reference_time (150) when samples >= min, got %', v_result;
  END IF;

  -- Reset to original state
  UPDATE public.minesweeper_reference_times
  SET sample_count = 0, reference_time = 180
  WHERE cycle = 'cycle_3' AND difficulty = 'beginner';

  RAISE NOTICE 'Test PASSED: Returns reference_time when sample_count >= min_samples';
END $$;

-- Test unknown cycle/difficulty raises exception
DO $$
DECLARE
  v_result INTEGER;
BEGIN
  BEGIN
    v_result := public.get_minesweeper_reference_time('unknown_cycle', 'beginner');
    RAISE EXCEPTION 'Test FAILED: Unknown cycle should raise exception';
  EXCEPTION
    WHEN raise_exception THEN
      RAISE NOTICE 'Test PASSED: Unknown cycle correctly raises exception';
  END;
END $$;

DO $$
DECLARE
  v_result INTEGER;
BEGIN
  BEGIN
    v_result := public.get_minesweeper_reference_time('cycle_3', 'unknown');
    RAISE EXCEPTION 'Test FAILED: Unknown difficulty should raise exception';
  EXCEPTION
    WHEN raise_exception THEN
      RAISE NOTICE 'Test PASSED: Unknown difficulty correctly raises exception';
  END;
END $$;

-- =============================================================================
-- PART 5: RLS Policy Tests
-- =============================================================================

\echo '=== Part 5: Testing RLS policies ==='

-- Verify RLS is enabled
DO $$
DECLARE
  v_rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'minesweeper_reference_times';

  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION 'Test FAILED: RLS not enabled on minesweeper_reference_times';
  END IF;

  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'minesweeper_reference_times_history';

  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION 'Test FAILED: RLS not enabled on minesweeper_reference_times_history';
  END IF;

  RAISE NOTICE 'Test PASSED: RLS enabled on both tables';
END $$;

-- Verify policies exist
SELECT polname, polcmd
FROM pg_policies
WHERE tablename = 'minesweeper_reference_times';

SELECT polname, polcmd
FROM pg_policies
WHERE tablename = 'minesweeper_reference_times_history';

-- =============================================================================
-- PART 6: Constraint Tests
-- =============================================================================

\echo '=== Part 6: Testing constraints ==='

-- Test CHECK constraint on cycle
DO $$
BEGIN
  INSERT INTO public.minesweeper_reference_times
    (cycle, difficulty, reference_time, fallback_time, min_bound, max_bound)
  VALUES ('invalid_cycle', 'beginner', 100, 100, 50, 200);

  RAISE EXCEPTION 'Test FAILED: Invalid cycle should be rejected';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'Test PASSED: Invalid cycle correctly rejected';
END $$;

-- Test CHECK constraint on difficulty
DO $$
BEGIN
  INSERT INTO public.minesweeper_reference_times
    (cycle, difficulty, reference_time, fallback_time, min_bound, max_bound)
  VALUES ('cycle_2', 'invalid_difficulty', 100, 100, 50, 200);

  RAISE EXCEPTION 'Test FAILED: Invalid difficulty should be rejected';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'Test PASSED: Invalid difficulty correctly rejected';
END $$;

-- Test CHECK constraint: reference_time must be between min_bound and max_bound
DO $$
BEGIN
  UPDATE public.minesweeper_reference_times
  SET reference_time = 500  -- Above max_bound of 360
  WHERE cycle = 'cycle_3' AND difficulty = 'beginner';

  RAISE EXCEPTION 'Test FAILED: reference_time above max_bound should be rejected';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'Test PASSED: reference_time outside bounds correctly rejected';
END $$;

-- Test CHECK constraint: min_bound < max_bound
DO $$
BEGIN
  UPDATE public.minesweeper_reference_times
  SET min_bound = 500, max_bound = 100
  WHERE cycle = 'cycle_3' AND difficulty = 'beginner';

  RAISE EXCEPTION 'Test FAILED: min_bound > max_bound should be rejected';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'Test PASSED: min_bound > max_bound correctly rejected';
END $$;

-- =============================================================================
-- PART 7: Summary
-- =============================================================================

\echo '=== All tests completed ==='
\echo 'Check above for any FAILED messages. If none, all tests passed.'

-- Final verification: show table counts
SELECT 'minesweeper_reference_times' AS table_name, COUNT(*) AS row_count
FROM public.minesweeper_reference_times
UNION ALL
SELECT 'minesweeper_reference_times_history', COUNT(*)
FROM public.minesweeper_reference_times_history;
