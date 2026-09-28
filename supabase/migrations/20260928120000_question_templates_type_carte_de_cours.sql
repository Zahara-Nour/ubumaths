-- =============================================================================
-- Carte de cours : nouveau type de question `course_card`
-- =============================================================================
--
-- Une carte de cours (question de cours, réponse révélée, auto-évaluation) n'a ni
-- case ni choix. Son type est écrit dans `question_templates.type`, que la contrainte
-- CHECK limite aux types existants. Décisions de David et spécification :
-- docs/wip/cartes-de-cours-progress.md (phase 0 validée le 2026-09-28).
--
-- QUESTION D'ACCÈS (posée à David, phase 0 validée le 2026-09-28)
--   Qui pourra lire quoi qu'il ne pouvait pas lire avant ? Personne : aucune policy,
--   aucune fonction, aucun droit ne change. Seule une valeur de plus est admise dans
--   la colonne `type`.
--
-- ADDITIVE : la contrainte est remplacée par la même liste augmentée de
-- `course_card` (définition de production vérifiée identique au baseline le
-- 2026-09-28). Aucune ligne n'est modifiée ni supprimée.
--
-- ROLLBACK (seulement s'il n'existe aucune carte de cours) :
--   alter table public.question_templates drop constraint question_templates_type_check;
--   alter table public.question_templates add constraint question_templates_type_check
--     check (type = any (array['numerical_exact', 'numerical_decimal', 'numerical_rounded',
--       'algebraic_transform', 'fill_in_blanks', 'multiple_choice']));
-- =============================================================================

alter table public.question_templates drop constraint question_templates_type_check;

alter table public.question_templates add constraint question_templates_type_check
	check (type = any (array[
		'numerical_exact'::text,
		'numerical_decimal'::text,
		'numerical_rounded'::text,
		'algebraic_transform'::text,
		'fill_in_blanks'::text,
		'multiple_choice'::text,
		'course_card'::text
	]));
