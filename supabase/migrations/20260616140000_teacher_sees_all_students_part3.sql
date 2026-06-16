-- ============================================================================
-- Lot 3c — « le professeur voit tous les élèves » : dernières tables manquées
-- Refactor mono-professeur — branche refactor/single-teacher
-- doc : docs/wip/single-teacher-refactor.md
-- ============================================================================
-- Le balayage principiel (toute table avec colonne student_id/user_id + policy
-- prof class-scopée) a révélé 3 tables de données élève qui passaient par
-- class_chapters / class_id (pas class_members) et avaient échappé aux lots 3a/3b.
-- On les bascule aussi vers is_my_student() (Option B, le prof voit tout).
--
-- Laissées volontairement (ressources prof, pas données perso élève) :
--   class_members (roster), python_exercise_assignments (devoirs du prof),
--   template_usage_stats (stats agrégées par classe).
-- ============================================================================

DROP POLICY IF EXISTS "Teachers can view quiz results of their students" ON public.chapter_quiz_results;
CREATE POLICY "Teachers can view quiz results of their students" ON public.chapter_quiz_results
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view checklist progress of their students" ON public.student_checklist_progress;
CREATE POLICY "Teachers can view checklist progress of their students" ON public.student_checklist_progress
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view class conversations" ON public.tutor_conversations;
CREATE POLICY "Teachers can view class conversations" ON public.tutor_conversations
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));
