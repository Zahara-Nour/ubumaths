-- ============================================================================
-- Suppression de trois fonctions sans appelant
-- ============================================================================
--
-- Inventaire des usages (2026-10-11) : `grep -rn` de chaque nom dans src/ → 0 référence
-- (hors database.ts généré) ; aucune tâche cron ne les appelle. Seuls des tests les
-- citaient (rpc-lot4-hygiene, liste blanche des fonctions SECURITY DEFINER), mis à jour
-- dans la même PR.
--   * get_2048_user_rank(uuid) — rang 2048 toutes écoles confondues (contraire à
--     l'ADR 0002) ; la route qui l'appelait a été supprimée par D18.
--   * process_weekly_rewards(date, date, uuid[]) — remplacée par run_weekly_rewards ;
--     écrivait dans gidouilles_history, table disparue (E19).
--   * purchase_shop_item(uuid, uuid, integer, jsonb) — boutique supprimée ; écrivait dans
--     gidouilles_history et des tables disparues.
--
-- Accord explicite de David (2026-10-11). Aucune donnée perdue (des fonctions, pas des
-- tables).
--
-- ROLLBACK : recréer chaque fonction depuis le baseline (20260616220000) et les
-- migrations qui l'ont modifiée (20261003210000 pour le search_path).
-- ============================================================================

DROP FUNCTION public.get_2048_user_rank(uuid);
DROP FUNCTION public.process_weekly_rewards(date, date, uuid[]);
DROP FUNCTION public.purchase_shop_item(uuid, uuid, integer, jsonb);
