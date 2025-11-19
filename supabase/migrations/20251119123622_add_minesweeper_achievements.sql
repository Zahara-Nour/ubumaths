-- Minesweeper Achievements System
-- Purpose: Track student achievements and badges for notable Minesweeper accomplishments
-- Author: Claude (Supabase Expert)
-- Date: 2025-11-19
--
-- Features:
-- - 4 achievement types: First win, No flags, Perfect reveals, Lightning speed
-- - Difficulty-specific achievements (can earn once per difficulty level)
-- - Automatic unlock detection via complete_minesweeper_game() integration
-- - Achievement progress tracking view
-- - Secure RLS policies (no direct inserts, function-only unlocks)

-- ============================================================================
-- Table: minesweeper_achievements (Achievement Definitions)
-- ============================================================================

CREATE TABLE public.minesweeper_achievements (
  id TEXT PRIMARY KEY,  -- Slug identifier (e.g., 'first_victory', 'no_flags')
  name TEXT NOT NULL,   -- Display name in French (e.g., 'Premier pas')
  description TEXT NOT NULL,  -- Description in French
  icon TEXT NOT NULL,   -- Emoji icon (e.g., '🎯')
  difficulty_specific BOOLEAN NOT NULL DEFAULT false,  -- If true, can earn once per difficulty
  unlock_condition TEXT NOT NULL,  -- Human-readable unlock condition
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.minesweeper_achievements IS
  'Achievement definitions for Minesweeper game. Contains metadata for all available achievements.';

COMMENT ON COLUMN public.minesweeper_achievements.difficulty_specific IS
  'If true, achievement can be earned separately for beginner/intermediate/expert. If false, earned only once.';

-- ============================================================================
-- Seed Achievement Definitions
-- ============================================================================

INSERT INTO public.minesweeper_achievements (id, name, description, icon, difficulty_specific, unlock_condition) VALUES
(
  'first_victory',
  'Premier pas',
  'Remporte ta première victoire au Démineur',
  '🎯',
  false,
  'Gagner un premier jeu de Démineur (n''importe quelle difficulté)'
),
(
  'no_flags',
  'Sans drapeaux',
  'Gagne une partie sans placer aucun drapeau',
  '🚫',
  true,
  'Gagner un jeu sans utiliser de drapeaux (flags_used = 0)'
),
(
  'perfectionist',
  'Perfectionniste',
  'Révèle uniquement les cellules nécessaires, sans aucun gaspillage',
  '✨',
  true,
  'Révéler exactement (lignes × colonnes) - mines cellules'
),
(
  'lightning_speed',
  'Vitesse éclair',
  'Termine une partie sous le temps de référence',
  '⚡',
  true,
  'Débutant: <60s, Intermédiaire: <180s, Expert: <300s'
);

-- ============================================================================
-- Table: minesweeper_student_achievements (Student Achievement Unlocks)
-- ============================================================================

CREATE TABLE public.minesweeper_student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES public.minesweeper_achievements(id) ON DELETE CASCADE,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'expert') OR difficulty IS NULL),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  game_id UUID REFERENCES public.minesweeper_games(id) ON DELETE SET NULL,

  -- Cannot unlock same achievement twice for same difficulty
  CONSTRAINT unique_student_achievement_difficulty UNIQUE (student_id, achievement_id, difficulty)
);

COMMENT ON TABLE public.minesweeper_student_achievements IS
  'Tracks which achievements each student has unlocked. Includes reference to the game where it was earned.';

COMMENT ON COLUMN public.minesweeper_student_achievements.difficulty IS
  'Only populated for difficulty_specific achievements. NULL for global achievements (e.g., first_victory).';

COMMENT ON COLUMN public.minesweeper_student_achievements.game_id IS
  'Reference to the game where this achievement was unlocked. ON DELETE SET NULL preserves achievement history.';

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Student's achievement queries (profile page)
CREATE INDEX idx_minesweeper_student_achievements_student
  ON public.minesweeper_student_achievements(student_id, unlocked_at DESC);

-- Achievement stats queries (how many students unlocked each achievement)
CREATE INDEX idx_minesweeper_student_achievements_achievement
  ON public.minesweeper_student_achievements(achievement_id);

-- Game achievement lookup (show achievements earned on specific game)
CREATE INDEX idx_minesweeper_student_achievements_game
  ON public.minesweeper_student_achievements(game_id)
  WHERE game_id IS NOT NULL;

-- ============================================================================
-- Function: check_and_unlock_achievements()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements(
  p_game_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game RECORD;
  v_student_id UUID;
  v_unlocked_achievements JSONB := '[]'::JSONB;
  v_new_achievement JSONB;
  v_is_first_win BOOLEAN;
  v_perfect_cells INTEGER;
  v_time_threshold INTEGER;
BEGIN
  -- Step 1: Get game details (only process won games)
  SELECT * INTO v_game
  FROM public.minesweeper_games
  WHERE id = p_game_id AND status = 'won';

  IF NOT FOUND THEN
    -- Game not found or not won - return empty array
    RETURN v_unlocked_achievements;
  END IF;

  v_student_id := v_game.student_id;

  -- Only authenticated users can earn achievements
  IF v_student_id IS NULL THEN
    RETURN v_unlocked_achievements;
  END IF;

  -- ============================================================================
  -- Achievement 1: "Premier pas" (First Victory)
  -- ============================================================================

  -- Check if this is the first win ever (excluding current game)
  SELECT NOT EXISTS (
    SELECT 1 FROM public.minesweeper_games
    WHERE student_id = v_student_id
      AND status = 'won'
      AND id != p_game_id
  ) INTO v_is_first_win;

  IF v_is_first_win THEN
    -- Try to insert (ON CONFLICT DO NOTHING prevents duplicates)
    INSERT INTO public.minesweeper_student_achievements (
      student_id,
      achievement_id,
      difficulty,
      game_id
    )
    VALUES (v_student_id, 'first_victory', NULL, p_game_id)
    ON CONFLICT (student_id, achievement_id, difficulty) DO NOTHING;

    -- Check if insert was successful (not a duplicate)
    IF FOUND THEN
      v_new_achievement := jsonb_build_object(
        'achievement_id', 'first_victory',
        'name', (SELECT name FROM public.minesweeper_achievements WHERE id = 'first_victory'),
        'icon', (SELECT icon FROM public.minesweeper_achievements WHERE id = 'first_victory'),
        'difficulty', NULL
      );
      v_unlocked_achievements := v_unlocked_achievements || v_new_achievement;
    END IF;
  END IF;

  -- ============================================================================
  -- Achievement 2: "Sans drapeaux" (No Flags) - Difficulty Specific
  -- ============================================================================

  IF v_game.flags_used = 0 THEN
    INSERT INTO public.minesweeper_student_achievements (
      student_id,
      achievement_id,
      difficulty,
      game_id
    )
    VALUES (v_student_id, 'no_flags', v_game.difficulty, p_game_id)
    ON CONFLICT (student_id, achievement_id, difficulty) DO NOTHING;

    IF FOUND THEN
      v_new_achievement := jsonb_build_object(
        'achievement_id', 'no_flags',
        'name', (SELECT name FROM public.minesweeper_achievements WHERE id = 'no_flags'),
        'icon', (SELECT icon FROM public.minesweeper_achievements WHERE id = 'no_flags'),
        'difficulty', v_game.difficulty
      );
      v_unlocked_achievements := v_unlocked_achievements || v_new_achievement;
    END IF;
  END IF;

  -- ============================================================================
  -- Achievement 3: "Perfectionniste" (Perfect Reveals) - Difficulty Specific
  -- ============================================================================

  -- Calculate expected perfect cells: (rows × cols) - mines
  SELECT (rows * cols) - mines INTO v_perfect_cells
  FROM (VALUES
    ('beginner', 9, 9, 10),
    ('intermediate', 16, 16, 40),
    ('expert', 16, 30, 99)
  ) AS configs(difficulty, rows, cols, mines)
  WHERE difficulty = v_game.difficulty;

  IF v_game.cells_revealed = v_perfect_cells THEN
    INSERT INTO public.minesweeper_student_achievements (
      student_id,
      achievement_id,
      difficulty,
      game_id
    )
    VALUES (v_student_id, 'perfectionist', v_game.difficulty, p_game_id)
    ON CONFLICT (student_id, achievement_id, difficulty) DO NOTHING;

    IF FOUND THEN
      v_new_achievement := jsonb_build_object(
        'achievement_id', 'perfectionist',
        'name', (SELECT name FROM public.minesweeper_achievements WHERE id = 'perfectionist'),
        'icon', (SELECT icon FROM public.minesweeper_achievements WHERE id = 'perfectionist'),
        'difficulty', v_game.difficulty
      );
      v_unlocked_achievements := v_unlocked_achievements || v_new_achievement;
    END IF;
  END IF;

  -- ============================================================================
  -- Achievement 4: "Vitesse éclair" (Lightning Speed) - Difficulty Specific
  -- ============================================================================

  -- Determine time threshold based on difficulty
  v_time_threshold := CASE v_game.difficulty
    WHEN 'beginner' THEN 60
    WHEN 'intermediate' THEN 180
    WHEN 'expert' THEN 300
  END;

  IF v_game.time_seconds < v_time_threshold THEN
    INSERT INTO public.minesweeper_student_achievements (
      student_id,
      achievement_id,
      difficulty,
      game_id
    )
    VALUES (v_student_id, 'lightning_speed', v_game.difficulty, p_game_id)
    ON CONFLICT (student_id, achievement_id, difficulty) DO NOTHING;

    IF FOUND THEN
      v_new_achievement := jsonb_build_object(
        'achievement_id', 'lightning_speed',
        'name', (SELECT name FROM public.minesweeper_achievements WHERE id = 'lightning_speed'),
        'icon', (SELECT icon FROM public.minesweeper_achievements WHERE id = 'lightning_speed'),
        'difficulty', v_game.difficulty
      );
      v_unlocked_achievements := v_unlocked_achievements || v_new_achievement;
    END IF;
  END IF;

  -- Return array of newly unlocked achievements
  RETURN v_unlocked_achievements;
END;
$$;

COMMENT ON FUNCTION public.check_and_unlock_achievements IS
  'Checks all achievement unlock conditions for a completed game and inserts new unlocks. Returns JSONB array of newly unlocked achievements for notification display. SECURITY DEFINER prevents direct manipulation.';

-- ============================================================================
-- Modify: complete_minesweeper_game() - Add Achievement Check
-- ============================================================================

-- Drop and recreate the function to add achievement checking
DROP FUNCTION IF EXISTS public.complete_minesweeper_game(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.complete_minesweeper_game(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS TABLE(
  success BOOLEAN,
  gidouilles_awarded INTEGER,
  time_seconds INTEGER,
  achievements JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_record RECORD;
  v_time_seconds INTEGER;
  v_gidouilles INTEGER;
  v_is_valid BOOLEAN;
  v_unlocked_achievements JSONB;
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

  -- Step 3: Validate started_at exists
  IF v_game_record.started_at IS NULL THEN
    RAISE EXCEPTION 'Game has not been started yet (no cells revealed)';
  END IF;

  -- Step 4: Calculate time_seconds server-side
  v_time_seconds := EXTRACT(EPOCH FROM (NOW() - v_game_record.started_at))::INTEGER;

  -- Sanity check: time must be positive and reasonable for difficulty
  IF v_time_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid game time: must be at least 1 second';
  END IF;

  CASE v_game_record.difficulty
    WHEN 'beginner' THEN
      IF v_time_seconds > 3600 THEN -- 1 hour max
        RAISE EXCEPTION 'Invalid game time for beginner: exceeds 1 hour';
      END IF;
    WHEN 'intermediate' THEN
      IF v_time_seconds > 7200 THEN -- 2 hours max
        RAISE EXCEPTION 'Invalid game time for intermediate: exceeds 2 hours';
      END IF;
    WHEN 'expert' THEN
      IF v_time_seconds > 14400 THEN -- 4 hours max
        RAISE EXCEPTION 'Invalid game time for expert: exceeds 4 hours';
      END IF;
  END CASE;

  -- Step 5: Calculate gidouilles server-side
  v_gidouilles := public.calculate_minesweeper_gidouilles(
    v_game_record.difficulty,
    v_time_seconds,
    v_game_record.student_id
  );

  -- Step 6: Update game record
  UPDATE public.minesweeper_games
  SET
    status = 'won',
    grid_state = p_grid_state,
    time_seconds = v_time_seconds,
    gidouilles_awarded = v_gidouilles,
    completed_at = NOW()
  WHERE id = p_game_id;

  -- Step 7: Award gidouilles to profile
  IF v_gidouilles > 0 THEN
    UPDATE public.profiles
    SET gidouilles = COALESCE(gidouilles, 0) + v_gidouilles
    WHERE id = v_game_record.student_id;

    -- Step 8: Insert into gidouilles_history for audit trail
    -- Use student's first active class for history tracking
    INSERT INTO public.gidouilles_history (
      student_id,
      class_id,
      delta,
      reason,
      created_by
    )
    SELECT
      v_game_record.student_id,
      cm.class_id,
      v_gidouilles,
      'Minesweeper: ' || v_game_record.difficulty || ' won in ' || v_time_seconds || 's',
      v_game_record.student_id
    FROM public.class_members cm
    WHERE cm.student_id = v_game_record.student_id
      AND cm.status = 'active'
    ORDER BY cm.joined_at ASC
    LIMIT 1;

    -- Note: If student has no active classes, history insert is skipped
    -- This is acceptable as they still receive gidouilles
  END IF;

  -- Step 9: Check and unlock achievements
  v_unlocked_achievements := public.check_and_unlock_achievements(p_game_id);

  -- Step 10: Return result with achievements
  RETURN QUERY SELECT TRUE, v_gidouilles, v_time_seconds, v_unlocked_achievements;
END;
$$;

COMMENT ON FUNCTION public.complete_minesweeper_game IS
  'Completes a Minesweeper game with server-side validation and reward calculation. Automatically checks and unlocks achievements. Returns success, gidouilles, time, and newly unlocked achievements array. SECURITY DEFINER prevents client manipulation.';

-- ============================================================================
-- View: minesweeper_student_achievement_progress
-- ============================================================================

CREATE VIEW public.minesweeper_student_achievement_progress AS
SELECT
  p.id AS student_id,
  a.id AS achievement_id,
  a.name,
  a.description,
  a.icon,
  a.difficulty_specific,
  -- For difficulty_specific achievements, show progress per difficulty
  CASE
    WHEN a.difficulty_specific THEN diffs.difficulty
    ELSE NULL
  END AS difficulty,
  sa.unlocked_at,
  sa.game_id,
  sa.unlocked_at IS NOT NULL AS is_unlocked
FROM public.profiles p
CROSS JOIN public.minesweeper_achievements a
-- For difficulty_specific achievements, cross join with all difficulties
LEFT JOIN LATERAL (
  SELECT difficulty
  FROM (VALUES ('beginner'), ('intermediate'), ('expert')) AS d(difficulty)
  WHERE a.difficulty_specific
  UNION ALL
  SELECT NULL AS difficulty WHERE NOT a.difficulty_specific
) AS diffs ON true
LEFT JOIN public.minesweeper_student_achievements sa
  ON sa.student_id = p.id
  AND sa.achievement_id = a.id
  AND (
    (a.difficulty_specific AND sa.difficulty = diffs.difficulty) OR
    (NOT a.difficulty_specific AND sa.difficulty IS NULL AND diffs.difficulty IS NULL)
  )
WHERE p.role = 'student';

COMMENT ON VIEW public.minesweeper_student_achievement_progress IS
  'Shows each student''s achievement progress including locked and unlocked achievements. For difficulty_specific achievements, shows separate rows for each difficulty level.';

-- Use security_invoker to respect RLS
ALTER VIEW public.minesweeper_student_achievement_progress SET (security_invoker = on);

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Table: minesweeper_achievements
ALTER TABLE public.minesweeper_achievements ENABLE ROW LEVEL SECURITY;

-- SELECT: Everyone can view achievement definitions (public metadata)
CREATE POLICY "Anyone can view achievement definitions"
  ON public.minesweeper_achievements
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- INSERT/UPDATE/DELETE: Service role only (seeded data, no user modifications)
-- No explicit policies needed - default deny for non-service roles

-- Table: minesweeper_student_achievements
ALTER TABLE public.minesweeper_student_achievements ENABLE ROW LEVEL SECURITY;

-- SELECT: Students can view ALL student achievements (for leaderboard/social features)
CREATE POLICY "Students can view all achievement unlocks"
  ON public.minesweeper_student_achievements
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Only via check_and_unlock_achievements() function (SECURITY DEFINER)
-- No direct INSERT policy - function bypasses RLS
-- This prevents students from manually unlocking achievements

-- UPDATE/DELETE: No one (preserve achievement history)
-- No policies - default deny for all users

COMMENT ON POLICY "Anyone can view achievement definitions" ON public.minesweeper_achievements IS
  'Achievement definitions are public metadata - anyone can view available achievements.';

COMMENT ON POLICY "Students can view all achievement unlocks" ON public.minesweeper_student_achievements IS
  'Students can see which achievements other students have unlocked (for social/competitive features). Cannot insert/update/delete - only check_and_unlock_achievements() can insert.';

-- ============================================================================
-- Grant Execute Permissions
-- ============================================================================

-- Achievement checking function (called automatically by complete_minesweeper_game)
GRANT EXECUTE ON FUNCTION public.check_and_unlock_achievements TO authenticated;

-- Re-grant execute on updated complete_minesweeper_game function
GRANT EXECUTE ON FUNCTION public.complete_minesweeper_game TO authenticated;

-- Grant access to views
GRANT SELECT ON public.minesweeper_student_achievement_progress TO authenticated;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

-- This migration adds a comprehensive achievement system for Minesweeper:
--
-- ✅ Achievement Definitions Table: 4 achievements with French names/descriptions
-- ✅ Student Achievements Table: Tracks unlocks with game references
-- ✅ Automatic Unlock Detection: Integrated into complete_minesweeper_game()
-- ✅ Security: SECURITY DEFINER prevents manual unlocking
-- ✅ Achievement Types:
--    - "Premier pas" (First Victory) - Global, one-time
--    - "Sans drapeaux" (No Flags) - Per difficulty
--    - "Perfectionniste" (Perfect Reveals) - Per difficulty
--    - "Vitesse éclair" (Lightning Speed) - Per difficulty
-- ✅ Progress View: Shows locked/unlocked status for all students
-- ✅ RLS Policies: Public read for definitions, authenticated read for unlocks
-- ✅ Indexes: Optimized for profile queries and achievement stats
--
-- Achievement Unlock Logic:
-- 1. First Victory: No previous wins for this student
-- 2. No Flags: flags_used = 0
-- 3. Perfectionist: cells_revealed = (rows × cols) - mines exactly
-- 4. Lightning Speed: time_seconds < threshold (60s/180s/300s)
--
-- Integration:
-- - complete_minesweeper_game() now returns achievements JSONB array
-- - Client can display toast notifications for newly unlocked achievements
-- - View allows querying student progress and displaying badge showcase
--
-- NEXT STEPS FOR DEVELOPER:
-- 1. Run: pnpm db:migrate
-- 2. Update src/lib/types/database.ts (regenerate from Supabase CLI or manual)
-- 3. Update DATABASE_SCHEMA.md with new tables/functions/views
-- 4. Update client code to handle achievements array in API response
-- 5. Create UI components for:
--    - Achievement badge showcase on profile page
--    - Toast notifications for new achievements
--    - Achievement progress indicators
-- 6. Optional: Add achievement count to leaderboard display
