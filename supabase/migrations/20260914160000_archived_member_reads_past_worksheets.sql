-- Lecture seule rétroactive pour l'élève dont l'adhésion est archivée
-- ====================================================================
--
-- Un élève qui quitte une classe perd aujourd'hui TOUT accès à ses fiches :
-- en septembre, il ne peut plus relire ce qu'il a travaillé en juin. Les trois
-- fonctions qui gardent la lecture exigent `class_members.status = 'active'`.
--
-- On ouvre la LECTURE, et elle seule. Restent fermés, inchangés :
--   - `can_access_assignment` — donc le signalement d'erreur (INSERT) et la
--     route de détail tant qu'elle l'appelle ;
--   - recevoir une nouvelle distribution ;
--   - le salon de classe et les notifications, réglés par leurs propres
--     migrations de la série « élève archivé ».
--
-- BORNE TEMPORELLE. Sans elle, une fiche distribuée à la classe APRÈS le
-- départ de l'élève lui deviendrait lisible. `class_members` ne date pas
-- l'archivage (pas de colonne `archived_at`), mais depuis la Phase 1 une
-- classe appartient à une année scolaire : on exige que la fiche ait été
-- distribuée DANS la fenêtre de cette année. Une classe sans année rattachée
-- n'ouvre rien — la jointure échoue, on refuse. C'est le bon repli.
--
-- Accès : un élève archivé pourra RELIRE l'énoncé des fiches distribuées à sa
-- classe pendant l'année où il en était membre. Il ne pouvait rien en lire
-- depuis son archivage. Personne d'autre ne gagne quoi que ce soit : les trois
-- ajouts sont bornés à `cm.student_id = auth.uid()`.
--
-- Rollback :
--   drop function if exists public.can_read_assignment(uuid);
--   drop function if exists public.had_class_access_to_assignment(uuid);
--   -- puis restaurer les définitions précédentes de
--   -- `student_has_worksheet_access` et de la policy
--   -- « Students can view their assignments » (voir cette migration dans git).

-- 1. Le prédicat commun : « cet élève a-t-il été membre archivé d'une classe
--    à qui cette affectation a été distribuée, pendant l'année de la classe ? »
create or replace function public.had_class_access_to_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	select exists (
		select 1
		from worksheet_assignment_classes wac
		join class_members cm on cm.class_id = wac.class_id
		join classes c on c.id = wac.class_id
		join school_years sy on sy.id = c.school_year_id
		join worksheet_assignments wa on wa.id = wac.assignment_id
		where wac.assignment_id = p_assignment_id
			and cm.student_id = auth.uid()
			and cm.status = 'archived'
			-- La fiche doit avoir été distribuée pendant l'année de la classe.
			and coalesce(wa.available_from, wa.assigned_at, wa.created_at)::date
				between sy.start_date and sy.end_date
	);
$$;

comment on function public.had_class_access_to_assignment(uuid) is
	'Vrai si l''appelant a été membre ARCHIVÉ d''une classe destinataire de cette affectation, distribuée pendant l''année scolaire de la classe. Sert uniquement à ouvrir la LECTURE rétroactive ; n''autorise aucune écriture.';

revoke all on function public.had_class_access_to_assignment(uuid) from public;
revoke all on function public.had_class_access_to_assignment(uuid) from anon;
grant execute on function public.had_class_access_to_assignment(uuid) to authenticated;

-- 2. La lecture du contenu : fiches, sections, exercices.
--    Copie conforme de la définition en place, plus la branche archivée.
create or replace function public.student_has_worksheet_access(p_worksheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	select exists (
		select 1
		from worksheet_assignments wa
		where wa.worksheet_id = p_worksheet_id
			and wa.status = 'active'
			and (wa.available_from is null or wa.available_from <= now())
			and (
				-- Through a class. The junction carries every class of the
				-- assignment, and the membership must still be active.
				exists (
					select 1
					from worksheet_assignment_classes wac
					join class_members cm on cm.class_id = wac.class_id
					join classes c on c.id = wac.class_id
					where wac.assignment_id = wa.id
						and cm.student_id = auth.uid()
						and cm.status = 'active'
						and c.is_active
				)
				-- By name. No class condition: this is precisely the
				-- out-of-class student's case.
				or exists (
					select 1
					from worksheet_assignment_students was
					where was.assignment_id = wa.id
						and was.student_id = auth.uid()
				)
				-- Lecture seule rétroactive : l'ancien membre relit ce qui lui
				-- avait été distribué. Aucune écriture n'emprunte ce chemin.
				or public.had_class_access_to_assignment(wa.id)
			)
	);
$$;

revoke all on function public.student_has_worksheet_access(uuid) from public;
revoke all on function public.student_has_worksheet_access(uuid) from anon;
grant execute on function public.student_has_worksheet_access(uuid) to authenticated;

-- 3. La liste des affectations. On modifie la policy plutôt que
--    `is_in_assigned_class`, dont le nom promet une adhésion ACTIVE et qui est
--    aussi lue ailleurs.
drop policy if exists "Students can view their assignments" on public.worksheet_assignments;
create policy "Students can view their assignments"
	on public.worksheet_assignments
	for select
	to authenticated
	using (
		status = 'active'
		and (available_from is null or available_from <= now())
		and (
			is_in_assigned_class(id)
			or has_individual_assignment(id)
			or had_class_access_to_assignment(id)
		)
	);

-- 4. Le pendant lecture de `can_access_assignment`, pour la route de détail.
--    `can_access_assignment` reste INTACTE : elle garde les écritures, dont
--    l'INSERT des signalements d'erreur.
create or replace function public.can_read_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	select public.can_access_assignment(p_assignment_id)
		or public.had_class_access_to_assignment(p_assignment_id);
$$;

comment on function public.can_read_assignment(uuid) is
	'Pendant LECTURE de can_access_assignment : y ajoute l''ancien membre archivé. À n''utiliser que sur des chemins de lecture — can_access_assignment reste le garde des écritures.';

revoke all on function public.can_read_assignment(uuid) from public;
revoke all on function public.can_read_assignment(uuid) from anon;
grant execute on function public.can_read_assignment(uuid) to authenticated;
