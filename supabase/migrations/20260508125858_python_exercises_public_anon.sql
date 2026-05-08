-- Migration: Allow anon (and any authenticated user) to read public python_exercises
-- Created: 2026-05-08
-- Description:
--   The original migration (20251206010000_create_python_exercises.sql) restricted
--   the python_exercises_select_public policy to authenticated teachers only.
--   That blocked the share-by-link use case where any visitor (signed in or not,
--   teacher or student or anon) opens /python-exercises/<id> and sees the exercise.
--
--   This migration drops the old policy and recreates two policies:
--     - python_exercises_select_public_anon  → anon + authenticated, is_public only
--     - (keeps python_exercises_select_own and _select_assigned untouched)
--
--   The API GET endpoint is responsible for stripping `solution_code` from the
--   payload returned to anyone who is not the author. RLS only controls row
--   visibility, not column projection.

-- Drop the old policy that required role = 'teacher'
DROP POLICY IF EXISTS python_exercises_select_public ON python_exercises;

-- Recreate it with broader audience: anon + authenticated, no role check
CREATE POLICY python_exercises_select_public_anon ON python_exercises
    FOR SELECT
    TO anon, authenticated
    USING (is_public = TRUE);

COMMENT ON POLICY python_exercises_select_public_anon ON python_exercises IS
    'Anyone (anon or authenticated, any role) can read exercises marked is_public=true. The API endpoint strips solution_code for non-author readers.';
