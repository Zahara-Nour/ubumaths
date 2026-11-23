-- Un élève ne quitte plus seul sa classe (#1788, point 4)
--
-- La policy « students_can_leave » (DELETE sur class_members, student_id =
-- auth.uid()) date d'avant le mono-professeur. Aucun écran ne s'en sert, mais
-- un élève connecté pouvait, par l'API, effacer sa propre ligne de classe : il
-- sortait de la classe à l'insu du professeur et sa trace disparaissait, alors
-- que depuis le 2026-09-13 retirer un élève l'ARCHIVE (la ligne reste).
--
-- Qui perd quoi : les élèves ne peuvent plus supprimer leur ligne de
-- class_members. Le professeur (teachers_remove_members) et l'admin
-- (admins_delete_class_members) gardent leur DELETE. Aucune donnée supprimée.
--
-- Test : tests/integration/eleve-ne-quitte-pas-seul-sa-classe.test.ts
--
-- Rollback (recrée la policy telle qu'au schéma de base) :
--   create policy "students_can_leave" on public.class_members
--     for delete to authenticated using (student_id = auth.uid());

drop policy if exists "students_can_leave" on public.class_members;
