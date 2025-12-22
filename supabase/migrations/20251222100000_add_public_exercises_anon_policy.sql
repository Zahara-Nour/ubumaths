-- Migration: Allow unauthenticated users to read public exercises
-- This fixes the 404 error when accessing public exercises without authentication

-- Allow anyone (including unauthenticated users) to read public exercises
CREATE POLICY "Anyone can read public exercises"
    ON public.exercises
    FOR SELECT
    TO public  -- 'public' role includes both authenticated and anonymous users
    USING (is_public = true);

-- Add a comment explaining the policy
COMMENT ON POLICY "Anyone can read public exercises" ON public.exercises IS
    'Allows unauthenticated users to access exercises marked as public (is_public = true).
     This enables sharing public exercises via direct links without requiring login.';
