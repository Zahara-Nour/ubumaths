-- Migration: Create whiteboard_templates table
-- Description: System for reusable whiteboard page templates
-- Teachers/admins can create templates with pre-defined elements and backgrounds

-- =====================================================
-- TYPE: whiteboard_template_category
-- Description: Categories for organizing templates
-- =====================================================
CREATE TYPE whiteboard_template_category AS ENUM (
  'geometry',   -- Geometry tools and shapes
  'algebra',    -- Algebraic expressions, equations
  'graphs',     -- Coordinate systems, axes
  'grids',      -- Quadrillages, ruled paper
  'blank'       -- Empty/plain templates
);

COMMENT ON TYPE whiteboard_template_category IS 'Categories for organizing whiteboard templates';

-- =====================================================
-- TABLE: whiteboard_templates
-- Description: Stores reusable whiteboard page templates
-- =====================================================
CREATE TABLE whiteboard_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Template identification
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  category whiteboard_template_category NOT NULL,

  -- Template content (stored as JSONB for flexibility)
  page_data JSONB NOT NULL,

  -- Optional thumbnail (base64 or URL)
  thumbnail TEXT,

  -- Ownership and visibility
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,  -- System templates cannot be deleted by users
  is_public BOOLEAN NOT NULL DEFAULT true,   -- Public templates visible to all users

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_whiteboard_templates_category ON whiteboard_templates(category) WHERE is_public = true;
CREATE INDEX idx_whiteboard_templates_public ON whiteboard_templates(is_public, category) WHERE is_public = true;
CREATE INDEX idx_whiteboard_templates_created_by ON whiteboard_templates(created_by) WHERE created_by IS NOT NULL;

-- Comments
COMMENT ON TABLE whiteboard_templates IS 'Reusable whiteboard page templates with pre-defined elements and backgrounds';
COMMENT ON COLUMN whiteboard_templates.name IS 'Display name of the template';
COMMENT ON COLUMN whiteboard_templates.description IS 'Optional description explaining the template usage';
COMMENT ON COLUMN whiteboard_templates.category IS 'Category for organizing templates';
COMMENT ON COLUMN whiteboard_templates.page_data IS 'JSONB containing elements, background, width, height';
COMMENT ON COLUMN whiteboard_templates.thumbnail IS 'Optional preview image (base64 or URL)';
COMMENT ON COLUMN whiteboard_templates.is_system IS 'System templates are managed by the platform and cannot be deleted by users';
COMMENT ON COLUMN whiteboard_templates.is_public IS 'Public templates are visible to all authenticated users';

-- =====================================================
-- FUNCTION: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_whiteboard_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_whiteboard_template_updated_at
  BEFORE UPDATE ON whiteboard_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_whiteboard_template_updated_at();

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE whiteboard_templates ENABLE ROW LEVEL SECURITY;

-- 1. Admins can do everything
CREATE POLICY admin_all_whiteboard_templates ON whiteboard_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 2. Teachers can view all public templates
CREATE POLICY teacher_view_public_templates ON whiteboard_templates
  FOR SELECT
  TO authenticated
  USING (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- 3. Teachers can manage their own templates
CREATE POLICY teacher_manage_own_templates ON whiteboard_templates
  FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
    AND is_system = false
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND is_system = false
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- 4. Students can view public templates
CREATE POLICY student_view_public_templates ON whiteboard_templates
  FOR SELECT
  TO authenticated
  USING (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
  );

-- =====================================================
-- FUNCTION: Get templates by category
-- Description: Helper function to fetch templates with optional filtering
-- =====================================================
CREATE OR REPLACE FUNCTION get_whiteboard_templates(
  p_category whiteboard_template_category DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category whiteboard_template_category,
  page_data JSONB,
  thumbnail TEXT,
  is_system BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.description,
    t.category,
    t.page_data,
    t.thumbnail,
    t.is_system,
    t.created_at
  FROM whiteboard_templates t
  WHERE t.is_public = true
    AND (p_category IS NULL OR t.category = p_category)
  ORDER BY
    t.is_system DESC,  -- System templates first
    t.category,
    t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_whiteboard_templates IS 'Fetch whiteboard templates with optional category filter';
