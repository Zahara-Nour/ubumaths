-- Séparer la « série » (composition) de l'« évaluation » (réglages, destinataires)
-- ================================================================================
--
-- Chantier 4, étape 1 (docs/wip/series-formes-progress.md, décisions Q22 à Q31 de
-- David, 2026-09-30). `public.assessments` mélange aujourd'hui la composition
-- (`categories`) et les réglages (`settings`, `status`, période). On crée :
--
--   series                  titre, description, niveau, catégories — PAS de statut (Q25)
--   evaluations             série + forme + temps + tentatives + date limite + ordre
--                           aléatoire + période + statut (Q25, Q30)
--   evaluation_assignments  destinataires (classe XOR élève), comme assessment_assignments
--
-- et trois colonnes nullables qui pointent vers l'ÉVALUATION (Q29) :
-- `test_sessions.evaluation_id`, `evaluation_tasks.evaluation_id`,
-- `journal_entry_activities.evaluation_id`.
--
-- ADDITIVE : aucune table, colonne ni donnée existante n'est supprimée. Deux
-- contraintes CHECK existantes sont recréées ÉLARGIES (toute ligne valide avant
-- le reste) : `chk_evaluation_task_source` et `journal_entry_activities_kind_shape`.
-- L'étape 2 (DROP des anciennes tables) sera une PR à part, avec arrêt (Q28).
--
-- ── QUESTION D'ACCÈS (tranchée par David, Q22) : AUCUN accès nouveau ──────────
--   · Série : le prof (ses séries) et l'admin. Un élève ne la lit que si une
--     évaluation PUBLIÉE qui l'utilise lui est assignée (nommément, ou via une
--     classe dont il est membre ACTIF).
--   · Évaluation : prof + admin ; l'élève ne lit que les siennes, publiées.
--   · Assignation : prof + admin ; l'élève ne lit que les siennes, et seulement
--     si l'évaluation est publiée (plus strict que assessment_assignments, qui
--     les montre aussi en brouillon).
--   · Aucun INSERT / UPDATE / DELETE élève ; rien pour anon (droits révoqués).
--   · test_sessions : RESTRICTION seulement. Un élève ne peut créer une séance
--     rattachée à une évaluation que si elle est publiée et lui est assignée —
--     sinon il pourrait verrouiller n'importe quelle série (Q24). Et le
--     rattachement ne se change plus après coup (trigger), sauf admin.
--
-- ── CHOIX DES CLÉS ÉTRANGÈRES ────────────────────────────────────────────────
--   · evaluations.series_id : NO ACTION (= refus, Q31). Pas RESTRICT : le refus
--     est identique pour un DELETE direct, mais NO ACTION est vérifié en fin
--     d'instruction, ce qui laisse passer une cascade qui supprime la série ET
--     ses évaluations dans la même instruction (suppression d'un profil prof).
--   · test_sessions.evaluation_id : NO ACTION (refus). Une séance d'élève ne
--     disparaît jamais (ni CASCADE), et SET NULL la transformerait en silence en
--     entraînement libre : la tentative ne compterait plus, et la série se
--     déverrouillerait. Une évaluation déjà passée ne se supprime pas : on
--     l'archive (status = 'archived').
--   · evaluation_tasks.evaluation_id : SET NULL (comme assessment_id).
--   · journal_entry_activities.evaluation_id : CASCADE (comme assessment_id).
--
-- ── VERROU (Q24) ─────────────────────────────────────────────────────────────
--   Dès qu'une séance (`test_sessions`) est rattachée à une évaluation d'une
--   série, la série refuse UPDATE (de son contenu) et DELETE, avec une ERREUR
--   explicite — pas un refus RLS silencieux. SQLSTATE dédié : 'UBS01'
--   (PostgREST → HTTP 400, `error.code === 'UBS01'`). Même verrou sur le
--   changement de série d'une évaluation déjà commencée.
--
-- ── RECOPIE ──────────────────────────────────────────────────────────────────
--   `public.copy_legacy_assessments()` (service_role SEULEMENT, rejouable) :
--   chaque assessment → 1 série + 1 évaluation (forme 'interactive', temps NULL,
--   `legacy_assessment_id` = id d'origine, unique) ; chaque assessment_assignment
--   → 1 evaluation_assignment de MÊME id ; puis `evaluation_id` renseigné sur les
--   séances, tâches et activités du cahier par correspondance. Les assessments
--   dont `categories` n'est pas un tableau non vide sont SAUTÉS et comptés
--   (une série vide n'a pas de sens ; prod 2026-09-30 : 0 cas, 1 assessment).
--   La fonction est appelée en fin de migration ; elle disparaîtra avec l'étape 2.
--
-- ── ROLLBACK (dans cet ordre) ────────────────────────────────────────────────
--   drop policy if exists "test_sessions_evaluation_assignee_only" on public.test_sessions;
--   drop trigger if exists test_sessions_evaluation_immutable on public.test_sessions;
--   alter table public.test_sessions drop constraint if exists test_sessions_flash_sans_evaluation;
--   alter table public.journal_entry_activities drop constraint journal_entry_activities_kind_shape;
--   alter table public.journal_entry_activities add constraint journal_entry_activities_kind_shape check (
--     (kind = 'exercise' and exercise_id is not null)
--     or (kind = 'course' and (chapter_id is not null or label is not null))
--     or (kind = 'textbook' and textbook_ref is not null)
--     or (kind = 'question' and question_template_id is not null)
--     or (kind = 'assessment' and assessment_id is not null)) not valid;
--   alter table public.evaluation_tasks drop constraint chk_evaluation_task_source;
--   alter table public.evaluation_tasks add constraint chk_evaluation_task_source check (
--     ((assessment_id is not null)::int + (exercise_id is not null)::int
--      + (worksheet_id is not null)::int) <= 1) not valid;
--   alter table public.test_sessions drop column if exists evaluation_id;
--   alter table public.evaluation_tasks drop column if exists evaluation_id;
--   alter table public.journal_entry_activities drop column if exists evaluation_id;
--   drop table if exists public.evaluation_assignments;
--   drop table if exists public.evaluations;
--   drop table if exists public.series;
--   drop function if exists public.copy_legacy_assessments();
--   drop function if exists public.is_series_owner(uuid);
--   drop function if exists public.is_evaluation_owner(uuid);
--   drop function if exists public.student_can_read_evaluation(uuid);
--   drop function if exists public.student_can_read_series(uuid);
--   drop function if exists public.series_lock_guard();
--   drop function if exists public.evaluation_series_lock_guard();
--   drop function if exists public.test_session_evaluation_immutable();
--   (⚠️ Les trois DROP COLUMN / DROP TABLE perdent ce qui aurait été écrit dans
--   les nouvelles tables depuis la bascule du code : rollback sûr AVANT la PR 2.)

-- ============================================================================
-- 1. Tables
-- ============================================================================

create table public.series (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	description text,
	grade text not null,
	categories jsonb not null,
	created_by uuid not null references public.profiles(id) on delete cascade,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint series_title_length check (char_length(btrim(title)) between 1 and 200),
	constraint series_categories_non_empty check (
		jsonb_typeof(categories) = 'array' and jsonb_array_length(categories) > 0
	),
	-- Même liste que assessments_valid_grade
	constraint series_valid_grade check (grade = any (array[
		'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3', '2', '1_GEN', 'T_GEN',
		'1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG'
	]))
);

comment on table public.series is
	'Série : composition d''une suite de questions (catégories). Sans statut. Verrouillée dès qu''une séance d''élève est rattachée à une évaluation qui l''utilise (SQLSTATE UBS01).';
comment on column public.series.categories is 'Tableau JSONB non vide de CartItem (catégorie, quantité, délai)';

create table public.evaluations (
	id uuid primary key default gen_random_uuid(),
	series_id uuid not null references public.series(id), -- NO ACTION : cf. en-tête (Q31)
	form text not null,
	time_limit integer,
	max_attempts integer,
	deadline timestamptz,
	shuffle_questions boolean not null default true,
	academic_period_id uuid references public.academic_periods(id) on delete set null,
	status text not null default 'draft',
	created_by uuid not null references public.profiles(id) on delete cascade,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	legacy_assessment_id uuid unique,
	constraint evaluations_form_check check (form in ('interactive', 'course')),
	-- Q30 : Course aux nombres → temps obligatoire, 1 à 60 min ; Entraînement → aucun
	constraint evaluations_time_limit_by_form check (
		(form = 'course' and time_limit is not null and time_limit between 60 and 3600)
		or (form = 'interactive' and time_limit is null)
	),
	constraint evaluations_max_attempts_range check (
		max_attempts is null or max_attempts between 1 and 10
	),
	constraint evaluations_status_check check (status in ('draft', 'published', 'archived'))
);

comment on table public.evaluations is
	'Évaluation : une série passée sous une forme (interactive = Entraînement, course = Course aux nombres), avec ses réglages, son statut et ses destinataires.';
comment on column public.evaluations.time_limit is 'Secondes. Obligatoire (60-3600) en Course aux nombres, NULL en Entraînement.';
comment on column public.evaluations.legacy_assessment_id is
	'Id de l''assessment d''origine (recopie du chantier 4). Disparaît avec l''étape 2.';

create table public.evaluation_assignments (
	id uuid primary key default gen_random_uuid(),
	evaluation_id uuid not null references public.evaluations(id) on delete cascade,
	class_id uuid references public.classes(id) on delete cascade,
	student_id uuid references public.profiles(id) on delete cascade,
	assigned_by uuid not null references public.profiles(id) on delete cascade,
	assigned_at timestamptz not null default now(),
	constraint evaluation_assignment_target_check check (
		(class_id is not null and student_id is null)
		or (class_id is null and student_id is not null)
	)
);

comment on table public.evaluation_assignments is
	'Destinataires d''une évaluation : une classe OU un élève. Les lignes recopiées gardent l''id de leur assessment_assignment.';

create index idx_series_created_by on public.series (created_by);
create index idx_evaluations_series_id on public.evaluations (series_id);
create index idx_evaluations_created_by on public.evaluations (created_by);
create index idx_evaluations_status on public.evaluations (status);
create index idx_evaluations_period on public.evaluations (academic_period_id)
	where academic_period_id is not null;
create index idx_evaluation_assignments_evaluation_id on public.evaluation_assignments (evaluation_id);
create index idx_evaluation_assignments_class_id on public.evaluation_assignments (class_id)
	where class_id is not null;
create index idx_evaluation_assignments_student_id on public.evaluation_assignments (student_id)
	where student_id is not null;
create index idx_evaluation_assignments_assigned_by on public.evaluation_assignments (assigned_by);

create trigger update_series_updated_at before update on public.series
	for each row execute function public.update_updated_at_column();
create trigger update_evaluations_updated_at before update on public.evaluations
	for each row execute function public.update_updated_at_column();

-- ============================================================================
-- 2. Colonnes nullables vers l'évaluation (Q29)
-- ============================================================================

alter table public.test_sessions
	add column evaluation_id uuid references public.evaluations(id); -- NO ACTION : cf. en-tête
alter table public.evaluation_tasks
	add column evaluation_id uuid references public.evaluations(id) on delete set null;
alter table public.journal_entry_activities
	add column evaluation_id uuid references public.evaluations(id) on delete cascade;

create index idx_test_sessions_evaluation_user on public.test_sessions (evaluation_id, user_id)
	where evaluation_id is not null;
create index idx_evaluation_tasks_evaluation on public.evaluation_tasks (evaluation_id)
	where evaluation_id is not null;
create index idx_journal_entry_activities_evaluation on public.journal_entry_activities (evaluation_id)
	where evaluation_id is not null;

comment on column public.test_sessions.evaluation_id is
	'Évaluation passée (NULL = entraînement libre). Fixé à la création ; une évaluation ainsi référencée ne se supprime pas.';

-- Une séance de flash-cards n'est jamais rattachée à une évaluation (pendant de
-- test_sessions_flash_sans_assignation, 20260930121000).
alter table public.test_sessions add constraint test_sessions_flash_sans_evaluation
	check (mode <> 'flash' or evaluation_id is null);

-- Une tâche d'évaluation garde UNE source au plus : l'ancienne (assessment_id) et
-- la nouvelle (evaluation_id) comptent pour la même place, pour que la recopie
-- puisse renseigner les deux. Toute ligne valide avant le reste.
alter table public.evaluation_tasks drop constraint chk_evaluation_task_source;
alter table public.evaluation_tasks add constraint chk_evaluation_task_source check (
	(assessment_id is not null or evaluation_id is not null)::int
	+ (exercise_id is not null)::int
	+ (worksheet_id is not null)::int <= 1
);

-- Activité « assessment » du cahier : l'ancienne OU la nouvelle référence suffit.
alter table public.journal_entry_activities drop constraint journal_entry_activities_kind_shape;
alter table public.journal_entry_activities add constraint journal_entry_activities_kind_shape check (
	(kind = 'exercise' and exercise_id is not null)
	or (kind = 'course' and (chapter_id is not null or label is not null))
	or (kind = 'textbook' and textbook_ref is not null)
	or (kind = 'question' and question_template_id is not null)
	or (kind = 'assessment' and (assessment_id is not null or evaluation_id is not null))
);

-- ============================================================================
-- 3. Fonctions d'aide à la RLS (SECURITY DEFINER, search_path figé)
-- ============================================================================
-- DEFINER pour lire les tables sans repasser par leur RLS (pas de récursion
-- évaluations ↔ assignations). Elles ne rendent qu'un booléen sur auth.uid().

create or replace function public.is_series_owner(p_series_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	select exists (
		select 1 from public.series s
		where s.id = p_series_id and s.created_by = auth.uid()
	);
$$;

create or replace function public.is_evaluation_owner(p_evaluation_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	select exists (
		select 1 from public.evaluations e
		where e.id = p_evaluation_id and e.created_by = auth.uid()
	);
$$;

-- Vrai ssi l'évaluation est PUBLIÉE et assignée à auth.uid() : nommément, ou à
-- une classe dont il est membre ACTIF (même règle que
-- student_has_assignment_for_assessment depuis 20260915700000).
create or replace function public.student_can_read_evaluation(p_evaluation_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	select exists (
		select 1
		from public.evaluations e
		join public.evaluation_assignments ea on ea.evaluation_id = e.id
		where e.id = p_evaluation_id
			and e.status = 'published'
			and (
				ea.student_id = auth.uid()
				or exists (
					select 1 from public.class_members cm
					where cm.class_id = ea.class_id
						and cm.student_id = auth.uid()
						and cm.status = 'active'
				)
			)
	);
$$;

create or replace function public.student_can_read_series(p_series_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	select exists (
		select 1 from public.evaluations e
		where e.series_id = p_series_id
			and public.student_can_read_evaluation(e.id)
	);
$$;

-- ============================================================================
-- 4. Verrou (Q24) et immuabilité du rattachement d'une séance
-- ============================================================================

-- DEFINER : le verrou doit voir TOUTES les séances, quelle que soit la RLS de
-- celui qui modifie la série.
create or replace function public.series_lock_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
	if tg_op = 'UPDATE'
		and new.title is not distinct from old.title
		and new.description is not distinct from old.description
		and new.grade is not distinct from old.grade
		and new.categories is not distinct from old.categories
		and new.created_by is not distinct from old.created_by
	then
		return new; -- contenu inchangé (ex. updated_at seul) : rien à protéger
	end if;

	if exists (
		select 1
		from public.test_sessions ts
		join public.evaluations e on e.id = ts.evaluation_id
		where e.series_id = old.id
	) then
		raise exception 'Série verrouillée : un élève a déjà commencé une évaluation qui l''utilise. Dupliquez-la pour la modifier.'
			using errcode = 'UBS01';
	end if;

	if tg_op = 'DELETE' then
		return old;
	end if;
	return new;
end;
$$;

create trigger series_lock_guard
	before update or delete on public.series
	for each row execute function public.series_lock_guard();

create or replace function public.evaluation_series_lock_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
	if exists (select 1 from public.test_sessions ts where ts.evaluation_id = old.id) then
		raise exception 'Évaluation déjà commencée : sa série ne peut plus changer.'
			using errcode = 'UBS01';
	end if;
	return new;
end;
$$;

create trigger evaluation_series_lock_guard
	before update of series_id on public.evaluations
	for each row
	when (old.series_id is distinct from new.series_id)
	execute function public.evaluation_series_lock_guard();

-- Le rattachement d'une séance à une évaluation se fixe à la création (où la
-- policy restrictive ci-dessous le contrôle) ; seul l'admin ou le service
-- (auth.uid() NULL : migration, service_role) peut le changer ensuite.
create or replace function public.test_session_evaluation_immutable()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
	if auth.uid() is not null and not public.is_admin() then
		raise exception 'Le rattachement d''une séance à une évaluation ne se modifie pas.'
			using errcode = '42501';
	end if;
	return new;
end;
$$;

create trigger test_sessions_evaluation_immutable
	before update of evaluation_id on public.test_sessions
	for each row
	when (old.evaluation_id is distinct from new.evaluation_id)
	execute function public.test_session_evaluation_immutable();

-- ============================================================================
-- 5. RLS
-- ============================================================================

alter table public.series enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_assignments enable row level security;

-- anon : rien. Les privilèges par défaut de Supabase accordent tout à anon sur
-- une nouvelle table ; on les retire (RLS + absence de droit = double porte).
revoke all on public.series, public.evaluations, public.evaluation_assignments from anon;
revoke all on public.series, public.evaluations, public.evaluation_assignments from public;

-- ── series ──────────────────────────────────────────────────────────────────

create policy "series_admin_all" on public.series
	for all to authenticated
	using (public.is_admin()) with check (public.is_admin());

create policy "series_select_owner" on public.series
	for select to authenticated
	using (created_by = auth.uid());

-- Même règle que « Teachers can create assessments »
create policy "series_insert_teacher" on public.series
	for insert to authenticated
	with check (
		(select p.role from public.profiles p where p.id = auth.uid()) = 'teacher'::public.user_role
		and created_by = auth.uid()
	);

create policy "series_update_owner" on public.series
	for update to authenticated
	using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "series_delete_owner" on public.series
	for delete to authenticated
	using (created_by = auth.uid());

create policy "series_select_assigned_student" on public.series
	for select to authenticated
	using (public.student_can_read_series(id));

-- ── evaluations ─────────────────────────────────────────────────────────────

create policy "evaluations_admin_all" on public.evaluations
	for all to authenticated
	using (public.is_admin()) with check (public.is_admin());

create policy "evaluations_select_owner" on public.evaluations
	for select to authenticated
	using (created_by = auth.uid());

create policy "evaluations_insert_teacher" on public.evaluations
	for insert to authenticated
	with check (
		(select p.role from public.profiles p where p.id = auth.uid()) = 'teacher'::public.user_role
		and created_by = auth.uid()
		and public.is_series_owner(series_id)
	);

create policy "evaluations_update_owner" on public.evaluations
	for update to authenticated
	using (created_by = auth.uid())
	with check (created_by = auth.uid() and public.is_series_owner(series_id));

create policy "evaluations_delete_owner" on public.evaluations
	for delete to authenticated
	using (created_by = auth.uid());

create policy "evaluations_select_assigned_student" on public.evaluations
	for select to authenticated
	using (status = 'published' and public.student_can_read_evaluation(id));

-- ── evaluation_assignments ──────────────────────────────────────────────────

create policy "evaluation_assignments_admin_all" on public.evaluation_assignments
	for all to authenticated
	using (public.is_admin()) with check (public.is_admin());

create policy "evaluation_assignments_select_owner" on public.evaluation_assignments
	for select to authenticated
	using (public.is_evaluation_owner(evaluation_id));

-- Même règle que « Teachers can create assignments for their assessments »
-- (version mono-prof, 20260620090000).
create policy "evaluation_assignments_insert_owner" on public.evaluation_assignments
	for insert to authenticated
	with check (
		assigned_by = auth.uid()
		and public.is_evaluation_owner(evaluation_id)
		and (
			class_id is null
			or exists (
				select 1 from public.classes c
				where c.id = evaluation_assignments.class_id and public.is_teacher_or_admin()
			)
		)
		and (
			student_id is null
			or exists (
				select 1 from public.class_members cm
				where cm.student_id = evaluation_assignments.student_id and public.is_teacher_or_admin()
			)
		)
	);

create policy "evaluation_assignments_update_owner" on public.evaluation_assignments
	for update to authenticated
	using (public.is_evaluation_owner(evaluation_id))
	with check (
		assigned_by = auth.uid()
		and public.is_evaluation_owner(evaluation_id)
		and (
			class_id is null
			or exists (
				select 1 from public.classes c
				where c.id = evaluation_assignments.class_id and public.is_teacher_or_admin()
			)
		)
		and (
			student_id is null
			or exists (
				select 1 from public.class_members cm
				where cm.student_id = evaluation_assignments.student_id and public.is_teacher_or_admin()
			)
		)
	);

create policy "evaluation_assignments_delete_owner" on public.evaluation_assignments
	for delete to authenticated
	using (public.is_evaluation_owner(evaluation_id));

-- L'élève : ses assignations (nommé, ou classe dont il est membre ACTIF), et
-- seulement pour une évaluation publiée.
create policy "evaluation_assignments_select_student" on public.evaluation_assignments
	for select to authenticated
	using (
		(
			student_id = auth.uid()
			or exists (
				select 1 from public.class_members cm
				where cm.class_id = evaluation_assignments.class_id
					and cm.student_id = auth.uid()
					and cm.status = 'active'
			)
		)
		and public.student_can_read_evaluation(evaluation_id)
	);

-- ── test_sessions : restriction seulement ───────────────────────────────────
-- RESTRICTIVE : se combine en ET avec « Users can insert own test sessions ».
-- Personne ne gagne rien ; un élève perd la possibilité de rattacher sa séance
-- à une évaluation qui ne lui est pas (ou plus) ouverte.
create policy "test_sessions_evaluation_assignee_only" on public.test_sessions
	as restrictive
	for insert to authenticated
	with check (
		evaluation_id is null
		or public.student_can_read_evaluation(evaluation_id)
		or public.is_evaluation_owner(evaluation_id)
		or public.is_admin()
	);

-- ============================================================================
-- 6. Droits d'exécution
-- ============================================================================
-- ⚠️ REVOKE FROM anon seul ne suffit pas : PUBLIC garde EXECUTE (audit 2026-08).

revoke execute on function public.is_series_owner(uuid) from public, anon;
revoke execute on function public.is_evaluation_owner(uuid) from public, anon;
revoke execute on function public.student_can_read_evaluation(uuid) from public, anon;
revoke execute on function public.student_can_read_series(uuid) from public, anon;
revoke execute on function public.series_lock_guard() from public, anon;
revoke execute on function public.evaluation_series_lock_guard() from public, anon;
revoke execute on function public.test_session_evaluation_immutable() from public, anon;

grant execute on function public.is_series_owner(uuid) to authenticated, service_role;
grant execute on function public.is_evaluation_owner(uuid) to authenticated, service_role;
grant execute on function public.student_can_read_evaluation(uuid) to authenticated, service_role;
grant execute on function public.student_can_read_series(uuid) to authenticated, service_role;

-- ============================================================================
-- 7. Recopie de l'existant (rejouable)
-- ============================================================================

create or replace function public.copy_legacy_assessments()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
	v_assessment record;
	v_series_id uuid;
	v_copied integer := 0;
	v_skipped integer := 0;
	v_assignments integer;
	v_sessions integer;
	v_tasks integer;
	v_journal integer;
begin
	for v_assessment in
		select a.*
		from public.assessments a
		where not exists (
			select 1 from public.evaluations e where e.legacy_assessment_id = a.id
		)
		order by a.created_at, a.id
	loop
		if jsonb_typeof(v_assessment.categories) is distinct from 'array'
			or jsonb_array_length(v_assessment.categories) = 0
		then
			v_skipped := v_skipped + 1;
			continue;
		end if;

		insert into public.series (title, description, grade, categories, created_by, created_at, updated_at)
		values (
			v_assessment.title, v_assessment.description, v_assessment.grade,
			v_assessment.categories, v_assessment.created_by,
			v_assessment.created_at, v_assessment.updated_at
		)
		returning id into v_series_id;

		insert into public.evaluations (
			series_id, form, time_limit, max_attempts, deadline, shuffle_questions,
			academic_period_id, status, created_by, created_at, updated_at, legacy_assessment_id
		)
		values (
			v_series_id,
			'interactive',
			null, -- Entraînement : jamais de temps limite (Q30)
			nullif(v_assessment.settings ->> 'max_attempts', '')::integer,
			nullif(v_assessment.settings ->> 'deadline', '')::timestamptz,
			coalesce((v_assessment.settings ->> 'shuffle_questions')::boolean, true),
			v_assessment.academic_period_id,
			v_assessment.status,
			v_assessment.created_by,
			v_assessment.created_at,
			v_assessment.updated_at,
			v_assessment.id
		);

		v_copied := v_copied + 1;
	end loop;

	-- Assignations : même id que l'assessment_assignment d'origine
	insert into public.evaluation_assignments (id, evaluation_id, class_id, student_id, assigned_by, assigned_at)
	select aa.id, e.id, aa.class_id, aa.student_id, aa.assigned_by, aa.assigned_at
	from public.assessment_assignments aa
	join public.evaluations e on e.legacy_assessment_id = aa.assessment_id
	on conflict (id) do nothing;
	get diagnostics v_assignments = row_count;

	update public.test_sessions ts
	set evaluation_id = e.id
	from public.assessment_assignments aa
	join public.evaluations e on e.legacy_assessment_id = aa.assessment_id
	where ts.assignment_id = aa.id
		and ts.evaluation_id is null;
	get diagnostics v_sessions = row_count;

	update public.evaluation_tasks t
	set evaluation_id = e.id
	from public.evaluations e
	where e.legacy_assessment_id = t.assessment_id
		and t.evaluation_id is null;
	get diagnostics v_tasks = row_count;

	update public.journal_entry_activities j
	set evaluation_id = e.id
	from public.evaluations e
	where e.legacy_assessment_id = j.assessment_id
		and j.evaluation_id is null;
	get diagnostics v_journal = row_count;

	return jsonb_build_object(
		'series_and_evaluations', v_copied,
		'skipped_empty_categories', v_skipped,
		'assignments', v_assignments,
		'test_sessions', v_sessions,
		'evaluation_tasks', v_tasks,
		'journal_entry_activities', v_journal
	);
end;
$$;

comment on function public.copy_legacy_assessments() is
	'Recopie rejouable assessments → series/evaluations (chantier 4, étape 1). service_role seulement ; supprimée à l''étape 2.';

revoke execute on function public.copy_legacy_assessments() from public, anon, authenticated;
grant execute on function public.copy_legacy_assessments() to service_role;

do $$
declare
	v_result jsonb;
begin
	v_result := public.copy_legacy_assessments();
	raise notice 'Recopie assessments → séries/évaluations : %', v_result;
end
$$;

-- Réconciliation : toute assessment exploitable a sa série et son évaluation,
-- toute assignation et toute séance rattachée ont leur pendant.
do $$
declare
	v_missing integer;
begin
	select count(*) into v_missing
	from public.assessments a
	where jsonb_typeof(a.categories) = 'array' and jsonb_array_length(a.categories) > 0
		and not exists (select 1 from public.evaluations e where e.legacy_assessment_id = a.id);
	if v_missing > 0 then
		raise exception 'Recopie incomplète : % assessments sans évaluation', v_missing;
	end if;

	select count(*) into v_missing
	from public.assessment_assignments aa
	join public.evaluations e on e.legacy_assessment_id = aa.assessment_id
	where not exists (select 1 from public.evaluation_assignments ea where ea.id = aa.id);
	if v_missing > 0 then
		raise exception 'Recopie incomplète : % assignations sans pendant', v_missing;
	end if;

	select count(*) into v_missing
	from public.test_sessions ts
	join public.assessment_assignments aa on aa.id = ts.assignment_id
	join public.evaluations e on e.legacy_assessment_id = aa.assessment_id
	where ts.evaluation_id is distinct from e.id;
	if v_missing > 0 then
		raise exception 'Recopie incomplète : % séances sans evaluation_id', v_missing;
	end if;
end
$$;
