-- `active_student_ids()` ouverte au rôle de l'outil Supabase en lecture seule
--
-- #2598 l'a réservée à `service_role`. Or les mesures se font avec l'outil Supabase
-- en lecture seule, qui se connecte en `supabase_read_only_user` : refusé (42501).
-- Décision de David du 2026-11-12.
--
-- Accès : personne ne gagne rien. `supabase_read_only_user` lit déjà toutes les
-- tables, `profiles` et `class_members` comprises ; la fonction est `security
-- invoker` et ne fait que lire. `anon` et `authenticated` restent refusés.
--
-- Rollback :
--   revoke execute on function public.active_student_ids() from supabase_read_only_user;

grant execute on function public.active_student_ids() to supabase_read_only_user;
