-- Debug SRS Assignments
-- =======================
-- Check the state of assignments for deck 037a801e-c2a2-4189-87fc-36aaf71ac287

-- 1. Check source deck
SELECT 'SOURCE DECK' as type, id, name, owner_id, deck_type, is_assigned, created_at
FROM srs_decks
WHERE id = '037a801e-c2a2-4189-87fc-36aaf71ac287';

-- 2. Check assignments
SELECT 'ASSIGNMENTS' as type, id, source_deck_id, assigned_to, assigned_by, assignment_type, assigned_at
FROM srs_deck_assignments
WHERE source_deck_id = '037a801e-c2a2-4189-87fc-36aaf71ac287';

-- 3. Check student deck copies (by name matching)
SELECT 'STUDENT COPIES' as type, sd.id, sd.name, sd.owner_id, sd.is_assigned, sd.created_at, p.role, p.first_name, p.last_name
FROM srs_decks sd
INNER JOIN profiles p ON sd.owner_id = p.id
WHERE sd.name = (SELECT name FROM srs_decks WHERE id = '037a801e-c2a2-4189-87fc-36aaf71ac287')
  AND sd.is_assigned = true
  AND p.role = 'student'
ORDER BY sd.created_at DESC;

-- 4. Check cards in source deck
SELECT 'SOURCE CARDS' as type, COUNT(*) as card_count
FROM srs_cards
WHERE deck_id = '037a801e-c2a2-4189-87fc-36aaf71ac287';

-- 5. Check if students exist
SELECT 'STUDENTS' as type, COUNT(*) as student_count
FROM profiles
WHERE role = 'student';
