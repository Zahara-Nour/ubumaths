/**
 * Recreate Missing Deck Copies for Students
 * ==========================================
 *
 * This migration checks if deck assignments have corresponding student copies.
 * If not, it creates them.
 *
 * This fixes the issue where decks were marked as assigned but student copies
 * were not created.
 */

-- Create a function to copy decks to students who have assignments but no deck copy
CREATE OR REPLACE FUNCTION recreate_missing_student_decks()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  assignment_record RECORD;
  source_deck_record RECORD;
  new_deck_id uuid;
  card_record RECORD;
BEGIN
  -- Loop through all assignments
  FOR assignment_record IN
    SELECT
      sda.id as assignment_id,
      sda.source_deck_id,
      sda.assigned_to as student_id,
      sda.assigned_by as teacher_id
    FROM srs_deck_assignments sda
    WHERE sda.assignment_type = 'student'
  LOOP
    -- Check if student already has a copy of this deck
    IF NOT EXISTS (
      SELECT 1
      FROM srs_decks
      WHERE owner_id = assignment_record.student_id
        AND is_assigned = true
        AND created_at >= (
          SELECT created_at
          FROM srs_deck_assignments
          WHERE id = assignment_record.assignment_id
        )
        AND name = (
          SELECT name
          FROM srs_decks
          WHERE id = assignment_record.source_deck_id
        )
    ) THEN
      -- Get source deck details
      SELECT * INTO source_deck_record
      FROM srs_decks
      WHERE id = assignment_record.source_deck_id;

      -- Create deck copy for student
      INSERT INTO srs_decks (
        name,
        description,
        owner_id,
        deck_type,
        is_assigned,
        config
      )
      VALUES (
        source_deck_record.name,
        source_deck_record.description,
        assignment_record.student_id,
        source_deck_record.deck_type,
        true,
        source_deck_record.config
      )
      RETURNING id INTO new_deck_id;

      RAISE NOTICE 'Created deck copy % for student % from source deck %',
        new_deck_id, assignment_record.student_id, assignment_record.source_deck_id;

      -- Copy all cards from source deck to new deck
      FOR card_record IN
        SELECT *
        FROM srs_cards
        WHERE deck_id = assignment_record.source_deck_id
      LOOP
        INSERT INTO srs_cards (
          deck_id,
          card_type,
          template_id,
          front_content,
          back_content
        )
        VALUES (
          new_deck_id,
          card_record.card_type,
          card_record.template_id,
          card_record.front_content,
          card_record.back_content
        );
      END LOOP;

      RAISE NOTICE 'Copied cards for deck %', new_deck_id;
    END IF;
  END LOOP;
END;
$$;

-- Execute the function
SELECT recreate_missing_student_decks();

-- Drop the temporary function
DROP FUNCTION recreate_missing_student_decks();
