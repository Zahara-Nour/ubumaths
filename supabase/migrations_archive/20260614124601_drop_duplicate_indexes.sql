-- Drop duplicate indexes (Supabase performance advisor 0009 "Duplicate Index")
-- ============================================================================
--
-- 4 paires d'index strictement identiques (mêmes colonnes, même prédicat) ont
-- été créées par des migrations successives. On garde l'index d'origine (créé
-- en premier) et on supprime le doublon tardif. Les colonnes indexées étant
-- identiques, aucune requête ne perd d'optimisation ; on récupère juste de
-- l'espace et on supprime une écriture d'index redondante à chaque INSERT/UPDATE.
--
-- Aucun de ces index n'est UNIQUE ni ne soutient une contrainte (PRIMARY KEY /
-- UNIQUE) : ce sont de simples `CREATE INDEX`, donc le DROP est sans risque.
--
-- Conservé (origine)                     | Supprimé (doublon)
-- ---------------------------------------+--------------------------------------------
-- idx_class_members_composite            | idx_class_members_student_lookup
-- idx_marketplace_trades_participants    | idx_marketplace_trades_initiator_partner
-- idx_migration_tracking_old_index       | idx_migration_tracking_index
-- idx_notifications_active               | idx_notifications_created_at

drop index if exists public.idx_class_members_student_lookup;
drop index if exists public.idx_marketplace_trades_initiator_partner;
drop index if exists public.idx_migration_tracking_index;
drop index if exists public.idx_notifications_created_at;
