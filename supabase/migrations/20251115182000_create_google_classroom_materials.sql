-- Migration: Create Google Classroom Materials Table
-- Purpose: Store Google Classroom CourseWorkMaterials (non-graded educational materials)
-- Date: 2025-11-15
-- Related: Part of Topics & CourseWorkMaterials feature (Phase 1)
-- Note: Different from coursework_materials (which are attachments to graded coursework)

-- ============================================================================
-- TABLE: google_classroom_materials
-- Purpose: Store non-graded educational materials from Google Classroom
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.google_classroom_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_course_id UUID NOT NULL REFERENCES public.google_classroom_courses(id) ON DELETE CASCADE,
    google_material_id TEXT NOT NULL, -- Google's unique material ID
    title TEXT NOT NULL,
    description TEXT,
    state TEXT NOT NULL CHECK (state IN ('PUBLISHED', 'DRAFT', 'DELETED')),
    topic_id UUID REFERENCES public.google_classroom_topics(id) ON DELETE SET NULL,
    created_time TIMESTAMPTZ NOT NULL, -- When created in Google Classroom
    updated_time TIMESTAMPTZ NOT NULL, -- When last updated in Google Classroom
    alternate_link TEXT, -- Link to view in Google Classroom
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_material_per_course UNIQUE(google_course_id, google_material_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.google_classroom_materials IS 'Non-graded educational materials from Google Classroom (documents, videos for consultation)';
COMMENT ON COLUMN public.google_classroom_materials.google_material_id IS 'Google''s unique material identifier (unique per course)';
COMMENT ON COLUMN public.google_classroom_materials.state IS 'Publication state (PUBLISHED, DRAFT, DELETED)';
COMMENT ON COLUMN public.google_classroom_materials.topic_id IS 'Optional topic/rubric for organizing materials';
COMMENT ON COLUMN public.google_classroom_materials.alternate_link IS 'URL to view material in Google Classroom web interface';
COMMENT ON COLUMN public.google_classroom_materials.last_synced_at IS 'Last time material data was synced from Google API';

-- Indexes
CREATE INDEX idx_materials_course ON public.google_classroom_materials(google_course_id);
CREATE INDEX idx_materials_topic ON public.google_classroom_materials(topic_id);
CREATE INDEX idx_materials_state ON public.google_classroom_materials(state);
CREATE INDEX idx_materials_google_id ON public.google_classroom_materials(google_material_id);
CREATE INDEX idx_materials_published ON public.google_classroom_materials(google_course_id, state)
WHERE state = 'PUBLISHED';

-- Enable Row Level Security
ALTER TABLE public.google_classroom_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can view materials for their own courses
CREATE POLICY "Teachers can view their own materials"
ON public.google_classroom_materials
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.google_classroom_courses gcc
        WHERE gcc.id = google_classroom_materials.google_course_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Teachers can insert materials for their own courses
CREATE POLICY "Teachers can insert their own materials"
ON public.google_classroom_materials
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.google_classroom_courses gcc
        WHERE gcc.id = google_classroom_materials.google_course_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Teachers can update materials for their own courses
CREATE POLICY "Teachers can update their own materials"
ON public.google_classroom_materials
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.google_classroom_courses gcc
        WHERE gcc.id = google_classroom_materials.google_course_id
        AND gcc.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.google_classroom_courses gcc
        WHERE gcc.id = google_classroom_materials.google_course_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Teachers can delete materials for their own courses
CREATE POLICY "Teachers can delete their own materials"
ON public.google_classroom_materials
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.google_classroom_courses gcc
        WHERE gcc.id = google_classroom_materials.google_course_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Admins can view all materials
CREATE POLICY "Admins can view all materials"
ON public.google_classroom_materials
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_google_classroom_materials_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_google_classroom_materials_updated_at ON public.google_classroom_materials;
CREATE TRIGGER trigger_update_google_classroom_materials_updated_at
    BEFORE UPDATE ON public.google_classroom_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_google_classroom_materials_updated_at();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_classroom_materials TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Google Classroom Materials';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Tables created: 1';
    RAISE NOTICE '  - google_classroom_materials (non-graded educational materials)';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies: 5 (SELECT, INSERT, UPDATE, DELETE for teachers + admin)';
    RAISE NOTICE 'Indexes: 5 (course, topic, state, google_id, published)';
    RAISE NOTICE 'Triggers: 1 (updated_at)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Create google_classroom_material_attachments table';
    RAISE NOTICE '===============================================';
END $$;
