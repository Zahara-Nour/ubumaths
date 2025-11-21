-- =====================================================================
-- Backfill Historical Data into reward_events Table
-- =====================================================================
-- Purpose: Populate the reward_events table with existing historical
-- data from all source tables. This migration is idempotent and can
-- be run multiple times safely.
-- Date: 2025-11-21
-- =====================================================================

-- Start transaction to ensure atomicity
BEGIN;

-- =====================================================================
-- 1. BACKFILL FROM gidouilles_history
-- =====================================================================

INSERT INTO public.reward_events (
    student_id,
    reward_type,
    event_type,
    amount,
    description,
    metadata,
    source_table,
    source_id,
    class_id,
    created_by,
    created_at
)
SELECT
    gh.student_id,
    'gidouilles'::public.reward_type,
    CASE WHEN gh.delta > 0 THEN 'earned'::public.reward_event_type ELSE 'spent'::public.reward_event_type END,
    gh.delta,
    public.generate_reward_event_description(
        'gidouilles'::public.reward_type,
        CASE WHEN gh.delta > 0 THEN 'earned'::public.reward_event_type ELSE 'spent'::public.reward_event_type END,
        gh.delta,
        NULL,
        jsonb_build_object('reason', gh.reason)
    ),
    jsonb_build_object(
        'reason', gh.reason,
        'original_delta', gh.delta
    ),
    'gidouilles_history',
    gh.id,
    gh.class_id,
    gh.created_by,
    gh.created_at
FROM public.gidouilles_history gh
WHERE NOT EXISTS (
    SELECT 1 FROM public.reward_events re
    WHERE re.source_table = 'gidouilles_history'
    AND re.source_id = gh.id
);

-- Log the count
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.reward_events
    WHERE source_table = 'gidouilles_history'
    AND created_at >= NOW() - INTERVAL '1 minute';

    RAISE NOTICE 'Backfilled % records from gidouilles_history', v_count;
END $$;

-- =====================================================================
-- 2. BACKFILL FROM bonus_history
-- =====================================================================

INSERT INTO public.reward_events (
    student_id,
    reward_type,
    event_type,
    amount,
    description,
    metadata,
    source_table,
    source_id,
    class_id,
    created_by,
    created_at
)
SELECT
    bh.student_id,
    'bonus'::public.reward_type,
    CASE WHEN bh.delta > 0 THEN 'earned'::public.reward_event_type ELSE 'used'::public.reward_event_type END,
    bh.delta,
    public.generate_reward_event_description(
        'bonus'::public.reward_type,
        CASE WHEN bh.delta > 0 THEN 'earned'::public.reward_event_type ELSE 'used'::public.reward_event_type END,
        bh.delta,
        NULL,
        jsonb_build_object('reason', bh.reason)
    ),
    jsonb_build_object(
        'reason', bh.reason,
        'original_delta', bh.delta
    ),
    'bonus_history',
    bh.id,
    bh.class_id,
    bh.created_by,
    bh.created_at
FROM public.bonus_history bh
WHERE NOT EXISTS (
    SELECT 1 FROM public.reward_events re
    WHERE re.source_table = 'bonus_history'
    AND re.source_id = bh.id
);

-- Log the count
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.reward_events
    WHERE source_table = 'bonus_history'
    AND created_at >= NOW() - INTERVAL '1 minute';

    RAISE NOTICE 'Backfilled % records from bonus_history', v_count;
END $$;

-- =====================================================================
-- 3. BACKFILL FROM vip_cards_activity
-- =====================================================================

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
)
SELECT
    vca.student_id,
    'vip_card'::public.reward_type,
    CASE vca.action
        WHEN 'gained' THEN 'earned'::public.reward_event_type
        WHEN 'used' THEN 'used'::public.reward_event_type
        WHEN 'removed' THEN 'removed'::public.reward_event_type
        ELSE 'earned'::public.reward_event_type -- Default fallback
    END,
    vca.card_template_id, -- Using template ID as name (could be improved with JOIN to templates table)
    public.generate_reward_event_description(
        'vip_card'::public.reward_type,
        CASE vca.action
            WHEN 'gained' THEN 'earned'::public.reward_event_type
            WHEN 'used' THEN 'used'::public.reward_event_type
            WHEN 'removed' THEN 'removed'::public.reward_event_type
            ELSE 'earned'::public.reward_event_type
        END,
        NULL,
        vca.card_template_id,
        vca.metadata
    ),
    COALESCE(vca.metadata, '{}'::jsonb) || jsonb_build_object(
        'card_instance_id', vca.card_instance_id,
        'card_template_id', vca.card_template_id,
        'action', vca.action
    ),
    'vip_cards_activity',
    vca.id,
    -- Get student's active class at the time of the event
    (
        SELECT cm.class_id
        FROM public.class_members cm
        WHERE cm.student_id = vca.student_id
        ORDER BY cm.joined_at DESC
        LIMIT 1
    ),
    NULLIF(vca.metadata->>'removed_by', '')::UUID, -- Extract created_by from metadata if available
    vca.created_at
FROM public.vip_cards_activity vca
WHERE NOT EXISTS (
    SELECT 1 FROM public.reward_events re
    WHERE re.source_table = 'vip_cards_activity'
    AND re.source_id = vca.id
);

-- Log the count
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.reward_events
    WHERE source_table = 'vip_cards_activity'
    AND created_at >= NOW() - INTERVAL '1 minute';

    RAISE NOTICE 'Backfilled % records from vip_cards_activity', v_count;
END $$;

-- =====================================================================
-- 4. BACKFILL FROM student_achievements
-- =====================================================================

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
)
SELECT
    sa.student_id,
    'achievement'::public.reward_type,
    'unlocked'::public.reward_event_type,
    a.name, -- Join with achievements table to get the name
    public.generate_reward_event_description(
        'achievement'::public.reward_type,
        'unlocked'::public.reward_event_type,
        NULL,
        a.name,
        jsonb_build_object(
            'points', COALESCE(sa.points_awarded, 0),
            'gidouilles', COALESCE(sa.gidouilles_awarded, 0)
        )
    ),
    jsonb_build_object(
        'achievement_id', sa.achievement_id,
        'context_data', sa.context_data,
        'points_awarded', COALESCE(sa.points_awarded, 0),
        'gidouilles_awarded', COALESCE(sa.gidouilles_awarded, 0),
        'unlock_reason', sa.unlock_reason
    ),
    'student_achievements',
    sa.id,
    -- Get student's active class at the time of the achievement
    (
        SELECT cm.class_id
        FROM public.class_members cm
        WHERE cm.student_id = sa.student_id
        ORDER BY cm.joined_at DESC
        LIMIT 1
    ),
    sa.unlocked_by,
    sa.unlocked_at
FROM public.student_achievements sa
JOIN public.achievements a ON a.id = sa.achievement_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.reward_events re
    WHERE re.source_table = 'student_achievements'
    AND re.source_id = sa.id
);

-- Log the count
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.reward_events
    WHERE source_table = 'student_achievements'
    AND created_at >= NOW() - INTERVAL '1 minute';

    RAISE NOTICE 'Backfilled % records from student_achievements', v_count;
END $$;

-- =====================================================================
-- 5. BACKFILL FROM shop_purchase_history
-- =====================================================================

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
    created_at
)
SELECT
    sph.student_id,
    'item'::public.reward_type,
    'purchased'::public.reward_event_type,
    sit.display_name, -- Join with shop_item_templates to get the name
    public.generate_reward_event_description(
        'item'::public.reward_type,
        'purchased'::public.reward_event_type,
        NULL,
        sit.display_name,
        jsonb_build_object(
            'quantity', sph.quantity,
            'price', sph.total_price
        )
    ),
    jsonb_build_object(
        'template_id', sph.template_id,
        'inventory_id', sph.inventory_id,
        'quantity', sph.quantity,
        'unit_price', sph.unit_price,
        'total_price', sph.total_price,
        'discount_applied', sph.discount_applied,
        'purchase_context', sph.purchase_context
    ),
    'shop_purchase_history',
    sph.id,
    -- Get student's active class at the time of purchase
    (
        SELECT cm.class_id
        FROM public.class_members cm
        WHERE cm.student_id = sph.student_id
        ORDER BY cm.joined_at DESC
        LIMIT 1
    ),
    sph.purchased_at
FROM public.shop_purchase_history sph
JOIN public.shop_item_templates sit ON sit.id = sph.template_id
WHERE sph.refunded_at IS NULL -- Skip refunded purchases
AND NOT EXISTS (
    SELECT 1 FROM public.reward_events re
    WHERE re.source_table = 'shop_purchase_history'
    AND re.source_id = sph.id
);

-- Log the count
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.reward_events
    WHERE source_table = 'shop_purchase_history'
    AND created_at >= NOW() - INTERVAL '1 minute';

    RAISE NOTICE 'Backfilled % records from shop_purchase_history', v_count;
END $$;

-- =====================================================================
-- 6. BACKFILL FROM item_usage_log
-- =====================================================================

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
    created_at
)
SELECT
    iul.student_id,
    'item'::public.reward_type,
    'used'::public.reward_event_type,
    sit.display_name, -- Join with shop_item_templates to get the name
    public.generate_reward_event_description(
        'item'::public.reward_type,
        'used'::public.reward_event_type,
        NULL,
        sit.display_name,
        iul.usage_data
    ),
    jsonb_build_object(
        'template_id', iul.template_id,
        'inventory_id', iul.inventory_id,
        'usage_context', iul.usage_context,
        'usage_data', iul.usage_data,
        'effect_applied', iul.effect_applied
    ),
    'item_usage_log',
    iul.id,
    -- Get student's active class at the time of usage
    (
        SELECT cm.class_id
        FROM public.class_members cm
        WHERE cm.student_id = iul.student_id
        ORDER BY cm.joined_at DESC
        LIMIT 1
    ),
    iul.used_at
FROM public.item_usage_log iul
JOIN public.shop_item_templates sit ON sit.id = iul.template_id
WHERE iul.reversed_at IS NULL -- Skip reversed usage
AND NOT EXISTS (
    SELECT 1 FROM public.reward_events re
    WHERE re.source_table = 'item_usage_log'
    AND re.source_id = iul.id
);

-- Log the count
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.reward_events
    WHERE source_table = 'item_usage_log'
    AND created_at >= NOW() - INTERVAL '1 minute';

    RAISE NOTICE 'Backfilled % records from item_usage_log', v_count;
END $$;

-- =====================================================================
-- 7. BACKFILL FROM marketplace_trades (completed trades only)
-- =====================================================================

-- This requires careful handling as we need to create multiple events per trade:
-- - SENT events for gidouilles given
-- - RECEIVED events for gidouilles received
-- For both the initiator and partner

-- Create a temporary function to handle the complex logic
CREATE OR REPLACE FUNCTION backfill_marketplace_trades()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_trade RECORD;
    v_initiator_class UUID;
    v_partner_class UUID;
    v_initiator_gidouilles INTEGER;
    v_partner_gidouilles INTEGER;
    v_count INTEGER := 0;
BEGIN
    FOR v_trade IN
        SELECT * FROM public.marketplace_trades
        WHERE status = 'completed'
        AND final_trade IS NOT NULL
    LOOP
        -- Get classes for both participants (most recent class)
        SELECT class_id INTO v_initiator_class
        FROM public.class_members
        WHERE student_id = v_trade.initiator_id
        ORDER BY joined_at DESC
        LIMIT 1;

        SELECT class_id INTO v_partner_class
        FROM public.class_members
        WHERE student_id = v_trade.partner_id
        ORDER BY joined_at DESC
        LIMIT 1;

        -- Extract gidouilles with null-safety
        v_initiator_gidouilles := COALESCE(
            NULLIF(v_trade.final_trade->'from_initiator'->>'gidouilles', '')::INTEGER,
            0
        );
        v_partner_gidouilles := COALESCE(
            NULLIF(v_trade.final_trade->'from_partner'->>'gidouilles', '')::INTEGER,
            0
        );

        -- Log initiator SENT gidouilles (if they gave any)
        IF v_initiator_gidouilles > 0 THEN
            INSERT INTO public.reward_events (
                student_id, reward_type, event_type, amount, description,
                metadata, source_table, source_id, class_id, created_at
            )
            SELECT
                v_trade.initiator_id,
                'gidouilles'::public.reward_type,
                'traded'::public.reward_event_type,
                -v_initiator_gidouilles,
                format('Échangé %s gidouilles (échange #%s)',
                    v_initiator_gidouilles, LEFT(v_trade.id::TEXT, 8)),
                jsonb_build_object(
                    'trade_id', v_trade.id,
                    'partner_id', v_trade.partner_id,
                    'trade_type', v_trade.trade_type,
                    'direction', 'sent'
                ),
                'marketplace_trades',
                v_trade.id,
                v_initiator_class,
                v_trade.completed_at
            WHERE NOT EXISTS (
                SELECT 1 FROM public.reward_events
                WHERE source_table = 'marketplace_trades'
                AND source_id = v_trade.id
                AND student_id = v_trade.initiator_id
                AND (metadata->>'direction') = 'sent'
            );

            IF FOUND THEN v_count := v_count + 1; END IF;
        END IF;

        -- Log partner SENT gidouilles (if they gave any)
        IF v_partner_gidouilles > 0 THEN
            INSERT INTO public.reward_events (
                student_id, reward_type, event_type, amount, description,
                metadata, source_table, source_id, class_id, created_at
            )
            SELECT
                v_trade.partner_id,
                'gidouilles'::public.reward_type,
                'traded'::public.reward_event_type,
                -v_partner_gidouilles,
                format('Échangé %s gidouilles (échange #%s)',
                    v_partner_gidouilles, LEFT(v_trade.id::TEXT, 8)),
                jsonb_build_object(
                    'trade_id', v_trade.id,
                    'partner_id', v_trade.initiator_id,
                    'trade_type', v_trade.trade_type,
                    'direction', 'sent'
                ),
                'marketplace_trades',
                v_trade.id,
                v_partner_class,
                v_trade.completed_at
            WHERE NOT EXISTS (
                SELECT 1 FROM public.reward_events
                WHERE source_table = 'marketplace_trades'
                AND source_id = v_trade.id
                AND student_id = v_trade.partner_id
                AND (metadata->>'direction') = 'sent'
            );

            IF FOUND THEN v_count := v_count + 1; END IF;
        END IF;

        -- Log initiator RECEIVED gidouilles (from partner)
        IF v_partner_gidouilles > 0 THEN
            INSERT INTO public.reward_events (
                student_id, reward_type, event_type, amount, description,
                metadata, source_table, source_id, class_id, created_at
            )
            SELECT
                v_trade.initiator_id,
                'gidouilles'::public.reward_type,
                'traded'::public.reward_event_type,
                v_partner_gidouilles,
                format('Reçu %s gidouilles (échange #%s)',
                    v_partner_gidouilles, LEFT(v_trade.id::TEXT, 8)),
                jsonb_build_object(
                    'trade_id', v_trade.id,
                    'partner_id', v_trade.partner_id,
                    'trade_type', v_trade.trade_type,
                    'direction', 'received'
                ),
                'marketplace_trades',
                v_trade.id,
                v_initiator_class,
                v_trade.completed_at
            WHERE NOT EXISTS (
                SELECT 1 FROM public.reward_events
                WHERE source_table = 'marketplace_trades'
                AND source_id = v_trade.id
                AND student_id = v_trade.initiator_id
                AND (metadata->>'direction') = 'received'
            );

            IF FOUND THEN v_count := v_count + 1; END IF;
        END IF;

        -- Log partner RECEIVED gidouilles (from initiator)
        IF v_initiator_gidouilles > 0 THEN
            INSERT INTO public.reward_events (
                student_id, reward_type, event_type, amount, description,
                metadata, source_table, source_id, class_id, created_at
            )
            SELECT
                v_trade.partner_id,
                'gidouilles'::public.reward_type,
                'traded'::public.reward_event_type,
                v_initiator_gidouilles,
                format('Reçu %s gidouilles (échange #%s)',
                    v_initiator_gidouilles, LEFT(v_trade.id::TEXT, 8)),
                jsonb_build_object(
                    'trade_id', v_trade.id,
                    'partner_id', v_trade.initiator_id,
                    'trade_type', v_trade.trade_type,
                    'direction', 'received'
                ),
                'marketplace_trades',
                v_trade.id,
                v_partner_class,
                v_trade.completed_at
            WHERE NOT EXISTS (
                SELECT 1 FROM public.reward_events
                WHERE source_table = 'marketplace_trades'
                AND source_id = v_trade.id
                AND student_id = v_trade.partner_id
                AND (metadata->>'direction') = 'received'
            );

            IF FOUND THEN v_count := v_count + 1; END IF;
        END IF;

        -- TODO: Could also handle VIP cards and items traded here if needed
        -- by parsing the card_ids arrays in final_trade JSON
    END LOOP;

    RAISE NOTICE 'Backfilled % records from marketplace_trades', v_count;
END;
$$;

-- Execute the backfill for marketplace trades
SELECT backfill_marketplace_trades();

-- Clean up the temporary function
DROP FUNCTION IF EXISTS backfill_marketplace_trades();

-- =====================================================================
-- 8. VERIFICATION QUERIES
-- =====================================================================

DO $$
DECLARE
    v_total INTEGER;
    v_gidouilles INTEGER;
    v_bonus INTEGER;
    v_vip_cards INTEGER;
    v_achievements INTEGER;
    v_purchases INTEGER;
    v_usage INTEGER;
    v_trades INTEGER;
BEGIN
    -- Count total events
    SELECT COUNT(*) INTO v_total FROM public.reward_events;

    -- Count by source table
    SELECT COUNT(*) INTO v_gidouilles
    FROM public.reward_events WHERE source_table = 'gidouilles_history';

    SELECT COUNT(*) INTO v_bonus
    FROM public.reward_events WHERE source_table = 'bonus_history';

    SELECT COUNT(*) INTO v_vip_cards
    FROM public.reward_events WHERE source_table = 'vip_cards_activity';

    SELECT COUNT(*) INTO v_achievements
    FROM public.reward_events WHERE source_table = 'student_achievements';

    SELECT COUNT(*) INTO v_purchases
    FROM public.reward_events WHERE source_table = 'shop_purchase_history';

    SELECT COUNT(*) INTO v_usage
    FROM public.reward_events WHERE source_table = 'item_usage_log';

    SELECT COUNT(*) INTO v_trades
    FROM public.reward_events WHERE source_table = 'marketplace_trades';

    RAISE NOTICE '=================================================';
    RAISE NOTICE 'BACKFILL COMPLETE - VERIFICATION SUMMARY';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Total events in reward_events: %', v_total;
    RAISE NOTICE '';
    RAISE NOTICE 'Events by source:';
    RAISE NOTICE '  - gidouilles_history:     %', v_gidouilles;
    RAISE NOTICE '  - bonus_history:          %', v_bonus;
    RAISE NOTICE '  - vip_cards_activity:     %', v_vip_cards;
    RAISE NOTICE '  - student_achievements:   %', v_achievements;
    RAISE NOTICE '  - shop_purchase_history:  %', v_purchases;
    RAISE NOTICE '  - item_usage_log:         %', v_usage;
    RAISE NOTICE '  - marketplace_trades:     %', v_trades;
    RAISE NOTICE '=================================================';
END $$;

-- Check for any orphaned records (events without valid student references)
DO $$
DECLARE
    v_orphaned INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_orphaned
    FROM public.reward_events re
    WHERE NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = re.student_id
    );

    IF v_orphaned > 0 THEN
        RAISE WARNING 'Found % orphaned events (student no longer exists)', v_orphaned;
    ELSE
        RAISE NOTICE 'No orphaned events found - all events have valid student references';
    END IF;
END $$;

-- Commit the transaction
COMMIT;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- This migration has successfully backfilled all historical reward
-- events from the source tables. The triggers created in the previous
-- migration will handle all future events automatically.
--
-- The migration is idempotent - it can be run multiple times safely
-- as it checks for existing records before inserting.
-- =====================================================================