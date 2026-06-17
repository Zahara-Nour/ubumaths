-- Migration: Add level column to python_exercises
-- Created: 2026-05-08
-- Description:
--   Adds a `level` column to python_exercises with the four class-level
--   values used elsewhere in the project (cf. python-examples-library tags):
--   college, lycee, nsi, etudiant.
--
--   Defaults to 'lycee' to satisfy NOT NULL on existing rows.

ALTER TABLE python_exercises
    ADD COLUMN level TEXT NOT NULL DEFAULT 'lycee'
        CHECK (level IN ('college', 'lycee', 'nsi', 'etudiant'));

CREATE INDEX idx_python_exercises_level ON python_exercises(level);

COMMENT ON COLUMN python_exercises.level IS
    'Class level for the exercise: college | lycee | nsi | etudiant.';
