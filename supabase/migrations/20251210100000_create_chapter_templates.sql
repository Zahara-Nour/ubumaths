-- Migration: Create Chapter Templates System
-- ============================================================================
-- Purpose: Enable teachers to create reusable chapter templates that can be:
--   - Created as draft, published, or archived
--   - Shared publicly or kept private
--   - Versioned with full history tracking
--   - Instantiated into actual chapters across multiple classes
--   - Migrated when template versions change
--
-- Date: 2025-12-10
--
-- Tables Created:
--   1. chapter_templates - Template definitions with metadata
--   2. chapter_template_versions - Version history with snapshots
--   3. chapter_template_instantiations - Links templates to chapters
--
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS (verify required functions exist)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_teacher_or_admin') THEN
        RAISE EXCEPTION 'Required function is_teacher_or_admin() does not exist. Run migration 017 first.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        RAISE EXCEPTION 'Required function is_admin() does not exist. Run migration 017 first.';
    END IF;
END $$;

-- ============================================================================
-- TABLE 1: chapter_templates
-- Purpose: Reusable chapter templates created by teachers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chapter_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Publishing status
    status TEXT NOT NULL DEFAULT 'draft',
    is_public BOOLEAN NOT NULL DEFAULT false,

    -- Metadata
    title TEXT NOT NULL,
    description TEXT,
    grades TEXT[] NOT NULL DEFAULT '{}',
    color TEXT, -- Hex color for UI (e.g., '#3B82F6')
    icon TEXT,  -- Emoji or icon identifier

    -- Content and versioning
    content_snapshot JSONB NOT NULL DEFAULT '{}',
    instantiation_count INTEGER NOT NULL DEFAULT 0,
    current_version INTEGER NOT NULL DEFAULT 1,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_template_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT valid_color_format CHECK (color IS NULL OR color ~* '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT valid_instantiation_count CHECK (instantiation_count >= 0),
    CONSTRAINT valid_current_version CHECK (current_version >= 1),
    -- Note: grades can be empty for templates targeting all levels
    CONSTRAINT valid_grades CHECK (grades IS NOT NULL)
);

COMMENT ON TABLE public.chapter_templates IS 'Reusable chapter templates with versioning and public/private sharing';
COMMENT ON COLUMN public.chapter_templates.created_by IS 'Teacher who created this template';
COMMENT ON COLUMN public.chapter_templates.status IS 'Template status: draft (editable), published (locked), archived (hidden)';
COMMENT ON COLUMN public.chapter_templates.is_public IS 'Whether template is visible to all teachers (only when published)';
COMMENT ON COLUMN public.chapter_templates.title IS 'Template title (required, non-empty)';
COMMENT ON COLUMN public.chapter_templates.description IS 'Optional template description';
COMMENT ON COLUMN public.chapter_templates.grades IS 'Target grade levels (e.g., [''6eme'', ''5eme''])';
COMMENT ON COLUMN public.chapter_templates.color IS 'Hex color code for UI styling (e.g., #3B82F6)';
COMMENT ON COLUMN public.chapter_templates.icon IS 'Emoji or icon identifier for visual representation';
COMMENT ON COLUMN public.chapter_templates.content_snapshot IS 'Current template content (documents, quizzes, checklist, exercises)';
COMMENT ON COLUMN public.chapter_templates.instantiation_count IS 'Number of times this template has been instantiated';
COMMENT ON COLUMN public.chapter_templates.current_version IS 'Current version number (1-based)';

-- Indexes
CREATE INDEX idx_chapter_templates_created_by ON public.chapter_templates(created_by);
CREATE INDEX idx_chapter_templates_status_creator ON public.chapter_templates(created_by, status);
CREATE INDEX idx_chapter_templates_public_status ON public.chapter_templates(is_public, status)
    WHERE is_public = true AND status = 'published';
CREATE INDEX idx_chapter_templates_grades ON public.chapter_templates USING GIN(grades);

-- Enable RLS
ALTER TABLE public.chapter_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapter_templates
CREATE POLICY "Teachers can view their own templates"
ON public.chapter_templates
FOR SELECT
TO authenticated
USING (
    created_by = auth.uid()
    AND is_teacher_or_admin()
);

CREATE POLICY "Teachers can view public published templates"
ON public.chapter_templates
FOR SELECT
TO authenticated
USING (
    is_public = true
    AND status = 'published'
    AND is_teacher_or_admin()
);

CREATE POLICY "Teachers can create templates"
ON public.chapter_templates
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid()
    AND is_teacher_or_admin()
);

CREATE POLICY "Teachers can update their own templates"
ON public.chapter_templates
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
    AND is_teacher_or_admin()
)
WITH CHECK (
    created_by = auth.uid()
    AND is_teacher_or_admin()
);

CREATE POLICY "Teachers can delete their own templates"
ON public.chapter_templates
FOR DELETE
TO authenticated
USING (
    created_by = auth.uid()
    AND is_teacher_or_admin()
);

CREATE POLICY "Admins can manage all templates"
ON public.chapter_templates
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_chapter_templates_updated_at
    BEFORE UPDATE ON public.chapter_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 2: chapter_template_versions
-- Purpose: Version history for chapter templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chapter_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.chapter_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Version content
    content_snapshot JSONB NOT NULL,
    change_summary TEXT,
    diff JSONB, -- Optional: structured diff from previous version

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_template_version UNIQUE(template_id, version_number),
    CONSTRAINT valid_version_number CHECK (version_number >= 1)
);

COMMENT ON TABLE public.chapter_template_versions IS 'Version history for chapter templates with content snapshots';
COMMENT ON COLUMN public.chapter_template_versions.template_id IS 'Reference to parent template';
COMMENT ON COLUMN public.chapter_template_versions.version_number IS 'Version number (1-based, sequential)';
COMMENT ON COLUMN public.chapter_template_versions.created_by IS 'Teacher who created this version';
COMMENT ON COLUMN public.chapter_template_versions.content_snapshot IS 'Full content snapshot at this version';
COMMENT ON COLUMN public.chapter_template_versions.change_summary IS 'Optional human-readable summary of changes';
COMMENT ON COLUMN public.chapter_template_versions.diff IS 'Optional structured diff from previous version';

-- Indexes
CREATE INDEX idx_chapter_template_versions_template ON public.chapter_template_versions(template_id);
CREATE INDEX idx_chapter_template_versions_template_version ON public.chapter_template_versions(template_id, version_number);
CREATE INDEX idx_chapter_template_versions_created_at ON public.chapter_template_versions(created_at DESC);

-- Enable RLS
ALTER TABLE public.chapter_template_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapter_template_versions
CREATE POLICY "Teachers can view versions of their templates"
ON public.chapter_template_versions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.chapter_templates ct
        WHERE ct.id = chapter_template_versions.template_id
        AND ct.created_by = auth.uid()
    )
);

CREATE POLICY "Teachers can view versions of public templates"
ON public.chapter_template_versions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.chapter_templates ct
        WHERE ct.id = chapter_template_versions.template_id
        AND ct.is_public = true
        AND ct.status = 'published'
    )
    AND is_teacher_or_admin()
);

CREATE POLICY "Teachers can create versions for their templates"
ON public.chapter_template_versions
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.chapter_templates ct
        WHERE ct.id = chapter_template_versions.template_id
        AND ct.created_by = auth.uid()
    )
    AND is_teacher_or_admin()
);

CREATE POLICY "Admins can manage all template versions"
ON public.chapter_template_versions
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- TABLE 3: chapter_template_instantiations
-- Purpose: Track template instantiations and enable migration
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chapter_template_instantiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.chapter_templates(id) ON DELETE SET NULL,
    template_version INTEGER NOT NULL,
    chapter_id UUID NOT NULL REFERENCES public.class_chapters(id) ON DELETE CASCADE,

    -- Migration tracking
    current_template_version INTEGER, -- NULL = template deleted, otherwise tracks latest known version
    is_detached BOOLEAN NOT NULL DEFAULT false,

    -- Audit
    instantiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_migrated_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_chapter_instantiation UNIQUE(chapter_id),
    CONSTRAINT valid_template_version CHECK (template_version >= 1),
    CONSTRAINT valid_current_template_version CHECK (current_template_version IS NULL OR current_template_version >= 1)
);

COMMENT ON TABLE public.chapter_template_instantiations IS 'Links chapters to their source templates for versioning and migration';
COMMENT ON COLUMN public.chapter_template_instantiations.template_id IS 'Source template (NULL if deleted)';
COMMENT ON COLUMN public.chapter_template_instantiations.template_version IS 'Version used at instantiation';
COMMENT ON COLUMN public.chapter_template_instantiations.chapter_id IS 'Instantiated chapter (unique - one template per chapter)';
COMMENT ON COLUMN public.chapter_template_instantiations.current_template_version IS 'Latest known template version (NULL = template deleted)';
COMMENT ON COLUMN public.chapter_template_instantiations.is_detached IS 'If true, chapter is independent and will not receive template updates';
COMMENT ON COLUMN public.chapter_template_instantiations.instantiated_at IS 'When chapter was created from template';
COMMENT ON COLUMN public.chapter_template_instantiations.last_migrated_at IS 'Last time chapter was updated to match a new template version';

-- Indexes
CREATE INDEX idx_chapter_template_instantiations_template ON public.chapter_template_instantiations(template_id);
CREATE INDEX idx_chapter_template_instantiations_chapter ON public.chapter_template_instantiations(chapter_id);
CREATE INDEX idx_chapter_template_instantiations_detached ON public.chapter_template_instantiations(is_detached)
    WHERE is_detached = false;

-- Enable RLS
ALTER TABLE public.chapter_template_instantiations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapter_template_instantiations
CREATE POLICY "Teachers can view instantiations of their chapters"
ON public.chapter_template_instantiations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_template_instantiations.chapter_id
        AND ch.teacher_id = auth.uid()
    )
);

CREATE POLICY "Teachers can create instantiations for their chapters"
ON public.chapter_template_instantiations
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_template_instantiations.chapter_id
        AND ch.teacher_id = auth.uid()
    )
    AND is_teacher_or_admin()
);

CREATE POLICY "Teachers can update instantiations of their chapters"
ON public.chapter_template_instantiations
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_template_instantiations.chapter_id
        AND ch.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_template_instantiations.chapter_id
        AND ch.teacher_id = auth.uid()
    )
);

CREATE POLICY "Teachers can delete instantiations of their chapters"
ON public.chapter_template_instantiations
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_template_instantiations.chapter_id
        AND ch.teacher_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage all instantiations"
ON public.chapter_template_instantiations
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- TRIGGER: Auto-increment instantiation_count
-- Purpose: Track how many times a template has been used
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_template_instantiation_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Increment the instantiation count when a new instantiation is created
    IF NEW.template_id IS NOT NULL THEN
        UPDATE public.chapter_templates
        SET instantiation_count = instantiation_count + 1
        WHERE id = NEW.template_id;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.increment_template_instantiation_count() IS 'Auto-increment instantiation_count when template is instantiated';

CREATE TRIGGER increment_instantiation_count_trigger
    AFTER INSERT ON public.chapter_template_instantiations
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_template_instantiation_count();

-- ============================================================================
-- TRIGGER: Auto-create version 1 on template creation
-- Purpose: Create initial version when template is created
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_initial_template_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create version 1 with the initial content
    INSERT INTO public.chapter_template_versions (
        template_id,
        version_number,
        created_by,
        content_snapshot,
        change_summary
    ) VALUES (
        NEW.id,
        1,
        NEW.created_by,
        NEW.content_snapshot,
        'Initial version'
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_initial_template_version() IS 'Auto-create version 1 when a new template is created';

CREATE TRIGGER create_initial_version_trigger
    AFTER INSERT ON public.chapter_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.create_initial_template_version();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.chapter_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chapter_templates TO authenticated;

GRANT SELECT ON public.chapter_template_versions TO authenticated;
GRANT INSERT ON public.chapter_template_versions TO authenticated;

GRANT SELECT ON public.chapter_template_instantiations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chapter_template_instantiations TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
    v_table_count INTEGER;
    v_policy_count INTEGER;
    v_index_count INTEGER;
    v_trigger_count INTEGER;
    v_function_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'chapter_templates',
        'chapter_template_versions',
        'chapter_template_instantiations'
    );

    -- Count RLS policies on template tables
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
        'chapter_templates',
        'chapter_template_versions',
        'chapter_template_instantiations'
    );

    -- Count indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND (
        indexname LIKE 'idx_chapter_template%'
    );

    -- Count triggers
    SELECT COUNT(*) INTO v_trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND event_object_table IN (
        'chapter_templates',
        'chapter_template_versions',
        'chapter_template_instantiations'
    );

    -- Count helper functions
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'increment_template_instantiation_count',
        'create_initial_template_version'
    );

    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Chapter Templates System';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Tables created: % / 3', v_table_count;
    RAISE NOTICE '  - chapter_templates (template definitions)';
    RAISE NOTICE '  - chapter_template_versions (version history)';
    RAISE NOTICE '  - chapter_template_instantiations (template links)';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies: %', v_policy_count;
    RAISE NOTICE 'Indexes: %', v_index_count;
    RAISE NOTICE 'Triggers: %', v_trigger_count;
    RAISE NOTICE 'Helper Functions: % / 2', v_function_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Draft/Published/Archived status workflow';
    RAISE NOTICE '  - Public/Private template sharing';
    RAISE NOTICE '  - Full version history with snapshots';
    RAISE NOTICE '  - Template instantiation tracking';
    RAISE NOTICE '  - Migration support for template updates';
    RAISE NOTICE '  - Detach support for independent chapters';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run: pnpm db:migrate (to apply this migration)';
    RAISE NOTICE '  2. Update: src/lib/types/database.ts';
    RAISE NOTICE '  3. Update: docs/architecture/database-schema.md';
    RAISE NOTICE '===============================================';

    -- Validate all tables exist
    IF v_table_count < 3 THEN
        RAISE EXCEPTION 'Not all tables were created! Expected 3, got %', v_table_count;
    END IF;

    -- Validate RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'chapter_templates'
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS is not enabled on chapter_templates table!';
    END IF;

    -- Validate helper functions exist
    IF v_function_count < 2 THEN
        RAISE EXCEPTION 'Not all helper functions were created! Expected 2, got %', v_function_count;
    END IF;
END $$;
