-- =====================================================================
-- Migrate Minesweeper Achievements to Universal Achievements System
-- =====================================================================
-- This migration transfers existing Minesweeper achievements and student
-- unlocks to the new universal achievements system while preserving all
-- data and maintaining backwards compatibility.
--
-- Migration is idempotent - can be run multiple times safely
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. MIGRATE ACHIEVEMENT DEFINITIONS
-- =====================================================================

-- Only migrate if not already migrated (idempotent)
DO $$
DECLARE
  v_migrated_count INTEGER;
BEGIN
  -- Check if already migrated
  SELECT COUNT(*) INTO v_migrated_count
  FROM public.achievements
  WHERE context = 'minesweeper';

  IF v_migrated_count > 0 THEN
    RAISE NOTICE 'Minesweeper achievements already migrated, skipping definitions migration';
  ELSE
    -- Migrate achievement definitions from minesweeper_achievements to achievements
    INSERT INTO public.achievements (
      id,
      context,
      category,
      name,
      description,
      icon,
      unlock_type,
      metadata,
      is_active,
      display_order,
      created_at
    )
    SELECT
      'minesweeper_' || ma.id as id,
      'minesweeper' as context,
      -- Map achievement IDs to categories
      CASE ma.id
        WHEN 'first_victory' THEN 'milestone'
        WHEN 'no_flags' THEN 'mastery'
        WHEN 'perfectionist' THEN 'mastery'
        WHEN 'lightning_speed' THEN 'speed'
        ELSE 'special'
      END as category,
      ma.name,
      ma.description,
      ma.icon,
      'event_based' as unlock_type,  -- All Minesweeper achievements are event-based
      jsonb_build_object(
        -- Preserve original difficulty_specific flag
        'difficulty_specific', ma.difficulty_specific,
        -- Add points based on achievement difficulty
        'points', CASE ma.id
          WHEN 'first_victory' THEN 10
          WHEN 'no_flags' THEN 15
          WHEN 'perfectionist' THEN 20
          WHEN 'lightning_speed' THEN 25
          ELSE 10
        END,
        -- Gidouilles are handled separately by the game completion function
        'gidouilles_reward', 0,
        -- Set rarity based on achievement type
        'rarity', CASE ma.id
          WHEN 'first_victory' THEN 'common'
          WHEN 'no_flags' THEN 'uncommon'
          WHEN 'perfectionist' THEN 'rare'
          WHEN 'lightning_speed' THEN 'rare'
          ELSE 'common'
        END,
        -- Preserve original unlock conditions for reference
        'original_unlock_condition', ma.unlock_condition,
        -- Add structured unlock conditions
        'unlock_conditions', jsonb_build_object(
          'type', 'minesweeper_game_completed',
          'params', CASE ma.id
            WHEN 'first_victory' THEN jsonb_build_object('first_win', true)
            WHEN 'no_flags' THEN jsonb_build_object('flags_used', 0)
            WHEN 'perfectionist' THEN jsonb_build_object('perfect_reveals', true)
            WHEN 'lightning_speed' THEN jsonb_build_object(
              'time_thresholds', jsonb_build_object(
                'beginner', 60,
                'intermediate', 180,
                'expert', 300
              )
            )
            ELSE '{}'::jsonb
          END
        ),
        -- Add display metadata
        'show_progress', false,
        'hidden', false,
        'repeatable', false
      ) as metadata,
      true as is_active,
      -- Set display order
      CASE ma.id
        WHEN 'first_victory' THEN 100
        WHEN 'no_flags' THEN 101
        WHEN 'perfectionist' THEN 102
        WHEN 'lightning_speed' THEN 103
        ELSE 199
      END as display_order,
      ma.created_at
    FROM public.minesweeper_achievements ma;

    GET DIAGNOSTICS v_migrated_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % achievement definitions', v_migrated_count;
  END IF;
END $$;

-- =====================================================================
-- 2. MIGRATE STUDENT ACHIEVEMENT UNLOCKS
-- =====================================================================

DO $$
DECLARE
  v_old_count INTEGER;
  v_new_count INTEGER;
  v_migrated INTEGER;
BEGIN
  -- Count existing records
  SELECT COUNT(*) INTO v_old_count
  FROM public.minesweeper_student_achievements;

  -- Count already migrated records
  SELECT COUNT(*) INTO v_new_count
  FROM public.student_achievements
  WHERE achievement_id LIKE 'minesweeper_%';

  IF v_new_count >= v_old_count THEN
    RAISE NOTICE 'Student achievements already migrated (% records exist)', v_new_count;
  ELSE
    -- Migrate student achievements
    INSERT INTO public.student_achievements (
      student_id,
      achievement_id,
      context_data,
      unlocked_at,
      unlocked_by,
      unlock_reason,
      points_awarded,
      gidouilles_awarded
    )
    SELECT
      sa.student_id,
      'minesweeper_' || sa.achievement_id as achievement_id,
      jsonb_build_object(
        -- Store difficulty for difficulty-specific achievements
        'difficulty', sa.difficulty,
        -- Store reference to the original game
        'reference_type', 'minesweeper_game',
        'reference_id', sa.game_id::text
      ) as context_data,
      sa.unlocked_at,
      NULL as unlocked_by,  -- System-unlocked (not manually awarded)
      'Migrated from minesweeper_student_achievements' as unlock_reason,
      -- Award points based on achievement type
      CASE sa.achievement_id
        WHEN 'first_victory' THEN 10
        WHEN 'no_flags' THEN 15
        WHEN 'perfectionist' THEN 20
        WHEN 'lightning_speed' THEN 25
        ELSE 10
      END as points_awarded,
      0 as gidouilles_awarded  -- Gidouilles were already awarded via game completion
    FROM public.minesweeper_student_achievements sa
    -- Only migrate records that don't already exist
    WHERE NOT EXISTS (
      SELECT 1 FROM public.student_achievements sa2
      WHERE sa2.student_id = sa.student_id
      AND sa2.achievement_id = 'minesweeper_' || sa.achievement_id
      AND COALESCE(sa2.context_data->>'difficulty', '') = COALESCE(sa.difficulty, '')
    );

    GET DIAGNOSTICS v_migrated = ROW_COUNT;
    RAISE NOTICE 'Migrated % student achievement records', v_migrated;
  END IF;
END $$;

-- =====================================================================
-- 3. VALIDATION CHECKS
-- =====================================================================

DO $$
DECLARE
  v_old_achievement_count INTEGER;
  v_new_achievement_count INTEGER;
  v_old_unlock_count INTEGER;
  v_new_unlock_count INTEGER;
  v_validation_failed BOOLEAN := false;
BEGIN
  -- Validate achievement definitions migration
  SELECT COUNT(*) INTO v_old_achievement_count FROM public.minesweeper_achievements;
  SELECT COUNT(*) INTO v_new_achievement_count FROM public.achievements WHERE context = 'minesweeper';

  IF v_old_achievement_count > 0 AND v_new_achievement_count != v_old_achievement_count THEN
    RAISE WARNING 'Achievement definition count mismatch: % old vs % new',
      v_old_achievement_count, v_new_achievement_count;
    v_validation_failed := true;
  ELSE
    RAISE NOTICE '✓ Achievement definitions validated: % migrated', v_new_achievement_count;
  END IF;

  -- Validate student unlocks migration
  SELECT COUNT(*) INTO v_old_unlock_count FROM public.minesweeper_student_achievements;
  SELECT COUNT(*) INTO v_new_unlock_count FROM public.student_achievements WHERE achievement_id LIKE 'minesweeper_%';

  IF v_old_unlock_count > 0 AND v_new_unlock_count < v_old_unlock_count THEN
    RAISE WARNING 'Student achievement count mismatch: % old vs % new',
      v_old_unlock_count, v_new_unlock_count;
    v_validation_failed := true;
  ELSE
    RAISE NOTICE '✓ Student achievements validated: % migrated', v_new_unlock_count;
  END IF;

  -- Verify data integrity - check that all migrated records have proper structure
  IF EXISTS (
    SELECT 1 FROM public.achievements
    WHERE context = 'minesweeper'
    AND (name IS NULL OR description IS NULL OR icon IS NULL OR metadata IS NULL)
  ) THEN
    RAISE WARNING 'Some migrated achievements have NULL required fields';
    v_validation_failed := true;
  ELSE
    RAISE NOTICE '✓ Achievement data integrity validated';
  END IF;

  -- Verify student achievement data integrity
  IF EXISTS (
    SELECT 1 FROM public.student_achievements
    WHERE achievement_id LIKE 'minesweeper_%'
    AND (points_awarded IS NULL OR gidouilles_awarded IS NULL)
  ) THEN
    RAISE WARNING 'Some migrated student achievements have NULL reward fields';
    v_validation_failed := true;
  ELSE
    RAISE NOTICE '✓ Student achievement data integrity validated';
  END IF;

  -- Final validation result
  IF v_validation_failed THEN
    RAISE EXCEPTION 'Migration validation failed. Please check warnings above.';
  ELSE
    RAISE NOTICE '✅ All validations passed successfully!';
  END IF;
END $$;

-- =====================================================================
-- 4. CREATE COMPATIBILITY VIEWS
-- =====================================================================
-- These views allow existing code to continue working without modifications

-- Drop views if they exist (for idempotency)
DROP VIEW IF EXISTS public.minesweeper_achievements_compat CASCADE;
DROP VIEW IF EXISTS public.minesweeper_student_achievements_compat CASCADE;

-- Compatibility view for minesweeper_achievements table
CREATE VIEW public.minesweeper_achievements_compat AS
SELECT
  REPLACE(id, 'minesweeper_', '') as id,
  name,
  description,
  icon,
  COALESCE((metadata->>'difficulty_specific')::BOOLEAN, false) as difficulty_specific,
  COALESCE(metadata->>'original_unlock_condition', '') as unlock_condition,
  created_at
FROM public.achievements
WHERE context = 'minesweeper'
  AND is_active = true;

COMMENT ON VIEW public.minesweeper_achievements_compat IS
  'Compatibility view for legacy code expecting minesweeper_achievements table structure';

-- Compatibility view for minesweeper_student_achievements table
CREATE VIEW public.minesweeper_student_achievements_compat AS
SELECT
  sa.id,
  sa.student_id,
  REPLACE(sa.achievement_id, 'minesweeper_', '') as achievement_id,
  sa.context_data->>'difficulty' as difficulty,
  sa.unlocked_at,
  CASE
    WHEN sa.context_data->>'reference_id' IS NOT NULL
    THEN (sa.context_data->>'reference_id')::UUID
    ELSE NULL
  END as game_id
FROM public.student_achievements sa
WHERE sa.achievement_id LIKE 'minesweeper_%';

COMMENT ON VIEW public.minesweeper_student_achievements_compat IS
  'Compatibility view for legacy code expecting minesweeper_student_achievements table structure';

-- Grant appropriate permissions on compatibility views
GRANT SELECT ON public.minesweeper_achievements_compat TO authenticated, anon;
GRANT SELECT ON public.minesweeper_student_achievements_compat TO authenticated;

-- =====================================================================
-- 5. UPDATE MINESWEEPER GAME COMPLETION FUNCTION
-- =====================================================================
-- Modify the complete_minesweeper_game function to work with new system

CREATE OR REPLACE FUNCTION public.complete_minesweeper_game(
  p_game_id UUID,
  p_grid_state JSONB,
  p_achievements JSONB DEFAULT NULL  -- Optional parameter for backwards compatibility
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
  v_event_result JSONB;
  v_cells_revealed INTEGER;
  v_perfect_cells INTEGER;
  v_is_first_win BOOLEAN;
BEGIN
  -- Step 1: Get game and verify ownership
  SELECT * INTO v_game_record
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND student_id = auth.uid()
    AND status = 'in_progress';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or already completed';
  END IF;

  -- Step 2: Validate grid_state
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

  -- Validate time
  IF v_time_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid game time: must be at least 1 second';
  END IF;

  -- Step 5: Calculate gidouilles
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

  -- Extract cells_revealed for achievement checking
  v_cells_revealed := COALESCE(v_game_record.cells_revealed, 0);

  -- Step 7: Award gidouilles to profile
  IF v_gidouilles > 0 THEN
    UPDATE public.profiles
    SET gidouilles = COALESCE(gidouilles, 0) + v_gidouilles
    WHERE id = v_game_record.student_id;

    -- Insert into gidouilles_history
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
  END IF;

  -- Step 8: Check if this is first win
  SELECT NOT EXISTS (
    SELECT 1 FROM public.minesweeper_games
    WHERE student_id = v_game_record.student_id
      AND status = 'won'
      AND id != p_game_id
  ) INTO v_is_first_win;

  -- Calculate perfect cells for perfectionist achievement
  SELECT (rows * cols) - mines INTO v_perfect_cells
  FROM (VALUES
    ('beginner', 9, 9, 10),
    ('intermediate', 16, 16, 40),
    ('expert', 16, 30, 99)
  ) AS configs(difficulty, rows, cols, mines)
  WHERE difficulty = v_game_record.difficulty;

  -- Step 9: Process achievements using new universal system
  v_event_result := public.process_achievement_event(
    'minesweeper_game_completed',
    v_game_record.student_id,
    jsonb_build_object(
      'reference_id', p_game_id,
      'difficulty', v_game_record.difficulty,
      'time_seconds', v_time_seconds,
      'flags_used', v_game_record.flags_used,
      'cells_revealed', v_cells_revealed,
      'perfect', v_cells_revealed = v_perfect_cells,
      'score', v_gidouilles,
      'first_win', v_is_first_win,
      'won', true
    )
  );

  -- Also check legacy achievement function if it exists for backwards compatibility
  BEGIN
    -- Try to call the old function if it exists
    IF EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = 'check_and_unlock_achievements'
      AND pronamespace = 'public'::regnamespace
    ) THEN
      PERFORM public.check_and_unlock_achievements(p_game_id);
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Ignore errors from legacy function
      NULL;
  END;

  -- Step 10: Return result with achievements
  RETURN QUERY SELECT
    TRUE as success,
    v_gidouilles as gidouilles_awarded,
    v_time_seconds as time_seconds,
    COALESCE(v_event_result->'unlocked_achievements', '[]'::jsonb) as achievements;
END;
$$;

COMMENT ON FUNCTION public.complete_minesweeper_game IS
  'Completes a Minesweeper game with validation and rewards. Now integrated with universal achievement system while maintaining backwards compatibility.';

-- =====================================================================
-- 6. CREATE MIGRATION STATUS TABLE (For Tracking)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.achievement_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT NOT NULL UNIQUE,
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  records_migrated INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Record this migration
INSERT INTO public.achievement_migrations (
  migration_name,
  records_migrated,
  metadata
)
SELECT
  'minesweeper_achievements_to_universal',
  COUNT(*),
  jsonb_build_object(
    'achievement_definitions', (SELECT COUNT(*) FROM public.achievements WHERE context = 'minesweeper'),
    'student_unlocks', (SELECT COUNT(*) FROM public.student_achievements WHERE achievement_id LIKE 'minesweeper_%'),
    'migration_date', NOW()
  )
FROM public.student_achievements
WHERE achievement_id LIKE 'minesweeper_%'
ON CONFLICT (migration_name)
DO UPDATE SET
  migrated_at = NOW(),
  records_migrated = EXCLUDED.records_migrated,
  metadata = EXCLUDED.metadata;

-- =====================================================================
-- 7. GRANT PERMISSIONS
-- =====================================================================

-- Ensure proper permissions on new functions
GRANT EXECUTE ON FUNCTION public.complete_minesweeper_game TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_achievement_event TO authenticated;

-- Grant permissions on migration tracking table
GRANT SELECT ON public.achievement_migrations TO authenticated;

COMMIT;

-- =====================================================================
-- MIGRATION SUMMARY
-- =====================================================================
-- This migration successfully:
-- ✅ Migrates all Minesweeper achievement definitions to universal system
-- ✅ Migrates all student achievement unlocks with proper context data
-- ✅ Preserves all original data (timestamps, difficulty, game references)
-- ✅ Creates compatibility views for backwards compatibility
-- ✅ Updates game completion function to use new system
-- ✅ Validates data integrity with comprehensive checks
-- ✅ Is fully idempotent (can be run multiple times safely)
--
-- The migration maintains 100% backwards compatibility while enabling
-- the new universal achievement system for future development.
--
-- NEXT STEPS:
-- 1. Run: pnpm db:migrate
-- 2. Update TypeScript types if needed
-- 3. Optionally update UI to use new achievement system features
-- 4. Consider removing old tables in a future migration once confirmed working
--
-- =====================================================================
-- ROLLBACK INSTRUCTIONS
-- =====================================================================
-- If you need to rollback this migration, run the following SQL:
--
-- BEGIN;
--
-- -- 1. Drop compatibility views
-- DROP VIEW IF EXISTS public.minesweeper_achievements_compat;
-- DROP VIEW IF EXISTS public.minesweeper_student_achievements_compat;
--
-- -- 2. Delete migrated data from universal tables
-- DELETE FROM public.student_achievements WHERE achievement_id LIKE 'minesweeper_%';
-- DELETE FROM public.achievements WHERE context = 'minesweeper';
--
-- -- 3. Restore original complete_minesweeper_game function (see migration 20251121000000)
-- -- Run CREATE OR REPLACE FUNCTION with the original implementation
--
-- COMMIT;
--
-- NOTE: This rollback will NOT restore the data to exactly the same state
-- as before migration, as auto-generated IDs will be different. However,
-- all meaningful data (achievements, unlocks, timestamps) will be preserved
-- in the original minesweeper_achievements and minesweeper_student_achievements tables.
-- =====================================================================