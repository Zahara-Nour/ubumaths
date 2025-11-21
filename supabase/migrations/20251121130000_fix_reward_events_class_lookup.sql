-- =====================================================================
-- Fix: Remove invalid status column reference in reward_events triggers
-- =====================================================================
-- The class_members table doesn't have a 'status' column.
-- This migration fixes the triggers to remove that check.
-- Date: 2025-11-21
-- =====================================================================

-- =====================================================================
-- 1. FIX TRIGGER: log_vip_cards_to_events
-- =====================================================================

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
        ELSE v_event_type := 'earned'; -- Default fallback
    END CASE;

    -- Get card display name from template
    v_card_name := NEW.card_template_id;

    -- Get student's class for context (no status column in class_members)
    SELECT class_id INTO v_class_id
    FROM public.class_members
    WHERE student_id = NEW.student_id
    ORDER BY joined_at DESC
    LIMIT 1;

    -- Generate description
    v_description := generate_reward_event_description(
        'vip_card'::public.reward_type,
        v_event_type,
        NULL,
        v_card_name,
        NEW.metadata
    );

    -- Insert into reward_events
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
        NEW.metadata->>'removed_by',
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

-- =====================================================================
-- 2. FIX TRIGGER: log_achievements_to_events
-- =====================================================================

CREATE OR REPLACE FUNCTION public.log_achievements_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_achievement_name TEXT;
    v_description TEXT;
    v_class_id UUID;
    v_points INTEGER;
    v_gidouilles INTEGER;
BEGIN
    -- Skip if already logged
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'student_achievements'
        AND source_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    -- Get achievement name
    SELECT name INTO v_achievement_name
    FROM public.achievements
    WHERE id = NEW.achievement_id;

    -- Get reward amounts (default to 0 if not set)
    v_points := COALESCE(NEW.points_awarded, 0);
    v_gidouilles := COALESCE(NEW.gidouilles_awarded, 0);

    -- Get student's class (no status column)
    SELECT class_id INTO v_class_id
    FROM public.class_members
    WHERE student_id = NEW.student_id
    ORDER BY joined_at DESC
    LIMIT 1;

    -- Generate description
    v_description := generate_reward_event_description(
        'achievement'::public.reward_type,
        'unlocked'::public.reward_event_type,
        NULL,
        v_achievement_name,
        jsonb_build_object(
            'points', v_points,
            'gidouilles', v_gidouilles
        )
    );

    -- Insert into reward_events
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
        'achievement',
        'unlocked',
        v_achievement_name,
        v_description,
        jsonb_build_object(
            'achievement_id', NEW.achievement_id,
            'context_data', NEW.context_data,
            'points_awarded', v_points,
            'gidouilles_awarded', v_gidouilles,
            'unlock_reason', NEW.unlock_reason
        ),
        'student_achievements',
        NEW.id,
        v_class_id,
        NEW.unlocked_by,
        NEW.unlocked_at
    );

    RETURN NEW;
END;
$$;

-- =====================================================================
-- 3. FIX TRIGGER: log_shop_purchases_to_events
-- =====================================================================

CREATE OR REPLACE FUNCTION public.log_shop_purchases_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item_name TEXT;
    v_description TEXT;
    v_class_id UUID;
BEGIN
    -- Skip if already logged
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'shop_purchase_history'
        AND source_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    -- Skip refunded purchases
    IF NEW.refunded_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Get item name
    SELECT display_name INTO v_item_name
    FROM public.shop_item_templates
    WHERE id = NEW.template_id;

    -- Get student's class (no status column)
    SELECT class_id INTO v_class_id
    FROM public.class_members
    WHERE student_id = NEW.student_id
    ORDER BY joined_at DESC
    LIMIT 1;

    -- Generate description
    v_description := generate_reward_event_description(
        'item'::public.reward_type,
        'purchased'::public.reward_event_type,
        NULL,
        v_item_name,
        jsonb_build_object(
            'quantity', NEW.quantity,
            'price', NEW.total_price
        )
    );

    -- Insert into reward_events
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
    ) VALUES (
        NEW.student_id,
        'item',
        'purchased',
        v_item_name,
        v_description,
        jsonb_build_object(
            'template_id', NEW.template_id,
            'inventory_id', NEW.inventory_id,
            'quantity', NEW.quantity,
            'unit_price', NEW.unit_price,
            'total_price', NEW.total_price,
            'discount_applied', NEW.discount_applied,
            'purchase_context', NEW.purchase_context
        ),
        'shop_purchase_history',
        NEW.id,
        v_class_id,
        NEW.purchased_at
    );

    RETURN NEW;
END;
$$;

-- =====================================================================
-- 4. FIX TRIGGER: log_item_usage_to_events
-- =====================================================================

CREATE OR REPLACE FUNCTION public.log_item_usage_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item_name TEXT;
    v_description TEXT;
    v_class_id UUID;
BEGIN
    -- Skip if already logged
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'item_usage_log'
        AND source_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    -- Skip reversed usage
    IF NEW.reversed_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Get item name
    SELECT display_name INTO v_item_name
    FROM public.shop_item_templates
    WHERE id = NEW.template_id;

    -- Get student's class (no status column)
    SELECT class_id INTO v_class_id
    FROM public.class_members
    WHERE student_id = NEW.student_id
    ORDER BY joined_at DESC
    LIMIT 1;

    -- Generate description
    v_description := generate_reward_event_description(
        'item'::public.reward_type,
        'used'::public.reward_event_type,
        NULL,
        v_item_name,
        NEW.usage_data
    );

    -- Insert into reward_events
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
    ) VALUES (
        NEW.student_id,
        'item',
        'used',
        v_item_name,
        v_description,
        jsonb_build_object(
            'template_id', NEW.template_id,
            'inventory_id', NEW.inventory_id,
            'usage_context', NEW.usage_context,
            'usage_data', NEW.usage_data,
            'effect_applied', NEW.effect_applied
        ),
        'item_usage_log',
        NEW.id,
        v_class_id,
        NEW.used_at
    );

    RETURN NEW;
END;
$$;

-- =====================================================================
-- 5. FIX TRIGGER: log_marketplace_trades_to_events
-- =====================================================================

CREATE OR REPLACE FUNCTION public.log_marketplace_trades_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_initiator_class UUID;
    v_partner_class UUID;
    v_initiator_gidouilles INTEGER;
    v_partner_gidouilles INTEGER;
BEGIN
    -- Only log completed trades
    IF NEW.status != 'completed' OR NEW.final_trade IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get classes for both participants (no status column)
    SELECT class_id INTO v_initiator_class
    FROM public.class_members
    WHERE student_id = NEW.initiator_id
    ORDER BY joined_at DESC
    LIMIT 1;

    SELECT class_id INTO v_partner_class
    FROM public.class_members
    WHERE student_id = NEW.partner_id
    ORDER BY joined_at DESC
    LIMIT 1;

    -- Extract gidouilles with null-safety
    v_initiator_gidouilles := COALESCE(NULLIF(NEW.final_trade->'from_initiator'->>'gidouilles', '')::INTEGER, 0);
    v_partner_gidouilles := COALESCE(NULLIF(NEW.final_trade->'from_partner'->>'gidouilles', '')::INTEGER, 0);

    -- Log event for initiator (if they gave gidouilles)
    IF v_initiator_gidouilles > 0 THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.reward_events
            WHERE source_table = 'marketplace_trades'
            AND source_id = NEW.id
            AND student_id = NEW.initiator_id
        ) THEN
            INSERT INTO public.reward_events (
                student_id, reward_type, event_type, amount, description,
                metadata, source_table, source_id, class_id, created_at
            ) VALUES (
                NEW.initiator_id,
                'gidouilles',
                'traded',
                -v_initiator_gidouilles,
                format('Échangé %s gidouilles (échange #%s)', v_initiator_gidouilles, LEFT(NEW.id::TEXT, 8)),
                jsonb_build_object(
                    'trade_id', NEW.id,
                    'partner_id', NEW.partner_id,
                    'trade_type', NEW.trade_type,
                    'direction', 'sent'
                ),
                'marketplace_trades',
                NEW.id,
                v_initiator_class,
                NEW.completed_at
            );
        END IF;
    END IF;

    -- Log event for partner (if they gave gidouilles)
    IF v_partner_gidouilles > 0 THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.reward_events
            WHERE source_table = 'marketplace_trades'
            AND source_id = NEW.id
            AND student_id = NEW.partner_id
        ) THEN
            INSERT INTO public.reward_events (
                student_id, reward_type, event_type, amount, description,
                metadata, source_table, source_id, class_id, created_at
            ) VALUES (
                NEW.partner_id,
                'gidouilles',
                'traded',
                -v_partner_gidouilles,
                format('Échangé %s gidouilles (échange #%s)', v_partner_gidouilles, LEFT(NEW.id::TEXT, 8)),
                jsonb_build_object(
                    'trade_id', NEW.id,
                    'partner_id', NEW.initiator_id,
                    'trade_type', NEW.trade_type,
                    'direction', 'sent'
                ),
                'marketplace_trades',
                NEW.id,
                v_partner_class,
                NEW.completed_at
            );
        END IF;
    END IF;

    -- Log gidouilles received by initiator (if partner gave gidouilles)
    IF v_partner_gidouilles > 0 THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.reward_events
            WHERE source_table = 'marketplace_trades'
            AND source_id = NEW.id
            AND student_id = NEW.initiator_id
            AND (metadata->>'direction') = 'received'
        ) THEN
            INSERT INTO public.reward_events (
                student_id, reward_type, event_type, amount, description,
                metadata, source_table, source_id, class_id, created_at
            ) VALUES (
                NEW.initiator_id,
                'gidouilles',
                'traded',
                v_partner_gidouilles,
                format('Reçu %s gidouilles (échange #%s)', v_partner_gidouilles, LEFT(NEW.id::TEXT, 8)),
                jsonb_build_object(
                    'trade_id', NEW.id,
                    'partner_id', NEW.partner_id,
                    'trade_type', NEW.trade_type,
                    'direction', 'received'
                ),
                'marketplace_trades',
                NEW.id,
                v_initiator_class,
                NEW.completed_at
            );
        END IF;
    END IF;

    -- Log gidouilles received by partner (if initiator gave gidouilles)
    IF v_initiator_gidouilles > 0 THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.reward_events
            WHERE source_table = 'marketplace_trades'
            AND source_id = NEW.id
            AND student_id = NEW.partner_id
            AND (metadata->>'direction') = 'received'
        ) THEN
            INSERT INTO public.reward_events (
                student_id, reward_type, event_type, amount, description,
                metadata, source_table, source_id, class_id, created_at
            ) VALUES (
                NEW.partner_id,
                'gidouilles',
                'traded',
                v_initiator_gidouilles,
                format('Reçu %s gidouilles (échange #%s)', v_initiator_gidouilles, LEFT(NEW.id::TEXT, 8)),
                jsonb_build_object(
                    'trade_id', NEW.id,
                    'partner_id', NEW.initiator_id,
                    'trade_type', NEW.trade_type,
                    'direction', 'received'
                ),
                'marketplace_trades',
                NEW.id,
                v_partner_class,
                NEW.completed_at
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- =====================================================================
-- 6. BACKFILL VIP CARDS ACTIVITY (was skipped due to error)
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
        ELSE 'earned'::public.reward_event_type
    END,
    vca.card_template_id,
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
    (
        SELECT cm.class_id
        FROM public.class_members cm
        WHERE cm.student_id = vca.student_id
        ORDER BY cm.joined_at DESC
        LIMIT 1
    ),
    vca.metadata->>'removed_by',
    vca.created_at
FROM public.vip_cards_activity vca
WHERE NOT EXISTS (
    SELECT 1 FROM public.reward_events re
    WHERE re.source_table = 'vip_cards_activity'
    AND re.source_id = vca.id
);

-- =====================================================================
-- 7. BACKFILL STUDENT ACHIEVEMENTS (was skipped due to error)
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
    a.name,
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

-- =====================================================================
-- 8. BACKFILL SHOP PURCHASES (was skipped due to error)
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
    sit.display_name,
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
WHERE sph.refunded_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM public.reward_events re
    WHERE re.source_table = 'shop_purchase_history'
    AND re.source_id = sph.id
);

-- =====================================================================
-- 9. BACKFILL ITEM USAGE (was skipped due to error)
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
    sit.display_name,
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
WHERE iul.reversed_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM public.reward_events re
    WHERE re.source_table = 'item_usage_log'
    AND re.source_id = iul.id
);

-- =====================================================================
-- 10. BACKFILL MARKETPLACE TRADES (was skipped due to error)
-- =====================================================================

-- Create a temporary function to handle the complex logic
CREATE OR REPLACE FUNCTION backfill_marketplace_trades_fixed()
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
        -- Get classes for both participants
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

        -- Log initiator SENT gidouilles
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

        -- Log partner SENT gidouilles
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

        -- Log initiator RECEIVED gidouilles
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

        -- Log partner RECEIVED gidouilles
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
    END LOOP;

    RAISE NOTICE 'Backfilled % marketplace trade events', v_count;
END;
$$;

-- Execute the backfill
SELECT backfill_marketplace_trades_fixed();

-- Clean up
DROP FUNCTION IF EXISTS backfill_marketplace_trades_fixed();

-- =====================================================================
-- 11. VERIFICATION
-- =====================================================================

DO $$
DECLARE
    v_total INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM public.reward_events;
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'FIX MIGRATION COMPLETE';
    RAISE NOTICE 'Total events in reward_events: %', v_total;
    RAISE NOTICE '=================================================';
END $$;
