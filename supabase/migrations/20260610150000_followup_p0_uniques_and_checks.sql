-- ============================================================================
-- Migration: P0 follow-up — UNIQUE deck Programme + CHECK grade en famille B
-- Date:      2026-06-10
-- Plan:      ~/.claude/plans/immutable-painting-cake.md
-- Cible:     Findings P0#3 et P0#4 du code review post-chantier SRS/FSRS
-- Depends on: 20260610100000_refonte_skill_attempts_per_template.sql
--             20260610100100_srs_deck_sections.sql
-- ============================================================================
-- Corrige deux verrous d'intégrité oubliés dans le chantier initial :
--
--   1. UNIQUE INDEX sur srs_decks(owner_id) WHERE is_auto_managed = TRUE :
--      empêche la création de 2 decks Programme pour le même élève (race
--      condition sur l'ensureProgrammeDeck). Sans ça, la page programme
--      planterait avec .maybeSingle() voyant 2 rows.
--
--   2. Refonte chk_attempt_family_regime pour interdire grade != NULL en
--      famille B : la colonne grade n'a aucun sens hors FSRS (famille A).
--      Précaution contre une régression future qui inscrirait un grade sur
--      une observation prof.
--
-- Les deux corrections incluent un nettoyage défensif des éventuelles rows
-- déjà incohérentes (vraisemblablement 0 row en prod aujourd'hui).
-- ============================================================================


-- ============================================================================
-- 1. UNIQUE deck Programme par élève (P0#3)
-- ============================================================================

-- 1a. Nettoyage défensif des doublons éventuels
DELETE FROM public.srs_decks a
 USING public.srs_decks b
 WHERE a.id > b.id
   AND a.owner_id = b.owner_id
   AND a.is_auto_managed = TRUE
   AND b.is_auto_managed = TRUE;

-- 1b. Création de l'index UNIQUE
CREATE UNIQUE INDEX IF NOT EXISTS uq_srs_decks_one_programme_per_owner
    ON public.srs_decks(owner_id)
    WHERE is_auto_managed = TRUE;

COMMENT ON INDEX public.uq_srs_decks_one_programme_per_owner IS
    'Garantit 1 seul deck Programme (is_auto_managed=true) par élève. '
    'Permet de traiter le code 23505 en ensureProgrammeDeck comme un re-lookup propre.';


-- ============================================================================
-- 2. Famille B : grade DOIT être NULL (P0#4)
-- ============================================================================

-- 2a. Nettoyage défensif : remettre grade=NULL pour rows famille B éventuelles
UPDATE public.skill_attempts
   SET grade = NULL
 WHERE code IS NOT NULL
   AND grade IS NOT NULL;

-- 2b. Refonte chk_attempt_family_regime pour inclure grade IS NULL en branche B
ALTER TABLE public.skill_attempts
    DROP CONSTRAINT chk_attempt_family_regime;

ALTER TABLE public.skill_attempts
    ADD CONSTRAINT chk_attempt_family_regime CHECK (
        -- Régime Famille A : grade libre (NULL ou 1-4)
        (template_id IS NOT NULL
         AND success IS NOT NULL
         AND skill_id IS NULL
         AND code IS NULL
         AND task_id IS NULL)
        OR
        -- Régime Famille B : grade DOIT être NULL (n'est pas un concept FSRS)
        (skill_id IS NOT NULL
         AND code IS NOT NULL
         AND task_id IS NOT NULL
         AND template_id IS NULL
         AND success IS NULL
         AND grade IS NULL)
    );

COMMENT ON CONSTRAINT chk_attempt_family_regime ON public.skill_attempts IS
    'XOR strict Famille A (per-template, grade libre) vs Famille B (per-skill+task, grade interdit). '
    'Refonte 2026-06-10 follow-up : grade NULL imposé en B.';


-- ============================================================================
-- FIN
-- ============================================================================
