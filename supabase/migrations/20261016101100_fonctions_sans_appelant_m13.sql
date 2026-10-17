-- ============================================================================
-- Suppression de deux fonctions sans appelant (écart M13)
-- ============================================================================
--
-- Inventaire des usages (2026-10-13) : `grep -rn` de chaque nom dans src/, scripts/,
-- tests/, .github/, package.json → 0 référence applicative (hors database.ts généré).
-- En prod : aucune fonction ne les cite dans son corps (pg_proc.prosrc), aucune tâche
-- cron ne les appelle. Seuls des tests les citaient (rpc-lot5-gardes-restantes, liste
-- blanche des fonctions SECURITY DEFINER), mis à jour dans la même PR.
--   * award_weekly_reward(uuid, uuid, date, date, integer, text) — ancien versement
--     hebdomadaire élève par élève ; remplacé par run_weekly_rewards (cron weekly-rewards).
--   * calculate_daily_challenge_gidouilles(text, integer, uuid) — ancien barème du défi
--     du jour, plus utilisé.
--
-- Accord explicite de David (2026-10-13). Aucune donnée perdue (des fonctions, pas des
-- tables) ; les récompenses hebdomadaires passent par run_weekly_rewards et
-- run_weekly_best_bonuses, non touchées.
--
-- ROLLBACK : recréer chaque fonction depuis le baseline (20260616220000) et les
-- migrations qui l'ont modifiée (20260620090000 pour award_weekly_reward, 20261003210000
-- pour le search_path, 20261003230000 pour les révocations d'EXECUTE).
-- ============================================================================

DROP FUNCTION public.award_weekly_reward(uuid, uuid, date, date, integer, text);
DROP FUNCTION public.calculate_daily_challenge_gidouilles(text, integer, uuid);
