-- Migration: Allow free-practice submissions on public python exercises
-- Created: 2026-05-09
--
-- Adds an INSERT policy that lets a student submit a solution on an exercise
-- which is `is_public = TRUE` even when no assignment exists. This complements
-- (does not replace) the existing `python_exercise_submissions_insert` policy
-- which requires an assignment.
--
-- Postgres OR-combines RLS policies, so a student can now insert when EITHER
--   (a) the exercise is assigned to them (existing policy), OR
--   (b) the exercise is public and they have no assignment (this policy).
--
-- This is what unlocks the "free practice" experience that the application
-- needs: an authenticated student opening a publicly-shared exercise can
-- track their own progress without the teacher having to assign it.

DROP POLICY IF EXISTS python_exercise_submissions_insert_public
    ON python_exercise_submissions;

CREATE POLICY python_exercise_submissions_insert_public
    ON python_exercise_submissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND assignment_id IS NULL
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'student'
        )
        AND EXISTS (
            SELECT 1 FROM python_exercises pe
            WHERE pe.id = python_exercise_submissions.exercise_id
                AND pe.is_public = TRUE
        )
    );
