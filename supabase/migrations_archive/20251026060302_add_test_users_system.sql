/**
 * Migration: Add Test Users System
 * ==================================
 *
 * PURPOSE:
 * Add support for test users with complete data isolation between
 * test and regular users in the teacher dashboard.
 *
 * CHANGES:
 * 1. Add is_test boolean field to profiles table
 * 2. Create user_preferences table for storing test mode preference
 * 3. Update get_teacher_classes_with_students RPC to filter by test mode
 * 4. Add indexes for performance
 * 5. Add RLS policies for user_preferences
 *
 * BEHAVIOR:
 * - Teachers can toggle test mode to see only test or only real students
 * - Test teachers (is_test = true) are always in test mode
 * - Analytics respect the test mode filter (complete data isolation)
 * - Admin can mark users as test and bulk manage test status
 *
 * Created: 2025-10-26
 */

-- ============================================================================
-- 1. Add is_test field to profiles table
-- ============================================================================

-- Add column with default FALSE (all existing users are real by default)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for filtering performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_test ON profiles(is_test);

-- Add comment for documentation
COMMENT ON COLUMN profiles.is_test IS
'Whether this user is a test user. Test users are isolated from real users in teacher dashboards.';

-- ============================================================================
-- 2. Create user_preferences table
-- ============================================================================

-- Create table for storing user preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  test_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Add comment for documentation
COMMENT ON TABLE user_preferences IS
'Stores user preferences including test mode toggle state for teachers.';

-- ============================================================================
-- 3. Enable RLS on user_preferences
-- ============================================================================

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all preferences
CREATE POLICY "Admins can view all preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 4. Update get_teacher_classes_with_students RPC function
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_teacher_classes_with_students(UUID);

-- Recreate with test mode parameter
CREATE OR REPLACE FUNCTION get_teacher_classes_with_students(
  p_teacher_id UUID,
  p_is_test_mode BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  teacher_id UUID,
  name TEXT,
  description TEXT,
  join_code TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  students JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.teacher_id,
    c.name,
    c.description,
    c.join_code,
    c.is_active,
    c.created_at,
    c.updated_at,
    -- Aggregate students into JSONB array with all required fields
    -- Filter by is_test to match the requested mode
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', p.id,
          'firstname', p.firstname,
          'lastname', p.lastname,
          'full_name', p.full_name,
          'avatar_url', p.avatar_url,
          'gidouilles', p.gidouilles,
          'vip_cards', p.vip_cards,
          'role', p.role,
          'gender', p.gender,
          'is_test', p.is_test
        )
        ORDER BY p.firstname NULLS LAST
      ) FILTER (WHERE p.id IS NOT NULL AND p.is_test = p_is_test_mode),
      '[]'::JSONB
    ) AS students
  FROM classes c
  LEFT JOIN class_members cm ON c.id = cm.class_id
  LEFT JOIN profiles p ON cm.student_id = p.id
  WHERE c.teacher_id = p_teacher_id
    AND c.is_active = TRUE
  GROUP BY c.id, c.teacher_id, c.name, c.description, c.join_code,
           c.is_active, c.created_at, c.updated_at
  ORDER BY c.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_teacher_classes_with_students(UUID, BOOLEAN) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_teacher_classes_with_students(UUID, BOOLEAN) IS
'Optimized function to fetch all teacher classes with full student data filtered by test mode.
When p_is_test_mode = TRUE, returns only test students (is_test = TRUE).
When p_is_test_mode = FALSE, returns only real students (is_test = FALSE).
This ensures complete data isolation between test and production environments.';

-- ============================================================================
-- 5. Migration notes
-- ============================================================================

-- Optional: Mark existing test users if you have any
-- Uncomment and customize as needed:
-- UPDATE profiles SET is_test = TRUE WHERE email LIKE '%+test%';
-- UPDATE profiles SET is_test = TRUE WHERE email IN ('test@example.com');
