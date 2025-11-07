-- Migration: Add award_vip_cards_with_filters RPC Function
-- Created: 2025-11-06
--
-- This migration adds a new RPC function that allows teachers to award VIP cards
-- with advanced filtering capabilities. This is used for action-triggered card draws
-- (e.g., "Soldes" card that draws 2 more cards with specific constraints).
--
-- FUNCTION SIGNATURE:
-- -------------------
-- award_vip_cards_with_filters(
--   p_student_id UUID,
--   p_count INT,
--   p_filters JSONB DEFAULT '{}'::JSONB
-- ) RETURNS JSONB
--
-- FILTERS SUPPORTED (JSONB):
-- --------------------------
-- {
--   "forceRarity": "common" | "rare" | "epic" | "legendary",
--   "minRarity": "common" | "rare" | "epic" | "legendary",
--   "excludeCardIds": ["card-id-1", "card-id-2"],
--   "onlyCardsWithActions": true | false
-- }
--
-- FILTER BEHAVIORS:
-- -----------------
-- 1. forceRarity: Forces ALL drawn cards to be of the specified rarity
--    - Ignores normal probability distribution
--    - Only selects from enabled cards of that rarity
--
-- 2. minRarity: Guarantees AT LEAST 1 card of the minimum rarity or higher
--    - First card: drawn from minRarity or higher (weighted by rarity)
--    - Remaining cards: drawn normally following probability distribution
--    - Rarity hierarchy: common < rare < epic < legendary
--
-- 3. excludeCardIds: Excludes specific card IDs from the selection pool
--    - Useful for preventing duplicates or excluding certain cards
--
-- 4. onlyCardsWithActions: Only draws cards that have action definitions
--    - Filters WHERE action IS NOT NULL in vip_card_templates
--
-- SECURITY:
-- ---------
-- - SECURITY DEFINER: Bypasses RLS (function runs with creator's permissions)
-- - Teacher validation: Only teachers can call this function
-- - Student ownership: Teacher must own the student via class_members
-- - Race condition protection: Uses SELECT FOR UPDATE on profiles
--
-- RETURN VALUE:
-- -------------
-- JSONB array of drawn cards with full details:
-- {
--   "cards": [
--     {
--       "cardId": "soldes",
--       "instanceId": "uuid-of-instance",
--       "name": "Soldes",
--       "rarity": "common",
--       "earnedAt": "2025-11-06T10:52:10Z"
--     }
--   ]
-- }

-- ============================================================================
-- DROP EXISTING FUNCTION (IDEMPOTENCY)
-- ============================================================================

DROP FUNCTION IF EXISTS public.award_vip_cards_with_filters(UUID, INT, JSONB);

-- ============================================================================
-- CREATE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_vip_cards_with_filters(
  p_student_id UUID,
  p_count INT,
  p_filters JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
SECURITY DEFINER -- Run with function creator's permissions (bypasses RLS)
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  -- Constants
  c_min_count CONSTANT INT := 1;
  c_max_count CONSTANT INT := 10;

  -- Authorization variables
  v_caller_id UUID;
  v_is_teacher BOOLEAN;
  v_student_in_class BOOLEAN;

  -- Filter variables (parsed from p_filters JSONB)
  v_force_rarity TEXT;
  v_min_rarity TEXT;
  v_exclude_card_ids TEXT[];
  v_only_cards_with_actions BOOLEAN;

  -- Rarity probabilities (for normal draw and minRarity enforcement)
  v_common_prob INTEGER;
  v_rare_prob INTEGER;
  v_epic_prob INTEGER;
  v_legendary_prob INTEGER;
  v_common_max INTEGER;
  v_rare_max INTEGER;
  v_epic_max INTEGER;

  -- Student profile variables
  v_vip_cards JSONB;

  -- Card drawing variables
  v_drawn_cards JSONB := '[]'::jsonb;
  v_card_id TEXT;
  v_instance_id UUID;
  v_earned_at TIMESTAMPTZ;
  v_new_card_instance JSONB;
  v_loop_counter INT;

  -- Rarity selection (for minRarity and normal draws)
  v_roll INTEGER;
  v_selected_rarity TEXT;

  -- Card details for return value
  v_card_name TEXT;
  v_card_rarity TEXT;

  -- Available cards count (for validation)
  v_available_cards_count INT;

BEGIN
  -- ========================================
  -- 1. VALIDATE INPUT PARAMETERS
  -- ========================================

  -- Validate count range
  IF p_count < c_min_count OR p_count > c_max_count THEN
    RAISE EXCEPTION 'Invalid count: Must be between % and % (received: %)',
      c_min_count, c_max_count, p_count;
  END IF;

  -- Validate student exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_student_id) THEN
    RAISE EXCEPTION 'Student not found: %', p_student_id;
  END IF;

  -- ========================================
  -- 2. AUTHORIZATION
  -- ========================================

  v_caller_id := auth.uid();
  v_is_teacher := is_teacher_or_admin();

  -- Only teachers can call this function
  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers and admins can award VIP cards with filters';
  END IF;

  -- Verify student is in teacher's classes
  SELECT EXISTS (
    SELECT 1
    FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_student_id
      AND c.teacher_id = v_caller_id
  ) INTO v_student_in_class;

  IF NOT v_student_in_class THEN
    RAISE EXCEPTION 'Unauthorized: Student is not in your classes';
  END IF;

  -- ========================================
  -- 3. PARSE FILTERS FROM JSONB
  -- ========================================

  -- Extract forceRarity filter (optional)
  v_force_rarity := p_filters->>'forceRarity';

  -- Validate forceRarity value if provided
  IF v_force_rarity IS NOT NULL AND v_force_rarity NOT IN ('common', 'rare', 'epic', 'legendary') THEN
    RAISE EXCEPTION 'Invalid forceRarity filter: Must be common, rare, epic, or legendary (received: %)', v_force_rarity;
  END IF;

  -- Extract minRarity filter (optional)
  v_min_rarity := p_filters->>'minRarity';

  -- Validate minRarity value if provided
  IF v_min_rarity IS NOT NULL AND v_min_rarity NOT IN ('common', 'rare', 'epic', 'legendary') THEN
    RAISE EXCEPTION 'Invalid minRarity filter: Must be common, rare, epic, or legendary (received: %)', v_min_rarity;
  END IF;

  -- Extract excludeCardIds filter (optional array)
  IF p_filters ? 'excludeCardIds' THEN
    SELECT ARRAY(
      SELECT jsonb_array_elements_text(p_filters->'excludeCardIds')
    ) INTO v_exclude_card_ids;
  ELSE
    v_exclude_card_ids := ARRAY[]::TEXT[];
  END IF;

  -- Extract onlyCardsWithActions filter (optional boolean)
  v_only_cards_with_actions := COALESCE((p_filters->>'onlyCardsWithActions')::boolean, FALSE);

  RAISE NOTICE 'Filters parsed: forceRarity=%, minRarity=%, excludeCardIds=%, onlyCardsWithActions=%',
    v_force_rarity, v_min_rarity, v_exclude_card_ids, v_only_cards_with_actions;

  -- ========================================
  -- 4. VALIDATE FILTERS COMPATIBILITY
  -- ========================================

  -- forceRarity and minRarity are mutually exclusive
  IF v_force_rarity IS NOT NULL AND v_min_rarity IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid filters: forceRarity and minRarity cannot be used together';
  END IF;

  -- Check if any cards match the filters
  SELECT COUNT(*) INTO v_available_cards_count
  FROM vip_card_templates
  WHERE is_enabled = TRUE
    AND (v_force_rarity IS NULL OR rarity = v_force_rarity)
    AND (v_exclude_card_ids IS NULL OR NOT (id = ANY(v_exclude_card_ids)))
    AND (NOT v_only_cards_with_actions OR action IS NOT NULL);

  IF v_available_cards_count = 0 THEN
    RAISE EXCEPTION 'No cards available matching filters: forceRarity=%, excludeCardIds=%, onlyCardsWithActions=%',
      v_force_rarity, v_exclude_card_ids, v_only_cards_with_actions;
  END IF;

  RAISE NOTICE 'Available cards matching filters: %', v_available_cards_count;

  -- ========================================
  -- 5. LOCK STUDENT PROFILE (PREVENT RACE CONDITIONS)
  -- ========================================

  -- Use SELECT FOR UPDATE to prevent concurrent modifications
  SELECT vip_cards
  INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  -- Initialize vip_cards if null
  v_vip_cards := COALESCE(v_vip_cards, '{}'::jsonb);

  -- ========================================
  -- 6. LOAD RARITY PROBABILITIES (FOR NON-FORCED DRAWS)
  -- ========================================

  -- Only load probabilities if not using forceRarity
  IF v_force_rarity IS NULL THEN
    -- Read active config from vip_card_config table
    SELECT
      common_probability,
      rare_probability,
      epic_probability,
      legendary_probability
    INTO
      v_common_prob, v_rare_prob, v_epic_prob, v_legendary_prob
    FROM vip_card_config
    WHERE is_active = TRUE
    LIMIT 1;

    -- Fallback to default probabilities if no active config found
    IF v_common_prob IS NULL THEN
      v_common_prob := 60;
      v_rare_prob := 25;
      v_epic_prob := 12;
      v_legendary_prob := 3;
      RAISE NOTICE 'No active config found, using default probabilities';
    END IF;

    -- Calculate cumulative probability ranges
    v_common_max := v_common_prob;                          -- 1-60
    v_rare_max := v_common_max + v_rare_prob;               -- 61-85
    v_epic_max := v_rare_max + v_epic_prob;                 -- 86-97
    -- legendary is anything above v_epic_max (98-100)

    RAISE NOTICE 'Using rarity probabilities: common=%, rare=%, epic=%, legendary=%',
      v_common_prob, v_rare_prob, v_epic_prob, v_legendary_prob;
  END IF;

  -- ========================================
  -- 7. DRAW CARDS WITH FILTERS
  -- ========================================

  FOR v_loop_counter IN 1..p_count LOOP

    -- ------------------------------------
    -- STEP 1: Determine Rarity for This Card
    -- ------------------------------------

    IF v_force_rarity IS NOT NULL THEN
      -- FILTER MODE: forceRarity
      -- All cards must be of the forced rarity
      v_selected_rarity := v_force_rarity;

      RAISE NOTICE 'Draw %: forced rarity=%', v_loop_counter, v_selected_rarity;

    ELSIF v_min_rarity IS NOT NULL AND v_loop_counter = 1 THEN
      -- FILTER MODE: minRarity (FIRST CARD ONLY)
      -- First card must be at least minRarity or higher
      -- Use weighted selection from eligible rarities only

      -- Map minRarity to eligible rarities (current and higher)
      -- Rarity hierarchy: common < rare < epic < legendary
      v_roll := floor(random() * 100 + 1)::int;

      IF v_min_rarity = 'common' THEN
        -- All rarities eligible (normal draw)
        IF v_roll <= v_common_max THEN
          v_selected_rarity := 'common';
        ELSIF v_roll <= v_rare_max THEN
          v_selected_rarity := 'rare';
        ELSIF v_roll <= v_epic_max THEN
          v_selected_rarity := 'epic';
        ELSE
          v_selected_rarity := 'legendary';
        END IF;

      ELSIF v_min_rarity = 'rare' THEN
        -- Only rare, epic, legendary eligible
        -- Recalculate probabilities: rare/(rare+epic+legendary), etc.
        DECLARE
          v_eligible_total INT;
          v_rare_cutoff INT;
          v_epic_cutoff INT;
        BEGIN
          v_eligible_total := v_rare_prob + v_epic_prob + v_legendary_prob;
          v_rare_cutoff := (v_rare_prob * 100 / v_eligible_total);
          v_epic_cutoff := v_rare_cutoff + (v_epic_prob * 100 / v_eligible_total);

          IF v_roll <= v_rare_cutoff THEN
            v_selected_rarity := 'rare';
          ELSIF v_roll <= v_epic_cutoff THEN
            v_selected_rarity := 'epic';
          ELSE
            v_selected_rarity := 'legendary';
          END IF;
        END;

      ELSIF v_min_rarity = 'epic' THEN
        -- Only epic, legendary eligible
        DECLARE
          v_eligible_total INT;
          v_epic_cutoff INT;
        BEGIN
          v_eligible_total := v_epic_prob + v_legendary_prob;
          v_epic_cutoff := (v_epic_prob * 100 / v_eligible_total);

          IF v_roll <= v_epic_cutoff THEN
            v_selected_rarity := 'epic';
          ELSE
            v_selected_rarity := 'legendary';
          END IF;
        END;

      ELSIF v_min_rarity = 'legendary' THEN
        -- Only legendary eligible
        v_selected_rarity := 'legendary';

      END IF;

      RAISE NOTICE 'Draw % (minRarity=%): rolled %, selected rarity=%',
        v_loop_counter, v_min_rarity, v_roll, v_selected_rarity;

    ELSE
      -- NORMAL MODE: Weighted rarity selection (no filters or subsequent minRarity cards)
      v_roll := floor(random() * 100 + 1)::int;

      IF v_roll <= v_common_max THEN
        v_selected_rarity := 'common';
      ELSIF v_roll <= v_rare_max THEN
        v_selected_rarity := 'rare';
      ELSIF v_roll <= v_epic_max THEN
        v_selected_rarity := 'epic';
      ELSE
        v_selected_rarity := 'legendary';
      END IF;

      RAISE NOTICE 'Draw %: rolled %, selected rarity=%', v_loop_counter, v_roll, v_selected_rarity;

    END IF;

    -- ------------------------------------
    -- STEP 2: Select Random Card from Filtered Pool
    -- ------------------------------------

    SELECT id, name, rarity INTO v_card_id, v_card_name, v_card_rarity
    FROM vip_card_templates
    WHERE is_enabled = TRUE
      AND rarity = v_selected_rarity
      AND (v_exclude_card_ids IS NULL OR NOT (id = ANY(v_exclude_card_ids)))
      AND (NOT v_only_cards_with_actions OR action IS NOT NULL)
    ORDER BY random()
    LIMIT 1;

    -- ------------------------------------
    -- STEP 3: Fallback if No Cards Match Filters
    -- ------------------------------------

    IF v_card_id IS NULL THEN
      RAISE NOTICE 'No enabled cards for rarity=% with filters, falling back to common', v_selected_rarity;

      -- Fallback to common rarity with same filters
      SELECT id, name, rarity INTO v_card_id, v_card_name, v_card_rarity
      FROM vip_card_templates
      WHERE rarity = 'common'
        AND is_enabled = TRUE
        AND (v_exclude_card_ids IS NULL OR NOT (id = ANY(v_exclude_card_ids)))
        AND (NOT v_only_cards_with_actions OR action IS NOT NULL)
      ORDER BY random()
      LIMIT 1;

      -- If still no cards, abort
      IF v_card_id IS NULL THEN
        RAISE EXCEPTION 'No enabled VIP cards available matching filters (checked % and common)', v_selected_rarity;
      END IF;
    END IF;

    RAISE NOTICE 'Drew card: % (name=%, rarity=%)', v_card_id, v_card_name, v_card_rarity;

    -- ------------------------------------
    -- STEP 4: Create Card Instance
    -- ------------------------------------

    -- Generate unique instance ID
    v_instance_id := gen_random_uuid();

    -- Capture earned timestamp
    v_earned_at := NOW();

    -- Create new card instance
    v_new_card_instance := jsonb_build_object(
      'cardId', v_card_id,
      'earnedAt', v_earned_at,
      'usedAt', null
    );

    -- Add to student's vip_cards JSONB
    v_vip_cards := v_vip_cards || jsonb_build_object(
      v_instance_id::text,
      v_new_card_instance
    );

    -- Add to results array with full card details
    v_drawn_cards := v_drawn_cards || jsonb_build_object(
      'cardId', v_card_id,
      'instanceId', v_instance_id,
      'name', v_card_name,
      'rarity', v_card_rarity,
      'earnedAt', v_earned_at
    );

  END LOOP;

  -- ========================================
  -- 8. UPDATE STUDENT PROFILE
  -- ========================================

  UPDATE profiles
  SET
    vip_cards = v_vip_cards,
    updated_at = NOW()
  WHERE id = p_student_id;

  -- ========================================
  -- 9. RETURN RESULTS
  -- ========================================

  RETURN jsonb_build_object(
    'cards', v_drawn_cards
  );

END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permission to authenticated users
-- Note: Authorization is handled inside the function (teacher validation)
GRANT EXECUTE ON FUNCTION public.award_vip_cards_with_filters(UUID, INT, JSONB) TO authenticated;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.award_vip_cards_with_filters(UUID, INT, JSONB) IS
'Awards VIP cards to a student with advanced filtering capabilities. Used for action-triggered card draws (e.g., "Soldes" card that draws 2 more cards). Supports filters: forceRarity (force all cards to specific rarity), minRarity (guarantee at least 1 card of minimum rarity or higher), excludeCardIds (exclude specific cards), onlyCardsWithActions (only draw cards with actions). Only teachers can call this function. Uses SELECT FOR UPDATE to prevent race conditions. Returns JSONB array of drawn cards with full details (cardId, instanceId, name, rarity, earnedAt).';
