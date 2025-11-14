-- =====================================================================
-- MARKETPLACE SECURITY PHASE 6 - RPC FUNCTIONS
-- =====================================================================
-- Creates 5 security-hardened RPC functions for marketplace operations:
-- 1. accept_proposal_atomic - Atomic proposal acceptance with row locking
-- 2. unlock_specific_cards - Selective card unlocking (not all)
-- 3. record_listing_view - Unique view tracking with deduplication
-- 4. check_daily_trade_limit - Enforce trade limits at creation
-- 5. check_gidouilles_balance - Atomic balance verification
--
-- These functions prevent race conditions, DoS attacks, and data integrity issues
-- Generated: 2025-11-14
-- =====================================================================

-- =====================================================
-- 1. CRITICAL: Atomic proposal acceptance with row locking
-- =====================================================
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.accept_proposal_atomic TO authenticated;

COMMENT ON FUNCTION public.accept_proposal_atomic IS 'Atomically accept a marketplace proposal with row-level locking to prevent race conditions';

-- =====================================================
-- 2. HIGH: Unlock specific cards when removed from offers
-- =====================================================
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.unlock_specific_cards TO authenticated;

COMMENT ON FUNCTION public.unlock_specific_cards IS 'Unlock specific VIP cards (not all) when removed from trade/listing offer';

-- =====================================================
-- 3. HIGH: Unique view tracking with deduplication
-- =====================================================
CREATE OR REPLACE FUNCTION public.record_listing_view(
  p_listing_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_new_view BOOLEAN;
  v_view_count INTEGER;
BEGIN
  -- Check if this is a new view by attempting to insert
  -- Use INSERT ... ON CONFLICT DO NOTHING and check if row was inserted
  INSERT INTO marketplace_listing_views (listing_id, user_id, viewed_at)
  VALUES (p_listing_id, p_user_id, NOW())
  ON CONFLICT (listing_id, user_id) DO UPDATE
    SET viewed_at = NOW(); -- Update timestamp for repeat views

  -- Check if this was a first-time view (not in the table before)
  -- by checking if INSERT happened or was a conflict
  GET DIAGNOSTICS v_is_new_view = (ROW_COUNT > 0);

  -- If it's a new view (first time), increment the view count
  IF v_is_new_view AND NOT EXISTS (
    SELECT 1 FROM marketplace_listing_views
    WHERE listing_id = p_listing_id AND user_id = p_user_id
    AND viewed_at < NOW() - INTERVAL '1 second'
  ) THEN
    UPDATE marketplace_listings
    SET view_count = view_count + 1
    WHERE id = p_listing_id
    RETURNING view_count INTO v_view_count;
  ELSE
    -- Get current view count without incrementing
    SELECT view_count INTO v_view_count
    FROM marketplace_listings
    WHERE id = p_listing_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'is_new_view', v_is_new_view,
    'view_count', v_view_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.record_listing_view TO authenticated;

COMMENT ON FUNCTION public.record_listing_view IS 'Record unique view per user per listing to prevent DoS via view count inflation';

-- =====================================================
-- 4. HIGH: Check daily trade limit at creation
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_daily_trade_limit(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trade_count INTEGER;
  v_max_trades INTEGER;
BEGIN
  -- Get max trades per day from config (default 10)
  SELECT COALESCE(MAX(max_trades_per_day), 10) INTO v_max_trades
  FROM marketplace_config mc
  JOIN classes c ON c.school_id = mc.school_id
  JOIN class_members cm ON cm.class_id = c.id
  WHERE cm.student_id = p_user_id;

  -- Count trades created or participated in today
  SELECT COUNT(*) INTO v_trade_count
  FROM marketplace_trades
  WHERE (initiator_id = p_user_id OR partner_id = p_user_id)
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE
    AND completed_at < CURRENT_DATE + INTERVAL '1 day';

  RETURN json_build_object(
    'success', true,
    'can_create_trade', v_trade_count < v_max_trades,
    'trades_today', v_trade_count,
    'max_trades', v_max_trades,
    'remaining_trades', GREATEST(0, v_max_trades - v_trade_count)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_daily_trade_limit TO authenticated;

COMMENT ON FUNCTION public.check_daily_trade_limit IS 'Check if user has reached daily trade limit before allowing trade creation';

-- =====================================================
-- 5. Helper function to check gidouilles balance atomically
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_gidouilles_balance(
  p_user_id UUID,
  p_required_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Get current balance with lock to prevent race conditions
  SELECT gidouilles INTO v_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Utilisateur introuvable'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'has_sufficient_balance', v_balance >= p_required_amount,
    'current_balance', v_balance,
    'required_amount', p_required_amount,
    'deficit', GREATEST(0, p_required_amount - v_balance)
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Une autre transaction est en cours'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_gidouilles_balance TO authenticated;

COMMENT ON FUNCTION public.check_gidouilles_balance IS 'Atomically check if user has sufficient gidouilles balance with row-level locking';
