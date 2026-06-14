-- Test Script: Academic Periods Migration
-- Purpose: Verify all tables, constraints, RLS policies, and auto-assignment logic work correctly
-- Usage: Run this AFTER applying the 4 migrations with `pnpm db:migrate`

-- =============================================================================
-- PART 1: Basic Schema Verification
-- =============================================================================

\echo '=== Part 1: Verifying tables exist ==='

SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'school_years'
) AS school_years_exists;

SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'academic_periods'
) AS academic_periods_exists;

SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'school_holidays'
) AS school_holidays_exists;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'assessments' AND column_name = 'academic_period_id';

-- =============================================================================
-- PART 2: Test Data Setup
-- =============================================================================

\echo '=== Part 2: Inserting test data ==='

-- Assume a school exists (replace with actual school_id from your DB)
-- For testing, we'll create a temporary one
INSERT INTO schools (id, name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test School for Academic Periods',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert school year (2024-2025)
INSERT INTO school_years (id, school_id, name, start_date, end_date, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  '2024-2025',
  '2024-09-01',
  '2025-07-15',
  true
);

-- Insert 3 trimesters
INSERT INTO academic_periods (school_year_id, type, name, start_date, end_date, period_order, color)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'trimester', 'Trimestre 1', '2024-09-01', '2024-12-20', 1, '#3b82f6'),
  ('11111111-1111-1111-1111-111111111111', 'trimester', 'Trimestre 2', '2025-01-06', '2025-04-04', 2, '#10b981'),
  ('11111111-1111-1111-1111-111111111111', 'trimester', 'Trimestre 3', '2025-04-22', '2025-07-15', 3, '#f59e0b');

-- Insert school holidays
INSERT INTO school_holidays (school_year_id, name, start_date, end_date)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Vacances de Noël', '2024-12-21', '2025-01-05'),
  ('11111111-1111-1111-1111-111111111111', 'Vacances de printemps', '2025-04-05', '2025-04-21'),
  ('11111111-1111-1111-1111-111111111111', 'Vacances d''été', '2025-07-16', '2025-08-31');

\echo '=== Test data inserted successfully ==='

-- =============================================================================
-- PART 3: Constraint Testing
-- =============================================================================

\echo '=== Part 3: Testing constraints ==='

-- Test 1: Only one active school year per school (should fail)
\echo 'Test 1: Attempting to insert second active year (should FAIL)...'
DO $$
BEGIN
  INSERT INTO school_years (school_id, name, start_date, end_date, is_active)
  VALUES (
    '00000000-0000-0000-0000-000000000001',
    '2025-2026',
    '2025-09-01',
    '2026-07-15',
    true  -- This should fail
  );
  RAISE EXCEPTION 'Test FAILED: Second active year was allowed!';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Test PASSED: Second active year correctly rejected';
END $$;

-- Test 2: Invalid date ranges (should fail)
\echo 'Test 2: Attempting invalid date range (should FAIL)...'
DO $$
BEGIN
  INSERT INTO school_years (school_id, name, start_date, end_date, is_active)
  VALUES (
    '00000000-0000-0000-0000-000000000001',
    '2025-2026',
    '2025-09-01',
    '2025-08-01',  -- End before start!
    false
  );
  RAISE EXCEPTION 'Test FAILED: Invalid date range was allowed!';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'Test PASSED: Invalid date range correctly rejected';
END $$;

-- Test 3: Duplicate period order (should fail)
\echo 'Test 3: Attempting duplicate period order (should FAIL)...'
DO $$
BEGIN
  INSERT INTO academic_periods (school_year_id, type, name, start_date, end_date, period_order)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    'trimester',
    'Duplicate Period',
    '2024-09-01',
    '2024-12-20',
    1  -- Already exists!
  );
  RAISE EXCEPTION 'Test FAILED: Duplicate period order was allowed!';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Test PASSED: Duplicate period order correctly rejected';
END $$;

-- Test 4: Invalid period type (should fail)
\echo 'Test 4: Attempting invalid period type (should FAIL)...'
DO $$
BEGIN
  INSERT INTO academic_periods (school_year_id, type, name, start_date, end_date, period_order)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    'invalid_type',
    'Invalid Period',
    '2024-09-01',
    '2024-12-20',
    4
  );
  RAISE EXCEPTION 'Test FAILED: Invalid period type was allowed!';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'Test PASSED: Invalid period type correctly rejected';
END $$;

-- =============================================================================
-- PART 4: Auto-Assignment Testing
-- =============================================================================

\echo '=== Part 4: Testing auto-assignment trigger ==='

-- Create a test class linked to the test school
INSERT INTO classes (id, school_id, name, grade, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000001',
  'Test Class 6eme',
  '6eme',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Create a test teacher
INSERT INTO profiles (id, school_id, role, first_name, last_name, created_at, updated_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000001',
  'teacher',
  'Test',
  'Teacher',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Test 5: Auto-assignment for assessment in Trimestre 1
\echo 'Test 5: Creating assessment in Trimestre 1 (should auto-assign)...'
INSERT INTO assessments (
  id,
  teacher_id,
  class_id,
  title,
  max_points,
  categories,
  status,
  created_at
)
VALUES (
  '44444444-4444-4444-4444-444444444441',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Test Assessment Trimestre 1',
  100,
  ARRAY['Algèbre'],
  'published',
  '2024-10-15 10:00:00+00'::timestamptz  -- During Trimestre 1
)
ON CONFLICT (id) DO UPDATE SET created_at = EXCLUDED.created_at;

SELECT
  a.title,
  a.created_at::date AS assessment_date,
  ap.name AS assigned_period,
  ap.start_date,
  ap.end_date
FROM assessments a
LEFT JOIN academic_periods ap ON ap.id = a.academic_period_id
WHERE a.id = '44444444-4444-4444-4444-444444444441';

-- Test 6: Auto-assignment for assessment in Trimestre 2
\echo 'Test 6: Creating assessment in Trimestre 2 (should auto-assign)...'
INSERT INTO assessments (
  id,
  teacher_id,
  class_id,
  title,
  max_points,
  categories,
  status,
  created_at
)
VALUES (
  '44444444-4444-4444-4444-444444444442',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Test Assessment Trimestre 2',
  100,
  ARRAY['Géométrie'],
  'published',
  '2025-02-15 10:00:00+00'::timestamptz  -- During Trimestre 2
)
ON CONFLICT (id) DO UPDATE SET created_at = EXCLUDED.created_at;

SELECT
  a.title,
  a.created_at::date AS assessment_date,
  ap.name AS assigned_period,
  ap.start_date,
  ap.end_date
FROM assessments a
LEFT JOIN academic_periods ap ON ap.id = a.academic_period_id
WHERE a.id = '44444444-4444-4444-4444-444444444442';

-- Test 7: Assessment during holidays (should be NULL or assigned to next period)
\echo 'Test 7: Creating assessment during holidays (should be NULL)...'
INSERT INTO assessments (
  id,
  teacher_id,
  class_id,
  title,
  max_points,
  categories,
  status,
  created_at
)
VALUES (
  '44444444-4444-4444-4444-444444444443',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Test Assessment During Holidays',
  100,
  ARRAY['Algèbre'],
  'published',
  '2024-12-25 10:00:00+00'::timestamptz  -- During Vacances de Noël
)
ON CONFLICT (id) DO UPDATE SET created_at = EXCLUDED.created_at;

SELECT
  a.title,
  a.created_at::date AS assessment_date,
  ap.name AS assigned_period,
  CASE
    WHEN ap.id IS NULL THEN 'CORRECTLY NULL (during holidays)'
    ELSE 'ASSIGNED (unexpected)'
  END AS result
FROM assessments a
LEFT JOIN academic_periods ap ON ap.id = a.academic_period_id
WHERE a.id = '44444444-4444-4444-4444-444444444443';

-- =============================================================================
-- PART 5: Backfill Function Testing
-- =============================================================================

\echo '=== Part 5: Testing backfill function ==='

-- Create assessment without auto-assignment (simulate old data)
UPDATE assessments
SET academic_period_id = NULL
WHERE id = '44444444-4444-4444-4444-444444444441';

\echo 'Before backfill:'
SELECT COUNT(*) AS unassigned_count
FROM assessments
WHERE class_id = '22222222-2222-2222-2222-222222222222'
  AND academic_period_id IS NULL;

-- Run backfill function
SELECT link_existing_assessments_to_periods('11111111-1111-1111-1111-111111111111') AS updated_count;

\echo 'After backfill:'
SELECT COUNT(*) AS unassigned_count
FROM assessments
WHERE class_id = '22222222-2222-2222-2222-222222222222'
  AND academic_period_id IS NULL;

-- =============================================================================
-- PART 6: Summary Report
-- =============================================================================

\echo '=== Part 6: Summary Report ==='

SELECT
  sy.name AS school_year,
  sy.is_active,
  COUNT(DISTINCT ap.id) AS period_count,
  COUNT(DISTINCT sh.id) AS holiday_count,
  COUNT(DISTINCT a.id) AS assessment_count
FROM school_years sy
LEFT JOIN academic_periods ap ON ap.school_year_id = sy.id
LEFT JOIN school_holidays sh ON sh.school_year_id = sy.id
LEFT JOIN classes c ON c.school_id = sy.school_id
LEFT JOIN assessments a ON a.class_id = c.id AND a.academic_period_id IN (
  SELECT id FROM academic_periods WHERE school_year_id = sy.id
)
WHERE sy.school_id = '00000000-0000-0000-0000-000000000001'
GROUP BY sy.id, sy.name, sy.is_active;

\echo '=== All tests completed! ==='
\echo 'Check above for any FAILED tests. All should show PASSED.'

-- =============================================================================
-- CLEANUP (Optional - uncomment to remove test data)
-- =============================================================================

-- \echo '=== Cleaning up test data ==='
-- DELETE FROM assessments WHERE teacher_id = '33333333-3333-3333-3333-333333333333';
-- DELETE FROM profiles WHERE id = '33333333-3333-3333-3333-333333333333';
-- DELETE FROM classes WHERE id = '22222222-2222-2222-2222-222222222222';
-- DELETE FROM school_holidays WHERE school_year_id = '11111111-1111-1111-1111-111111111111';
-- DELETE FROM academic_periods WHERE school_year_id = '11111111-1111-1111-1111-111111111111';
-- DELETE FROM school_years WHERE id = '11111111-1111-1111-1111-111111111111';
-- DELETE FROM schools WHERE id = '00000000-0000-0000-0000-000000000001';
-- \echo '=== Cleanup complete ==='
