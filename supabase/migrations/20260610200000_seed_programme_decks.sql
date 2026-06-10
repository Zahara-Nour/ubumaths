-- ============================================================================
-- Migration: Phase 5 — Seed rétroactif des decks Programme pour élèves existants
-- Date:      2026-06-10
-- Plan:      ~/.claude/plans/immutable-painting-cake.md (Phase 5, lot L11)
-- Spec TDD:  docs/wip/srs-fsrs-spec-tdd.md §7.4
-- Cible:     docs/wip/srs-fsrs-architecture-cible.md §7.1
-- Depends on: 20260610100000_refonte_skill_attempts_per_template.sql
--             20260610100100_srs_deck_sections.sql
--             20260610150000_followup_p0_uniques_and_checks.sql
-- ============================================================================
-- Crée rétroactivement le deck Programme (is_auto_managed=true) pour chaque
-- élève existant et y ajoute les cartes correspondant aux templates famille A
-- qu'il a déjà rencontrés via skill_attempts.
--
-- COLD START FSRS (décision 8) : aucune entrée srs_card_stats n'est créée par
-- cette migration. Les cartes ajoutées démarreront à l'état 'new' lors de la
-- prochaine review/interaction de l'élève. Cette décision évite de rejouer
-- l'algorithme FSRS sur tout l'historique (complexe, peu de gain pédagogique).
--
-- IDEMPOTENT : ré-exécution safe grâce aux INDEX UNIQUE partiels :
--   - uq_srs_decks_one_programme_per_owner (un Programme par élève max)
--   - uq_srs_cards_deck_template (un template par deck max)
--
-- Pour les élèves qui ont déjà interagi avec le nouveau code après le déploiement
-- de la Phase 2 : ils ont déjà leur Programme deck via /api/skill-attempts. Cette
-- migration ne crée alors rien (ON CONFLICT DO NOTHING).
-- ============================================================================


DO $$
DECLARE
    v_student_count    integer;
    v_existing_decks   integer;
    v_existing_cards   integer;
    v_decks_inserted   integer;
    v_cards_inserted   integer;
    v_eligible_pairs   integer;
BEGIN
    -- ----- Stats initiales -----
    SELECT COUNT(*) INTO v_student_count
      FROM public.profiles
     WHERE role = 'student';

    SELECT COUNT(*) INTO v_existing_decks
      FROM public.srs_decks
     WHERE is_auto_managed = TRUE;

    SELECT COUNT(*) INTO v_existing_cards
      FROM public.srs_cards sc
      JOIN public.srs_decks sd ON sd.id = sc.deck_id
     WHERE sd.is_auto_managed = TRUE;

    RAISE NOTICE '[seed-programme] Stats initiales :';
    RAISE NOTICE '  - profiles role=student : %', v_student_count;
    RAISE NOTICE '  - Programme decks existants : %', v_existing_decks;
    RAISE NOTICE '  - Cartes existantes dans Programme : %', v_existing_cards;

    -- ========================================================================
    -- Étape 1 — Créer le deck Programme pour chaque élève qui n'en a pas
    -- ========================================================================
    -- ON CONFLICT (owner_id) WHERE is_auto_managed = TRUE :
    --   utilise l'index partiel uq_srs_decks_one_programme_per_owner.
    --   N'écrase pas les Programme decks déjà créés via /api/skill-attempts.
    INSERT INTO public.srs_decks (
        owner_id,
        name,
        description,
        deck_type,
        is_assigned,
        is_auto_managed
    )
    SELECT
        p.id,
        'Programme',
        'Tes capacités à retravailler — mises à jour automatiquement après chaque entraînement.',
        'personal',
        FALSE,
        TRUE
      FROM public.profiles p
     WHERE p.role = 'student'
    ON CONFLICT (owner_id) WHERE is_auto_managed = TRUE DO NOTHING;

    GET DIAGNOSTICS v_decks_inserted = ROW_COUNT;
    RAISE NOTICE '[seed-programme] Étape 1 : % decks Programme créés.', v_decks_inserted;

    -- ========================================================================
    -- Étape 2 — Ajouter les cartes pour les templates déjà rencontrés
    -- ========================================================================
    -- Pour chaque couple (élève, template) où :
    --   - L'élève a au moins un skill_attempt sur ce template (famille A)
    --   - Le template est tagué sur au moins un skill famille knowledge
    --   - Le couple (deck Programme, template) n'existe pas déjà

    SELECT COUNT(*) INTO v_eligible_pairs
      FROM (
        SELECT DISTINCT sa.student_id, sa.template_id
          FROM public.skill_attempts sa
         WHERE sa.template_id IS NOT NULL
           AND sa.success IS NOT NULL
           AND EXISTS (
                 SELECT 1
                   FROM public.question_template_skills qts
                   JOIN public.skills s ON s.id = qts.skill_id
                  WHERE qts.template_id = sa.template_id
                    AND s.family = 'knowledge'
               )
      ) t;

    RAISE NOTICE '[seed-programme] Étape 2 : % couples (élève, template) éligibles.', v_eligible_pairs;

    WITH eligible_pairs AS (
        SELECT DISTINCT sa.student_id, sa.template_id
          FROM public.skill_attempts sa
         WHERE sa.template_id IS NOT NULL
           AND sa.success IS NOT NULL
           AND EXISTS (
                 SELECT 1
                   FROM public.question_template_skills qts
                   JOIN public.skills s ON s.id = qts.skill_id
                  WHERE qts.template_id = sa.template_id
                    AND s.family = 'knowledge'
               )
    ),
    programme_decks AS (
        SELECT id AS deck_id, owner_id
          FROM public.srs_decks
         WHERE is_auto_managed = TRUE
    )
    INSERT INTO public.srs_cards (deck_id, card_type, template_id)
    SELECT
        pd.deck_id,
        'template',
        ep.template_id
      FROM eligible_pairs ep
      JOIN programme_decks pd ON pd.owner_id = ep.student_id
    ON CONFLICT (deck_id, template_id) WHERE template_id IS NOT NULL AND card_type = 'template' DO NOTHING;

    GET DIAGNOSTICS v_cards_inserted = ROW_COUNT;
    RAISE NOTICE '[seed-programme] Étape 2 : % cartes ajoutées au Programme.', v_cards_inserted;

    -- ----- Stats finales -----
    SELECT COUNT(*) INTO v_existing_decks
      FROM public.srs_decks
     WHERE is_auto_managed = TRUE;

    SELECT COUNT(*) INTO v_existing_cards
      FROM public.srs_cards sc
      JOIN public.srs_decks sd ON sd.id = sc.deck_id
     WHERE sd.is_auto_managed = TRUE;

    RAISE NOTICE '[seed-programme] Stats finales :';
    RAISE NOTICE '  - Programme decks total : %', v_existing_decks;
    RAISE NOTICE '  - Cartes total dans Programme : %', v_existing_cards;
END $$;


-- ============================================================================
-- Vérification post-migration (queries commentées — utiliser pour audit)
-- ============================================================================
--
-- 1. Élèves sans deck Programme (devrait être vide après migration) :
--    SELECT p.id, p.email, p.full_name
--      FROM public.profiles p
--      LEFT JOIN public.srs_decks d ON d.owner_id = p.id AND d.is_auto_managed = TRUE
--     WHERE p.role = 'student'
--       AND d.id IS NULL;
--
-- 2. Élèves avec leurs cartes Programme :
--    SELECT p.email, COUNT(sc.id) AS nb_cartes
--      FROM public.profiles p
--      JOIN public.srs_decks d ON d.owner_id = p.id AND d.is_auto_managed = TRUE
--      LEFT JOIN public.srs_cards sc ON sc.deck_id = d.id
--     WHERE p.role = 'student'
--     GROUP BY p.email
--     ORDER BY nb_cartes DESC;
--
-- 3. Cohérence (élève, template) dans skill_attempts vs Programme :
--    SELECT 'manquant' AS status, sa.student_id, sa.template_id
--      FROM (
--        SELECT DISTINCT sa.student_id, sa.template_id
--          FROM public.skill_attempts sa
--          JOIN public.question_template_skills qts ON qts.template_id = sa.template_id
--          JOIN public.skills s ON s.id = qts.skill_id
--         WHERE sa.template_id IS NOT NULL AND sa.success IS NOT NULL AND s.family = 'knowledge'
--      ) sa
--      LEFT JOIN public.srs_decks sd
--        ON sd.owner_id = sa.student_id AND sd.is_auto_managed = TRUE
--      LEFT JOIN public.srs_cards sc
--        ON sc.deck_id = sd.id AND sc.template_id = sa.template_id
--     WHERE sc.id IS NULL;
-- ============================================================================
