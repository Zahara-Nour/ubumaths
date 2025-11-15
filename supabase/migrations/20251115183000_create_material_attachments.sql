-- Migration: Create Material Attachments Table
-- Purpose: Store attachments (Drive files, YouTube videos, links) for CourseWorkMaterials
-- Date: 2025-11-15
-- Related: Part of Topics & CourseWorkMaterials feature (Phase 1)

-- ============================================================================
-- TABLE: google_classroom_material_attachments
-- Purpose: Store files, links, videos attached to non-graded materials
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.google_classroom_material_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_material_id UUID NOT NULL REFERENCES public.google_classroom_materials(id) ON DELETE CASCADE,
    material_type TEXT NOT NULL CHECK (material_type IN ('DRIVE_FILE', 'YOUTUBE_VIDEO', 'LINK', 'FORM')),
    google_file_id TEXT, -- For DRIVE_FILE type (Google Drive file ID)
    file_name TEXT NOT NULL,
    mime_type TEXT, -- MIME type for files (e.g., application/pdf, video/mp4)
    file_url TEXT NOT NULL, -- URL to access the resource
    thumbnail_url TEXT, -- Thumbnail preview URL (optional)
    title TEXT, -- Title for links/videos (optional, may differ from file_name)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.google_classroom_material_attachments IS 'Files, links, and videos attached to Google Classroom CourseWorkMaterials (immutable records - delete and recreate to update)';
COMMENT ON COLUMN public.google_classroom_material_attachments.material_type IS 'Type of attachment (DRIVE_FILE, YOUTUBE_VIDEO, LINK, FORM)';
COMMENT ON COLUMN public.google_classroom_material_attachments.google_file_id IS 'Google Drive file ID (for DRIVE_FILE type only)';
COMMENT ON COLUMN public.google_classroom_material_attachments.file_url IS 'URL to access the resource (direct link or Google Drive preview)';
COMMENT ON COLUMN public.google_classroom_material_attachments.thumbnail_url IS 'URL for preview thumbnail (optional)';
COMMENT ON COLUMN public.google_classroom_material_attachments.title IS 'Display title (for links/videos, may differ from file_name)';

-- Indexes
CREATE INDEX idx_material_attachments_material ON public.google_classroom_material_attachments(google_material_id);
CREATE INDEX idx_material_attachments_type ON public.google_classroom_material_attachments(material_type);
CREATE INDEX idx_material_attachments_google_file ON public.google_classroom_material_attachments(google_file_id)
WHERE google_file_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.google_classroom_material_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can view attachments for their own materials
CREATE POLICY "Teachers can view their own material attachments"
ON public.google_classroom_material_attachments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.google_classroom_materials gcm
        JOIN public.google_classroom_courses gcc ON gcm.google_course_id = gcc.id
        WHERE gcm.id = google_classroom_material_attachments.google_material_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Teachers can insert attachments for their own materials
CREATE POLICY "Teachers can insert their own material attachments"
ON public.google_classroom_material_attachments
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.google_classroom_materials gcm
        JOIN public.google_classroom_courses gcc ON gcm.google_course_id = gcc.id
        WHERE gcm.id = google_classroom_material_attachments.google_material_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Teachers can update attachments for their own materials
CREATE POLICY "Teachers can update their own material attachments"
ON public.google_classroom_material_attachments
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.google_classroom_materials gcm
        JOIN public.google_classroom_courses gcc ON gcm.google_course_id = gcc.id
        WHERE gcm.id = google_classroom_material_attachments.google_material_id
        AND gcc.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.google_classroom_materials gcm
        JOIN public.google_classroom_courses gcc ON gcm.google_course_id = gcc.id
        WHERE gcm.id = google_classroom_material_attachments.google_material_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Teachers can delete attachments for their own materials
CREATE POLICY "Teachers can delete their own material attachments"
ON public.google_classroom_material_attachments
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.google_classroom_materials gcm
        JOIN public.google_classroom_courses gcc ON gcm.google_course_id = gcc.id
        WHERE gcm.id = google_classroom_material_attachments.google_material_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Admins can view all material attachments
CREATE POLICY "Admins can view all material attachments"
ON public.google_classroom_material_attachments
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
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_classroom_material_attachments TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Material Attachments';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Tables created: 1';
    RAISE NOTICE '  - google_classroom_material_attachments (files, links, videos)';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies: 5 (SELECT, INSERT, UPDATE, DELETE for teachers + admin)';
    RAISE NOTICE 'Indexes: 3 (material, type, google_file)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Create shared_materials table with denormalization';
    RAISE NOTICE '===============================================';
END $$;
