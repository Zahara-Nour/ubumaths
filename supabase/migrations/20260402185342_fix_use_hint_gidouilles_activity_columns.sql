-- ============================================================================
-- Migration: Fix use_hint() INSERT columns for gidouilles_activity
-- Created: 2026-04-02
-- ============================================================================
-- BUG: Previous fix (20260402184230) corrected the table name but kept
--      source_id in the INSERT, which doesn't exist in gidouilles_activity.
--      The table columns are: student_id, class_id, delta, reason, created_by.
-- ============================================================================

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
  v_hint_cost NUMERIC(10,2) := 1.0;
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

  -- Step 3: Find an available minesweeper hint VIP card instance
  -- Smart selection: prefer already-started card, then minimum charges
  SELECT vip_cards INTO v_vip_cards
  FROM public.profiles
  WHERE id = v_student_id;

  IF v_vip_cards IS NOT NULL THEN
    SELECT key INTO v_hint_instance_id
    FROM jsonb_each(v_vip_cards) AS cards(key, value)
    LEFT JOIN public.vip_card_templates t ON t.id = value->>'cardId'
    WHERE value->>'cardId' LIKE 'minesweeper-hint%'
      AND (value->>'usedAt') IS NULL
      AND (
        (value->>'usesRemaining') IS NULL
        OR (value->>'usesRemaining')::INTEGER > 0
      )
    ORDER BY
      CASE
        WHEN (value->>'usesRemaining') IS NOT NULL
         AND t.uses_total IS NOT NULL
         AND (value->>'usesRemaining')::INTEGER < t.uses_total
        THEN 0
        ELSE 1
      END ASC,
      COALESCE((value->>'usesRemaining')::INTEGER, 1) ASC
    LIMIT 1;
  END IF;

  -- Step 4: If we found a card, consume it via use_vip_card()
  IF v_hint_instance_id IS NOT NULL THEN
    v_consume_result := public.use_vip_card(v_student_id, v_hint_instance_id, NULL, NULL, 'minesweeper');

    IF (v_consume_result->>'success')::BOOLEAN THEN
      UPDATE public.minesweeper_games
      SET hints_used = v_hints_used + 1,
          reduced_penalty_hints = v_reduced_penalty_hints + 1
      WHERE id = p_game_id;

      RETURN jsonb_build_object(
        'success', true,
        'hints_used', v_hints_used + 1,
        'hints_remaining', 2 - v_hints_used,
        'source', 'vip_card',
        'item_consumed', false,
        'vip_card_consumed', true,
        'gidouilles_spent', 0,
        'penalty_notice', 'Carte VIP utilisee - penalite reduite (5/11/17%)'
      );
    END IF;
  END IF;

  -- Step 5: No VIP card available - use gidouilles
  SELECT gidouilles INTO v_current_balance
  FROM public.profiles
  WHERE id = v_student_id
  FOR UPDATE;

  IF v_current_balance < v_hint_cost THEN
    RAISE EXCEPTION 'Insufficient gidouilles. Required: %, Available: %', v_hint_cost, v_current_balance;
  END IF;

  UPDATE public.profiles
  SET gidouilles = gidouilles - v_hint_cost
  WHERE id = v_student_id;

  INSERT INTO public.gidouilles_activity (student_id, delta, reason)
  VALUES (v_student_id, -v_hint_cost, 'Indice Demineur');

  UPDATE public.minesweeper_games
  SET hints_used = v_hints_used + 1
  WHERE id = p_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'hints_used', v_hints_used + 1,
    'hints_remaining', 2 - v_hints_used,
    'source', 'gidouilles',
    'item_consumed', false,
    'vip_card_consumed', false,
    'gidouilles_spent', v_hint_cost,
    'remaining_gidouilles', v_current_balance - v_hint_cost,
    'penalty_notice', 'Gidouilles utilisees - penalite progressive (10/22/35%)'
  );
END;
$$;

COMMENT ON FUNCTION public.use_hint IS
  'Use a hint in Minesweeper. Smart card selection: prefers already-started hint cards, then fewest charges. Priority: 1) VIP hint card, 2) Gidouilles (1.0 cost). Logs to gidouilles_activity.';

GRANT EXECUTE ON FUNCTION public.use_hint TO authenticated;
