-- Le prof lit les sessions automaths de ses élèves
-- ================================================
--
-- Décision de David (2026-09-28). Question d'accès : « qui pourra lire quoi,
-- qu'il ne pouvait pas lire avant ? » → le prof (et l'admin) lira les sessions
-- automaths (`test_sessions` : score, nombre de questions, temps, date) et le
-- détail des réponses (`test_answers` : énoncé vu, réponse, juste/faux, temps)
-- de ses élèves. Personne d'autre ne gagne d'accès ; un élève ne lit toujours
-- que les siennes. Lecture SEULE : ni modification ni suppression.
--
-- Sans elle, la page prof « Résultats d'une évaluation » (`getAssessmentResults`)
-- affichait « aucun résultat » : la RLS rend zéro ligne, sans erreur.
--
-- Même règle que les tentatives (`skill_attempts_select_teacher`) :
-- `is_my_student(élève)` — en mono-prof, le prof unique ou l'admin voit tous
-- les élèves.
--
-- Additive : deux policies SELECT ajoutées, rien de retiré.
--
-- Rollback :
--   drop policy if exists "test_sessions_select_teacher" on public.test_sessions;
--   drop policy if exists "test_answers_select_teacher" on public.test_answers;

create policy "test_sessions_select_teacher"
	on public.test_sessions
	for select
	to authenticated
	using (public.is_my_student(user_id));

create policy "test_answers_select_teacher"
	on public.test_answers
	for select
	to authenticated
	using (
		exists (
			select 1
			  from public.test_sessions ts
			 where ts.id = test_answers.test_session_id
			   and public.is_my_student(ts.user_id)
		)
	);
