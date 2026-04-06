-- Fix accept_proposal_atomic to actually transfer assets
-- Previously it only changed statuses without transferring cards/gidouilles.
-- Now it creates a marketplace_trade and calls execute_trade for the actual transfer.

CREATE OR REPLACE FUNCTION public.accept_proposal_atomic(
  p_proposal_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal marketplace_proposals;
  v_listing marketplace_listings;
  v_trade_id UUID;
  v_current_offer JSONB;
  v_execute_result JSONB;
BEGIN
  -- Lock the proposal row
  SELECT * INTO v_proposal
  FROM marketplace_proposals
  WHERE id = p_proposal_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Proposition introuvable');
  END IF;

  IF v_proposal.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Cette proposition a déjà été traitée');
  END IF;

  -- Lock the listing row
  SELECT * INTO v_listing
  FROM marketplace_listings
  WHERE id = v_proposal.listing_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND OR v_listing.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Cette annonce n''est plus disponible');
  END IF;

  IF v_listing.creator_id != p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Vous n''êtes pas autorisé à accepter cette proposition');
  END IF;

  -- Build current_offer in the format execute_trade expects:
  -- For a listing acceptance:
  --   "initiator" = listing creator (who gives listing's offered items)
  --   "partner" = proposer (who gives proposal's offered items)
  v_current_offer := jsonb_build_object(
    'from_initiator', jsonb_build_object(
      'cards', COALESCE(to_jsonb(v_listing.offered_card_ids), '[]'::jsonb),
      'gidouilles', COALESCE(v_listing.offered_gidouilles, 0)
    ),
    'from_partner', jsonb_build_object(
      'cards', COALESCE(to_jsonb(v_proposal.offered_card_ids), '[]'::jsonb),
      'gidouilles', COALESCE(v_proposal.offered_gidouilles, 0)
    )
  );

  -- Create a trade record for execute_trade to process
  v_trade_id := gen_random_uuid();
  INSERT INTO marketplace_trades (
    id, initiator_id, partner_id, trade_type, status,
    listing_id, proposal_id, current_offer, created_at, updated_at
  ) VALUES (
    v_trade_id, v_listing.creator_id, v_proposal.proposer_id,
    'listing', 'negotiating',
    v_listing.id, v_proposal.id,
    v_current_offer, NOW(), NOW()
  );

  -- Execute the trade (transfers cards, gidouilles, logs activity)
  v_execute_result := execute_trade(v_trade_id);

  IF NOT (v_execute_result->>'success')::boolean THEN
    -- execute_trade failed, it handles its own cleanup
    -- but we need to remove the trade we just created
    DELETE FROM marketplace_trades WHERE id = v_trade_id;
    RETURN json_build_object(
      'success', false,
      'error', COALESCE(v_execute_result->>'error', 'Erreur lors de l''exécution de l''échange')
    );
  END IF;

  -- Reject all other pending proposals and unlock their cards
  DECLARE
    v_other_proposal RECORD;
  BEGIN
    FOR v_other_proposal IN
      SELECT id FROM marketplace_proposals
      WHERE listing_id = v_listing.id
        AND id != p_proposal_id
        AND status = 'pending'
    LOOP
      UPDATE marketplace_proposals
      SET status = 'rejected', responded_at = NOW(),
          response_message = 'Autre proposition acceptée'
      WHERE id = v_other_proposal.id;

      -- Unlock cards locked for this proposal
      DELETE FROM marketplace_locked_cards
      WHERE locked_entity_id = v_other_proposal.id;
    END LOOP;
  END;

  -- Unlock cards locked for the listing itself
  DELETE FROM marketplace_locked_cards
  WHERE locked_entity_id = v_listing.id;

  RETURN json_build_object(
    'success', true,
    'message', 'Proposition acceptée et échange effectué',
    'trade_id', v_trade_id
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Une autre transaction est en cours sur cette annonce'
    );
  WHEN OTHERS THEN
    RAISE LOG 'Error in accept_proposal_atomic: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Une erreur est survenue: ' || SQLERRM
    );
END;
$$;
