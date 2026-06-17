-- ============================================================================
-- Fix: Trade journal entries display issues
-- ============================================================================
-- PROBLEMS:
--   1. log_vip_card_changes() trigger creates spurious "removed" entries
--      for traded cards (dedup only checks 'removed', not 'traded'/'gained')
--   2. Gidouilles descriptions don't include partner name or trade ID
--   3. VIP card traded descriptions don't include partner name or trade ID
--   4. Old marketplace_trades trigger (if still present) creates entries
--      with event_type='traded' causing wrong amount sign in UI
--
-- FIXES:
--   A. log_vip_card_changes: also skip if 'traded'/'gained' already logged
--   B. execute_trade: better gidouilles reasons with name + trade ID
--   C. execute_trade: include partner name in vip_cards_activity metadata
--   D. log_vip_cards_to_events: use partner name from metadata in descriptions
--   E. Drop old marketplace_trades trigger (idempotent)
--   F. Clean up spurious 'removed' entries from past trades
-- ============================================================================


-- ============================================================================
-- FIX A: log_vip_card_changes - dedup for traded/gained too
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_vip_card_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_cards JSONB;
    v_new_cards JSONB;
BEGIN
    IF OLD.vip_cards IS DISTINCT FROM NEW.vip_cards THEN
        v_old_cards := COALESCE(OLD.vip_cards, '{}'::JSONB);
        v_new_cards := COALESCE(NEW.vip_cards, '{}'::JSONB);

        INSERT INTO public.vip_cards_activity (
            student_id,
            card_instance_id,
            card_template_id,
            action,
            metadata
        )
        SELECT
            NEW.id,
            old_cards.instance_id,
            old_cards.card_data->>'cardId',
            'removed',
            jsonb_build_object(
                'removed_by', COALESCE(auth.uid()::TEXT, 'system'),
                'removed_at', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'was_used', (old_cards.card_data->>'usedAt') IS NOT NULL
            )
        FROM jsonb_each(v_old_cards) AS old_cards(instance_id, card_data)
        WHERE NOT EXISTS (
            SELECT 1
            FROM jsonb_each(v_new_cards) AS new_cards(instance_id, card_data)
            WHERE new_cards.instance_id = old_cards.instance_id
        )
        -- Skip if ANY action was already logged for this card in the current
        -- transaction (covers 'removed' from RPC, 'traded'/'gained' from execute_trade)
        AND NOT EXISTS (
            SELECT 1
            FROM public.vip_cards_activity vca
            WHERE vca.student_id = NEW.id
              AND vca.card_instance_id = old_cards.instance_id
              AND vca.created_at >= NOW()
        );
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_vip_card_changes() IS
'Trigger function that logs ONLY card removals to vip_cards_activity.
Gained, used, and traded actions are logged by their respective RPC functions.
Includes dedup check: skips if ANY activity was already logged for that card
in the current transaction (prevents spurious removed entries for trades).';


-- ============================================================================
-- FIX B+C: execute_trade - better reasons and metadata
-- ============================================================================

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
    v_card_template_id TEXT;
    v_daily_trade_count INTEGER;
    v_max_trades_per_day INTEGER;
    v_initiator_balance INTEGER;
    v_partner_balance INTEGER;
    v_initiator_name TEXT;
    v_partner_name TEXT;
    v_initiator_class_id UUID;
    v_partner_class_id UUID;
    v_trade_id_short TEXT;
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

    -- Get and lock both profiles for gidouilles verification and update
    SELECT gidouilles, vip_cards INTO v_initiator_balance, v_initiator_vip_cards
    FROM public.profiles
    WHERE id = v_trade.initiator_id
    FOR UPDATE;

    SELECT gidouilles, vip_cards INTO v_partner_balance, v_partner_vip_cards
    FROM public.profiles
    WHERE id = v_trade.partner_id
    FOR UPDATE;

    -- Get names for history logging
    SELECT COALESCE(NULLIF(TRIM(COALESCE(firstname, '') || ' ' || COALESCE(lastname, '')), ''), 'Élève')
    INTO v_initiator_name
    FROM public.profiles WHERE id = v_trade.initiator_id;

    SELECT COALESCE(NULLIF(TRIM(COALESCE(firstname, '') || ' ' || COALESCE(lastname, '')), ''), 'Élève')
    INTO v_partner_name
    FROM public.profiles WHERE id = v_trade.partner_id;

    -- Get class_id for both participants
    SELECT cm.class_id INTO v_initiator_class_id
    FROM public.class_members cm
    WHERE cm.student_id = v_trade.initiator_id
    AND cm.status = 'active'
    LIMIT 1;

    SELECT cm.class_id INTO v_partner_class_id
    FROM public.class_members cm
    WHERE cm.student_id = v_trade.partner_id
    AND cm.status = 'active'
    LIMIT 1;

    -- Short trade ID for display
    v_trade_id_short := LEFT(p_trade_id::TEXT, 8);

    -- Verify gidouilles balance for initiator
    IF v_initiator_gidouilles > 0 THEN
        IF v_initiator_balance IS NULL OR v_initiator_balance < v_initiator_gidouilles THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Solde insuffisant: initiateur a %s mais a besoin de %s',
                               COALESCE(v_initiator_balance, 0), v_initiator_gidouilles)
            );
        END IF;
    END IF;

    -- Verify gidouilles balance for partner
    IF v_partner_gidouilles > 0 THEN
        IF v_partner_balance IS NULL OR v_partner_balance < v_partner_gidouilles THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Solde insuffisant: partenaire a %s mais a besoin de %s',
                               COALESCE(v_partner_balance, 0), v_partner_gidouilles)
            );
        END IF;
    END IF;

    -- ========================================================================
    -- Transfer cards from initiator to partner
    -- ========================================================================
    FOREACH v_card_id IN ARRAY v_initiator_cards
    LOOP
        v_card_data := v_initiator_vip_cards->v_card_id;
        IF v_card_data IS NULL THEN
            RAISE EXCEPTION 'Card % not found for initiator', v_card_id;
        END IF;

        v_card_template_id := v_card_data->>'cardId';
        v_initiator_vip_cards := v_initiator_vip_cards - v_card_id;
        v_partner_vip_cards := jsonb_set(
            COALESCE(v_partner_vip_cards, '{}'::jsonb),
            ARRAY[v_card_id],
            v_card_data || jsonb_build_object('traded_at', NOW(), 'acquiredFrom', 'trade')
        );

        -- Log sender activity (FIX C: include partner name)
        INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
        VALUES (v_card_id, v_trade.initiator_id, v_card_template_id, 'traded',
            jsonb_build_object(
                'trade_id', p_trade_id,
                'traded_to', v_trade.partner_id,
                'traded_to_name', v_partner_name,
                'direction', 'sent'
            ));

        -- Log receiver activity (FIX C: include sender name)
        INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
        VALUES (v_card_id, v_trade.partner_id, v_card_template_id, 'gained',
            jsonb_build_object(
                'acquired_from', 'trade',
                'trade_id', p_trade_id,
                'received_from', v_trade.initiator_id,
                'received_from_name', v_initiator_name
            ));
    END LOOP;

    -- ========================================================================
    -- Transfer cards from partner to initiator
    -- ========================================================================
    FOREACH v_card_id IN ARRAY v_partner_cards
    LOOP
        v_card_data := v_partner_vip_cards->v_card_id;
        IF v_card_data IS NULL THEN
            RAISE EXCEPTION 'Card % not found for partner', v_card_id;
        END IF;

        v_card_template_id := v_card_data->>'cardId';
        v_partner_vip_cards := v_partner_vip_cards - v_card_id;
        v_initiator_vip_cards := jsonb_set(
            COALESCE(v_initiator_vip_cards, '{}'::jsonb),
            ARRAY[v_card_id],
            v_card_data || jsonb_build_object('traded_at', NOW(), 'acquiredFrom', 'trade')
        );

        -- Log sender activity (FIX C: include partner name)
        INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
        VALUES (v_card_id, v_trade.partner_id, v_card_template_id, 'traded',
            jsonb_build_object(
                'trade_id', p_trade_id,
                'traded_to', v_trade.initiator_id,
                'traded_to_name', v_initiator_name,
                'direction', 'sent'
            ));

        -- Log receiver activity (FIX C: include sender name)
        INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
        VALUES (v_card_id, v_trade.initiator_id, v_card_template_id, 'gained',
            jsonb_build_object(
                'acquired_from', 'trade',
                'trade_id', p_trade_id,
                'received_from', v_trade.partner_id,
                'received_from_name', v_partner_name
            ));
    END LOOP;

    -- ========================================================================
    -- Update profiles and log gidouilles activity
    -- ========================================================================

    -- Update initiator profile
    UPDATE public.profiles
    SET
        vip_cards = v_initiator_vip_cards,
        gidouilles = GREATEST(0, COALESCE(gidouilles, 0) - v_initiator_gidouilles + v_partner_gidouilles),
        updated_at = NOW()
    WHERE id = v_trade.initiator_id;

    -- Update partner profile
    UPDATE public.profiles
    SET
        vip_cards = v_partner_vip_cards,
        gidouilles = GREATEST(0, COALESCE(gidouilles, 0) - v_partner_gidouilles + v_initiator_gidouilles),
        updated_at = NOW()
    WHERE id = v_trade.partner_id;

    -- FIX B: Log gidouilles activity with descriptive reasons
    IF v_initiator_gidouilles > 0 THEN
        -- Initiator sent gidouilles
        INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
        VALUES (v_trade.initiator_id, v_initiator_class_id, -v_initiator_gidouilles,
                format('Donné à %s (échange #%s)', v_partner_name, v_trade_id_short), NULL);
        -- Partner received gidouilles
        INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
        VALUES (v_trade.partner_id, v_partner_class_id, v_initiator_gidouilles,
                format('Reçu de %s (échange #%s)', v_initiator_name, v_trade_id_short), NULL);
    END IF;

    IF v_partner_gidouilles > 0 THEN
        -- Partner sent gidouilles
        INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
        VALUES (v_trade.partner_id, v_partner_class_id, -v_partner_gidouilles,
                format('Donné à %s (échange #%s)', v_initiator_name, v_trade_id_short), NULL);
        -- Initiator received gidouilles
        INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
        VALUES (v_trade.initiator_id, v_initiator_class_id, v_partner_gidouilles,
                format('Reçu de %s (échange #%s)', v_partner_name, v_trade_id_short), NULL);
    END IF;

    -- ========================================================================
    -- Update trade status
    -- ========================================================================
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

    -- If this was a marketplace listing trade, update listing and proposals
    IF v_trade.listing_id IS NOT NULL THEN
        UPDATE public.marketplace_listings
        SET status = 'completed', completed_at = NOW()
        WHERE id = v_trade.listing_id;

        UPDATE public.marketplace_proposals
        SET status = 'accepted', responded_at = NOW()
        WHERE id = v_trade.proposal_id;

        UPDATE public.marketplace_proposals
        SET status = 'rejected', responded_at = NOW(), response_message = 'Another proposal was accepted'
        WHERE listing_id = v_trade.listing_id AND id != v_trade.proposal_id AND status = 'pending';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'trade_id', p_trade_id,
        'completed_at', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Trade execution failed: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.execute_trade IS
'Atomically execute a trade. Updates vip_cards and gidouilles directly.
Logs to vip_cards_activity (with partner names) and gidouilles_activity
(with descriptive reasons including partner name and trade ID).';


-- ============================================================================
-- FIX D: log_vip_cards_to_events - use partner name from metadata
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_vip_cards_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_type public.reward_event_type;
    v_card_name TEXT;
    v_description TEXT;
    v_class_id UUID;
    v_acquired_from TEXT;
    v_action_type TEXT;
    v_used_by TEXT;
    v_trade_id TEXT;
    v_partner_name TEXT;
    v_amount INT;
BEGIN
    -- Skip if already logged
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'vip_cards_activity'
        AND source_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    -- Map action to event type
    CASE NEW.action
        WHEN 'gained' THEN v_event_type := 'earned';
        WHEN 'used' THEN v_event_type := 'used';
        WHEN 'removed' THEN v_event_type := 'removed';
        WHEN 'traded' THEN v_event_type := 'traded';
        WHEN 'approved' THEN RETURN NEW;
        WHEN 'rejected' THEN RETURN NEW;
        WHEN 'requested' THEN RETURN NEW;
        ELSE v_event_type := 'earned';
    END CASE;

    -- Get card name from template
    SELECT name INTO v_card_name
    FROM public.vip_card_templates
    WHERE id = NEW.card_template_id;

    v_card_name := COALESCE(v_card_name, NEW.card_template_id);

    -- Extract metadata fields for contextual descriptions
    v_acquired_from := NEW.metadata->>'acquired_from';
    v_action_type := NEW.metadata->>'action_type';
    v_used_by := NEW.metadata->>'used_by';
    v_trade_id := LEFT(COALESCE(NEW.metadata->>'trade_id', ''), 8);

    -- Build contextual description based on action + metadata
    v_description := CASE
        -- GAINED descriptions
        WHEN NEW.action = 'gained' AND v_acquired_from = 'purchase' THEN
            'Carte VIP achetee : ' || v_card_name
            || COALESCE(' (-' || (NEW.metadata->>'price_paid') || ' gidouilles)', '')
        WHEN NEW.action = 'gained' AND v_acquired_from = 'draw_gidouilles' THEN
            'Carte VIP obtenue par tirage : ' || v_card_name
        WHEN NEW.action = 'gained' AND v_acquired_from = 'draw_vip_card' THEN
            'Carte VIP obtenue par tirage (carte VIP) : ' || v_card_name
        WHEN NEW.action = 'gained' AND v_acquired_from = 'exchange' THEN
            'Carte VIP obtenue par echange : ' || v_card_name
        WHEN NEW.action = 'gained' AND v_acquired_from = 'choose' THEN
            'Carte VIP choisie : ' || v_card_name
        WHEN NEW.action = 'gained' AND v_acquired_from = 'teacher_award' THEN
            'Carte VIP offerte par le prof : ' || v_card_name
        WHEN NEW.action = 'gained' AND v_acquired_from = 'teacher_draw' THEN
            'Carte VIP tiree par le prof : ' || v_card_name
        -- FIX D: gained from trade includes sender name
        WHEN NEW.action = 'gained' AND v_acquired_from = 'trade' THEN
            format('Carte reçue de %s (échange #%s) : %s',
                COALESCE(NEW.metadata->>'received_from_name', 'un élève'),
                v_trade_id, v_card_name)
        WHEN NEW.action = 'gained' THEN
            'Carte VIP obtenue : ' || v_card_name

        -- USED descriptions
        WHEN NEW.action = 'used' AND v_action_type = 'draw_cards' THEN
            'Carte VIP utilisee pour tirer '
            || COALESCE((NEW.metadata->>'cards_drawn')::TEXT, '')
            || ' cartes : ' || v_card_name
        WHEN NEW.action = 'used' AND v_action_type = 'exchange_cards' THEN
            'Carte VIP utilisee pour echanger des cartes : ' || v_card_name
        WHEN NEW.action = 'used' AND v_action_type = 'remove_warnings' THEN
            'Carte VIP utilisee pour retirer '
            || COALESCE((NEW.metadata->>'warnings_removed')::TEXT, '')
            || ' avertissements : ' || v_card_name
        WHEN NEW.action = 'used' AND v_action_type = 'add_gidouilles' THEN
            'Carte VIP utilisee pour gagner '
            || COALESCE((NEW.metadata->>'gidouilles_amount')::TEXT, '')
            || ' gidouilles : ' || v_card_name
        WHEN NEW.action = 'used' AND v_action_type = 'choose_card' THEN
            'Carte VIP utilisee pour choisir des cartes : ' || v_card_name
        WHEN NEW.action = 'used' AND v_used_by = 'exchange' THEN
            'Carte VIP defaussee (echange) : ' || v_card_name
        WHEN NEW.action = 'used' THEN
            'Carte VIP utilisee : ' || v_card_name

        -- REMOVED description
        WHEN NEW.action = 'removed' THEN
            'Carte VIP retiree par le prof : ' || v_card_name

        -- FIX D: TRADED description includes receiver name
        WHEN NEW.action = 'traded' THEN
            format('Carte donnée à %s (échange #%s) : %s',
                COALESCE(NEW.metadata->>'traded_to_name', 'un élève'),
                v_trade_id, v_card_name)

        -- Fallback
        ELSE 'Carte VIP : ' || v_card_name
    END;

    -- Get class_id from student's active membership
    SELECT cm.class_id INTO v_class_id
    FROM public.class_members cm
    WHERE cm.student_id = NEW.student_id
    AND cm.status = 'active'
    LIMIT 1;

    INSERT INTO public.reward_events (
        student_id,
        reward_type,
        event_type,
        item_name,
        description,
        metadata,
        source_table,
        source_id,
        class_id,
        created_by,
        created_at
    ) VALUES (
        NEW.student_id,
        'vip_card',
        v_event_type,
        v_card_name,
        v_description,
        COALESCE(NEW.metadata, '{}') || jsonb_build_object(
            'card_instance_id', NEW.card_instance_id,
            'card_template_id', NEW.card_template_id,
            'action', NEW.action
        ),
        'vip_cards_activity',
        NEW.id,
        v_class_id,
        CASE
            WHEN (NEW.metadata->>'removed_by') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN (NEW.metadata->>'removed_by')::UUID
            ELSE NULL
        END,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_vip_cards_to_events() IS
'Trigger function that maps vip_cards_activity rows to reward_events.
Maps: gained->earned, used->used, removed->removed, traded->traded.
Skips: approved, rejected, requested (intermediate states).
Uses partner names from metadata for trade descriptions.';


-- ============================================================================
-- FIX E: Drop old marketplace_trades trigger (idempotent)
-- ============================================================================
-- This trigger creates duplicate gidouilles entries and uses event_type='traded'
-- which the UI doesn't handle correctly for received amounts.

DROP TRIGGER IF EXISTS trigger_log_marketplace_trades_to_events ON public.marketplace_trades;
DROP FUNCTION IF EXISTS public.log_marketplace_trades_to_events();


-- ============================================================================
-- FIX F: Clean up spurious 'removed' entries from past trades
-- ============================================================================
-- Delete reward_events with event_type='removed' that correspond to cards
-- that were actually traded (a 'traded' event exists for the same card
-- around the same time).

DELETE FROM public.reward_events re_removed
WHERE re_removed.reward_type = 'vip_card'
  AND re_removed.event_type = 'removed'
  AND re_removed.source_table = 'vip_cards_activity'
  AND EXISTS (
    SELECT 1 FROM public.reward_events re_traded
    WHERE re_traded.reward_type = 'vip_card'
      AND re_traded.event_type = 'traded'
      AND re_traded.student_id = re_removed.student_id
      AND re_traded.source_table = 'vip_cards_activity'
      -- Same card (check card_instance_id in metadata)
      AND re_traded.metadata->>'card_instance_id' = re_removed.metadata->>'card_instance_id'
      -- Within 5 seconds of each other (same transaction)
      AND ABS(EXTRACT(EPOCH FROM re_traded.created_at - re_removed.created_at)) < 5
  );

-- Also clean up the spurious vip_cards_activity 'removed' entries
DELETE FROM public.vip_cards_activity vca_removed
WHERE vca_removed.action = 'removed'
  AND EXISTS (
    SELECT 1 FROM public.vip_cards_activity vca_traded
    WHERE vca_traded.action = 'traded'
      AND vca_traded.student_id = vca_removed.student_id
      AND vca_traded.card_instance_id = vca_removed.card_instance_id
      AND ABS(EXTRACT(EPOCH FROM vca_traded.created_at - vca_removed.created_at)) < 5
  );


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'Migration completed: Fix trade journal entries';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  Fix A: log_vip_card_changes dedup covers traded/gained';
  RAISE NOTICE '  Fix B: execute_trade gidouilles reasons with name + ID';
  RAISE NOTICE '  Fix C: execute_trade vip_cards metadata with partner name';
  RAISE NOTICE '  Fix D: log_vip_cards_to_events uses partner name';
  RAISE NOTICE '  Fix E: Old marketplace_trades trigger dropped';
  RAISE NOTICE '  Fix F: Spurious removed entries cleaned up';
  RAISE NOTICE '=========================================================';
END $$;
