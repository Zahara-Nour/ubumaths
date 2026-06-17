-- ============================================================================
-- Migration: Fix SECURITY DEFINER views flagged by Supabase Security Advisor
-- ============================================================================
-- Three views were running as SECURITY DEFINER (Postgres default), bypassing
-- the RLS policies of the querying user:
--
--   * public.minesweeper_leaderboard        -- regression introduced by
--   * public.minesweeper_leaderboard_public -- 20260315214344_leaderboard_add_role.sql
--                                              which forgot to re-apply
--                                              security_invoker = on after
--                                              DROP + CREATE.
--   * public.admin_pg_cron_jobs             -- never had security_invoker set.
--
-- Switching to security_invoker = on makes the views honour the RLS of the
-- caller, which is the safe default for views that read from user-scoped
-- tables (minesweeper_games, profiles) or restricted catalogs (cron.job).
--
-- Functional impact:
--   * Leaderboards: server pages already use the service-role or authenticated
--     client; existing GRANTs to anon/authenticated stay in place. RLS on
--     minesweeper_games and profiles already permits the reads these views
--     perform (won games + public profile fields), so behaviour is preserved.
--   * admin_pg_cron_jobs: not referenced by application code; only the
--     postgres superuser will see rows, which matches its admin-only purpose.
-- ============================================================================

ALTER VIEW public.minesweeper_leaderboard SET (security_invoker = on);
ALTER VIEW public.minesweeper_leaderboard_public SET (security_invoker = on);
ALTER VIEW public.admin_pg_cron_jobs SET (security_invoker = on);
