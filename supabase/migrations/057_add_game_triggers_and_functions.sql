-- Migration: Add triggers and functions for game tables
-- Description: Automatic game profile creation, updated_at triggers, etc.
-- Author: Claude Code
-- Date: 2025-10-15

-- ============================================================================
-- Function: Auto-create game profile on user creation
-- ============================================================================

CREATE OR REPLACE FUNCTION create_game_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create game profile for students
  IF NEW.role = 'student' THEN
    INSERT INTO game_players (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create game profile when profile is created
CREATE TRIGGER trigger_create_game_profile_on_user_creation
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_game_profile_for_new_user();

-- ============================================================================
-- Function: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all game tables
CREATE TRIGGER trigger_game_players_updated_at
  BEFORE UPDATE ON game_players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_game_spells_updated_at
  BEFORE UPDATE ON game_spells
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_game_monsters_updated_at
  BEFORE UPDATE ON game_monsters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_game_combats_updated_at
  BEFORE UPDATE ON game_combats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_game_challenges_updated_at
  BEFORE UPDATE ON game_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_game_player_achievements_updated_at
  BEFORE UPDATE ON game_player_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_game_leaderboards_updated_at
  BEFORE UPDATE ON game_leaderboards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_game_timeslots_updated_at
  BEFORE UPDATE ON game_timeslots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_game_spell_decks_updated_at
  BEFORE UPDATE ON game_spell_decks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_game_class_settings_updated_at
  BEFORE UPDATE ON game_class_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Update game player last_played_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_game_player_last_played()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE game_players
  SET last_played_at = NOW()
  WHERE user_id = NEW.organizer_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update last_played_at when combat is started
CREATE TRIGGER trigger_update_last_played_on_combat_start
  AFTER INSERT ON game_combats
  FOR EACH ROW
  EXECUTE FUNCTION update_game_player_last_played();

-- ============================================================================
-- Function: Update challenge statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION update_challenge_statistics()
RETURNS TRIGGER AS $$
DECLARE
  total_attempts INTEGER;
  total_successes INTEGER;
  total_time FLOAT;
BEGIN
  -- Count total attempts and successes for this challenge
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE success = true),
    AVG(time_taken / 1000.0) FILTER (WHERE success = true)
  INTO total_attempts, total_successes, total_time
  FROM game_challenge_attempts
  WHERE challenge_id = NEW.challenge_id;

  -- Update challenge stats
  UPDATE game_challenges
  SET
    times_attempted = total_attempts,
    times_succeeded = total_successes,
    avg_time_taken = total_time
  WHERE id = NEW.challenge_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update challenge stats on new attempt
CREATE TRIGGER trigger_update_challenge_stats_on_attempt
  AFTER INSERT ON game_challenge_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_statistics();

-- ============================================================================
-- Function: Ensure only one active spell deck per user
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_single_active_deck()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this deck as active, deactivate all other decks for this user
  IF NEW.is_active = true THEN
    UPDATE game_spell_decks
    SET is_active = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Ensure only one active deck
CREATE TRIGGER trigger_ensure_single_active_deck
  BEFORE INSERT OR UPDATE ON game_spell_decks
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_single_active_deck();

-- ============================================================================
-- Function: Award gidouilles on combat victory
-- ============================================================================

CREATE OR REPLACE FUNCTION award_gidouilles_on_victory()
RETURNS TRIGGER AS $$
DECLARE
  player_id UUID;
  gidouilles_to_award INTEGER;
BEGIN
  -- Only process completed combats with victory
  IF NEW.status = 'completed' AND NEW.outcome = 'victory' THEN
    -- Award gidouilles to all participants
    -- XP to gidouilles: 10:1 ratio + 5 bonus for victory
    gidouilles_to_award := (NEW.xp_gained / 10) + 5;

    -- Award to organizer
    UPDATE profiles
    SET gidouilles = gidouilles + gidouilles_to_award
    WHERE id = NEW.organizer_id;

    -- Award to all ready players
    FOREACH player_id IN ARRAY NEW.ready_player_ids
    LOOP
      UPDATE profiles
      SET gidouilles = gidouilles + gidouilles_to_award
      WHERE id = player_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Award gidouilles on combat completion
CREATE TRIGGER trigger_award_gidouilles_on_combat_victory
  AFTER UPDATE ON game_combats
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION award_gidouilles_on_victory();

-- ============================================================================
-- Function: Update game player combat stats
-- ============================================================================

CREATE OR REPLACE FUNCTION update_player_combat_stats()
RETURNS TRIGGER AS $$
DECLARE
  player_id UUID;
BEGIN
  -- Only process completed combats
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update stats for organizer
    IF NEW.outcome = 'victory' THEN
      UPDATE game_players
      SET
        total_combats = total_combats + 1,
        combats_won = combats_won + 1,
        prestige = prestige + COALESCE(NEW.prestige_gained, 0),
        xp = xp + COALESCE(NEW.xp_gained, 0)
      WHERE user_id = NEW.organizer_id;
    ELSE
      UPDATE game_players
      SET
        total_combats = total_combats + 1,
        combats_lost = combats_lost + 1
      WHERE user_id = NEW.organizer_id;
    END IF;

    -- Update stats for all participants
    FOREACH player_id IN ARRAY NEW.ready_player_ids
    LOOP
      IF NEW.outcome = 'victory' THEN
        UPDATE game_players
        SET
          total_combats = total_combats + 1,
          combats_won = combats_won + 1,
          prestige = prestige + COALESCE(NEW.prestige_gained, 0),
          xp = xp + COALESCE(NEW.xp_gained, 0)
        WHERE user_id = player_id;
      ELSE
        UPDATE game_players
        SET
          total_combats = total_combats + 1,
          combats_lost = combats_lost + 1
        WHERE user_id = player_id;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update player combat stats
CREATE TRIGGER trigger_update_player_combat_stats
  AFTER UPDATE ON game_combats
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_player_combat_stats();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION create_game_profile_for_new_user() IS 'Automatically creates game profile for new student users';
COMMENT ON FUNCTION update_updated_at_column() IS 'Updates the updated_at timestamp on row modification';
COMMENT ON FUNCTION update_game_player_last_played() IS 'Updates player last_played_at when they start a combat';
COMMENT ON FUNCTION update_challenge_statistics() IS 'Aggregates challenge attempt statistics';
COMMENT ON FUNCTION ensure_single_active_deck() IS 'Ensures only one spell deck is active per user';
COMMENT ON FUNCTION award_gidouilles_on_victory() IS 'Awards gidouilles to combat participants on victory';
COMMENT ON FUNCTION update_player_combat_stats() IS 'Updates player combat statistics on combat completion';
