-- Le support de classe se ferme quand l'élève quitte la classe
-- ============================================================
--
-- Depuis le 2026-09-13, retirer un élève d'une classe l'ARCHIVE : la ligne de
-- `class_members` reste, avec `status = 'archived'`. Dix-neuf policies « élève »
-- testent l'EXISTENCE d'une adhésion sans regarder son statut : un ancien élève
-- lit donc encore ce que la classe porte.
--
-- ⚠️ QUI PERD QUOI (question d'accès posée à David le 2026-09-15, réponse :
-- « couper le support de classe, garder leurs traces ») :
--
--   Les 77 élèves des 5 classes de l'an dernier (classes elles-mêmes inactives)
--   perdent l'emploi du temps, le cahier de texte et ses devoirs, les documents
--   et supports partagés, les liens Google Classroom, les modèles de message de
--   classe, les réglages et créneaux de jeu, les affectations d'évaluation, les
--   tâches d'évaluation et leur périmètre, et les énigmes de ces classes.
--
--   Ils NE perdent PAS ce qui est à eux. Aucune table de trace d'élève n'est
--   touchée ici, et aucune requête du produit ne joint ces tables en `!inner`
--   depuis une donnée d'élève (vérifié par grep le 2026-09-15). Le principe est
--   celui déjà retenu le 2026-09-12 pour les signalements d'erreur : la fiche
--   appartient à la classe, le signalement appartient à l'élève.
--
-- Exposition réelle mesurée avant écriture (prod, 2026-09-15) : 11 emplois du
-- temps, 4 supports partagés, 1 coursework partagé. Tout le reste est à zéro —
-- y compris `assessment_assignments`, dont le trou est structurel et non vécu.
--
-- ⚠️ NON TRAITÉ ICI, sciemment :
--   * `classes` / `view_member_classes` — c'est la FONDATION : une quinzaine
--     d'écrans élève joignent `classes!inner`, et la couper effacerait la ligne
--     PARENTE de leurs propres données. À mesurer séparément.
--   * `rag_documents` / `rag_chunks` — forme différente (« membre d'une classe,
--     n'importe laquelle »), la couper retirerait les documents du professeur.
--   * `minesweeper_tournaments` et ses deux tables — un tournoi porte aussi les
--     PARTIES de l'élève : il faut y séparer le support de la trace.
--   * `is_kanban_board_member()` — le filtre y casse le DELETE (piège vécu le
--     2026-09-15, cf. `20260915420000`).
--   * Les 13 policies « professeur » — les filtrer lui retirerait le droit
--     d'agir sur un ancien élève ; tranché : on garde.
--
-- ROLLBACK : rejouer chaque `alter policy` ci-dessous en retirant la seule
-- conjonction ajoutée (`... .status = 'active'`), et les deux fonctions en
-- retirant la même. Aucune donnée n'est touchée — seule la visibilité change.
-- Le texte antérieur des policies est dans `20260616220000_baseline_schema.sql`.

-- ── Organisation de la classe ──────────────────────────────────────────────

alter policy "Students can view schedules for their classes" on public.class_schedules
using (
	exists (
		select 1 from public.class_members
		where class_members.class_id = class_schedules.class_id
			and class_members.student_id = auth.uid()
			and class_members.status = 'active'
	)
);

alter policy "Students can view published journal entries" on public.class_journal_entries
using (
	is_published = true
	and entry_date <= current_date
	and exists (
		select 1 from public.class_members
		where class_members.class_id = class_journal_entries.class_id
			and class_members.student_id = auth.uid()
			and class_members.status = 'active'
	)
);

alter policy "Students read homework of visible entries" on public.journal_entry_homework
using (
	exists (
		select 1
		from public.class_journal_entries e
		join public.class_members m on m.class_id = e.class_id
		where e.id = journal_entry_homework.entry_id
			and e.is_published
			and e.entry_date <= current_date
			and m.student_id = auth.uid()
			and m.status = 'active'
	)
);

-- ── Documents et supports ──────────────────────────────────────────────────

alter policy "Students can view coursework categories for their classes" on public.coursework_categories
using (
	exists (
		select 1 from public.class_members
		where class_members.class_id = coursework_categories.class_id
			and class_members.student_id = auth.uid()
			and class_members.status = 'active'
	)
);

alter policy "Students can view visible shared coursework for their classes" on public.shared_coursework
using (
	visible = true
	and exists (
		select 1 from public.class_members
		where class_members.class_id = shared_coursework.class_id
			and class_members.student_id = auth.uid()
			and class_members.status = 'active'
	)
	and (
		not exists (
			select 1 from public.shared_coursework_students
			where shared_coursework_students.shared_coursework_id = shared_coursework.id
		)
		or exists (
			select 1 from public.shared_coursework_students scs
			where scs.shared_coursework_id = shared_coursework.id
				and scs.student_id = auth.uid()
		)
	)
);

alter policy "Students can view materials for shared coursework" on public.coursework_materials
using (
	exists (
		select 1
		from public.shared_coursework sc
		join public.class_members cm on cm.class_id = sc.class_id
		where sc.coursework_id = coursework_materials.coursework_id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
			and sc.visible = true
	)
);

alter policy "Students can view visible shared materials in their classes" on public.shared_materials
using (
	visible = true
	and exists (
		select 1
		from public.class_members cm
		join public.profiles p on p.id = cm.student_id
		where cm.class_id = shared_materials.class_id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
			and p.is_test = false
	)
);

-- ── Google Classroom ───────────────────────────────────────────────────────

alter policy "Students can view Google Classroom links for their classes" on public.class_google_classroom_links
using (
	exists (
		select 1 from public.class_members
		where class_members.class_id = class_google_classroom_links.class_id
			and class_members.student_id = auth.uid()
			and class_members.status = 'active'
	)
);

alter policy "Students can view coursework shared with their classes" on public.google_classroom_coursework
using (
	exists (
		select 1
		from public.shared_coursework sc
		join public.class_members cm on cm.class_id = sc.class_id
		where sc.coursework_id = google_classroom_coursework.id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
			and sc.visible = true
	)
);

alter policy "Students can view materials shared with their classes" on public.google_classroom_materials
using (
	exists (
		select 1
		from public.shared_materials sm
		join public.class_members cm on cm.class_id = sm.class_id
		join public.profiles p on p.id = cm.student_id
		where sm.material_id = google_classroom_materials.id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
			and p.is_test = false
			and sm.visible = true
	)
);

alter policy "Students can view topics for shared materials" on public.google_classroom_topics
using (
	exists (
		select 1
		from public.shared_materials sm
		join public.class_members cm on cm.class_id = sm.class_id
		where sm.topic_id = google_classroom_topics.id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
			and sm.visible = true
	)
);

alter policy "Students can view attachments for shared materials" on public.google_classroom_material_attachments
using (
	exists (
		select 1
		from public.shared_materials sm
		join public.class_members cm on cm.class_id = sm.class_id
		join public.profiles p on p.id = cm.student_id
		where sm.material_id = google_classroom_material_attachments.google_material_id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
			and p.is_test = false
			and sm.visible = true
	)
);

-- ── Modèles de message de classe ───────────────────────────────────────────
-- ⚠️ Celle-ci avait échappé au premier inventaire : son expression contient le
-- mot « status », mais c'est `approval_status`, sur une autre table.

alter policy "student_view_templates" on public.message_templates
using (
	is_active = true
	and approval_status = 'approved'
	and (
		scope = 'system'
		or (
			scope = 'class'
			and class_id in (
				select class_members.class_id
				from public.class_members
				where class_members.student_id = auth.uid()
					and class_members.status = 'active'
			)
		)
	)
);

-- ── Jeux : réglages et créneaux de la classe ───────────────────────────────

alter policy "Students can view class game settings" on public.game_class_settings
using (
	exists (
		select 1 from public.class_members cm
		where cm.class_id = game_class_settings.class_id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
	)
);

alter policy "Students can view class timeslots" on public.game_timeslots
using (
	exists (
		select 1 from public.class_members cm
		where cm.class_id = game_timeslots.class_id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
	)
);

-- ── Évaluations ────────────────────────────────────────────────────────────
-- ⚠️ `assessment_assignments` est EXACTEMENT la policy que la PR #305 a fermée
-- côté route : la route disait non, la base disait oui.

alter policy "Students can view own assignments" on public.assessment_assignments
using (
	student_id = auth.uid()
	or exists (
		select 1 from public.class_members cm
		where cm.class_id = assessment_assignments.class_id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
	)
);

-- Le pendant SQL de la policy ci-dessus, utilisé par
-- « Students can view assigned assessments » sur `assessments`.
create or replace function public.student_has_assignment_for_assessment(p_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
	select exists (
		select 1
		from public.assessment_assignments aa
		where aa.assessment_id = p_assessment_id
			and (
				aa.student_id = auth.uid()
				or exists (
					select 1
					from public.class_members cm
					where cm.class_id = aa.class_id
						and cm.student_id = auth.uid()
						and cm.status = 'active'
				)
			)
	);
$function$;

alter policy "evaluation_tasks_select_student" on public.evaluation_tasks
using (
	class_id is not null
	and class_id in (
		select cm.class_id from public.class_members cm
		where cm.student_id = auth.uid()
			and cm.status = 'active'
	)
);

alter policy "evaluation_task_perimeter_select_student" on public.evaluation_task_perimeter
using (
	exists (
		select 1 from public.evaluation_tasks t
		where t.id = evaluation_task_perimeter.task_id
			and t.class_id is not null
			and t.class_id in (
				select cm.class_id from public.class_members cm
				where cm.student_id = auth.uid()
					and cm.status = 'active'
			)
	)
);

-- ── Énigmes ────────────────────────────────────────────────────────────────

alter policy "Students can view own assignments" on public.riddle_assignments
using (
	student_id = auth.uid()
	or exists (
		select 1 from public.class_members cm
		where cm.class_id = riddle_assignments.class_id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
	)
);

create or replace function public.is_riddle_assigned_to_student(p_riddle_id uuid, p_student_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
	-- Affectée nommément, ou à une classe où l'élève est ENCORE inscrit.
	return exists (
		select 1 from riddle_assignments ra
		where ra.riddle_id = p_riddle_id
			and (
				ra.student_id = p_student_id
				or exists (
					select 1 from class_members cm
					where cm.class_id = ra.class_id
						and cm.student_id = p_student_id
						and cm.status = 'active'
				)
			)
	);
end;
$function$;

-- ── Garde : aucune des 19 ne doit avoir été oubliée ────────────────────────
-- Dix-neuf `alter policy` écrits à la main, c'est dix-neuf occasions de se
-- tromper de nom et de ne rien casser visiblement. Cette vérification échoue la
-- migration plutôt que de la laisser passer à moitié.

do $$
declare
	v_manquantes text;
begin
	select string_agg(format('%s / %s', tablename, policyname), ', ')
	into v_manquantes
	from pg_policies
	where schemaname = 'public'
		and (tablename, policyname) in (
			('class_schedules', 'Students can view schedules for their classes'),
			('class_journal_entries', 'Students can view published journal entries'),
			('journal_entry_homework', 'Students read homework of visible entries'),
			('coursework_categories', 'Students can view coursework categories for their classes'),
			('shared_coursework', 'Students can view visible shared coursework for their classes'),
			('coursework_materials', 'Students can view materials for shared coursework'),
			('shared_materials', 'Students can view visible shared materials in their classes'),
			('class_google_classroom_links', 'Students can view Google Classroom links for their classes'),
			('google_classroom_coursework', 'Students can view coursework shared with their classes'),
			('google_classroom_materials', 'Students can view materials shared with their classes'),
			('google_classroom_topics', 'Students can view topics for shared materials'),
			('google_classroom_material_attachments', 'Students can view attachments for shared materials'),
			('message_templates', 'student_view_templates'),
			('game_class_settings', 'Students can view class game settings'),
			('game_timeslots', 'Students can view class timeslots'),
			('assessment_assignments', 'Students can view own assignments'),
			('evaluation_tasks', 'evaluation_tasks_select_student'),
			('evaluation_task_perimeter', 'evaluation_task_perimeter_select_student'),
			('riddle_assignments', 'Students can view own assignments')
		)
		and coalesce(qual, '') not like '%status = ''active''%';

	if v_manquantes is not null then
		raise exception 'Policies sans filtre de statut après migration : %', v_manquantes;
	end if;
end
$$;
