-- Migration: Fix RLS recursion between exercises and exercise_share_tokens
-- Description: Remove the recursive policy and use a security definer function instead

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Anyone can read exercises with valid share token" ON public.exercises;

-- Create a security definer function to check token validity
-- This bypasses RLS when checking the tokens table
CREATE OR REPLACE FUNCTION public.exercise_has_valid_share_token(exercise_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.exercise_share_tokens
        WHERE exercise_share_tokens.exercise_id = exercise_uuid
        AND exercise_share_tokens.is_active = true
        AND (exercise_share_tokens.expires_at IS NULL OR exercise_share_tokens.expires_at > NOW())
    );
$$;

-- Grant execute permission to public (needed for anon access)
GRANT EXECUTE ON FUNCTION public.exercise_has_valid_share_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.exercise_has_valid_share_token(UUID) TO authenticated;

-- Create the fixed policy using the security definer function
CREATE POLICY "Anyone can read exercises with valid share token"
    ON public.exercises
    FOR SELECT
    USING (public.exercise_has_valid_share_token(id));

-- Add comment for documentation
COMMENT ON FUNCTION public.exercise_has_valid_share_token(UUID) IS 'Security definer function to check if an exercise has a valid share token, avoiding RLS recursion';
