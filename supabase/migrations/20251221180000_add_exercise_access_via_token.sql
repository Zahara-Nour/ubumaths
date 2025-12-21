-- Migration: Add RLS policy for exercise access via share token
-- Description: Allows reading exercises when accessed via a valid share token

-- Policy: Anyone can read exercises that have a valid (active, non-expired) share token
CREATE POLICY "Anyone can read exercises with valid share token"
    ON public.exercises
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.exercise_share_tokens
            WHERE exercise_share_tokens.exercise_id = exercises.id
            AND exercise_share_tokens.is_active = true
            AND (exercise_share_tokens.expires_at IS NULL OR exercise_share_tokens.expires_at > NOW())
        )
    );

-- Add comment for documentation
COMMENT ON POLICY "Anyone can read exercises with valid share token" ON public.exercises IS 'Allows public access to exercises that have at least one valid share token';
