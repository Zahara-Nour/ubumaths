-- ============================================================================
-- /automaths : lecture anonyme des liens « question publiée → point »
-- ============================================================================
--
-- La recherche du catalogue Automaths (page publique, sans compte) cherche aussi
-- dans les intitulés des points du programme rattachés à chaque question
-- (« double distributivité » trouve « Développer (a+b)(c+d) »). L'API
-- `/api/questions/templates/all` lit la liste en client ANONYME (réponse en
-- cache servie à tous) : elle doit donc pouvoir lire ces liens.
--
-- QUESTION D'ACCÈS (tranchée par David le 2026-11-18) : un visiteur sans compte
-- pourra lire à quel point du programme est rattachée une question PUBLIÉE.
-- Les intitulés des points (`curriculum_points`) étaient déjà lisibles en
-- anonyme ; les questions publiées aussi. Les liens des brouillons (seul autre
-- statut, `question_templates_status_check`) restent invisibles. Aucune donnée
-- d'élève n'est concernée. Lecture limitée aux deux colonnes du lien (pas
-- `created_at`).
--
-- La policy lit `question_templates` sous la RLS de `anon`, dont la seule
-- policy est `status = 'published'` (sans lecture de `profiles`, cf. incident
-- C2 de l'audit d'août 2026) : l'EXISTS ne voit que les publiées.
--
-- Migration ADDITIVE : lecture seule, aucune écriture accordée à `anon`.
--
-- ROLLBACK :
--   drop policy if exists "Anon lit les points des modeles publies" on public.question_template_points;
--   revoke select (template_id, point_id) on public.question_template_points from anon;
-- ============================================================================

grant select (template_id, point_id) on public.question_template_points to anon;

drop policy if exists "Anon lit les points des modeles publies" on public.question_template_points;

create policy "Anon lit les points des modeles publies"
	on public.question_template_points
	for select
	to anon
	using (
		exists (
			select 1
			from public.question_templates t
			where t.id = question_template_points.template_id
				and t.status = 'published'
		)
	);

comment on policy "Anon lit les points des modeles publies" on public.question_template_points is
	'Recherche du catalogue Automaths (page publique) : lien question publiée → point du programme. Brouillons exclus.';
