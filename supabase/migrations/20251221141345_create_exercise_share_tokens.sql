-- Migration: Create exercise_share_tokens table
-- Description: Enables sharing private exercises via unique tokens

-- Create table for share tokens
CREATE TABLE IF NOT EXISTS public.exercise_share_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,  -- NULL = never expires
    is_active BOOLEAN NOT NULL DEFAULT true,
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_exercise_share_tokens_token ON public.exercise_share_tokens(token);
CREATE INDEX idx_exercise_share_tokens_exercise_id ON public.exercise_share_tokens(exercise_id);
CREATE INDEX idx_exercise_share_tokens_created_by ON public.exercise_share_tokens(created_by);

-- Token generation function (16-char alphanumeric, excludes ambiguous chars)
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..16 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.exercise_share_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can manage tokens for their own exercises
CREATE POLICY "Teachers can manage their exercise tokens"
    ON public.exercise_share_tokens
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.exercises
            WHERE exercises.id = exercise_share_tokens.exercise_id
            AND exercises.created_by = auth.uid()
        )
    );

-- Policy: Anyone can read valid (active, non-expired) tokens for access validation
CREATE POLICY "Anyone can read valid tokens"
    ON public.exercise_share_tokens
    FOR SELECT
    USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Add comment for documentation
COMMENT ON TABLE public.exercise_share_tokens IS 'Tokens for sharing private exercises publicly via unique URLs';
COMMENT ON COLUMN public.exercise_share_tokens.token IS '16-character alphanumeric token for URL sharing';
COMMENT ON COLUMN public.exercise_share_tokens.expires_at IS 'NULL means token never expires';
COMMENT ON COLUMN public.exercise_share_tokens.access_count IS 'Number of times the token has been used to access the exercise';
