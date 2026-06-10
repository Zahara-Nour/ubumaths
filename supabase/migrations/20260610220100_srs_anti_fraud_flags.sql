-- ============================================================================
-- Migration: srs_anti_fraud_flags table + RLS + indexes
-- Date:      2026-06-10
-- Plan:      ~/.claude/plans/immutable-painting-cake.md (Phase 1, lot L1.1)
-- Spec TDD:  docs/wip/srs-anti-fraud-spec-tdd.md (§B1-B12)
-- Depends on: 080_create_srs_tables.sql, 001_initial_schema.sql,
--             20260609120000_competence_referentiel_schema.sql (skills),
--             019_fix_class_members_rls.sql (is_class_teacher),
--             20260610220000_app_config_table.sql (app_is_anti_fraud_enabled)
-- ============================================================================
-- Stocke les drapeaux de suspicion de triche SRS générés par le job
-- `runAntiFraudJob` (TS, Phase 2).
--
-- Granularité = (élève × capacité × type signal). Un même élève peut avoir
-- plusieurs flags actifs sur des capacités/types différents.
--
-- Lifecycle :
--   - INSERT par le runner (TS serveur, service_role contexte ou admin context).
--     Les profs et élèves ne peuvent jamais INSERT (RLS).
--   - UPDATE limité aux colonnes resolved / resolved_by / resolved_at par
--     les profs propriétaires de la classe de l'élève.
--   - Pas de DELETE V1 (soft delete via `resolved=true`).
--
-- Cross-class : un flag concerne (student, capacity), pas (student, capacity, class).
-- Si l'élève est dans 2 classes, les 2 profs voient le même flag.
-- ============================================================================


-- ============================================================================
-- 1. Table srs_anti_fraud_flags
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.srs_anti_fraud_flags (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    capacity_skill_id   UUID REFERENCES public.skills(id) ON DELETE CASCADE,  -- NULL pour flags globaux (futurs)

    flag_type           TEXT NOT NULL,
    severity            SMALLINT NOT NULL,
    score               REAL NOT NULL,

    window_start        TIMESTAMPTZ NOT NULL,
    window_end          TIMESTAMPTZ NOT NULL,
    sample_size         INTEGER NOT NULL,

    details             JSONB NOT NULL DEFAULT '{}'::jsonb,

    resolved            BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at         TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_srs_anti_fraud_severity CHECK (severity BETWEEN 1 AND 5),
    CONSTRAINT chk_srs_anti_fraud_score CHECK (score >= 0 AND score <= 1),
    CONSTRAINT chk_srs_anti_fraud_flag_type CHECK (flag_type IN (
        'high_easy_ratio',
        'no_again',
        'fast_timeSpent',
        'burst',
        'srs_vs_quiz_gap',
        'composite'
    )),
    CONSTRAINT chk_srs_anti_fraud_window CHECK (window_end > window_start),
    CONSTRAINT chk_srs_anti_fraud_sample_positive CHECK (sample_size >= 0),
    CONSTRAINT chk_srs_anti_fraud_resolved_coherent CHECK (
        -- Si resolved=true alors resolved_by ET resolved_at doivent être set ;
        -- si resolved=false alors les deux doivent être NULL.
        (resolved = TRUE AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
        OR
        (resolved = FALSE AND resolved_by IS NULL AND resolved_at IS NULL)
    )
);

COMMENT ON TABLE public.srs_anti_fraud_flags IS
    'Drapeaux de suspicion de triche SRS générés par le job runAntiFraudJob. '
    'Granularité (élève × capacité × type). Soft delete via resolved=true.';

COMMENT ON COLUMN public.srs_anti_fraud_flags.capacity_skill_id IS
    'FK vers skills (famille A). NULL réservé à des flags globaux futurs (V3).';

COMMENT ON COLUMN public.srs_anti_fraud_flags.flag_type IS
    'high_easy_ratio | no_again | fast_timeSpent | burst | srs_vs_quiz_gap | composite';

COMMENT ON COLUMN public.srs_anti_fraud_flags.severity IS
    '1=info / 2=low / 3=medium / 4=high / 5=critical. Détermine le badge UI prof.';

COMMENT ON COLUMN public.srs_anti_fraud_flags.score IS
    'Score 0..1 dérivé du détecteur. Sert au tri DESC dans la liste prof.';

COMMENT ON COLUMN public.srs_anti_fraud_flags.details IS
    'Breakdown JSONB du signal (ratio, médiane, listes des signaux composite, etc.). '
    'Affiché dans le FlagDetailsDialog côté UI.';


-- ============================================================================
-- 2. Indexes
-- ============================================================================

-- Index principal : lecture prof "flags non-résolus de mes élèves récents".
CREATE INDEX IF NOT EXISTS idx_srs_anti_fraud_student_resolved_created
    ON public.srs_anti_fraud_flags (student_id, resolved, created_at DESC);

-- Index partiel pour le job (dédoublonnage : "existe-t-il déjà un flag identique non-résolu < 7j ?").
CREATE INDEX IF NOT EXISTS idx_srs_anti_fraud_dedupe_active
    ON public.srs_anti_fraud_flags (student_id, capacity_skill_id, flag_type, created_at DESC)
    WHERE resolved = FALSE;

-- Index pour le count badge UI (COUNT non-résolus par jointure class_members).
CREATE INDEX IF NOT EXISTS idx_srs_anti_fraud_unresolved
    ON public.srs_anti_fraud_flags (student_id)
    WHERE resolved = FALSE;


-- ============================================================================
-- 3. Trigger updated_at-style (mise à jour automatique de resolved_at)
-- ============================================================================
-- Pas de trigger : `resolved_at` est posé explicitement par le code applicatif
-- (UPDATE … SET resolved=true, resolved_by=auth.uid(), resolved_at=NOW()).
-- La CHECK constraint chk_srs_anti_fraud_resolved_coherent garantit la cohérence.


-- ============================================================================
-- 4. RLS
-- ============================================================================

ALTER TABLE public.srs_anti_fraud_flags ENABLE ROW LEVEL SECURITY;

-- ─── SELECT ─────────────────────────────────────────────────────────────────
-- Prof : voit les flags des élèves qui appartiennent à une de ses classes.
CREATE POLICY "anti_fraud_select_teacher_of_student"
ON public.srs_anti_fraud_flags
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.class_members cm
        JOIN public.classes c ON c.id = cm.class_id
        WHERE cm.student_id = srs_anti_fraud_flags.student_id
          AND cm.status = 'active'
          AND c.teacher_id = auth.uid()
    )
);

-- Admin : full read.
CREATE POLICY "anti_fraud_select_admin"
ON public.srs_anti_fraud_flags
FOR SELECT
TO authenticated
USING (is_admin());

-- L'élève ne voit JAMAIS ses propres flags (par design — pas d'UX D V1).
-- Pas de policy SELECT pour l'élève.

-- ─── INSERT ─────────────────────────────────────────────────────────────────
-- INSERT refusé pour authenticated (service_role bypass RLS et est utilisé
-- par le runner serveur). Admin peut INSERT manuellement si besoin.
CREATE POLICY "anti_fraud_insert_admin_only"
ON public.srs_anti_fraud_flags
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- ─── UPDATE ─────────────────────────────────────────────────────────────────
-- Prof : peut UPDATE uniquement les colonnes resolved / resolved_by / resolved_at
-- sur les flags de SES élèves. La restriction colonne ne se fait pas en RLS,
-- on s'appuie sur le code applicatif (endpoint PATCH) + check ownership.
CREATE POLICY "anti_fraud_update_teacher_of_student"
ON public.srs_anti_fraud_flags
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.class_members cm
        JOIN public.classes c ON c.id = cm.class_id
        WHERE cm.student_id = srs_anti_fraud_flags.student_id
          AND cm.status = 'active'
          AND c.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.class_members cm
        JOIN public.classes c ON c.id = cm.class_id
        WHERE cm.student_id = srs_anti_fraud_flags.student_id
          AND cm.status = 'active'
          AND c.teacher_id = auth.uid()
    )
);

-- Admin : full update.
CREATE POLICY "anti_fraud_update_admin"
ON public.srs_anti_fraud_flags
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ─── DELETE ─────────────────────────────────────────────────────────────────
-- Pas de DELETE V1 (soft delete via resolved=true). Admin peut nettoyer si besoin.
CREATE POLICY "anti_fraud_delete_admin_only"
ON public.srs_anti_fraud_flags
FOR DELETE
TO authenticated
USING (is_admin());


-- ============================================================================
-- 5. GRANTs
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.srs_anti_fraud_flags TO authenticated;
-- RLS filtre tout, GRANT large permet aux policies de fonctionner.
