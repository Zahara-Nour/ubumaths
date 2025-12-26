-- Migration: Create Guess Who Math Game tables
-- Description: Multiplayer "Guess Who" style game where players guess each other's secret number
-- Author: Claude Code
-- Date: 2025-12-26

-- ============================================================================
-- Token Generation Function
-- ============================================================================

-- Generate a 16-char alphanumeric token (excludes ambiguous chars like 0, O, l, 1, I)
CREATE OR REPLACE FUNCTION generate_guess_who_token()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Main Games Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.guess_who_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Players (references profiles, but semantically these are students)
    player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,  -- NULL until joined

    -- Game state
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'abandoned')),

    -- Board configuration: 24 numbers on the grid
    grid_numbers INTEGER[24] NOT NULL,

    -- Secret numbers each player must defend
    player1_secret INTEGER NOT NULL,
    player2_secret INTEGER,  -- Assigned when player2 joins

    -- Turn management
    current_turn_player_id UUID REFERENCES public.profiles(id),
    bonus_turns_remaining INTEGER NOT NULL DEFAULT 0 CHECK (bonus_turns_remaining >= 0 AND bonus_turns_remaining <= 3),
    turn_started_at TIMESTAMPTZ,  -- For 60s timer validation

    -- Game outcome
    winner_id UUID REFERENCES public.profiles(id),

    -- Share token for joining
    share_token VARCHAR(16) NOT NULL UNIQUE DEFAULT generate_guess_who_token(),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT grid_numbers_length CHECK (array_length(grid_numbers, 1) = 24),
    CONSTRAINT player1_secret_in_grid CHECK (player1_secret = ANY(grid_numbers)),
    CONSTRAINT player2_secret_in_grid CHECK (player2_secret IS NULL OR player2_secret = ANY(grid_numbers)),
    CONSTRAINT different_secrets CHECK (player2_secret IS NULL OR player1_secret != player2_secret),
    CONSTRAINT winner_is_player CHECK (
        winner_id IS NULL OR
        winner_id = player1_id OR
        winner_id = player2_id
    ),
    CONSTRAINT current_turn_is_player CHECK (
        current_turn_player_id IS NULL OR
        current_turn_player_id = player1_id OR
        current_turn_player_id = player2_id
    )
);

-- ============================================================================
-- Moves Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.guess_who_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.guess_who_games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Move ordering
    move_number INTEGER NOT NULL,

    -- Move type
    move_type TEXT NOT NULL CHECK (move_type IN ('question', 'answer', 'guess')),

    -- Question details (for 'question' moves)
    question_type TEXT CHECK (question_type IN (
        'is_even',           -- Is the number even?
        'is_odd',            -- Is the number odd?
        'is_prime',          -- Is the number prime?
        'is_multiple_of',    -- Is the number a multiple of X?
        'is_divisible_by',   -- Is the number divisible by X? (same as multiple_of, alias)
        'greater_than',      -- Is the number greater than X?
        'less_than',         -- Is the number less than X?
        'units_digit',       -- Is the units digit X?
        'tens_digit',        -- Is the tens digit X?
        'is_perfect_square', -- Is the number a perfect square?
        'sum_digits'         -- Is the sum of digits X?
    )),
    question_param INTEGER,  -- Parameter for questions that need one (e.g., 7 for "divisible by 7")

    -- Answer details (for 'answer' moves)
    answer BOOLEAN,          -- The answer given by the opponent
    is_correct BOOLEAN,      -- Whether the answer was correct (validated by game)
    correct_answer BOOLEAN,  -- What the correct answer should have been

    -- Guess details (for 'guess' moves)
    guessed_number INTEGER,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure move_number is unique per game
    UNIQUE(game_id, move_number)
);

-- ============================================================================
-- Eliminated Numbers Table (per player per game)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.guess_who_eliminated (
    game_id UUID NOT NULL REFERENCES public.guess_who_games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Array of eliminated numbers
    eliminated_numbers INTEGER[] NOT NULL DEFAULT '{}',

    -- Timestamp
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Composite primary key
    PRIMARY KEY (game_id, player_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Games indexes
CREATE INDEX idx_guess_who_games_share_token ON public.guess_who_games(share_token);
CREATE INDEX idx_guess_who_games_status ON public.guess_who_games(status);
CREATE INDEX idx_guess_who_games_player1 ON public.guess_who_games(player1_id);
CREATE INDEX idx_guess_who_games_player2 ON public.guess_who_games(player2_id);
CREATE INDEX idx_guess_who_games_current_turn ON public.guess_who_games(current_turn_player_id) WHERE status = 'in_progress';

-- Moves indexes
CREATE INDEX idx_guess_who_moves_game_id ON public.guess_who_moves(game_id);
CREATE INDEX idx_guess_who_moves_player_id ON public.guess_who_moves(player_id);
-- Note: No separate index for (game_id, move_number) - already covered by UNIQUE constraint

-- Eliminated indexes (composite PK already creates an index)
CREATE INDEX idx_guess_who_eliminated_player ON public.guess_who_eliminated(player_id);

-- ============================================================================
-- Updated_at Trigger
-- ============================================================================

-- Trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_guess_who_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for games table
CREATE TRIGGER trigger_update_guess_who_games_updated_at
    BEFORE UPDATE ON public.guess_who_games
    FOR EACH ROW
    EXECUTE FUNCTION update_guess_who_games_updated_at();

-- Trigger function for eliminated table
CREATE OR REPLACE FUNCTION update_guess_who_eliminated_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for eliminated table
CREATE TRIGGER trigger_update_guess_who_eliminated_updated_at
    BEFORE UPDATE ON public.guess_who_eliminated
    FOR EACH ROW
    EXECUTE FUNCTION update_guess_who_eliminated_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.guess_who_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guess_who_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guess_who_eliminated ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies: guess_who_games
-- ============================================================================

-- SELECT: Players can view games they participate in
CREATE POLICY "Players can view their games"
    ON public.guess_who_games
    FOR SELECT
    USING (
        auth.uid() = player1_id OR
        auth.uid() = player2_id
    );

-- SELECT: Authenticated users can view waiting games (for joining via share token)
-- Note: Share token filtering is done at application level for security
-- This policy allows the query to find games by token
CREATE POLICY "Authenticated users can view waiting games for joining"
    ON public.guess_who_games
    FOR SELECT
    USING (auth.uid() IS NOT NULL AND status = 'waiting');

-- INSERT: Authenticated users can create games
CREATE POLICY "Authenticated users can create games"
    ON public.guess_who_games
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        auth.uid() = player1_id
    );

-- UPDATE: Players can update games they participate in
CREATE POLICY "Players can update their games"
    ON public.guess_who_games
    FOR UPDATE
    USING (
        auth.uid() = player1_id OR
        auth.uid() = player2_id
    )
    WITH CHECK (
        auth.uid() = player1_id OR
        auth.uid() = player2_id
    );

-- ============================================================================
-- RLS Policies: guess_who_moves
-- ============================================================================

-- SELECT: Players can view moves for games they participate in
CREATE POLICY "Players can view moves for their games"
    ON public.guess_who_moves
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.guess_who_games g
            WHERE g.id = guess_who_moves.game_id
            AND (g.player1_id = auth.uid() OR g.player2_id = auth.uid())
        )
    );

-- INSERT: Players can insert moves for games they participate in
CREATE POLICY "Players can insert moves for their games"
    ON public.guess_who_moves
    FOR INSERT
    WITH CHECK (
        auth.uid() = player_id AND
        EXISTS (
            SELECT 1 FROM public.guess_who_games g
            WHERE g.id = guess_who_moves.game_id
            AND (g.player1_id = auth.uid() OR g.player2_id = auth.uid())
        )
    );

-- ============================================================================
-- RLS Policies: guess_who_eliminated
-- ============================================================================

-- SELECT: Players can view their own eliminated numbers
CREATE POLICY "Players can view their eliminated numbers"
    ON public.guess_who_eliminated
    FOR SELECT
    USING (auth.uid() = player_id);

-- INSERT: Players can insert their own eliminated numbers
CREATE POLICY "Players can insert their eliminated numbers"
    ON public.guess_who_eliminated
    FOR INSERT
    WITH CHECK (
        auth.uid() = player_id AND
        EXISTS (
            SELECT 1 FROM public.guess_who_games g
            WHERE g.id = guess_who_eliminated.game_id
            AND (g.player1_id = auth.uid() OR g.player2_id = auth.uid())
        )
    );

-- UPDATE: Players can update their own eliminated numbers
CREATE POLICY "Players can update their eliminated numbers"
    ON public.guess_who_eliminated
    FOR UPDATE
    USING (auth.uid() = player_id)
    WITH CHECK (auth.uid() = player_id);

-- ============================================================================
-- Admin Policies (for all tables)
-- ============================================================================

-- Admins can do everything on games
CREATE POLICY "Admins can manage all games"
    ON public.guess_who_games
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can do everything on moves
CREATE POLICY "Admins can manage all moves"
    ON public.guess_who_moves
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can do everything on eliminated
CREATE POLICY "Admins can manage all eliminated"
    ON public.guess_who_eliminated
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- Teachers can view student games (for monitoring)
-- ============================================================================

CREATE POLICY "Teachers can view student games"
    ON public.guess_who_games
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.class_members cm
            JOIN public.classes c ON cm.class_id = c.id
            WHERE c.teacher_id = auth.uid()
            AND (cm.student_id = guess_who_games.player1_id OR cm.student_id = guess_who_games.player2_id)
        )
    );

CREATE POLICY "Teachers can view student moves"
    ON public.guess_who_moves
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.guess_who_games g
            JOIN public.class_members cm ON (cm.student_id = g.player1_id OR cm.student_id = g.player2_id)
            JOIN public.classes c ON cm.class_id = c.id
            WHERE g.id = guess_who_moves.game_id
            AND c.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can view student eliminated"
    ON public.guess_who_eliminated
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.class_members cm
            JOIN public.classes c ON cm.class_id = c.id
            WHERE c.teacher_id = auth.uid()
            AND cm.student_id = guess_who_eliminated.player_id
        )
    );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.guess_who_games IS 'Guess Who Math Game - multiplayer game where players guess each other''s secret number';
COMMENT ON COLUMN public.guess_who_games.grid_numbers IS 'Array of 24 numbers displayed on the game board';
COMMENT ON COLUMN public.guess_who_games.player1_secret IS 'The secret number player 1 must defend';
COMMENT ON COLUMN public.guess_who_games.player2_secret IS 'The secret number player 2 must defend (assigned when joining)';
COMMENT ON COLUMN public.guess_who_games.bonus_turns_remaining IS 'Number of bonus turns for catching opponent in a wrong answer (max 3)';
COMMENT ON COLUMN public.guess_who_games.turn_started_at IS 'Timestamp when current turn started, for 60s timer validation';
COMMENT ON COLUMN public.guess_who_games.share_token IS '16-character alphanumeric token for sharing game invite';

COMMENT ON TABLE public.guess_who_moves IS 'Move history for Guess Who games';
COMMENT ON COLUMN public.guess_who_moves.move_type IS 'Type of move: question, answer, or guess';
COMMENT ON COLUMN public.guess_who_moves.question_type IS 'Type of math property question being asked';
COMMENT ON COLUMN public.guess_who_moves.question_param IS 'Parameter for questions that need one (e.g., 7 for divisible by 7)';
COMMENT ON COLUMN public.guess_who_moves.is_correct IS 'Whether the answer given was correct (validated by game logic)';
COMMENT ON COLUMN public.guess_who_moves.correct_answer IS 'The mathematically correct answer (for reference when wrong)';

COMMENT ON TABLE public.guess_who_eliminated IS 'Tracks which numbers each player has eliminated from their board';
COMMENT ON COLUMN public.guess_who_eliminated.eliminated_numbers IS 'Array of numbers the player has crossed off their board';
