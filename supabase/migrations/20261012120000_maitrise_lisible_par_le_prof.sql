-- Le prof lit l'auto-évaluation des élèves de ses classes (décision de David, 2026-10-10, option b)
--
-- Qui gagne quel accès : le prof (et l'admin) peut LIRE `student_exercise_mastery`
-- — maîtrisé / à revoir / pas travaillé, exercice par exercice — pour les élèves
-- inscrits dans une classe. Rien d'autre : ni écriture, ni élève hors classe.
-- Les élèves ne gagnent rien : chacun ne lit toujours que ses propres lignes.
--
-- Pourquoi : la page « Progression » d'une assignation (2026-08-29) lit cette
-- table sous RLS. Seule la règle « l'élève voit les siennes » existait : le prof
-- recevait zéro ligne, sans erreur, et la page n'a jamais rien affiché.
--
-- `is_teacher_of_student` est la règle des autres tables : prof ou admin, et
-- élève présent dans `class_members`.
--
-- Additive. Tests : tests/integration/maitrise-lisible-par-le-prof.test.ts
-- (rouges sans cette migration : le prof lisait []).
--
-- Rollback :
--   drop policy if exists "Teachers can view mastery of their students"
--     on public.student_exercise_mastery;

create policy "Teachers can view mastery of their students"
	on public.student_exercise_mastery
	for select
	to authenticated
	using (public.is_teacher_of_student(student_id));
