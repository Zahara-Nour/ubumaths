-- =============================================================================
-- 14 policies `TO public` qui interrogent classes / class_members → `TO authenticated`
-- =============================================================================
--
-- Préparation du retrait de SELECT à `anon` sur `classes` et `class_members`.
-- Une sous-requête de policy s'exécute avec les droits de l'APPELANT : tant que
-- ces policies visent `public` (donc aussi `anon`), retirer ce privilège ferait
-- répondre 42501 à toute requête anon sur ces 10 tables au lieu de zéro ligne.
--
-- Seule la clause TO change : `ALTER POLICY … TO` conserve USING et WITH CHECK
-- tels quels (vérifié par empreinte md5 avant/après dans le test d'intégration).
--
-- Question en miroir — « qui ne pourra plus lire/écrire ce qu'il pouvait ? » :
-- PERSONNE.
--   * `authenticated` est inclus dans `public` : un utilisateur connecté garde
--     exactement les mêmes policies (les autres rôles — service_role,
--     propriétaire — contournent la RLS).
--   * `anon` n'en tirait rien. Chaque condition exige `auth.uid()` (NULL pour
--     anon) ou `is_teacher_or_admin()` (faux sans auth.uid()). Seule exception
--     apparente : la branche `target_type = 'all'` de « Users can view
--     notifications targeting them ». Mais en PROD, au 2026-10-01 :
--       - anon n'a ni SELECT sur `profiles` ni EXECUTE sur
--         `is_teacher_or_admin()` (has_table_privilege / has_function_privilege
--         = false) ; toute lecture anon de `notifications`, `conversations`,
--         `messages`, `parental_consents` finit déjà en 42501 (sous-requête
--         sur profiles), de même en local ;
--       - `notifications` ne contient aucune ligne `target_type = 'all'`
--         (4 lignes, toutes `users`).
--     Le passage à `authenticated` transforme cette erreur en « zéro ligne » :
--     anon ne gagne rien, ne perd rien d'utilisable.
--   * `class_journal_entries` : anon n'a même pas SELECT dessus (prod et local).
--
-- Les 14 policies (identiques prod / local : mêmes empreintes md5 de
-- USING || '|' || WITH CHECK, relevées le 2026-10-01) :
--   class_journal_entries  Students can view published journal entries      SELECT
--   class_schedules        Students can view schedules for their classes    SELECT
--   conversations          Users can view their conversations               SELECT
--   game_class_settings    Students can view class game settings            SELECT
--   game_class_settings    Teachers can manage own class settings           ALL
--   game_timeslots         Students can view class timeslots                SELECT
--   messages               Users can view messages in their conversations   SELECT
--   notifications          Teachers can create notifications for their classes  INSERT
--   notifications          Users can view notifications targeting them      SELECT
--   parental_consents      Teachers can insert consents for their students  INSERT
--   parental_consents      Teachers can update consents for their students  UPDATE
--   riddle_assignments     Students can view own assignments                SELECT
--   riddle_assignments     Teachers can create assignments for their riddles INSERT
--   riddle_attempts        Teachers can validate attempts                   UPDATE
--
-- Migration additive (aucune donnée touchée, aucun objet supprimé).
--
-- ROLLBACK (re-cibler public) :
--   alter policy "Students can view published journal entries" on public.class_journal_entries to public;
--   alter policy "Students can view schedules for their classes" on public.class_schedules to public;
--   alter policy "Users can view their conversations" on public.conversations to public;
--   alter policy "Students can view class game settings" on public.game_class_settings to public;
--   alter policy "Teachers can manage own class settings" on public.game_class_settings to public;
--   alter policy "Students can view class timeslots" on public.game_timeslots to public;
--   alter policy "Users can view messages in their conversations" on public.messages to public;
--   alter policy "Teachers can create notifications for their classes" on public.notifications to public;
--   alter policy "Users can view notifications targeting them" on public.notifications to public;
--   alter policy "Teachers can insert consents for their students" on public.parental_consents to public;
--   alter policy "Teachers can update consents for their students" on public.parental_consents to public;
--   alter policy "Students can view own assignments" on public.riddle_assignments to public;
--   alter policy "Teachers can create assignments for their riddles" on public.riddle_assignments to public;
--   alter policy "Teachers can validate attempts" on public.riddle_attempts to public;
-- =============================================================================

alter policy "Students can view published journal entries" on public.class_journal_entries to authenticated;
alter policy "Students can view schedules for their classes" on public.class_schedules to authenticated;
alter policy "Users can view their conversations" on public.conversations to authenticated;
alter policy "Students can view class game settings" on public.game_class_settings to authenticated;
alter policy "Teachers can manage own class settings" on public.game_class_settings to authenticated;
alter policy "Students can view class timeslots" on public.game_timeslots to authenticated;
alter policy "Users can view messages in their conversations" on public.messages to authenticated;
alter policy "Teachers can create notifications for their classes" on public.notifications to authenticated;
alter policy "Users can view notifications targeting them" on public.notifications to authenticated;
alter policy "Teachers can insert consents for their students" on public.parental_consents to authenticated;
alter policy "Teachers can update consents for their students" on public.parental_consents to authenticated;
alter policy "Students can view own assignments" on public.riddle_assignments to authenticated;
alter policy "Teachers can create assignments for their riddles" on public.riddle_assignments to authenticated;
alter policy "Teachers can validate attempts" on public.riddle_attempts to authenticated;
