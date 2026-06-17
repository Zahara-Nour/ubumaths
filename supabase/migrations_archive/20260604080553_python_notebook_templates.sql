-- Migration: Python Notebook Templates
-- Created: 2026-06-04
-- Description: Marks a notebook as a reusable template that other teachers can
--              clone. Templates live in the same `python_notebooks` table so the
--              existing RLS policies (own + public+teacher) cover their access
--              control without extra rules.
--
-- New columns on python_notebooks:
--   is_template       BOOLEAN — true for templates (default false)
--   template_category TEXT    — free-form category label ("Statistiques",
--                               "Algorithmique", …) shown as a badge in the
--                               gallery. Nullable; only meaningful when
--                               is_template = true.

ALTER TABLE python_notebooks
  ADD COLUMN IF NOT EXISTS is_template       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS template_category TEXT;

-- Length sanity (the API also enforces this, but defense in depth).
ALTER TABLE python_notebooks
  ADD CONSTRAINT python_notebooks_template_category_length
  CHECK (template_category IS NULL OR char_length(template_category) <= 50);

-- Partial index on `is_template = true` — the gallery query filters on this
-- column. Templates are a small fraction of all notebooks, so a partial index
-- gives the planner a tight, cheap path.
CREATE INDEX IF NOT EXISTS idx_python_notebooks_is_template
  ON python_notebooks (created_at DESC)
  WHERE is_template = TRUE;

-- ============================================================================
-- COMMENTS (for /api/schema introspection + readability)
-- ============================================================================
COMMENT ON COLUMN python_notebooks.is_template IS
  'When true, the notebook is a reusable template. Clone via POST /api/python-notebooks/from-template/[id]. Templates do not appear in the regular teacher notebook list.';
COMMENT ON COLUMN python_notebooks.template_category IS
  'Free-form category label for the templates gallery (e.g. "Statistiques", "Algorithmique"). NULL if uncategorized. Max 50 chars.';
