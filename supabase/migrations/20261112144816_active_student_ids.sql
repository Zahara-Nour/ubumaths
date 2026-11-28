-- Élèves actifs pour les mesures (chantier amelioration, phase 0 validée le 2026-11-12)
--
-- `active_student_ids()` rend les élèves réels (`is_test` faux) membres `active`
-- d'au moins une classe : la base de toute mesure sur les élèves (CONTEXT.md,
-- « Élève actif »). Sans elle,
-- un comptage sur `profiles` entier mêle les élèves de l'année aux comptes des
-- années passées (adhésions archivées au passage d'année), aux élèves
-- hors-classe et aux élèves de test (CONTEXT.md : leurs résultats ne se mêlent
-- jamais aux vrais) : en prod au 2026-11-12, 2 élèves actifs sur 82 profils élèves.
--
-- Accès : personne ne gagne rien. `security invoker` (pas de definer), exécution
-- retirée à public, anon et authenticated, accordée à `service_role` seul — qui
-- lit déjà `profiles` et `class_members`. La fonction sert aux mesures (outil
-- Supabase, scripts serveur), jamais au navigateur.
--
-- Usage : `where student_id in (select student_id from public.active_student_ids())`.
--
-- Rollback :
--   drop function if exists public.active_student_ids();

create or replace function public.active_student_ids()
returns table (student_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
	select p.id
	from public.profiles p
	where p.role = 'student'
		and not p.is_test
		and exists (
			select 1
			from public.class_members cm
			where cm.student_id = p.id
				and cm.status = 'active'
		);
$$;

comment on function public.active_student_ids() is
	'Élèves actifs (réels, membres active d''au moins une classe), base des mesures. Réservée à service_role.';

revoke execute on function public.active_student_ids() from public, anon, authenticated;
grant execute on function public.active_student_ids() to service_role;
