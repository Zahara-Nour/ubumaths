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
-- Accès, INSERT et UPDATE : aucun accès nouveau. Le realtime évalue la RLS par
-- abonné, active avec des policies SELECT sur les six tables. Le `filter`
-- d'abonnement est choisi par le client : c'est une économie de trafic, jamais
-- un contrôle. Le rempart est la RLS, et elle tient.
--
-- Accès, DELETE : la RLS ne s'y applique pas (Postgres ne peut plus vérifier
-- l'accès à une ligne supprimée), ET le `filter` ne s'y applique pas non plus
-- tant que la replica identity vaut `default`. Les deux remparts tombent
-- ensemble. Ce qui part alors à tout abonné est la charge utile `old`, c'est-à-
-- dire la CLÉ PRIMAIRE seule :
--   - `messages`, `notifications`, `student_achievements`,
--     `minesweeper_multiplayer_matches` → un `id` de ligne opaque, inoffensif ;
--   - `minesweeper_multiplayer_game_state` → `(match_id, player_id)` ;
--   - `user_presence` → la PK EST `user_id`. L'UUID d'un utilisateur dont la
--     présence est purgée (rétention 30 j) ou dont le compte est supprimé
--     (CASCADE depuis `profiles`, effacement RGPD compris) est diffusé aux
--     abonnés. UUID pseudonyme, sans nom ni statut ni horodatage métier.
--
-- REPLICA IDENTITY reste `default`, et le test d'intégration l'ancre. Passer en
-- FULL rendrait certes le filtre applicable aux DELETE, mais la RLS resterait
-- inappliquée, le filtre resterait choisi par le client — et on diffuserait en
-- prime l'ancienne ligne ENTIÈRE à chaque UPDATE. Le remède serait pire.
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
    -- Sans clause, Postgres publierait aussi `truncate` ; Supabase ne le fait
    -- pas. On reste fidèle pour que le local dise la vérité sur la prod.
    create publication supabase_realtime with (publish = 'insert, update, delete');
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
