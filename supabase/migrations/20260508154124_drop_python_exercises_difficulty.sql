-- Migration: Drop the difficulty column from python_exercises
-- Created: 2026-05-08
-- Description:
--   The original migration (20251206010000_create_python_exercises.sql)
--   added a difficulty column with a NOT NULL + CHECK ('easy'|'medium'|'hard')
--   constraint and a B-tree index. The MVP UI for python exercises does not
--   expose a difficulty selector, so the column has no consumer.
--
--   We drop the column entirely (CASCADE drops the dependent index too).

ALTER TABLE python_exercises DROP COLUMN difficulty CASCADE;
