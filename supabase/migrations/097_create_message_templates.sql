-- Migration 097: Message Templates System
-- Description: Creates a system for reusable message templates with placeholders
-- This allows admins and teachers to create message templates with dynamic variables

-- =====================================================
-- TABLE: message_templates
-- Description: Templates for private messages with placeholder support
-- =====================================================
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identification
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 100),
  description TEXT,

  -- Template content
  subject_template TEXT NOT NULL CHECK (char_length(subject_template) >= 1 AND char_length(subject_template) <= 200),
  body_template TEXT NOT NULL CHECK (char_length(body_template) >= 1),

  -- Trigger configuration
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'assessment_question',   -- Questions about assessments
    'srs_help',             -- Help with SRS decks
    'system_notification',  -- System notifications
    'enigma_answer',        -- Enigma answers (future)
    'general'               -- General purpose
  )),
  trigger_config JSONB DEFAULT '{}'::JSONB, -- Additional trigger rules

  -- Scope and permissions
  scope TEXT NOT NULL CHECK (scope IN ('system', 'class')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,

  -- Variables documentation
  variables JSONB DEFAULT '[]'::JSONB, -- Array of variable definitions

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (
    (scope = 'system' AND class_id IS NULL) OR
    (scope = 'class' AND class_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_message_templates_trigger ON message_templates(trigger_type, scope, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_message_templates_class ON message_templates(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_message_templates_created_by ON message_templates(created_by);
CREATE INDEX idx_message_templates_scope ON message_templates(scope, is_active) WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE message_templates IS 'Reusable message templates with dynamic placeholders';
COMMENT ON COLUMN message_templates.title IS 'Template name for management UI';
COMMENT ON COLUMN message_templates.subject_template IS 'Subject line with {{placeholders}}';
COMMENT ON COLUMN message_templates.body_template IS 'Message body with {{placeholders}}';
COMMENT ON COLUMN message_templates.trigger_type IS 'Context that triggers this template';
COMMENT ON COLUMN message_templates.trigger_config IS 'Additional configuration for trigger matching';
COMMENT ON COLUMN message_templates.scope IS 'system = available to all, class = specific class only';
COMMENT ON COLUMN message_templates.variables IS 'Array of {name, label, required, userInput} variable definitions';

-- =====================================================
-- FUNCTION: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_message_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_template_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_message_template_updated_at();

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY admin_all_templates ON message_templates
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

-- Teachers can view system templates
CREATE POLICY teacher_view_system_templates ON message_templates
  FOR SELECT
  TO authenticated
  USING (
    scope = 'system'
    AND is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Teachers can manage their own class templates
CREATE POLICY teacher_manage_class_templates ON message_templates
  FOR ALL
  TO authenticated
  USING (
    scope = 'class'
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  )
  WITH CHECK (
    scope = 'class'
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Students can view templates from their classes and system templates
CREATE POLICY student_view_templates ON message_templates
  FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND (
      scope = 'system'
      OR (
        scope = 'class'
        AND class_id IN (
          SELECT class_id
          FROM class_members
          WHERE student_id = auth.uid()
        )
      )
    )
  );

-- =====================================================
-- FUNCTION: Get available templates for context
-- =====================================================
CREATE OR REPLACE FUNCTION get_templates_for_context(
  p_trigger_type TEXT,
  p_class_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  subject_template TEXT,
  body_template TEXT,
  trigger_type TEXT,
  scope TEXT,
  variables JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    t.subject_template,
    t.body_template,
    t.trigger_type,
    t.scope,
    t.variables
  FROM message_templates t
  WHERE t.trigger_type = p_trigger_type
    AND t.is_active = TRUE
    AND (
      t.scope = 'system'
      OR (t.scope = 'class' AND t.class_id = p_class_id)
    )
  ORDER BY
    CASE WHEN t.scope = 'class' THEN 0 ELSE 1 END, -- Prefer class templates
    t.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_templates_for_context IS 'Find the most appropriate template for a given context (prefers class templates over system templates)';
