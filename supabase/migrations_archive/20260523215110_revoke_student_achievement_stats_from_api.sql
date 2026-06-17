-- ============================================================================
-- Migration: Hide student_achievement_stats from the PostgREST API
-- ============================================================================
-- Supabase Security Advisor flags `materialized_view_in_api` because
-- public.student_achievement_stats is selectable by anon/authenticated roles
-- via /rest/v1/student_achievement_stats. Materialized views ignore RLS,
-- so exposing one over the API bypasses every per-student access rule on
-- the underlying tables.
--
-- Usage check: the matview is only consumed internally by the SECURITY
-- DEFINER function `get_achievement_leaderboard()` (which runs as the
-- function owner, so it does not need the GRANT to read the matview).
-- No application code under src/ queries the matview directly — only
-- `database.ts` references it, and that's just the generated type.
--
-- Fix: REVOKE SELECT from anon and authenticated. postgres / service_role
-- retain access, so the leaderboard function and the cron refresh
-- (`REFRESH MATERIALIZED VIEW CONCURRENTLY student_achievement_stats`)
-- continue to work.
-- ============================================================================

REVOKE SELECT ON public.student_achievement_stats FROM anon;
REVOKE SELECT ON public.student_achievement_stats FROM authenticated;
