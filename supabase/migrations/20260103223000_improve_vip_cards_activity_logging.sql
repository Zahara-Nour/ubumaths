-- =====================================================================
-- IMPROVE VIP CARDS ACTIVITY LOGGING
-- =====================================================================
-- Fixes:
-- 1. award_vip_card_no_cost(): Add p_source parameter to distinguish
--    'draw' (random) from 'teacher_award' (teacher gives card)
-- 2. execute_trade(): Log 'gained' for receiver with acquired_from='trade'
-- =====================================================================


-- ============================================================================
-- STEP 1: UPDATE award_vip_card_no_cost WITH SOURCE PARAMETER
-- ============================================================================
-- Add optional p_source parameter (default 'draw') to distinguish:
-- - 'draw': Random card draw
-- - 'teacher_award': Teacher manually awards card to student

CREATE OR REPLACE FUNCTION public.award_vip_card_no_cost(
  p_student_id UUID,
  p_card_id TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'draw'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_selected_card_id TEXT;
  v_instance_id UUID;
  v_vip_cards JSONB;
  v_now TIMESTAMPTZ := NOW();
  v_new_instance JSONB;
  v_template RECORD;
BEGIN
  -- ========================================================================
  -- CARD SELECTION
  -- ========================================================================
  -- If no card_id specified, draw random card with weighted rarity probabilities

  IF p_card_id IS NULL THEN
    -- Get active config probabilities from vip_card_config
    WITH config AS (
      SELECT common_probability, rare_probability, epic_probability, legendary_probability
      FROM vip_card_config
      WHERE is_active = TRUE
      LIMIT 1
    ),
    rarity_selection AS (
      SELECT
        CASE
          WHEN random() * 100 < (SELECT common_probability FROM config) THEN 'common'
          WHEN random() * 100 < (SELECT common_probability + rare_probability FROM config) THEN 'rare'
          WHEN random() * 100 < (SELECT common_probability + rare_probability + epic_probability FROM config) THEN 'epic'
          ELSE 'legendary'
        END AS selected_rarity
    )
    SELECT t.id INTO v_selected_card_id
    FROM vip_card_templates t, rarity_selection r
    WHERE t.is_enabled = TRUE
      AND t.rarity = r.selected_rarity
    ORDER BY random()
    LIMIT 1;

    -- Fallback: if no card found for selected rarity, pick any enabled card
    IF v_selected_card_id IS NULL THEN
      SELECT id INTO v_selected_card_id
      FROM vip_card_templates
      WHERE is_enabled = TRUE
      ORDER BY random()
      LIMIT 1;
    END IF;
  ELSE
    v_selected_card_id := p_card_id;
  END IF;

  IF v_selected_card_id IS NULL THEN
    RAISE EXCEPTION 'No VIP card available';
  END IF;

  -- ========================================================================
  -- GET TEMPLATE INFO
  -- ========================================================================

  SELECT uses_total INTO v_template
  FROM vip_card_templates
  WHERE id = v_selected_card_id;

  -- ========================================================================
  -- GET AND LOCK STUDENT'S VIP CARDS
  -- ========================================================================
  -- FOR UPDATE prevents race conditions when multiple awards happen simultaneously

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  -- Initialize as empty object if null
  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  -- ========================================================================
  -- CREATE NEW CARD INSTANCE
  -- ========================================================================
  -- Structure: {"<uuid>": {cardId, earnedAt, usedAt, acquiredFrom, usesRemaining}}

  v_instance_id := gen_random_uuid();
  v_new_instance := jsonb_build_object(
    'cardId', v_selected_card_id,
    'earnedAt', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'usedAt', NULL,
    'acquiredFrom', p_source,  -- Use the source parameter
    'usesRemaining', v_template.uses_total  -- NULL for single-use, integer for multi-use
  );

  -- Add new instance to collection
  v_vip_cards := v_vip_cards || jsonb_build_object(v_instance_id::TEXT, v_new_instance);

  -- ========================================================================
  -- UPDATE PROFILE
  -- ========================================================================

  UPDATE profiles
  SET
    vip_cards = v_vip_cards,
    updated_at = v_now
  WHERE id = p_student_id;

  -- ========================================================================
  -- LOG ACTIVITY
  -- ========================================================================
  -- Use the source parameter for acquired_from

  INSERT INTO vip_cards_activity (
    student_id,
    card_instance_id,
    card_template_id,
    action,
    metadata
  ) VALUES (
    p_student_id,
    v_instance_id::TEXT,
    v_selected_card_id,
    'gained',
    jsonb_build_object(
      'acquired_from', p_source,
      'rarity', (SELECT rarity FROM vip_card_templates WHERE id = v_selected_card_id)
    )
  );

  RETURN v_selected_card_id;
END;
$$;

COMMENT ON FUNCTION public.award_vip_card_no_cost(UUID, TEXT, TEXT) IS
'Awards a VIP card to a student (no cost).
p_source: "draw" for random draw, "teacher_award" for teacher gift.
Logs the "gained" action to vip_cards_activity with source metadata.';


-- ============================================================================
-- STEP 2: UPDATE execute_trade TO LOG RECEIVER'S GAINED ACTION
-- ============================================================================
-- For each card transfer, log TWO activities:
-- 1. Sender: 'traded' with direction='sent'
-- 2. Receiver: 'gained' with acquired_from='trade'

CREATE OR REPLACE FUNCTION public.execute_trade(p_trade_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trade RECORD;
    v_final_trade JSONB;
    v_initiator_cards TEXT[];
    v_initiator_gidouilles INTEGER;
    v_partner_cards TEXT[];
    v_partner_gidouilles INTEGER;
    v_initiator_vip_cards JSONB;
    v_partner_vip_cards JSONB;
    v_card_id TEXT;
    v_card_data JSONB;
    v_card_template_id TEXT;
    v_daily_trade_count INTEGER;
    v_max_trades_per_day INTEGER;
BEGIN
    -- Lock the trade row for update
    SELECT * INTO v_trade
    FROM public.marketplace_trades
    WHERE id = p_trade_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
    END IF;

    -- CRITICAL SECURITY FIX: Verify caller is a participant in the trade
    IF auth.uid() != v_trade.initiator_id AND auth.uid() != v_trade.partner_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Non autorisé: vous devez être participant de cet échange'
        );
    END IF;

    IF v_trade.status != 'negotiating' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trade is not in negotiating status');
    END IF;

    IF v_trade.current_offer IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No offer to execute');
    END IF;

    -- Check daily trade limit for both participants
    SELECT COUNT(*) INTO v_daily_trade_count
    FROM public.marketplace_trades
    WHERE (initiator_id = v_trade.initiator_id OR partner_id = v_trade.initiator_id)
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE;

    -- Get max trades per day from config (default 10)
    SELECT COALESCE(MAX(max_trades_per_day), 10) INTO v_max_trades_per_day
    FROM public.marketplace_config mc
    JOIN public.classes c ON c.school_id = mc.school_id
    JOIN public.class_members cm ON cm.class_id = c.id
    WHERE cm.student_id = v_trade.initiator_id;

    IF v_daily_trade_count >= v_max_trades_per_day THEN
        RETURN jsonb_build_object('success', false, 'error', 'Daily trade limit reached for initiator');
    END IF;

    -- Check partner's daily limit
    SELECT COUNT(*) INTO v_daily_trade_count
    FROM public.marketplace_trades
    WHERE (initiator_id = v_trade.partner_id OR partner_id = v_trade.partner_id)
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE;

    IF v_daily_trade_count >= v_max_trades_per_day THEN
        RETURN jsonb_build_object('success', false, 'error', 'Daily trade limit reached for partner');
    END IF;

    -- Extract trade details
    v_final_trade := v_trade.current_offer;
    v_initiator_cards := ARRAY(SELECT jsonb_array_elements_text(v_final_trade->'from_initiator'->'cards'));
    v_initiator_gidouilles := COALESCE((v_final_trade->'from_initiator'->>'gidouilles')::INTEGER, 0);
    v_partner_cards := ARRAY(SELECT jsonb_array_elements_text(v_final_trade->'from_partner'->'cards'));
    v_partner_gidouilles := COALESCE((v_final_trade->'from_partner'->>'gidouilles')::INTEGER, 0);

    -- CRITICAL: Verify gidouilles balance before proceeding
    IF v_initiator_gidouilles > 0 THEN
        DECLARE
            v_initiator_balance INTEGER;
        BEGIN
            SELECT gidouilles INTO v_initiator_balance
            FROM public.profiles
            WHERE id = v_trade.initiator_id;

            IF v_initiator_balance IS NULL OR v_initiator_balance < v_initiator_gidouilles THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', format('Insufficient gidouilles: initiator has %s but needs %s',
                                   COALESCE(v_initiator_balance, 0), v_initiator_gidouilles)
                );
            END IF;
        END;
    END IF;

    IF v_partner_gidouilles > 0 THEN
        DECLARE
            v_partner_balance INTEGER;
        BEGIN
            SELECT gidouilles INTO v_partner_balance
            FROM public.profiles
            WHERE id = v_trade.partner_id;

            IF v_partner_balance IS NULL OR v_partner_balance < v_partner_gidouilles THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', format('Insufficient gidouilles: partner has %s but needs %s',
                                   COALESCE(v_partner_balance, 0), v_partner_gidouilles)
                );
            END IF;
        END;
    END IF;

    -- Get current VIP cards for both users
    SELECT vip_cards INTO v_initiator_vip_cards
    FROM public.profiles
    WHERE id = v_trade.initiator_id
    FOR UPDATE;

    SELECT vip_cards INTO v_partner_vip_cards
    FROM public.profiles
    WHERE id = v_trade.partner_id
    FOR UPDATE;

    -- ========================================================================
    -- Transfer cards from initiator to partner
    -- ========================================================================
    FOREACH v_card_id IN ARRAY v_initiator_cards
    LOOP
        v_card_data := v_initiator_vip_cards->v_card_id;
        IF v_card_data IS NULL THEN
            RAISE EXCEPTION 'Card % not found for initiator', v_card_id;
        END IF;

        -- Extract template ID from card data
        v_card_template_id := v_card_data->>'cardId';

        -- Remove from initiator
        v_initiator_vip_cards := v_initiator_vip_cards - v_card_id;

        -- Add to partner (with traded_at and update acquiredFrom)
        v_partner_vip_cards := jsonb_set(
            COALESCE(v_partner_vip_cards, '{}'::jsonb),
            ARRAY[v_card_id],
            v_card_data || jsonb_build_object(
                'traded_at', NOW(),
                'acquiredFrom', 'trade'
            )
        );

        -- Log SENDER activity: 'traded' (card leaves)
        INSERT INTO public.vip_cards_activity (
            card_instance_id,
            student_id,
            card_template_id,
            action,
            metadata
        ) VALUES (
            v_card_id,
            v_trade.initiator_id,
            v_card_template_id,
            'traded',
            jsonb_build_object(
                'trade_id', p_trade_id,
                'traded_to', v_trade.partner_id,
                'direction', 'sent'
            )
        );

        -- Log RECEIVER activity: 'gained' (card arrives via trade)
        INSERT INTO public.vip_cards_activity (
            card_instance_id,
            student_id,
            card_template_id,
            action,
            metadata
        ) VALUES (
            v_card_id,
            v_trade.partner_id,
            v_card_template_id,
            'gained',
            jsonb_build_object(
                'acquired_from', 'trade',
                'trade_id', p_trade_id,
                'received_from', v_trade.initiator_id
            )
        );
    END LOOP;

    -- ========================================================================
    -- Transfer cards from partner to initiator
    -- ========================================================================
    FOREACH v_card_id IN ARRAY v_partner_cards
    LOOP
        v_card_data := v_partner_vip_cards->v_card_id;
        IF v_card_data IS NULL THEN
            RAISE EXCEPTION 'Card % not found for partner', v_card_id;
        END IF;

        -- Extract template ID from card data
        v_card_template_id := v_card_data->>'cardId';

        -- Remove from partner
        v_partner_vip_cards := v_partner_vip_cards - v_card_id;

        -- Add to initiator (with traded_at and update acquiredFrom)
        v_initiator_vip_cards := jsonb_set(
            COALESCE(v_initiator_vip_cards, '{}'::jsonb),
            ARRAY[v_card_id],
            v_card_data || jsonb_build_object(
                'traded_at', NOW(),
                'acquiredFrom', 'trade'
            )
        );

        -- Log SENDER activity: 'traded' (card leaves)
        INSERT INTO public.vip_cards_activity (
            card_instance_id,
            student_id,
            card_template_id,
            action,
            metadata
        ) VALUES (
            v_card_id,
            v_trade.partner_id,
            v_card_template_id,
            'traded',
            jsonb_build_object(
                'trade_id', p_trade_id,
                'traded_to', v_trade.initiator_id,
                'direction', 'sent'
            )
        );

        -- Log RECEIVER activity: 'gained' (card arrives via trade)
        INSERT INTO public.vip_cards_activity (
            card_instance_id,
            student_id,
            card_template_id,
            action,
            metadata
        ) VALUES (
            v_card_id,
            v_trade.initiator_id,
            v_card_template_id,
            'gained',
            jsonb_build_object(
                'acquired_from', 'trade',
                'trade_id', p_trade_id,
                'received_from', v_trade.partner_id
            )
        );
    END LOOP;

    -- Update VIP cards for both users
    UPDATE public.profiles
    SET vip_cards = v_initiator_vip_cards
    WHERE id = v_trade.initiator_id;

    UPDATE public.profiles
    SET vip_cards = v_partner_vip_cards
    WHERE id = v_trade.partner_id;

    -- Transfer gidouilles using existing RPC function
    IF v_initiator_gidouilles > 0 THEN
        PERFORM public.update_student_gidouilles(
            v_trade.initiator_id::TEXT,
            -v_initiator_gidouilles,
            'marketplace_trade'
        );
        PERFORM public.update_student_gidouilles(
            v_trade.partner_id::TEXT,
            v_initiator_gidouilles,
            'marketplace_trade'
        );
    END IF;

    IF v_partner_gidouilles > 0 THEN
        PERFORM public.update_student_gidouilles(
            v_trade.partner_id::TEXT,
            -v_partner_gidouilles,
            'marketplace_trade'
        );
        PERFORM public.update_student_gidouilles(
            v_trade.initiator_id::TEXT,
            v_partner_gidouilles,
            'marketplace_trade'
        );
    END IF;

    -- Update trade status
    UPDATE public.marketplace_trades
    SET
        status = 'completed',
        completed_at = NOW(),
        final_trade = v_final_trade,
        updated_at = NOW()
    WHERE id = p_trade_id;

    -- Unlock all cards for this trade
    DELETE FROM public.marketplace_locked_cards
    WHERE locked_entity_id = p_trade_id;

    -- If this was a marketplace trade, update the listing and proposal
    IF v_trade.listing_id IS NOT NULL THEN
        UPDATE public.marketplace_listings
        SET
            status = 'completed',
            completed_at = NOW()
        WHERE id = v_trade.listing_id;

        UPDATE public.marketplace_proposals
        SET
            status = 'accepted',
            responded_at = NOW()
        WHERE id = v_trade.proposal_id;

        -- Reject all other proposals for this listing
        UPDATE public.marketplace_proposals
        SET
            status = 'rejected',
            responded_at = NOW(),
            response_message = 'Another proposal was accepted'
        WHERE listing_id = v_trade.listing_id
        AND id != v_trade.proposal_id
        AND status = 'pending';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'trade_id', p_trade_id,
        'completed_at', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Log error and rollback
        RAISE WARNING 'Trade execution failed: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION public.execute_trade IS
'Atomically execute a trade. Logs both sender (traded) and receiver (gained) activities.';


-- ============================================================================
-- STEP 3: UPDATE grant_specific_vip_card TO LOG ACTIVITY
-- ============================================================================
-- This function is used when teachers grant specific cards FOR FREE.
-- Log as 'gained' with acquired_from='teacher_award'

CREATE OR REPLACE FUNCTION grant_specific_vip_card(
  p_student_id UUID,
  p_card_id TEXT,
  p_count INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID;
  v_is_teacher BOOLEAN;
  v_vip_cards JSONB;
  v_new_instance JSONB;
  v_new_instance_id UUID;
  v_earned_at TIMESTAMPTZ;
  v_result JSONB;
  v_cards JSONB[];
  v_template RECORD;
  i INT;
BEGIN
  -- Get the calling user ID
  v_teacher_id := auth.uid();

  -- Check if the user is a teacher or admin
  SELECT is_teacher_or_admin()
  INTO v_is_teacher;

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Only teachers and admins can grant VIP cards';
  END IF;

  -- Verify that the teacher owns this student (via class_members)
  IF NOT EXISTS (
    SELECT 1
    FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_student_id
      AND c.teacher_id = v_teacher_id
  ) THEN
    RAISE EXCEPTION 'You do not have permission to grant cards to this student';
  END IF;

  -- Get template info (validate card exists and get rarity)
  SELECT id, rarity, uses_total INTO v_template
  FROM vip_card_templates WHERE id = p_card_id;

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Invalid card ID: %', p_card_id;
  END IF;

  -- Validate count
  IF p_count < 1 OR p_count > 10 THEN
    RAISE EXCEPTION 'Count must be between 1 and 10';
  END IF;

  -- Lock the student's profile row to prevent race conditions
  SELECT vip_cards
  INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  -- Initialize empty array if vip_cards is null
  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  -- Initialize result array
  v_cards := ARRAY[]::JSONB[];
  v_earned_at := NOW();

  -- Add the specified card p_count times
  FOR i IN 1..p_count LOOP
    v_new_instance_id := gen_random_uuid();

    v_new_instance := jsonb_build_object(
      'cardId', p_card_id,
      'earnedAt', v_earned_at,
      'usedAt', NULL,
      'acquiredFrom', 'teacher_award',
      'usesRemaining', v_template.uses_total
    );

    -- Add to vip_cards JSONB object
    v_vip_cards := v_vip_cards || jsonb_build_object(v_new_instance_id::TEXT, v_new_instance);

    -- Log activity
    INSERT INTO vip_cards_activity (
      student_id,
      card_instance_id,
      card_template_id,
      action,
      metadata
    ) VALUES (
      p_student_id,
      v_new_instance_id::TEXT,
      p_card_id,
      'gained',
      jsonb_build_object(
        'acquired_from', 'teacher_award',
        'awarded_by', v_teacher_id,
        'rarity', v_template.rarity
      )
    );

    -- Add to result array
    v_cards := v_cards || jsonb_build_object(
      'cardId', p_card_id,
      'instanceId', v_new_instance_id,
      'earnedAt', v_earned_at
    );
  END LOOP;

  -- Update the student's profile
  UPDATE profiles
  SET vip_cards = v_vip_cards
  WHERE id = p_student_id;

  -- Build result object
  v_result := jsonb_build_object('cards', to_jsonb(v_cards));

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION grant_specific_vip_card(UUID, TEXT, INT) IS
'Allows teachers to grant a specific VIP card to a student for free. Logs activity with acquired_from=teacher_award.';


-- ============================================================================
-- STEP 4: UPDATE award_random_vip_card TO LOG ACTIVITY
-- ============================================================================
-- This function is used when teachers award a random card (costs 3 gidouilles).
-- Log as 'gained' with acquired_from='teacher_draw'

CREATE OR REPLACE FUNCTION award_random_vip_card(
  p_student_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_teacher_id UUID;
  v_is_teacher BOOLEAN;
  v_student_in_class BOOLEAN;
  v_current_gidouilles INTEGER;
  v_new_gidouilles INTEGER;
  v_card_id TEXT;
  v_instance_id UUID;
  v_new_card_instance JSONB;
  v_earned_at TIMESTAMPTZ;
  v_template RECORD;
BEGIN
  -- Get the current user's ID (the teacher calling this function)
  v_teacher_id := auth.uid();

  -- Check if caller is a teacher or admin
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can award VIP cards';
  END IF;

  -- Check if student is in one of the teacher's classes
  SELECT EXISTS (
    SELECT 1
    FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_student_id
      AND c.teacher_id = v_teacher_id
  ) INTO v_student_in_class;

  IF NOT v_student_in_class THEN
    RAISE EXCEPTION 'Unauthorized: Student is not in your classes';
  END IF;

  -- Get current gidouilles count
  SELECT gidouilles INTO v_current_gidouilles
  FROM profiles
  WHERE id = p_student_id;

  -- Check if student has enough gidouilles (at least 3)
  IF v_current_gidouilles < 3 THEN
    RAISE EXCEPTION 'Insufficient gidouilles: Student needs at least 3 gidouilles (current: %)', v_current_gidouilles;
  END IF;

  -- Calculate new gidouilles value
  v_new_gidouilles := v_current_gidouilles - 3;

  -- Select random VIP card from enabled templates
  SELECT id, rarity, uses_total INTO v_template
  FROM vip_card_templates
  WHERE is_enabled = TRUE
  ORDER BY random()
  LIMIT 1;

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'No VIP cards available';
  END IF;

  v_card_id := v_template.id;

  -- Generate unique instance ID
  v_instance_id := gen_random_uuid();

  -- Capture earned timestamp
  v_earned_at := now();

  -- Create new card instance
  v_new_card_instance := jsonb_build_object(
    'cardId', v_card_id,
    'earnedAt', v_earned_at,
    'usedAt', null,
    'acquiredFrom', 'teacher_draw',
    'usesRemaining', v_template.uses_total
  );

  -- Update student profile: deduct gidouilles and add VIP card
  UPDATE profiles
  SET
    gidouilles = v_new_gidouilles,
    vip_cards = COALESCE(vip_cards, '{}'::jsonb) || jsonb_build_object(v_instance_id::TEXT, v_new_card_instance),
    updated_at = NOW()
  WHERE id = p_student_id;

  -- Log activity
  INSERT INTO vip_cards_activity (
    student_id,
    card_instance_id,
    card_template_id,
    action,
    metadata
  ) VALUES (
    p_student_id,
    v_instance_id::TEXT,
    v_card_id,
    'gained',
    jsonb_build_object(
      'acquired_from', 'teacher_draw',
      'awarded_by', v_teacher_id,
      'gidouilles_cost', 3,
      'old_balance', v_current_gidouilles,
      'new_balance', v_new_gidouilles,
      'rarity', v_template.rarity
    )
  );

  -- Return complete card information as JSONB
  RETURN jsonb_build_object(
    'cardId', v_card_id,
    'instanceId', v_instance_id,
    'earnedAt', v_earned_at
  );
END;
$$;

COMMENT ON FUNCTION award_random_vip_card(UUID) IS
'Awards a random VIP card to a student (costs 3 gidouilles). Logs activity with acquired_from=teacher_draw.';


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'VIP Cards Activity Logging Improved';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  1. award_vip_card_no_cost() now accepts p_source parameter:';
  RAISE NOTICE '     - "draw" (default): Random card draw';
  RAISE NOTICE '     - "teacher_award": Teacher gives card to student';
  RAISE NOTICE '';
  RAISE NOTICE '  2. execute_trade() now logs both parties:';
  RAISE NOTICE '     - Sender: action="traded", direction="sent"';
  RAISE NOTICE '     - Receiver: action="gained", acquired_from="trade"';
  RAISE NOTICE '';
  RAISE NOTICE '  3. grant_specific_vip_card() now logs:';
  RAISE NOTICE '     - action="gained", acquired_from="teacher_award"';
  RAISE NOTICE '';
  RAISE NOTICE '  4. award_random_vip_card() now logs:';
  RAISE NOTICE '     - action="gained", acquired_from="teacher_draw"';
  RAISE NOTICE '';
  RAISE NOTICE 'Activity Log Summary:';
  RAISE NOTICE '  gained + acquired_from=purchase      -> Student bought card';
  RAISE NOTICE '  gained + acquired_from=draw          -> Random draw (student)';
  RAISE NOTICE '  gained + acquired_from=teacher_draw  -> Teacher initiated draw';
  RAISE NOTICE '  gained + acquired_from=teacher_award -> Teacher free gift';
  RAISE NOTICE '  gained + acquired_from=trade         -> Received via trade';
  RAISE NOTICE '  traded + direction=sent              -> Sent in trade';
  RAISE NOTICE '  used                                 -> Card was used';
  RAISE NOTICE '  removed                              -> Card was removed';
  RAISE NOTICE '=========================================================';
END $$;
