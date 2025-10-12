-- Remove exercise and assignment tables, add school_id to classes
-- Migration: 013_remove_exercise_tables_add_school_to_classes

-- Drop tables in correct order (respecting foreign key dependencies)

-- Drop assignment-related tables first
DROP TABLE IF EXISTS assignment_submissions CASCADE;
DROP TABLE IF EXISTS assignment_exercises CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;

-- Drop student progress tables
DROP TABLE IF EXISTS student_attempts CASCADE;
DROP TABLE IF EXISTS student_progress CASCADE;

-- Drop exercise tables
DROP TABLE IF EXISTS exercise_answers CASCADE;
DROP TABLE IF EXISTS exercise_options CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;

-- Drop content organization tables
DROP TABLE IF EXISTS subtopics CASCADE;
DROP TABLE IF EXISTS topics CASCADE;

-- Add school_id to classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;

-- Create index for school_id lookups
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes (school_id);

-- Add comment explaining the school_id field
COMMENT ON COLUMN classes.school_id IS 'School that this class belongs to';
