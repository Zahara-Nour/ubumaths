-- ============================================================================
-- Migration: Add Minesweeper "Seconde Chance" (Undo) Item
-- Created: 2026-01-02
-- ============================================================================
-- This migration adds an "undo" consumable item for the Minesweeper game:
-- 1. Creates "Seconde Chance" shop item template
-- 2. Adds column to track undo usage in games
-- 3. Creates helper function to consume the undo item
--
-- How it works:
-- - When a player clicks on a mine, they can use this item to undo the move
-- - Limited to 1 use per game (more powerful than hints)
-- - More expensive than hints (100 gidouilles vs 10)
-- - Rare rarity to reflect its power
-- ============================================================================

-- ============================================================================
-- PART 1: Add Column to Track Undo Usage
-- ============================================================================

-- Add column to track if undo was used in a game
ALTER TABLE public.minesweeper_games
ADD COLUMN IF NOT EXISTS undo_used BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.minesweeper_games.undo_used IS
  'Whether the "Seconde Chance" undo item was used in this game. Limited to 1 per game.';

-- ============================================================================
-- PART 2: Create "Seconde Chance" Shop Item Template
-- ============================================================================

INSERT INTO public.shop_item_templates (
  internal_name,
  display_name,
  description,
  category,
  item_type,
  rarity,
  base_price,
  discount_percentage,
  is_active,
  is_tradeable,
  max_owned_per_student,
  properties,
  icon_url,
  sort_order
) VALUES (
  'minesweeper_undo',                              -- internal_name (unique identifier)
  'Seconde Chance',                                -- display_name (French)
  'Annule un coup fatal dans le Démineur. Utilisable une seule fois par partie.',  -- description
  'consumable',                                    -- category
  'undo',                                          -- item_type
  'rare',                                          -- rarity (more powerful = rarer)
  100,                                             -- base_price (10x hint cost)
  0,                                               -- discount_percentage (none by default)
  true,                                            -- is_active
  true,                                            -- is_tradeable
  10,                                              -- max_owned_per_student (limited stock)
  jsonb_build_object(
    'stackable', true,
    'game', 'minesweeper',
    'effect', 'undo_bomb_reveal',
    'max_per_game', 1,
    'uses', 1
  ),                                               -- properties
  NULL,                                            -- icon_url (use default/emoji)
  20                                               -- sort_order (after hints)
) ON CONFLICT (internal_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  properties = EXCLUDED.properties,
  is_active = EXCLUDED.is_active,
  base_price = EXCLUDED.base_price;

-- ============================================================================
-- PART 3: Helper Function to Consume Undo Item
-- ============================================================================

-- This function attempts to consume a minesweeper undo item from inventory
-- Returns TRUE if successful, FALSE otherwise
CREATE OR REPLACE FUNCTION public.try_consume_minesweeper_undo_item(
  p_student_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_inventory_id UUID;
  v_quantity INTEGER;
BEGIN
  -- Find the undo item template
  SELECT id INTO v_template_id
  FROM shop_item_templates
  WHERE internal_name = 'minesweeper_undo'
  AND is_active = true;

  IF v_template_id IS NULL THEN
    RAISE NOTICE 'Undo item template not found or inactive';
    RETURN FALSE;
  END IF;

  -- Find an unlocked inventory item with quantity > 0
  SELECT id, quantity INTO v_inventory_id, v_quantity
  FROM student_item_inventory
  WHERE student_id = p_student_id
  AND template_id = v_template_id
  AND is_locked = false
  AND quantity > 0
  ORDER BY acquired_at ASC  -- FIFO: use oldest items first
  LIMIT 1
  FOR UPDATE;  -- Lock the row to prevent race conditions

  IF v_inventory_id IS NULL THEN
    RAISE NOTICE 'No undo items available in inventory for student %', p_student_id;
    RETURN FALSE;
  END IF;

  -- Decrement quantity
  IF v_quantity > 1 THEN
    -- Just reduce quantity
    UPDATE student_item_inventory
    SET quantity = quantity - 1,
        last_used_at = NOW(),
        total_uses_count = total_uses_count + 1,
        updated_at = NOW()
    WHERE id = v_inventory_id;
  ELSE
    -- Last item - delete the inventory entry
    DELETE FROM student_item_inventory
    WHERE id = v_inventory_id;
  END IF;

  -- Log the usage
  INSERT INTO item_usage_log (
    student_id,
    template_id,
    inventory_id,
    usage_context,
    usage_data,
    effect_applied,
    created_at
  ) VALUES (
    p_student_id,
    v_template_id,
    v_inventory_id,
    'minesweeper',
    jsonb_build_object('action', 'undo_bomb_reveal'),
    jsonb_build_object(
      'effect_type', 'undo',
      'success', true
    ),
    NOW()
  );

  RAISE NOTICE 'Successfully consumed undo item % for student %', v_inventory_id, p_student_id;
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.try_consume_minesweeper_undo_item(UUID) IS
  'Attempts to consume a Minesweeper undo item from student inventory. Returns TRUE if successful.';

-- ============================================================================
-- PART 4: Function to Use Undo in a Game
-- ============================================================================

-- This function handles using the undo item during a game
-- It verifies the game state and consumes the item
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
  v_game RECORD;
  v_student_id UUID;
  v_consumed BOOLEAN;
BEGIN
  -- Get current user
  v_student_id := auth.uid();

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Non authentifié'
    );
  END IF;

  -- Get the game and verify ownership
  SELECT * INTO v_game
  FROM minesweeper_games
  WHERE id = p_game_id
  AND student_id = v_student_id
  FOR UPDATE;  -- Lock the row

  IF v_game IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Partie non trouvée'
    );
  END IF;

  -- Check game is in progress
  IF v_game.status != 'in_progress' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'La partie n''est plus en cours'
    );
  END IF;

  -- Check undo hasn't been used already
  IF v_game.undo_used THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Seconde Chance déjà utilisée dans cette partie'
    );
  END IF;

  -- Try to consume the undo item from inventory
  v_consumed := try_consume_minesweeper_undo_item(v_student_id);

  IF NOT v_consumed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Aucun item Seconde Chance disponible'
    );
  END IF;

  -- Update the game state
  UPDATE minesweeper_games
  SET undo_used = true,
      grid_state = p_grid_state,
      updated_at = NOW()
  WHERE id = p_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Seconde Chance utilisée avec succès'
  );
END;
$$;

COMMENT ON FUNCTION public.use_minesweeper_undo(UUID, JSONB) IS
  'Uses the "Seconde Chance" undo item in a Minesweeper game. Consumes the item and marks the game as having used undo.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.try_consume_minesweeper_undo_item(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_minesweeper_undo(UUID, JSONB) TO authenticated;
