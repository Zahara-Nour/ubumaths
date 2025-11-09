-- Migration: Add VIP Cards History Tracking
-- Created: 2025-11-08
--
-- This migration adds a permanent history of all VIP cards ever earned by students.
-- Unlike vip_cards (which gets updated when cards are used/exchanged), vip_cards_history
-- is an append-only record that never loses data.
--
-- DATA STRUCTURE:
-- ---------------
-- vip_cards_history is a JSONB object mapping cardId -> firstEarnedAt timestamp
-- Example:
-- {
--   "card-uuid-1": "2025-01-15T10:30:00Z",
--   "card-uuid-2": "2025-01-20T14:45:00Z"
-- }
--
-- AUTOMATIC TRACKING:
-- -------------------
-- A trigger automatically updates vip_cards_history whenever vip_cards changes.
-- New cardIds are added to history with their first earned timestamp.
-- History entries are never removed, even if the card is used or exchanged.
--
-- BACKFILL:
-- ---------
-- Existing profiles with vip_cards are backfilled with historical data.

-- ============================================================================
-- STEP 1: Add vip_cards_history column to profiles table
-- ============================================================================

DO $$
BEGIN
  -- Add column if it doesn't exist (idempotent)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'vip_cards_history'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN vip_cards_history JSONB NOT NULL DEFAULT '{}'::jsonb;

    -- Add comment for documentation
    COMMENT ON COLUMN profiles.vip_cards_history IS
    'Permanent history of all VIP cards ever earned by the student. Maps cardId to firstEarnedAt timestamp. Never deleted, even when cards are used/exchanged.';
  END IF;
END $$;


-- ============================================================================
-- STEP 2: Create function to update vip_cards_history
-- ============================================================================

CREATE OR REPLACE FUNCTION update_vip_cards_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated permissions to bypass RLS
SET search_path = public
AS $$
DECLARE
  v_card_instance_id TEXT;
  v_card_data JSONB;
  v_card_id TEXT;
  v_earned_at TEXT;
  v_history JSONB;
BEGIN
  -- Initialize history if null (shouldn't happen with NOT NULL DEFAULT, but defensive)
  v_history := COALESCE(NEW.vip_cards_history, '{}'::jsonb);

  -- Only process if vip_cards actually changed
  IF NEW.vip_cards IS DISTINCT FROM OLD.vip_cards THEN

    -- Loop through all card instances in NEW.vip_cards
    FOR v_card_instance_id IN
      SELECT key
      FROM jsonb_each(COALESCE(NEW.vip_cards, '{}'::jsonb))
    LOOP
      -- Get the card data for this instance
      v_card_data := NEW.vip_cards->v_card_instance_id;

      -- Extract cardId from the instance
      v_card_id := v_card_data->>'cardId';

      -- Extract earnedAt timestamp
      v_earned_at := v_card_data->>'earnedAt';

      -- If this cardId is NOT already in history, add it
      -- This ensures we only track the FIRST time each card was earned
      IF v_card_id IS NOT NULL
         AND v_earned_at IS NOT NULL
         AND NOT (v_history ? v_card_id) THEN

        -- Add this cardId to history with its earnedAt timestamp
        v_history := v_history || jsonb_build_object(v_card_id, v_earned_at);
      END IF;
    END LOOP;

    -- Update the history in the NEW row (this will be saved to the database)
    NEW.vip_cards_history := v_history;
  END IF;

  RETURN NEW;
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION update_vip_cards_history() IS
'Trigger function that automatically updates vip_cards_history when vip_cards changes. Adds new cardIds to history with their earnedAt timestamp. Never removes entries from history.';


-- ============================================================================
-- STEP 3: Create trigger on profiles table
-- ============================================================================

-- Drop trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS update_vip_cards_history_trigger ON profiles;

-- Create trigger that fires BEFORE UPDATE
-- This allows us to modify NEW.vip_cards_history before the row is saved
CREATE TRIGGER update_vip_cards_history_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_vip_cards_history();

COMMENT ON TRIGGER update_vip_cards_history_trigger ON profiles IS
'Automatically updates vip_cards_history whenever vip_cards changes. Tracks all VIP cards ever earned by the student.';


-- ============================================================================
-- STEP 4: Backfill existing data
-- ============================================================================

-- Update all existing profiles that have vip_cards
-- Extract all cardIds and their earnedAt timestamps into vip_cards_history
DO $$
DECLARE
  v_profile RECORD;
  v_card_instance_id TEXT;
  v_card_data JSONB;
  v_card_id TEXT;
  v_earned_at TEXT;
  v_history JSONB;
BEGIN
  -- Loop through all profiles that have vip_cards
  FOR v_profile IN
    SELECT id, vip_cards
    FROM profiles
    WHERE vip_cards IS NOT NULL
      AND vip_cards != '{}'::jsonb
      AND (vip_cards_history IS NULL OR vip_cards_history = '{}'::jsonb)
  LOOP
    -- Initialize empty history
    v_history := '{}'::jsonb;

    -- Loop through all card instances in this profile's vip_cards
    FOR v_card_instance_id IN
      SELECT key
      FROM jsonb_each(v_profile.vip_cards)
    LOOP
      -- Get the card data
      v_card_data := v_profile.vip_cards->v_card_instance_id;

      -- Extract cardId and earnedAt
      v_card_id := v_card_data->>'cardId';
      v_earned_at := v_card_data->>'earnedAt';

      -- Add to history if not already present
      -- (This handles the case where the same cardId appears multiple times)
      IF v_card_id IS NOT NULL
         AND v_earned_at IS NOT NULL
         AND NOT (v_history ? v_card_id) THEN

        v_history := v_history || jsonb_build_object(v_card_id, v_earned_at);
      END IF;
    END LOOP;

    -- Update this profile's history
    -- Note: This UPDATE will NOT trigger the update_vip_cards_history_trigger
    -- because we're only updating vip_cards_history, not vip_cards
    UPDATE profiles
    SET vip_cards_history = v_history,
        updated_at = NOW()
    WHERE id = v_profile.id;

  END LOOP;

  -- Log how many profiles were backfilled
  RAISE NOTICE 'Backfilled vip_cards_history for % profiles',
    (SELECT COUNT(*)
     FROM profiles
     WHERE vip_cards IS NOT NULL
       AND vip_cards != '{}'::jsonb);
END $$;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the column was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'vip_cards_history'
  ) THEN
    RAISE EXCEPTION 'Failed to create vip_cards_history column';
  END IF;

  RAISE NOTICE 'Migration completed successfully';
  RAISE NOTICE 'Column: vip_cards_history added to profiles table';
  RAISE NOTICE 'Function: update_vip_cards_history() created';
  RAISE NOTICE 'Trigger: update_vip_cards_history_trigger created';
  RAISE NOTICE 'Backfill: Completed for existing profiles';
END $$;
