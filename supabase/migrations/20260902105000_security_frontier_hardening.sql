-- Security frontier hardening — follow-up to the 2026-08 security audit.
-- Findings: M14, M21, M22, M15 (docs/wip/security-audit-2026-08.md).
-- Live prod, minor students → tighten the social-frontier RLS helpers and lock
-- down a per-minor materialized view grant. Each function below is reproduced
-- faithfully from its current prod definition (same LANGUAGE / SECURITY DEFINER /
-- SET search_path / EXCEPTION handlers); ONLY the audited conjuncts/limits change.

-- ---------------------------------------------------------------------------
-- M14 — are_classmates(uuid): the classmate relation never expired. Restrict it
-- to ACTIVE memberships (cm1/cm2) in an ACTIVE class (status 'archived' = left).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.are_classmates(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
    RETURN EXISTS (
      SELECT 1
      FROM public.class_members cm1
      INNER JOIN public.class_members cm2 ON cm1.class_id = cm2.class_id
      INNER JOIN public.classes c ON c.id = cm1.class_id
      WHERE cm1.student_id = auth.uid()
        AND cm2.student_id = p_user_id
        AND cm1.status = 'active'
        AND cm2.status = 'active'
        AND c.is_active
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN FALSE;
  END;
  $function$;

-- ---------------------------------------------------------------------------
-- M14 — is_classmate(uuid): same expiry gap. Require the caller's own membership
-- to be ACTIVE and the class to be ACTIVE.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_classmate(p_class_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM public.class_members cm
      INNER JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.class_id = p_class_id
        AND cm.student_id = auth.uid()
        AND cm.status = 'active'
        AND c.is_active
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN FALSE;
  END;
  $function$;

-- ---------------------------------------------------------------------------
-- M21 — shares_tournament(uuid): two students in DIFFERENT schools who both
-- played a global tournament could see each other's profile. Gate it on the
-- school frontier. public.same_school(uuid) exists → reuse it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shares_tournament(target_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Check if current user and target user both participated in the same tournament
  SELECT EXISTS (
    SELECT 1
    FROM minesweeper_tournament_games g1
    JOIN minesweeper_tournament_games g2 ON g1.tournament_id = g2.tournament_id
    WHERE g1.student_id = auth.uid()
    AND g2.student_id = target_user_id
  )
  AND public.same_school(target_user_id);
$function$;

-- ---------------------------------------------------------------------------
-- M22 — get_achievement_leaderboard(integer, text): p_limit is caller-controlled
-- and uncapped → whole-student-body enumeration. Clamp to [1, 50] (default 10) in
-- both the cached (global) and computed (context) branches.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_achievement_leaderboard(p_limit integer DEFAULT 10, p_context text DEFAULT NULL::text)
 RETURNS TABLE(rank bigint, student_id uuid, student_name text, avatar_url text, total_points bigint, achievement_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_context IS NULL THEN
    -- Global leaderboard from materialized view
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY s.total_points DESC)::BIGINT AS rank,
      s.student_id,
      COALESCE(p.firstname || ' ' || LEFT(p.lastname, 1) || '.', 'Anonyme') AS student_name,
      p.avatar_url,
      s.total_points::BIGINT,
      s.achievement_count::BIGINT
    FROM student_achievement_stats s
    JOIN profiles p ON p.id = s.student_id
    WHERE p.role = 'student'
    ORDER BY s.total_points DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
  ELSE
    -- Context-specific leaderboard (computed, not cached)
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY SUM(sa.points_awarded) DESC)::BIGINT AS rank,
      sa.student_id,
      COALESCE(p.firstname || ' ' || LEFT(p.lastname, 1) || '.', 'Anonyme') AS student_name,
      p.avatar_url,
      COALESCE(SUM(sa.points_awarded), 0)::BIGINT AS total_points,
      COUNT(DISTINCT sa.achievement_id)::BIGINT AS achievement_count
    FROM student_achievements sa
    JOIN achievements a ON a.id = sa.achievement_id
    JOIN profiles p ON p.id = sa.student_id
    WHERE a.context = p_context
    AND p.role = 'student'
    GROUP BY sa.student_id, p.firstname, p.lastname, p.avatar_url
    ORDER BY SUM(sa.points_awarded) DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------------
-- M15 — materialized view public.student_achievement_stats holds per-minor stats.
-- The baseline lacks a REVOKE, so a fresh apply grants anon/authenticated SELECT.
-- Revoke it idempotently; guard so the migration doesn't fail if the matview is
-- absent (e.g. a slimmed local baseline).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public'
      AND matviewname = 'student_achievement_stats'
  ) THEN
    REVOKE SELECT ON public.student_achievement_stats FROM anon, authenticated;
  END IF;
END;
$$;
