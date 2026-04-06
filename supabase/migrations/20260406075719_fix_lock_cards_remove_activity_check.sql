-- Fix lock_cards RPC: remove incorrect vip_cards_activity check
-- The 'used' action in vip_cards_activity means "card power activated",
-- not "card consumed". Cards with activated powers should still be tradeable.
-- The usedAt field in the vip_cards JSONB is the real consumption marker,
-- already checked by validateCardOwnership in the API layer.

CREATE OR REPLACE FUNCTION public.lock_cards(
    p_student_id UUID,
    p_card_ids TEXT[],
    p_entity_id UUID,
    p_lock_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_card_id TEXT;
    v_student_cards JSONB;
    v_card_data JSONB;
BEGIN
    -- Validate lock type
    IF p_lock_type NOT IN ('listing', 'trade') THEN
        RAISE EXCEPTION 'Invalid lock type: %', p_lock_type;
    END IF;

    -- Get student's VIP cards
    SELECT vip_cards INTO v_student_cards
    FROM public.profiles
    WHERE id = p_student_id;

    IF v_student_cards IS NULL THEN
        RAISE EXCEPTION 'Student has no VIP cards';
    END IF;

    -- Check each card
    FOREACH v_card_id IN ARRAY p_card_ids
    LOOP
        -- Check card exists for this student
        v_card_data := v_student_cards->v_card_id;
        IF v_card_data IS NULL THEN
            RAISE EXCEPTION 'Card % does not belong to student', v_card_id;
        END IF;

        -- Check card is not consumed (usedAt set in JSONB)
        IF v_card_data->>'usedAt' IS NOT NULL THEN
            RAISE EXCEPTION 'Card % has been consumed and cannot be traded', v_card_id;
        END IF;

        -- Check card is not already locked
        IF EXISTS (
            SELECT 1 FROM public.marketplace_locked_cards
            WHERE card_instance_id = v_card_id
        ) THEN
            RAISE EXCEPTION 'Card % is already locked', v_card_id;
        END IF;

        -- Lock the card
        INSERT INTO public.marketplace_locked_cards (
            student_id,
            card_instance_id,
            locked_for,
            locked_entity_id
        ) VALUES (
            p_student_id,
            v_card_id,
            p_lock_type,
            p_entity_id
        );
    END LOOP;

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback any partial locks
        DELETE FROM public.marketplace_locked_cards
        WHERE locked_entity_id = p_entity_id;

        RAISE;
END;
$$;
