-- Temporary debug function to check auth.uid() value
-- Remove after debugging is complete

CREATE OR REPLACE FUNCTION debug_auth_context()
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT jsonb_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'auth_jwt', auth.jwt()
  );
$$;

GRANT EXECUTE ON FUNCTION debug_auth_context() TO authenticated;
GRANT EXECUTE ON FUNCTION debug_auth_context() TO anon;
