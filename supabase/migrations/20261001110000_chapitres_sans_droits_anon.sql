-- Chapitres : retirer tout privilège au rôle `anon` (visiteur non connecté)
-- =========================================================================
--
-- Constat (prod, has_table_privilege) : `anon` détenait SELECT, INSERT, UPDATE,
-- DELETE, REFERENCES, TRIGGER sur les quatre tables ci-dessous (hérités des
-- privilèges par défaut du schéma public). `chapter_decks` ne les a pas.
-- Aucune policy de ces tables ne cible `anon` ni `public` : la RLS rendait déjà
-- zéro ligne au visiteur. Le retrait ne fait donc perdre aucun usage ; il
-- ajoute une seconde barrière (privilège) devant la RLS, qui reste inchangée.
--
-- Question en miroir (« qui ne pourra plus lire ce qu'il lisait ? ») : personne.
-- Toutes les lectures applicatives passent par des routes (protected)/,
-- api/student/ ou api/teacher/ gardées par une session (`authenticated`).
--
-- Ni `authenticated` ni `service_role` ne sont touchés. Pas de séquence liée
-- (clés UUID), pas de privilège de colonne explicite, pas de vue dépendante.
--
-- ROLLBACK (privilèges exacts relevés en local avant migration, `arwdxtm`) :
--   grant select, insert, update, delete, references, trigger, maintain
--     on table public.chapter_documents, public.chapter_exercises,
--              public.chapter_checklist_items, public.chapter_worksheets
--     to anon;
--   (`maintain` n'existe qu'à partir de PostgreSQL 17 ; le retirer si la base
--   cible est plus ancienne.)

revoke all on table public.chapter_documents from anon;
revoke all on table public.chapter_exercises from anon;
revoke all on table public.chapter_checklist_items from anon;
revoke all on table public.chapter_worksheets from anon;
