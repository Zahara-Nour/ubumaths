-- ============================================================================
-- Données de jeu privées ; constructions publiques réservées aux comptes connectés
-- ============================================================================
--
-- Mesuré en prod le 2026-10-11 (relevé pendant B6, et D17) :
--   * policy SELECT `using (true)` pour tout compte connecté, toutes écoles confondues,
--     sur mathemo_scores (19 lignes), minesweeper_student_achievements (74),
--     minesweeper_player_stats (0) et marketplace_listing_views (0). Toutes les lectures
--     du code portent sur les données de l'élève lui-même ; les classements passent par
--     des fonctions SECURITY DEFINER bornées à l'école ; les vues qui les lisent avec
--     les droits du lecteur ne sont lues que pour l'élève lui-même
--     (minesweeper_student_achievement_progress) ou pas du tout.
--   * « Users can read public constructions » (rôle public) : anon lisait les 9
--     constructions publiques, alors qu'aucune page publique ne les lit (seules des
--     pages protégées).
-- Prouvé par tests/integration/lectures-ouvertes-fermees.test.ts.
--
-- Décision de David (2026-10-11) : chacun ne lit que ses données de jeu ; les
-- constructions publiques sont réservées aux comptes connectés. En miroir — qui perd
-- quoi : tout compte connecté (élève, prof ou admin : aucune policy prof n'existait,
-- aucun code ne lit ces données d'autrui) perd la lecture des données de jeu d'autrui ; anon perd la lecture
-- des constructions publiques. Chacun garde ses propres données.
--
-- Aucune donnée touchée (policies seulement : règle de David du 2026-10-11 sur les
-- DROP POLICY sans perte de donnée).
--
-- ROLLBACK :
--   DROP POLICY "Users can view own mathemo scores" ON public.mathemo_scores;
--   CREATE POLICY "Authenticated users can view mathemo scores" ON public.mathemo_scores
--     FOR SELECT TO authenticated USING (true);
--   DROP POLICY "Users can view own achievement unlocks" ON public.minesweeper_student_achievements;
--   CREATE POLICY "Students can view all achievement unlocks"
--     ON public.minesweeper_student_achievements FOR SELECT TO authenticated USING (true);
--   DROP POLICY "Users can view own player stats" ON public.minesweeper_player_stats;
--   CREATE POLICY select_all_player_stats ON public.minesweeper_player_stats
--     FOR SELECT TO authenticated USING (true);
--   DROP POLICY "Users can view own listing views" ON public.marketplace_listing_views;
--   CREATE POLICY "Users can view all listing views" ON public.marketplace_listing_views
--     FOR SELECT TO authenticated USING (true);
--   DROP POLICY "Authenticated users can read public constructions" ON public.constructions;
--   CREATE POLICY "Users can read public constructions" ON public.constructions
--     FOR SELECT USING (is_public = true);
-- ============================================================================

DROP POLICY "Authenticated users can view mathemo scores" ON public.mathemo_scores;
CREATE POLICY "Users can view own mathemo scores" ON public.mathemo_scores
	FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY "Students can view all achievement unlocks" ON public.minesweeper_student_achievements;
CREATE POLICY "Users can view own achievement unlocks" ON public.minesweeper_student_achievements
	FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));

DROP POLICY select_all_player_stats ON public.minesweeper_player_stats;
CREATE POLICY "Users can view own player stats" ON public.minesweeper_player_stats
	FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));

DROP POLICY "Users can view all listing views" ON public.marketplace_listing_views;
CREATE POLICY "Users can view own listing views" ON public.marketplace_listing_views
	FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY "Users can read public constructions" ON public.constructions;
CREATE POLICY "Authenticated users can read public constructions" ON public.constructions
	FOR SELECT TO authenticated USING (is_public = true);
