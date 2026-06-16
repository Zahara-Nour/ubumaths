-- ============================================================================
-- Migration: Migrate Minesweeper Undo ("Seconde Chance") to VIP Cards
-- Created: 2026-03-02
-- ============================================================================
--
-- CONTEXT:
-- The minesweeper undo ("Seconde Chance") feature used the old shop/items
-- system (student_item_inventory table), which was dropped in
-- 20260103120000_remove_items_system.sql. The old use_minesweeper_undo()
-- function still calls try_consume_minesweeper_undo_item() which references
-- the deleted table, causing a 404 error on use.
--
-- CHANGES:
-- 1. Insert minesweeper-undo VIP card template
-- 2. Recreate use_minesweeper_undo() using use_consumable_card() (same as hint)
-- 3. Drop legacy try_consume_minesweeper_undo_item()
--
-- DESIGN DECISIONS:
-- - VIP card only, NO gidouilles fallback (unlike hint which has gidouilles fallback)
-- - activation_context = 'minesweeper' → validated by use_consumable_card()
-- - uses_total = 1 (single use per card, same as hint)
-- - base_price = 3 gidouilles (more expensive than hint at 1, since it's rare/powerful)
-- ============================================================================

-- ============================================================================
-- STEP 1: Insert VIP card template
-- ============================================================================

INSERT INTO public.vip_card_templates (
  id, name, description, category, rarity, image_path, action,
  is_enabled, base_price, is_purchasable, max_owned_per_student,
  uses_total, activation_context, sort_order
) VALUES (
  'minesweeper-undo',
  'Seconde Chance',
  'Annule un coup fatal dans le Démineur. Utilisable une seule fois par partie.',
  'consumable', 'rare', '/images/vip-cards/minesweeper-undo.webp',
  '{"type": "use_consumable", "context": "minesweeper", "effect": "undo_bomb"}'::JSONB,
  true, 3, true, 10, 1, 'minesweeper', 20
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  action = EXCLUDED.action,
  base_price = EXCLUDED.base_price,
  activation_context = EXCLUDED.activation_context;

-- ============================================================================
-- STEP 2: Recreate use_minesweeper_undo() using use_consumable_card()
-- ============================================================================

DROP FUNCTION IF EXISTS public.use_minesweeper_undo(UUID, JSONB);

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
  -- Lock order: minesweeper_games (FOR UPDATE here) → profiles (FOR UPDATE inside
  -- use_consumable_card). This consistent ordering prevents deadlocks between
  -- concurrent undo and hint requests on the same student.

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
      'error', 'Partie non trouvée, pas la vôtre, ou plus en cours'
    );
  END IF;

  IF v_undo_used THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Seconde Chance déjà utilisée dans cette partie'
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
    ORDER BY (value->>'earnedAt')::TIMESTAMPTZ ASC  -- FIFO
    LIMIT 1;
  END IF;

  -- Step 3: No card available → fail (no gidouilles fallback)
  IF v_instance_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Aucune carte Seconde Chance disponible'
    );
  END IF;

  -- Step 4: Consume the card via use_consumable_card()
  v_consume_result := public.use_consumable_card(v_student_id, v_instance_id, 'minesweeper');

  IF NOT (v_consume_result->>'success')::BOOLEAN THEN
    -- Failure from use_consumable_card: card may have been consumed by a
    -- concurrent request, or another validation failed (context check, etc).
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_consume_result->>'error', 'Échec de la consommation de la carte Seconde Chance')
    );
  END IF;

  -- Step 5: Update game state
  UPDATE public.minesweeper_games
  SET undo_used = true,
      grid_state = p_grid_state,
      updated_at = NOW()
  WHERE id = p_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'source', 'vip_card',
    'message', 'Seconde Chance utilisée avec succès'
  );
END;
$$;

COMMENT ON FUNCTION public.use_minesweeper_undo(UUID, JSONB) IS
  'Uses a "Seconde Chance" VIP card in a Minesweeper game. Consumes the card via use_consumable_card() and marks the game as having used undo. No gidouilles fallback.';

GRANT EXECUTE ON FUNCTION public.use_minesweeper_undo(UUID, JSONB) TO authenticated;

-- ============================================================================
-- STEP 3: Drop legacy functions (references deleted student_item_inventory)
-- ============================================================================

DROP FUNCTION IF EXISTS public.try_consume_minesweeper_undo_item(UUID);

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- 1. Inserted minesweeper-undo VIP card template (consumable, rare, 3 gidouilles)
-- 2. Recreated use_minesweeper_undo() to use use_consumable_card() instead of
--    the old try_consume_minesweeper_undo_item() which referenced dropped tables
-- 3. Dropped try_consume_minesweeper_undo_item()
-- ============================================================================
