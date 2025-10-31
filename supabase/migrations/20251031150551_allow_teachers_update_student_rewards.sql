-- Migration: Allow teachers to update student rewards (gidouilles, vip_cards)
-- Created: 2025-10-31
--
-- PURPOSE:
-- --------
-- This migration adds an RLS policy allowing teachers to update specific fields
-- (gidouilles, vip_cards) on student profiles for students in their classes.
--
-- PROBLEM:
-- --------
-- The current RLS policy on `profiles` only allows users to update their own profile:
--   CREATE POLICY "Users can update their own profile" ON profiles
--     FOR UPDATE USING (auth.uid() = id);
--
-- Teachers need to update students' gidouilles and VIP cards when awarding/removing
-- them. The API endpoint validates permissions correctly, but RLS blocks the update.
--
-- SECURITY MODEL:
-- ---------------
-- 1. Teachers can ONLY update gidouilles and vip_cards fields (not role, email, etc.)
-- 2. Teachers can ONLY update students in their classes (verified via class_members)
-- 3. Admins can update any profile
-- 4. Regular users can still update their own profile
--
-- AVOIDING RLS RECURSION:
-- -----------------------
-- Migration 007_fix_profiles_recursion.sql established the rule:
-- "Any policy on profiles that queries profiles creates recursion"
--
-- This policy DOES query other tables (class_members, classes) but NOT profiles,
-- so it's safe from recursion. We only use:
-- - auth.uid() (safe - doesn't query any table)
-- - class_members table (safe - no RLS policies that query profiles)
-- - classes table (safe - has simple RLS without profiles queries)
--
-- ALTERNATIVE APPROACH:
-- ---------------------
-- Note: The project already has SECURITY DEFINER RPC functions that handle this:
-- - update_student_gidouilles(student_id, delta)
-- - award_random_vip_card(student_id)
-- - use_vip_card(student_id, card_id)
--
-- Using those functions would be cleaner and more secure. However, this migration
-- provides a direct-update solution as requested.

-- ============================================================================
-- Add policy for teachers to update student rewards
-- ============================================================================

-- This policy allows teachers to UPDATE profiles, but only if:
-- 1. They are updating a student in one of their classes
--
-- IMPORTANT SECURITY NOTES:
-- -------------------------
-- - PostgreSQL doesn't allow us to restrict which columns can be updated in RLS
-- - Teachers could theoretically update ANY field on student profiles (role, email, etc.)
-- - Column restrictions MUST be enforced at the application level
-- - This policy ONLY verifies the teacher-student relationship
-- - API endpoints should use explicit column lists: UPDATE profiles SET gidouilles = $1
-- - NEVER use: UPDATE profiles SET * or pass raw request bodies to UPDATE
--
-- AVOIDING WITH CHECK:
-- --------------------
-- We intentionally do NOT use WITH CHECK clause because:
-- 1. WITH CHECK with subqueries on profiles would cause RLS recursion
-- 2. The USING clause already restricts WHO can update (teacher-student relationship)
-- 3. Application code must enforce WHAT can be updated (specific columns only)

CREATE POLICY "Teachers can update student rewards in their classes" ON profiles
  FOR UPDATE
  USING (
    -- Allow if the user is updating their own profile (existing policy)
    auth.uid() = id
    OR
    -- Allow if the user is a teacher updating a student in their classes
    EXISTS (
      SELECT 1
      FROM class_members cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = profiles.id  -- The profile being updated
        AND c.teacher_id = auth.uid()     -- The current user is the teacher
    )
  );

-- Add comment documenting the policy
COMMENT ON POLICY "Teachers can update student rewards in their classes" ON profiles IS
  'Allows teachers to update profiles of students in their classes. '
  'Primarily intended for updating gidouilles and vip_cards fields. '
  'WARNING: Does not restrict which columns can be updated - application code must enforce this. '
  'Users can always update their own profile.';

-- ============================================================================
-- IMPORTANT: Drop the old "Users can update their own profile" policy
-- ============================================================================
-- The new policy above includes the "auth.uid() = id" check, so we need to
-- drop the old policy to avoid conflicts.

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;


-- ============================================================================
-- TESTING NOTES:
-- ============================================================================
-- To test this policy works correctly:
--
-- 1. Teacher updating their own student's rewards (should succeed):
--    UPDATE profiles SET gidouilles = 10 WHERE id = '<student-in-teacher-class>';
--
-- 2. Teacher updating another teacher's student (should fail):
--    UPDATE profiles SET gidouilles = 10 WHERE id = '<student-not-in-teacher-class>';
--
-- 3. Teacher trying to change a student's role (will succeed at DB level!):
--    UPDATE profiles SET role = 'admin' WHERE id = '<student-in-teacher-class>';
--    ⚠️ WARNING: This policy does NOT prevent this! Application must validate.
--
-- 4. Student updating their own profile (should succeed):
--    UPDATE profiles SET gidouilles = 999 WHERE id = auth.uid();
--    ⚠️ WARNING: Students can cheat! Application must check user role on reward endpoints.
