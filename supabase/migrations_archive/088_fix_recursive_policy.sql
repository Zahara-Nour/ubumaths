/**
 * Fix Recursive Policy Issue
 * ===========================
 *
 * Remove the recursive policy and create a simpler one that doesn't
 * reference srs_decks within a policy on srs_decks.
 */

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Teachers can view assigned student decks" ON srs_decks;

-- Create a simpler policy: teachers can view decks where they appear as assigned_by
CREATE POLICY "Teachers can view assigned student decks"
ON srs_decks FOR SELECT
USING (
  -- Teachers can view student decks if they created the assignment
  is_assigned = true
  AND
  EXISTS (
    SELECT 1 FROM srs_deck_assignments sda
    WHERE sda.assigned_by = auth.uid()
    AND sda.assigned_to = srs_decks.owner_id
  )
);

-- Fix the cards policy too
DROP POLICY IF EXISTS "Teachers can view cards in assigned decks" ON srs_cards;

CREATE POLICY "Teachers can view cards in assigned decks"
ON srs_cards FOR SELECT
USING (
  deck_id IN (
    SELECT sd.id
    FROM srs_decks sd
    INNER JOIN srs_deck_assignments sda ON sda.assigned_to = sd.owner_id
    WHERE sda.assigned_by = auth.uid()
    AND sd.is_assigned = true
  )
);

-- Fix the card stats policy
DROP POLICY IF EXISTS "Teachers can view stats for assigned decks" ON srs_card_stats;

CREATE POLICY "Teachers can view stats for assigned decks"
ON srs_card_stats FOR SELECT
USING (
  user_id IN (
    SELECT assigned_to
    FROM srs_deck_assignments
    WHERE assigned_by = auth.uid()
  )
);
