-- =====================================================================
-- SHOP QUERY OPTIMIZATION MIGRATION
-- =====================================================================
-- This migration optimizes shop queries by:
-- 1. Extending get_shop_items with pagination, sorting, filtering
-- 2. Creating get_shop_item_detail RPC to replace 6 sequential queries
-- 3. Adding missing index for purchase limit checks
--
-- Performance Impact:
-- - get_shop_items: Supports server-side pagination, reducing data transfer
-- - get_shop_item_detail: 6 queries -> 1 query (~80% reduction in API calls)
-- - New index: Faster purchase limit lookups
-- =====================================================================

-- =====================================================================
-- 1. ADD MISSING INDEX FOR PURCHASE LIMIT CHECKS
-- =====================================================================

-- This index optimizes queries for daily/weekly purchase limits and cooldowns
-- The DESC order on purchased_at helps with MAX() queries for cooldown checks
CREATE INDEX IF NOT EXISTS idx_purchases_student_template_date
ON public.shop_purchase_history(student_id, template_id, purchased_at DESC)
WHERE refunded_at IS NULL;

COMMENT ON INDEX idx_purchases_student_template_date IS
'Optimizes purchase limit checks (daily/weekly counts, cooldown) by student and template';

-- =====================================================================
-- 2. EXTEND get_shop_items WITH FULL PARAMETERS
-- =====================================================================

-- Drop existing function to recreate with new signature
DROP FUNCTION IF EXISTS public.get_shop_items(UUID, TEXT);

-- Recreate with extended parameters
CREATE OR REPLACE FUNCTION public.get_shop_items(
    p_student_id UUID,
    p_category TEXT DEFAULT NULL,
    p_rarity TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_active_only BOOLEAN DEFAULT TRUE,
    p_sort_by TEXT DEFAULT 'sort_order',
    p_sort_order TEXT DEFAULT 'asc',
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    items JSONB,
    total_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_items JSONB;
    v_total INTEGER;
    v_query TEXT;
BEGIN
    -- Validate sort parameters to prevent SQL injection
    IF p_sort_by NOT IN ('sort_order', 'price', 'name', 'rarity', 'created_at') THEN
        p_sort_by := 'sort_order';
    END IF;

    IF p_sort_order NOT IN ('asc', 'desc') THEN
        p_sort_order := 'asc';
    END IF;

    -- Clamp pagination parameters
    IF p_limit < 1 THEN p_limit := 1; END IF;
    IF p_limit > 500 THEN p_limit := 500; END IF;
    IF p_offset < 0 THEN p_offset := 0; END IF;

    -- Get total count for pagination
    SELECT COUNT(*)::INTEGER INTO v_total
    FROM shop_item_templates t
    WHERE (p_active_only = FALSE OR t.is_active = true)
    AND (p_active_only = FALSE OR t.available_from IS NULL OR t.available_from <= NOW())
    AND (p_active_only = FALSE OR t.available_until IS NULL OR t.available_until >= NOW())
    AND (p_category IS NULL OR t.category = p_category)
    AND (p_rarity IS NULL OR t.rarity = p_rarity)
    AND (p_search IS NULL OR p_search = '' OR
         t.display_name ILIKE '%' || p_search || '%' OR
         t.description ILIKE '%' || p_search || '%');

    -- Build and execute the main query with dynamic sorting
    SELECT jsonb_agg(item_data ORDER BY
        CASE WHEN p_sort_by = 'sort_order' AND p_sort_order = 'asc' THEN (item_data->>'sort_order')::INTEGER END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'sort_order' AND p_sort_order = 'desc' THEN (item_data->>'sort_order')::INTEGER END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'price' AND p_sort_order = 'asc' THEN (item_data->>'final_price')::INTEGER END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'price' AND p_sort_order = 'desc' THEN (item_data->>'final_price')::INTEGER END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN item_data->>'display_name' END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN item_data->>'display_name' END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'rarity' AND p_sort_order = 'asc' THEN
            CASE item_data->>'rarity'
                WHEN 'common' THEN 1
                WHEN 'uncommon' THEN 2
                WHEN 'rare' THEN 3
                WHEN 'epic' THEN 4
                WHEN 'legendary' THEN 5
            END
        END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'rarity' AND p_sort_order = 'desc' THEN
            CASE item_data->>'rarity'
                WHEN 'common' THEN 1
                WHEN 'uncommon' THEN 2
                WHEN 'rare' THEN 3
                WHEN 'epic' THEN 4
                WHEN 'legendary' THEN 5
            END
        END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN item_data->>'created_at' END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN item_data->>'created_at' END DESC NULLS LAST,
        -- Secondary sort by display_name for stability
        item_data->>'display_name' ASC
    ) INTO v_items
    FROM (
        SELECT jsonb_build_object(
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
            'is_active', t.is_active,
            'sort_order', t.sort_order,
            'created_at', t.created_at,
            'owned_quantity', COALESCE(inv.total_quantity, 0),
            'can_purchase', COALESCE(lim.can_purchase, true),
            'purchase_limit_reason', lim.reason,
            'available_from', t.available_from,
            'available_until', t.available_until,
            'max_owned_per_student', t.max_owned_per_student,
            'daily_purchase_limit', t.daily_purchase_limit,
            'weekly_purchase_limit', t.weekly_purchase_limit,
            'purchase_cooldown_hours', t.purchase_cooldown_hours
        ) as item_data
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
        WHERE (p_active_only = FALSE OR t.is_active = true)
        AND (p_active_only = FALSE OR t.available_from IS NULL OR t.available_from <= NOW())
        AND (p_active_only = FALSE OR t.available_until IS NULL OR t.available_until >= NOW())
        AND (p_category IS NULL OR t.category = p_category)
        AND (p_rarity IS NULL OR t.rarity = p_rarity)
        AND (p_search IS NULL OR p_search = '' OR
             t.display_name ILIKE '%' || p_search || '%' OR
             t.description ILIKE '%' || p_search || '%')
        LIMIT p_limit
        OFFSET p_offset
    ) subquery;

    -- Return results
    RETURN QUERY SELECT COALESCE(v_items, '[]'::JSONB), v_total;
END;
$$;

COMMENT ON FUNCTION public.get_shop_items IS
'Get available shop items with student-specific purchase limits, owned quantities, and full pagination/sorting support.
Parameters:
- p_student_id: UUID of the student viewing the shop
- p_category: Filter by category (consumable, booster, cosmetic, utility)
- p_rarity: Filter by rarity (common, uncommon, rare, epic, legendary)
- p_search: Search term for display_name/description (ILIKE)
- p_active_only: If true, only show active and available items
- p_sort_by: Sort field (sort_order, price, name, rarity, created_at)
- p_sort_order: Sort direction (asc, desc)
- p_limit: Max items to return (1-500, default 100)
- p_offset: Pagination offset (default 0)
Returns: TABLE(items JSONB, total_count INTEGER)';

-- =====================================================================
-- 3. CREATE get_shop_item_detail RPC
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_shop_item_detail(
    p_student_id UUID,
    p_template_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_template RECORD;
    v_owned_quantity INTEGER;
    v_daily_purchases INTEGER;
    v_weekly_purchases INTEGER;
    v_last_purchase_at TIMESTAMPTZ;
    v_gidouilles_balance INTEGER;
    v_final_price INTEGER;
    v_can_purchase BOOLEAN;
    v_cannot_purchase_reason TEXT;
    v_cooldown_available_at TIMESTAMPTZ;
BEGIN
    -- Get template details
    SELECT * INTO v_template
    FROM shop_item_templates
    WHERE id = p_template_id;

    IF v_template IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Article non trouvé'
        );
    END IF;

    -- Get student's current balance
    SELECT gidouilles INTO v_gidouilles_balance
    FROM profiles
    WHERE id = p_student_id;

    IF v_gidouilles_balance IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Étudiant non trouvé'
        );
    END IF;

    -- Calculate final price
    v_final_price := v_template.base_price - (v_template.base_price * v_template.discount_percentage / 100);

    -- Get owned quantity (single query)
    SELECT COALESCE(SUM(quantity), 0) INTO v_owned_quantity
    FROM student_item_inventory
    WHERE student_id = p_student_id
    AND template_id = p_template_id;

    -- Get daily purchases count (uses the new index)
    SELECT COALESCE(SUM(quantity), 0) INTO v_daily_purchases
    FROM shop_purchase_history
    WHERE student_id = p_student_id
    AND template_id = p_template_id
    AND purchased_at >= NOW() - INTERVAL '1 day'
    AND refunded_at IS NULL;

    -- Get weekly purchases count (uses the new index)
    SELECT COALESCE(SUM(quantity), 0) INTO v_weekly_purchases
    FROM shop_purchase_history
    WHERE student_id = p_student_id
    AND template_id = p_template_id
    AND purchased_at >= NOW() - INTERVAL '1 week'
    AND refunded_at IS NULL;

    -- Get last purchase time (uses the new index)
    SELECT MAX(purchased_at) INTO v_last_purchase_at
    FROM shop_purchase_history
    WHERE student_id = p_student_id
    AND template_id = p_template_id
    AND refunded_at IS NULL;

    -- Determine if can purchase and reason if not
    v_can_purchase := true;
    v_cannot_purchase_reason := NULL;

    -- Check if item is active
    IF NOT v_template.is_active THEN
        v_can_purchase := false;
        v_cannot_purchase_reason := 'Article non disponible';
    -- Check availability window
    ELSIF v_template.available_from IS NOT NULL AND v_template.available_from > NOW() THEN
        v_can_purchase := false;
        v_cannot_purchase_reason := 'Article pas encore disponible';
    ELSIF v_template.available_until IS NOT NULL AND v_template.available_until < NOW() THEN
        v_can_purchase := false;
        v_cannot_purchase_reason := 'Article plus disponible';
    -- Check balance
    ELSIF v_gidouilles_balance < v_final_price THEN
        v_can_purchase := false;
        v_cannot_purchase_reason := 'Gidouilles insuffisantes';
    -- Check max owned
    ELSIF v_template.max_owned_per_student IS NOT NULL AND v_owned_quantity >= v_template.max_owned_per_student THEN
        v_can_purchase := false;
        v_cannot_purchase_reason := format('Limite de possession atteinte (max: %s)', v_template.max_owned_per_student);
    -- Check daily limit
    ELSIF v_template.daily_purchase_limit IS NOT NULL AND v_daily_purchases >= v_template.daily_purchase_limit THEN
        v_can_purchase := false;
        v_cannot_purchase_reason := format('Limite quotidienne atteinte (max: %s/jour)', v_template.daily_purchase_limit);
    -- Check weekly limit
    ELSIF v_template.weekly_purchase_limit IS NOT NULL AND v_weekly_purchases >= v_template.weekly_purchase_limit THEN
        v_can_purchase := false;
        v_cannot_purchase_reason := format('Limite hebdomadaire atteinte (max: %s/semaine)', v_template.weekly_purchase_limit);
    -- Check cooldown
    ELSIF v_template.purchase_cooldown_hours IS NOT NULL AND v_last_purchase_at IS NOT NULL THEN
        v_cooldown_available_at := v_last_purchase_at + (v_template.purchase_cooldown_hours || ' hours')::INTERVAL;
        IF v_cooldown_available_at > NOW() THEN
            v_can_purchase := false;
            v_cannot_purchase_reason := 'Temps d''attente requis';
        END IF;
    END IF;

    -- Return comprehensive item detail
    RETURN jsonb_build_object(
        'success', true,
        -- Template fields
        'id', v_template.id,
        'internal_name', v_template.internal_name,
        'display_name', v_template.display_name,
        'description', v_template.description,
        'category', v_template.category,
        'item_type', v_template.item_type,
        'rarity', v_template.rarity,
        'base_price', v_template.base_price,
        'discount_percentage', v_template.discount_percentage,
        'final_price', v_final_price,
        'icon_url', v_template.icon_url,
        'properties', v_template.properties,
        'is_active', v_template.is_active,
        'available_from', v_template.available_from,
        'available_until', v_template.available_until,
        'max_owned_per_student', v_template.max_owned_per_student,
        'daily_purchase_limit', v_template.daily_purchase_limit,
        'weekly_purchase_limit', v_template.weekly_purchase_limit,
        'purchase_cooldown_hours', v_template.purchase_cooldown_hours,
        'is_tradeable', v_template.is_tradeable,
        'trade_cooldown_hours', v_template.trade_cooldown_hours,
        'sort_order', v_template.sort_order,
        'created_at', v_template.created_at,
        'updated_at', v_template.updated_at,
        'created_by', v_template.created_by,
        -- Student-specific fields
        'owned_quantity', v_owned_quantity,
        'daily_purchases', v_daily_purchases,
        'weekly_purchases', v_weekly_purchases,
        'last_purchase_at', v_last_purchase_at,
        'cooldown_available_at', v_cooldown_available_at,
        'gidouilles_balance', v_gidouilles_balance,
        'can_purchase', v_can_purchase,
        'cannot_purchase_reason', v_cannot_purchase_reason
    );
END;
$$;

COMMENT ON FUNCTION public.get_shop_item_detail IS
'Get detailed information about a specific shop item for a student.
Replaces 6 sequential queries with a single optimized RPC call.
Returns all template fields plus:
- owned_quantity: How many the student currently owns
- daily_purchases: Purchases in the last 24 hours
- weekly_purchases: Purchases in the last 7 days
- last_purchase_at: Timestamp of most recent purchase (for cooldown)
- cooldown_available_at: When cooldown expires (if applicable)
- gidouilles_balance: Student current balance
- can_purchase: Boolean indicating if purchase is allowed
- cannot_purchase_reason: Human-readable reason if cannot purchase';

-- =====================================================================
-- 4. GRANT PERMISSIONS
-- =====================================================================

GRANT EXECUTE ON FUNCTION public.get_shop_items(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_item_detail(UUID, UUID) TO authenticated;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
