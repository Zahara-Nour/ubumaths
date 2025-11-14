-- =====================================================================
-- MARKETPLACE AUDIT PHASE 9 - EXECUTE_TRADE AUTHORIZATION FIX
-- =====================================================================
-- SECURITY FIX (HIGH PRIORITY):
-- Adds authorization check to execute_trade() RPC function to verify
-- that the caller (auth.uid()) is actually a participant in the trade.
--
-- Previous version: Anyone could execute any trade
-- Fixed version: Only initiator_id or partner_id can execute
--
-- This prevents unauthorized trade execution vulnerability
-- Generated: 2025-11-14
-- =====================================================================

CREATE OR REPLACE FUNCTION public.execute_trade(p_trade_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    -- Get current VIP cards for both users
    SELECT vip_cards INTO v_initiator_vip_cards
    FROM public.profiles
    WHERE id = v_trade.initiator_id
    FOR UPDATE;

    SELECT vip_cards INTO v_partner_vip_cards
    FROM public.profiles
    WHERE id = v_trade.partner_id
    FOR UPDATE;

    -- Transfer cards from initiator to partner
    FOREACH v_card_id IN ARRAY v_initiator_cards
    LOOP
        v_card_data := v_initiator_vip_cards->v_card_id;
        IF v_card_data IS NULL THEN
            RAISE EXCEPTION 'Card % not found for initiator', v_card_id;
        END IF;

        -- Remove from initiator
        v_initiator_vip_cards := v_initiator_vip_cards - v_card_id;

        -- Add to partner
        v_partner_vip_cards := jsonb_set(
            COALESCE(v_partner_vip_cards, '{}'::jsonb),
            ARRAY[v_card_id],
            v_card_data || jsonb_build_object('traded_at', NOW())
        );

        -- Log in vip_cards_activity
        INSERT INTO public.vip_cards_activity (
            card_instance_id,
            student_id,
            action,
            metadata
        ) VALUES (
            v_card_id,
            v_trade.initiator_id,
            'marketplace_trade',
            jsonb_build_object(
                'trade_id', p_trade_id,
                'traded_to', v_trade.partner_id,
                'trade_type', 'sent'
            )
        );
    END LOOP;

    -- Transfer cards from partner to initiator
    FOREACH v_card_id IN ARRAY v_partner_cards
    LOOP
        v_card_data := v_partner_vip_cards->v_card_id;
        IF v_card_data IS NULL THEN
            RAISE EXCEPTION 'Card % not found for partner', v_card_id;
        END IF;

        -- Remove from partner
        v_partner_vip_cards := v_partner_vip_cards - v_card_id;

        -- Add to initiator
        v_initiator_vip_cards := jsonb_set(
            COALESCE(v_initiator_vip_cards, '{}'::jsonb),
            ARRAY[v_card_id],
            v_card_data || jsonb_build_object('traded_at', NOW())
        );

        -- Log in vip_cards_activity
        INSERT INTO public.vip_cards_activity (
            card_instance_id,
            student_id,
            action,
            metadata
        ) VALUES (
            v_card_id,
            v_trade.partner_id,
            'marketplace_trade',
            jsonb_build_object(
                'trade_id', p_trade_id,
                'traded_to', v_trade.initiator_id,
                'trade_type', 'sent'
            )
        );
    END LOOP;

    -- Update VIP cards for both users
    UPDATE public.profiles
    SET vip_cards = v_initiator_vip_cards
    WHERE id = v_trade.initiator_id;

    UPDATE public.profiles
    SET vip_cards = v_partner_vip_cards
    WHERE id = v_trade.partner_id;

    -- Transfer gidouilles using existing RPC function
    IF v_initiator_gidouilles > 0 THEN
        PERFORM public.update_student_gidouilles(
            v_trade.initiator_id::TEXT,
            -v_initiator_gidouilles,
            'marketplace_trade'
        );
        PERFORM public.update_student_gidouilles(
            v_trade.partner_id::TEXT,
            v_initiator_gidouilles,
            'marketplace_trade'
        );
    END IF;

    IF v_partner_gidouilles > 0 THEN
        PERFORM public.update_student_gidouilles(
            v_trade.partner_id::TEXT,
            -v_partner_gidouilles,
            'marketplace_trade'
        );
        PERFORM public.update_student_gidouilles(
            v_trade.initiator_id::TEXT,
            v_partner_gidouilles,
            'marketplace_trade'
        );
    END IF;

    -- Update trade status
    UPDATE public.marketplace_trades
    SET
        status = 'completed',
        completed_at = NOW(),
        final_trade = v_final_trade,
        updated_at = NOW()
    WHERE id = p_trade_id;

    -- Unlock all cards for this trade
    DELETE FROM public.marketplace_locked_cards
    WHERE locked_entity_id = p_trade_id;

    -- If this was a marketplace trade, update the listing and proposal
    IF v_trade.listing_id IS NOT NULL THEN
        UPDATE public.marketplace_listings
        SET
            status = 'completed',
            completed_at = NOW()
        WHERE id = v_trade.listing_id;

        UPDATE public.marketplace_proposals
        SET
            status = 'accepted',
            responded_at = NOW()
        WHERE id = v_trade.proposal_id;

        -- Reject all other proposals for this listing
        UPDATE public.marketplace_proposals
        SET
            status = 'rejected',
            responded_at = NOW(),
            response_message = 'Another proposal was accepted'
        WHERE listing_id = v_trade.listing_id
        AND id != v_trade.proposal_id
        AND status = 'pending';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'trade_id', p_trade_id,
        'completed_at', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Log error and rollback
        RAISE WARNING 'Trade execution failed: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Update comment to reflect security fix
COMMENT ON FUNCTION public.execute_trade IS 'Atomically execute a completed trade with full rollback on failure. SECURITY: Verifies caller is a trade participant before execution.';
