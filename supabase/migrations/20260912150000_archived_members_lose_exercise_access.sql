-- L'élève archivé perd les exercices distribués à la classe qu'il a quittée
-- =========================================================================
--
-- Suite de 20260912090000, qui a fermé les FICHES. Les exercices distribués
-- hors fiche (`exercise_assignments`) portaient le même trou : six objets
-- lisaient `class_members` sans regarder `status`.
--
-- ⚠️ Les policies permissives se COMBINENT EN OU. Les deux policies SELECT de
-- `exercise_assignments` devaient donc être corrigées ensemble : n'en fermer
-- qu'une n'aurait rien fermé du tout.
--
-- QUI PERD QUOI : un élève dont l'adhésion est `archived` n'accède plus aux
-- exercices distribués À CETTE CLASSE, ne voit plus la ligne de distribution,
-- et ne peut plus y enregistrer de complétion. Ne changent pas : l'exercice
-- PUBLIC, l'exercice qui lui est distribué NOMMÉMENT, et l'élève actif.
--
-- Préventif au 2026-09-12 : la production compte 78 adhésions, toutes actives.
--
-- ⚠️ CHANGEMENT ASSUMÉ : les policies recréées passent de `{public}` à
-- `to authenticated`. Ce n'est pas une régression — leurs prédicats exigent
-- tous `auth.uid()`, donc le rôle `anon` n'y correspondait déjà à rien — mais
-- c'est un resserrement délibéré, pas une recopie à l'identique.
--
-- ────────────────────────────────────────────────────────────────────────────
-- AU PASSAGE, UNE FONCTION MORTE DEPUIS SEPTEMBRE
--
-- `get_my_exercise_assignments()` et `get_student_exercises()` lisent une
-- table `exercise_tags` qui N'EXISTE PLUS : les tags sont passés à la table
-- polymorphe `resource_tags (resource_kind, resource_id, tag_id)` lors des
-- migrations 20260908xxxxxx, qui ont oublié ces deux fonctions.
--
-- Conséquence en production : les deux lèvent `42P01` à chaque appel.
-- `get_student_exercises` est appelée à trois endroits de
-- `src/lib/server/exercise-assignments.ts`, qui journalise l'erreur puis
-- renvoie une liste VIDE — trois écrans d'exercices élève affichent donc
-- « aucun exercice » depuis septembre, sans que rien ne le signale.
--
-- Réécrire ces fonctions pour le statut imposait de traiter aussi ce défaut :
-- on ne recrée pas une fonction en y laissant une table inexistante.
--
-- ROLLBACK : rejouer les quatre objets sans la ligne `cm.status = 'active'`
-- (et, pour les deux fonctions, en remettant `exercise_tags` — ce qui les
-- rendrait de nouveau inopérantes).

-- 1. Le garde d'accès à un exercice.
create or replace function public.student_has_exercise_access(
	p_exercise_id uuid,
	p_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
	select exists (
		-- Exercise is public
		select 1 from exercises
		where id = p_exercise_id
		and is_public = true
	) or exists (
		-- Student has an active assignment
		select 1 from exercise_assignments ea
		where ea.exercise_id = p_exercise_id
		and ea.is_active = true
		and (
			-- Direct assignment: no class involved, so no status to check.
			ea.student_id = p_student_id
			-- Class assignment: the membership must still be active.
			or ea.class_id in (
				select class_id from class_members
				where student_id = p_student_id
				and status = 'active'
			)
			-- Public assignment
			or ea.assigned_to_type = 'public'
		)
	);
$function$;

-- 2. La liste « mes exercices » de l'élève connecté.
create or replace function public.get_my_exercise_assignments()
returns table(
	id uuid, exercise_id uuid, assigned_by uuid, assigned_to_type text,
	student_id uuid, class_id uuid, assigned_at timestamp with time zone,
	optional_deadline timestamp with time zone, notes text, is_active boolean,
	exercise_title text, variations jsonb, shared jsonb, variables jsonb,
	distribution_mode text, exercise_is_public boolean, tags text[], grades text[],
	exercise_creator_id uuid, assigned_by_name text, assigned_by_role text,
	assigned_to_name text, student_email text, class_name text
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
	select
		ea.id,
		ea.exercise_id,
		ea.assigned_by,
		ea.assigned_to_type,
		ea.student_id,
		ea.class_id,
		ea.assigned_at,
		ea.optional_deadline,
		ea.notes,
		ea.is_active,
		e.title as exercise_title,
		e.variations,
		e.shared,
		e.variables,
		e.distribution_mode,
		e.is_public as exercise_is_public,
		coalesce(
			array(
				-- `resource_tags`, pas `exercise_tags` : voir l'en-tête.
				select t.name from resource_tags rt
				join tags t on t.id = rt.tag_id
				where rt.resource_id = e.id and rt.resource_kind = 'exercise'
				order by t.name
			),
			'{}'::text[]
		) as tags,
		e.grades,
		e.created_by as exercise_creator_id,
		p.full_name as assigned_by_name,
		p.role as assigned_by_role,
		case
			when ea.assigned_to_type = 'student' then s.full_name
			when ea.assigned_to_type = 'class' then c.name
			else 'Public'
		end as assigned_to_name,
		s.email as student_email,
		c.name as class_name
	from exercise_assignments ea
	join exercises e on ea.exercise_id = e.id
	join profiles p on ea.assigned_by = p.id
	left join profiles s on ea.student_id = s.id
	left join classes c on ea.class_id = c.id
	where ea.is_active = true
		and (
			ea.student_id = auth.uid()
			or ea.class_id in (
				select class_id from class_members
				where student_id = auth.uid() and status = 'active'
			)
			or ea.assigned_to_type = 'public'
		);
$function$;

-- 3. La liste des exercices d'un élève donné.
create or replace function public.get_student_exercises(p_student_id uuid)
returns table(
	exercise_id uuid, exercise_title text, variations jsonb, shared jsonb,
	variables jsonb, distribution_mode text, tags text[], grades text[],
	assignment_id uuid, assignment_type text, assigned_at timestamp with time zone,
	optional_deadline timestamp with time zone, notes text, assigned_by_name text,
	completed_at timestamp with time zone, last_viewed_at timestamp with time zone,
	view_count integer
)
language sql
stable
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
	select
		e.id as exercise_id,
		e.title as exercise_title,
		e.variations,
		e.shared,
		e.variables,
		e.distribution_mode,
		coalesce(
			array(
				select t.name from resource_tags rt
				join tags t on t.id = rt.tag_id
				where rt.resource_id = e.id and rt.resource_kind = 'exercise'
				order by t.name
			),
			'{}'::text[]
		) as tags,
		e.grades,
		ea.id as assignment_id,
		ea.assigned_to_type as assignment_type,
		ea.assigned_at,
		ea.optional_deadline,
		ea.notes,
		p.full_name as assigned_by_name,
		ec.completed_at,
		ec.last_viewed_at,
		ec.view_count
	from exercises e
	left join exercise_assignments ea on e.id = ea.exercise_id
		and ea.is_active = true
		and (
			ea.student_id = p_student_id
			or ea.class_id in (
				select class_id from class_members
				where student_id = p_student_id and status = 'active'
			)
			or ea.assigned_to_type = 'public'
		)
	left join profiles p on ea.assigned_by = p.id
	left join exercise_completions ec on e.id = ec.exercise_id
		and ec.student_id = p_student_id
	where
		e.is_public = true
		or ea.id is not null
	order by
		case when ea.id is not null and ec.completed_at is null then 0 else 1 end,
		ec.last_viewed_at desc nulls last,
		ea.assigned_at desc nulls last;
$function$;

-- 4 et 5. Les DEUX policies SELECT de exercise_assignments — permissives, donc
-- combinées en OU : corriger l'une sans l'autre ne ferme rien.
drop policy if exists "Students can view their assignments" on public.exercise_assignments;
create policy "Students can view their assignments"
	on public.exercise_assignments
	for select
	to authenticated
	using (
		(select profiles.role from profiles where profiles.id = auth.uid()) = 'student'::user_role
		and is_active = true
		and (
			student_id = auth.uid()
			or class_id in (
				select class_members.class_id from class_members
				where class_members.student_id = auth.uid()
				and class_members.status = 'active'
			)
			or assigned_to_type = 'public'
		)
	);

drop policy if exists "exercise_assignments_select_student" on public.exercise_assignments;
create policy "exercise_assignments_select_student"
	on public.exercise_assignments
	for select
	to authenticated
	using (
		is_active = true
		and (
			(assigned_to_type = 'student' and student_id = auth.uid())
			or (
				assigned_to_type = 'class'
				and class_id in (
					select class_members.class_id from class_members
					where class_members.student_id = auth.uid()
					and class_members.status = 'active'
				)
			)
			or assigned_to_type = 'public'
		)
	);

-- 6. L'écriture d'une complétion suit la lecture : sans cela, un élève archivé
--    pourrait encore enregistrer du travail sur un exercice qu'il ne voit plus.
drop policy if exists "Students can insert completions for accessible exercises"
	on public.exercise_completions;
create policy "Students can insert completions for accessible exercises"
	on public.exercise_completions
	for insert
	to authenticated
	with check (
		student_id = auth.uid()
		and (select profiles.role from profiles where profiles.id = auth.uid()) = 'student'::user_role
		and (
			exists (
				select 1 from exercises
				where exercises.id = exercise_completions.exercise_id
				and exercises.is_public = true
			)
			or exists (
				select 1 from exercise_assignments ea
				where ea.exercise_id = exercise_completions.exercise_id
				and ea.is_active = true
				and (
					ea.student_id = auth.uid()
					or ea.class_id in (
						select class_members.class_id from class_members
						where class_members.student_id = auth.uid()
						and class_members.status = 'active'
					)
					or ea.assigned_to_type = 'public'
				)
			)
		)
	);

-- 7 et 8. ⚠️ `exercise_completions` porte DEUX autres policies d'écriture,
--    permissives elles aussi : `exercise_completions_insert` et
--    `exercise_completions_update`, toutes deux réduites à
--    `auth.uid() = student_id`. Combinées en OU avec la policy ci-dessus,
--    elles la rendaient ENTIÈREMENT INERTE : un élève archivé pouvait
--    continuer d'enregistrer et de faire avancer son travail sur un exercice
--    qu'il ne voyait plus, pour peu qu'il en connaisse l'identifiant — et il
--    l'a forcément vu avant d'être archivé.
--
--    Elles reçoivent donc le même contrôle d'accès. Le cas du professeur et
--    de l'administrateur, que la policy nommée écartait via `role = 'student'`,
--    est ici préservé explicitement : eux gardent l'écriture sans condition de
--    distribution.

drop policy if exists "exercise_completions_insert" on public.exercise_completions;
create policy "exercise_completions_insert"
	on public.exercise_completions
	for insert
	to authenticated
	with check (
		auth.uid() = student_id
		and (
			public.is_teacher_or_admin()
			or public.student_has_exercise_access(exercise_id, auth.uid())
		)
	);

drop policy if exists "exercise_completions_update" on public.exercise_completions;
create policy "exercise_completions_update"
	on public.exercise_completions
	for update
	to authenticated
	using (
		auth.uid() = student_id
		and (
			public.is_teacher_or_admin()
			or public.student_has_exercise_access(exercise_id, auth.uid())
		)
	)
	with check (
		auth.uid() = student_id
		and (
			public.is_teacher_or_admin()
			or public.student_has_exercise_access(exercise_id, auth.uid())
		)
	);

-- 9. Et son homologue nommée, qui ne contrôlait que l'identité.
drop policy if exists "Students can update their own completions" on public.exercise_completions;
create policy "Students can update their own completions"
	on public.exercise_completions
	for update
	to authenticated
	using (
		student_id = auth.uid()
		and (select profiles.role from profiles where profiles.id = auth.uid()) = 'student'::user_role
		and public.student_has_exercise_access(exercise_id, auth.uid())
	);

comment on function public.student_has_exercise_access(uuid, uuid) is
	'Le membre de classe doit être ACTIF. La distribution nominale et l''exercice public, eux, ne dépendent d''aucune classe.';
