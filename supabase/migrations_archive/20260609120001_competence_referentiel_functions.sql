-- ============================================================================
-- Migration: Competence Referentiel — Functions & Triggers (Phase 1 step 1.2)
-- Date:      2026-06-09
-- Spec:      docs/wip/skills-referentiel-design.md (decisions 57-72)
-- Rules:     docs/wip/referentiel/college-competences.md (6 conjunctive rules)
-- Progress:  docs/wip/competence-referentiel-phase1-progress.md
-- Depends on: 20260609120000_competence_referentiel_schema.sql
-- ============================================================================
-- Implements the PL/pgSQL layer of the referentiel:
--
--   * 6 conjunctive-rule functions (one per math competence)
--       compute_chercher_level / compute_calculer_level / compute_raisonner_level
--       compute_communiquer_level / compute_modeliser_level / compute_representer_level
--
--   * 1 dispatch function
--       compute_competence_level
--
--   * 3 cache-update functions
--       update_student_skill_state_a       (Family A — knowledge)
--       update_student_observable_state    (Family B — observable consolidation)
--       update_student_competence_level    (Family B — competence verdict)
--
--   * 1 trigger function + AFTER INSERT trigger on skill_attempts
--
-- All functions are SECURITY DEFINER so the trigger can populate caches that
-- have no INSERT/UPDATE policy for end users (decision 72). search_path is
-- pinned to public, pg_temp per Supabase best practice.
--
-- Idempotence: CREATE OR REPLACE FUNCTION everywhere; the trigger uses
-- DROP TRIGGER IF EXISTS + CREATE TRIGGER.
-- ============================================================================


-- ============================================================================
-- HELPERS / SHARED LOGIC
-- ============================================================================
--
-- The 6 conjunctive functions all start by loading "the set of observable_codes
-- acquired for this student under this competence" into a text[] variable
-- (v_acquired). They then partition that set by subdimension letter and apply
-- the conjunctive rules. The structure is intentionally repeated rather than
-- factored out — each rule is short, explicit, and trivially reviewable
-- against college-competences.md.
--
-- Convention for the helper "missing for next" lists (refactor 2026-06-09):
--   * Returns a JSONB array of typed objects describing what's missing to
--     reach the next level. Empty array ([]) when already at 'tres_bonne'.
--   * Each object carries a discriminant `kind`. Five shapes:
--       { kind: 'observable',    code: 'A1' }
--           — needs the specific observable code.
--       { kind: 'one_of_subdim', letter: 'D' }
--           — needs ≥ 1 acquired observable in the whole sub-dimension.
--       { kind: 'n_of_subdim',   letter: 'A', n: 2, total: 3 }
--           — needs ≥ n among the `total` observables of the sub-dimension.
--       { kind: 'one_of_codes',  codes: ['B2','B3','B4','B5'] }
--           — needs ≥ 1 acquired among the listed codes (subset of a sub-dim).
--       { kind: 'guard',         name: 'needs_more_tasks' | 'confirm_with_third_task' }
--           — §6.4 safeguard hit (cap from update_student_competence_level).
--   * `validated_observables` stays a flat JSONB array of acquired
--     observable_code strings (e.g. ["A1","B1","B3"]) — no refactor.
--
-- Convention for `niveau`:
--   * 'insuffisante' | 'fragile' | 'satisfaisante' | 'tres_bonne'
--   * Test order: Très bonne -> Satisfaisante -> Fragile -> Insuffisante
--   * Returns the highest level whose conditions are all met.
-- ============================================================================


-- ============================================================================
-- 1. CHERCHER
-- ============================================================================
-- Rule (cf. college-competences.md §1):
--   Très bonne  : (Satisfaisante) AND C2 AND C1 AND (>=1 of D: D1|D2|D3)
--   Satisfaisante : B1 AND (>=2 of A: A1,A2,A3) AND (>=1 of B2..B5)
--   Fragile     : NOT Satisfaisante AND (>=1 of A: A1..A3) AND (>=1 of B: B1..B5)
--   Insuffisante: otherwise.
-- Cœur d'excellence : C2 (réorientation).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_chercher_level(
    p_student_id          uuid,
    p_math_competence_id  uuid
)
RETURNS TABLE (
    niveau                 text,
    validated_observables  jsonb,
    missing_for_next       jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_acquired       text[];
    -- Per-subdimension counts and flags:
    v_a_count        integer;   -- acquired among A1..A3
    v_b_count        integer;   -- acquired among B1..B5
    v_b1             boolean;
    v_b2_b5_count    integer;   -- acquired among B2..B5
    v_c1             boolean;
    v_c2             boolean;
    v_d_count        integer;   -- acquired among D1..D3
    -- Derived predicates:
    v_satisfaisante  boolean;
    v_tres_bonne     boolean;
    -- Missing list collector (typed JSONB objects — refactor 2026-06-09):
    v_missing        jsonb := '[]'::jsonb;
BEGIN
    -- Load the set of observable codes acquired for this competence.
    SELECT COALESCE(array_agg(s.observable_code), ARRAY[]::text[])
      INTO v_acquired
      FROM public.student_observable_state sos
      JOIN public.skills s ON s.id = sos.skill_id
     WHERE sos.student_id = p_student_id
       AND sos.is_acquis  = TRUE
       AND s.subdimension_id IN (
           SELECT id
             FROM public.math_competence_subdimensions
            WHERE math_competence_id = p_math_competence_id
       );

    -- Per-subdimension counts.
    v_a_count     := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['A1','A2','A3']));
    v_b_count     := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['B1','B2','B3','B4','B5']));
    v_b1          := ('B1' = ANY (v_acquired));
    v_b2_b5_count := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['B2','B3','B4','B5']));
    v_c1          := ('C1' = ANY (v_acquired));
    v_c2          := ('C2' = ANY (v_acquired));
    v_d_count     := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['D1','D2','D3']));

    -- Test Satisfaisante (used both for the level itself and as a precondition of Très bonne).
    v_satisfaisante := v_b1 AND (v_a_count >= 2) AND (v_b2_b5_count >= 1);

    -- Test Très bonne : Satisfaisante AND C2 AND C1 AND (>=1 of D).
    v_tres_bonne := v_satisfaisante AND v_c2 AND v_c1 AND (v_d_count >= 1);

    IF v_tres_bonne THEN
        RETURN QUERY SELECT 'tres_bonne'::text,
                            to_jsonb(v_acquired),
                            '[]'::jsonb;
        RETURN;
    END IF;

    IF v_satisfaisante THEN
        -- Build the missing-for-next list (target = Très bonne).
        IF NOT v_c2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C2');
        END IF;
        IF NOT v_c1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C1');
        END IF;
        IF v_d_count < 1 THEN
            -- any one of D1/D2/D3
            v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'D');
        END IF;
        RETURN QUERY SELECT 'satisfaisante'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Fragile : >=1 of A AND >=1 of B (Satisfaisante not reached).
    IF (v_a_count >= 1) AND (v_b_count >= 1) THEN
        -- Missing for Satisfaisante:
        IF NOT v_b1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B1');
        END IF;
        IF v_a_count < 2 THEN
            -- ≥ 2 of A1..A3
            v_missing := v_missing || jsonb_build_object(
                'kind', 'n_of_subdim', 'letter', 'A', 'n', 2, 'total', 3
            );
        END IF;
        IF v_b2_b5_count < 1 THEN
            -- ≥ 1 of B2..B5 (subset of B sub-dim)
            v_missing := v_missing || jsonb_build_object(
                'kind', 'one_of_codes',
                'codes', jsonb_build_array('B2', 'B3', 'B4', 'B5')
            );
        END IF;
        RETURN QUERY SELECT 'fragile'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Insuffisante : residual.
    -- Missing for Fragile:
    IF v_a_count < 1 THEN
        v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'A');
    END IF;
    IF v_b_count < 1 THEN
        v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'B');
    END IF;

    RETURN QUERY SELECT 'insuffisante'::text,
                        to_jsonb(v_acquired),
                        v_missing;
END $$;

COMMENT ON FUNCTION public.compute_chercher_level(uuid, uuid) IS
    'Decision 69 — conjunctive rule for Chercher. Cœur : C2 (réorientation). '
    'See docs/wip/referentiel/college-competences.md §1.';


-- ============================================================================
-- 2. CALCULER
-- ============================================================================
-- Rule (cf. college-competences.md §2):
--   Très bonne  : (Satisfaisante) AND D1 AND D2 AND (>=3 of B) AND (>=2 of A) AND (>=1 of C)
--   Satisfaisante : (>=2 of B) AND (>=1 of A) AND (>=1 of D)
--   Fragile     : NOT Satisfaisante AND (>=1 of B)
--   Insuffisante: otherwise.
-- Cœur d'excellence : D1+D2 (contrôle) + C (calcul littéral).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_calculer_level(
    p_student_id          uuid,
    p_math_competence_id  uuid
)
RETURNS TABLE (
    niveau                 text,
    validated_observables  jsonb,
    missing_for_next       jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_acquired       text[];
    v_a_count        integer;   -- A1..A3
    v_b_count        integer;   -- B1..B5
    v_c_count        integer;   -- C1..C3
    v_d1             boolean;
    v_d2             boolean;
    v_satisfaisante  boolean;
    v_tres_bonne     boolean;
    v_missing        jsonb := '[]'::jsonb;
BEGIN
    SELECT COALESCE(array_agg(s.observable_code), ARRAY[]::text[])
      INTO v_acquired
      FROM public.student_observable_state sos
      JOIN public.skills s ON s.id = sos.skill_id
     WHERE sos.student_id = p_student_id
       AND sos.is_acquis  = TRUE
       AND s.subdimension_id IN (
           SELECT id FROM public.math_competence_subdimensions
            WHERE math_competence_id = p_math_competence_id
       );

    v_a_count := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['A1','A2','A3']));
    v_b_count := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['B1','B2','B3','B4','B5']));
    v_c_count := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['C1','C2','C3']));
    v_d1      := ('D1' = ANY (v_acquired));
    v_d2      := ('D2' = ANY (v_acquired));

    -- Satisfaisante : (>=2 of B) AND (>=1 of A) AND (>=1 of D).
    v_satisfaisante := (v_b_count >= 2) AND (v_a_count >= 1) AND (v_d1 OR v_d2);

    -- Très bonne : Satisfaisante AND D1 AND D2 AND (>=3 of B) AND (>=2 of A) AND (>=1 of C).
    v_tres_bonne := v_satisfaisante
                AND v_d1 AND v_d2
                AND (v_b_count >= 3)
                AND (v_a_count >= 2)
                AND (v_c_count >= 1);

    IF v_tres_bonne THEN
        RETURN QUERY SELECT 'tres_bonne'::text,
                            to_jsonb(v_acquired),
                            '[]'::jsonb;
        RETURN;
    END IF;

    IF v_satisfaisante THEN
        IF NOT v_d1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'D1');
        END IF;
        IF NOT v_d2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'D2');
        END IF;
        IF v_b_count < 3 THEN
            -- ≥ 3 among B1..B5
            v_missing := v_missing || jsonb_build_object(
                'kind', 'n_of_subdim', 'letter', 'B', 'n', 3, 'total', 5
            );
        END IF;
        IF v_a_count < 2 THEN
            -- ≥ 2 among A1..A3
            v_missing := v_missing || jsonb_build_object(
                'kind', 'n_of_subdim', 'letter', 'A', 'n', 2, 'total', 3
            );
        END IF;
        IF v_c_count < 1 THEN
            -- ≥ 1 of C
            v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'C');
        END IF;
        RETURN QUERY SELECT 'satisfaisante'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Fragile : >=1 of B (Satisfaisante not reached).
    IF v_b_count >= 1 THEN
        -- Missing for Satisfaisante:
        IF v_b_count < 2 THEN
            -- ≥ 2 among B1..B5
            v_missing := v_missing || jsonb_build_object(
                'kind', 'n_of_subdim', 'letter', 'B', 'n', 2, 'total', 5
            );
        END IF;
        IF v_a_count < 1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'A');
        END IF;
        IF NOT (v_d1 OR v_d2) THEN
            -- ≥ 1 among {D1, D2} (only first two D matter for Calculer Satisfaisante)
            v_missing := v_missing || jsonb_build_object(
                'kind', 'one_of_codes',
                'codes', jsonb_build_array('D1', 'D2')
            );
        END IF;
        RETURN QUERY SELECT 'fragile'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Insuffisante : residual.
    IF v_b_count < 1 THEN
        v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'B');
    END IF;

    RETURN QUERY SELECT 'insuffisante'::text,
                        to_jsonb(v_acquired),
                        v_missing;
END $$;

COMMENT ON FUNCTION public.compute_calculer_level(uuid, uuid) IS
    'Decision 69 — conjunctive rule for Calculer. Cœur : D1+D2 (contrôle) + C (calcul littéral). '
    'See docs/wip/referentiel/college-competences.md §2.';


-- ============================================================================
-- 3. RAISONNER
-- ============================================================================
-- Rule (cf. college-competences.md §3):
--   Très bonne  : (Satisfaisante) AND B2 AND D2 AND (>=1 of C: C1|C2|C3)
--   Satisfaisante : A1 AND B1
--   Fragile     : NOT Satisfaisante AND (>=1 of {A1, B1, D1})
--   Insuffisante: otherwise.
-- Cœur d'excellence : B2 (cas général) + D2 (relecture critique) + 1 of C (outils logiques).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_raisonner_level(
    p_student_id          uuid,
    p_math_competence_id  uuid
)
RETURNS TABLE (
    niveau                 text,
    validated_observables  jsonb,
    missing_for_next       jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_acquired       text[];
    v_a1             boolean;
    v_b1             boolean;
    v_b2             boolean;
    v_c_count        integer;   -- C1..C3
    v_d1             boolean;
    v_d2             boolean;
    v_satisfaisante  boolean;
    v_tres_bonne     boolean;
    v_missing        jsonb := '[]'::jsonb;
BEGIN
    SELECT COALESCE(array_agg(s.observable_code), ARRAY[]::text[])
      INTO v_acquired
      FROM public.student_observable_state sos
      JOIN public.skills s ON s.id = sos.skill_id
     WHERE sos.student_id = p_student_id
       AND sos.is_acquis  = TRUE
       AND s.subdimension_id IN (
           SELECT id FROM public.math_competence_subdimensions
            WHERE math_competence_id = p_math_competence_id
       );

    v_a1      := ('A1' = ANY (v_acquired));
    v_b1      := ('B1' = ANY (v_acquired));
    v_b2      := ('B2' = ANY (v_acquired));
    v_c_count := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['C1','C2','C3']));
    v_d1      := ('D1' = ANY (v_acquired));
    v_d2      := ('D2' = ANY (v_acquired));

    v_satisfaisante := v_a1 AND v_b1;

    v_tres_bonne := v_satisfaisante AND v_b2 AND v_d2 AND (v_c_count >= 1);

    IF v_tres_bonne THEN
        RETURN QUERY SELECT 'tres_bonne'::text,
                            to_jsonb(v_acquired),
                            '[]'::jsonb;
        RETURN;
    END IF;

    IF v_satisfaisante THEN
        IF NOT v_b2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B2');
        END IF;
        IF NOT v_d2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'D2');
        END IF;
        IF v_c_count < 1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'C');
        END IF;
        RETURN QUERY SELECT 'satisfaisante'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Fragile : >=1 of {A1, B1, D1}
    IF v_a1 OR v_b1 OR v_d1 THEN
        -- Missing for Satisfaisante:
        IF NOT v_a1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'A1');
        END IF;
        IF NOT v_b1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B1');
        END IF;
        RETURN QUERY SELECT 'fragile'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Insuffisante : residual.
    -- Missing for Fragile : ≥ 1 of {A1, B1, D1} (cross-subdim, narrow set).
    v_missing := jsonb_build_array(
        jsonb_build_object(
            'kind', 'one_of_codes',
            'codes', jsonb_build_array('A1', 'B1', 'D1')
        )
    );

    RETURN QUERY SELECT 'insuffisante'::text,
                        to_jsonb(v_acquired),
                        v_missing;
END $$;

COMMENT ON FUNCTION public.compute_raisonner_level(uuid, uuid) IS
    'Decision 69 — conjunctive rule for Raisonner. Cœur : B2 (cas général) + D2 + C. '
    'See docs/wip/referentiel/college-competences.md §3.';


-- ============================================================================
-- 4. COMMUNIQUER
-- ============================================================================
-- Rule (cf. college-competences.md §4):
--   Très bonne  : (Satisfaisante) AND C1 AND C2 AND A1 AND A2
--   Satisfaisante : (>=1 of B: B1|B2) AND (>=1 of A: A1|A2)
--   Fragile     : NOT Satisfaisante AND ((>=1 of B) OR (>=1 of A))
--   Insuffisante: otherwise.
-- Cœur d'excellence : C1+C2 (dialogue) + A1+A2 (langage rigoureux).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_communiquer_level(
    p_student_id          uuid,
    p_math_competence_id  uuid
)
RETURNS TABLE (
    niveau                 text,
    validated_observables  jsonb,
    missing_for_next       jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_acquired       text[];
    v_a1             boolean;
    v_a2             boolean;
    v_b1             boolean;
    v_b2             boolean;
    v_c1             boolean;
    v_c2             boolean;
    v_a_count        integer;   -- A1..A2
    v_b_count        integer;   -- B1..B2
    v_satisfaisante  boolean;
    v_tres_bonne     boolean;
    v_missing        jsonb := '[]'::jsonb;
BEGIN
    SELECT COALESCE(array_agg(s.observable_code), ARRAY[]::text[])
      INTO v_acquired
      FROM public.student_observable_state sos
      JOIN public.skills s ON s.id = sos.skill_id
     WHERE sos.student_id = p_student_id
       AND sos.is_acquis  = TRUE
       AND s.subdimension_id IN (
           SELECT id FROM public.math_competence_subdimensions
            WHERE math_competence_id = p_math_competence_id
       );

    v_a1 := ('A1' = ANY (v_acquired));
    v_a2 := ('A2' = ANY (v_acquired));
    v_b1 := ('B1' = ANY (v_acquired));
    v_b2 := ('B2' = ANY (v_acquired));
    v_c1 := ('C1' = ANY (v_acquired));
    v_c2 := ('C2' = ANY (v_acquired));

    v_a_count := (CASE WHEN v_a1 THEN 1 ELSE 0 END) + (CASE WHEN v_a2 THEN 1 ELSE 0 END);
    v_b_count := (CASE WHEN v_b1 THEN 1 ELSE 0 END) + (CASE WHEN v_b2 THEN 1 ELSE 0 END);

    v_satisfaisante := (v_b_count >= 1) AND (v_a_count >= 1);

    v_tres_bonne := v_satisfaisante AND v_c1 AND v_c2 AND v_a1 AND v_a2;

    IF v_tres_bonne THEN
        RETURN QUERY SELECT 'tres_bonne'::text,
                            to_jsonb(v_acquired),
                            '[]'::jsonb;
        RETURN;
    END IF;

    IF v_satisfaisante THEN
        IF NOT v_c1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C1');
        END IF;
        IF NOT v_c2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C2');
        END IF;
        IF NOT v_a1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'A1');
        END IF;
        IF NOT v_a2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'A2');
        END IF;
        RETURN QUERY SELECT 'satisfaisante'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Fragile : >=1 of B OR >=1 of A.
    IF (v_b_count >= 1) OR (v_a_count >= 1) THEN
        -- Missing for Satisfaisante:
        IF v_b_count < 1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'B');
        END IF;
        IF v_a_count < 1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'A');
        END IF;
        RETURN QUERY SELECT 'fragile'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Insuffisante : residual.
    v_missing := jsonb_build_array(
        jsonb_build_object('kind', 'one_of_subdim', 'letter', 'A'),
        jsonb_build_object('kind', 'one_of_subdim', 'letter', 'B')
    );

    RETURN QUERY SELECT 'insuffisante'::text,
                        to_jsonb(v_acquired),
                        v_missing;
END $$;

COMMENT ON FUNCTION public.compute_communiquer_level(uuid, uuid) IS
    'Decision 69 — conjunctive rule for Communiquer. Cœur : C1+C2 (dialogue) + A1+A2 (langage). '
    'See docs/wip/referentiel/college-competences.md §4.';


-- ============================================================================
-- 5. MODÉLISER
-- ============================================================================
-- Rule (cf. college-competences.md §5):
--   Très bonne  : (Satisfaisante) AND B2 AND C1 AND (>=1 of {C2, C3})
--   Satisfaisante : A2 AND A3 AND B1
--   Fragile     : NOT Satisfaisante AND (>=1 of A: A1|A2|A3)
--   Insuffisante: otherwise.
-- Cœur d'excellence : C1 (validation) + B2 (plausibilité) + 1 parmi C2/C3 (examen critique).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_modeliser_level(
    p_student_id          uuid,
    p_math_competence_id  uuid
)
RETURNS TABLE (
    niveau                 text,
    validated_observables  jsonb,
    missing_for_next       jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_acquired       text[];
    v_a1             boolean;
    v_a2             boolean;
    v_a3             boolean;
    v_b1             boolean;
    v_b2             boolean;
    v_c1             boolean;
    v_c2             boolean;
    v_c3             boolean;
    v_a_count        integer;   -- A1..A3
    v_satisfaisante  boolean;
    v_tres_bonne     boolean;
    v_missing        jsonb := '[]'::jsonb;
BEGIN
    SELECT COALESCE(array_agg(s.observable_code), ARRAY[]::text[])
      INTO v_acquired
      FROM public.student_observable_state sos
      JOIN public.skills s ON s.id = sos.skill_id
     WHERE sos.student_id = p_student_id
       AND sos.is_acquis  = TRUE
       AND s.subdimension_id IN (
           SELECT id FROM public.math_competence_subdimensions
            WHERE math_competence_id = p_math_competence_id
       );

    v_a1 := ('A1' = ANY (v_acquired));
    v_a2 := ('A2' = ANY (v_acquired));
    v_a3 := ('A3' = ANY (v_acquired));
    v_b1 := ('B1' = ANY (v_acquired));
    v_b2 := ('B2' = ANY (v_acquired));
    v_c1 := ('C1' = ANY (v_acquired));
    v_c2 := ('C2' = ANY (v_acquired));
    v_c3 := ('C3' = ANY (v_acquired));

    v_a_count := (CASE WHEN v_a1 THEN 1 ELSE 0 END)
               + (CASE WHEN v_a2 THEN 1 ELSE 0 END)
               + (CASE WHEN v_a3 THEN 1 ELSE 0 END);

    v_satisfaisante := v_a2 AND v_a3 AND v_b1;

    v_tres_bonne := v_satisfaisante AND v_b2 AND v_c1 AND (v_c2 OR v_c3);

    IF v_tres_bonne THEN
        RETURN QUERY SELECT 'tres_bonne'::text,
                            to_jsonb(v_acquired),
                            '[]'::jsonb;
        RETURN;
    END IF;

    IF v_satisfaisante THEN
        IF NOT v_b2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B2');
        END IF;
        IF NOT v_c1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C1');
        END IF;
        IF NOT (v_c2 OR v_c3) THEN
            -- ≥ 1 among {C2, C3}
            v_missing := v_missing || jsonb_build_object(
                'kind', 'one_of_codes',
                'codes', jsonb_build_array('C2', 'C3')
            );
        END IF;
        RETURN QUERY SELECT 'satisfaisante'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Fragile : >=1 of A.
    IF v_a_count >= 1 THEN
        -- Missing for Satisfaisante:
        IF NOT v_a2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'A2');
        END IF;
        IF NOT v_a3 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'A3');
        END IF;
        IF NOT v_b1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B1');
        END IF;
        RETURN QUERY SELECT 'fragile'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Insuffisante : residual.
    v_missing := jsonb_build_array(
        jsonb_build_object('kind', 'one_of_subdim', 'letter', 'A')
    );

    RETURN QUERY SELECT 'insuffisante'::text,
                        to_jsonb(v_acquired),
                        v_missing;
END $$;

COMMENT ON FUNCTION public.compute_modeliser_level(uuid, uuid) IS
    'Decision 69 — conjunctive rule for Modéliser. Cœur : C1 (validation) + B2 + (C2|C3). '
    'See docs/wip/referentiel/college-competences.md §5.';


-- ============================================================================
-- 6. REPRÉSENTER
-- ============================================================================
-- Rule (cf. college-competences.md §6):
--   Très bonne  : (Satisfaisante) AND C1 AND C2 AND (>=1 of D: D1|D2)
--   Satisfaisante : A2 AND B1 AND B2
--   Fragile     : NOT Satisfaisante AND ((>=1 of A: A1|A2) OR (>=1 of B: B1|B2))
--   Insuffisante: otherwise.
-- Cœur d'excellence : C1+C2 (conversion + coordination) + 1 of D (déploiement stratégique).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_representer_level(
    p_student_id          uuid,
    p_math_competence_id  uuid
)
RETURNS TABLE (
    niveau                 text,
    validated_observables  jsonb,
    missing_for_next       jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_acquired       text[];
    v_a1             boolean;
    v_a2             boolean;
    v_b1             boolean;
    v_b2             boolean;
    v_c1             boolean;
    v_c2             boolean;
    v_d1             boolean;
    v_d2             boolean;
    v_a_count        integer;   -- A1..A2
    v_b_count        integer;   -- B1..B2
    v_satisfaisante  boolean;
    v_tres_bonne     boolean;
    v_missing        jsonb := '[]'::jsonb;
BEGIN
    SELECT COALESCE(array_agg(s.observable_code), ARRAY[]::text[])
      INTO v_acquired
      FROM public.student_observable_state sos
      JOIN public.skills s ON s.id = sos.skill_id
     WHERE sos.student_id = p_student_id
       AND sos.is_acquis  = TRUE
       AND s.subdimension_id IN (
           SELECT id FROM public.math_competence_subdimensions
            WHERE math_competence_id = p_math_competence_id
       );

    v_a1 := ('A1' = ANY (v_acquired));
    v_a2 := ('A2' = ANY (v_acquired));
    v_b1 := ('B1' = ANY (v_acquired));
    v_b2 := ('B2' = ANY (v_acquired));
    v_c1 := ('C1' = ANY (v_acquired));
    v_c2 := ('C2' = ANY (v_acquired));
    v_d1 := ('D1' = ANY (v_acquired));
    v_d2 := ('D2' = ANY (v_acquired));

    v_a_count := (CASE WHEN v_a1 THEN 1 ELSE 0 END) + (CASE WHEN v_a2 THEN 1 ELSE 0 END);
    v_b_count := (CASE WHEN v_b1 THEN 1 ELSE 0 END) + (CASE WHEN v_b2 THEN 1 ELSE 0 END);

    v_satisfaisante := v_a2 AND v_b1 AND v_b2;

    v_tres_bonne := v_satisfaisante AND v_c1 AND v_c2 AND (v_d1 OR v_d2);

    IF v_tres_bonne THEN
        RETURN QUERY SELECT 'tres_bonne'::text,
                            to_jsonb(v_acquired),
                            '[]'::jsonb;
        RETURN;
    END IF;

    IF v_satisfaisante THEN
        IF NOT v_c1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C1');
        END IF;
        IF NOT v_c2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C2');
        END IF;
        IF NOT (v_d1 OR v_d2) THEN
            -- ≥ 1 among {D1, D2} (only first two D matter for Représenter)
            v_missing := v_missing || jsonb_build_object(
                'kind', 'one_of_codes',
                'codes', jsonb_build_array('D1', 'D2')
            );
        END IF;
        RETURN QUERY SELECT 'satisfaisante'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Fragile : >=1 of A OR >=1 of B.
    IF (v_a_count >= 1) OR (v_b_count >= 1) THEN
        -- Missing for Satisfaisante:
        IF NOT v_a2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'A2');
        END IF;
        IF NOT v_b1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B1');
        END IF;
        IF NOT v_b2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B2');
        END IF;
        RETURN QUERY SELECT 'fragile'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Insuffisante : residual.
    v_missing := jsonb_build_array(
        jsonb_build_object('kind', 'one_of_subdim', 'letter', 'A'),
        jsonb_build_object('kind', 'one_of_subdim', 'letter', 'B')
    );

    RETURN QUERY SELECT 'insuffisante'::text,
                        to_jsonb(v_acquired),
                        v_missing;
END $$;

COMMENT ON FUNCTION public.compute_representer_level(uuid, uuid) IS
    'Decision 69 — conjunctive rule for Représenter. Cœur : C1+C2 (conversion + coordination) + 1 of D. '
    'See docs/wip/referentiel/college-competences.md §6.';


-- ============================================================================
-- DISPATCH — compute_competence_level
-- ============================================================================
-- Reads the competence code and routes to the right per-competence function.
-- Returns NULL row if the math_competence_id does not exist (defensive).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_competence_level(
    p_student_id          uuid,
    p_math_competence_id  uuid
)
RETURNS TABLE (
    niveau                 text,
    validated_observables  jsonb,
    missing_for_next       jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_code text;
BEGIN
    SELECT code INTO v_code
      FROM public.math_competences
     WHERE id = p_math_competence_id;

    IF v_code IS NULL THEN
        RETURN;  -- Empty result set; defensive — unknown competence id.
    END IF;

    CASE v_code
        WHEN 'chercher'    THEN RETURN QUERY SELECT * FROM public.compute_chercher_level   (p_student_id, p_math_competence_id);
        WHEN 'calculer'    THEN RETURN QUERY SELECT * FROM public.compute_calculer_level   (p_student_id, p_math_competence_id);
        WHEN 'raisonner'   THEN RETURN QUERY SELECT * FROM public.compute_raisonner_level  (p_student_id, p_math_competence_id);
        WHEN 'communiquer' THEN RETURN QUERY SELECT * FROM public.compute_communiquer_level(p_student_id, p_math_competence_id);
        WHEN 'modeliser'   THEN RETURN QUERY SELECT * FROM public.compute_modeliser_level  (p_student_id, p_math_competence_id);
        WHEN 'representer' THEN RETURN QUERY SELECT * FROM public.compute_representer_level(p_student_id, p_math_competence_id);
        ELSE
            -- Unknown competence code; should never happen given the CHECK on math_competences.code
            RETURN;
    END CASE;
END $$;

COMMENT ON FUNCTION public.compute_competence_level(uuid, uuid) IS
    'Decision 69 — dispatch over the 6 conjunctive rule functions, keyed by math_competences.code.';


-- ============================================================================
-- CACHE UPDATE — update_student_skill_state_a (Family A)
-- ============================================================================
-- Recomputes the cache row (student_id, skill_id) entirely from skill_attempts.
--
-- Inputs read (skill_attempts filtered on student_id + skill_id, all rows):
--   * total_successes              = COUNT WHERE success = true
--   * distinct_template_successes  = COUNT(DISTINCT template_id) WHERE success = true
--   * last_success_at              = MAX(created_at) WHERE success = true
--   * last_attempt_at              = MAX(created_at)
--   * is_acquired                  : per knowledge_type rule (§6.1)
--   * needs_remediation            : NOT is_acquired AND failures_in_recent_window >= 2 (decision 64)
--
-- Recent window (decision 64):
--   * capacite_attendue : last 3 attempts
--   * automatisme       : last 5 attempts
--
-- Acquisition rule (§6.1):
--   * capacite_attendue : distinct_template_successes >= 2
--                         AND no failure in the last 3 attempts
--   * automatisme       : total_successes >= 5
--                         AND >= 3 successes in the last 5 attempts
--
-- UPSERTs into student_skill_state_a. If no attempt exists for this pair,
-- the row is deleted (clean state, idempotent).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_student_skill_state_a(
    p_student_id uuid,
    p_skill_id   uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_knowledge_type   text;
    v_window           integer;        -- 3 or 5 depending on knowledge_type
    v_total_attempts   integer;
    v_total_successes  integer;
    v_distinct_tpl     integer;
    v_last_success_at  timestamptz;
    v_last_attempt_at  timestamptz;
    v_recent_successes integer;        -- successes among last N attempts
    v_recent_failures  integer;        -- failures among last N attempts
    v_is_acquired      boolean;
    v_needs_remed      boolean;
BEGIN
    -- Resolve knowledge_type for this skill. We only handle family knowledge
    -- here; if called on a non-knowledge skill, exit silently (defensive).
    SELECT s.knowledge_type
      INTO v_knowledge_type
      FROM public.skills s
     WHERE s.id = p_skill_id
       AND s.family = 'knowledge';

    IF v_knowledge_type IS NULL THEN
        -- Either the skill does not exist, or it belongs to family 'competence'
        -- (which has knowledge_type = NULL by construction — chk_skill_competence_code).
        RETURN;
    END IF;

    v_window := CASE v_knowledge_type
                    WHEN 'capacite_attendue' THEN 3
                    WHEN 'automatisme'       THEN 5
                END;

    -- Aggregate over ALL skill_attempts for this (student, skill) pair (family knowledge rows
    -- only — Family B rows have success IS NULL so they would be excluded anyway, but we
    -- also guard via task_id IS NULL to be explicit).
    SELECT COUNT(*)                                              FILTER (WHERE TRUE),
           COUNT(*)                                              FILTER (WHERE success = TRUE),
           COUNT(DISTINCT template_id)                           FILTER (WHERE success = TRUE),
           MAX(created_at)                                       FILTER (WHERE success = TRUE),
           MAX(created_at)
      INTO v_total_attempts,
           v_total_successes,
           v_distinct_tpl,
           v_last_success_at,
           v_last_attempt_at
      FROM public.skill_attempts
     WHERE student_id = p_student_id
       AND skill_id   = p_skill_id
       AND success IS NOT NULL;             -- guard : only family-knowledge rows

    -- If there is no attempt, remove the cache row (keeps the table clean).
    IF v_total_attempts = 0 THEN
        DELETE FROM public.student_skill_state_a
         WHERE student_id = p_student_id
           AND skill_id   = p_skill_id;
        RETURN;
    END IF;

    -- Recent window: last `v_window` attempts ordered by created_at DESC.
    -- Count successes/failures within that subset.
    WITH recent AS (
        SELECT success
          FROM public.skill_attempts
         WHERE student_id = p_student_id
           AND skill_id   = p_skill_id
           AND success IS NOT NULL
         ORDER BY created_at DESC
         LIMIT v_window
    )
    SELECT COUNT(*) FILTER (WHERE success = TRUE),
           COUNT(*) FILTER (WHERE success = FALSE)
      INTO v_recent_successes,
           v_recent_failures
      FROM recent;

    -- Acquisition rule (§6.1, decision 58 — with_help ignored).
    IF v_knowledge_type = 'capacite_attendue' THEN
        v_is_acquired := (v_distinct_tpl >= 2)
                     AND (v_recent_failures = 0);
    ELSE
        -- 'automatisme'
        v_is_acquired := (v_total_successes >= 5)
                     AND (v_recent_successes >= 3);
    END IF;

    -- needs_remediation (decision 64 — minimum 2 failures in the recent window).
    -- Applies only when the capacity is NOT acquired (an acquired capacity that
    -- recently failed would still be marked as needs_remediation if the rule
    -- now reports false; that's coherent — if it's not acquired anymore, the
    -- recent failures explain why and warrant 🆘).
    v_needs_remed := (NOT v_is_acquired) AND (v_recent_failures >= 2);

    -- UPSERT the cache row.
    INSERT INTO public.student_skill_state_a (
        student_id,
        skill_id,
        is_acquired,
        total_successes,
        distinct_template_successes,
        last_success_at,
        last_attempt_at,
        needs_remediation,
        updated_at
    ) VALUES (
        p_student_id,
        p_skill_id,
        v_is_acquired,
        v_total_successes,
        v_distinct_tpl,
        v_last_success_at,
        v_last_attempt_at,
        v_needs_remed,
        NOW()
    )
    ON CONFLICT (student_id, skill_id) DO UPDATE
        SET is_acquired                 = EXCLUDED.is_acquired,
            total_successes             = EXCLUDED.total_successes,
            distinct_template_successes = EXCLUDED.distinct_template_successes,
            last_success_at             = EXCLUDED.last_success_at,
            last_attempt_at             = EXCLUDED.last_attempt_at,
            needs_remediation           = EXCLUDED.needs_remediation,
            updated_at                  = NOW();
END $$;

COMMENT ON FUNCTION public.update_student_skill_state_a(uuid, uuid) IS
    'Recomputes student_skill_state_a (Family A) from skill_attempts. '
    'Window 3 for capacite_attendue, 5 for automatisme. Decisions 58 (with_help ignored), '
    '60 (distinct_template_successes), 62 (no needs_reinforcement), 64 (>=2 failures), '
    '70 (no to_review — VIEW handles it).';


-- ============================================================================
-- CACHE UPDATE — update_student_observable_state (Family B step 1)
-- ============================================================================
-- Recomputes the per-observable consolidation (§6.1bis):
--   * count_plus      = COUNT WHERE code = 'plus'
--   * count_minus     = COUNT WHERE code = 'minus'
--   * is_acquis       = (count_plus >= 2) AND (count_plus > count_minus)
--   * last_attempt_at = MAX(created_at)
--
-- After updating the observable, cascades to update_student_competence_level
-- for the parent math competence (Family B step 2).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_student_observable_state(
    p_student_id uuid,
    p_skill_id   uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_math_competence_id  uuid;
    v_total_attempts      integer;
    v_count_plus          integer;
    v_count_minus         integer;
    v_last_attempt_at     timestamptz;
    v_is_acquis           boolean;
BEGIN
    -- Resolve the parent math competence (via the subdimension) and guard
    -- that the skill is in family 'competence'.
    SELECT mcs.math_competence_id
      INTO v_math_competence_id
      FROM public.skills s
      JOIN public.math_competence_subdimensions mcs ON mcs.id = s.subdimension_id
     WHERE s.id = p_skill_id
       AND s.family = 'competence';

    IF v_math_competence_id IS NULL THEN
        -- Skill does not exist or is not Family B. Defensive: do nothing.
        RETURN;
    END IF;

    -- Aggregate plus/minus counts over all Family B attempts for this pair.
    SELECT COUNT(*)                            FILTER (WHERE TRUE),
           COUNT(*)                            FILTER (WHERE code = 'plus'),
           COUNT(*)                            FILTER (WHERE code = 'minus'),
           MAX(created_at)
      INTO v_total_attempts,
           v_count_plus,
           v_count_minus,
           v_last_attempt_at
      FROM public.skill_attempts
     WHERE student_id = p_student_id
       AND skill_id   = p_skill_id
       AND code IS NOT NULL;                   -- guard : Family B rows only

    -- Consolidation rule (§6.1bis).
    v_is_acquis := (v_count_plus >= 2) AND (v_count_plus > v_count_minus);

    IF v_total_attempts = 0 THEN
        -- No attempts left: clean the cache row.
        DELETE FROM public.student_observable_state
         WHERE student_id = p_student_id
           AND skill_id   = p_skill_id;
    ELSE
        INSERT INTO public.student_observable_state (
            student_id,
            skill_id,
            count_plus,
            count_minus,
            is_acquis,
            last_attempt_at,
            updated_at
        ) VALUES (
            p_student_id,
            p_skill_id,
            v_count_plus,
            v_count_minus,
            v_is_acquis,
            v_last_attempt_at,
            NOW()
        )
        ON CONFLICT (student_id, skill_id) DO UPDATE
            SET count_plus      = EXCLUDED.count_plus,
                count_minus     = EXCLUDED.count_minus,
                is_acquis       = EXCLUDED.is_acquis,
                last_attempt_at = EXCLUDED.last_attempt_at,
                updated_at      = NOW();
    END IF;

    -- Cascade : recompute the parent competence verdict.
    PERFORM public.update_student_competence_level(p_student_id, v_math_competence_id);
END $$;

COMMENT ON FUNCTION public.update_student_observable_state(uuid, uuid) IS
    'Recomputes student_observable_state (Family B observable consolidation). '
    'Rule (§6.1bis): is_acquis ssi count_plus >= 2 AND count_plus > count_minus. '
    'Cascades to update_student_competence_level for the parent math_competence.';


-- ============================================================================
-- CACHE UPDATE — update_student_competence_level (Family B step 2)
-- ============================================================================
-- Recomputes the competence verdict (4 socle levels). Applies the conjunctive
-- rule via compute_competence_level, plus the §6.4 global safeguards:
--
--   * task_count = COUNT(DISTINCT task_id) over skill_attempts on observables
--                  of this competence for this student (in-perimeter tasks).
--
--   * Hard cap: if task_count < 2 -> verdict capped at 'insuffisante'
--               (a level cannot be validated on a single task).
--
--   * Cap on excellence: if task_count < 3 AND verdict = 'tres_bonne'
--                        -> capped to 'satisfaisante'
--                        (Très bonne maîtrise requires >= 3 observed tasks).
--
-- Both caps are conservative: in doubt, the system never grants a higher level
-- than the data supports. UI can surface the cap via a "manual confirmation
-- required" hint by comparing task_count to the thresholds.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_student_competence_level(
    p_student_id          uuid,
    p_math_competence_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_niveau                 text;
    v_validated_observables  jsonb;
    v_missing_for_next       jsonb;
    v_task_count             integer;
BEGIN
    -- Compute the raw conjunctive verdict.
    SELECT niveau, validated_observables, missing_for_next
      INTO v_niveau, v_validated_observables, v_missing_for_next
      FROM public.compute_competence_level(p_student_id, p_math_competence_id);

    -- Unknown competence id: nothing to upsert.
    IF v_niveau IS NULL THEN
        RETURN;
    END IF;

    -- §6.4 safeguard — count distinct in-perimeter tasks observed for this
    -- student on observables belonging to this competence.
    SELECT COUNT(DISTINCT sa.task_id)
      INTO v_task_count
      FROM public.skill_attempts sa
      JOIN public.skills s ON s.id = sa.skill_id
      JOIN public.math_competence_subdimensions mcs ON mcs.id = s.subdimension_id
     WHERE sa.student_id = p_student_id
       AND sa.task_id   IS NOT NULL
       AND mcs.math_competence_id = p_math_competence_id;

    -- §6.4 caps:
    --   < 2 tasks  -> insuffisante (cannot validate any observable on a single task)
    --   < 3 tasks  -> cap Très bonne to Satisfaisante
    --
    -- Guards are emitted as typed objects { kind: 'guard', name: ... } to match
    -- the missing_for_next contract (refactor 2026-06-09).
    IF v_task_count < 2 THEN
        v_niveau := 'insuffisante';
        -- Reset validated_observables (the consolidation cannot have produced any
        -- acquired observable from < 2 tasks anyway — defensive consistency).
        v_validated_observables := '[]'::jsonb;
        v_missing_for_next      := jsonb_build_array(
            jsonb_build_object('kind', 'guard', 'name', 'needs_more_tasks')
        );
    ELSIF v_task_count < 3 AND v_niveau = 'tres_bonne' THEN
        v_niveau := 'satisfaisante';
        -- Signal that a 3rd task would unlock the upgrade.
        v_missing_for_next := jsonb_build_array(
            jsonb_build_object('kind', 'guard', 'name', 'confirm_with_third_task')
        );
    END IF;

    -- UPSERT.
    INSERT INTO public.student_competence_level (
        student_id,
        math_competence_id,
        niveau,
        validated_observables,
        missing_for_next,
        task_count,
        last_recalc_at
    ) VALUES (
        p_student_id,
        p_math_competence_id,
        v_niveau,
        COALESCE(v_validated_observables, '[]'::jsonb),
        COALESCE(v_missing_for_next,      '[]'::jsonb),
        v_task_count,
        NOW()
    )
    ON CONFLICT (student_id, math_competence_id) DO UPDATE
        SET niveau                = EXCLUDED.niveau,
            validated_observables = EXCLUDED.validated_observables,
            missing_for_next      = EXCLUDED.missing_for_next,
            task_count            = EXCLUDED.task_count,
            last_recalc_at        = NOW();
END $$;

COMMENT ON FUNCTION public.update_student_competence_level(uuid, uuid) IS
    'Recomputes student_competence_level: applies compute_competence_level then '
    '§6.4 safeguards (task_count < 2 → insuffisante ; task_count < 3 caps Très bonne '
    'to Satisfaisante). Called by the cascade from update_student_observable_state.';


-- ============================================================================
-- TRIGGER FUNCTION — skill_attempts_after_insert
-- ============================================================================
-- Dispatch the just-inserted attempt to the correct cache-update path.
-- The dual-regime CHECK on skill_attempts (chk_attempt_family_regime) already
-- guarantees:
--   * Family knowledge row: NEW.success IS NOT NULL AND NEW.code IS NULL
--   * Family competence row: NEW.success IS NULL     AND NEW.code IS NOT NULL
-- So a simple NEW.success-vs-NEW.code test routes correctly.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.skill_attempts_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.success IS NOT NULL THEN
        -- Family knowledge attempt.
        PERFORM public.update_student_skill_state_a(NEW.student_id, NEW.skill_id);
    ELSIF NEW.code IS NOT NULL THEN
        -- Family competence attempt. update_student_observable_state cascades
        -- to update_student_competence_level itself.
        PERFORM public.update_student_observable_state(NEW.student_id, NEW.skill_id);
    END IF;
    -- Otherwise (should be unreachable thanks to chk_attempt_family_regime),
    -- silently no-op.
    RETURN NEW;
END $$;

COMMENT ON FUNCTION public.skill_attempts_after_insert() IS
    'Trigger function dispatching INSERTed skill_attempts to the right cache-update '
    'path (Family A → update_student_skill_state_a ; Family B → '
    'update_student_observable_state which cascades to update_student_competence_level).';


-- ============================================================================
-- TRIGGER — AFTER INSERT ON skill_attempts
-- ============================================================================
DROP TRIGGER IF EXISTS trg_skill_attempts_after_insert ON public.skill_attempts;

CREATE TRIGGER trg_skill_attempts_after_insert
    AFTER INSERT ON public.skill_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.skill_attempts_after_insert();

COMMENT ON TRIGGER trg_skill_attempts_after_insert ON public.skill_attempts IS
    'Recomputes the relevant cache row(s) on every new skill_attempts insertion. '
    'Family A → student_skill_state_a ; Family B → student_observable_state + '
    'student_competence_level (cascade). SECURITY DEFINER on the called functions '
    'lets the trigger write to caches that have no INSERT/UPDATE RLS policy (decision 72).';


-- ============================================================================
-- GRANTS
-- ============================================================================
-- The 6 compute_*_level functions, the dispatcher and the update_student_*
-- functions are SECURITY DEFINER. They are called primarily by the trigger,
-- but we also grant EXECUTE to authenticated so the application can call them
-- on demand (e.g. manual recompute action by a teacher). Anonymous users have
-- no business calling them — no GRANT to anon.

GRANT EXECUTE ON FUNCTION public.compute_chercher_level(uuid, uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_calculer_level(uuid, uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_raisonner_level(uuid, uuid)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_communiquer_level(uuid, uuid)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_modeliser_level(uuid, uuid)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_representer_level(uuid, uuid)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_competence_level(uuid, uuid)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_student_skill_state_a(uuid, uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_student_observable_state(uuid, uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_student_competence_level(uuid, uuid)   TO authenticated;

-- Trigger function is invoked by Postgres itself; no GRANT needed beyond
-- the default for SECURITY DEFINER functions.
