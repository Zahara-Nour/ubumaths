/**
 * Fix SRS Deck Assignment Policies
 * =================================
 *
 * Allow teachers and admins to create decks for students (for deck assignment).
 * Also allow them to create cards in those assigned decks.
 */

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can create their own decks" ON srs_decks;

-- Create new policy that allows:
-- 1. Users to create their own decks
-- 2. Teachers/admins to create decks for students (for assignment)
CREATE POLICY "Users can create decks"
ON srs_decks FOR INSERT
WITH CHECK (
  -- User creating their own deck
  auth.uid() = owner_id
  OR
  -- Teacher/admin creating deck for a student (assignment)
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = owner_id
      AND role = 'student'
    )
  )
);

-- Drop existing restrictive card insert policy
DROP POLICY IF EXISTS "Users can create cards in their non-assigned decks" ON srs_cards;

-- Create new policy that allows:
-- 1. Users to create cards in their own non-assigned decks
-- 2. Teachers/admins to create cards when assigning decks (even if marked as assigned)
CREATE POLICY "Users can create cards in decks"
ON srs_cards FOR INSERT
WITH CHECK (
  deck_id IN (
    -- User's own non-assigned decks
    SELECT id FROM srs_decks
    WHERE owner_id = auth.uid()
    AND is_assigned = false
  )
  OR
  -- Teacher/admin creating cards during assignment
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  )
);

-- Also need to allow teachers to create assignment records
DROP POLICY IF EXISTS "Teachers can create assignments" ON srs_deck_assignments;
CREATE POLICY "Teachers can create assignments"
ON srs_deck_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('teacher', 'admin')
  )
);

-- Teachers and students can view assignments they're involved in
DROP POLICY IF EXISTS "Users can view their assignments" ON srs_deck_assignments;
CREATE POLICY "Users can view their assignments"
ON srs_deck_assignments FOR SELECT
USING (
  auth.uid() = assigned_by
  OR auth.uid() = assigned_to
);
