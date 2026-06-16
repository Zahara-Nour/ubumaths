-- Fix: remove reference to non-existent "updated_at" column in minesweeper_games
-- Error: column "updated_at" of relation "minesweeper_games" does not exist (42703)

CREATE OR REPLACE FUNCTION public.use_minesweeper_undo(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_undo_used BOOLEAN;
  v_instance_id TEXT;
  v_consume_result JSONB;
  v_vip_cards JSONB;
BEGIN
  -- CONCURRENCY NOTE:
  -- Lock order: minesweeper_games (FOR UPDATE here) -> profiles (FOR UPDATE inside
  -- use_vip_card). This consistent ordering prevents deadlocks.

  -- Step 1: Verify game ownership, status, and undo not yet used
  SELECT student_id, COALESCE(undo_used, false)
  INTO v_student_id, v_undo_used
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND student_id = auth.uid()
    AND status = 'in_progress'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Partie non trouvee, pas la votre, ou plus en cours'
    );
  END IF;

  IF v_undo_used THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Seconde Chance deja utilisee dans cette partie'
    );
  END IF;

  -- Step 2: Find oldest unused minesweeper-undo VIP card instance (FIFO)
  SELECT vip_cards INTO v_vip_cards
  FROM public.profiles
  WHERE id = v_student_id;

  IF v_vip_cards IS NOT NULL THEN
    SELECT key INTO v_instance_id
    FROM jsonb_each(v_vip_cards) AS cards(key, value)
    WHERE value->>'cardId' = 'minesweeper-undo'
      AND (value->>'usedAt') IS NULL
      AND (
        (value->>'usesRemaining') IS NULL
        OR (value->>'usesRemaining')::INTEGER > 0
      )
    ORDER BY (value->>'earnedAt')::TIMESTAMPTZ ASC
    LIMIT 1;
  END IF;

  -- Step 3: No card available -> fail (no gidouilles fallback)
  IF v_instance_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Aucune carte Seconde Chance disponible'
    );
  END IF;

  -- Step 4: Consume the card via use_vip_card()
  v_consume_result := public.use_vip_card(v_student_id, v_instance_id, NULL, NULL, 'minesweeper');

  IF NOT (v_consume_result->>'success')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_consume_result->>'error', 'Echec de la consommation de la carte Seconde Chance')
    );
  END IF;

  -- Step 5: Update game state (no updated_at column in minesweeper_games)
  UPDATE public.minesweeper_games
  SET undo_used = true,
      grid_state = p_grid_state
  WHERE id = p_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'source', 'vip_card',
    'message', 'Seconde Chance utilisee avec succes'
  );
END;
$$;
