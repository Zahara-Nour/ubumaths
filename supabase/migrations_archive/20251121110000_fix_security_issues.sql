-- ============================================================================
-- Migration: Fix Security Issues from Final Audit
-- Created: 2025-11-21
-- ============================================================================
-- Fixes:
-- 1. CRITICAL-1: purchase_shop_item missing p_purchase_context parameter
-- 2. CRITICAL-2: Race condition in try_consume_minesweeper_hint_item
-- ============================================================================

-- ============================================================================
-- FIX 1: Update purchase_shop_item to accept purchase_context
-- ============================================================================

DROP FUNCTION IF EXISTS public.purchase_shop_item(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.purchase_shop_item(
    p_student_id UUID,
    p_template_id UUID,
    p_quantity INTEGER DEFAULT 1,
    p_purchase_context JSONB DEFAULT '{}'  -- NEW: Audit context (IP, user-agent)
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

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Article non trouvé ou indisponible'
        );
    END IF;

    -- Calculate final price (with discount)
    v_final_price := CEIL(v_template.base_price * p_quantity * (1 - COALESCE(v_template.discount_percentage, 0) / 100.0));

    -- Check student balance WITH ROW LOCK
    SELECT gidouilles INTO v_current_balance
    FROM profiles
    WHERE id = p_student_id
    FOR UPDATE;  -- CRITICAL: Lock row to prevent concurrent modifications

    IF v_current_balance IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Profil étudiant non trouvé'
        );
    END IF;

    IF v_current_balance < v_final_price THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Gidouilles insuffisantes (requis: %s, disponible: %s)', v_final_price, v_current_balance)
        );
    END IF;

    -- Check ownership limit
    IF v_template.max_owned_per_student IS NOT NULL THEN
        SELECT COALESCE(SUM(quantity), 0) INTO v_existing_quantity
        FROM student_item_inventory
        WHERE student_id = p_student_id
        AND template_id = p_template_id;

        IF v_existing_quantity + p_quantity > v_template.max_owned_per_student THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Limite de possession atteinte (max: %s)', v_template.max_owned_per_student)
            );
        END IF;
    END IF;

    -- Check daily purchase limit
    IF v_template.daily_purchase_limit IS NOT NULL THEN
        SELECT COALESCE(SUM(quantity), 0) INTO v_daily_purchases
        FROM shop_purchase_history
        WHERE student_id = p_student_id
        AND template_id = p_template_id
        AND purchased_at >= date_trunc('day', NOW())
        AND refunded_at IS NULL;

        IF v_daily_purchases + p_quantity > v_template.daily_purchase_limit THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Limite quotidienne atteinte (max: %s/jour)', v_template.daily_purchase_limit)
            );
        END IF;
    END IF;

    -- Check weekly purchase limit
    IF v_template.weekly_purchase_limit IS NOT NULL THEN
        SELECT COALESCE(SUM(quantity), 0) INTO v_weekly_purchases
        FROM shop_purchase_history
        WHERE student_id = p_student_id
        AND template_id = p_template_id
        AND purchased_at >= date_trunc('week', NOW())
        AND refunded_at IS NULL;

        IF v_weekly_purchases + p_quantity > v_template.weekly_purchase_limit THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Limite hebdomadaire atteinte (max: %s/semaine)', v_template.weekly_purchase_limit)
            );
        END IF;
    END IF;

    -- Check purchase cooldown
    IF v_template.purchase_cooldown_hours IS NOT NULL AND v_template.purchase_cooldown_hours > 0 THEN
        SELECT MAX(purchased_at) INTO v_last_purchase
        FROM shop_purchase_history
        WHERE student_id = p_student_id
        AND template_id = p_template_id
        AND refunded_at IS NULL;

        IF v_last_purchase IS NOT NULL AND
           v_last_purchase + (v_template.purchase_cooldown_hours || ' hours')::INTERVAL > NOW() THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Temps d''attente requis: %s heures', v_template.purchase_cooldown_hours)
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
            -- Create new stack
            INSERT INTO student_item_inventory (
                student_id,
                template_id,
                quantity,
                acquired_via,
                acquisition_data
            ) VALUES (
                p_student_id,
                p_template_id,
                p_quantity,
                'purchase',
                jsonb_build_object('purchase_id', v_purchase_id)
            ) RETURNING id INTO v_inventory_id;
        END IF;
    ELSE
        -- Non-stackable: create individual entries
        FOR i IN 1..p_quantity LOOP
            INSERT INTO student_item_inventory (
                student_id,
                template_id,
                quantity,
                uses_remaining,
                acquired_via,
                acquisition_data
            ) VALUES (
                p_student_id,
                p_template_id,
                1,
                CASE
                    WHEN v_template.properties->>'uses' IS NOT NULL
                    THEN (v_template.properties->>'uses')::INTEGER
                    ELSE NULL
                END,
                'purchase',
                jsonb_build_object('purchase_id', v_purchase_id)
            ) RETURNING id INTO v_inventory_id;  -- Returns last one
        END LOOP;

        -- If we need to return the first inventory ID, get it
        SELECT id INTO v_inventory_id
        FROM student_item_inventory
        WHERE student_id = p_student_id
        AND template_id = p_template_id
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    -- Log purchase WITH CONTEXT (use the pre-generated v_purchase_id)
    INSERT INTO shop_purchase_history (
        id,
        student_id,
        template_id,
        inventory_id,
        quantity,
        unit_price,
        total_price,
        discount_applied,
        gidouilles_history_id,
        purchase_context  -- NEW: Include audit context
    ) VALUES (
        v_purchase_id,
        p_student_id,
        p_template_id,
        v_inventory_id,
        p_quantity,
        v_template.base_price,
        v_final_price,
        v_template.base_price * p_quantity - v_final_price,
        v_gidouilles_history_id,
        p_purchase_context  -- NEW: Store IP, user-agent, etc.
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

COMMENT ON FUNCTION public.purchase_shop_item IS
'Atomic purchase of shop items with all validations. Includes purchase_context for audit trail (IP, user-agent).';

GRANT EXECUTE ON FUNCTION public.purchase_shop_item TO authenticated;

-- ============================================================================
-- FIX 2: Update try_consume_minesweeper_hint_item with race condition protection
-- ============================================================================

DROP FUNCTION IF EXISTS public.try_consume_minesweeper_hint_item(UUID);

CREATE OR REPLACE FUNCTION public.try_consume_minesweeper_hint_item(
  p_student_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_inventory_id UUID;
  v_quantity INTEGER;
BEGIN
  -- SECURITY: Defense in depth - verify caller is the student
  -- This check is redundant with use_hint() but protects against misuse if called directly
  IF p_student_id != auth.uid() THEN
    RETURN NULL;  -- Silently reject to avoid information leakage
  END IF;

  -- Get the minesweeper_hint template ID
  SELECT id INTO v_template_id
  FROM public.shop_item_templates
  WHERE internal_name = 'minesweeper_hint'
    AND is_active = true;

  IF v_template_id IS NULL THEN
    RETURN NULL;  -- Template not found or inactive
  END IF;

  -- Find an available item in inventory (not locked, has quantity)
  SELECT id, quantity INTO v_inventory_id, v_quantity
  FROM public.student_item_inventory
  WHERE student_id = p_student_id
    AND template_id = v_template_id
    AND NOT is_locked
    AND quantity > 0
  ORDER BY acquired_at ASC  -- Use oldest items first (FIFO)
  LIMIT 1
  FOR UPDATE;  -- Lock the row to prevent concurrent consumption

  -- CRITICAL FIX: Validate after lock (race condition protection)
  -- Another concurrent transaction might have already consumed this item
  IF v_inventory_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
    RETURN NULL;  -- No items available or already consumed
  END IF;

  -- Consume one item
  IF v_quantity > 1 THEN
    -- Decrement quantity
    UPDATE public.student_item_inventory
    SET quantity = quantity - 1,
        last_used_at = NOW(),
        total_uses_count = total_uses_count + 1,
        updated_at = NOW()
    WHERE id = v_inventory_id
    AND quantity > 0;  -- Extra safety: Only update if quantity still > 0

    -- Check if update actually happened
    IF NOT FOUND THEN
      RETURN NULL;  -- Item was already consumed
    END IF;
  ELSE
    -- Last item - remove from inventory
    DELETE FROM public.student_item_inventory
    WHERE id = v_inventory_id
    AND quantity > 0;  -- Extra safety: Only delete if quantity still > 0

    -- Check if delete actually happened
    IF NOT FOUND THEN
      RETURN NULL;  -- Item was already consumed
    END IF;
  END IF;

  -- Log the usage
  INSERT INTO public.item_usage_log (
    student_id,
    inventory_id,
    template_id,
    usage_context,
    usage_data,
    effect_applied
  ) VALUES (
    p_student_id,
    v_inventory_id,
    v_template_id,
    'minesweeper',
    jsonb_build_object('action', 'hint_reveal'),
    jsonb_build_object(
      'type', 'hint',
      'avoids_penalty', true,
      'applied_at', NOW()
    )
  );

  RETURN v_inventory_id;
END;
$$;

COMMENT ON FUNCTION public.try_consume_minesweeper_hint_item IS
  'Attempts to consume a minesweeper hint item from student inventory. Returns inventory_id if consumed, NULL if no items available. Uses FIFO (oldest first). Includes race condition protection.';

GRANT EXECUTE ON FUNCTION public.try_consume_minesweeper_hint_item TO authenticated;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- CRITICAL-1: purchase_shop_item now accepts p_purchase_context JSONB parameter
--             and stores it in shop_purchase_history.purchase_context
--             This preserves the audit trail (IP, user-agent) for fraud detection
--
-- CRITICAL-2: try_consume_minesweeper_hint_item now has:
--             - Explicit validation after acquiring the row lock
--             - WHERE quantity > 0 clauses in UPDATE/DELETE
--             - IF NOT FOUND checks to detect concurrent consumption
--             This prevents double-consumption race conditions
-- ============================================================================
