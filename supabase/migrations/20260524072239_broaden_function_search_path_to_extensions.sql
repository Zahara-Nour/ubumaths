-- ============================================================================
-- Migration: Broaden hardened search_path to include the extensions schema
-- ============================================================================
-- 20260523215052_harden_function_search_path.sql pinned `public, pg_temp` on
-- every public function. That broke functions that call extension functions
-- like digest() (pgcrypto), unaccent() (unaccent), encrypt() etc. — they all
-- live in the `extensions` schema in Supabase and could no longer be resolved.
--
-- One concrete regression already surfaced: the BEFORE INSERT trigger on
-- error_logs uses generate_error_signature() → digest(), causing every error
-- log insert to fail with "function digest(text, unknown) does not exist".
--
-- This migration broadens the pinned search_path from `public, pg_temp` to
-- `public, extensions, pg_temp` on every function previously affected.
--
-- Why this is still safe:
--   * The `extensions` schema in Supabase is owned by `supabase_admin` and
--     not writable by `authenticated` or `anon` roles. An attacker cannot
--     plant a malicious function there to hijack the resolution.
--   * The hardening's main goal — prevent attackers from prepending an
--     attacker-controlled schema to the caller's search_path — still holds:
--     `public, extensions, pg_temp` is fully qualified.
--
-- We only retarget functions whose current proconfig is exactly
-- `search_path=public, pg_temp` (the value pinned by the previous migration),
-- so functions with bespoke search_paths are left untouched.
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
          AND p.prokind IN ('f', 'p')
          -- Skip extension-owned functions
          AND NOT EXISTS (
              SELECT 1
              FROM pg_depend d
              WHERE d.objid = p.oid
                AND d.deptype = 'e'
          )
          -- Only retarget functions previously hardened to public, pg_temp.
          -- Leaves bespoke search_paths (e.g. those including specific schemas)
          -- alone.
          AND EXISTS (
              SELECT 1
              FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
              WHERE cfg = 'search_path=public, pg_temp'
                 OR cfg = 'search_path="public", "pg_temp"'
                 OR cfg = 'search_path=public,pg_temp'
          )
    LOOP
        EXECUTE format(
            'ALTER FUNCTION public.%I(%s) SET search_path = public, extensions, pg_temp',
            func_record.proname,
            func_record.args
        );
        altered_count := altered_count + 1;
    END LOOP;

    RAISE NOTICE 'Broadened search_path on % public function(s) to include extensions', altered_count;
END $$;
