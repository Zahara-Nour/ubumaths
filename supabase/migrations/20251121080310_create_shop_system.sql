-- =====================================================================
-- SHOP SYSTEM DATABASE SCHEMA
-- =====================================================================
-- This migration creates the complete database foundation for the Shop system
-- where students can purchase items using gidouilles (virtual currency).
-- Items can be traded in the marketplace alongside VIP cards.
--
-- Key Features:
-- - Admin-defined item templates with categories and properties
-- - Student inventory management with quantity tracking
-- - Purchase history and usage logging for analytics
-- - Integration with existing marketplace for item trading
-- - Atomic purchase transactions with gidouilles deduction
-- - Item locking to prevent double-spending
-- - Usage cooldowns and purchase limits
-- =====================================================================

-- =====================================================================
-- 1. CREATE TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- shop_item_templates: Admin-defined items available for purchase
-- ---------------------------------------------------------------------
CREATE TABLE public.shop_item_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Item identification
    internal_name TEXT UNIQUE NOT NULL,  -- e.g., 'minesweeper_hint', 'xp_booster_30min'
    display_name TEXT NOT NULL,          -- French display name, e.g., 'Indice Démineur'
    description TEXT,                     -- French description for UI

    -- Categorization
    category TEXT NOT NULL CHECK (category IN ('consumable', 'booster', 'cosmetic', 'utility')),
    item_type TEXT NOT NULL,              -- Specific type within category (e.g., 'hint', 'xp_boost', 'avatar_frame')
    rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),

    -- Pricing
    base_price INTEGER NOT NULL CHECK (base_price > 0 AND base_price <= 100000),
    discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),

    -- Availability
    is_active BOOLEAN DEFAULT true,
    available_from TIMESTAMPTZ,           -- NULL = available immediately
    available_until TIMESTAMPTZ,          -- NULL = no expiration

    -- Purchase limits
    max_owned_per_student INTEGER,        -- NULL = unlimited ownership
    daily_purchase_limit INTEGER,         -- NULL = no daily limit
    weekly_purchase_limit INTEGER,        -- NULL = no weekly limit
    purchase_cooldown_hours INTEGER,      -- Hours before can purchase again

    -- Item properties (JSON for flexibility)
    properties JSONB DEFAULT '{}',
    /* Examples:
       Consumables: { "stackable": true, "uses": 3, "game": "minesweeper" }
       Boosters: { "duration_minutes": 30, "multiplier": 1.5, "effect_type": "xp" }
       Cosmetics: { "type": "avatar_frame", "theme": "gold", "animated": true }
       Utility: { "effect": "skip_exercise", "applicable_to": ["homework", "assessment"] }
    */

    -- Trading configuration
    is_tradeable BOOLEAN DEFAULT true,
    trade_cooldown_hours INTEGER DEFAULT 24,  -- Hours after acquisition before can trade

    -- UI
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT valid_availability CHECK (
        available_from IS NULL OR
        available_until IS NULL OR
        available_from < available_until
    ),
    CONSTRAINT valid_price_with_discount CHECK (
        base_price - (base_price * discount_percentage / 100) > 0
    )
);

COMMENT ON TABLE public.shop_item_templates IS 'Admin-defined item templates available in the shop';
COMMENT ON COLUMN public.shop_item_templates.internal_name IS 'Unique identifier for code references (English, snake_case)';
COMMENT ON COLUMN public.shop_item_templates.display_name IS 'Display name shown to users (French)';
COMMENT ON COLUMN public.shop_item_templates.category IS 'Main category: consumable (used up), booster (temporary effects), cosmetic (visual), utility (special actions)';
COMMENT ON COLUMN public.shop_item_templates.properties IS 'Item-specific properties like duration, uses, effects, etc.';

-- ---------------------------------------------------------------------
-- student_item_inventory: Items owned by students
-- ---------------------------------------------------------------------
CREATE TABLE public.student_item_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Ownership
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.shop_item_templates(id),

    -- Quantity and usage
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    uses_remaining INTEGER,               -- For multi-use consumables (NULL = not applicable)

    -- Equipment state (for cosmetics/boosters)
    is_equipped BOOLEAN DEFAULT false,
    equipped_at TIMESTAMPTZ,

    -- Acquisition details
    acquired_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    acquired_from TEXT NOT NULL CHECK (acquired_from IN ('shop', 'trade', 'reward', 'gift', 'migration')),
    acquisition_data JSONB DEFAULT '{}',  -- e.g., { "purchase_id": "...", "trade_id": "...", "reward_type": "achievement" }

    -- Expiration (for time-limited items)
    expires_at TIMESTAMPTZ,

    -- Usage tracking
    last_used_at TIMESTAMPTZ,
    total_uses_count INTEGER DEFAULT 0,

    -- Locking for trades/marketplace
    is_locked BOOLEAN DEFAULT false,
    locked_for_listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
    locked_for_trade_id UUID REFERENCES public.marketplace_trades(id) ON DELETE SET NULL,
    locked_at TIMESTAMPTZ,

    -- Instance-specific data
    instance_data JSONB DEFAULT '{}',     -- e.g., custom name, enchantments, etc.

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT only_one_lock CHECK (
        (locked_for_listing_id IS NULL OR locked_for_trade_id IS NULL)
    ),
    CONSTRAINT equipped_only_if_owned CHECK (
        NOT is_equipped OR quantity > 0
    ),
    CONSTRAINT uses_remaining_valid CHECK (
        uses_remaining IS NULL OR uses_remaining >= 0
    )
);

-- Create composite index for stackable items lookup
CREATE UNIQUE INDEX idx_inventory_stackable ON public.student_item_inventory(student_id, template_id)
WHERE uses_remaining IS NULL AND instance_data = '{}';

COMMENT ON TABLE public.student_item_inventory IS 'Items owned by students with quantity and usage tracking';
COMMENT ON COLUMN public.student_item_inventory.uses_remaining IS 'For consumables with multiple uses (NULL for single-use or non-consumables)';
COMMENT ON COLUMN public.student_item_inventory.acquisition_data IS 'Details about how the item was acquired';
COMMENT ON COLUMN public.student_item_inventory.instance_data IS 'Unique properties for this specific item instance';

-- ---------------------------------------------------------------------
-- shop_purchase_history: Complete purchase audit trail
-- ---------------------------------------------------------------------
CREATE TABLE public.shop_purchase_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Purchase details
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.shop_item_templates(id),
    inventory_id UUID REFERENCES public.student_item_inventory(id) ON DELETE SET NULL,

    -- Transaction details
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price INTEGER NOT NULL CHECK (unit_price > 0),
    total_price INTEGER NOT NULL CHECK (total_price > 0),
    discount_applied INTEGER DEFAULT 0 CHECK (discount_applied >= 0),

    -- Context
    purchase_context JSONB DEFAULT '{}',  -- e.g., { "promo_code": "BLACKFRIDAY", "event": "christmas_2025" }

    -- Linked transactions
    gidouilles_history_id UUID,           -- Will link to gidouilles_history entry

    -- Timestamps
    purchased_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Soft delete support (for refunds/cancellations)
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,
    refunded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.shop_purchase_history IS 'Complete audit trail of all shop purchases';
COMMENT ON COLUMN public.shop_purchase_history.purchase_context IS 'Additional context like promo codes, events, etc.';
COMMENT ON COLUMN public.shop_purchase_history.gidouilles_history_id IS 'Reference to the corresponding gidouilles transaction';

-- ---------------------------------------------------------------------
-- item_usage_log: Track item usage for analytics and cooldowns
-- ---------------------------------------------------------------------
CREATE TABLE public.item_usage_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Item reference
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.student_item_inventory(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.shop_item_templates(id),

    -- Usage details
    used_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    usage_context TEXT NOT NULL,          -- e.g., 'minesweeper', 'assessment', 'homework'
    usage_data JSONB DEFAULT '{}',        -- e.g., { "game_id": "...", "exercise_id": "...", "cell": [5, 3] }

    -- Effect tracking
    effect_applied JSONB DEFAULT '{}',    -- e.g., { "xp_multiplier": 1.5, "duration_minutes": 30 }
    effect_expires_at TIMESTAMPTZ,

    -- Reversal support (for undo/admin actions)
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT,
    reversed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.item_usage_log IS 'Detailed log of all item usage for analytics and cooldown tracking';
COMMENT ON COLUMN public.item_usage_log.usage_context IS 'The game or feature where the item was used';
COMMENT ON COLUMN public.item_usage_log.usage_data IS 'Context-specific data about the usage';
COMMENT ON COLUMN public.item_usage_log.effect_applied IS 'The actual effect that was applied when the item was used';

-- =====================================================================
-- 2. EXTEND EXISTING TABLES
-- =====================================================================

-- Add columns to marketplace_listings for item trading
ALTER TABLE public.marketplace_listings
ADD COLUMN IF NOT EXISTS offered_item_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS wanted_item_template_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN public.marketplace_listings.offered_item_ids IS 'Array of inventory IDs for items being offered';
COMMENT ON COLUMN public.marketplace_listings.wanted_item_template_ids IS 'Array of item template IDs wanted in exchange';

-- Add columns to marketplace_proposals for item offers
ALTER TABLE public.marketplace_proposals
ADD COLUMN IF NOT EXISTS offered_item_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN public.marketplace_proposals.offered_item_ids IS 'Array of inventory IDs for items being offered in the proposal';

-- Note: marketplace_trades already uses JSONB for offers, which can include items

-- =====================================================================
-- 3. CREATE INDEXES
-- =====================================================================

-- shop_item_templates indexes
CREATE INDEX idx_shop_templates_active ON public.shop_item_templates(is_active, sort_order);
CREATE INDEX idx_shop_templates_category ON public.shop_item_templates(category) WHERE is_active = true;
CREATE INDEX idx_shop_templates_rarity ON public.shop_item_templates(rarity) WHERE is_active = true;
CREATE INDEX idx_shop_templates_availability ON public.shop_item_templates(available_from, available_until) WHERE is_active = true;

-- student_item_inventory indexes
CREATE INDEX idx_inventory_student ON public.student_item_inventory(student_id);
CREATE INDEX idx_inventory_template ON public.student_item_inventory(template_id);
CREATE INDEX idx_inventory_locked ON public.student_item_inventory(is_locked) WHERE is_locked = true;
CREATE INDEX idx_inventory_equipped ON public.student_item_inventory(student_id, is_equipped) WHERE is_equipped = true;
CREATE INDEX idx_inventory_expires ON public.student_item_inventory(expires_at) WHERE expires_at IS NOT NULL;

-- shop_purchase_history indexes
CREATE INDEX idx_purchases_student ON public.shop_purchase_history(student_id, purchased_at DESC);
CREATE INDEX idx_purchases_template ON public.shop_purchase_history(template_id);
CREATE INDEX idx_purchases_date ON public.shop_purchase_history(purchased_at DESC);

-- item_usage_log indexes
CREATE INDEX idx_usage_student ON public.item_usage_log(student_id, used_at DESC);
CREATE INDEX idx_usage_inventory ON public.item_usage_log(inventory_id);
CREATE INDEX idx_usage_context ON public.item_usage_log(usage_context);
CREATE INDEX idx_usage_date ON public.item_usage_log(used_at DESC);

-- =====================================================================
-- 4. CREATE RPC FUNCTIONS
-- =====================================================================

-- ---------------------------------------------------------------------
-- purchase_shop_item: Atomic purchase transaction
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_shop_item(
    p_student_id UUID,
    p_template_id UUID,
    p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_template RECORD;
    v_current_balance INTEGER;
    v_final_price INTEGER;
    v_inventory_id UUID;
    v_gidouilles_history_id UUID;
    v_purchase_id UUID;
    v_existing_quantity INTEGER;
    v_daily_purchases INTEGER;
    v_weekly_purchases INTEGER;
    v_last_purchase TIMESTAMPTZ;
    v_student_class_id UUID;
BEGIN
    -- SECURITY: Verify caller is purchasing for themselves
    IF p_student_id != auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Non autorisé'
        );
    END IF;

    -- Validate input
    IF p_quantity <= 0 OR p_quantity > 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La quantité doit être entre 1 et 100'
        );
    END IF;

    -- Get template details
    SELECT * INTO v_template
    FROM shop_item_templates
    WHERE id = p_template_id
    AND is_active = true
    AND (available_from IS NULL OR available_from <= NOW())
    AND (available_until IS NULL OR available_until >= NOW());

    IF v_template IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Article non disponible'
        );
    END IF;

    -- Calculate final price with discount
    v_final_price := (v_template.base_price - (v_template.base_price * v_template.discount_percentage / 100)) * p_quantity;

    -- Check student balance (with FOR UPDATE to prevent race conditions)
    SELECT gidouilles INTO v_current_balance
    FROM profiles
    WHERE id = p_student_id
    FOR UPDATE;

    IF v_current_balance < v_final_price THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Gidouilles insuffisantes',
            'required', v_final_price,
            'balance', v_current_balance
        );
    END IF;

    -- Check max owned limit
    IF v_template.max_owned_per_student IS NOT NULL THEN
        SELECT COALESCE(SUM(quantity), 0) INTO v_existing_quantity
        FROM student_item_inventory
        WHERE student_id = p_student_id
        AND template_id = p_template_id;

        IF v_existing_quantity + p_quantity > v_template.max_owned_per_student THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Limite de possession atteinte (max: %s)', v_template.max_owned_per_student),
                'current_owned', v_existing_quantity,
                'max_allowed', v_template.max_owned_per_student
            );
        END IF;
    END IF;

    -- Check daily purchase limit
    IF v_template.daily_purchase_limit IS NOT NULL THEN
        SELECT COALESCE(SUM(quantity), 0) INTO v_daily_purchases
        FROM shop_purchase_history
        WHERE student_id = p_student_id
        AND template_id = p_template_id
        AND purchased_at >= NOW() - INTERVAL '1 day'
        AND refunded_at IS NULL;

        IF v_daily_purchases + p_quantity > v_template.daily_purchase_limit THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Limite d''achat quotidienne atteinte',
                'limit', v_template.daily_purchase_limit
            );
        END IF;
    END IF;

    -- Check weekly purchase limit
    IF v_template.weekly_purchase_limit IS NOT NULL THEN
        SELECT COALESCE(SUM(quantity), 0) INTO v_weekly_purchases
        FROM shop_purchase_history
        WHERE student_id = p_student_id
        AND template_id = p_template_id
        AND purchased_at >= NOW() - INTERVAL '1 week'
        AND refunded_at IS NULL;

        IF v_weekly_purchases + p_quantity > v_template.weekly_purchase_limit THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Limite d''achat hebdomadaire atteinte',
                'limit', v_template.weekly_purchase_limit
            );
        END IF;
    END IF;

    -- Check purchase cooldown
    IF v_template.purchase_cooldown_hours IS NOT NULL THEN
        SELECT MAX(purchased_at) INTO v_last_purchase
        FROM shop_purchase_history
        WHERE student_id = p_student_id
        AND template_id = p_template_id
        AND refunded_at IS NULL;

        IF v_last_purchase IS NOT NULL AND
           v_last_purchase + (v_template.purchase_cooldown_hours || ' hours')::INTERVAL > NOW() THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Veuillez attendre avant de racheter cet article'),
                'available_at', v_last_purchase + (v_template.purchase_cooldown_hours || ' hours')::INTERVAL
            );
        END IF;
    END IF;

    -- Get student's class for gidouilles update
    SELECT class_id INTO v_student_class_id
    FROM class_members
    WHERE student_id = p_student_id
    AND status = 'active'
    LIMIT 1;

    -- Generate purchase_id early so we can reference it
    v_purchase_id := gen_random_uuid();

    -- Deduct gidouilles atomically (row is already locked by FOR UPDATE above)
    UPDATE profiles
    SET gidouilles = gidouilles - v_final_price
    WHERE id = p_student_id;

    -- Log to gidouilles_history
    INSERT INTO gidouilles_history (
        student_id,
        class_id,
        delta,
        reason,
        created_by
    ) VALUES (
        p_student_id,
        v_student_class_id,
        -v_final_price,
        format('Achat boutique: %s x%s', v_template.display_name, p_quantity),
        auth.uid()
    ) RETURNING id INTO v_gidouilles_history_id;

    -- Check if item is stackable (from properties)
    IF v_template.properties->>'stackable' = 'true' THEN
        -- Try to find existing stackable inventory entry
        SELECT id, quantity INTO v_inventory_id, v_existing_quantity
        FROM student_item_inventory
        WHERE student_id = p_student_id
        AND template_id = p_template_id
        AND uses_remaining IS NULL
        AND instance_data = '{}'
        AND NOT is_locked
        LIMIT 1;

        IF v_inventory_id IS NOT NULL THEN
            -- Update existing stack
            UPDATE student_item_inventory
            SET quantity = quantity + p_quantity,
                updated_at = NOW()
            WHERE id = v_inventory_id;
        ELSE
            -- Create new inventory entry
            INSERT INTO student_item_inventory (
                student_id,
                template_id,
                quantity,
                acquired_from,
                acquisition_data,
                uses_remaining
            ) VALUES (
                p_student_id,
                p_template_id,
                p_quantity,
                'shop',
                jsonb_build_object('purchase_id', v_purchase_id),
                CASE
                    WHEN (v_template.properties->>'uses')::INTEGER > 1
                    THEN (v_template.properties->>'uses')::INTEGER
                    ELSE NULL
                END
            ) RETURNING id INTO v_inventory_id;
        END IF;
    ELSE
        -- Non-stackable items - create individual entries
        FOR i IN 1..p_quantity LOOP
            INSERT INTO student_item_inventory (
                student_id,
                template_id,
                quantity,
                acquired_from,
                acquisition_data,
                uses_remaining
            ) VALUES (
                p_student_id,
                p_template_id,
                1,
                'shop',
                jsonb_build_object('purchase_id', v_purchase_id),
                CASE
                    WHEN (v_template.properties->>'uses')::INTEGER > 1
                    THEN (v_template.properties->>'uses')::INTEGER
                    ELSE NULL
                END
            );
        END LOOP;
        -- Return the first created inventory ID
        SELECT id INTO v_inventory_id
        FROM student_item_inventory
        WHERE student_id = p_student_id
        AND template_id = p_template_id
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    -- Log purchase (use the pre-generated v_purchase_id)
    INSERT INTO shop_purchase_history (
        id,
        student_id,
        template_id,
        inventory_id,
        quantity,
        unit_price,
        total_price,
        discount_applied,
        gidouilles_history_id
    ) VALUES (
        v_purchase_id,
        p_student_id,
        p_template_id,
        v_inventory_id,
        p_quantity,
        v_template.base_price,
        v_final_price,
        v_template.base_price * p_quantity - v_final_price,
        v_gidouilles_history_id
    );

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'inventory_id', v_inventory_id,
        'purchase_id', v_purchase_id,
        'gidouilles_spent', v_final_price,
        'new_balance', v_current_balance - v_final_price,
        'item_name', v_template.display_name,
        'quantity', p_quantity
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Erreur lors de l''achat',
            'details', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION public.purchase_shop_item IS 'Atomic purchase of shop items with all validations';

-- ---------------------------------------------------------------------
-- use_item: Use a consumable item from inventory
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.use_item(
    p_inventory_id UUID,
    p_context TEXT,
    p_usage_data JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inventory RECORD;
    v_template RECORD;
    v_effect JSONB;
    v_remaining_uses INTEGER;
BEGIN
    -- Get inventory and template details
    SELECT
        i.*,
        t.category,
        t.item_type,
        t.properties,
        t.display_name
    INTO v_inventory
    FROM student_item_inventory i
    JOIN shop_item_templates t ON t.id = i.template_id
    WHERE i.id = p_inventory_id
    AND i.student_id = auth.uid();

    IF v_inventory IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Article non trouvé dans votre inventaire'
        );
    END IF;

    -- Check if item is locked
    IF v_inventory.is_locked THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cet article est verrouillé pour une transaction'
        );
    END IF;

    -- Check if item is consumable
    IF v_inventory.category != 'consumable' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cet article n''est pas consommable'
        );
    END IF;

    -- Check if item can be used in this context
    IF v_inventory.properties->>'game' IS NOT NULL AND
       v_inventory.properties->>'game' != p_context THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Cet article ne peut être utilisé que dans %s', v_inventory.properties->>'game')
        );
    END IF;

    -- Apply the effect based on item type
    v_effect := jsonb_build_object(
        'type', v_inventory.item_type,
        'context', p_context,
        'applied_at', NOW()
    );

    -- Handle multi-use items
    IF v_inventory.uses_remaining IS NOT NULL THEN
        v_remaining_uses := v_inventory.uses_remaining - 1;

        IF v_remaining_uses > 0 THEN
            -- Decrement uses
            UPDATE student_item_inventory
            SET uses_remaining = v_remaining_uses,
                last_used_at = NOW(),
                total_uses_count = total_uses_count + 1,
                updated_at = NOW()
            WHERE id = p_inventory_id;
        ELSE
            -- Last use - remove from inventory
            DELETE FROM student_item_inventory
            WHERE id = p_inventory_id;
            v_remaining_uses := 0;
        END IF;
    ELSE
        -- Single use item - handle quantity
        IF v_inventory.quantity > 1 THEN
            -- Decrement quantity
            UPDATE student_item_inventory
            SET quantity = quantity - 1,
                last_used_at = NOW(),
                total_uses_count = total_uses_count + 1,
                updated_at = NOW()
            WHERE id = p_inventory_id;
            v_remaining_uses := v_inventory.quantity - 1;
        ELSE
            -- Last item - remove from inventory
            DELETE FROM student_item_inventory
            WHERE id = p_inventory_id;
            v_remaining_uses := 0;
        END IF;
    END IF;

    -- Log the usage
    INSERT INTO item_usage_log (
        student_id,
        inventory_id,
        template_id,
        usage_context,
        usage_data,
        effect_applied
    ) VALUES (
        v_inventory.student_id,
        p_inventory_id,
        v_inventory.template_id,
        p_context,
        p_usage_data,
        v_effect
    );

    RETURN jsonb_build_object(
        'success', true,
        'effect', v_effect,
        'remaining_uses', v_remaining_uses,
        'item_name', v_inventory.display_name
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Erreur lors de l''utilisation de l''article',
            'details', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION public.use_item IS 'Use a consumable item from inventory with effect tracking';

-- ---------------------------------------------------------------------
-- lock_items_for_listing: Lock items to prevent double-spending in marketplace
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lock_items_for_listing(
    p_student_id UUID,
    p_item_ids UUID[],
    p_listing_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_locked_count INTEGER;
BEGIN
    -- SECURITY: Verify caller owns the items
    IF p_student_id != auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Non autorisé'
        );
    END IF;

    -- Validate input
    IF p_item_ids IS NULL OR array_length(p_item_ids, 1) IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Aucun article spécifié'
        );
    END IF;

    -- Verify ownership and lock items
    UPDATE student_item_inventory
    SET is_locked = true,
        locked_for_listing_id = p_listing_id,
        locked_at = NOW(),
        updated_at = NOW()
    WHERE id = ANY(p_item_ids)
    AND student_id = p_student_id
    AND NOT is_locked
    AND quantity > 0;

    GET DIAGNOSTICS v_locked_count = ROW_COUNT;

    IF v_locked_count != array_length(p_item_ids, 1) THEN
        -- Rollback the locks
        UPDATE student_item_inventory
        SET is_locked = false,
            locked_for_listing_id = NULL,
            locked_at = NULL,
            updated_at = NOW()
        WHERE locked_for_listing_id = p_listing_id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Certains articles ne sont pas disponibles',
            'requested', array_length(p_item_ids, 1),
            'locked', v_locked_count
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'locked_count', v_locked_count
    );
END;
$$;

COMMENT ON FUNCTION public.lock_items_for_listing IS 'Lock items for marketplace listing to prevent double-spending';

-- ---------------------------------------------------------------------
-- lock_items_for_trade: Lock items for friend-to-friend trade
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lock_items_for_trade(
    p_student_id UUID,
    p_item_ids UUID[],
    p_trade_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_locked_count INTEGER;
BEGIN
    -- SECURITY: Verify caller owns the items
    IF p_student_id != auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Non autorisé'
        );
    END IF;

    -- Validate input
    IF p_item_ids IS NULL OR array_length(p_item_ids, 1) IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Aucun article spécifié'
        );
    END IF;

    -- Verify ownership and lock items
    UPDATE student_item_inventory
    SET is_locked = true,
        locked_for_trade_id = p_trade_id,
        locked_at = NOW(),
        updated_at = NOW()
    WHERE id = ANY(p_item_ids)
    AND student_id = p_student_id
    AND NOT is_locked
    AND quantity > 0;

    GET DIAGNOSTICS v_locked_count = ROW_COUNT;

    IF v_locked_count != array_length(p_item_ids, 1) THEN
        -- Rollback the locks
        UPDATE student_item_inventory
        SET is_locked = false,
            locked_for_trade_id = NULL,
            locked_at = NULL,
            updated_at = NOW()
        WHERE locked_for_trade_id = p_trade_id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Certains articles ne sont pas disponibles',
            'requested', array_length(p_item_ids, 1),
            'locked', v_locked_count
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'locked_count', v_locked_count
    );
END;
$$;

COMMENT ON FUNCTION public.lock_items_for_trade IS 'Lock items for friend-to-friend trade';

-- ---------------------------------------------------------------------
-- unlock_items: Unlock items when listing/trade is cancelled
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_items(
    p_entity_id UUID,
    p_entity_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_unlocked_count INTEGER;
BEGIN
    IF p_entity_type NOT IN ('listing', 'trade') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Type d''entité invalide'
        );
    END IF;

    -- SECURITY: Verify caller owns items locked for this entity
    IF NOT EXISTS (
        SELECT 1 FROM student_item_inventory
        WHERE (
            (p_entity_type = 'listing' AND locked_for_listing_id = p_entity_id) OR
            (p_entity_type = 'trade' AND locked_for_trade_id = p_entity_id)
        )
        AND student_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Non autorisé ou aucun article verrouillé trouvé'
        );
    END IF;

    IF p_entity_type = 'listing' THEN
        UPDATE student_item_inventory
        SET is_locked = false,
            locked_for_listing_id = NULL,
            locked_at = NULL,
            updated_at = NOW()
        WHERE locked_for_listing_id = p_entity_id
        AND student_id = auth.uid();
    ELSE
        UPDATE student_item_inventory
        SET is_locked = false,
            locked_for_trade_id = NULL,
            locked_at = NULL,
            updated_at = NOW()
        WHERE locked_for_trade_id = p_entity_id
        AND student_id = auth.uid();
    END IF;

    GET DIAGNOSTICS v_unlocked_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'unlocked_count', v_unlocked_count
    );
END;
$$;

COMMENT ON FUNCTION public.unlock_items IS 'Unlock items when marketplace listing or trade is cancelled';

-- ---------------------------------------------------------------------
-- transfer_items: Transfer items between students (for completed trades)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_items(
    p_from_student UUID,
    p_to_student UUID,
    p_item_ids UUID[],
    p_trade_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_transferred_count INTEGER;
    v_expected_count INTEGER;
BEGIN
    -- SECURITY: Verify caller is participant in transfer
    IF auth.uid() NOT IN (p_from_student, p_to_student) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Non autorisé'
        );
    END IF;

    -- Validate input
    IF p_item_ids IS NULL OR array_length(p_item_ids, 1) IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Aucun article spécifié'
        );
    END IF;

    v_expected_count := array_length(p_item_ids, 1);

    -- Transfer items in a single UPDATE (fixes count bug from loop)
    UPDATE student_item_inventory
    SET student_id = p_to_student,
        is_locked = false,
        locked_for_trade_id = NULL,
        locked_at = NULL,
        acquired_from = 'trade',
        acquired_at = NOW(),
        acquisition_data = jsonb_build_object('trade_id', p_trade_id, 'from_student', p_from_student),
        updated_at = NOW()
    WHERE id = ANY(p_item_ids)
    AND student_id = p_from_student
    AND locked_for_trade_id = p_trade_id;

    GET DIAGNOSTICS v_transferred_count = ROW_COUNT;

    IF v_transferred_count != v_expected_count THEN
        -- This should not happen if locks are properly managed
        RAISE EXCEPTION 'Échec du transfert: certains articles n''étaient pas verrouillés pour cette transaction (transféré: %, attendu: %)', v_transferred_count, v_expected_count;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'transferred_count', v_transferred_count
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Erreur lors du transfert'
        );
END;
$$;

COMMENT ON FUNCTION public.transfer_items IS 'Transfer items between students for completed trades';

-- ---------------------------------------------------------------------
-- get_shop_items: Get available shop items with student-specific info
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_shop_items(
    p_student_id UUID,
    p_category TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_items JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', t.id,
            'internal_name', t.internal_name,
            'display_name', t.display_name,
            'description', t.description,
            'category', t.category,
            'item_type', t.item_type,
            'rarity', t.rarity,
            'base_price', t.base_price,
            'discount_percentage', t.discount_percentage,
            'final_price', t.base_price - (t.base_price * t.discount_percentage / 100),
            'icon_url', t.icon_url,
            'properties', t.properties,
            'is_tradeable', t.is_tradeable,
            'owned_quantity', COALESCE(inv.total_quantity, 0),
            'can_purchase', COALESCE(lim.can_purchase, true),
            'purchase_limit_reason', lim.reason,
            'available_from', t.available_from,
            'available_until', t.available_until
        ) ORDER BY t.sort_order, t.display_name
    ) INTO v_items
    FROM shop_item_templates t
    LEFT JOIN LATERAL (
        SELECT SUM(quantity) as total_quantity
        FROM student_item_inventory
        WHERE student_id = p_student_id
        AND template_id = t.id
    ) inv ON true
    LEFT JOIN LATERAL (
        SELECT
            CASE
                WHEN t.daily_purchase_limit IS NOT NULL AND
                     daily_purchases.total >= t.daily_purchase_limit THEN false
                WHEN t.weekly_purchase_limit IS NOT NULL AND
                     weekly_purchases.total >= t.weekly_purchase_limit THEN false
                WHEN t.purchase_cooldown_hours IS NOT NULL AND
                     last_purchase.purchased_at + (t.purchase_cooldown_hours || ' hours')::INTERVAL > NOW() THEN false
                WHEN t.max_owned_per_student IS NOT NULL AND
                     COALESCE(inv.total_quantity, 0) >= t.max_owned_per_student THEN false
                ELSE true
            END as can_purchase,
            CASE
                WHEN t.daily_purchase_limit IS NOT NULL AND
                     daily_purchases.total >= t.daily_purchase_limit THEN 'Limite quotidienne atteinte'
                WHEN t.weekly_purchase_limit IS NOT NULL AND
                     weekly_purchases.total >= t.weekly_purchase_limit THEN 'Limite hebdomadaire atteinte'
                WHEN t.purchase_cooldown_hours IS NOT NULL AND
                     last_purchase.purchased_at + (t.purchase_cooldown_hours || ' hours')::INTERVAL > NOW() THEN 'Temps d''attente requis'
                WHEN t.max_owned_per_student IS NOT NULL AND
                     COALESCE(inv.total_quantity, 0) >= t.max_owned_per_student THEN 'Limite de possession atteinte'
                ELSE NULL
            END as reason
        FROM (
            SELECT COALESCE(SUM(quantity), 0) as total
            FROM shop_purchase_history
            WHERE student_id = p_student_id
            AND template_id = t.id
            AND purchased_at >= NOW() - INTERVAL '1 day'
            AND refunded_at IS NULL
        ) daily_purchases,
        (
            SELECT COALESCE(SUM(quantity), 0) as total
            FROM shop_purchase_history
            WHERE student_id = p_student_id
            AND template_id = t.id
            AND purchased_at >= NOW() - INTERVAL '1 week'
            AND refunded_at IS NULL
        ) weekly_purchases,
        (
            SELECT MAX(purchased_at) as purchased_at
            FROM shop_purchase_history
            WHERE student_id = p_student_id
            AND template_id = t.id
            AND refunded_at IS NULL
        ) last_purchase
    ) lim ON true
    WHERE t.is_active = true
    AND (t.available_from IS NULL OR t.available_from <= NOW())
    AND (t.available_until IS NULL OR t.available_until >= NOW())
    AND (p_category IS NULL OR t.category = p_category);

    RETURN COALESCE(v_items, '[]'::JSONB);
END;
$$;

COMMENT ON FUNCTION public.get_shop_items IS 'Get available shop items with student-specific purchase limits and owned quantities';

-- =====================================================================
-- 5. CREATE RLS POLICIES
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE public.shop_item_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_item_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_usage_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- shop_item_templates policies
-- ---------------------------------------------------------------------

-- Everyone can view active items
CREATE POLICY "Anyone can view active shop items"
ON public.shop_item_templates
FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins can view all items (including inactive)
CREATE POLICY "Admins can view all shop items"
ON public.shop_item_templates
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Only admins can insert items
CREATE POLICY "Only admins can create shop items"
ON public.shop_item_templates
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Only admins can update items
CREATE POLICY "Only admins can update shop items"
ON public.shop_item_templates
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Only admins can delete items
CREATE POLICY "Only admins can delete shop items"
ON public.shop_item_templates
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- ---------------------------------------------------------------------
-- student_item_inventory policies
-- ---------------------------------------------------------------------

-- Students can view their own inventory
CREATE POLICY "Students can view their own inventory"
ON public.student_item_inventory
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Teachers can view their students' inventories
CREATE POLICY "Teachers can view their students inventories"
ON public.student_item_inventory
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
        JOIN public.classes c ON c.id = cm.class_id
        WHERE cm.student_id = student_item_inventory.student_id
        AND c.teacher_id = auth.uid()
    )
);

-- Admins can view all inventories
CREATE POLICY "Admins can view all inventories"
ON public.student_item_inventory
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Only allow inserts via RPC functions
CREATE POLICY "Inventory inserts only via RPC"
ON public.student_item_inventory
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Students can update their own items (for equipping/unequipping)
CREATE POLICY "Students can update their own items"
ON public.student_item_inventory
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- No direct deletes allowed (handled by RPC functions)
CREATE POLICY "No direct inventory deletes"
ON public.student_item_inventory
FOR DELETE
TO authenticated
USING (false);

-- ---------------------------------------------------------------------
-- shop_purchase_history policies
-- ---------------------------------------------------------------------

-- Students can view their own purchase history
CREATE POLICY "Students can view their own purchases"
ON public.shop_purchase_history
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Teachers can view their students' purchases
CREATE POLICY "Teachers can view their students purchases"
ON public.shop_purchase_history
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
        JOIN public.classes c ON c.id = cm.class_id
        WHERE cm.student_id = shop_purchase_history.student_id
        AND c.teacher_id = auth.uid()
    )
);

-- Admins can view all purchases
CREATE POLICY "Admins can view all purchases"
ON public.shop_purchase_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Only allow inserts via RPC functions
CREATE POLICY "Purchase history inserts only via RPC"
ON public.shop_purchase_history
FOR INSERT
TO authenticated
WITH CHECK (false);

-- ---------------------------------------------------------------------
-- item_usage_log policies
-- ---------------------------------------------------------------------

-- Students can view their own usage logs
CREATE POLICY "Students can view their own usage logs"
ON public.item_usage_log
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Teachers can view their students' usage logs
CREATE POLICY "Teachers can view their students usage logs"
ON public.item_usage_log
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
        JOIN public.classes c ON c.id = cm.class_id
        WHERE cm.student_id = item_usage_log.student_id
        AND c.teacher_id = auth.uid()
    )
);

-- Admins can view all usage logs
CREATE POLICY "Admins can view all usage logs"
ON public.item_usage_log
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Only allow inserts via RPC functions
CREATE POLICY "Usage log inserts only via RPC"
ON public.item_usage_log
FOR INSERT
TO authenticated
WITH CHECK (false);

-- =====================================================================
-- 6. CREATE TRIGGERS
-- =====================================================================

-- ---------------------------------------------------------------------
-- Trigger to update updated_at timestamps
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to shop_item_templates
CREATE TRIGGER update_shop_item_templates_updated_at
    BEFORE UPDATE ON public.shop_item_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Apply to student_item_inventory
CREATE TRIGGER update_student_item_inventory_updated_at
    BEFORE UPDATE ON public.student_item_inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- Trigger to auto-expire time-limited items
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_expired_items()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Remove expired items from inventory
    DELETE FROM student_item_inventory
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;

-- Note: This would typically be called by a cron job
COMMENT ON FUNCTION public.check_expired_items IS 'Remove expired items from inventories (call via cron)';

-- =====================================================================
-- 7. GRANT PERMISSIONS
-- =====================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON public.shop_item_templates TO authenticated;
GRANT ALL ON public.student_item_inventory TO authenticated;
GRANT SELECT, INSERT ON public.shop_purchase_history TO authenticated;
GRANT SELECT, INSERT ON public.item_usage_log TO authenticated;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.purchase_shop_item TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_item TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_items_for_listing TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_items_for_trade TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_items TO authenticated;

-- =====================================================================
-- 8. INSERT SAMPLE DATA (OPTIONAL - Comment out for production)
-- =====================================================================

-- Sample shop items for testing (uncomment if needed)
/*
INSERT INTO public.shop_item_templates (
    internal_name,
    display_name,
    description,
    category,
    item_type,
    rarity,
    base_price,
    discount_percentage,
    properties,
    max_owned_per_student,
    daily_purchase_limit
) VALUES
    -- Minesweeper hints
    (
        'minesweeper_hint_basic',
        'Indice Démineur',
        'Révèle une case sûre dans Démineur',
        'consumable',
        'hint',
        'common',
        50,
        0,
        '{"stackable": true, "game": "minesweeper", "effect": "reveal_safe_cell"}'::JSONB,
        10,
        5
    ),
    (
        'minesweeper_hint_premium',
        'Super Indice Démineur',
        'Révèle 3 cases sûres dans Démineur',
        'consumable',
        'hint',
        'rare',
        120,
        0,
        '{"stackable": true, "game": "minesweeper", "effect": "reveal_3_safe_cells"}'::JSONB,
        5,
        2
    ),
    -- XP Boosters
    (
        'xp_booster_30min',
        'Boost XP 30min',
        'Double vos XP pendant 30 minutes',
        'booster',
        'xp_multiplier',
        'uncommon',
        200,
        0,
        '{"duration_minutes": 30, "multiplier": 2.0, "stackable": false}'::JSONB,
        1,
        1
    ),
    -- Skip tokens
    (
        'homework_skip',
        'Passe Devoir',
        'Permet de sauter un devoir sans pénalité',
        'utility',
        'skip_token',
        'epic',
        500,
        0,
        '{"stackable": true, "applicable_to": ["homework"]}'::JSONB,
        3,
        NULL
    ),
    -- Cosmetics
    (
        'avatar_frame_gold',
        'Cadre Doré',
        'Un magnifique cadre doré pour votre avatar',
        'cosmetic',
        'avatar_frame',
        'rare',
        300,
        10,
        '{"theme": "gold", "animated": false}'::JSONB,
        1,
        NULL
    );
*/

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================