-- Migration: Create 2048 Game Scores Table
-- Purpose: Store user scores and statistics for the 2048 game with leaderboard support
-- Date: 2025-11-18
-- Related: 2048 Game Feature

-- ============================================================================
-- TABLE: game_2048_scores
-- Purpose: Track best scores and statistics for each user playing 2048
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.game_2048_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score >= 0),
    games_played INTEGER NOT NULL DEFAULT 0 CHECK (games_played >= 0),
    tiles_2048_reached INTEGER NOT NULL DEFAULT 0 CHECK (tiles_2048_reached >= 0),
    tiles_4096_reached INTEGER NOT NULL DEFAULT 0 CHECK (tiles_4096_reached >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_2048_scores UNIQUE(user_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.game_2048_scores IS 'User scores and statistics for the 2048 game';
COMMENT ON COLUMN public.game_2048_scores.user_id IS 'Reference to the user (one row per user)';
COMMENT ON COLUMN public.game_2048_scores.best_score IS 'Highest score achieved by the user';
COMMENT ON COLUMN public.game_2048_scores.games_played IS 'Total number of games played by the user';
COMMENT ON COLUMN public.game_2048_scores.tiles_2048_reached IS 'Count of times user reached the 2048 tile';
COMMENT ON COLUMN public.game_2048_scores.tiles_4096_reached IS 'Count of times user reached the 4096 tile';
COMMENT ON COLUMN public.game_2048_scores.created_at IS 'Timestamp when the user first played 2048';
COMMENT ON COLUMN public.game_2048_scores.updated_at IS 'Timestamp of the last score update';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary key index on id (automatic)
-- Unique index on user_id (automatic from UNIQUE constraint)

-- Index for leaderboard queries (ORDER BY best_score DESC)
CREATE INDEX idx_2048_scores_leaderboard ON public.game_2048_scores(best_score DESC);

-- Index for recent activity queries
CREATE INDEX idx_2048_scores_recent ON public.game_2048_scores(updated_at DESC);

-- Note: No separate index on user_id needed - the UNIQUE constraint already creates one

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE public.game_2048_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: All authenticated users can view the leaderboard
-- (Students see all scores, teachers/admins can monitor student activity)
CREATE POLICY "Authenticated users can view 2048 leaderboard"
ON public.game_2048_scores
FOR SELECT
TO authenticated
USING (true);

-- RLS Policy 2: Students can insert their own scores
CREATE POLICY "Students can insert own 2048 scores"
ON public.game_2048_scores
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'student'
    )
);

-- RLS Policy 3: Students can update their own scores
CREATE POLICY "Students can update own 2048 scores"
ON public.game_2048_scores
FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'student'
    )
)
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'student'
    )
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for automatically updating updated_at timestamp
DROP TRIGGER IF EXISTS trigger_update_2048_scores_updated_at ON public.game_2048_scores;
CREATE TRIGGER trigger_update_2048_scores_updated_at
    BEFORE UPDATE ON public.game_2048_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER trigger_update_2048_scores_updated_at ON public.game_2048_scores
IS 'Automatically updates the updated_at timestamp when a row is modified';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.game_2048_scores TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: 2048 Game Scores';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Tables created: 1';
    RAISE NOTICE '  - game_2048_scores (user scores and statistics)';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies: 3';
    RAISE NOTICE '  - All authenticated users can view leaderboard (SELECT)';
    RAISE NOTICE '  - Students can insert own scores (INSERT)';
    RAISE NOTICE '  - Students can update own scores (UPDATE)';
    RAISE NOTICE '';
    RAISE NOTICE 'Indexes: 2 (+ 1 automatic from UNIQUE constraint)';
    RAISE NOTICE '  - best_score DESC (leaderboard queries)';
    RAISE NOTICE '  - updated_at DESC (recent activity)';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers: 1 (updated_at auto-update)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run: pnpm db:migrate';
    RAISE NOTICE '  2. Update: src/lib/types/database.ts';
    RAISE NOTICE '  3. Update: docs/architecture/database-schema.md';
    RAISE NOTICE '===============================================';
END $$;
