-- Fix critical and high-priority security issues in marketplace
-- Generated: 2025-11-14

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
    updated_at = NOW()
  WHERE id = p_proposal_id;

  -- Update listing status based on type
  UPDATE marketplace_listings
  SET
    status = CASE
      WHEN type = 'sale' THEN 'sold'::marketplace_listing_status
      ELSE 'completed'::marketplace_listing_status
    END,
    updated_at = NOW()
  WHERE id = v_proposal.listing_id;

  -- Reject all other pending proposals for this listing
  UPDATE marketplace_proposals
  SET
    status = 'rejected',
    updated_at = NOW()
  WHERE listing_id = v_proposal.listing_id
    AND id != p_proposal_id
    AND status = 'pending';

  -- Handle payment/trade based on listing type
  IF v_listing.type = 'sale' THEN
    -- Transfer gidouilles from buyer to seller
    UPDATE profiles
    SET gidouilles = gidouilles - v_proposal.amount
    WHERE id = v_proposal.user_id
      AND gidouilles >= v_proposal.amount;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient gidouilles: user % needs % but has less',
        v_proposal.user_id, v_proposal.amount;
    END IF;

    -- Credit seller
    UPDATE profiles
    SET gidouilles = gidouilles + v_proposal.amount
    WHERE id = v_listing.creator_id;

    -- Transfer cards if any
    IF v_listing.offered_card_ids IS NOT NULL AND array_length(v_listing.offered_card_ids, 1) > 0 THEN
      UPDATE vip_cards
      SET
        owner_id = v_proposal.user_id,
        updated_at = NOW()
      WHERE id = ANY(v_listing.offered_card_ids)
        AND owner_id = v_listing.creator_id;

      GET DIAGNOSTICS v_updated_count = ROW_COUNT;
      IF v_updated_count != array_length(v_listing.offered_card_ids, 1) THEN
        RAISE EXCEPTION 'Card ownership verification failed: expected % cards, updated %',
          array_length(v_listing.offered_card_ids, 1), v_updated_count;
      END IF;
    END IF;

  ELSIF v_listing.type = 'trade' THEN
    -- Handle card trade
    -- Transfer seller's cards to buyer
    IF v_listing.offered_card_ids IS NOT NULL AND array_length(v_listing.offered_card_ids, 1) > 0 THEN
      UPDATE vip_cards
      SET
        owner_id = v_proposal.user_id,
        updated_at = NOW()
      WHERE id = ANY(v_listing.offered_card_ids)
        AND owner_id = v_listing.creator_id;

      GET DIAGNOSTICS v_updated_count = ROW_COUNT;
      IF v_updated_count != array_length(v_listing.offered_card_ids, 1) THEN
        RAISE EXCEPTION 'Card ownership verification failed (seller cards): expected % cards, updated %',
          array_length(v_listing.offered_card_ids, 1), v_updated_count;
      END IF;
    END IF;

    -- Transfer buyer's cards to seller
    IF v_proposal.offered_card_ids IS NOT NULL AND array_length(v_proposal.offered_card_ids, 1) > 0 THEN
      UPDATE vip_cards
      SET
        owner_id = v_listing.creator_id,
        updated_at = NOW()
      WHERE id = ANY(v_proposal.offered_card_ids)
        AND owner_id = v_proposal.user_id;

      GET DIAGNOSTICS v_updated_count = ROW_COUNT;
      IF v_updated_count != array_length(v_proposal.offered_card_ids, 1) THEN
        RAISE EXCEPTION 'Card ownership verification failed (buyer cards): expected % cards, updated %',
          array_length(v_proposal.offered_card_ids, 1), v_updated_count;
      END IF;
    END IF;
  END IF;

  -- Create transaction record
  -- Note: marketplace_transactions table needs to be created first
  -- Commenting out until table exists
  -- INSERT INTO marketplace_transactions (
  --   listing_id,
  --   proposal_id,
  --   seller_id,
  --   buyer_id,
  --   transaction_type,
  --   amount,
  --   card_ids_from_seller,
  --   card_ids_from_buyer,
  --   status
  -- ) VALUES (
  --   v_proposal.listing_id,
  --   p_proposal_id,
  --   v_listing.creator_id,
  --   v_proposal.user_id,
  --   v_listing.listing_type,
  --   v_proposal.offered_gidouilles,
  --   v_listing.offered_card_ids,
  --   v_proposal.offered_card_ids,
  --   'completed'
  -- );

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

-- =====================================================
-- 2. HIGH: Unlock specific cards when removed from offers
-- =====================================================
CREATE OR REPLACE FUNCTION public.unlock_specific_cards(
  p_entity_id UUID,
  p_card_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unlocked_count INTEGER;
BEGIN
  -- Unlock only the specified cards that were locked by this entity
  UPDATE vip_cards
  SET
    locked_until = NULL,
    locked_by_entity_type = NULL,
    locked_by_entity_id = NULL,
    updated_at = NOW()
  WHERE id = ANY(p_card_ids)
    AND locked_by_entity_id = p_entity_id
    AND locked_until > NOW(); -- Only unlock if still locked

  GET DIAGNOSTICS v_unlocked_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'unlocked_count', v_unlocked_count
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.unlock_specific_cards TO authenticated;

-- =====================================================
-- 3. HIGH: Unique view tracking with deduplication
-- =====================================================

-- Create table for tracking unique views
CREATE TABLE IF NOT EXISTS public.marketplace_listing_views (
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  PRIMARY KEY (listing_id, user_id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_listing_views_listing_id
ON marketplace_listing_views(listing_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_listing_views_viewed_at
ON marketplace_listing_views(viewed_at);

-- Function to record a view and update count
CREATE OR REPLACE FUNCTION public.record_listing_view(
  p_listing_id UUID,
  p_user_id UUID,
  p_ip_address TEXT DEFAULT NULL
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
  INSERT INTO marketplace_listing_views (listing_id, user_id, ip_address, viewed_at)
  VALUES (p_listing_id, p_user_id, p_ip_address::INET, NOW())
  ON CONFLICT (listing_id, user_id) DO NOTHING;

  -- GET DIAGNOSTICS tells us if the INSERT actually happened
  GET DIAGNOSTICS v_is_new_view = (ROW_COUNT > 0);

  -- If it's a new view, increment the view count
  IF v_is_new_view THEN
    UPDATE marketplace_listings
    SET view_count = view_count + 1
    WHERE id = p_listing_id
    RETURNING view_count INTO v_view_count;
  ELSE
    -- Update the viewed_at timestamp for repeat views
    UPDATE marketplace_listing_views
    SET viewed_at = NOW(),
        ip_address = COALESCE(p_ip_address::INET, ip_address)
    WHERE listing_id = p_listing_id AND user_id = p_user_id;

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
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.record_listing_view TO authenticated;

-- Add RLS policies for the views table
ALTER TABLE marketplace_listing_views ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own views
CREATE POLICY "Users can record their own views" ON marketplace_listing_views
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can see all views (for analytics)
CREATE POLICY "Users can view all listing views" ON marketplace_listing_views
  FOR SELECT
  USING (true);

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
  v_config marketplace_config;
  v_trade_count INTEGER;
  v_max_trades INTEGER;
BEGIN
  -- Get marketplace config
  SELECT * INTO v_config
  FROM marketplace_config
  LIMIT 1;

  -- Default to 10 trades per day if not configured
  v_max_trades := COALESCE(v_config.max_trades_per_day, 10);

  -- Count trades created or participated in today
  SELECT COUNT(*) INTO v_trade_count
  FROM marketplace_trades
  WHERE (initiator_id = p_user_id OR partner_id = p_user_id)
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  RETURN json_build_object(
    'success', true,
    'can_create_trade', v_trade_count < v_max_trades,
    'trades_today', v_trade_count,
    'max_trades', v_max_trades,
    'remaining_trades', GREATEST(0, v_max_trades - v_trade_count)
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_daily_trade_limit TO authenticated;

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
  -- Get current balance with lock
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
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_gidouilles_balance TO authenticated;

-- =====================================================
-- 6. Add missing indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_marketplace_trades_created_at
ON marketplace_trades(created_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_trades_initiator_partner
ON marketplace_trades(initiator_id, partner_id);

-- Add comment explaining the security fixes
COMMENT ON FUNCTION public.accept_proposal_atomic IS 'Atomically accepts a proposal with proper row locking to prevent race conditions';
COMMENT ON FUNCTION public.unlock_specific_cards IS 'Unlocks specific cards that were removed from trade offers';
COMMENT ON FUNCTION public.record_listing_view IS 'Records unique views with deduplication to prevent view count manipulation';
COMMENT ON FUNCTION public.check_daily_trade_limit IS 'Checks if user has reached daily trade limit before allowing new trade creation';
COMMENT ON TABLE public.marketplace_listing_views IS 'Tracks unique views per user to prevent view count manipulation';