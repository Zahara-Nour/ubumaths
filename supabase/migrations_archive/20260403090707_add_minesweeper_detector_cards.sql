-- ============================================================================
-- Migration: Add minesweeper detector VIP cards + use_detector() RPC
-- Created: 2026-04-03
-- ============================================================================
-- New VIP card: "Détecteur" - flags a random mine in minesweeper.
-- Shares the hint counter (max 3 hints+detectors per game).
-- Fallback gidouilles: 10g (more expensive than hint 5g, since more powerful).
-- Variants: Détecteur (1 charge, rare, 8g), Détecteur (2 charges, epic, 12g).
-- ============================================================================

-- 1. Card templates
INSERT INTO public.vip_card_templates (
  id, name, description, category, rarity, image_path,
  action, is_enabled, base_price, is_purchasable,
  max_owned_per_student, uses_total
) VALUES (
  'minesweeper-detector',
  'Détecteur (1)',
  'Détecte une mine et pose un drapeau dessus. Pénalité réduite.',
  'power',
  'rare',
  '/images/vip-cards/minesweeper-detector.webp',
  '{"type": "detector", "context": "minesweeper"}'::JSONB,
  true,
  8,
  true,
  5,
  1
), (
  'minesweeper-detector-2',
  'Détecteur (2)',
  'Détecte une mine et pose un drapeau dessus. 2 utilisations. Pénalité réduite.',
  'power',
  'epic',
  '/images/vip-cards/minesweeper-detector.webp',
  '{"type": "detector", "context": "minesweeper"}'::JSONB,
  true,
  12,
  true,
  5,
  2
);

-- 2. use_detector() RPC function
CREATE OR REPLACE FUNCTION public.use_detector(
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
  v_detector_instance_id TEXT;
  v_consume_result JSONB;
  v_detector_cost NUMERIC(10,2) := 10.0;
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

  -- Step 2: Check shared hint limit (hints + detectors share the same counter)
  IF v_hints_used >= 3 THEN
    RAISE EXCEPTION 'Maximum hints reached (3 per game)';
  END IF;

  -- Step 3: Find an available detector VIP card instance
  SELECT vip_cards INTO v_vip_cards
  FROM public.profiles
  WHERE id = v_student_id;

  IF v_vip_cards IS NOT NULL THEN
    SELECT key INTO v_detector_instance_id
    FROM jsonb_each(v_vip_cards) AS cards(key, value)
    LEFT JOIN public.vip_card_templates t ON t.id = value->>'cardId'
    WHERE value->>'cardId' LIKE 'minesweeper-detector%'
      AND (value->>'usedAt') IS NULL
      AND (
        (value->>'usesRemaining') IS NULL
        OR (value->>'usesRemaining')::INTEGER > 0
      )
    ORDER BY
      -- Prefer already-started cards first
      CASE
        WHEN (value->>'usesRemaining') IS NOT NULL
         AND t.uses_total IS NOT NULL
         AND (value->>'usesRemaining')::INTEGER < t.uses_total
        THEN 0
        ELSE 1
      END ASC,
      -- Then fewest charges remaining
      COALESCE((value->>'usesRemaining')::INTEGER, 1) ASC
    LIMIT 1;
  END IF;

  -- Step 4: If we found a card, consume it via use_vip_card()
  IF v_detector_instance_id IS NOT NULL THEN
    v_consume_result := public.use_vip_card(v_student_id, v_detector_instance_id, NULL, NULL, 'minesweeper');

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
        'vip_card_consumed', true,
        'gidouilles_spent', 0,
        'penalty_notice', 'Carte VIP Detecteur utilisee - penalite reduite (5/11/17%)'
      );
    END IF;
  END IF;

  -- Step 5: No VIP card available - use gidouilles (costs 10g)
  SELECT gidouilles INTO v_current_balance
  FROM public.profiles
  WHERE id = v_student_id
  FOR UPDATE;

  IF v_current_balance < v_detector_cost THEN
    RAISE EXCEPTION 'Insufficient gidouilles. Required: %, Available: %', v_detector_cost, v_current_balance;
  END IF;

  UPDATE public.profiles
  SET gidouilles = gidouilles - v_detector_cost
  WHERE id = v_student_id;

  INSERT INTO public.gidouilles_activity (student_id, delta, reason)
  VALUES (v_student_id, -v_detector_cost, 'Detecteur Demineur');

  UPDATE public.minesweeper_games
  SET hints_used = v_hints_used + 1
  WHERE id = p_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'hints_used', v_hints_used + 1,
    'hints_remaining', 2 - v_hints_used,
    'source', 'gidouilles',
    'vip_card_consumed', false,
    'gidouilles_spent', v_detector_cost,
    'remaining_gidouilles', v_current_balance - v_detector_cost,
    'penalty_notice', 'Gidouilles utilisees - penalite progressive (10/22/35%)'
  );
END;
$$;

COMMENT ON FUNCTION public.use_detector IS
  'Use a detector in Minesweeper to flag a random mine. Shares hint counter (max 3). Priority: 1) VIP detector card, 2) Gidouilles (10.0 cost). Logs to gidouilles_activity.';

GRANT EXECUTE ON FUNCTION public.use_detector TO authenticated;
