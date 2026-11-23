-- =============================================================================
-- Question tirée d'une tentative : `category_key` devient facultative
-- =============================================================================
--
-- ADR 0035 (chantier `automaths-arbre`, lot 2) : une série enregistre des
-- MODÈLES, plus des catégories (thème · domaine · sous-domaine · niveau). La
-- question tirée porte déjà son modèle (`template_id`) ; le code du lot 2
-- n'écrira plus `category_key`. La colonne sera retirée au lot 4 (destructif,
-- après la mise en prod du code qui ne l'écrit plus).
--
-- Additive : l'ancien code, encore en prod jusqu'au `deploy:prod`, continue
-- d'écrire la colonne ; la contrainte de longueur (1..200) reste pour lui.
--
-- Question d'accès : personne ne gagne de lecture (table réservée au
-- service_role, D18 ; aucun droit ni policy touché).
--
-- Rollback (aucune ligne sans clé ne doit exister : prod = 0 ligne au
-- 2026-11-04) :
--   update public.evaluation_attempt_questions
--     set category_key = template_id::text where category_key is null;
--   alter table public.evaluation_attempt_questions
--     alter column category_key set not null;
-- =============================================================================

alter table public.evaluation_attempt_questions
	alter column category_key drop not null;

comment on column public.evaluation_attempt_questions.category_key is
	'Ancienne catégorie de la question (thème|domaine|sous-domaine|niveau). Facultative depuis ADR 0035 ; retirée au lot 4.';
