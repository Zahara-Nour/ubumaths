-- Migration: Add UNIQUE constraints on python_exercise_assignments
-- Created: 2026-05-08
-- Description:
--   The original migration (20251206010000_create_python_exercises.sql) defined
--   a CHECK constraint forcing exactly one of (class_id, student_id) to be set,
--   but did not prevent assigning the same exercise to the same class (or
--   student) twice. The /api/python-exercises/[id]/assign endpoint already
--   handles error.code === '23505' (unique_violation) and returns a 400 with
--   "déjà assigné", but that branch never fired without these constraints.
--
--   PostgreSQL UNIQUE constraints treat NULLs as distinct by default, so a
--   composite UNIQUE on (exercise_id, class_id) does NOT conflict with rows
--   where class_id is NULL (those rows have student_id set instead, and are
--   covered by the second UNIQUE on (exercise_id, student_id)).

ALTER TABLE python_exercise_assignments
    ADD CONSTRAINT python_exercise_assignments_exercise_class_unique
    UNIQUE (exercise_id, class_id);

ALTER TABLE python_exercise_assignments
    ADD CONSTRAINT python_exercise_assignments_exercise_student_unique
    UNIQUE (exercise_id, student_id);

COMMENT ON CONSTRAINT python_exercise_assignments_exercise_class_unique
    ON python_exercise_assignments
    IS 'One assignment per exercise+class. Surfaces as 23505 in API and is mapped to "déjà assigné" by [id]/assign/+server.ts.';

COMMENT ON CONSTRAINT python_exercise_assignments_exercise_student_unique
    ON python_exercise_assignments
    IS 'One assignment per exercise+individual student. Surfaces as 23505 in API and is mapped to "déjà assigné" by [id]/assign/+server.ts.';
