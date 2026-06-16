-- Migration: Create Notebook Checkpoint Runs
-- Created: 2026-06-03
-- Description: Tracks the latest run of each checkpoint cell (assertion-based test)
--              executed by a student against the persistent namespace of a Python notebook.
--              One row per (notebook_id, user_id, cell_id); the API upserts via
--              INSERT ... ON CONFLICT DO UPDATE so only the latest run is kept.

-- ============================================================================
-- TABLE: python_notebook_checkpoint_runs
-- ============================================================================
-- Stores the latest checkpoint cell execution result per (notebook, user, cell).
-- The cell_id refers to an entry in python_notebooks.content -> 'cells' [].id
-- (UUID-like string generated on the client side, not enforced by SQL).
CREATE TABLE IF NOT EXISTS python_notebook_checkpoint_runs (
    notebook_id   UUID NOT NULL REFERENCES python_notebooks(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    cell_id       TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('passed', 'failed')),
    error_message TEXT,
    ran_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (notebook_id, user_id, cell_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Student-side lookup: read my runs for a given notebook
CREATE INDEX IF NOT EXISTS idx_pn_checkpoint_runs_notebook_user
    ON python_notebook_checkpoint_runs(notebook_id, user_id);

-- Teacher-side dashboard: list all runs for a notebook, then JOIN class_members
CREATE INDEX IF NOT EXISTS idx_pn_checkpoint_runs_notebook
    ON python_notebook_checkpoint_runs(notebook_id);

-- Future "my notebooks and their status" view (not used in V1, but cheap to keep)
CREATE INDEX IF NOT EXISTS idx_pn_checkpoint_runs_user
    ON python_notebook_checkpoint_runs(user_id);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE python_notebook_checkpoint_runs IS
    'Latest run of each checkpoint cell (assertion-based test) executed by a student '
    'against the persistent namespace of a Python notebook. Upserted by the API; only '
    'the most recent result per (notebook_id, user_id, cell_id) is retained.';

COMMENT ON COLUMN python_notebook_checkpoint_runs.cell_id IS
    'Identifier of the checkpoint cell inside python_notebooks.content -> ''cells'' [].id. '
    'Generated client-side (UUID v4 style); validated by the application layer (Zod), '
    'not by a SQL constraint.';

COMMENT ON COLUMN python_notebook_checkpoint_runs.status IS
    'Outcome of the last assertion execution: ''passed'' or ''failed''.';

COMMENT ON COLUMN python_notebook_checkpoint_runs.error_message IS
    'Assertion / Python error message captured by the Pyodide worker. '
    'Nullable; populated only when status = ''failed''.';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE python_notebook_checkpoint_runs ENABLE ROW LEVEL SECURITY;

-- 1. Students can read their own runs
DROP POLICY IF EXISTS "Students can read own checkpoint runs"
    ON python_notebook_checkpoint_runs;
CREATE POLICY "Students can read own checkpoint runs"
    ON python_notebook_checkpoint_runs
    FOR SELECT
    USING (user_id = auth.uid());

-- 2. Students can write (INSERT / UPDATE / DELETE) their own runs on notebooks
--    they have access to: either public, or assigned to them via class_members.
--    FOR ALL is used here so the same condition guards INSERT and UPDATE
--    (single upsert path: INSERT ... ON CONFLICT DO UPDATE).
DROP POLICY IF EXISTS "Students can upsert own checkpoint runs"
    ON python_notebook_checkpoint_runs;
CREATE POLICY "Students can upsert own checkpoint runs"
    ON python_notebook_checkpoint_runs
    FOR ALL
    USING (
        user_id = auth.uid()
        AND (
            EXISTS (
                SELECT 1 FROM python_notebooks pn
                WHERE pn.id = notebook_id
                  AND pn.is_public = TRUE
            )
            OR is_notebook_assigned_to_student(notebook_id)
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        AND (
            EXISTS (
                SELECT 1 FROM python_notebooks pn
                WHERE pn.id = notebook_id
                  AND pn.is_public = TRUE
            )
            OR is_notebook_assigned_to_student(notebook_id)
        )
    );

-- 3. Teachers can read all runs on a notebook they authored OR that is assigned
--    to one of their classes.
DROP POLICY IF EXISTS "Teachers can read checkpoint runs for their notebooks"
    ON python_notebook_checkpoint_runs;
CREATE POLICY "Teachers can read checkpoint runs for their notebooks"
    ON python_notebook_checkpoint_runs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM python_notebooks pn
            WHERE pn.id = notebook_id
              AND pn.author_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM python_notebook_assignments pna
            WHERE pna.notebook_id = python_notebook_checkpoint_runs.notebook_id
              AND is_teacher_of_class(pna.class_id)
        )
    );

-- 4. Admins can do everything
DROP POLICY IF EXISTS "Admins can manage all checkpoint runs"
    ON python_notebook_checkpoint_runs;
CREATE POLICY "Admins can manage all checkpoint runs"
    ON python_notebook_checkpoint_runs
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================================================
-- GRANT STATEMENTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE
    ON python_notebook_checkpoint_runs
    TO authenticated;
