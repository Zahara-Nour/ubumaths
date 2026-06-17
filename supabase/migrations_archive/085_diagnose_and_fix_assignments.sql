/**
 * Diagnose and Fix Missing Assignments
 * =====================================
 *
 * This migration:
 * 1. Checks for decks marked as assigned but with no assignment records
 * 2. Checks for student decks with is_assigned=true but no parent assignment
 * 3. Creates missing assignment records based on student deck copies
 */

-- First, let's see what we have
DO $$
DECLARE
  deck_count INTEGER;
  assignment_count INTEGER;
  student_deck_count INTEGER;
BEGIN
  -- Count source decks marked as assigned
  SELECT COUNT(*) INTO deck_count
  FROM srs_decks
  WHERE is_assigned = true;

  RAISE NOTICE 'Source decks marked as assigned: %', deck_count;

  -- Count assignments
  SELECT COUNT(*) INTO assignment_count
  FROM srs_deck_assignments;

  RAISE NOTICE 'Assignment records: %', assignment_count;

  -- Count student deck copies (is_assigned = true, but not teacher-owned)
  SELECT COUNT(*) INTO student_deck_count
  FROM srs_decks sd
  INNER JOIN profiles p ON sd.owner_id = p.id
  WHERE sd.is_assigned = true
    AND p.role = 'student';

  RAISE NOTICE 'Student deck copies: %', student_deck_count;
END $$;

-- Create missing assignment records for existing student deck copies
-- This will create assignments based on student decks that exist but have no assignment record
INSERT INTO srs_deck_assignments (
  source_deck_id,
  assigned_by,
  assigned_to,
  assignment_type,
  assigned_at
)
SELECT DISTINCT
  -- Find the likely source deck (same name, teacher-owned, marked as assigned)
  (
    SELECT src.id
    FROM srs_decks src
    INNER JOIN profiles tp ON src.owner_id = tp.id
    WHERE src.name = student_deck.name
      AND src.is_assigned = true
      AND tp.role IN ('teacher', 'admin')
    ORDER BY src.created_at DESC
    LIMIT 1
  ) as source_deck_id,
  -- Find the teacher who owns the source deck
  (
    SELECT src.owner_id
    FROM srs_decks src
    INNER JOIN profiles tp ON src.owner_id = tp.id
    WHERE src.name = student_deck.name
      AND src.is_assigned = true
      AND tp.role IN ('teacher', 'admin')
    ORDER BY src.created_at DESC
    LIMIT 1
  ) as assigned_by,
  student_deck.owner_id as assigned_to,
  'student' as assignment_type,
  student_deck.created_at as assigned_at
FROM srs_decks student_deck
INNER JOIN profiles sp ON student_deck.owner_id = sp.id
WHERE student_deck.is_assigned = true
  AND sp.role = 'student'
  -- Only create if assignment doesn't already exist
  AND NOT EXISTS (
    SELECT 1
    FROM srs_deck_assignments sda
    WHERE sda.assigned_to = student_deck.owner_id
      AND sda.source_deck_id = (
        SELECT src.id
        FROM srs_decks src
        INNER JOIN profiles tp ON src.owner_id = tp.id
        WHERE src.name = student_deck.name
          AND src.is_assigned = true
          AND tp.role IN ('teacher', 'admin')
        ORDER BY src.created_at DESC
        LIMIT 1
      )
  );

-- Report what was done
DO $$
DECLARE
  created_count INTEGER;
BEGIN
  GET DIAGNOSTICS created_count = ROW_COUNT;
  RAISE NOTICE 'Created % missing assignment records', created_count;
END $$;
