-- ========================================================================
-- Fix: Set missing class grades and sync to students
-- ========================================================================
-- 1. Update classes with missing grades based on their names
-- 2. Sync student grades from their class membership
-- 3. Apply consent requirements to students in grades requiring consent
-- ========================================================================

-- Step 1: Fix class grades based on class names
UPDATE classes SET grade = '2' WHERE grade IS NULL AND name ILIKE '%2nde%';
UPDATE classes SET grade = '3' WHERE grade IS NULL AND name ILIKE '%3ème%';
UPDATE classes SET grade = '4' WHERE grade IS NULL AND name ILIKE '%4ème%';
UPDATE classes SET grade = '5' WHERE grade IS NULL AND name ILIKE '%5ème%';
UPDATE classes SET grade = '6' WHERE grade IS NULL AND name ILIKE '%6ème%';

-- Log class grade fixes
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fixed_count FROM classes WHERE grade IS NOT NULL;
    RAISE NOTICE 'Classes with grades after fix: %', fixed_count;
END $$;

-- Step 2: Sync student grades from their class membership
-- For students in multiple classes, use the "lowest" grade (youngest students)
UPDATE profiles p
SET grade = subq.class_grade
FROM (
    SELECT
        cm.student_id,
        c.grade as class_grade
    FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    WHERE c.grade IS NOT NULL
    -- If student is in multiple classes, prioritize by grade order
    ORDER BY
        CASE c.grade
            WHEN '6' THEN 1
            WHEN '5' THEN 2
            WHEN '4' THEN 3
            WHEN '3' THEN 4
            WHEN '2' THEN 5
            WHEN '1_GEN' THEN 6
            WHEN '1_TECHNO' THEN 7
            WHEN '1_PRO' THEN 8
            WHEN 'T_GEN' THEN 9
            WHEN 'T_SPE' THEN 10
            WHEN 'T_EXP' THEN 11
            ELSE 99
        END
) subq
WHERE p.id = subq.student_id
  AND p.role = 'student'
  AND (p.grade IS NULL OR p.grade != subq.class_grade);

-- Log student grade sync
DO $$
DECLARE
    synced_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO synced_count
    FROM profiles
    WHERE role = 'student' AND grade IS NOT NULL;
    RAISE NOTICE 'Students with grades after sync: %', synced_count;
END $$;

-- Step 3: Apply consent requirements (same as original migration)
UPDATE profiles
SET
    consent_required = TRUE,
    consent_grace_period_ends = NOW() + INTERVAL '30 days'
WHERE
    role = 'student'
    AND grade IN ('6', '5', '4', '3', '2')
    AND consent_granted_at IS NULL
    AND consent_required IS NOT TRUE;

-- Log consent migration results
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count
    FROM profiles
    WHERE role = 'student'
      AND grade IN ('6', '5', '4', '3', '2')
      AND consent_required = TRUE
      AND consent_grace_period_ends IS NOT NULL
      AND consent_granted_at IS NULL;

    RAISE NOTICE 'Students now in 30-day consent grace period: %', affected_count;
END $$;
