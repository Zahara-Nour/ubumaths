-- Drop geometry system tables and related database objects
-- This migration removes all geometry-related database structures

-- CASCADE will automatically drop all dependent objects (triggers, policies, constraints, etc.)
DROP TABLE IF EXISTS geometry_assignments CASCADE;
DROP TABLE IF EXISTS geometry_hints CASCADE;
DROP TABLE IF EXISTS geometry_exercise_attempts CASCADE;
DROP TABLE IF EXISTS geometry_exercise_steps CASCADE;
DROP TABLE IF EXISTS geometry_exercises CASCADE;
DROP TABLE IF EXISTS geometry_templates CASCADE;

-- Drop geometry-related functions
DROP FUNCTION IF EXISTS get_best_geometry_score(UUID, UUID);
DROP FUNCTION IF EXISTS get_geometry_progress(UUID, UUID);
DROP FUNCTION IF EXISTS get_class_geometry_stats(UUID, UUID);
DROP FUNCTION IF EXISTS update_geometry_updated_at();
DROP FUNCTION IF EXISTS update_attempt_last_saved_at();
DROP FUNCTION IF EXISTS calculate_geometry_final_score();
