-- ============================================================================
-- Migration: Lock down search_path on all public functions
-- ============================================================================
-- Supabase Security Advisor flags `function_search_path_mutable` for every
-- function in public that does not set a search_path. With a mutable
-- search_path, a SECURITY DEFINER function can be tricked into resolving an
-- unqualified table/function name against an attacker-controlled schema if
-- the attacker can prepend it to the caller's search_path.
--
-- Fix: ALTER FUNCTION ... SET search_path = public, pg_temp on every
-- regular function in public that does not already have a search_path set.
-- We skip:
--   * Aggregates and other non-function kinds (prokind != 'f' becomes
--     'p' for procedures, 'a' for aggregates, 'w' for window funcs).
--   * Extension-owned functions (vector, unaccent, pg_trgm, etc.) — those
--     are managed by the extension and must not be tampered with.
--   * Functions whose proconfig already pins a search_path (idempotent).
--
-- Using a DO block keeps the migration future-proof: every public function
-- gets pinned regardless of how many we have today.
-- ============================================================================

DO $$
DECLARE
    func_record RECORD;
    altered_count INTEGER := 0;
BEGIN
    FOR func_record IN
        SELECT
            p.oid,
            p.proname,
            pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prokind IN ('f', 'p')  -- regular functions and procedures
          -- Skip functions installed by an extension
          AND NOT EXISTS (
              SELECT 1
              FROM pg_depend d
              WHERE d.objid = p.oid
                AND d.deptype = 'e'
          )
          -- Skip functions that already have search_path pinned
          AND NOT EXISTS (
              SELECT 1
              FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
              WHERE cfg LIKE 'search_path=%'
          )
    LOOP
        EXECUTE format(
            'ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp',
            func_record.proname,
            func_record.args
        );
        altered_count := altered_count + 1;
    END LOOP;

    RAISE NOTICE 'Pinned search_path on % public function(s)', altered_count;
END $$;
