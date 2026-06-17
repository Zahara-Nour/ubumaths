-- ============================================================================
-- Migration: Add Mathemo VIP cards + use_mathemo_power RPC
-- Created: 2026-04-19
-- ============================================================================
-- 4 card templates for the Mathemo game:
-- - Lettre Bonus (reveal 1 random letter, rare, 5g)
-- - Retour en Arriere (undo last guess, rare, 5g)
-- - Voyelles Revelees (reveal 2 random vowels, epic, 8g)
-- - Multiplicateur x1.5 (score multiplier, epic, 15g)
-- ============================================================================

-- ============================================================================
-- PART 1: Insert card templates
-- ============================================================================

INSERT INTO public.vip_card_templates (
  id, name, description, category, rarity, image_path,
  action, is_enabled, base_price, is_purchasable,
  max_owned_per_student, uses_total, sort_order
) VALUES (
  'mathemo-letter',
  'Lettre Bonus',
  'Revele une lettre aleatoire du mot a trouver dans Mathemo. Utilisable 1 fois par partie.',
  'power',
  'rare',
  '/images/vip-cards/mathemo-letter.webp',
  '{"type": "hint", "context": "mathemo"}'::JSONB,
  true,
  5,
  true,
  5,
  1,
  300
), (
  'mathemo-undo',
  'Retour en Arriere',
  'Annule le dernier essai soumis dans Mathemo et recupere la tentative. Utilisable 1 fois par partie.',
  'power',
  'rare',
  '/images/vip-cards/mathemo-undo.webp',
  '{"type": "undo", "context": "mathemo"}'::JSONB,
  true,
  5,
  true,
  5,
  1,
  310
), (
  'mathemo-vowels',
  'Voyelles Revelees',
  'Revele 2 voyelles aleatoires du mot a trouver dans Mathemo. Utilisable 1 fois par partie.',
  'power',
  'epic',
  '/images/vip-cards/mathemo-vowels.webp',
  '{"type": "reveal_vowels", "context": "mathemo"}'::JSONB,
  true,
  8,
  true,
  3,
  1,
  320
), (
  'mathemo-multiplier',
  'Multiplicateur x1.5',
  'Multiplie par 1.5 le score de la partie de Mathemo. Utilisable 1 fois par partie.',
  'power',
  'epic',
  '/images/vip-cards/mathemo-multiplier.webp',
  '{"type": "multiplier", "context": "mathemo", "factor": 1.5}'::JSONB,
  true,
  15,
  true,
  3,
  1,
  330
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  action = EXCLUDED.action,
  base_price = EXCLUDED.base_price,
  rarity = EXCLUDED.rarity;

-- ============================================================================
-- PART 2: Create use_mathemo_power RPC (gidouilles fallback)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.use_mathemo_power(
    p_power_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_role TEXT;
    v_cost INTEGER;
    v_current_gidouilles INTEGER;
    v_new_gidouilles INTEGER;
    v_class_id UUID;
BEGIN
    -- 1. Auth check: must be a student
    v_student_id := auth.uid();
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise';
    END IF;

    SELECT role INTO v_role FROM public.profiles WHERE id = v_student_id;
    IF v_role != 'student' THEN
        RAISE EXCEPTION 'Seuls les eleves peuvent utiliser les pouvoirs';
    END IF;

    -- 2. Validate power type and get cost
    v_cost := CASE p_power_type
        WHEN 'letter' THEN 5
        WHEN 'undo' THEN 5
        WHEN 'vowels' THEN 8
        WHEN 'multiplier' THEN 15
        ELSE NULL
    END;

    IF v_cost IS NULL THEN
        RAISE EXCEPTION 'Type de pouvoir invalide: %', p_power_type;
    END IF;

    -- 3. Check sufficient gidouilles
    SELECT COALESCE(gidouilles, 0) INTO v_current_gidouilles
    FROM public.profiles WHERE id = v_student_id;

    IF v_current_gidouilles < v_cost THEN
        RAISE EXCEPTION 'Pas assez de gidouilles (disponible: %, requis: %)', v_current_gidouilles, v_cost;
    END IF;

    -- 4. Get student's active class
    SELECT cm.class_id INTO v_class_id
    FROM public.class_members cm
    WHERE cm.student_id = v_student_id
    AND cm.status = 'active'
    LIMIT 1;

    IF v_class_id IS NULL THEN
        RAISE EXCEPTION 'Pas de classe active trouvee';
    END IF;

    -- 5. Debit gidouilles atomically
    UPDATE public.profiles
    SET gidouilles = gidouilles - v_cost
    WHERE id = v_student_id
    AND gidouilles >= v_cost
    RETURNING gidouilles INTO v_new_gidouilles;

    IF v_new_gidouilles IS NULL THEN
        RAISE EXCEPTION 'Pas assez de gidouilles';
    END IF;

    -- 6. Log in activity
    INSERT INTO public.gidouilles_activity (
        student_id,
        class_id,
        delta,
        reason,
        created_by
    ) VALUES (
        v_student_id,
        v_class_id,
        -v_cost,
        'mathemo power: ' || p_power_type,
        v_student_id
    );

    -- 7. Return result
    RETURN jsonb_build_object(
        'success', true,
        'source', 'gidouilles',
        'gidouilles_spent', v_cost,
        'gidouilles_remaining', v_new_gidouilles
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_mathemo_power(TEXT) TO authenticated;

COMMENT ON FUNCTION public.use_mathemo_power(TEXT) IS
    'Debit gidouilles for a Mathemo power (fallback when no VIP card). SECURITY DEFINER for atomic debit + logging.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration: Mathemo VIP Cards';
    RAISE NOTICE '  1. 4 card templates inserted (mathemo-letter, mathemo-undo, mathemo-vowels, mathemo-multiplier)';
    RAISE NOTICE '  2. use_mathemo_power() RPC created';
END;
$$;
