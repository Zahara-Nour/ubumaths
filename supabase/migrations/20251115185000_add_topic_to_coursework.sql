-- Migration: Add topic_id to google_classroom_coursework
-- Purpose: Link coursework to Google Classroom topics for organization
-- Date: 2025-11-15
-- Related: Part of Topics & CourseWorkMaterials feature (Phase 1)

-- ============================================================================
-- ALTER TABLE: google_classroom_coursework
-- Add topic_id foreign key
-- ============================================================================

-- Add topic_id column
ALTER TABLE public.google_classroom_coursework
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.google_classroom_topics(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.google_classroom_coursework.topic_id IS 'Links coursework to a Google Classroom topic/rubric for organization (optional)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_coursework_topic
ON public.google_classroom_coursework(topic_id)
WHERE topic_id IS NOT NULL;

-- Create composite index for filtering by course and topic
CREATE INDEX IF NOT EXISTS idx_coursework_course_topic
ON public.google_classroom_coursework(google_course_id, topic_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Add topic_id to coursework';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Columns added: 1';
    RAISE NOTICE '  - google_classroom_coursework.topic_id (UUID, optional)';
    RAISE NOTICE '';
    RAISE NOTICE 'Indexes created: 2';
    RAISE NOTICE '  - idx_coursework_topic (partial index where topic_id IS NOT NULL)';
    RAISE NOTICE '  - idx_coursework_course_topic (composite for filtering)';
    RAISE NOTICE '';
    RAISE NOTICE 'Foreign key: ON DELETE SET NULL (topics are optional)';
    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Phase 1 (Database Schema) COMPLETE!';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary of all tables created:';
    RAISE NOTICE '  1. google_classroom_topics (topics for organization)';
    RAISE NOTICE '  2. google_classroom_materials (non-graded materials)';
    RAISE NOTICE '  3. google_classroom_material_attachments (files/links/videos)';
    RAISE NOTICE '  4. shared_materials (materials shared with classes)';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary of columns modified:';
    RAISE NOTICE '  1. google_classroom_coursework.topic_id (link coursework to topics)';
    RAISE NOTICE '';
    RAISE NOTICE 'Total RLS Policies: 23';
    RAISE NOTICE 'Total Indexes: 19';
    RAISE NOTICE 'Total Triggers: 5';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run: pnpm db:migrate (push migrations to Supabase)';
    RAISE NOTICE '  2. Run: pnpm db:types (regenerate TypeScript types)';
    RAISE NOTICE '  3. Update: src/lib/types/database.ts (manual if needed)';
    RAISE NOTICE '  4. Update: docs/architecture/database-schema.md';
    RAISE NOTICE '  5. Begin Phase 2: API endpoints for sync';
    RAISE NOTICE '===============================================';
END $$;
