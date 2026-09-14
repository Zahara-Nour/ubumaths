-- Progression d'objectifs : figée quand l'élève quitte la classe
-- ===============================================================
--
-- `student_checklist_progress` avait une policy INSERT correctement gardée
-- (chapitre visible + `is_class_student`), mais ses policies UPDATE et DELETE
-- ne vérifiaient QUE `student_id = auth.uid()` — aucune condition
-- d'appartenance. Un élève archivé ne pouvait donc plus CRÉER de progression,
-- mais pouvait continuer à cocher et décocher indéfiniment celle qu'il avait
-- déjà, dans le chapitre d'une classe qu'il a quittée. Et le professeur lit
-- cette progression (`Teachers can view checklist progress of their students`).
--
-- La migration `20260915220000` a resserré `is_class_student`, ce qui ferme la
-- création ; elle ne pouvait rien pour la modification, qui ne passait pas par
-- cette fonction.
--
-- QUESTION D'ACCÈS, posée et tranchée par David le 2026-09-14 : la progression
-- d'un élève archivé est **figée**. Il la voit — la policy SELECT n'est pas
-- touchée — il ne la change plus. C'est le prolongement de « il relit ce qu'il
-- a reçu, il ne reçoit plus rien ensuite ».
--
-- Le garde est le MÊME que celui de l'INSERT, délibérément : trois policies qui
-- disent la même règle de trois façons finissent par diverger.
--
-- ROLLBACK — rétablir les deux policies sans condition d'appartenance :
--
--   drop policy if exists "Students can update their own checklist progress"
--     on public.student_checklist_progress;
--   create policy "Students can update their own checklist progress"
--     on public.student_checklist_progress for update to authenticated
--     using (student_id = auth.uid()) with check (student_id = auth.uid());
--
--   drop policy if exists "Students can delete their own checklist progress"
--     on public.student_checklist_progress;
--   create policy "Students can delete their own checklist progress"
--     on public.student_checklist_progress for delete to authenticated
--     using (student_id = auth.uid());

drop policy if exists "Students can update their own checklist progress"
	on public.student_checklist_progress;

create policy "Students can update their own checklist progress"
	on public.student_checklist_progress
	for update
	to authenticated
	using (
		student_id = auth.uid()
		and exists (
			select 1
			from chapter_checklist_items cci
			join class_chapters ch on ch.id = cci.chapter_id
			where cci.id = student_checklist_progress.checklist_item_id
				and ch.is_visible = true
				and is_class_student(ch.class_id)
		)
	)
	with check (
		student_id = auth.uid()
		and exists (
			select 1
			from chapter_checklist_items cci
			join class_chapters ch on ch.id = cci.chapter_id
			where cci.id = student_checklist_progress.checklist_item_id
				and ch.is_visible = true
				and is_class_student(ch.class_id)
		)
	);

drop policy if exists "Students can delete their own checklist progress"
	on public.student_checklist_progress;

create policy "Students can delete their own checklist progress"
	on public.student_checklist_progress
	for delete
	to authenticated
	using (
		student_id = auth.uid()
		and exists (
			select 1
			from chapter_checklist_items cci
			join class_chapters ch on ch.id = cci.chapter_id
			where cci.id = student_checklist_progress.checklist_item_id
				and ch.is_visible = true
				and is_class_student(ch.class_id)
		)
	);
