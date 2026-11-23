-- Fin du QCM de modèle et de l'import TinyMath (chantier figure-et-choix, lot 5)
-- =============================================================================
--
-- DESTRUCTIVE, jouée après le deploy:prod v0.55.0 (code sans `multiple_choice` ni import TinyMath).
--
-- 1. `question_templates_type_check` n'admet plus `multiple_choice` (0 modèle de ce type en prod :
--    les QCM sont des cases choix depuis l'ADR 0033).
-- 2. `options.shuffleChoices` retiré des 3 brouillons qui le portaient encore (valeur `false`, sans effet).
-- 3. Suivi de l'import TinyMath supprimé : tables `migration_tracking` (633 lignes) et
--    `migration_edits` (632), vue `migration_review_tree`, fonction de trigger
--    `update_migration_tracking_updated_at()`. Aucun code ne les lit plus (page admin et scripts
--    retirés au lot 5b, #1924). Contenu exporté avant : data/import-tinymath/*.json.
--
-- Accès : aucun accès nouveau ; les tables supprimées n'étaient lisibles que par l'admin.
-- `migration_images` reste (hors champ).
--
-- Rollback :
--   1. contrainte :
--        alter table public.question_templates drop constraint question_templates_type_check;
--        alter table public.question_templates add constraint question_templates_type_check
--          check (type = any (array['numerical_exact', 'numerical_decimal', 'numerical_rounded',
--            'algebraic_transform', 'fill_in_blanks', 'multiple_choice', 'course_card']));
--   2. shuffleChoices (sans effet sur le code actuel, pour mémoire) :
--        update public.question_templates set options = options || '{"shuffleChoices": false}'
--        where id in ('6c3ee9e6-3c71-4ff9-943b-22691a9a92c7', '55341e85-6782-4ccd-84a4-8b2d3ef10a80',
--          'f98164b1-031d-4ff9-8d16-8c97ebe485f6');
--   3. tables, vue, fonction, index, policies, triggers : recopier leurs définitions de
--      20260616220000_baseline_schema.sql (et les révocations anon de
--      20261001170000_anon_retrait_droits_herites.sql), puis réimporter les deux JSON.

begin;

alter table public.question_templates drop constraint question_templates_type_check;
alter table public.question_templates add constraint question_templates_type_check
	check (
		type = any (
			array[
				'numerical_exact',
				'numerical_decimal',
				'numerical_rounded',
				'algebraic_transform',
				'fill_in_blanks',
				'course_card'
			]
		)
	);

update public.question_templates
set options = options - 'shuffleChoices'
where options ? 'shuffleChoices';

drop view public.migration_review_tree;
drop table public.migration_edits;
drop table public.migration_tracking;
drop function public.update_migration_tracking_updated_at();

commit;
