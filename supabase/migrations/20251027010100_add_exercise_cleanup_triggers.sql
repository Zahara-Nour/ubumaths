-- Migration: Add Auto-Cleanup Triggers for Exercises
-- =====================================================
-- Date: 2025-10-27
-- Description: Automatically clean up related data when exercises are deleted

-- NOTE: exercise_assignments cleanup is already handled by CASCADE foreign key constraint
-- This migration focuses on cleaning up Storage images

-- Function to delete exercise images from Storage when exercise is deleted
CREATE OR REPLACE FUNCTION delete_exercise_images()
RETURNS TRIGGER AS $$
DECLARE
  storage_path TEXT;
  image_pattern TEXT;
BEGIN
  -- Build storage path pattern for this exercise's images
  -- Images are stored at: {userId}/{exerciseId}/{filename}
  -- or: {userId}/{timestamp}-{uuid}.{ext} (newer pattern)
  storage_path := OLD.created_by || '/' || OLD.id || '/';

  -- Delete all images in the exercise's folder from the exercise-images bucket
  -- Note: This requires storage.objects table access
  DELETE FROM storage.objects
  WHERE bucket_id = 'exercise-images'
    AND name LIKE storage_path || '%';

  -- Also check for images with exercise ID in the filename (alternate pattern)
  image_pattern := '%' || OLD.id || '%';
  DELETE FROM storage.objects
  WHERE bucket_id = 'exercise-images'
    AND owner = OLD.created_by
    AND name LIKE image_pattern;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run image cleanup after exercise deletion
CREATE TRIGGER trigger_delete_exercise_images
  AFTER DELETE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION delete_exercise_images();

-- Comment explaining the trigger
COMMENT ON TRIGGER trigger_delete_exercise_images ON exercises IS
'Automatically deletes all images associated with an exercise from Storage when the exercise is deleted.';

-- Note about CASCADE cleanup for exercise_assignments
COMMENT ON TABLE exercise_assignments IS
'Related assignments are automatically deleted via CASCADE foreign key constraint when an exercise is deleted.';
