-- Migration: Add RLS policies for all game tables
-- Description: Row Level Security for game tables
-- Author: Claude Code
-- Date: 2025-10-15

-- ============================================================================
-- game_players RLS Policies
-- ============================================================================

ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- Players can view their own profile
CREATE POLICY "Users can view own game profile"
  ON game_players FOR SELECT
  USING (auth.uid() = user_id);

-- Players can update their own profile (limited fields)
CREATE POLICY "Users can update own game profile"
  ON game_players FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Players can insert their own profile
CREATE POLICY "Users can insert own game profile"
  ON game_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Teachers can view their students' profiles
CREATE POLICY "Teachers can view student game profiles"
  ON game_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON cm.class_id = c.id
      WHERE cm.student_id = game_players.user_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all game profiles"
  ON game_players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- game_spells RLS Policies
-- ============================================================================

ALTER TABLE game_spells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spells"
  ON game_spells FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spells"
  ON game_spells FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spells"
  ON game_spells FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can view student spells"
  ON game_spells FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON cm.class_id = c.id
      WHERE cm.student_id = game_spells.user_id
        AND c.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- game_monsters RLS Policies
-- ============================================================================

ALTER TABLE game_monsters ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active monsters
CREATE POLICY "Authenticated users can view monsters"
  ON game_monsters FOR SELECT
  USING (auth.role() = 'authenticated');

-- Teachers can insert monsters for their classes
CREATE POLICY "Teachers can spawn monsters"
  ON game_monsters FOR INSERT
  WITH CHECK (
    auth.uid() = spawned_by AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- ============================================================================
-- game_combats RLS Policies
-- ============================================================================

ALTER TABLE game_combats ENABLE ROW LEVEL SECURITY;

-- Users can view combats they're participating in
CREATE POLICY "Users can view own combats"
  ON game_combats FOR SELECT
  USING (
    auth.uid() = organizer_id OR
    auth.uid() = ANY(invited_player_ids) OR
    auth.uid() = ANY(ready_player_ids)
  );

-- Users can create combats
CREATE POLICY "Users can create combats"
  ON game_combats FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

-- Users can update combats they're participating in
CREATE POLICY "Users can update own combats"
  ON game_combats FOR UPDATE
  USING (
    auth.uid() = organizer_id OR
    auth.uid() = ANY(ready_player_ids)
  )
  WITH CHECK (
    auth.uid() = organizer_id OR
    auth.uid() = ANY(ready_player_ids)
  );

-- Teachers can view student combats
CREATE POLICY "Teachers can view student combats"
  ON game_combats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON cm.class_id = c.id
      WHERE cm.student_id = game_combats.organizer_id
        AND c.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- game_challenges RLS Policies
-- ============================================================================

ALTER TABLE game_challenges ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active challenges
CREATE POLICY "Authenticated users can view challenges"
  ON game_challenges FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Teachers can create custom challenges
CREATE POLICY "Teachers can create challenges"
  ON game_challenges FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Teachers can update their own challenges
CREATE POLICY "Teachers can update own challenges"
  ON game_challenges FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ============================================================================
-- game_challenge_attempts RLS Policies
-- ============================================================================

ALTER TABLE game_challenge_attempts ENABLE ROW LEVEL SECURITY;

-- Users can view their own attempts
CREATE POLICY "Users can view own attempts"
  ON game_challenge_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own attempts
CREATE POLICY "Users can insert own attempts"
  ON game_challenge_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Teachers can view student attempts
CREATE POLICY "Teachers can view student attempts"
  ON game_challenge_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON cm.class_id = c.id
      WHERE cm.student_id = game_challenge_attempts.user_id
        AND c.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- game_achievements RLS Policies
-- ============================================================================

ALTER TABLE game_achievements ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view achievements
CREATE POLICY "Authenticated users can view achievements"
  ON game_achievements FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- game_player_achievements RLS Policies
-- ============================================================================

ALTER TABLE game_player_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievement progress"
  ON game_player_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievement progress"
  ON game_player_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievement progress"
  ON game_player_achievements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can view student achievement progress"
  ON game_player_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON cm.class_id = c.id
      WHERE cm.student_id = game_player_achievements.user_id
        AND c.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- game_leaderboards RLS Policies
-- ============================================================================

ALTER TABLE game_leaderboards ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view leaderboards
CREATE POLICY "Authenticated users can view leaderboards"
  ON game_leaderboards FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can insert/update their own leaderboard entries
CREATE POLICY "Users can upsert own leaderboard entries"
  ON game_leaderboards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- game_timeslots RLS Policies
-- ============================================================================

ALTER TABLE game_timeslots ENABLE ROW LEVEL SECURITY;

-- Students can view timeslots for their classes
CREATE POLICY "Students can view class timeslots"
  ON game_timeslots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      WHERE cm.class_id = game_timeslots.class_id
        AND cm.student_id = auth.uid()
    )
  );

-- Teachers can manage timeslots for their classes
CREATE POLICY "Teachers can manage own class timeslots"
  ON game_timeslots FOR ALL
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- ============================================================================
-- game_spell_decks RLS Policies
-- ============================================================================

ALTER TABLE game_spell_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spell decks"
  ON game_spell_decks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spell decks"
  ON game_spell_decks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spell decks"
  ON game_spell_decks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own spell decks"
  ON game_spell_decks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- game_class_settings RLS Policies
-- ============================================================================

ALTER TABLE game_class_settings ENABLE ROW LEVEL SECURITY;

-- Students can view settings for their classes
CREATE POLICY "Students can view class game settings"
  ON game_class_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      WHERE cm.class_id = game_class_settings.class_id
        AND cm.student_id = auth.uid()
    )
  );

-- Teachers can manage settings for their classes
CREATE POLICY "Teachers can manage own class settings"
  ON game_class_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = game_class_settings.class_id
        AND teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = game_class_settings.class_id
        AND teacher_id = auth.uid()
    )
  );
