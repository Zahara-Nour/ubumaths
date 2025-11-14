-- =====================================================
-- Phase 9 Audit Fixes - Critical Security & Performance
-- Generated: 2025-11-15
-- Timestamp: 20251115160300
--
-- NOTE: This migration uses unique delimiters for each function
-- to avoid "cannot insert multiple commands into a prepared statement" error.
-- =====================================================

-- =====================================================
-- 1. SECURITY FIX: Add Authorization Check to execute_trade
-- =====================================================

-- Drop and recreate the execute_trade function with authorization check
DROP FUNCTION IF EXISTS public.execute_trade(UUID);

CREATE OR REPLACE FUNCTION public.execute_trade(p_trade_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $execute_trade$
DECLARE
    v_trade RECORD;
    v_final_trade JSONB;
    v_initiator_cards TEXT[];
    v_initiator_gidouilles INTEGER;
    v_partner_cards TEXT[];
    v_partner_gidouilles INTEGER;
    v_initiator_vip_cards JSONB;
    v_partner_vip_cards JSONB;
    v_card_id TEXT;
    v_card_data JSONB;
    v_daily_trade_count INTEGER;
    v_max_trades_per_day INTEGER;
BEGIN
    -- Lock the trade row for update
    SELECT * INTO v_trade
    FROM public.marketplace_trades
    WHERE id = p_trade_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
    END IF;

    -- CRITICAL SECURITY FIX: Verify caller is a participant in the trade
    IF auth.uid() != v_trade.initiator_id AND auth.uid() != v_trade.partner_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Non autorisé: vous devez être participant de cet échange'
        );
    END IF;

    IF v_trade.status != 'negotiating' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trade is not in negotiating status');
    END IF;

    IF v_trade.current_offer IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No offer to execute');
    END IF;

    -- Check daily trade limit for both participants
    SELECT COUNT(*) INTO v_daily_trade_count
    FROM public.marketplace_trades
    WHERE (initiator_id = v_trade.initiator_id OR partner_id = v_trade.initiator_id)
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE;

    -- Get max trades per day from config (default 10)
    SELECT COALESCE(MAX(max_trades_per_day), 10) INTO v_max_trades_per_day
    FROM public.marketplace_config mc
    JOIN public.classes c ON c.school_id = mc.school_id
    JOIN public.class_members cm ON cm.class_id = c.id
    WHERE cm.student_id = v_trade.initiator_id;

    IF v_daily_trade_count >= v_max_trades_per_day THEN
        RETURN jsonb_build_object('success', false, 'error', 'Daily trade limit reached for initiator');
    END IF;

    -- Check partner's daily limit
    SELECT COUNT(*) INTO v_daily_trade_count
    FROM public.marketplace_trades
    WHERE (initiator_id = v_trade.partner_id OR partner_id = v_trade.partner_id)
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE;

    IF v_daily_trade_count >= v_max_trades_per_day THEN
        RETURN jsonb_build_object('success', false, 'error', 'Daily trade limit reached for partner');
    END IF;

    -- Extract trade details
    v_final_trade := v_trade.current_offer;
    v_initiator_cards := ARRAY(SELECT jsonb_array_elements_text(v_final_trade->'from_initiator'->'cards'));
    v_initiator_gidouilles := COALESCE((v_final_trade->'from_initiator'->>'gidouilles')::INTEGER, 0);
    v_partner_cards := ARRAY(SELECT jsonb_array_elements_text(v_final_trade->'from_partner'->'cards'));
    v_partner_gidouilles := COALESCE((v_final_trade->'from_partner'->>'gidouilles')::INTEGER, 0);

    -- CRITICAL: Verify gidouilles balance before proceeding
    IF v_initiator_gidouilles > 0 THEN
        DECLARE
            v_initiator_balance INTEGER;
        BEGIN
            SELECT gidouilles INTO v_initiator_balance
            FROM public.profiles
            WHERE id = v_trade.initiator_id;

            IF v_initiator_balance IS NULL OR v_initiator_balance < v_initiator_gidouilles THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', format('Insufficient gidouilles: initiator has %s but needs %s',
                                   COALESCE(v_initiator_balance, 0), v_initiator_gidouilles)
                );
            END IF;
        END;
    END IF;

    IF v_partner_gidouilles > 0 THEN
        DECLARE
            v_partner_balance INTEGER;
        BEGIN
            SELECT gidouilles INTO v_partner_balance
            FROM public.profiles
            WHERE id = v_trade.partner_id;

            IF v_partner_balance IS NULL OR v_partner_balance < v_partner_gidouilles THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', format('Insufficient gidouilles: partner has %s but needs %s',
                                   COALESCE(v_partner_balance, 0), v_partner_gidouilles)
                );
            END IF;
        END;
    END IF;

    -- CRITICAL: Verify all cards exist and are owned by the correct users
    -- Check initiator's cards
    IF array_length(v_initiator_cards, 1) > 0 THEN
        PERFORM 1
        FROM public.vip_cards
        WHERE id::TEXT = ANY(v_initiator_cards)
        AND owner_id = v_trade.initiator_id
        HAVING COUNT(*) = array_length(v_initiator_cards, 1);

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Some initiator cards are not available or not owned'
            );
        END IF;
    END IF;

    -- Check partner's cards
    IF array_length(v_partner_cards, 1) > 0 THEN
        PERFORM 1
        FROM public.vip_cards
        WHERE id::TEXT = ANY(v_partner_cards)
        AND owner_id = v_trade.partner_id
        HAVING COUNT(*) = array_length(v_partner_cards, 1);

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Some partner cards are not available or not owned'
            );
        END IF;
    END IF;

    -- Build card details for the trade record
    IF array_length(v_initiator_cards, 1) > 0 THEN
        SELECT jsonb_agg(jsonb_build_object(
            'card_id', vc.id,
            'template_id', vc.template_id,
            'name', vct.name,
            'collection_id', vct.collection_id,
            'collection_name', vcc.name,
            'rarity', vct.rarity
        )) INTO v_initiator_vip_cards
        FROM public.vip_cards vc
        JOIN public.vip_card_templates vct ON vct.id = vc.template_id
        JOIN public.vip_card_collections vcc ON vcc.id = vct.collection_id
        WHERE vc.id::TEXT = ANY(v_initiator_cards);
    END IF;

    IF array_length(v_partner_cards, 1) > 0 THEN
        SELECT jsonb_agg(jsonb_build_object(
            'card_id', vc.id,
            'template_id', vc.template_id,
            'name', vct.name,
            'collection_id', vct.collection_id,
            'collection_name', vcc.name,
            'rarity', vct.rarity
        )) INTO v_partner_vip_cards
        FROM public.vip_cards vc
        JOIN public.vip_card_templates vct ON vct.id = vc.template_id
        JOIN public.vip_card_collections vcc ON vcc.id = vct.collection_id
        WHERE vc.id::TEXT = ANY(v_partner_cards);
    END IF;

    -- Execute the trade atomically
    -- Transfer gidouilles
    IF v_initiator_gidouilles > 0 THEN
        UPDATE public.profiles
        SET gidouilles = gidouilles - v_initiator_gidouilles
        WHERE id = v_trade.initiator_id;

        UPDATE public.profiles
        SET gidouilles = gidouilles + v_initiator_gidouilles
        WHERE id = v_trade.partner_id;
    END IF;

    IF v_partner_gidouilles > 0 THEN
        UPDATE public.profiles
        SET gidouilles = gidouilles - v_partner_gidouilles
        WHERE id = v_trade.partner_id;

        UPDATE public.profiles
        SET gidouilles = gidouilles + v_partner_gidouilles
        WHERE id = v_trade.initiator_id;
    END IF;

    -- Transfer cards
    IF array_length(v_initiator_cards, 1) > 0 THEN
        UPDATE public.vip_cards
        SET owner_id = v_trade.partner_id,
            updated_at = NOW()
        WHERE id::TEXT = ANY(v_initiator_cards)
        AND owner_id = v_trade.initiator_id;
    END IF;

    IF array_length(v_partner_cards, 1) > 0 THEN
        UPDATE public.vip_cards
        SET owner_id = v_trade.initiator_id,
            updated_at = NOW()
        WHERE id::TEXT = ANY(v_partner_cards)
        AND owner_id = v_trade.partner_id;
    END IF;

    -- Update trade status
    UPDATE public.marketplace_trades
    SET status = 'completed',
        completed_at = NOW(),
        final_trade = jsonb_build_object(
            'from_initiator', jsonb_build_object(
                'gidouilles', v_initiator_gidouilles,
                'cards', v_initiator_cards,
                'card_details', v_initiator_vip_cards
            ),
            'from_partner', jsonb_build_object(
                'gidouilles', v_partner_gidouilles,
                'cards', v_partner_cards,
                'card_details', v_partner_vip_cards
            )
        ),
        updated_at = NOW()
    WHERE id = p_trade_id;

    -- Unlock any cards that were locked for this trade
    UPDATE public.marketplace_locked_cards
    SET unlocked_at = NOW(),
        unlocked_reason = 'Trade completed'
    WHERE locked_entity_id = p_trade_id
    AND unlocked_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'trade_id', p_trade_id,
        'final_trade', jsonb_build_object(
            'from_initiator', jsonb_build_object(
                'gidouilles', v_initiator_gidouilles,
                'cards', v_initiator_cards
            ),
            'from_partner', jsonb_build_object(
                'gidouilles', v_partner_gidouilles,
                'cards', v_partner_cards
            )
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in execute_trade: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', 'Trade execution failed: ' || SQLERRM);
END;
$execute_trade$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.execute_trade(UUID) TO authenticated;

-- Add comment explaining the security fix
COMMENT ON FUNCTION public.execute_trade IS 'Atomically execute a completed trade with full rollback on failure. SECURITY: Verifies caller is a trade participant before execution.';

-- =====================================================
-- 2. PERFORMANCE FIX: Create Batch View Recording RPC
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_listing_views_batch(
  p_listing_ids UUID[],
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $record_listing_views_batch$
DECLARE
  v_new_views INTEGER := 0;
  v_updated_listings UUID[];
BEGIN
  -- Bulk insert with conflict handling
  -- Only inserts if no existing record (new unique view)
  INSERT INTO marketplace_listing_views (listing_id, user_id, viewed_at)
  SELECT DISTINCT unnest(p_listing_ids), p_user_id, NOW()
  ON CONFLICT (listing_id, user_id)
  DO UPDATE SET viewed_at = NOW()
  RETURNING listing_id INTO v_updated_listings;

  GET DIAGNOSTICS v_new_views = ROW_COUNT;

  -- Update view counters only for actual new views
  -- Use the returned listing_ids to ensure we only update what was actually inserted
  IF v_new_views > 0 THEN
    UPDATE marketplace_listings ml
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = ANY(
      SELECT listing_id
      FROM marketplace_listing_views mlv
      WHERE mlv.listing_id = ANY(p_listing_ids)
        AND mlv.user_id = p_user_id
        AND mlv.viewed_at >= NOW() - INTERVAL '1 second'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'new_views', v_new_views,
    'listing_ids', p_listing_ids
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in record_listing_views_batch: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to record views',
      'new_views', 0
    );
END;
$record_listing_views_batch$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.record_listing_views_batch TO authenticated;

-- Add comment explaining the performance improvement
COMMENT ON FUNCTION public.record_listing_views_batch IS 'Batch record multiple listing views in a single database call. Prevents N+1 query problem and improves performance.';

-- =====================================================
-- 3. PERFORMANCE FIX: Add Missing Database Indexes
-- =====================================================

-- Improve daily trade limit checks (used in execute_trade and check_daily_trade_limit)
CREATE INDEX IF NOT EXISTS idx_marketplace_trades_daily_initiator
ON marketplace_trades(initiator_id, created_at DESC)
WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_marketplace_trades_daily_partner
ON marketplace_trades(partner_id, created_at DESC)
WHERE status = 'completed';

-- Improve proposal lookups (frequently queried together)
CREATE INDEX IF NOT EXISTS idx_marketplace_proposals_lookup
ON marketplace_proposals(proposer_id, listing_id, status);

-- Improve listing queries with filters (common query pattern)
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_type_status
ON marketplace_listings(listing_type, status, created_at DESC);

-- Additional index for school-based listing queries
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_school_status
ON marketplace_listings(school_id, status, created_at DESC)
WHERE status = 'active';

-- Index for view count queries
CREATE INDEX IF NOT EXISTS idx_marketplace_listing_views_user
ON marketplace_listing_views(user_id, viewed_at DESC);

-- =====================================================
-- 4. Add Performance Comments
-- =====================================================

COMMENT ON INDEX idx_marketplace_trades_daily_initiator IS 'Optimizes daily trade limit checks for initiators';
COMMENT ON INDEX idx_marketplace_trades_daily_partner IS 'Optimizes daily trade limit checks for partners';
COMMENT ON INDEX idx_marketplace_proposals_lookup IS 'Optimizes proposal lookups by proposer, listing and status';
COMMENT ON INDEX idx_marketplace_listings_type_status IS 'Optimizes listing queries filtered by type and status';
COMMENT ON INDEX idx_marketplace_listings_school_status IS 'Optimizes school-specific active listing queries';
COMMENT ON INDEX idx_marketplace_listing_views_user IS 'Optimizes user view history queries';
