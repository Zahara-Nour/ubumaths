-- Une séance de flash-cards n'est jamais rattachée à une évaluation
-- ==================================================================
--
-- Suite de 20260930120000 (mode 'flash'), recommandation de l'audit sécurité du
-- 2026-09-30. En flash-cards, `is_correct` et le score sont une AUTO-ÉVALUATION de
-- l'élève. Une séance flash portant un `assignment_id` compterait comme tentative
-- d'une évaluation notée (vue `assessment_results`, fonctions de résultats :
-- best_score, attempts_count, quota de tentatives). Les évaluations ne se passent
-- qu'en Entraînement ou en Course aux nombres (décision de David, 2026-09-30) et
-- seront corrigées par le serveur (ADR 0015).
--
-- QUESTION D'ACCÈS : aucune policy touchée, personne ne gagne ni ne perd de lecture.
-- ADDITIVE : nouvelle contrainte ; aucune séance flash n'existe encore (valide).
--
-- ROLLBACK :
--   alter table public.test_sessions drop constraint test_sessions_flash_sans_assignation;

alter table public.test_sessions add constraint test_sessions_flash_sans_assignation
	check (mode <> 'flash' or assignment_id is null);

comment on table public.test_sessions is
	'Séances des formes d''une série : display (En classe), interactive (Entraînement), course (Course aux nombres), flash (Flash-cards, jamais rattachée à une évaluation)';
