-- Migration: Add `source` column to python_exercises
-- Created: 2026-05-10
-- Description:
--   Free-text field to indicate the origin of an exercise, e.g.
--   "Bac Polynésie 09/2024 Q2.b" or "Manuel Hyperbole 2nde p.142 ex 23".
--   Nullable — existing exercises stay NULL until backfilled (see the
--   companion migration that follows). 200-char cap matches the title cap
--   convention in the Zod schemas.

ALTER TABLE python_exercises
    ADD COLUMN source TEXT
        CHECK (source IS NULL OR length(source) <= 200);

COMMENT ON COLUMN python_exercises.source IS
    'Free-text source / origin of the exercise (e.g. official exam paper, textbook reference).';
