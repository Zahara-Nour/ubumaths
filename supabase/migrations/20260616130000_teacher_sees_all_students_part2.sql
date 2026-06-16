-- ============================================================================
-- Lot 3b — « le professeur voit tous les élèves » : complément de périmètre
-- Refactor mono-professeur — branche refactor/single-teacher
-- doc : docs/wip/single-teacher-refactor.md
-- ============================================================================
-- La migration 20260616120000 a converti 13 policies "cœur". L'audit sécurité
-- a révélé ~21 autres policies de lecture prof encore sur le JOIN-classe →
-- incohérence (le prof voyait la progression hors-classe mais pas les warnings,
-- exos, jeu, etc.). Décision David (2026-06-16) : il est prof ET admin, il voit
-- TOUT → on bascule TOUT le périmètre prof→élève vers is_my_student().
--
-- Inclut les données sensibles RGPD (parental_consents, audit_logs,
-- welcome_emails_sent) : à documenter dans l'AIPD. Aucun risque de privilège
-- nouveau (David y accède déjà via son rôle admin).
--
-- Toujours LECTURE seule. Policies "own"/admin non touchées.
-- ============================================================================

-- --- Pédagogique / comportemental ---------------------------------------------

DROP POLICY IF EXISTS "exercise_completions_select_teacher" ON public.exercise_completions;
CREATE POLICY "exercise_completions_select_teacher" ON public.exercise_completions
	FOR SELECT TO public USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "python_exercise_submissions_select_teacher" ON public.python_exercise_submissions;
CREATE POLICY "python_exercise_submissions_select_teacher" ON public.python_exercise_submissions
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view student attempts" ON public.riddle_attempts;
CREATE POLICY "Teachers can view student attempts" ON public.riddle_attempts
	FOR SELECT TO public USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view their students progress" ON public.achievement_progress;
CREATE POLICY "Teachers can view their students progress" ON public.achievement_progress
	FOR SELECT TO public USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "anti_fraud_select_teacher_of_student" ON public.srs_anti_fraud_flags;
CREATE POLICY "anti_fraud_select_teacher_of_student" ON public.srs_anti_fraud_flags
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view active warnings for their students" ON public.student_warnings;
CREATE POLICY "Teachers can view active warnings for their students" ON public.student_warnings
	FOR SELECT TO authenticated USING (public.is_my_student(student_id) AND (deleted_at IS NULL));

DROP POLICY IF EXISTS "Teachers can view deleted warnings for their students" ON public.student_warnings;
CREATE POLICY "Teachers can view deleted warnings for their students" ON public.student_warnings
	FOR SELECT TO authenticated USING (public.is_my_student(student_id) AND (deleted_at IS NOT NULL));

DROP POLICY IF EXISTS "teachers_select_own_class_warnings" ON public.student_warnings;
CREATE POLICY "teachers_select_own_class_warnings" ON public.student_warnings
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

-- --- Jeu / gamification / marketplace -----------------------------------------

DROP POLICY IF EXISTS "Teachers can view student attempts" ON public.game_challenge_attempts;
CREATE POLICY "Teachers can view student attempts" ON public.game_challenge_attempts
	FOR SELECT TO public USING (public.is_my_student(user_id));

DROP POLICY IF EXISTS "Teachers can view student combats" ON public.game_combats;
CREATE POLICY "Teachers can view student combats" ON public.game_combats
	FOR SELECT TO public USING (public.is_my_student(organizer_id));

DROP POLICY IF EXISTS "Teachers can view student achievement progress" ON public.game_player_achievements;
CREATE POLICY "Teachers can view student achievement progress" ON public.game_player_achievements
	FOR SELECT TO public USING (public.is_my_student(user_id));

DROP POLICY IF EXISTS "Teachers can view student spells" ON public.game_spells;
CREATE POLICY "Teachers can view student spells" ON public.game_spells
	FOR SELECT TO public USING (public.is_my_student(user_id));

DROP POLICY IF EXISTS "Teachers can view student daily rewards" ON public.daily_game_rewards;
CREATE POLICY "Teachers can view student daily rewards" ON public.daily_game_rewards
	FOR SELECT TO public USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view buddies of their students" ON public.student_buddies;
CREATE POLICY "Teachers can view buddies of their students" ON public.student_buddies
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view VIP cards activity for their students" ON public.vip_cards_activity;
CREATE POLICY "Teachers can view VIP cards activity for their students" ON public.vip_cards_activity
	FOR SELECT TO authenticated USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "marketplace_listings_select_teacher" ON public.marketplace_listings;
CREATE POLICY "marketplace_listings_select_teacher" ON public.marketplace_listings
	FOR SELECT TO authenticated USING (public.is_my_student(creator_id));

DROP POLICY IF EXISTS "marketplace_proposals_select_teacher" ON public.marketplace_proposals;
CREATE POLICY "marketplace_proposals_select_teacher" ON public.marketplace_proposals
	FOR SELECT TO authenticated USING (public.is_my_student(proposer_id));

DROP POLICY IF EXISTS "marketplace_trades_select_teacher" ON public.marketplace_trades;
CREATE POLICY "marketplace_trades_select_teacher" ON public.marketplace_trades
	FOR SELECT TO authenticated USING (public.is_my_student(initiator_id));

-- --- Sensible RGPD (David y accède déjà en admin ; à noter dans l'AIPD) --------

DROP POLICY IF EXISTS "Teachers can view consents for their students" ON public.parental_consents;
CREATE POLICY "Teachers can view consents for their students" ON public.parental_consents
	FOR SELECT TO public USING (public.is_my_student(student_id));

DROP POLICY IF EXISTS "Teachers can view emails for their students" ON public.welcome_emails_sent;
CREATE POLICY "Teachers can view emails for their students" ON public.welcome_emails_sent
	FOR SELECT TO public USING (public.is_my_student(student_id));

-- audit_logs : clé élève polymorphe (record_id / old_values / new_values JSON).
-- Le prof unique voit tous les logs → is_teacher_or_admin() direct.
DROP POLICY IF EXISTS "Teachers can view audit logs for their students" ON public.audit_logs;
CREATE POLICY "Teachers can view audit logs for their students" ON public.audit_logs
	FOR SELECT TO authenticated USING (public.is_teacher_or_admin());
