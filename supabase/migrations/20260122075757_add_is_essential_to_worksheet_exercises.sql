-- Migration: Add is_essential column to worksheet_exercises
-- Description: Allows marking exercises as essential/priority for students

ALTER TABLE worksheet_exercises
ADD COLUMN is_essential BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN worksheet_exercises.is_essential IS
  'Indicates if this exercise is essential/priority for students. Displayed with a star icon in student view.';
