-- Harden resolve_open_class_by_code — follow-up to 20260825170000
-- ================================================================
-- Supabase's default privileges auto-grant EXECUTE on every new function in `public` to the
-- `anon` and `authenticated` roles. The original migration's `REVOKE ALL ... FROM PUBLIC`
-- removed only the PUBLIC grant, NOT those role-specific grants — so the function stayed
-- callable directly via PostgREST (`/rest/v1/rpc/resolve_open_class_by_code`) by anonymous
-- visitors. That reopens the class-code enumeration the RPC was meant to prevent (it bypasses
-- the app's signup rate limit).
--
-- Revoke EXECUTE from anon/authenticated explicitly. The /auth/register action calls this RPC
-- server-side with the service-role client, so the app is unaffected.
REVOKE EXECUTE ON FUNCTION public.resolve_open_class_by_code(text) FROM anon, authenticated;

-- Belt-and-suspenders: ensure service_role keeps EXECUTE.
GRANT EXECUTE ON FUNCTION public.resolve_open_class_by_code(text) TO service_role;
