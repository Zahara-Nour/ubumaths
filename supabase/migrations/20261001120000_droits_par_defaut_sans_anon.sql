-- Privilèges par défaut : les FUTURES tables et séquences de `public` ne donnent
-- plus aucun droit au rôle `anon` (visiteur non connecté)
-- ==============================================================================
--
-- Pourquoi : chaque table créée par `postgres` dans `public` héritait de
-- `anon=arwdxtm` (SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, MAINTAIN)
-- et chaque séquence de `anon=rwU`. Seule la RLS séparait alors le visiteur des
-- données : une table oubliée sans RLS, ou une policy trop large, suffisait à
-- exposer des données d'élèves. Les migrations 20261001110000 (chapitres) et
-- antérieures retiraient ces droits table par table, après coup.
--
-- Portée (décision de David, 2026-10-01) : objets FUTURS uniquement.
--   - Personne ne gagne aucun accès.
--   - En miroir, aucun GRANT existant n'est retiré : les tables déjà créées
--     (ex. `question_templates`, lue sans connexion) gardent leurs droits.
--   - `authenticated` et `service_role` ne sont pas touchés.
--   - Les privilèges par défaut de `supabase_admin` ne sont pas modifiables
--     depuis une migration (rôle non accessible à `postgres`) : non traités.
--
-- Fonctions (décision de David, Q62) : les FUTURES fonctions créées par
-- `postgres` ne sont plus exécutables par PUBLIC, donc par `anon`.
-- L'entrée `public` de `postgres` ne nommait ni `anon` ni PUBLIC, mais un
-- `... in schema public` ne peut qu'AJOUTER au défaut global : le défaut câblé
-- de Postgres (EXECUTE à PUBLIC) s'appliquait donc toujours (mesuré en local et
-- en prod le 2026-10-01). D'où la forme GLOBALE, sans `in schema`.
--   - `authenticated` et `service_role` gardent EXECUTE sur les fonctions
--     neuves de `public` grâce à l'entrée du schéma (inchangée).
--   - `storage` : son entrée donne X explicitement à anon et authenticated,
--     inchangée. `postgres` ne crée aucune fonction dans `storage` par migration.
--   - Autres schémas : les migrations ne créent des fonctions que dans `public`.
--     Seule exception à connaître : une FUTURE `create extension` lancée par
--     `postgres` hors `public` (ex. schéma `extensions`) créerait des fonctions
--     sans EXECUTE pour PUBLIC → `grant execute` explicite si elles sont
--     appelées par `authenticated` / `anon`.
--   - Fonctions existantes : inchangées.
--
-- RÈGLE POUR L'AVENIR : une table (ou séquence) qu'une page publique doit lire
-- SANS connexion demande un GRANT explicite dans sa migration, PLUS une policy :
--   grant select on table public.ma_table to anon;
--   create policy "ma_table_select_anon" on public.ma_table
--     for select to anon using (<condition>);
-- Idem pour une fonction appelée par anon (page publique, ou policy évaluée
-- pour anon) : `grant execute on function public.ma_fonction(...) to anon;`.
-- (`create extension` ou `alter extension update` hors `public` : idem pour
-- authenticated.)
--
-- ROLLBACK (défauts exacts relevés en prod et en local avant migration) :
--   alter default privileges for role postgres in schema public
--     grant select, insert, update, delete, references, trigger, maintain
--     on tables to anon;                       -- anon=arwdxtm
--   alter default privileges for role postgres in schema public
--     grant usage, select, update on sequences to anon;   -- anon=rwU
--   alter default privileges for role postgres
--     grant execute on functions to public;
--   (`maintain` n'existe qu'à partir de PostgreSQL 17.)

alter default privileges for role postgres in schema public
	revoke all on tables from anon;

alter default privileges for role postgres in schema public
	revoke all on sequences from anon;

-- Forme GLOBALE (sans `in schema`) : seule capable de retirer le défaut câblé.
alter default privileges for role postgres
	revoke execute on functions from public;
