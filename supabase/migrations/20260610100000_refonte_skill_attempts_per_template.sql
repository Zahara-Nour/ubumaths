-- ============================================================================
-- Migration: Refonte skill_attempts per-template + branchement FSRS
-- Date:      2026-06-10
-- Plan:      ~/.claude/plans/immutable-painting-cake.md (Phase 1, lot L1)
-- Spec TDD:  docs/wip/srs-fsrs-spec-tdd.md
-- Cible:     docs/wip/srs-fsrs-architecture-cible.md
-- Depends on: 20260609120000_competence_referentiel_schema.sql
--             20260609120001_competence_referentiel_functions.sql
-- ============================================================================
-- Refonte structurelle de skill_attempts pour devenir l'unique source de vérité
-- des faits, alimentée par les 2 mondes (Quiz interactif Monde 1 + SRS Monde 2).
--
-- Changements de schéma famille A :
--   * skill_id devient NULLABLE (la liaison vers les capacités passe désormais
--     par la M2M question_template_skills à la lecture).
--   * 1 attempt famille A = 1 row (au lieu de N rows = nb skills tagués).
--   * Ajout colonne grade SMALLINT NULL (1=Again, 2=Hard, 3=Good, 4=Easy).
--   * Ajout valeur 'srs' dans chk_attempt_source_values.
--   * Refonte chk_attempt_family_regime pour le nouveau régime A.
--   * Suppression chk_attempt_knowledge_template (devient implicite).
--
-- Famille B totalement inchangée (régime skill_id + task_id + code).
--
-- VIEW student_skill_state_a_v : suppression de la colonne to_review.
-- Remplacée par le badge FSRS calculé à la lecture (Phase 3).
--
-- Trigger skill_attempts_after_insert : refonte pour boucler sur les skills
-- tagués via question_template_skills (Famille A) ; Famille B inchangé.
--
-- Fonction update_student_skill_state_a : requête refondue pour joindre
-- question_template_skills (puisque skill_id est NULL dans les rows A).
--
-- Migration de données : déduplication des rows Famille A existantes par
-- (student_id, template_id, created_at), puis skill_id = NULL. Recompute
-- des caches student_skill_state_a.
--
-- Politique RLS : la policy student insert est étendue pour accepter
-- source='srs' et skill_id NULL en régime A.
-- ============================================================================


-- ============================================================================
-- ÉTAPE 1 — Drop temporaire du trigger pendant la migration
-- ============================================================================

DROP TRIGGER IF EXISTS trg_skill_attempts_after_insert ON public.skill_attempts;


-- ============================================================================
-- ÉTAPE 2 — Suppression des CHECK constraints à refondre
-- ============================================================================

ALTER TABLE public.skill_attempts
    DROP CONSTRAINT IF EXISTS chk_attempt_family_regime,
    DROP CONSTRAINT IF EXISTS chk_attempt_knowledge_template,
    DROP CONSTRAINT IF EXISTS chk_attempt_source_values;


-- ============================================================================
-- ÉTAPE 3 — Ajout colonne grade + relaxation NOT NULL sur skill_id
-- ============================================================================

ALTER TABLE public.skill_attempts
    ALTER COLUMN skill_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS grade SMALLINT;

COMMENT ON COLUMN public.skill_attempts.skill_id IS
    'Famille B uniquement (observable). NULL pour les rows Famille A : la liaison '
    'vers les capacités passe par question_template_skills à la lecture.';

COMMENT ON COLUMN public.skill_attempts.grade IS
    'Famille A uniquement. Grade FSRS auto-évalué (1=Again, 2=Hard, 3=Good, 4=Easy). '
    'Pour les attempts Monde 1 (quiz interactif), dérivé de success : '
    'success=true → grade=3 ; success=false → grade=1. NULL pour Famille B et '
    'pour les attempts historiques (cold start, décision 8 du chantier 2026-06).';


-- ============================================================================
-- ÉTAPE 4 — Déduplication des rows Famille A existantes
-- ============================================================================
-- Le régime ancien dupliquait 1 attempt en N rows (1 par skill tagué). Le nouveau
-- régime est per-template. On déduplique par (student_id, template_id, created_at).
-- En prod (2026-06-10), il y a ~0-3 rows famille A — opération sans risque.
-- ============================================================================

-- Mise à NULL du skill_id pour les rows famille A (régime ancien : skill_id était NOT NULL)
UPDATE public.skill_attempts
   SET skill_id = NULL
 WHERE template_id IS NOT NULL
   AND success IS NOT NULL;

-- Déduplication : conserve la row d'id minimal par (student, template, created_at)
DELETE FROM public.skill_attempts a
 USING public.skill_attempts b
 WHERE a.id > b.id
   AND a.student_id = b.student_id
   AND a.template_id = b.template_id
   AND a.created_at = b.created_at
   AND a.template_id IS NOT NULL;


-- ============================================================================
-- ÉTAPE 5 — Recréation des CHECK constraints (nouveau régime)
-- ============================================================================

ALTER TABLE public.skill_attempts
    ADD CONSTRAINT chk_attempt_source_values CHECK (
        source IN ('auto', 'srs', 'teacher', 'student_self')
    ),
    ADD CONSTRAINT chk_attempt_grade_range CHECK (
        grade IS NULL OR grade BETWEEN 1 AND 4
    ),
    ADD CONSTRAINT chk_attempt_family_regime CHECK (
        -- Régime Famille A : template_id NOT NULL, success NOT NULL, skill_id NULL, code/task NULL
        (template_id IS NOT NULL
         AND success IS NOT NULL
         AND skill_id IS NULL
         AND code IS NULL
         AND task_id IS NULL)
        OR
        -- Régime Famille B : skill_id NOT NULL, code NOT NULL, task_id NOT NULL, template_id NULL, success NULL
        (skill_id IS NOT NULL
         AND code IS NOT NULL
         AND task_id IS NOT NULL
         AND template_id IS NULL
         AND success IS NULL)
    );

COMMENT ON CONSTRAINT chk_attempt_source_values ON public.skill_attempts IS
    'Source de l''attempt. ''srs'' ajouté en 2026-06-10 pour les attempts générés '
    'par les reviews SRS (Monde 2).';

COMMENT ON CONSTRAINT chk_attempt_family_regime ON public.skill_attempts IS
    'XOR strict entre Famille A (per-template) et Famille B (per-skill+task). '
    'Refonte 2026-06-10 : Famille A devient per-template ; skill_id NULL en A.';


-- ============================================================================
-- ÉTAPE 6 — Refonte update_student_skill_state_a (query via M2M)
-- ============================================================================
-- L'ancienne fonction lisait skill_attempts WHERE student_id=$1 AND skill_id=$2.
-- Avec le nouveau régime, skill_id est NULL pour Famille A. On joint donc via
-- question_template_skills pour retrouver les attempts d'une capacité.
--
-- Logique métier (§6.1) inchangée :
--   * window : 3 (capacite_attendue) ou 5 (automatisme)
--   * is_acquired : règle conjonctive par knowledge_type
--   * needs_remediation : NOT is_acquired AND recent_failures >= 2
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
    v_window           integer;
    v_total_attempts   integer;
    v_total_successes  integer;
    v_distinct_tpl     integer;
    v_last_success_at  timestamptz;
    v_last_attempt_at  timestamptz;
    v_recent_successes integer;
    v_recent_failures  integer;
    v_is_acquired      boolean;
    v_needs_remed      boolean;
BEGIN
    SELECT s.knowledge_type
      INTO v_knowledge_type
      FROM public.skills s
     WHERE s.id = p_skill_id
       AND s.family = 'knowledge';

    IF v_knowledge_type IS NULL THEN
        RETURN;
    END IF;

    v_window := CASE v_knowledge_type
                    WHEN 'capacite_attendue' THEN 3
                    WHEN 'automatisme'       THEN 5
                END;

    -- Refonte 2026-06-10 : on retrouve les attempts via question_template_skills
    -- au lieu de filtrer sur skill_id (qui est NULL en régime A).
    SELECT COUNT(*)                            FILTER (WHERE TRUE),
           COUNT(*)                            FILTER (WHERE sa.success = TRUE),
           COUNT(DISTINCT sa.template_id)      FILTER (WHERE sa.success = TRUE),
           MAX(sa.created_at)                  FILTER (WHERE sa.success = TRUE),
           MAX(sa.created_at)
      INTO v_total_attempts,
           v_total_successes,
           v_distinct_tpl,
           v_last_success_at,
           v_last_attempt_at
      FROM public.skill_attempts sa
      JOIN public.question_template_skills qts
        ON qts.template_id = sa.template_id
     WHERE sa.student_id = p_student_id
       AND qts.skill_id  = p_skill_id
       AND sa.template_id IS NOT NULL    -- guard : Famille A only
       AND sa.success IS NOT NULL;        -- guard : Famille A only

    IF v_total_attempts = 0 THEN
        DELETE FROM public.student_skill_state_a
         WHERE student_id = p_student_id
           AND skill_id   = p_skill_id;
        RETURN;
    END IF;

    -- Recent window : last `v_window` attempts ordered by created_at DESC.
    WITH recent AS (
        SELECT sa.success
          FROM public.skill_attempts sa
          JOIN public.question_template_skills qts
            ON qts.template_id = sa.template_id
         WHERE sa.student_id = p_student_id
           AND qts.skill_id  = p_skill_id
           AND sa.template_id IS NOT NULL
           AND sa.success IS NOT NULL
         ORDER BY sa.created_at DESC
         LIMIT v_window
    )
    SELECT COUNT(*) FILTER (WHERE success = TRUE),
           COUNT(*) FILTER (WHERE success = FALSE)
      INTO v_recent_successes,
           v_recent_failures
      FROM recent;

    -- Règles §6.1 (inchangées)
    IF v_knowledge_type = 'capacite_attendue' THEN
        v_is_acquired := (v_distinct_tpl >= 2)
                     AND (v_recent_failures = 0);
    ELSE
        v_is_acquired := (v_total_successes >= 5)
                     AND (v_recent_successes >= 3);
    END IF;

    v_needs_remed := (NOT v_is_acquired) AND (v_recent_failures >= 2);

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
    'Recomputes student_skill_state_a depuis skill_attempts. '
    'Refonte 2026-06-10 : jointure via question_template_skills (skill_id NULL en régime A).';


-- ============================================================================
-- ÉTAPE 7 — Refonte skill_attempts_after_insert (boucle sur skills tagués)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.skill_attempts_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_skill_id uuid;
BEGIN
    -- Famille A : boucle sur skills famille knowledge tagués par le template
    IF NEW.template_id IS NOT NULL AND NEW.success IS NOT NULL THEN
        FOR v_skill_id IN
            SELECT qts.skill_id
              FROM public.question_template_skills qts
              JOIN public.skills s ON s.id = qts.skill_id
             WHERE qts.template_id = NEW.template_id
               AND s.family = 'knowledge'
        LOOP
            PERFORM public.update_student_skill_state_a(NEW.student_id, v_skill_id);
        END LOOP;
    -- Famille B : inchangé
    ELSIF NEW.skill_id IS NOT NULL AND NEW.code IS NOT NULL THEN
        PERFORM public.update_student_observable_state(NEW.student_id, NEW.skill_id);
    END IF;

    RETURN NEW;
END $$;

COMMENT ON FUNCTION public.skill_attempts_after_insert() IS
    'Trigger : route les attempts vers le cache approprié. '
    'Refonte 2026-06-10 : Famille A boucle sur les skills tagués via question_template_skills.';

-- Re-création du trigger
CREATE TRIGGER trg_skill_attempts_after_insert
    AFTER INSERT ON public.skill_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.skill_attempts_after_insert();

COMMENT ON TRIGGER trg_skill_attempts_after_insert ON public.skill_attempts IS
    'Recompute le cache Famille A (boucle sur skills tagués) ou Famille B (skill direct) '
    'à chaque INSERT. Refonte 2026-06-10.';


-- ============================================================================
-- ÉTAPE 8 — VIEW student_skill_state_a_v : suppression de to_review
-- ============================================================================
-- to_review était calculé comme : is_acquired AND last_success_at < NOW() - 30j.
-- Remplacé par un badge FSRS-agrégé calculé à la lecture côté serveur (Phase 3).
-- ============================================================================

DROP VIEW IF EXISTS public.student_skill_state_a_v;

CREATE VIEW public.student_skill_state_a_v AS
SELECT
    s.student_id,
    s.skill_id,
    s.is_acquired,
    s.total_successes,
    s.distinct_template_successes,
    s.last_success_at,
    s.last_attempt_at,
    s.needs_remediation,
    s.updated_at
FROM public.student_skill_state_a s;

ALTER VIEW public.student_skill_state_a_v SET (security_invoker = on);

COMMENT ON VIEW public.student_skill_state_a_v IS
    'Vue plate de student_skill_state_a (sans to_review). '
    'Refonte 2026-06-10 : to_review supprimé, remplacé par badge FSRS-agrégé calculé '
    'à la lecture côté serveur via srs_card_stats. security_invoker = on (RLS de la table sous-jacente).';

GRANT SELECT ON public.student_skill_state_a_v TO authenticated;


-- ============================================================================
-- ÉTAPE 9 — Refonte policy student INSERT (autorise source='srs')
-- ============================================================================

DROP POLICY IF EXISTS "skill_attempts_insert_own_student" ON public.skill_attempts;

CREATE POLICY "skill_attempts_insert_own_student"
    ON public.skill_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND source IN ('auto', 'srs', 'student_self')
        AND code IS NULL          -- famille B interdite en self-insert élève
        AND task_id IS NULL
    );

COMMENT ON POLICY "skill_attempts_insert_own_student" ON public.skill_attempts IS
    'L''élève peut insérer ses propres attempts en source auto/srs/student_self. '
    'Famille B reste réservée au prof (skill_attempts_insert_teacher). '
    'Refonte 2026-06-10 : ''srs'' ajouté.';


-- ============================================================================
-- ÉTAPE 10 — Recompute des caches student_skill_state_a après migration
-- ============================================================================
-- Les rows famille A déjà existantes ne firent pas le nouveau trigger
-- (puisqu'elles existaient avant). On recompute manuellement les caches pour
-- toutes les paires (student, skill) impactées.
-- ============================================================================

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT DISTINCT sa.student_id, qts.skill_id
          FROM public.skill_attempts sa
          JOIN public.question_template_skills qts ON qts.template_id = sa.template_id
          JOIN public.skills s ON s.id = qts.skill_id
         WHERE sa.template_id IS NOT NULL
           AND sa.success IS NOT NULL
           AND s.family = 'knowledge'
    LOOP
        PERFORM public.update_student_skill_state_a(r.student_id, r.skill_id);
    END LOOP;
END $$;


-- ============================================================================
-- ÉTAPE 11 — Indexes
-- ============================================================================
-- Les indexes existants restent valides. On ajoute :
--   * Index sur (student_id, template_id, created_at DESC) pour FSRS lookups
--     et pour update_student_skill_state_a refondu.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_skill_attempts_student_template_time
    ON public.skill_attempts(student_id, template_id, created_at DESC)
    WHERE template_id IS NOT NULL;


-- ============================================================================
-- FIN
-- ============================================================================
