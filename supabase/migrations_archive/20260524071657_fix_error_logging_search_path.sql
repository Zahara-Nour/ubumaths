-- Fix regression introduced by 20260523215052_harden_function_search_path.sql:
-- generate_error_signature() uses digest() from the pgcrypto extension. After
-- the global hardening pinned search_path to (public, pg_temp), digest() — which
-- lives in the `extensions` schema in Supabase — can no longer be resolved, so
-- the BEFORE INSERT trigger on error_logs fails with:
--
--   ERROR: function digest(text, unknown) does not exist
--
-- Add `extensions` to the search_path of the two error-logging helpers.

ALTER FUNCTION public.generate_error_signature(TEXT, TEXT, TEXT, INTEGER)
    SET search_path = public, extensions, pg_temp;

ALTER FUNCTION public.upsert_error_occurrence(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER)
    SET search_path = public, extensions, pg_temp;
