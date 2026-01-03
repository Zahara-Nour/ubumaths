-- =====================================================================
-- RENAME gidouilles_history TO gidouilles_activity
-- =====================================================================
-- For consistency with vip_cards_activity naming convention.
-- =====================================================================

-- Step 1: Rename the table
ALTER TABLE public.gidouilles_history RENAME TO gidouilles_activity;

-- Step 2: Rename indexes
ALTER INDEX idx_gidouilles_history_student_time RENAME TO idx_gidouilles_activity_student_time;
ALTER INDEX idx_gidouilles_history_class_time RENAME TO idx_gidouilles_activity_class_time;
ALTER INDEX idx_gidouilles_history_created_at RENAME TO idx_gidouilles_activity_created_at;

-- Step 3: Drop old RLS policies and create new ones with updated names
DROP POLICY IF EXISTS "Admins can view all gidouilles history" ON public.gidouilles_activity;
DROP POLICY IF EXISTS "Students can view their own gidouilles history" ON public.gidouilles_activity;
DROP POLICY IF EXISTS "Teachers can view gidouilles history for their students" ON public.gidouilles_activity;

CREATE POLICY "Admins can view all gidouilles activity"
ON public.gidouilles_activity
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Students can view their own gidouilles activity"
ON public.gidouilles_activity
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Teachers can view gidouilles activity for their students"
ON public.gidouilles_activity
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
    AND EXISTS (
        SELECT 1 FROM public.class_members cm
        WHERE cm.student_id = gidouilles_activity.student_id
        AND cm.class_id IN (
            SELECT c.id FROM public.classes c
            WHERE c.teacher_id = auth.uid()
        )
    )
);

-- Step 4: Update table comment
COMMENT ON TABLE public.gidouilles_activity IS 'Tracks all gidouilles (points) changes with timestamps for student activity summaries';

-- =====================================================================
-- Step 5: Update functions that reference gidouilles_history
-- =====================================================================

-- 5a: Update update_student_gidouilles function
CREATE OR REPLACE FUNCTION public.update_student_gidouilles(
    p_student_id UUID,
    p_class_id UUID,
    p_delta INTEGER,
    p_reason TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_gidouilles INTEGER;
    v_caller_role TEXT;
BEGIN
    -- SECURITY CHECK: Get caller's role to enforce authorization
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Authorization: Only admins, teachers of the student, or system (NULL caller) can update
    IF auth.uid() IS NOT NULL AND NOT (
        v_caller_role = 'admin'
        OR (v_caller_role = 'teacher' AND EXISTS (
            SELECT 1 FROM public.class_members cm
            JOIN public.classes c ON c.id = cm.class_id
            WHERE cm.student_id = p_student_id
            AND cm.class_id = p_class_id
            AND cm.status = 'active'
            AND c.teacher_id = auth.uid()
        ))
    ) THEN
        RAISE EXCEPTION 'Non autorisé: seuls les professeurs de cet élève peuvent modifier ses gidouilles';
    END IF;

    -- Update gidouilles with floor at 0
    UPDATE public.profiles
    SET gidouilles = GREATEST(0, COALESCE(gidouilles, 0) + p_delta)
    WHERE id = p_student_id
    RETURNING gidouilles INTO v_new_gidouilles;

    -- Log the change in activity table (renamed from history)
    INSERT INTO public.gidouilles_activity (
        student_id,
        class_id,
        delta,
        reason,
        created_by
    ) VALUES (
        p_student_id,
        p_class_id,
        p_delta,
        p_reason,
        COALESCE(p_created_by, auth.uid())
    );

    RETURN v_new_gidouilles;
END;
$$;

-- 5b: Update execute_trade function
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

    -- Get names for activity logging
    SELECT COALESCE(username, firstname, 'Élève') INTO v_initiator_name
    FROM public.profiles WHERE id = v_trade.initiator_id;

    SELECT COALESCE(username, firstname, 'Élève') INTO v_partner_name
    FROM public.profiles WHERE id = v_trade.partner_id;

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

        -- Log sender activity
        INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
        VALUES (v_card_id, v_trade.initiator_id, v_card_template_id, 'traded',
            jsonb_build_object('trade_id', p_trade_id, 'traded_to', v_trade.partner_id, 'direction', 'sent'));

        -- Log receiver activity
        INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
        VALUES (v_card_id, v_trade.partner_id, v_card_template_id, 'gained',
            jsonb_build_object('acquired_from', 'trade', 'trade_id', p_trade_id, 'received_from', v_trade.initiator_id));
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

        -- Log sender activity
        INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
        VALUES (v_card_id, v_trade.partner_id, v_card_template_id, 'traded',
            jsonb_build_object('trade_id', p_trade_id, 'traded_to', v_trade.initiator_id, 'direction', 'sent'));

        -- Log receiver activity
        INSERT INTO public.vip_cards_activity (card_instance_id, student_id, card_template_id, action, metadata)
        VALUES (v_card_id, v_trade.initiator_id, v_card_template_id, 'gained',
            jsonb_build_object('acquired_from', 'trade', 'trade_id', p_trade_id, 'received_from', v_trade.partner_id));
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

    -- Log gidouilles activity for initiator (if any gidouilles were exchanged)
    IF v_initiator_gidouilles > 0 THEN
        -- Initiator sent gidouilles
        INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
        VALUES (v_trade.initiator_id, NULL, -v_initiator_gidouilles,
                format('Échange avec %s', v_partner_name), NULL);
        -- Partner received gidouilles
        INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
        VALUES (v_trade.partner_id, NULL, v_initiator_gidouilles,
                format('Échange avec %s', v_initiator_name), NULL);
    END IF;

    IF v_partner_gidouilles > 0 THEN
        -- Partner sent gidouilles
        INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
        VALUES (v_trade.partner_id, NULL, -v_partner_gidouilles,
                format('Échange avec %s', v_initiator_name), NULL);
        -- Initiator received gidouilles
        INSERT INTO public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
        VALUES (v_trade.initiator_id, NULL, v_partner_gidouilles,
                format('Échange avec %s', v_partner_name), NULL);
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

-- 5c: Update log_gidouilles_history_to_events trigger function
CREATE OR REPLACE FUNCTION public.log_gidouilles_activity_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_type public.reward_event_type;
    v_description TEXT;
BEGIN
    -- Skip if already logged
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'gidouilles_activity'
        AND source_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    -- Determine event type
    IF NEW.delta > 0 THEN
        v_event_type := 'earned';
    ELSE
        v_event_type := 'spent';
    END IF;

    -- Generate description
    v_description := public.generate_reward_event_description(
        'gidouilles_activity',
        NEW.reason,
        NEW.delta
    );

    -- Insert into reward_events
    INSERT INTO public.reward_events (
        student_id,
        event_type,
        reward_type,
        amount,
        description,
        source_table,
        source_id,
        created_at
    ) VALUES (
        NEW.student_id,
        v_event_type,
        'gidouilles',
        ABS(NEW.delta),
        v_description,
        'gidouilles_activity',
        NEW.id,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS trigger_log_gidouilles_to_events ON public.gidouilles_activity;
CREATE TRIGGER trigger_log_gidouilles_to_events
    AFTER INSERT ON public.gidouilles_activity
    FOR EACH ROW
    EXECUTE FUNCTION public.log_gidouilles_activity_to_events();

-- Drop the old function
DROP FUNCTION IF EXISTS public.log_gidouilles_history_to_events();

-- 5d: Update generate_reward_event_description to handle new table name
CREATE OR REPLACE FUNCTION public.generate_reward_event_description(
    p_source_table TEXT,
    p_reason TEXT,
    p_delta INTEGER DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Handle gidouilles_activity (renamed from gidouilles_history)
    IF p_source_table IN ('gidouilles_history', 'gidouilles_activity') THEN
        IF p_reason IS NULL OR p_reason = '' THEN
            IF p_delta IS NOT NULL AND p_delta > 0 THEN
                RETURN 'Gidouilles gagnées';
            ELSIF p_delta IS NOT NULL AND p_delta < 0 THEN
                RETURN 'Gidouilles dépensées';
            ELSE
                RETURN 'Modification de gidouilles';
            END IF;
        END IF;

        -- Translate common reasons
        CASE p_reason
            WHEN 'weekly_no_warning' THEN RETURN 'Récompense hebdomadaire (0 avertissement)';
            WHEN 'minesweeper_victory' THEN RETURN 'Victoire au démineur';
            WHEN 'minesweeper_hint' THEN RETURN 'Indice démineur';
            WHEN 'shop_purchase' THEN RETURN 'Achat en boutique';
            WHEN 'Modifié par professeur' THEN RETURN 'Modifié par professeur';
            ELSE RETURN p_reason;
        END CASE;
    END IF;

    -- Handle other source tables...
    RETURN COALESCE(p_reason, 'Activité');
END;
$$;

COMMENT ON FUNCTION public.execute_trade(UUID) IS
'Atomically execute a trade. Updates vip_cards and gidouilles directly. Logs to vip_cards_activity and gidouilles_activity.';

COMMENT ON FUNCTION public.update_student_gidouilles(UUID, UUID, INTEGER, TEXT, UUID) IS
'Update student gidouilles with authorization checks. Logs to gidouilles_activity table.';
