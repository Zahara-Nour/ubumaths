-- Republie les tables écoutées en realtime
-- ========================================
--
-- Le baseline du 2026-06-16 est un `pg_dump` du schéma EU. `pg_dump` n'emporte
-- pas les publications : la publication `supabase_realtime` a survécu vide, et
-- tout `postgres_changes` est inerte en production depuis cette date. Un
-- abonnement à une table non publiée réussit pourtant sans erreur — d'où trois
-- mois de silence sur le chat, les notifications, la présence, les succès et le
-- multijoueur.
--
-- On republie SIX tables, et pas une de plus : celles qui portent un
-- `postgres_changes` dans `src/lib/stores/`. Chaque table publiée coûte du
-- trafic de réplication à chaque client connecté. Le test d'intégration
-- `tests/integration/realtime-publication.test.ts` refuse aussi bien une table
-- manquante qu'une table publiée que personne n'écoute.
--
-- Accès : AUCUN accès nouveau. Le realtime applique la RLS, active avec des
-- policies SELECT sur les six tables. Les DELETE échappent à la RLS chez
-- Supabase, mais les six abonnements portent un filtre serveur
-- (`user_id=eq.…`, `conversation_id=eq.…`, `user_id=in.(mes amis)`) : un client
-- ne reçoit que des lignes dont il a lui-même fourni l'identifiant.
--
-- REPLICA IDENTITY reste `default` (clé primaire seule) : on ne passe pas en
-- FULL, qui diffuserait l'ancienne ligne entière à chaque UPDATE/DELETE. Aucun
-- abonnement n'en a besoin — `presence` lit `old.user_id`, qui est la clé.
--
-- Rollback :
--   alter publication supabase_realtime drop table
--     public.messages, public.notifications, public.student_achievements,
--     public.user_presence, public.minesweeper_multiplayer_game_state,
--     public.minesweeper_multiplayer_matches;

-- La publication existe déjà sur les projets Supabase ; on la crée pour les
-- bases repartant d'un dump nu, sans quoi les ALTER ci-dessous échoueraient.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

-- Idempotent : `alter publication ... add table` échoue si la table est déjà
-- membre, et cette migration doit pouvoir se rejouer sur une base partiellement
-- publiée (le Dashboard a pu en ajouter entre-temps).
do $$
declare
  t text;
begin
  foreach t in array array[
    'messages',
    'notifications',
    'student_achievements',
    'user_presence',
    'minesweeper_multiplayer_game_state',
    'minesweeper_multiplayer_matches'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
