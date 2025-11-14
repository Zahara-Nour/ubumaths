-- =====================================================================
-- MARKETPLACE SECURITY PHASE 6 - FUNCTION 1/5: accept_proposal_atomic
-- =====================================================================
-- Atomic proposal acceptance with row-level locking to prevent race conditions
-- This function ensures that only one proposal can be accepted at a time for a listing
-- Generated: 2025-11-14
-- =====================================================================

CREATE OR REPLACE FUNCTION public.accept_proposal_atomic(
  p_proposal_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_proposal marketplace_proposals;
  v_listing marketplace_listings;
  v_result JSON;
  v_updated_count INTEGER;
BEGIN
  -- Start transaction with proper isolation
  -- Lock the proposal row for update (fail fast if already locked)
  SELECT * INTO v_proposal
  FROM marketplace_proposals
  WHERE id = p_proposal_id
  FOR UPDATE NOWAIT;

  -- Check proposal exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Proposition introuvable'
    );
  END IF;

  -- Check proposal is pending
  IF v_proposal.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cette proposition a déjà été traitée'
    );
  END IF;

  -- Lock the listing row for update
  SELECT * INTO v_listing
  FROM marketplace_listings
  WHERE id = v_proposal.listing_id
  FOR UPDATE NOWAIT;

  -- Check listing exists and is active
  IF NOT FOUND OR v_listing.status != 'active' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cette annonce n''est plus disponible'
    );
  END IF;

  -- Check user is the listing owner
  IF v_listing.creator_id != p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Vous n''êtes pas autorisé à accepter cette proposition'
    );
  END IF;

  -- Update proposal to accepted
  UPDATE marketplace_proposals
  SET
    status = 'accepted',
    responded_at = NOW()
  WHERE id = p_proposal_id;

  -- Update listing status to completed
  UPDATE marketplace_listings
  SET
    status = 'completed',
    completed_at = NOW()
  WHERE id = v_proposal.listing_id;

  -- Reject all other pending proposals for this listing
  UPDATE marketplace_proposals
  SET
    status = 'rejected',
    responded_at = NOW(),
    response_message = 'Autre proposition acceptée'
  WHERE listing_id = v_proposal.listing_id
    AND id != p_proposal_id
    AND status = 'pending';

  RETURN json_build_object(
    'success', true,
    'message', 'Proposition acceptée avec succès'
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
      'error', 'Une erreur est survenue lors de l''acceptation'
    );
END;
$$;

COMMENT ON FUNCTION public.accept_proposal_atomic IS 'Atomically accept a marketplace proposal with row-level locking to prevent race conditions';

GRANT EXECUTE ON FUNCTION public.accept_proposal_atomic(UUID, UUID) TO authenticated;
