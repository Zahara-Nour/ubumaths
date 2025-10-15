-- Migration: Create game_challenge_attempts table
-- Description: Student challenge history for analytics
-- Author: Claude Code
-- Date: 2025-10-15

CREATE TABLE game_challenge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES game_challenges(id) ON DELETE CASCADE,
  combat_id UUID REFERENCES game_combats(id) ON DELETE SET NULL,  -- Context

  -- Attempt Details
  success BOOLEAN NOT NULL,
  time_taken INTEGER NOT NULL,  -- Milliseconds
  answer_given JSONB NOT NULL,  -- Student's answer
  correct_answer JSONB NOT NULL,  -- Expected answer

  -- Challenge Instance (randomized variables)
  challenge_instance JSONB NOT NULL,  -- The specific challenge shown

  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_game_challenge_attempts_user_id ON game_challenge_attempts(user_id);
CREATE INDEX idx_game_challenge_attempts_challenge_id ON game_challenge_attempts(challenge_id);
CREATE INDEX idx_game_challenge_attempts_combat_id ON game_challenge_attempts(combat_id);
CREATE INDEX idx_game_challenge_attempts_success ON game_challenge_attempts(success);
CREATE INDEX idx_game_challenge_attempts_attempted_at ON game_challenge_attempts(attempted_at DESC);

-- Comments
COMMENT ON TABLE game_challenge_attempts IS 'Complete history of student challenge attempts for teacher analytics';
COMMENT ON COLUMN game_challenge_attempts.challenge_instance IS 'The randomized instance of the challenge with specific variable values';
