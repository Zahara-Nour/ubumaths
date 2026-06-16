-- ============================================================================
-- Lot 3 — « le professeur voit tous les élèves » (Option B)
-- Refactor mono-professeur — branche refactor/single-teacher
-- doc : docs/wip/single-teacher-refactor.md
-- ============================================================================
-- En mono-prof, la classe n'est plus une frontière d'accès : le prof unique
-- (et l'admin) voient les données pédagogiques de TOUS les élèves, y compris
-- hors classe. On centralise via is_my_student() et on bascule les 13 policies
-- de lecture prof du JOIN-classe vers ce helper.
--
-- NON touché : policies "own" (student_id = auth.uid()), policies admin, et
-- TOUTES les policies INSERT/UPDATE/DELETE (on n'élargit que la LECTURE).
-- teacher_id / class_members restent en place (verrouillage produit).
-- ============================================================================

-- Helper centralisé : « cet élève est-il "à moi" ? »
CREATE OR REPLACE FUNCTION public.is_my_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
	-- Option B (mono-prof) : le prof unique ou l'admin voit TOUS les élèves.
	-- p_student_id est ignoré aujourd'hui ; conservé pour flexibilité future
	-- (retour à un cloisonnement par classe / liste de suivi = un seul corps à changer).
	SELECT public.is_teacher_or_admin();
$$;

COMMENT ON FUNCTION public.is_my_student(uuid) IS
	'Refactor mono-prof (Option B) : TRUE si l''appelant est le prof unique ou un admin (voit tous les élèves). p_student_id réservé pour usage futur.';

GRANT EXECUTE ON FUNCTION public.is_my_student(uuid) TO authenticated, anon;

-- --- Policies TO authenticated -------------------------------------------------

DROP POLICY IF EXISTS "skill_attempts_select_teacher" ON public.skill_attempts;
CREATE POLICY "skill_attempts_select_teacher" ON public.skill_attempts
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "student_skill_state_a_select_teacher" ON public.student_skill_state_a;
CREATE POLICY "student_skill_state_a_select_teacher" ON public.student_skill_state_a
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "student_observable_state_select_teacher" ON public.student_observable_state;
CREATE POLICY "student_observable_state_select_teacher" ON public.student_observable_state
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "student_competence_level_select_teacher" ON public.student_competence_level;
CREATE POLICY "student_competence_level_select_teacher" ON public.student_competence_level
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view bonus history for their students" ON public.bonus_history;
CREATE POLICY "Teachers can view bonus history for their students" ON public.bonus_history
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view daily summaries for their students" ON public.daily_summaries;
CREATE POLICY "Teachers can view daily summaries for their students" ON public.daily_summaries
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view gidouilles activity for their students" ON public.gidouilles_activity;
CREATE POLICY "Teachers can view gidouilles activity for their students" ON public.gidouilles_activity
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view reward events for their students" ON public.reward_events;
CREATE POLICY "Teachers can view reward events for their students" ON public.reward_events
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view weekly rewards for their students" ON public.weekly_rewards;
CREATE POLICY "Teachers can view weekly rewards for their students" ON public.weekly_rewards
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view student profiles in their classes" ON public.profiles;
CREATE POLICY "Teachers can view student profiles in their classes" ON public.profiles
	FOR SELECT TO authenticated USING ((role = 'student'::user_role) AND public.is_my_student(id));

-- --- Policies TO public --------------------------------------------------------

DROP POLICY IF EXISTS "Teachers can view their students achievements" ON public.student_achievements;
CREATE POLICY "Teachers can view their students achievements" ON public.student_achievements
	FOR SELECT TO public USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view student game profiles" ON public.game_players;
CREATE POLICY "Teachers can view student game profiles" ON public.game_players
	FOR SELECT TO public USING (public.is_my_student(user_id));

DROP POLICY IF EXISTS "Teachers can view student weekly best" ON public.weekly_best_rewards;
CREATE POLICY "Teachers can view student weekly best" ON public.weekly_best_rewards
	FOR SELECT TO public USING (public.is_my_student(student_id));
