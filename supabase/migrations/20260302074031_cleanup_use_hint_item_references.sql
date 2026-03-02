-- ============================================================================
-- Migration: Remove item_consumed from use_hint() JSON response
-- Created: 2026-03-02
-- ============================================================================
--
-- The use_hint() function still returned 'item_consumed' in its JSON response,
-- a vestige of the old shop items system. The client now uses 'vip_card_consumed'
-- and 'source' fields instead. This migration removes the stale key.
--
-- ============================================================================

DROP FUNCTION IF EXISTS public.use_hint(UUID);

CREATE OR REPLACE FUNCTION public.use_hint(
  p_game_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_hints_used INTEGER;
  v_reduced_penalty_hints INTEGER;
  v_current_balance NUMERIC(10,2);
  v_hint_instance_id TEXT;
  v_consume_result JSONB;
  v_hint_cost NUMERIC(10,2) := 1.0;  -- Strategy D: 1 gidouille per hint
  v_penalty_notice TEXT;
  v_vip_cards JSONB;
BEGIN
  -- Step 1: Verify game ownership and get current state
  SELECT student_id, COALESCE(hints_used, 0), COALESCE(reduced_penalty_hints, 0)
  INTO v_student_id, v_hints_used, v_reduced_penalty_hints
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND student_id = auth.uid()
    AND status = 'in_progress'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or not in progress';
  END IF;

  -- Step 2: Check hint limit
  IF v_hints_used >= 3 THEN
    RAISE EXCEPTION 'Maximum hints reached (3 per game)';
  END IF;

  -- Step 3: Find an available minesweeper-hint VIP card instance
  SELECT vip_cards INTO v_vip_cards
  FROM public.profiles
  WHERE id = v_student_id;

  IF v_vip_cards IS NOT NULL THEN
    SELECT key INTO v_hint_instance_id
    FROM jsonb_each(v_vip_cards) AS cards(key, value)
    WHERE value->>'cardId' = 'minesweeper-hint'
      AND (value->>'usedAt') IS NULL
      AND (
        (value->>'usesRemaining') IS NULL
        OR (value->>'usesRemaining')::INTEGER > 0
      )
    ORDER BY (value->>'earnedAt')::TIMESTAMPTZ ASC  -- FIFO
    LIMIT 1;
  END IF;

  -- Step 4: If we found a card, consume it via use_consumable_card()
  IF v_hint_instance_id IS NOT NULL THEN
    v_consume_result := public.use_consumable_card(v_student_id, v_hint_instance_id, 'minesweeper');

    IF (v_consume_result->>'success')::BOOLEAN THEN
      -- VIP card consumed - update game hints counter
      UPDATE public.minesweeper_games
      SET hints_used = v_hints_used + 1,
          reduced_penalty_hints = v_reduced_penalty_hints + 1
      WHERE id = p_game_id;

      v_penalty_notice := 'Carte VIP utilisee - penalite reduite (5/11/17%)';

      RETURN jsonb_build_object(
        'success', true,
        'hints_used', v_hints_used + 1,
        'hints_remaining', 2 - v_hints_used,
        'source', 'vip_card',
        'vip_card_consumed', true,
        'gidouilles_spent', 0,
        'penalty_notice', v_penalty_notice
      );
    END IF;
    -- If use_consumable_card failed, fall through to gidouilles
  END IF;

  -- Step 5: No VIP card available - use gidouilles
  SELECT gidouilles INTO v_current_balance
  FROM public.profiles
  WHERE id = v_student_id
  FOR UPDATE;

  IF v_current_balance < v_hint_cost THEN
    RAISE EXCEPTION 'Insufficient gidouilles. Required: %, Available: %', v_hint_cost, v_current_balance;
  END IF;

  -- Deduct gidouilles
  UPDATE public.profiles
  SET gidouilles = gidouilles - v_hint_cost
  WHERE id = v_student_id;

  -- Record transaction
  INSERT INTO public.gidouilles_history (student_id, delta, reason, source_id)
  VALUES (v_student_id, -v_hint_cost, 'Indice Demineur', p_game_id);

  -- Update game hints counter (NOT reduced penalty - full penalty applies)
  UPDATE public.minesweeper_games
  SET hints_used = v_hints_used + 1
  WHERE id = p_game_id;

  v_penalty_notice := 'Gidouilles utilisees - penalite progressive (10/22/35%)';

  RETURN jsonb_build_object(
    'success', true,
    'hints_used', v_hints_used + 1,
    'hints_remaining', 2 - v_hints_used,
    'source', 'gidouilles',
    'vip_card_consumed', false,
    'gidouilles_spent', v_hint_cost,
    'remaining_gidouilles', v_current_balance - v_hint_cost,
    'penalty_notice', v_penalty_notice
  );
END;
$$;

COMMENT ON FUNCTION public.use_hint IS
  'Use a hint in Minesweeper. Priority: 1) VIP hint card (via use_consumable_card with minesweeper context), 2) Gidouilles (1.0 cost). VIP hints get reduced penalty.';

GRANT EXECUTE ON FUNCTION public.use_hint TO authenticated;
