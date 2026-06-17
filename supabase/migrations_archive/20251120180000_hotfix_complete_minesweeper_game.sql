-- Hotfix: Remove invalid cm.status column reference in complete_minesweeper_game
-- The class_members table does not have a status column
-- This caused: "column cm.status does not exist" error when users won games

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.complete_minesweeper_game(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.complete_minesweeper_game(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS TABLE(
  gidouilles_earned INTEGER,
  achievements JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_record RECORD;
  v_is_valid BOOLEAN;
  v_time_seconds INTEGER;
  v_gidouilles INTEGER;
  v_grid_size INTEGER;
  v_achievements JSONB;
BEGIN
  -- Step 1: Get game and verify ownership
  SELECT * INTO v_game_record
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND student_id = auth.uid() -- Must be authenticated and own the game
    AND status = 'in_progress'; -- Must be in progress

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or already completed';
  END IF;

  -- Step 2: Validate grid_state represents a legitimate win
  v_is_valid := public.validate_minesweeper_win(p_grid_state, v_game_record.difficulty);

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Invalid grid state: does not represent a valid win condition';
  END IF;

  -- Step 3: Validate grid_state size to prevent payload attacks
  v_grid_size := pg_column_size(p_grid_state);
  IF v_grid_size > 100000 THEN -- 100KB limit
    RAISE EXCEPTION 'Grid state too large: exceeds 100KB';
  END IF;

  -- Step 4: Calculate time_seconds (server-side to prevent manipulation)
  -- If started_at is NULL (shouldn't happen with trigger), use minimal time
  IF v_game_record.started_at IS NOT NULL THEN
    v_time_seconds := GREATEST(1, EXTRACT(EPOCH FROM (NOW() - v_game_record.started_at))::INTEGER);
  ELSE
    v_time_seconds := 1; -- Minimal time if started_at is somehow NULL
  END IF;

  -- Step 5: Calculate gidouilles using the NEW calculation function
  v_gidouilles := public.calculate_minesweeper_gidouilles(
    v_game_record.difficulty,
    v_time_seconds,
    COALESCE(v_game_record.hints_used, 0),
    v_game_record.student_id
  );

  -- Step 6: Check for newly unlocked achievements
  -- Get IDs of classes the student belongs to (removed invalid cm.status check)
  WITH student_classes AS (
    SELECT cm.class_id
    FROM public.class_members cm
    WHERE cm.student_id = v_game_record.student_id
      -- ✅ REMOVED: AND cm.status = 'active' (column doesn't exist)
  ),
  new_achievements AS (
    SELECT 
      a.id AS achievement_id,
      a.name,
      a.icon,
      a.difficulty
    FROM public.achievements a
    WHERE 
      -- Minesweeper-specific achievements
      a.game_type = 'minesweeper'
      -- Student hasn't unlocked this achievement yet
      AND NOT EXISTS (
        SELECT 1
        FROM public.student_achievements sa
        WHERE sa.student_id = v_game_record.student_id
          AND sa.achievement_id = a.id
      )
      -- Achievement matches game difficulty (or is for any difficulty)
      AND (a.difficulty = v_game_record.difficulty OR a.difficulty IS NULL)
      -- Verify achievement conditions with the VALIDATED grid_state
      AND (
        -- Win-based achievements (e.g., "Win a game on beginner")
        (a.condition_type = 'win' AND a.threshold = 1)
        -- Other conditions can be added here
      )
      -- Achievement belongs to one of student's classes
      AND (
        a.class_id IS NULL 
        OR a.class_id IN (SELECT class_id FROM student_classes)
      )
  )
  INSERT INTO public.student_achievements (student_id, achievement_id)
  SELECT v_game_record.student_id, achievement_id
  FROM new_achievements
  RETURNING jsonb_build_object(
    'achievement_id', achievement_id,
    'name', name,
    'icon', icon,
    'difficulty', difficulty
  ) INTO v_achievements;

  -- If no achievements were unlocked, set to empty array
  v_achievements := COALESCE(v_achievements, '[]'::jsonb);

  -- Step 7: Update game record with validated data
  UPDATE public.minesweeper_games
  SET
    status = 'won',
    completed_at = NOW(),
    time_seconds = v_time_seconds,
    gidouilles_awarded = v_gidouilles,
    grid_state = p_grid_state -- Store the validated grid
  WHERE id = p_game_id;

  -- Step 8: Award gidouilles to student
  UPDATE public.profiles
  SET gidouilles = COALESCE(gidouilles, 0) + v_gidouilles
  WHERE id = v_game_record.student_id;

  -- Step 9: Record transaction in gidouilles_history for audit trail
  INSERT INTO public.gidouilles_history (student_id, amount, reason, reference_id)
  VALUES (
    v_game_record.student_id,
    v_gidouilles,
    'Minesweeper win: ' || v_game_record.difficulty || ' (' || v_time_seconds || 's)',
    p_game_id
  );

  -- Step 10: Return gidouilles earned and achievements
  RETURN QUERY SELECT v_gidouilles, v_achievements;
END;
$$;

COMMENT ON FUNCTION public.complete_minesweeper_game IS
  'HOTFIX: Removed invalid cm.status check. Completes a Minesweeper game, validates win condition, calculates rewards, and updates achievements.';
