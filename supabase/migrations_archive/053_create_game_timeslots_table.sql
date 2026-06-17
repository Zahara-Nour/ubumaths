-- Migration: Create game_timeslots table
-- Description: Teacher-scheduled challenges for classes
-- Author: Claude Code
-- Date: 2025-10-15

CREATE TABLE game_timeslots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timeslot Definition
  name TEXT NOT NULL,  -- e.g., "Fractions Practice"
  challenge_ids UUID[] NOT NULL,  -- Specific challenges to use

  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),

  -- Scheduling
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,

  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT timeslot_valid_dates CHECK (ends_at > starts_at)
);

-- Indexes
CREATE INDEX idx_game_timeslots_class_id ON game_timeslots(class_id);
CREATE INDEX idx_game_timeslots_teacher_id ON game_timeslots(teacher_id);
CREATE INDEX idx_game_timeslots_active ON game_timeslots(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE game_timeslots IS 'Teacher-scheduled challenge timeslots for specific classes';
COMMENT ON COLUMN game_timeslots.challenge_ids IS 'Array of specific challenge IDs to use during this timeslot';
