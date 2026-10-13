-- ============================================================================
-- Suppression de la re-vérification serveur des soumissions Python (écart L7)
-- ============================================================================
--
-- La phase 1b (re-vérification serveur du verdict Python calculé par le navigateur)
-- a été abandonnée par David le 2026-08-27 : le code qui écrivait les verdicts
-- (recheck.ts) n'a jamais été mergé (branche feat/python-recheck-1b conservée sur
-- origin). Seule la migration 20260827120000 est arrivée en prod, inerte.
--
-- Inventaire (2026-10-13) :
--   * Usages : `grep -rn` de chaque nom dans src/, scripts/, tests/, .github/,
--     package.json → 0 référence applicative (hors database.ts généré). Seuls des tests
--     les citaient (anon-option-b, rpc-lot2-maintenance-prof), mis à jour dans la PR.
--   * Prod : 0 ligne dans python_submission_server_verdicts ; aucun trigger ni vue
--     dessus ; seule fonction qui la cite : run_flag_stale_python_rechecks ; jamais
--     programmée (absente de cron.job), 0 exécution dans background_job_runs.
--
-- Accord explicite de David (2026-10-13). Aucune donnée perdue (table vide).
--
-- ROLLBACK : rejouer 20260827120000_python_submission_server_verification.sql, puis
-- les retraits de droits de 20261001170000 (anon), 20261003180000 (authenticated) et
-- le search_path de 20261003210000.
-- ============================================================================

DROP FUNCTION public.run_flag_stale_python_rechecks();
DROP TABLE public.python_submission_server_verdicts;
