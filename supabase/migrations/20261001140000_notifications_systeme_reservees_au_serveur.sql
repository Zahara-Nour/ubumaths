-- Notifications système : écrites par le serveur seul
-- =====================================================
--
-- Faille : la policy « Users can create system notifications » (INSERT, TO public)
-- n'exigeait que is_system = true, created_by IS NULL et un system_event_type.
-- N'importe quel élève connecté pouvait donc créer une notification « système »
-- ciblant toute l'école (target_type = 'all'), sans auteur visible.
--
-- Correctif : la policy ne vise plus que service_role. Le code serveur crée
-- désormais toutes les notifications système avec le client service
-- (`insertSystemNotification`, src/lib/server/notifications.ts). Les fonctions SQL
-- qui en créent (run_weekly_rewards, run_daily_summaries,
-- create_error_report_notification, award_weekly_best_bonuses) sont
-- SECURITY DEFINER et ne dépendent pas de cette policy.
--
-- Au passage, « Admins can create any notification » passe de public à
-- authenticated : anon n'y était bloqué que parce que sa sous-requête sur
-- profiles ne trouvait rien.
--
-- Qui perd quoi : élèves et professeur ne peuvent plus créer de notification
-- système depuis leur session. Le professeur garde sa policy « pour ses classes »,
-- l'admin garde la sienne. Aucune donnée touchée.
--
-- ROLLBACK :
--   alter policy "Users can create system notifications" on public.notifications to public;
--   alter policy "Admins can create any notification" on public.notifications to public;

alter policy "Users can create system notifications" on public.notifications to service_role;

alter policy "Admins can create any notification" on public.notifications to authenticated;
