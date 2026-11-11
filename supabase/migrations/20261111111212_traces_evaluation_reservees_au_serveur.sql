-- =============================================================================
-- Traces d'un contrôle réservées au serveur (ADR 0038, chantier formes-de-serie)
-- =============================================================================
--
-- Un élève insère ses traces directement par PostgREST
-- (`skill_attempts_insert_own_student`). Depuis la migration
-- 20261111092522_traces_lieu_durees_reponses.sql, il pouvait y écrire une trace
-- `place = 'evaluation'`, que le prof lirait « faite en contrôle ».
--
-- Accès (question tranchée par David, 2026-11-11) : l'élève ne peut plus écrire
-- de trace « contrôle » ; seul le serveur (client service, qui contourne la RLS)
-- les écrit. Personne ne gagne d'accès. Qui perd quoi : l'élève, l'écriture des
-- traces `evaluation` — aucune n'existait en prod (33 traces, toutes sans lieu).
--
-- Inchangé : l'élève écrit ses traces sans lieu (les contrôles d'aujourd'hui
-- passent par `recordSeriesReviews` avec son jeton, sans lieu) et celles des
-- autres lieux. `is distinct from` garde le lieu NULL accepté.
--
-- Rollback (rend l'écriture `evaluation` à l'élève, rien d'autre) :
--   alter policy "skill_attempts_insert_own_student" on public.skill_attempts
--     with check (
--       student_id = auth.uid()
--       and source = any (array['auto', 'srs', 'student_self'])
--       and code is null
--       and task_id is null
--     );
-- =============================================================================

alter policy "skill_attempts_insert_own_student" on public.skill_attempts
	with check (
		student_id = auth.uid()
		and source = any (array['auto', 'srs', 'student_self'])
		and code is null
		and task_id is null
		and place is distinct from 'evaluation'
	);

comment on policy "skill_attempts_insert_own_student" on public.skill_attempts is
	'L''élève insère ses propres traces en source auto/srs/student_self, jamais une trace de contrôle (place = evaluation : écrite par le serveur, ADR 0038). Famille B reste réservée au prof (skill_attempts_insert_teacher).';
