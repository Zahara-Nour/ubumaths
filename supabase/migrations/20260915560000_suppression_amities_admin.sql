-- L'admin peut retirer une amitié — et l'écran cessait de mentir
-- ===============================================================
--
-- Trouvé par `security-auditor`. Préexistant, mais le chantier « profils » le
-- rend sérieux : à partir de `20260915520000`, une amitié acceptée OUVRE le
-- profil de l'autre. Un outil de modération qui ne supprime rien devient donc
-- un outil qui laisse un accès ouvert.
--
-- La policy testait le rôle en dur :
--
--   exists (select 1 from profiles
--           where profiles.id = auth.uid() and profiles.role = 'teacher')
--
-- Pas `is_teacher_or_admin()`. Le rôle `admin` n'était couvert par AUCUNE
-- policy DELETE. Or `dashboard/admin/friendships` laisse passer l'admin
-- (`requireRole(profile, ['teacher', 'admin'])`) puis supprime via
-- `locals.supabase`, soumis à la RLS.
--
-- ⚠️ Résultat : `.delete()` affectait ZÉRO ligne, `error` valait `null`, et
-- l'action rendait `{ success: true }`. Un admin qui retire une amitié
-- signalée — deux élèves mineurs — voyait « c'est fait », et l'amitié restait.
--
-- QUESTION D'ACCÈS : l'admin peut déjà tout lire (`is_admin()` sur `profiles`)
-- et gère les comptes. Lui rendre la suppression d'amitié n'ouvre aucune
-- donnée nouvelle ; ça répare un outil de safeguarding.
--
-- ⚠️ LA MOITIÉ SELECT A LE MÊME DÉFAUT, et la corriger seule ne servirait à
-- rien. `Teachers can view all student friendships` teste le même rôle en dur,
-- donc la liste de la page est VIDE pour l'admin : on lui rendrait un bouton
-- qu'il ne peut pas atteindre, sur un écran qui affiche « aucune amitié » et
-- des statistiques à zéro. Les deux policies vont ensemble.
--
-- ROLLBACK :
--   drop policy if exists "Teachers can delete student friendships" on public.friendships;
--   create policy "Teachers can delete student friendships"
--       on public.friendships for delete to authenticated
--       using (exists (select 1 from public.profiles
--                      where profiles.id = auth.uid() and profiles.role = 'teacher'));
--   drop policy if exists "Teachers can view all student friendships" on public.friendships;
--   create policy "Teachers can view all student friendships"
--       on public.friendships for select to authenticated
--       using (exists (select 1 from public.profiles
--                      where profiles.id = auth.uid() and profiles.role = 'teacher'));

drop policy if exists "Teachers can delete student friendships" on public.friendships;
create policy "Teachers can delete student friendships"
    on public.friendships for delete to authenticated
    using (public.is_teacher_or_admin());

drop policy if exists "Teachers can view all student friendships" on public.friendships;
create policy "Teachers can view all student friendships"
    on public.friendships for select to authenticated
    using (public.is_teacher_or_admin());
