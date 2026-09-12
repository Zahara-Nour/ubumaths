-- L'élève archivé perd le Python de la classe qu'il a quittée
-- ===========================================================
--
-- Troisième et dernière surface de la série ouverte par 20260912090000 (les
-- fiches) puis 20260912150000 (les exercices). Le domaine Python portait le
-- même trou, entier — lecture ET écriture — sur six objets.
--
-- QUI PERD QUOI : un élève dont l'adhésion est `archived` ne voit plus les
-- exercices, carnets et fichiers Python distribués À CETTE CLASSE, ni leurs
-- lignes de distribution, et ne peut plus y rendre de travail. Ne changent
-- pas : l'exercice PUBLIC, la distribution NOMINALE, l'élève actif, le
-- professeur et l'administrateur.
--
-- Préventif au 2026-09-12 : 78 adhésions en production, toutes actives.
--
-- DEUX OBJETS DÉLIBÉRÉMENT ÉPARGNÉS :
--   - `python_exercise_assignments_insert` lit `class_members` pour vérifier
--     qu'un PROFESSEUR distribue à un élève de ses classes. Y ajouter le
--     statut l'empêcherait de distribuer nominativement à un ancien élève —
--     un rattrapage légitime, et le chemin nominal est précisément celui que
--     toute cette série préserve.
--   - `python_exercise_submissions_insert_public` exige `assignment_id is
--     null` et `is_public`, donc ne passe par aucune classe. Vérifié : elle ne
--     rouvre pas en OU ce que la policy voisine ferme.
--
-- ⚠️ DÉFAUT VOISIN, NON TRAITÉ ICI. `python_exercise_mastery` n'a AUCUNE
-- policy INSERT, et le trigger `update_python_mastery_on_submission` qui
-- l'alimente est SECURITY INVOKER : toute soumission d'exercice Python échoue,
-- pour tout élève. La production compte zéro soumission depuis l'origine. Ce
-- n'est pas une question d'archivage et cela demande sa propre décision, d'où
-- l'abstention. Le test d'intégration distingue les deux refus par le nom de
-- la table dans le message, faute de quoi il passerait sans rien prouver.
--
-- ROLLBACK : rejouer les six objets sans la ligne `status = 'active'`.

-- 1. Voir la distribution d'un exercice Python.
drop policy if exists "python_exercise_assignments_select_student" on public.python_exercise_assignments;
create policy "python_exercise_assignments_select_student"
	on public.python_exercise_assignments
	for select
	to authenticated
	using (
		exists (
			select 1 from profiles
			where profiles.id = auth.uid() and profiles.role = 'student'::user_role
		)
		and (
			exists (
				select 1 from class_members cm
				where cm.class_id = python_exercise_assignments.class_id
					and cm.student_id = auth.uid()
					and cm.status = 'active'
			)
			or student_id = auth.uid()
		)
	);

-- 2. Ouvrir l'exercice lui-même.
drop policy if exists "python_exercises_select_assigned" on public.python_exercises;
create policy "python_exercises_select_assigned"
	on public.python_exercises
	for select
	to authenticated
	using (
		exists (
			select 1 from profiles
			where profiles.id = auth.uid() and profiles.role = 'student'::user_role
		)
		and (
			exists (
				select 1
				from python_exercise_assignments pea
				join class_members cm on cm.class_id = pea.class_id
				where pea.exercise_id = python_exercises.id
					and cm.student_id = auth.uid()
					and cm.status = 'active'
			)
			or exists (
				select 1 from python_exercise_assignments pea
				where pea.exercise_id = python_exercises.id
					and pea.student_id = auth.uid()
			)
		)
	);

-- 3. Rendre son travail.
drop policy if exists "python_exercise_submissions_insert" on public.python_exercise_submissions;
create policy "python_exercise_submissions_insert"
	on public.python_exercise_submissions
	for insert
	to authenticated
	with check (
		student_id = auth.uid()
		and exists (
			select 1 from profiles
			where profiles.id = auth.uid() and profiles.role = 'student'::user_role
		)
		and (
			assignment_id is null
			or exists (
				select 1 from python_exercise_assignments pea
				where pea.id = python_exercise_submissions.assignment_id
					and pea.exercise_id = python_exercise_submissions.exercise_id
					and (
						pea.student_id = auth.uid()
						or exists (
							select 1 from class_members cm
							where cm.class_id = pea.class_id
								and cm.student_id = auth.uid()
								and cm.status = 'active'
						)
					)
			)
		)
		and exists (
			select 1 from python_exercises pe
			where pe.id = python_exercise_submissions.exercise_id
				and (
					exists (
						select 1
						from python_exercise_assignments pea
						join class_members cm on cm.class_id = pea.class_id
						where pea.exercise_id = pe.id
							and cm.student_id = auth.uid()
							and cm.status = 'active'
					)
					or exists (
						select 1 from python_exercise_assignments pea
						where pea.exercise_id = pe.id and pea.student_id = auth.uid()
					)
				)
		)
	);

-- 4. Les lignes de partage des carnets ET des fichiers passent toutes deux
--    par cette fonction. Vérifié : aucun autre objet ne l'utilise, sa portée
--    est donc contenue au domaine Python.
create or replace function public.is_student_in_class(p_class_id uuid)
returns boolean
language plpgsql
-- `stable` : ces fonctions sont appelées PAR LIGNE dans des `using (...)`, avec
-- en plus une sous-transaction par appel à cause du bloc `exception`. Elles ne
-- lisent que la base et `auth.uid()`, constants dans une requête : le
-- planificateur peut donc mutualiser les appels. C'est aussi la forme de leurs
-- homologues du domaine des fiches (`student_has_worksheet_access`).
--
-- ⚠️ `create or replace` RÉINITIALISE tout attribut non répété : réappliquer ce
-- motif à une fonction déjà `stable` sans réécrire le mot la dégraderait en
-- `volatile` en silence.
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
	return exists (
		select 1
		from class_members
		where class_id = p_class_id
			and student_id = auth.uid()
			and status = 'active'
	);
exception
	when others then
		return false;
end;
$function$;

-- 5. Le carnet lui-même.
create or replace function public.is_notebook_assigned_to_student(p_notebook_id uuid)
returns boolean
language plpgsql
-- `stable` : ces fonctions sont appelées PAR LIGNE dans des `using (...)`, avec
-- en plus une sous-transaction par appel à cause du bloc `exception`. Elles ne
-- lisent que la base et `auth.uid()`, constants dans une requête : le
-- planificateur peut donc mutualiser les appels. C'est aussi la forme de leurs
-- homologues du domaine des fiches (`student_has_worksheet_access`).
--
-- ⚠️ `create or replace` RÉINITIALISE tout attribut non répété : réappliquer ce
-- motif à une fonction déjà `stable` sans réécrire le mot la dégraderait en
-- `volatile` en silence.
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
	return exists (
		select 1
		from python_notebook_assignments pna
		join class_members cm on pna.class_id = cm.class_id
		where pna.notebook_id = p_notebook_id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
	);
exception
	when others then
		return false;
end;
$function$;

-- 6. Le fichier lui-même.
create or replace function public.is_file_assigned_to_student(p_file_id uuid)
returns boolean
language plpgsql
-- `stable` : ces fonctions sont appelées PAR LIGNE dans des `using (...)`, avec
-- en plus une sous-transaction par appel à cause du bloc `exception`. Elles ne
-- lisent que la base et `auth.uid()`, constants dans une requête : le
-- planificateur peut donc mutualiser les appels. C'est aussi la forme de leurs
-- homologues du domaine des fiches (`student_has_worksheet_access`).
--
-- ⚠️ `create or replace` RÉINITIALISE tout attribut non répété : réappliquer ce
-- motif à une fonction déjà `stable` sans réécrire le mot la dégraderait en
-- `volatile` en silence.
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
	return exists (
		select 1
		from python_file_assignments pfa
		join class_members cm on pfa.class_id = cm.class_id
		where pfa.file_id = p_file_id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
	);
exception
	when others then
		return false;
end;
$function$;

comment on function public.is_student_in_class(uuid) is
	'Le membre doit être ACTIF : `archived` = a quitté la classe. Utilisée par les policies de partage des carnets et fichiers Python.';
