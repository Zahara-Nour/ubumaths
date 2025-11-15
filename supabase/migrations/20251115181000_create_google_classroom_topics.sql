-- Migration: Create Google Classroom Topics Table
-- Purpose: Store Google Classroom topics (rubriques/thèmes) for organizing coursework and materials
-- Date: 2025-11-15
-- Related: Part of Topics & CourseWorkMaterials feature (Phase 1)

-- ============================================================================
-- TABLE: google_classroom_topics
-- Purpose: Store topics from Google Classroom for organizing coursework
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.google_classroom_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_course_id UUID NOT NULL REFERENCES public.google_classroom_courses(id) ON DELETE CASCADE,
    google_topic_id TEXT NOT NULL, -- Google's unique topic ID
    name TEXT NOT NULL CHECK (char_length(name) <= 100), -- Max 100 chars per Google API
    updated_time TIMESTAMPTZ NOT NULL, -- When last updated in Google Classroom
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_topic_per_course UNIQUE(google_course_id, google_topic_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.google_classroom_topics IS 'Topics (rubriques/thèmes) from Google Classroom for organizing coursework and materials';
COMMENT ON COLUMN public.google_classroom_topics.google_topic_id IS 'Google''s unique topic identifier (unique per course)';
COMMENT ON COLUMN public.google_classroom_topics.name IS 'Topic name (max 100 characters per Google API)';
COMMENT ON COLUMN public.google_classroom_topics.updated_time IS 'Last update timestamp from Google Classroom';
COMMENT ON COLUMN public.google_classroom_topics.last_synced_at IS 'Last time topic data was synced from Google API';

-- Indexes
CREATE INDEX idx_topics_course ON public.google_classroom_topics(google_course_id);
CREATE INDEX idx_topics_google_id ON public.google_classroom_topics(google_topic_id);
CREATE INDEX idx_topics_name ON public.google_classroom_topics(google_course_id, name);

-- Enable Row Level Security
ALTER TABLE public.google_classroom_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can view topics for their own courses
CREATE POLICY "Teachers can view their own topics"
ON public.google_classroom_topics
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.google_classroom_courses gcc
        WHERE gcc.id = google_classroom_topics.google_course_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Teachers can insert topics for their own courses
CREATE POLICY "Teachers can insert their own topics"
ON public.google_classroom_topics
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.google_classroom_courses gcc
        WHERE gcc.id = google_classroom_topics.google_course_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Teachers can update topics for their own courses
CREATE POLICY "Teachers can update their own topics"
ON public.google_classroom_topics
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.google_classroom_courses gcc
        WHERE gcc.id = google_classroom_topics.google_course_id
        AND gcc.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.google_classroom_courses gcc
        WHERE gcc.id = google_classroom_topics.google_course_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Teachers can delete topics for their own courses
CREATE POLICY "Teachers can delete their own topics"
ON public.google_classroom_topics
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.google_classroom_courses gcc
        WHERE gcc.id = google_classroom_topics.google_course_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Admins can view all topics
CREATE POLICY "Admins can view all topics"
ON public.google_classroom_topics
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
CREATE OR REPLACE FUNCTION public.update_google_classroom_topics_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_google_classroom_topics_updated_at ON public.google_classroom_topics;
CREATE TRIGGER trigger_update_google_classroom_topics_updated_at
    BEFORE UPDATE ON public.google_classroom_topics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_google_classroom_topics_updated_at();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_classroom_topics TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Google Classroom Topics';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Tables created: 1';
    RAISE NOTICE '  - google_classroom_topics (topics for organizing coursework)';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies: 5 (SELECT, INSERT, UPDATE, DELETE for teachers + admin)';
    RAISE NOTICE 'Indexes: 3 (course, google_id, name)';
    RAISE NOTICE 'Triggers: 1 (updated_at)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Create google_classroom_materials table';
    RAISE NOTICE '===============================================';
END $$;
