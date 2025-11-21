-- =====================================================================
-- Create Unified Reward Events Audit Trail System
-- =====================================================================
-- Purpose: Aggregate all reward movements from existing audit trail
-- tables into a single queryable table for comprehensive student
-- activity tracking and journal display
-- Date: 2025-11-21
-- =====================================================================

-- =====================================================================
-- 1. CREATE ENUM TYPES
-- =====================================================================

-- Create reward type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_type') THEN
        CREATE TYPE public.reward_type AS ENUM (
            'gidouilles',
            'bonus',
            'vip_card',
            'achievement',
            'item'
        );
    END IF;
END
$$;

-- Create event type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_event_type') THEN
        CREATE TYPE public.reward_event_type AS ENUM (
            'earned',      -- Gained through activity
            'spent',       -- Used for purchase
            'traded',      -- Exchanged with another player
            'used',        -- Consumed/activated
            'expired',     -- Time-limited item expired
            'unlocked',    -- Achievement unlocked
            'purchased',   -- Bought from shop
            'awarded',     -- Given by teacher/system
            'removed'      -- Removed by teacher/system
        );
    END IF;
END
$$;

-- =====================================================================
-- 2. CREATE REWARD_EVENTS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.reward_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core references
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Event classification
    reward_type public.reward_type NOT NULL,
    event_type public.reward_event_type NOT NULL,

    -- Amount (for currency-based rewards)
    amount INTEGER, -- Can be positive or negative for gidouilles/bonus, NULL for others

    -- Display information
    item_name TEXT, -- Name of VIP card/item/achievement for display
    description TEXT NOT NULL, -- Human-readable description in French

    -- Metadata for additional context
    metadata JSONB DEFAULT '{}',
    /*
    Examples:
    - For VIP cards: { "card_id": "homework-pass", "card_instance_id": "uuid", "action": "gained" }
    - For achievements: { "achievement_id": "minesweeper_first_victory", "points": 10, "gidouilles": 5 }
    - For items: { "template_id": "uuid", "inventory_id": "uuid", "quantity": 1 }
    - For trades: { "trade_id": "uuid", "partner_id": "uuid", "trade_type": "marketplace" }
    */

    -- Traceability
    source_table TEXT NOT NULL, -- Origin table for debugging/audit
    source_id UUID, -- ID in source table (when applicable)

    -- Context
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL, -- For teacher filtering

    -- Who triggered the event
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL for system events

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_amount CHECK (
        (reward_type IN ('gidouilles', 'bonus') AND amount IS NOT NULL) OR
        (reward_type NOT IN ('gidouilles', 'bonus'))
    )
);

-- Add helpful comments
COMMENT ON TABLE public.reward_events IS 'Unified audit trail for all reward-related events across the platform';
COMMENT ON COLUMN public.reward_events.reward_type IS 'Type of reward: gidouilles, bonus, vip_card, achievement, item';
COMMENT ON COLUMN public.reward_events.event_type IS 'Type of event: earned, spent, traded, used, expired, unlocked, purchased, awarded, removed';
COMMENT ON COLUMN public.reward_events.amount IS 'Amount for currency rewards (positive or negative), NULL for non-currency rewards';
COMMENT ON COLUMN public.reward_events.item_name IS 'Display name for the item/card/achievement';
COMMENT ON COLUMN public.reward_events.description IS 'Human-readable description in French for journal display';
COMMENT ON COLUMN public.reward_events.metadata IS 'Additional context data specific to the event type';
COMMENT ON COLUMN public.reward_events.source_table IS 'Original table where this event was recorded';
COMMENT ON COLUMN public.reward_events.source_id IS 'ID in the source table for traceability';

-- =====================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================================

-- Main journal query index
CREATE INDEX idx_reward_events_student_time
ON public.reward_events(student_id, created_at DESC);

-- Filtered by reward type index
CREATE INDEX idx_reward_events_student_type_time
ON public.reward_events(student_id, reward_type, created_at DESC);

-- Teacher view index
CREATE INDEX idx_reward_events_class_time
ON public.reward_events(class_id, created_at DESC)
WHERE class_id IS NOT NULL;

-- Deduplication check index
-- Note: This is NOT a unique constraint because some events (like marketplace trades)
-- may generate multiple events per source (sent/received for both parties).
-- Deduplication is handled by EXISTS checks in triggers.
CREATE INDEX idx_reward_events_source_lookup
ON public.reward_events(source_table, source_id, student_id)
WHERE source_id IS NOT NULL;

-- Event type filtering
CREATE INDEX idx_reward_events_event_type
ON public.reward_events(event_type, created_at DESC);

-- =====================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE public.reward_events ENABLE ROW LEVEL SECURITY;

-- Students can view their own events
CREATE POLICY "Students can view their own reward events"
ON public.reward_events
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Teachers can view events for students in their classes
-- Uses is_class_teacher() helper for consistency and to avoid RLS recursion
CREATE POLICY "Teachers can view reward events for their students"
ON public.reward_events
FOR SELECT
TO authenticated
USING (
    class_id IS NOT NULL AND is_class_teacher(class_id)
);

-- Admins can view all events
-- Uses is_admin() helper for consistency and to avoid RLS recursion
CREATE POLICY "Admins can view all reward events"
ON public.reward_events
FOR SELECT
TO authenticated
USING (is_admin());

-- Only service role can insert (via triggers)
CREATE POLICY "Service role can insert reward events"
ON public.reward_events
FOR INSERT
TO service_role
WITH CHECK (true);

-- =====================================================================
-- 5. CREATE HELPER FUNCTION FOR FRENCH DESCRIPTIONS
-- =====================================================================

CREATE OR REPLACE FUNCTION public.generate_reward_event_description(
    p_reward_type public.reward_type,
    p_event_type public.reward_event_type,
    p_amount INTEGER,
    p_item_name TEXT,
    p_metadata JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Gidouilles events
    IF p_reward_type = 'gidouilles' THEN
        CASE p_event_type
            WHEN 'earned' THEN
                RETURN format('Gagné %s gidouilles%s',
                    ABS(p_amount),
                    CASE WHEN p_metadata->>'reason' IS NOT NULL
                        THEN ' : ' || (p_metadata->>'reason')
                        ELSE ''
                    END);
            WHEN 'spent' THEN
                RETURN format('Dépensé %s gidouilles%s',
                    ABS(p_amount),
                    CASE WHEN p_item_name IS NOT NULL
                        THEN ' pour ' || p_item_name
                        ELSE ''
                    END);
            WHEN 'traded' THEN
                RETURN format('Échangé %s gidouilles', ABS(p_amount));
            WHEN 'awarded' THEN
                RETURN format('Reçu %s gidouilles (récompense)', ABS(p_amount));
            WHEN 'removed' THEN
                RETURN format('Retiré %s gidouilles', ABS(p_amount));
            ELSE
                RETURN format('%s gidouilles : %s', p_amount, p_event_type);
        END CASE;

    -- Bonus events
    ELSIF p_reward_type = 'bonus' THEN
        CASE p_event_type
            WHEN 'earned' THEN
                RETURN format('Gagné %s bonus%s',
                    ABS(p_amount),
                    CASE WHEN p_metadata->>'reason' IS NOT NULL
                        THEN ' : ' || (p_metadata->>'reason')
                        ELSE ''
                    END);
            WHEN 'used' THEN
                RETURN format('Utilisé %s bonus', ABS(p_amount));
            WHEN 'awarded' THEN
                RETURN format('Reçu %s bonus (récompense)', ABS(p_amount));
            ELSE
                RETURN format('%s bonus : %s', p_amount, p_event_type);
        END CASE;

    -- VIP Card events
    ELSIF p_reward_type = 'vip_card' THEN
        CASE p_event_type
            WHEN 'earned' THEN
                RETURN format('Carte VIP obtenue : %s', COALESCE(p_item_name, 'Carte inconnue'));
            WHEN 'used' THEN
                RETURN format('Carte VIP utilisée : %s', COALESCE(p_item_name, 'Carte inconnue'));
            WHEN 'traded' THEN
                RETURN format('Carte VIP échangée : %s', COALESCE(p_item_name, 'Carte inconnue'));
            WHEN 'removed' THEN
                RETURN format('Carte VIP retirée : %s', COALESCE(p_item_name, 'Carte inconnue'));
            ELSE
                RETURN format('Carte VIP %s : %s', p_event_type, COALESCE(p_item_name, 'inconnue'));
        END CASE;

    -- Achievement events
    ELSIF p_reward_type = 'achievement' THEN
        CASE p_event_type
            WHEN 'unlocked' THEN
                RETURN format('Succès débloqué : %s%s',
                    COALESCE(p_item_name, 'Succès inconnu'),
                    CASE
                        WHEN COALESCE(NULLIF(p_metadata->>'gidouilles', '')::INTEGER, 0) > 0
                        THEN format(' (+%s gidouilles)', p_metadata->>'gidouilles')
                        ELSE ''
                    END);
            ELSE
                RETURN format('Succès %s : %s', p_event_type, COALESCE(p_item_name, 'inconnu'));
        END CASE;

    -- Item events
    ELSIF p_reward_type = 'item' THEN
        CASE p_event_type
            WHEN 'purchased' THEN
                RETURN format('Article acheté : %s%s',
                    COALESCE(p_item_name, 'Article inconnu'),
                    CASE
                        WHEN COALESCE(NULLIF(p_metadata->>'quantity', '')::INTEGER, 0) > 1
                        THEN format(' x%s', p_metadata->>'quantity')
                        ELSE ''
                    END);
            WHEN 'used' THEN
                RETURN format('Article utilisé : %s', COALESCE(p_item_name, 'Article inconnu'));
            WHEN 'traded' THEN
                RETURN format('Article échangé : %s', COALESCE(p_item_name, 'Article inconnu'));
            WHEN 'expired' THEN
                RETURN format('Article expiré : %s', COALESCE(p_item_name, 'Article inconnu'));
            ELSE
                RETURN format('Article %s : %s', p_event_type, COALESCE(p_item_name, 'inconnu'));
        END CASE;

    ELSE
        RETURN format('%s %s', p_reward_type, p_event_type);
    END IF;
END;
$$;

-- =====================================================================
-- 6. CREATE TRIGGERS FOR EXISTING TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- Trigger for gidouilles_history
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_gidouilles_history_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_type public.reward_event_type;
    v_description TEXT;
BEGIN
    -- Skip if already logged (deduplication)
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'gidouilles_history'
        AND source_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    -- Determine event type based on delta
    IF NEW.delta > 0 THEN
        v_event_type := 'earned';
    ELSE
        v_event_type := 'spent';
    END IF;

    -- Generate description
    v_description := generate_reward_event_description(
        'gidouilles'::public.reward_type,
        v_event_type,
        NEW.delta,
        NULL,
        jsonb_build_object('reason', NEW.reason)
    );

    -- Insert into reward_events
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
    ) VALUES (
        NEW.student_id,
        'gidouilles',
        v_event_type,
        NEW.delta,
        v_description,
        jsonb_build_object(
            'reason', NEW.reason,
            'original_delta', NEW.delta
        ),
        'gidouilles_history',
        NEW.id,
        NEW.class_id,
        NEW.created_by,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_gidouilles_to_events
    AFTER INSERT ON public.gidouilles_history
    FOR EACH ROW
    EXECUTE FUNCTION public.log_gidouilles_history_to_events();

-- ---------------------------------------------------------------------
-- Trigger for bonus_history
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_bonus_history_to_events()
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
        WHERE source_table = 'bonus_history'
        AND source_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    -- Determine event type
    IF NEW.delta > 0 THEN
        v_event_type := 'earned';
    ELSE
        v_event_type := 'used';
    END IF;

    -- Generate description
    v_description := generate_reward_event_description(
        'bonus'::public.reward_type,
        v_event_type,
        NEW.delta,
        NULL,
        jsonb_build_object('reason', NEW.reason)
    );

    -- Insert into reward_events
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
    ) VALUES (
        NEW.student_id,
        'bonus',
        v_event_type,
        NEW.delta,
        v_description,
        jsonb_build_object(
            'reason', NEW.reason,
            'original_delta', NEW.delta
        ),
        'bonus_history',
        NEW.id,
        NEW.class_id,
        NEW.created_by,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_bonus_to_events
    AFTER INSERT ON public.bonus_history
    FOR EACH ROW
    EXECUTE FUNCTION public.log_bonus_history_to_events();

-- ---------------------------------------------------------------------
-- Trigger for vip_cards_activity
-- ---------------------------------------------------------------------
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

    -- Get card display name from template (you might need to join with vip_card_templates)
    -- For now, use the template ID as the name
    v_card_name := NEW.card_template_id;

    -- Get student's class for context
    SELECT class_id INTO v_class_id
    FROM public.class_members
    WHERE student_id = NEW.student_id
    AND status = 'active'
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

CREATE TRIGGER trigger_log_vip_cards_to_events
    AFTER INSERT ON public.vip_cards_activity
    FOR EACH ROW
    EXECUTE FUNCTION public.log_vip_cards_to_events();

-- ---------------------------------------------------------------------
-- Trigger for student_achievements
-- ---------------------------------------------------------------------
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

    -- Get student's class
    SELECT class_id INTO v_class_id
    FROM public.class_members
    WHERE student_id = NEW.student_id
    AND status = 'active'
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

CREATE TRIGGER trigger_log_achievements_to_events
    AFTER INSERT ON public.student_achievements
    FOR EACH ROW
    EXECUTE FUNCTION public.log_achievements_to_events();

-- ---------------------------------------------------------------------
-- Trigger for shop_purchase_history
-- ---------------------------------------------------------------------
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

    -- Get student's class
    SELECT class_id INTO v_class_id
    FROM public.class_members
    WHERE student_id = NEW.student_id
    AND status = 'active'
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

CREATE TRIGGER trigger_log_shop_purchases_to_events
    AFTER INSERT ON public.shop_purchase_history
    FOR EACH ROW
    EXECUTE FUNCTION public.log_shop_purchases_to_events();

-- ---------------------------------------------------------------------
-- Trigger for item_usage_log
-- ---------------------------------------------------------------------
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

    -- Get student's class
    SELECT class_id INTO v_class_id
    FROM public.class_members
    WHERE student_id = NEW.student_id
    AND status = 'active'
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

CREATE TRIGGER trigger_log_item_usage_to_events
    AFTER INSERT ON public.item_usage_log
    FOR EACH ROW
    EXECUTE FUNCTION public.log_item_usage_to_events();

-- ---------------------------------------------------------------------
-- Trigger for marketplace_trades (both parties)
-- ---------------------------------------------------------------------
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

    -- Get classes for both participants
    SELECT class_id INTO v_initiator_class
    FROM public.class_members
    WHERE student_id = NEW.initiator_id
    AND status = 'active'
    LIMIT 1;

    SELECT class_id INTO v_partner_class
    FROM public.class_members
    WHERE student_id = NEW.partner_id
    AND status = 'active'
    LIMIT 1;

    -- Extract gidouilles with null-safety
    v_initiator_gidouilles := COALESCE(NULLIF(NEW.final_trade->'from_initiator'->>'gidouilles', '')::INTEGER, 0);
    v_partner_gidouilles := COALESCE(NULLIF(NEW.final_trade->'from_partner'->>'gidouilles', '')::INTEGER, 0);

    -- Log event for initiator (if they gave gidouilles)
    -- Deduplication check includes student_id since both parties can have events for same trade
    IF v_initiator_gidouilles > 0 THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.reward_events
            WHERE source_table = 'marketplace_trades'
            AND source_id = NEW.id
            AND student_id = NEW.initiator_id
        ) THEN
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
                created_at
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
                student_id,
                reward_type,
                event_type,
                amount,
                description,
                metadata,
                source_table,
                source_id,
                class_id,
                created_at
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
                student_id,
                reward_type,
                event_type,
                amount,
                description,
                metadata,
                source_table,
                source_id,
                class_id,
                created_at
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
                student_id,
                reward_type,
                event_type,
                amount,
                description,
                metadata,
                source_table,
                source_id,
                class_id,
                created_at
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

    -- TODO: Log VIP cards traded (would need to parse card arrays from final_trade JSON)

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_marketplace_trades_to_events
    AFTER UPDATE OF status ON public.marketplace_trades
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION public.log_marketplace_trades_to_events();

-- =====================================================================
-- 7. GRANT PERMISSIONS
-- =====================================================================

GRANT SELECT ON public.reward_events TO authenticated;
GRANT USAGE ON TYPE public.reward_type TO authenticated;
GRANT USAGE ON TYPE public.reward_event_type TO authenticated;

-- =====================================================================
-- 8. VERIFICATION
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration completed: reward_events table created';
    RAISE NOTICE 'Created enum types: reward_type, reward_event_type';
    RAISE NOTICE 'Created indexes: student_time, student_type_time, class_time, source_lookup, event_type';
    RAISE NOTICE 'Created RLS policies using is_admin() and is_class_teacher() helpers';
    RAISE NOTICE 'Created triggers for all 7 source tables';
    RAISE NOTICE 'Created helper function: generate_reward_event_description';
    RAISE NOTICE '';
    RAISE NOTICE 'The reward_events table will now automatically aggregate events from:';
    RAISE NOTICE '  - gidouilles_history';
    RAISE NOTICE '  - bonus_history';
    RAISE NOTICE '  - vip_cards_activity';
    RAISE NOTICE '  - student_achievements';
    RAISE NOTICE '  - shop_purchase_history';
    RAISE NOTICE '  - item_usage_log';
    RAISE NOTICE '  - marketplace_trades';
END $$;