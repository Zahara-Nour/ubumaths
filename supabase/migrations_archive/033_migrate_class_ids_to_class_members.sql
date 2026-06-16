-- Migration: Sync profiles.class_ids to class_members table
-- This migration ensures all students with class_ids in their profile
-- are properly represented in the class_members junction table
--
-- USE CASE: Fixes the issue where students who:
-- 1. Logged in BEFORE being imported (created profile before pending_students entry)
-- 2. Were manually added to classes via class_ids array but not class_members
-- 3. Have class_ids populated but class_members is empty

-- Step 1: Insert missing class memberships from profiles.class_ids
-- This handles any students that were added to classes before the class_members table was fully implemented
INSERT INTO class_members (student_id, class_id)
SELECT
    p.id as student_id,
    unnest(p.class_ids) as class_id
FROM profiles p
WHERE
    p.class_ids IS NOT NULL
    AND array_length(p.class_ids, 1) > 0
    AND p.role = 'student'
ON CONFLICT (student_id, class_id) DO NOTHING;

-- Log the number of memberships added
DO $$
DECLARE
    new_count INT;
BEGIN
    SELECT COUNT(*) INTO new_count
    FROM class_members cm
    INNER JOIN profiles p ON p.id = cm.student_id
    WHERE p.role = 'student';

    RAISE NOTICE 'Migration 033: % total class memberships now in class_members table', new_count;
END $$;

-- Step 2: Create a trigger to keep class_ids and class_members in sync going forward
-- This ensures backward compatibility if any code still reads from class_ids

-- Function to sync class_members changes back to class_ids array
CREATE OR REPLACE FUNCTION sync_class_members_to_class_ids()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the profile's class_ids array based on class_members
    UPDATE profiles
    SET class_ids = (
        SELECT COALESCE(array_agg(class_id), ARRAY[]::uuid[])
        FROM class_members
        WHERE student_id = COALESCE(NEW.student_id, OLD.student_id)
    )
    WHERE id = COALESCE(NEW.student_id, OLD.student_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for INSERT, UPDATE, DELETE on class_members
DROP TRIGGER IF EXISTS sync_class_members_insert ON class_members;
CREATE TRIGGER sync_class_members_insert
    AFTER INSERT ON class_members
    FOR EACH ROW
    EXECUTE FUNCTION sync_class_members_to_class_ids();

DROP TRIGGER IF EXISTS sync_class_members_delete ON class_members;
CREATE TRIGGER sync_class_members_delete
    AFTER DELETE ON class_members
    FOR EACH ROW
    EXECUTE FUNCTION sync_class_members_to_class_ids();

-- Add comment explaining the synchronization
COMMENT ON FUNCTION sync_class_members_to_class_ids() IS
    'Automatically syncs class_members table changes to profiles.class_ids array for backward compatibility.
    class_members is the source of truth, class_ids is kept in sync for legacy code.';
