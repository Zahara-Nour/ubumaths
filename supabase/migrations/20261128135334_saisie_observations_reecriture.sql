-- L39 — la saisie des observations d'une tâche réécrit sa grille en une transaction
-- ==================================================================================
--
-- Avant : la saisie (`dashboard/teacher/evaluation-tasks/[id]/saisie`) supprimait
-- les observations de la tâche par PostgREST, puis réinsérait la grille. Aucune
-- policy DELETE ne visait le prof : la suppression ne supprimait rien, sans
-- erreur, et chaque enregistrement doublait la grille. Les deux écritures
-- n'étaient pas liées : un refus à l'insertion aurait perdu la grille.
--
-- Accord de David (2026-11-28) :
--   1. policy DELETE pour le prof et l'admin, limitée aux observations
--      `source = 'teacher'` rattachées à une tâche, d'un élève de ses classes ;
--   2. fonction `security invoker` qui supprime puis réécrit la grille d'une
--      tâche en une transaction, et lève si des lignes restent. Elle n'efface
--      que les élèves de la nouvelle grille : la saisie n'écrit que les élèves
--      actifs, et un élève archivé depuis garde ses observations.
--
-- Question d'accès : personne ne lit rien de neuf. Le prof (et l'admin, qui
-- avait déjà tout) peut SUPPRIMER les observations de tâche qu'il a lui-même
-- saisies ; les traces des élèves (`auto`, `srs`, `student_self`) et les
-- observations hors tâche restent intouchables.
--
-- Le cache (`student_observable_state`) n'était recalculé qu'à l'insertion
-- (trigger `trg_skill_attempts_after_insert`). Une case retirée de la grille
-- garderait un cache périmé : un trigger AFTER DELETE, par requête, recalcule
-- les cases effacées. Le cache reste écrit par des triggers seulement.
-- Le régime contenus (`template_id`) n'est pas concerné : personne d'autre que
-- l'admin n'en efface de lignes, et cela ne change pas ici.
--
-- Rollback :
--   drop function if exists public.save_evaluation_task_grid(uuid, jsonb);
--   drop trigger if exists trg_skill_attempts_after_delete on public.skill_attempts;
--   drop function if exists public.skill_attempts_after_delete();
--   drop policy if exists "skill_attempts_delete_teacher_task" on public.skill_attempts;

create policy "skill_attempts_delete_teacher_task"
	on public.skill_attempts
	for delete
	to authenticated
	using (
		source = 'teacher'
		and task_id is not null
		and public.is_teacher_or_admin()
		and exists (
			select 1
			from public.class_members cm
			where cm.student_id = skill_attempts.student_id
		)
	);

comment on policy "skill_attempts_delete_teacher_task" on public.skill_attempts is
	'L39 : le prof efface les observations de tâche qu''il a saisies (source teacher, task_id non nul, élève d''une de ses classes), pour réécrire la grille par save_evaluation_task_grid.';

-- Cache des cases effacées (régime compétences), une fois par requête.
create function public.skill_attempts_after_delete()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
	v_pair record;
begin
	for v_pair in
		select distinct o.student_id, o.observable_id
		from old_rows o
		where o.observable_id is not null and o.code is not null
			-- Suppression d'un compte (cascade depuis `profiles`) : l'élève n'existe plus,
			-- ses caches partent avec lui ; les recalculer violerait leurs clés étrangères.
			and exists (select 1 from public.profiles p where p.id = o.student_id)
	loop
		perform public.update_student_observable_state(v_pair.student_id, v_pair.observable_id);
	end loop;
	return null;
end;
$function$;

comment on function public.skill_attempts_after_delete() is
	'L39 : recalcule student_observable_state (et la compétence parente) des cases effacées de skill_attempts.';

revoke all on function public.skill_attempts_after_delete() from public, anon, authenticated;

create trigger trg_skill_attempts_after_delete
	after delete on public.skill_attempts
	referencing old table as old_rows
	for each statement
	execute function public.skill_attempts_after_delete();

create function public.save_evaluation_task_grid(p_task_id uuid, p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path to 'public', 'pg_temp'
as $function$
declare
	v_inserted integer;
begin
	if p_task_id is null then
		raise exception 'tache manquante' using errcode = '22023';
	end if;
	if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
		raise exception 'grille invalide' using errcode = '22023';
	end if;
	if jsonb_array_length(p_rows) > 5000 then
		raise exception 'grille trop grande' using errcode = '22023';
	end if;
	if exists (
		select 1
		from jsonb_array_elements(p_rows) r
		where jsonb_typeof(r) <> 'object'
			or (r ->> 'code') is distinct from 'plus' and (r ->> 'code') is distinct from 'minus'
			or (r ->> 'student_id') is null
			or (r ->> 'observable_id') is null
	) then
		raise exception 'ligne de grille invalide' using errcode = '22023';
	end if;

	-- 1. Effacer la grille actuelle des élèves de la nouvelle grille, eux seuls :
	--    un élève archivé depuis n'est plus dans la grille, sa saisie reste.
	--    La RLS borne ce que l'appelant peut effacer ; le trigger AFTER DELETE
	--    recalcule le cache des cases effacées.
	delete from public.skill_attempts a
	where a.task_id = p_task_id
		and a.student_id in (select (r ->> 'student_id')::uuid from jsonb_array_elements(p_rows) r);

	-- Une ligne restée (refus RLS, silencieux) doublerait la grille.
	if exists (
		select 1
		from public.skill_attempts a
		where a.task_id = p_task_id
			and a.student_id in (select (r ->> 'student_id')::uuid from jsonb_array_elements(p_rows) r)
	) then
		raise exception 'grille non effacee' using errcode = '42501';
	end if;

	-- 2. Réécrire la grille (le trigger recalcule le cache des cases écrites).
	insert into public.skill_attempts (student_id, observable_id, code, task_id, source)
	select (r ->> 'student_id')::uuid, (r ->> 'observable_id')::uuid, r ->> 'code', p_task_id, 'teacher'
	from jsonb_array_elements(p_rows) r;
	get diagnostics v_inserted = row_count;

	return v_inserted;
end;
$function$;

comment on function public.save_evaluation_task_grid(uuid, jsonb) is
	'L39 : réécrit la grille d''observations d''une tâche (efface puis insère, une transaction). Lève si une ligne n''a pas pu être effacée. Rend le nombre de lignes écrites.';

revoke all on function public.save_evaluation_task_grid(uuid, jsonb) from public, anon;
grant execute on function public.save_evaluation_task_grid(uuid, jsonb) to authenticated;
