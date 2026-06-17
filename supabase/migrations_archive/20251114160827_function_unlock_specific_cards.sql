-- =====================================================================
-- MARKETPLACE SECURITY PHASE 6 - FUNCTION 2/5: unlock_specific_cards
-- =====================================================================
-- Unlock specific VIP cards (not all) when removed from trade/listing offer
-- This prevents accidental unlocking of all cards when only some should be unlocked
-- Generated: 2025-11-14
-- =====================================================================

CREATE OR REPLACE FUNCTION public.unlock_specific_cards(
  p_entity_id UUID,
  p_card_ids TEXT[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unlocked_count INTEGER;
BEGIN
  -- Delete lock records for the specified cards
  DELETE FROM marketplace_locked_cards
  WHERE locked_entity_id = p_entity_id
    AND card_instance_id = ANY(p_card_ids);

  GET DIAGNOSTICS v_unlocked_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'unlocked_count', v_unlocked_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
