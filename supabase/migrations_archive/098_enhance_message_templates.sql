-- Migration 098: Enhanced Message Templates Features
-- Description: Adds advanced features to message templates system
-- Features: versions, usage stats, favorites, tags, search, audit log, approval system

-- =====================================================
-- ENHANCEMENT 1: Tags & Search
-- =====================================================

-- Add tags column to templates
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add search vector for full-text search
ALTER TABLE message_templates
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(subject_template, '') || ' ' ||
      coalesce(body_template, '')
    )
  ) STORED;

-- Indexes for tags and search
CREATE INDEX IF NOT EXISTS idx_templates_tags ON message_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_templates_search ON message_templates USING GIN(search_vector);

-- =====================================================
-- ENHANCEMENT 2: Version History
-- =====================================================

CREATE TABLE IF NOT EXISTS message_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  version_number INT NOT NULL,

  -- Template snapshot
  title TEXT NOT NULL,
  description TEXT,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  scope TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::JSONB,
  tags TEXT[] DEFAULT '{}',

  -- Version metadata
  modified_by UUID NOT NULL REFERENCES profiles(id),
  modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_summary TEXT,

  UNIQUE(template_id, version_number)
);

CREATE INDEX idx_template_versions_template ON message_template_versions(template_id, version_number DESC);
CREATE INDEX idx_template_versions_date ON message_template_versions(modified_at DESC);

COMMENT ON TABLE message_template_versions IS 'Version history of template modifications';

-- Function to auto-create version on update
CREATE OR REPLACE FUNCTION save_template_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INT;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM message_template_versions
  WHERE template_id = OLD.id;

  -- Save old version
  INSERT INTO message_template_versions (
    template_id, version_number, title, description,
    subject_template, body_template, trigger_type, scope,
    variables, tags, modified_by, change_summary
  ) VALUES (
    OLD.id, next_version, OLD.title, OLD.description,
    OLD.subject_template, OLD.body_template, OLD.trigger_type, OLD.scope,
    OLD.variables, OLD.tags, NEW.created_by,
    CASE
      WHEN NEW.title != OLD.title THEN 'Titre modifié'
      WHEN NEW.subject_template != OLD.subject_template THEN 'Sujet modifié'
      WHEN NEW.body_template != OLD.body_template THEN 'Corps modifié'
      ELSE 'Template modifié'
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create version on update
DROP TRIGGER IF EXISTS trigger_save_template_version ON message_templates;
CREATE TRIGGER trigger_save_template_version
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  WHEN (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.subject_template IS DISTINCT FROM NEW.subject_template OR
    OLD.body_template IS DISTINCT FROM NEW.body_template OR
    OLD.variables IS DISTINCT FROM NEW.variables
  )
  EXECUTE FUNCTION save_template_version();

-- =====================================================
-- ENHANCEMENT 3: Usage Statistics
-- =====================================================

CREATE TABLE IF NOT EXISTS template_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,

  -- Usage context
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed BOOLEAN DEFAULT TRUE, -- Message sent (true) or draft saved (false)

  -- Performance tracking
  time_to_complete INT, -- Seconds from template load to send

  CONSTRAINT valid_time CHECK (time_to_complete IS NULL OR time_to_complete >= 0)
);

CREATE INDEX idx_template_usage_template ON template_usage_stats(template_id, used_at DESC);
CREATE INDEX idx_template_usage_user ON template_usage_stats(user_id, used_at DESC);
CREATE INDEX idx_template_usage_date ON template_usage_stats(used_at DESC);

COMMENT ON TABLE template_usage_stats IS 'Tracking of template usage for analytics';

-- =====================================================
-- ENHANCEMENT 4: User Favorites
-- =====================================================

CREATE TABLE IF NOT EXISTS user_favorite_templates (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, template_id)
);

CREATE INDEX idx_favorite_templates_user ON user_favorite_templates(user_id, created_at DESC);

COMMENT ON TABLE user_favorite_templates IS 'User favorite templates for quick access';

-- =====================================================
-- ENHANCEMENT 5: Approval System
-- =====================================================

ALTER TABLE message_templates
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_templates_approval ON message_templates(approval_status)
  WHERE approval_status = 'pending';

-- Only approved templates are visible to non-owners
-- Update existing policies will be handled separately

-- =====================================================
-- ENHANCEMENT 6: Audit Log
-- =====================================================

CREATE TABLE IF NOT EXISTS template_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'created', 'updated', 'deleted', 'duplicated',
    'used', 'favorited', 'unfavorited',
    'approved', 'rejected', 'submitted_for_approval'
  )),

  -- Actor
  performed_by UUID NOT NULL REFERENCES profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Details
  changes JSONB, -- Old vs new values for updates
  metadata JSONB, -- Additional context

  -- Request info
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_log_template ON template_audit_log(template_id, performed_at DESC);
CREATE INDEX idx_audit_log_user ON template_audit_log(performed_by, performed_at DESC);
CREATE INDEX idx_audit_log_action ON template_audit_log(action, performed_at DESC);
CREATE INDEX idx_audit_log_date ON template_audit_log(performed_at DESC);

COMMENT ON TABLE template_audit_log IS 'Complete audit trail of template operations';

-- Function to log actions
CREATE OR REPLACE FUNCTION log_template_action(
  p_template_id UUID,
  p_action TEXT,
  p_performed_by UUID,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO template_audit_log (
    template_id, action, performed_by, changes, metadata
  ) VALUES (
    p_template_id, p_action, p_performed_by, p_changes, p_metadata
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-log on template operations
CREATE OR REPLACE FUNCTION auto_log_template_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_template_action(NEW.id, 'created', NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_template_action(
      NEW.id,
      'updated',
      NEW.created_by,
      jsonb_build_object(
        'old', row_to_json(OLD),
        'new', row_to_json(NEW)
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_template_action(OLD.id, 'deleted', OLD.created_by);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_log_template_changes ON message_templates;
CREATE TRIGGER trigger_auto_log_template_changes
  AFTER INSERT OR UPDATE OR DELETE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_template_changes();

-- =====================================================
-- RLS POLICIES for new tables
-- =====================================================

-- Template versions: same permissions as templates
ALTER TABLE message_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_versions ON message_template_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY teacher_view_own_versions ON message_template_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM message_templates mt
      WHERE mt.id = message_template_versions.template_id
      AND mt.created_by = auth.uid()
    )
  );

-- Usage stats: users can view their own, admins/teachers see aggregates
ALTER TABLE template_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_own_stats ON template_usage_stats
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY admin_all_stats ON template_usage_stats
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY teacher_class_stats ON template_usage_stats
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = template_usage_stats.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Favorites: users manage their own
ALTER TABLE user_favorite_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_own_favorites ON user_favorite_templates
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Audit log: admins only for read
ALTER TABLE template_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_view_audit ON template_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get template statistics
CREATE OR REPLACE FUNCTION get_template_statistics(p_template_id UUID)
RETURNS TABLE (
  total_usage BIGINT,
  unique_users BIGINT,
  completion_rate NUMERIC,
  avg_time_to_complete NUMERIC,
  last_used_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_usage,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    ROUND(
      (COUNT(*) FILTER (WHERE completed = true)::NUMERIC /
       NULLIF(COUNT(*)::NUMERIC, 0) * 100),
      2
    ) as completion_rate,
    ROUND(AVG(time_to_complete), 0) as avg_time_to_complete,
    MAX(used_at) as last_used_at
  FROM template_usage_stats
  WHERE template_id = p_template_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get user's most used templates
CREATE OR REPLACE FUNCTION get_user_frequent_templates(
  p_user_id UUID,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  template_id UUID,
  title TEXT,
  usage_count BIGINT,
  last_used TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mt.id,
    mt.title,
    COUNT(tus.id)::BIGINT as usage_count,
    MAX(tus.used_at) as last_used
  FROM template_usage_stats tus
  JOIN message_templates mt ON mt.id = tus.template_id
  WHERE tus.user_id = p_user_id
    AND mt.is_active = true
  GROUP BY mt.id, mt.title
  ORDER BY usage_count DESC, last_used DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Duplicate template
CREATE OR REPLACE FUNCTION duplicate_template(
  p_template_id UUID,
  p_user_id UUID,
  p_new_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_template_id UUID;
  original_template RECORD;
BEGIN
  -- Get original template
  SELECT * INTO original_template
  FROM message_templates
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Create duplicate
  INSERT INTO message_templates (
    title, description, subject_template, body_template,
    trigger_type, trigger_config, scope, created_by, class_id,
    variables, tags, is_active
  ) VALUES (
    COALESCE(p_new_title, original_template.title || ' (copie)'),
    original_template.description,
    original_template.subject_template,
    original_template.body_template,
    original_template.trigger_type,
    original_template.trigger_config,
    'class', -- Duplicates are always class scope
    p_user_id,
    NULL, -- User must assign a class
    original_template.variables,
    original_template.tags,
    original_template.is_active
  ) RETURNING id INTO new_template_id;

  -- Log duplication
  PERFORM log_template_action(
    new_template_id,
    'duplicated',
    p_user_id,
    NULL,
    jsonb_build_object('original_template_id', p_template_id)
  );

  RETURN new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION duplicate_template IS 'Duplicate a template for user customization';

-- =====================================================
-- UPDATE EXISTING POLICIES for approval system
-- =====================================================

-- Drop old student view policy
DROP POLICY IF EXISTS student_view_templates ON message_templates;

-- Recreate with approval check
CREATE POLICY student_view_templates ON message_templates
  FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND approval_status = 'approved'
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

-- Teachers see approved system templates + their own (any status)
DROP POLICY IF EXISTS teacher_view_system_templates ON message_templates;

CREATE POLICY teacher_view_system_templates ON message_templates
  FOR SELECT
  TO authenticated
  USING (
    (scope = 'system' AND is_active = TRUE AND approval_status = 'approved')
    OR (scope = 'class' AND created_by = auth.uid())
  );

COMMENT ON TABLE message_templates IS 'Message templates with versioning, stats, favorites, and approval workflow';
