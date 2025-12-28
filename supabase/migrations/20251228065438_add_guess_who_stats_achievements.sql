-- Migration: Add Guess Who statistics and achievements
-- Description: Adds tables for tracking player statistics, achievements, and game history
-- Author: Claude Code
-- Date: 2025-12-28

-- ============================================================================
-- PLAYER STATISTICS TABLE
-- ============================================================================

CREATE TABLE guess_who_player_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pack_id TEXT NOT NULL,

    -- Game counts
    games_played INTEGER NOT NULL DEFAULT 0,
    games_won INTEGER NOT NULL DEFAULT 0,
    games_lost INTEGER NOT NULL DEFAULT 0,

    -- Performance metrics
    total_questions_asked INTEGER NOT NULL DEFAULT 0,
    total_correct_answers INTEGER NOT NULL DEFAULT 0,
    total_incorrect_answers INTEGER NOT NULL DEFAULT 0,
    total_game_time_seconds INTEGER NOT NULL DEFAULT 0,
    best_time_seconds INTEGER, -- Fastest win
    fewest_questions_win INTEGER, -- Win with fewest questions

    -- Streaks
    current_win_streak INTEGER NOT NULL DEFAULT 0,
    best_win_streak INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique constraint: one stats row per player per pack
    UNIQUE(player_id, pack_id)
);

-- Index for fast lookups
CREATE INDEX idx_guess_who_player_stats_player ON guess_who_player_stats(player_id);
CREATE INDEX idx_guess_who_player_stats_pack ON guess_who_player_stats(pack_id);

-- ============================================================================
-- ACHIEVEMENTS DEFINITION TABLE
-- ============================================================================

CREATE TABLE guess_who_achievements (
    id TEXT PRIMARY KEY, -- e.g., 'first_win', 'master_guesser'
    name_fr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_fr TEXT NOT NULL,
    description_en TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'trophy', -- Lucide icon name
    category TEXT NOT NULL DEFAULT 'general', -- general, speed, accuracy, streak, mastery
    points INTEGER NOT NULL DEFAULT 10,
    rarity TEXT NOT NULL DEFAULT 'common', -- common, rare, epic, legendary
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PLAYER ACHIEVEMENTS TABLE
-- ============================================================================

CREATE TABLE guess_who_player_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES guess_who_achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Context about how it was unlocked
    game_id UUID REFERENCES guess_who_games(id) ON DELETE SET NULL,
    pack_id TEXT,

    -- Unique: each player can only unlock each achievement once
    UNIQUE(player_id, achievement_id)
);

-- Index for fast lookups
CREATE INDEX idx_guess_who_player_achievements_player ON guess_who_player_achievements(player_id);

-- ============================================================================
-- LEADERBOARD VIEW
-- ============================================================================

CREATE OR REPLACE VIEW guess_who_leaderboard AS
SELECT
    ps.player_id,
    p.display_name,
    p.avatar_url,
    ps.pack_id,
    ps.games_played,
    ps.games_won,
    CASE WHEN ps.games_played > 0
        THEN ROUND((ps.games_won::DECIMAL / ps.games_played) * 100, 1)
        ELSE 0
    END as win_rate,
    ps.best_time_seconds,
    ps.fewest_questions_win,
    ps.best_win_streak,
    ps.updated_at
FROM guess_who_player_stats ps
JOIN profiles p ON p.id = ps.player_id
WHERE ps.games_played >= 1;

-- ============================================================================
-- INSERT DEFAULT ACHIEVEMENTS
-- ============================================================================

INSERT INTO guess_who_achievements (id, name_fr, name_en, description_fr, description_en, icon, category, points, rarity, sort_order) VALUES
-- General achievements
('first_win', 'Premiere Victoire', 'First Win', 'Gagne ta premiere partie de Guess Who Math', 'Win your first Guess Who Math game', 'trophy', 'general', 10, 'common', 1),
('ten_wins', 'Joueur Assidu', 'Dedicated Player', 'Gagne 10 parties', 'Win 10 games', 'medal', 'general', 25, 'common', 2),
('fifty_wins', 'Veteran', 'Veteran', 'Gagne 50 parties', 'Win 50 games', 'award', 'general', 100, 'rare', 3),

-- Speed achievements
('speed_demon', 'Eclair', 'Speed Demon', 'Gagne une partie en moins de 30 secondes', 'Win a game in under 30 seconds', 'zap', 'speed', 50, 'rare', 10),
('quick_thinker', 'Penseur Rapide', 'Quick Thinker', 'Gagne une partie en moins de 60 secondes', 'Win a game in under 60 seconds', 'clock', 'speed', 25, 'common', 11),

-- Accuracy achievements
('perfect_answers', 'Sans Faute', 'Perfect Answers', 'Reponds correctement a 10 questions consecutives', 'Answer 10 questions correctly in a row', 'check-circle', 'accuracy', 30, 'common', 20),
('truth_seeker', 'Chercheur de Verite', 'Truth Seeker', 'Reponds correctement a 50 questions au total', 'Answer 50 questions correctly in total', 'search', 'accuracy', 25, 'common', 21),

-- Strategy achievements
('master_guesser', 'Maitre Devineur', 'Master Guesser', 'Gagne en posant 3 questions ou moins', 'Win by asking 3 or fewer questions', 'brain', 'mastery', 75, 'epic', 30),
('efficient', 'Efficace', 'Efficient', 'Gagne en posant 5 questions ou moins', 'Win by asking 5 or fewer questions', 'target', 'mastery', 40, 'rare', 31),

-- Streak achievements
('hot_streak', 'En Feu', 'Hot Streak', 'Gagne 3 parties consecutives', 'Win 3 games in a row', 'flame', 'streak', 30, 'common', 40),
('unstoppable', 'Inarretable', 'Unstoppable', 'Gagne 5 parties consecutives', 'Win 5 games in a row', 'rocket', 'streak', 75, 'rare', 41),

-- Explorer achievements
('pack_explorer', 'Explorateur', 'Pack Explorer', 'Joue avec 5 packs differents', 'Play with 5 different packs', 'compass', 'general', 25, 'common', 50),
('math_master', 'Maitre des Maths', 'Math Master', 'Gagne au moins une partie avec chaque type de pack', 'Win at least one game with each pack type', 'graduation-cap', 'mastery', 150, 'legendary', 51);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE guess_who_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE guess_who_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE guess_who_player_achievements ENABLE ROW LEVEL SECURITY;

-- Player stats: players can read their own stats, service role can update
CREATE POLICY "Players can view their own stats"
    ON guess_who_player_stats FOR SELECT
    USING (auth.uid() = player_id);

CREATE POLICY "Service role can manage all stats"
    ON guess_who_player_stats FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Achievements: everyone can read achievement definitions
CREATE POLICY "Anyone can view achievements"
    ON guess_who_achievements FOR SELECT
    USING (true);

-- Player achievements: players can view their own, service role can insert
CREATE POLICY "Players can view their own achievements"
    ON guess_who_player_achievements FOR SELECT
    USING (auth.uid() = player_id);

CREATE POLICY "Service role can manage all player achievements"
    ON guess_who_player_achievements FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Leaderboard: everyone can view (it's public)
-- Note: Views don't need RLS, they inherit from base tables

-- ============================================================================
-- FUNCTION: Update player stats after game completion
-- ============================================================================

CREATE OR REPLACE FUNCTION update_guess_who_stats(
    p_player_id UUID,
    p_pack_id TEXT,
    p_won BOOLEAN,
    p_questions_asked INTEGER,
    p_correct_answers INTEGER,
    p_incorrect_answers INTEGER,
    p_game_time_seconds INTEGER
) RETURNS void AS $$
BEGIN
    INSERT INTO guess_who_player_stats (
        player_id, pack_id, games_played, games_won, games_lost,
        total_questions_asked, total_correct_answers, total_incorrect_answers,
        total_game_time_seconds, best_time_seconds, fewest_questions_win,
        current_win_streak, best_win_streak
    ) VALUES (
        p_player_id, p_pack_id, 1,
        CASE WHEN p_won THEN 1 ELSE 0 END,
        CASE WHEN p_won THEN 0 ELSE 1 END,
        p_questions_asked, p_correct_answers, p_incorrect_answers,
        p_game_time_seconds,
        CASE WHEN p_won THEN p_game_time_seconds ELSE NULL END,
        CASE WHEN p_won THEN p_questions_asked ELSE NULL END,
        CASE WHEN p_won THEN 1 ELSE 0 END,
        CASE WHEN p_won THEN 1 ELSE 0 END
    )
    ON CONFLICT (player_id, pack_id) DO UPDATE SET
        games_played = guess_who_player_stats.games_played + 1,
        games_won = guess_who_player_stats.games_won + CASE WHEN p_won THEN 1 ELSE 0 END,
        games_lost = guess_who_player_stats.games_lost + CASE WHEN p_won THEN 0 ELSE 1 END,
        total_questions_asked = guess_who_player_stats.total_questions_asked + p_questions_asked,
        total_correct_answers = guess_who_player_stats.total_correct_answers + p_correct_answers,
        total_incorrect_answers = guess_who_player_stats.total_incorrect_answers + p_incorrect_answers,
        total_game_time_seconds = guess_who_player_stats.total_game_time_seconds + p_game_time_seconds,
        best_time_seconds = CASE
            WHEN p_won AND (guess_who_player_stats.best_time_seconds IS NULL OR p_game_time_seconds < guess_who_player_stats.best_time_seconds)
            THEN p_game_time_seconds
            ELSE guess_who_player_stats.best_time_seconds
        END,
        fewest_questions_win = CASE
            WHEN p_won AND (guess_who_player_stats.fewest_questions_win IS NULL OR p_questions_asked < guess_who_player_stats.fewest_questions_win)
            THEN p_questions_asked
            ELSE guess_who_player_stats.fewest_questions_win
        END,
        current_win_streak = CASE
            WHEN p_won THEN guess_who_player_stats.current_win_streak + 1
            ELSE 0
        END,
        best_win_streak = CASE
            WHEN p_won AND guess_who_player_stats.current_win_streak + 1 > guess_who_player_stats.best_win_streak
            THEN guess_who_player_stats.current_win_streak + 1
            ELSE guess_who_player_stats.best_win_streak
        END,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE guess_who_player_stats IS 'Player statistics per pack for Guess Who Math game';
COMMENT ON TABLE guess_who_achievements IS 'Achievement definitions for Guess Who Math game';
COMMENT ON TABLE guess_who_player_achievements IS 'Tracks which achievements each player has unlocked';
COMMENT ON VIEW guess_who_leaderboard IS 'Leaderboard view combining player stats with profile info';
COMMENT ON FUNCTION update_guess_who_stats IS 'Updates player statistics after a game completion';
