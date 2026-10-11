-- ============================================================================
-- Énigmes : une tentative ne s'écrit plus que par le serveur (1/2)
-- ============================================================================
--
-- Constat (audit de #1077, 2026-10-11, mesuré en prod) : la policy « Students can create
-- own attempts » laisse l'élève insérer via PostgREST une tentative avec `is_correct` et
-- `gidouilles_awarded` de son choix — il se met en tête du classement de son école.
-- (`submit_riddle_attempt`, qui prend aussi `p_is_correct` de l'appelant, est traitée en
-- deux temps : la route passe au client service dans la même PR, puis une 2ᵉ migration
-- retire EXECUTE à `authenticated` après le `deploy:prod`.)
-- La vue `riddle_progress` n'a plus de lecteur depuis #1079 (le classement passe par
-- `riddle_school_leaderboard`) ; elle reste lisible par tout compte connecté.
--
-- Décision de David (2026-10-11) : correction des énigmes côté serveur seulement ;
-- retirer l'accès à la vue, sans la supprimer.
--
-- Qui perd quoi : l'élève ne peut plus insérer lui-même une tentative (aucun code ne le
-- faisait : la soumission passe par `submit_riddle_attempt`, SECURITY DEFINER) ; les
-- comptes connectés et anon ne lisent plus `riddle_progress`. Personne ne gagne d'accès.
-- Aucune donnée touchée (prod : `riddle_attempts` vide).
--
-- Prouvé par tests/integration/enigmes-tentatives-par-le-serveur.test.ts.
--
-- ROLLBACK :
--   CREATE POLICY "Students can create own attempts" ON public.riddle_attempts
--     FOR INSERT WITH CHECK ((student_id = auth.uid()) AND is_student());
--   GRANT ALL ON public.riddle_progress TO anon, authenticated;  -- droits du baseline
-- ============================================================================

DROP POLICY "Students can create own attempts" ON public.riddle_attempts;

REVOKE ALL ON public.riddle_progress FROM anon, authenticated;
