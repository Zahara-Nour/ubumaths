/**
 * Allow Teachers to View Assigned Decks
 * ======================================
 *
 * Allow teachers to view student decks that they assigned
 * (for verification and tracking purposes).
 */

-- Teachers can view decks they assigned to students
CREATE POLICY "Teachers can view assigned student decks"
ON srs_decks FOR SELECT
USING (
  -- Teacher viewing decks they assigned
  EXISTS (
    SELECT 1 FROM srs_deck_assignments
    WHERE source_deck_id IN (
      SELECT id FROM srs_decks sd
      WHERE sd.owner_id = auth.uid()
      AND sd.is_assigned = true
    )
    AND assigned_to = srs_decks.owner_id
    AND srs_decks.is_assigned = true
  )
);

-- Teachers can view cards in decks they assigned
CREATE POLICY "Teachers can view cards in assigned decks"
ON srs_cards FOR SELECT
USING (
  deck_id IN (
    SELECT sd.id
    FROM srs_decks sd
    INNER JOIN srs_deck_assignments sda ON sda.assigned_to = sd.owner_id
    WHERE sda.source_deck_id IN (
      SELECT id FROM srs_decks
      WHERE owner_id = auth.uid()
      AND is_assigned = true
    )
    AND sd.is_assigned = true
  )
);

-- Teachers can view card stats for decks they assigned (for progress tracking)
CREATE POLICY "Teachers can view stats for assigned decks"
ON srs_card_stats FOR SELECT
USING (
  user_id IN (
    SELECT assigned_to
    FROM srs_deck_assignments
    WHERE source_deck_id IN (
      SELECT id FROM srs_decks
      WHERE owner_id = auth.uid()
      AND is_assigned = true
    )
  )
);
