-- Fix RLS policy for game_monsters to allow students to create monsters for random combats
-- Author: Claude Code
-- Date: 2025-10-15

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Teachers can spawn monsters" ON game_monsters;

-- Create new policy: Teachers can spawn monsters with spawned_by set
CREATE POLICY "Teachers can spawn monsters"
  ON game_monsters FOR INSERT
  WITH CHECK (
    spawned_by IS NOT NULL AND
    auth.uid() = spawned_by AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Create new policy: Students can create random monsters (spawned_by NULL)
CREATE POLICY "Students can create random monsters"
  ON game_monsters FOR INSERT
  WITH CHECK (
    spawned_by IS NULL AND
    auth.role() = 'authenticated'
  );
