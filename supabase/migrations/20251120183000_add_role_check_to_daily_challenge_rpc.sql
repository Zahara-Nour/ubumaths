-- ============================================================================
-- CRITICAL-3 FIX: Add student-only role check to get_or_create_daily_challenge()
-- ============================================================================
-- Security Issue: Missing role validation in daily challenge RPC
-- Impact: Violates defense-in-depth principle (teachers/admins can call RPC)
-- Fix: Add student role check at function start (consistent with other minesweeper RPCs)
-- ============================================================================

-- Update: get_or_create_daily_challenge() - Add student-only validation
CREATE OR REPLACE FUNCTION public.get_or_create_daily_challenge()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_today DATE;
  v_challenge RECORD;
  v_difficulty TEXT;
  v_seed TEXT;
  v_day_of_week INTEGER;
BEGIN
  -- ✅ CRITICAL FIX: Validate caller is a student
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Only students can access daily challenges';
  END IF;

  -- Get today's date in UTC
  v_today := CURRENT_DATE;

  -- Try to get existing challenge
  SELECT * INTO v_challenge
  FROM public.minesweeper_daily_challenges
  WHERE challenge_date = v_today;

  IF FOUND THEN
    -- Return existing challenge
    RETURN jsonb_build_object(
      'id', v_challenge.id,
      'challenge_date', v_challenge.challenge_date,
      'difficulty', v_challenge.difficulty,
      'seed', v_challenge.seed,
      'created_at', v_challenge.created_at
    );
  END IF;

  -- Create new challenge for today
  -- Difficulty rotation by day of week:
  -- Monday (1): beginner
  -- Tuesday (2): intermediate
  -- Wednesday (3): expert
  -- Thursday (4): beginner
  -- Friday (5): intermediate
  -- Saturday (6): expert
  -- Sunday (0): expert

  v_day_of_week := EXTRACT(DOW FROM v_today)::INTEGER;

  CASE v_day_of_week
    WHEN 1, 4 THEN v_difficulty := 'beginner';    -- Mon, Thu
    WHEN 2, 5 THEN v_difficulty := 'intermediate'; -- Tue, Fri
    WHEN 0, 3, 6 THEN v_difficulty := 'expert';   -- Sun, Wed, Sat
    ELSE v_difficulty := 'beginner'; -- Fallback (should never happen)
  END CASE;

  -- Generate seed from date and difficulty
  v_seed := TO_CHAR(v_today, 'YYYYMMDD') || '-' || v_difficulty;

  -- Insert new challenge
  INSERT INTO public.minesweeper_daily_challenges (
    challenge_date,
    difficulty,
    seed
  ) VALUES (
    v_today,
    v_difficulty,
    v_seed
  )
  RETURNING * INTO v_challenge;

  -- Return new challenge
  RETURN jsonb_build_object(
    'id', v_challenge.id,
    'challenge_date', v_challenge.challenge_date,
    'difficulty', v_challenge.difficulty,
    'seed', v_challenge.seed,
    'created_at', v_challenge.created_at
  );
END;
$$;

COMMENT ON FUNCTION public.get_or_create_daily_challenge() IS
  'Get or create today''s daily challenge (STUDENTS ONLY). Creates new challenge if none exists for today.';

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- ✅ Added student-only role check to get_or_create_daily_challenge()
-- ✅ Prevents teachers/admins from calling this RPC
-- ✅ Consistent with other minesweeper RPCs (complete_minesweeper_game, record_daily_challenge_attempt, etc.)
-- ✅ Defense-in-depth security layer (API endpoints also check role)
