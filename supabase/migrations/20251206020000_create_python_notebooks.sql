-- Migration: Create Python Notebooks System
-- Created: 2025-12-06
-- Description: Jupyter-like multi-cell notebooks with class assignment functionality

-- ============================================================================
-- TABLE: python_notebooks
-- ============================================================================
-- Stores notebook definitions with Jupyter-like cell structure
CREATE TABLE IF NOT EXISTS python_notebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    content JSONB NOT NULL, -- Notebook cells, metadata, execution state
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Validate content structure
    CONSTRAINT valid_content_structure CHECK (
        content ? 'version' AND
        content ? 'metadata' AND
        content ? 'cells' AND
        jsonb_typeof(content->'cells') = 'array'
    )
);

-- Indexes for python_notebooks
CREATE INDEX idx_python_notebooks_author_id ON python_notebooks(author_id);
CREATE INDEX idx_python_notebooks_is_public ON python_notebooks(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_python_notebooks_created_at ON python_notebooks(created_at DESC);
CREATE INDEX idx_python_notebooks_updated_at ON python_notebooks(updated_at DESC);

-- GIN index for JSONB queries (find notebooks by metadata)
CREATE INDEX idx_python_notebooks_content ON python_notebooks USING GIN(content);

-- ============================================================================
-- TABLE: python_notebook_assignments
-- ============================================================================
-- Share/assign notebooks with classes (students get readonly access)
CREATE TABLE IF NOT EXISTS python_notebook_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES python_notebooks(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    readonly BOOLEAN DEFAULT TRUE, -- Students can only read by default
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Unique constraint: one notebook can only be shared once per class
    UNIQUE(notebook_id, class_id)
);

-- Indexes for python_notebook_assignments
CREATE INDEX idx_python_notebook_assignments_notebook_id ON python_notebook_assignments(notebook_id);
CREATE INDEX idx_python_notebook_assignments_class_id ON python_notebook_assignments(class_id);
CREATE INDEX idx_python_notebook_assignments_shared_by ON python_notebook_assignments(shared_by);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE python_notebooks IS 'Jupyter-like Python notebooks with multi-cell execution support';
COMMENT ON COLUMN python_notebooks.content IS 'JSONB containing cells array with code/markdown, execution state, outputs';
COMMENT ON COLUMN python_notebooks.is_public IS 'If true, visible to all teachers for sharing';

COMMENT ON TABLE python_notebook_assignments IS 'Assigns notebooks to classes (students get readonly by default)';
COMMENT ON COLUMN python_notebook_assignments.readonly IS 'If true, students can only view (cannot edit or execute)';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Count user's notebooks (for limit enforcement)
CREATE OR REPLACE FUNCTION public.count_user_notebooks(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    notebook_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO notebook_count
    FROM python_notebooks
    WHERE author_id = p_user_id;
    RETURN notebook_count;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 999; -- Return high number to prevent inserts on error
END;
$$;

-- Check if notebook is assigned to student's class
CREATE OR REPLACE FUNCTION public.is_notebook_assigned_to_student(p_notebook_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM python_notebook_assignments pna
        JOIN class_members cm ON pna.class_id = cm.class_id
        WHERE pna.notebook_id = p_notebook_id
            AND cm.student_id = auth.uid()
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.count_user_notebooks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_notebook_assigned_to_student(UUID) TO authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY - python_notebooks
-- ============================================================================

ALTER TABLE python_notebooks ENABLE ROW LEVEL SECURITY;

-- SELECT policies for python_notebooks

-- 1. Users can read their own notebooks
CREATE POLICY "Users can read own notebooks"
    ON python_notebooks
    FOR SELECT
    USING (auth.uid() = author_id);

-- 2. Teachers can read public notebooks
CREATE POLICY "Teachers can read public notebooks"
    ON python_notebooks
    FOR SELECT
    USING (
        is_public = TRUE
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

-- 3. Teachers can read notebooks from students in their classes
CREATE POLICY "Teachers can read student notebooks"
    ON python_notebooks
    FOR SELECT
    USING (is_teacher_of_student(author_id));

-- 4. Students can read notebooks assigned to their class
CREATE POLICY "Students can read assigned notebooks"
    ON python_notebooks
    FOR SELECT
    USING (is_notebook_assigned_to_student(id));

-- 5. Admins can read all notebooks
CREATE POLICY "Admins can read all notebooks"
    ON python_notebooks
    FOR SELECT
    USING (is_admin());

-- INSERT policy for python_notebooks
CREATE POLICY "Users can insert own notebooks with limit"
    ON python_notebooks
    FOR INSERT
    WITH CHECK (
        auth.uid() = author_id
        AND count_user_notebooks(auth.uid()) < 50
    );

-- UPDATE policy for python_notebooks
CREATE POLICY "Users can update own notebooks"
    ON python_notebooks
    FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- DELETE policy for python_notebooks
CREATE POLICY "Users can delete own notebooks"
    ON python_notebooks
    FOR DELETE
    USING (auth.uid() = author_id);

-- ============================================================================
-- ROW LEVEL SECURITY - python_notebook_assignments
-- ============================================================================

ALTER TABLE python_notebook_assignments ENABLE ROW LEVEL SECURITY;

-- SELECT policies for python_notebook_assignments

-- 1. Teacher who assigned can view
CREATE POLICY "Teachers can view own notebook assignments"
    ON python_notebook_assignments
    FOR SELECT
    USING (auth.uid() = shared_by);

-- 2. Students in the class can view assignments for their class
CREATE POLICY "Students can view class notebook assignments"
    ON python_notebook_assignments
    FOR SELECT
    USING (is_student_in_class(class_id));

-- 3. Admins can view all
CREATE POLICY "Admins can view all notebook assignments"
    ON python_notebook_assignments
    FOR SELECT
    USING (is_admin());

-- INSERT policy for python_notebook_assignments
-- Teacher must own the notebook AND be the teacher of the class
CREATE POLICY "Teachers can assign their notebooks to their classes"
    ON python_notebook_assignments
    FOR INSERT
    WITH CHECK (
        auth.uid() = shared_by
        AND EXISTS (
            SELECT 1
            FROM python_notebooks
            WHERE id = notebook_id
                AND author_id = auth.uid()
        )
        AND is_teacher_of_class(class_id)
    );

-- UPDATE policy for python_notebook_assignments
CREATE POLICY "Teachers can update own notebook assignments"
    ON python_notebook_assignments
    FOR UPDATE
    USING (auth.uid() = shared_by)
    WITH CHECK (auth.uid() = shared_by);

-- DELETE policy for python_notebook_assignments
CREATE POLICY "Teachers can delete own notebook assignments"
    ON python_notebook_assignments
    FOR DELETE
    USING (auth.uid() = shared_by);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update the updated_at timestamp for python_notebooks
CREATE OR REPLACE FUNCTION update_python_notebooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on python_notebooks update
CREATE TRIGGER python_notebooks_updated_at_trigger
    BEFORE UPDATE ON python_notebooks
    FOR EACH ROW
    EXECUTE FUNCTION update_python_notebooks_updated_at();

-- Function to enforce 50 notebook limit per user
CREATE OR REPLACE FUNCTION check_python_notebooks_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM python_notebooks WHERE author_id = NEW.author_id) >= 50 THEN
        RAISE EXCEPTION 'User has reached the maximum limit of 50 Python notebooks';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce notebook limit before insert
CREATE TRIGGER python_notebooks_limit_trigger
    BEFORE INSERT ON python_notebooks
    FOR EACH ROW
    EXECUTE FUNCTION check_python_notebooks_limit();

-- ============================================================================
-- GRANT STATEMENTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON python_notebooks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON python_notebook_assignments TO authenticated;

-- ============================================================================
-- FUNCTION COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.count_user_notebooks(UUID) IS 'Security definer function to count notebooks owned by a user';
COMMENT ON FUNCTION public.is_notebook_assigned_to_student(UUID) IS 'Security definer function to check if a notebook is assigned to current user via class membership';
COMMENT ON FUNCTION update_python_notebooks_updated_at() IS 'Trigger function to auto-update updated_at timestamp';
COMMENT ON FUNCTION check_python_notebooks_limit() IS 'Trigger function to enforce 50 notebook limit per user';

-- ============================================================================
-- CONTENT JSONB STRUCTURE DOCUMENTATION
-- ============================================================================

/*
Expected JSONB structure for python_notebooks.content:

{
  "version": "1.0",
  "metadata": {
    "title": "Mon notebook",
    "created_at": "2025-12-06T00:00:00Z",
    "updated_at": "2025-12-06T00:00:00Z"
  },
  "cells": [
    {
      "id": "cell-uuid-1",
      "type": "code",
      "source": "print('Hello')",
      "execution_count": 1,
      "outputs": [
        {
          "output_type": "stream",
          "name": "stdout",
          "text": "Hello\n"
        }
      ],
      "state": "success"
    },
    {
      "id": "cell-uuid-2",
      "type": "markdown",
      "source": "# Title\n\nSome text with $\\LaTeX$"
    }
  ]
}

Cell types:
- "code": Python code cell with execution state
- "markdown": Markdown/LaTeX text cell (no execution)

Code cell fields:
- id: Unique cell identifier (UUID)
- type: "code"
- source: Python code string
- execution_count: Number (sequential execution order)
- outputs: Array of output objects (stream, error, result)
- state: "idle" | "running" | "success" | "error"

Markdown cell fields:
- id: Unique cell identifier (UUID)
- type: "markdown"
- source: Markdown/LaTeX string

Output types:
- stream: {"output_type": "stream", "name": "stdout"|"stderr", "text": "..."}
- error: {"output_type": "error", "ename": "ValueError", "evalue": "...", "traceback": [...]}
- execute_result: {"output_type": "execute_result", "data": {"text/plain": "42"}}
*/
