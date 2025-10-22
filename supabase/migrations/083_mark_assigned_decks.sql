/**
 * Mark Assigned SRS Decks
 * ========================
 *
 * Updates source decks that have been assigned to students/classes
 * to have is_assigned = true.
 *
 * This fixes decks that were assigned before the flag was automatically set.
 */

-- Update all source decks that have assignments
UPDATE srs_decks
SET is_assigned = true
WHERE id IN (
  SELECT DISTINCT source_deck_id
  FROM srs_deck_assignments
)
AND is_assigned = false;

-- Verify the specific deck mentioned by user
UPDATE srs_decks
SET is_assigned = true
WHERE id = '037a801e-c2a2-4189-87fc-36aaf71ac287'
AND is_assigned = false;
