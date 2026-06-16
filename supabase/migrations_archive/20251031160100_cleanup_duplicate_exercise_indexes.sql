-- ============================================================================
-- Cleanup Duplicate Exercise Assignment Indexes
-- ============================================================================
--
-- Removes duplicate unique constraints created during first migration attempt.
-- The partial indexes with WHERE clauses are the correct ones to keep.
--
-- Migration: 20251031160100_cleanup_duplicate_exercise_indexes.sql
-- ============================================================================

-- Drop duplicate constraints (which will also drop their underlying indexes)
ALTER TABLE public.exercise_assignments
    DROP CONSTRAINT IF EXISTS unique_student_assignment;

ALTER TABLE public.exercise_assignments
    DROP CONSTRAINT IF EXISTS unique_class_assignment;
