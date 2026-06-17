-- Migration: Create Google Classroom Integration Schema
-- Purpose: Enable teachers to sync and share coursework from Google Classroom with UbuMaths classes
-- Date: 2025-11-14
-- Tables: google_integrations, google_classroom_courses, class_google_classroom_links,
--         coursework_categories, google_classroom_coursework, coursework_materials,
--         shared_coursework, shared_coursework_students
--
-- NOTE: Token encryption is handled server-side (Node.js) using AES-256-GCM.
--       The database stores pre-encrypted tokens as TEXT.
--       See: src/lib/server/google/encryption.ts

-- ============================================================================
-- TABLE: google_integrations
-- Purpose: Store OAuth tokens and metadata for each teacher's Google account
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.google_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL, -- Encrypted OAuth access token (encrypted by Node.js)
    refresh_token TEXT NOT NULL, -- Encrypted OAuth refresh token (encrypted by Node.js)
    token_expiry TIMESTAMPTZ NOT NULL, -- When access_token expires
    scopes TEXT[] NOT NULL DEFAULT '{}', -- OAuth scopes granted
    google_email TEXT NOT NULL, -- Email of linked Google account
    last_sync_at TIMESTAMPTZ, -- Last successful sync with Google Classroom
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT google_email_format CHECK (google_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT scopes_not_empty CHECK (array_length(scopes, 1) > 0)
);

-- Add comments for documentation
COMMENT ON TABLE public.google_integrations IS 'Stores encrypted OAuth tokens for teacher Google account integration';
COMMENT ON COLUMN public.google_integrations.teacher_id IS 'Teacher who linked their Google account (UNIQUE - one integration per teacher)';
COMMENT ON COLUMN public.google_integrations.access_token IS 'Encrypted Google OAuth access token (short-lived, ~1 hour, encrypted by Node.js AES-256-GCM)';
COMMENT ON COLUMN public.google_integrations.refresh_token IS 'Encrypted Google OAuth refresh token (long-lived, encrypted by Node.js AES-256-GCM)';
COMMENT ON COLUMN public.google_integrations.token_expiry IS 'Timestamp when access_token expires and needs refresh';
COMMENT ON COLUMN public.google_integrations.scopes IS 'Array of OAuth scopes granted (e.g., classroom.courses.readonly)';
COMMENT ON COLUMN public.google_integrations.google_email IS 'Email address of the linked Google account';
COMMENT ON COLUMN public.google_integrations.last_sync_at IS 'Timestamp of last successful sync with Google Classroom API';

-- Indexes
CREATE INDEX idx_google_integrations_teacher ON public.google_integrations(teacher_id);
CREATE INDEX idx_google_integrations_expiry ON public.google_integrations(token_expiry);

-- Enable Row Level Security
ALTER TABLE public.google_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can view their own integration
CREATE POLICY "Teachers can view their own Google integration"
ON public.google_integrations
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- RLS Policy: Teachers can insert their own integration
CREATE POLICY "Teachers can insert their own Google integration"
ON public.google_integrations
FOR INSERT
TO authenticated
WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
);

-- RLS Policy: Teachers can update their own integration
CREATE POLICY "Teachers can update their own Google integration"
ON public.google_integrations
FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- RLS Policy: Teachers can delete their own integration
CREATE POLICY "Teachers can delete their own Google integration"
ON public.google_integrations
FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

-- RLS Policy: Admins can view all integrations (for support)
CREATE POLICY "Admins can view all Google integrations"
ON public.google_integrations
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
-- TABLE: google_classroom_courses
-- Purpose: Store Google Classroom courses synced from teacher's Google account
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.google_classroom_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    google_course_id TEXT NOT NULL, -- Google's course ID (unique per teacher)
    name TEXT NOT NULL, -- Course name
    section TEXT, -- Course section (optional)
    description_heading TEXT, -- Course description
    room TEXT, -- Classroom location (optional)
    enrollment_code TEXT, -- Google Classroom join code
    course_state TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ARCHIVED, PROVISIONED, DECLINED, SUSPENDED
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_teacher_google_course UNIQUE(teacher_id, google_course_id),
    CONSTRAINT valid_course_state CHECK (course_state IN ('ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED'))
);

-- Add comments for documentation
COMMENT ON TABLE public.google_classroom_courses IS 'Google Classroom courses synced from teacher accounts';
COMMENT ON COLUMN public.google_classroom_courses.google_course_id IS 'Google''s unique course identifier (unique per teacher)';
COMMENT ON COLUMN public.google_classroom_courses.course_state IS 'Course state from Google Classroom (ACTIVE, ARCHIVED, etc.)';
COMMENT ON COLUMN public.google_classroom_courses.last_synced_at IS 'Last time course data was synced from Google API';

-- Indexes
CREATE INDEX idx_google_courses_teacher ON public.google_classroom_courses(teacher_id);
CREATE INDEX idx_google_courses_state ON public.google_classroom_courses(course_state);
CREATE INDEX idx_google_courses_google_id ON public.google_classroom_courses(google_course_id);

-- Enable Row Level Security
ALTER TABLE public.google_classroom_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can view their own courses
CREATE POLICY "Teachers can view their own Google courses"
ON public.google_classroom_courses
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- RLS Policy: Teachers can insert their own courses
CREATE POLICY "Teachers can insert their own Google courses"
ON public.google_classroom_courses
FOR INSERT
TO authenticated
WITH CHECK (teacher_id = auth.uid());

-- RLS Policy: Teachers can update their own courses
CREATE POLICY "Teachers can update their own Google courses"
ON public.google_classroom_courses
FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- RLS Policy: Teachers can delete their own courses
CREATE POLICY "Teachers can delete their own Google courses"
ON public.google_classroom_courses
FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

-- RLS Policy: Admins can view all courses
CREATE POLICY "Admins can view all Google courses"
ON public.google_classroom_courses
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
-- TABLE: class_google_classroom_links
-- Purpose: Link UbuMaths classes to Google Classroom courses
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.class_google_classroom_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    google_course_id UUID NOT NULL REFERENCES public.google_classroom_courses(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_class_google_course UNIQUE(class_id, google_course_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.class_google_classroom_links IS 'Links UbuMaths classes to Google Classroom courses for coursework sharing';
COMMENT ON COLUMN public.class_google_classroom_links.class_id IS 'UbuMaths class that is linked to Google Classroom';
COMMENT ON COLUMN public.class_google_classroom_links.google_course_id IS 'Google Classroom course that is linked';
COMMENT ON COLUMN public.class_google_classroom_links.created_by IS 'Teacher who created the link';

-- Indexes
CREATE INDEX idx_class_google_links_class ON public.class_google_classroom_links(class_id);
CREATE INDEX idx_class_google_links_google_course ON public.class_google_classroom_links(google_course_id);

-- Enable Row Level Security
ALTER TABLE public.class_google_classroom_links ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can manage links for their classes
CREATE POLICY "Teachers can manage Google Classroom links for their classes"
ON public.class_google_classroom_links
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = class_google_classroom_links.class_id
        AND classes.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = class_google_classroom_links.class_id
        AND classes.teacher_id = auth.uid()
    )
);

-- RLS Policy: Students can view links for their classes
CREATE POLICY "Students can view Google Classroom links for their classes"
ON public.class_google_classroom_links
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_members
        WHERE class_members.class_id = class_google_classroom_links.class_id
        AND class_members.student_id = auth.uid()
    )
);

-- RLS Policy: Admins can view all links
CREATE POLICY "Admins can view all Google Classroom links"
ON public.class_google_classroom_links
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
-- TABLE: coursework_categories
-- Purpose: Teacher-defined categories for organizing coursework (Cours, Exercices, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coursework_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Category name (e.g., "Cours", "Exercices")
    icon TEXT, -- Emoji or icon identifier (e.g., "📚", "book-open")
    color TEXT, -- Hex color for UI (e.g., "#3B82F6")
    display_order INTEGER NOT NULL DEFAULT 0, -- Order for display
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_category_per_class UNIQUE(class_id, name),
    CONSTRAINT valid_color_format CHECK (color IS NULL OR color ~* '^#[0-9A-Fa-f]{6}$')
);

-- Add comments for documentation
COMMENT ON TABLE public.coursework_categories IS 'Teacher-defined categories for organizing Google Classroom coursework';
COMMENT ON COLUMN public.coursework_categories.name IS 'Category name (e.g., "Cours", "Exercices", "Devoirs")';
COMMENT ON COLUMN public.coursework_categories.icon IS 'Emoji or icon identifier for visual representation';
COMMENT ON COLUMN public.coursework_categories.color IS 'Hex color code for UI styling (e.g., #3B82F6)';
COMMENT ON COLUMN public.coursework_categories.display_order IS 'Order for displaying categories in UI (lower = first)';

-- Indexes
CREATE INDEX idx_coursework_categories_class ON public.coursework_categories(class_id);
CREATE INDEX idx_coursework_categories_order ON public.coursework_categories(class_id, display_order);

-- Enable Row Level Security
ALTER TABLE public.coursework_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can manage categories for their classes
CREATE POLICY "Teachers can manage coursework categories for their classes"
ON public.coursework_categories
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = coursework_categories.class_id
        AND classes.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = coursework_categories.class_id
        AND classes.teacher_id = auth.uid()
    )
);

-- RLS Policy: Students can view categories for their classes
CREATE POLICY "Students can view coursework categories for their classes"
ON public.coursework_categories
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_members
        WHERE class_members.class_id = coursework_categories.class_id
        AND class_members.student_id = auth.uid()
    )
);

-- RLS Policy: Admins can view all categories
CREATE POLICY "Admins can view all coursework categories"
ON public.coursework_categories
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
-- TABLE: google_classroom_coursework
-- Purpose: Coursework/assignments synced from Google Classroom
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.google_classroom_coursework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_course_id UUID NOT NULL REFERENCES public.google_classroom_courses(id) ON DELETE CASCADE,
    google_coursework_id TEXT NOT NULL, -- Google's coursework ID
    title TEXT NOT NULL,
    description TEXT,
    coursework_type TEXT NOT NULL, -- ASSIGNMENT, SHORT_ANSWER_QUESTION, MULTIPLE_CHOICE_QUESTION
    state TEXT NOT NULL, -- PUBLISHED, DRAFT, DELETED
    due_date DATE, -- Due date (optional)
    due_time TIME, -- Due time (optional, paired with due_date)
    created_time TIMESTAMPTZ NOT NULL, -- When created in Google Classroom
    updated_time TIMESTAMPTZ NOT NULL, -- When last updated in Google Classroom
    max_points NUMERIC(10, 2), -- Maximum points for grading (optional)
    work_type TEXT NOT NULL DEFAULT 'ASSIGNMENT', -- Type of work
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_coursework_per_course UNIQUE(google_course_id, google_coursework_id),
    CONSTRAINT valid_coursework_type CHECK (coursework_type IN ('ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION')),
    CONSTRAINT valid_state CHECK (state IN ('PUBLISHED', 'DRAFT', 'DELETED')),
    CONSTRAINT valid_work_type CHECK (work_type IN ('ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION')),
    CONSTRAINT max_points_non_negative CHECK (max_points IS NULL OR max_points >= 0)
);

-- Add comments for documentation
COMMENT ON TABLE public.google_classroom_coursework IS 'Coursework (assignments) synced from Google Classroom courses';
COMMENT ON COLUMN public.google_classroom_coursework.google_coursework_id IS 'Google''s unique coursework identifier';
COMMENT ON COLUMN public.google_classroom_coursework.coursework_type IS 'Type of coursework (ASSIGNMENT, SHORT_ANSWER_QUESTION, etc.)';
COMMENT ON COLUMN public.google_classroom_coursework.state IS 'Publication state (PUBLISHED, DRAFT, DELETED)';
COMMENT ON COLUMN public.google_classroom_coursework.due_date IS 'Due date for the coursework (optional)';
COMMENT ON COLUMN public.google_classroom_coursework.due_time IS 'Due time paired with due_date (optional)';
COMMENT ON COLUMN public.google_classroom_coursework.max_points IS 'Maximum points for grading (NULL = ungraded)';

-- Indexes
CREATE INDEX idx_coursework_course ON public.google_classroom_coursework(google_course_id);
CREATE INDEX idx_coursework_state ON public.google_classroom_coursework(state);
CREATE INDEX idx_coursework_due_date ON public.google_classroom_coursework(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_coursework_google_id ON public.google_classroom_coursework(google_coursework_id);
CREATE INDEX idx_coursework_published_due ON public.google_classroom_coursework(google_course_id, state, due_date)
WHERE state = 'PUBLISHED';

-- Enable Row Level Security
ALTER TABLE public.google_classroom_coursework ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can manage coursework for their courses
CREATE POLICY "Teachers can manage coursework for their Google courses"
ON public.google_classroom_coursework
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.google_classroom_courses gcc
        WHERE gcc.id = google_classroom_coursework.google_course_id
        AND gcc.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.google_classroom_courses gcc
        WHERE gcc.id = google_classroom_coursework.google_course_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Admins can view all coursework
CREATE POLICY "Admins can view all coursework"
ON public.google_classroom_coursework
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
-- TABLE: coursework_materials
-- Purpose: Files, links, videos attached to coursework
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coursework_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coursework_id UUID NOT NULL REFERENCES public.google_classroom_coursework(id) ON DELETE CASCADE,
    material_type TEXT NOT NULL, -- DRIVE_FILE, YOUTUBE_VIDEO, LINK, FORM
    google_file_id TEXT, -- For Drive files
    file_name TEXT NOT NULL,
    mime_type TEXT, -- MIME type (e.g., application/pdf, video/mp4)
    file_url TEXT NOT NULL, -- URL to access the material
    thumbnail_url TEXT, -- Thumbnail preview URL (optional)
    title TEXT, -- Title for links/videos (optional)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_material_type CHECK (material_type IN ('DRIVE_FILE', 'YOUTUBE_VIDEO', 'LINK', 'FORM'))
);

-- Add comments for documentation
COMMENT ON TABLE public.coursework_materials IS 'Files, links, and videos attached to Google Classroom coursework';
COMMENT ON COLUMN public.coursework_materials.material_type IS 'Type of material (DRIVE_FILE, YOUTUBE_VIDEO, LINK, FORM)';
COMMENT ON COLUMN public.coursework_materials.google_file_id IS 'Google Drive file ID (for DRIVE_FILE type)';
COMMENT ON COLUMN public.coursework_materials.file_url IS 'URL to access the material (direct link or Google Drive preview)';
COMMENT ON COLUMN public.coursework_materials.thumbnail_url IS 'URL for preview thumbnail (optional)';

-- Indexes
CREATE INDEX idx_coursework_materials_coursework ON public.coursework_materials(coursework_id);
CREATE INDEX idx_coursework_materials_type ON public.coursework_materials(material_type);

-- Enable Row Level Security
ALTER TABLE public.coursework_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can manage materials for their coursework
CREATE POLICY "Teachers can manage materials for their coursework"
ON public.coursework_materials
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.google_classroom_coursework gcw
        JOIN public.google_classroom_courses gcc ON gcc.id = gcw.google_course_id
        WHERE gcw.id = coursework_materials.coursework_id
        AND gcc.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.google_classroom_coursework gcw
        JOIN public.google_classroom_courses gcc ON gcc.id = gcw.google_course_id
        WHERE gcw.id = coursework_materials.coursework_id
        AND gcc.teacher_id = auth.uid()
    )
);

-- RLS Policy: Admins can view all materials
CREATE POLICY "Admins can view all materials"
ON public.coursework_materials
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
-- TABLE: shared_coursework
-- Purpose: Track which coursework is shared with which UbuMaths classes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shared_coursework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coursework_id UUID NOT NULL REFERENCES public.google_classroom_coursework(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.coursework_categories(id) ON DELETE SET NULL,
    shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    visible BOOLEAN NOT NULL DEFAULT true, -- Toggle visibility for students
    description_override TEXT, -- Teacher's custom description (overrides coursework.description)
    display_order INTEGER NOT NULL DEFAULT 0, -- Custom ordering within category
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_coursework_per_class UNIQUE(coursework_id, class_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.shared_coursework IS 'Tracks Google Classroom coursework shared with UbuMaths classes';
COMMENT ON COLUMN public.shared_coursework.coursework_id IS 'The coursework being shared';
COMMENT ON COLUMN public.shared_coursework.class_id IS 'The UbuMaths class receiving the coursework';
COMMENT ON COLUMN public.shared_coursework.category_id IS 'Category for organization (NULL = uncategorized)';
COMMENT ON COLUMN public.shared_coursework.shared_by IS 'Teacher who shared the coursework';
COMMENT ON COLUMN public.shared_coursework.visible IS 'Whether students can currently see this coursework';
COMMENT ON COLUMN public.shared_coursework.description_override IS 'Custom description that overrides original coursework description';
COMMENT ON COLUMN public.shared_coursework.display_order IS 'Custom ordering within category (lower = first)';

-- Indexes
CREATE INDEX idx_shared_coursework_class ON public.shared_coursework(class_id);
CREATE INDEX idx_shared_coursework_category ON public.shared_coursework(category_id);
CREATE INDEX idx_shared_coursework_visible ON public.shared_coursework(class_id, visible, display_order)
WHERE visible = true;
CREATE INDEX idx_shared_coursework_coursework ON public.shared_coursework(coursework_id);

-- Enable Row Level Security
ALTER TABLE public.shared_coursework ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can manage shared coursework for their classes
CREATE POLICY "Teachers can manage shared coursework for their classes"
ON public.shared_coursework
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = shared_coursework.class_id
        AND classes.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = shared_coursework.class_id
        AND classes.teacher_id = auth.uid()
    )
);


-- RLS Policy: Admins can view all shared coursework
CREATE POLICY "Admins can view all shared coursework"
ON public.shared_coursework
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
-- TABLE: shared_coursework_students
-- Purpose: Optionally restrict coursework to specific students within a class
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shared_coursework_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shared_coursework_id UUID NOT NULL REFERENCES public.shared_coursework(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_shared_coursework_student UNIQUE(shared_coursework_id, student_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.shared_coursework_students IS 'Optional per-student restrictions for shared coursework (empty = visible to all)';
COMMENT ON COLUMN public.shared_coursework_students.shared_coursework_id IS 'The shared coursework entry';
COMMENT ON COLUMN public.shared_coursework_students.student_id IS 'Student who can access this coursework (if restrictions apply)';

-- Indexes
CREATE INDEX idx_shared_coursework_students_shared ON public.shared_coursework_students(shared_coursework_id);
CREATE INDEX idx_shared_coursework_students_student ON public.shared_coursework_students(student_id);

-- Enable Row Level Security
ALTER TABLE public.shared_coursework_students ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can manage student restrictions for their shared coursework
CREATE POLICY "Teachers can manage student restrictions for their shared coursework"
ON public.shared_coursework_students
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.shared_coursework sc
        JOIN public.classes c ON c.id = sc.class_id
        WHERE sc.id = shared_coursework_students.shared_coursework_id
        AND c.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.shared_coursework sc
        JOIN public.classes c ON c.id = sc.class_id
        WHERE sc.id = shared_coursework_students.shared_coursework_id
        AND c.teacher_id = auth.uid()
    )
);

-- RLS Policy: Students can check if they have access to restricted coursework
CREATE POLICY "Students can check their access to restricted coursework"
ON public.shared_coursework_students
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- RLS Policy: Admins can view all restrictions
CREATE POLICY "Admins can view all coursework student restrictions"
ON public.shared_coursework_students
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
-- TRIGGERS FOR updated_at
-- ============================================================================

-- Trigger for google_integrations
CREATE OR REPLACE FUNCTION public.update_google_integrations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_google_integrations_updated_at ON public.google_integrations;
CREATE TRIGGER trigger_update_google_integrations_updated_at
    BEFORE UPDATE ON public.google_integrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_google_integrations_updated_at();

-- Trigger for google_classroom_courses
CREATE OR REPLACE FUNCTION public.update_google_classroom_courses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_google_classroom_courses_updated_at ON public.google_classroom_courses;
CREATE TRIGGER trigger_update_google_classroom_courses_updated_at
    BEFORE UPDATE ON public.google_classroom_courses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_google_classroom_courses_updated_at();

-- Trigger for coursework_categories
CREATE OR REPLACE FUNCTION public.update_coursework_categories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_coursework_categories_updated_at ON public.coursework_categories;
CREATE TRIGGER trigger_update_coursework_categories_updated_at
    BEFORE UPDATE ON public.coursework_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_coursework_categories_updated_at();

-- Trigger for google_classroom_coursework
CREATE OR REPLACE FUNCTION public.update_google_classroom_coursework_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_google_classroom_coursework_updated_at ON public.google_classroom_coursework;
CREATE TRIGGER trigger_update_google_classroom_coursework_updated_at
    BEFORE UPDATE ON public.google_classroom_coursework
    FOR EACH ROW
    EXECUTE FUNCTION public.update_google_classroom_coursework_updated_at();

-- Trigger for shared_coursework
CREATE OR REPLACE FUNCTION public.update_shared_coursework_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_shared_coursework_updated_at ON public.shared_coursework;
CREATE TRIGGER trigger_update_shared_coursework_updated_at
    BEFORE UPDATE ON public.shared_coursework
    FOR EACH ROW
    EXECUTE FUNCTION public.update_shared_coursework_updated_at();

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: student_coursework_view
-- Purpose: Simplified view for students to see coursework available to them
CREATE OR REPLACE VIEW public.student_coursework_view AS
SELECT
    sc.id AS shared_coursework_id,
    sc.class_id,
    c.name AS class_name,
    sc.category_id,
    cc.name AS category_name,
    cc.icon AS category_icon,
    cc.color AS category_color,
    sc.visible,
    sc.display_order,
    gcw.id AS coursework_id,
    gcw.title,
    COALESCE(sc.description_override, gcw.description) AS description,
    gcw.coursework_type,
    gcw.state,
    gcw.due_date,
    gcw.due_time,
    gcw.max_points,
    gcw.created_time,
    gcw.updated_time,
    gcc.name AS google_course_name,
    gcc.section AS google_course_section,
    -- Check if student has specific access (NULL = available to all)
    EXISTS (
        SELECT 1 FROM public.shared_coursework_students scs
        WHERE scs.shared_coursework_id = sc.id
    ) AS has_student_restrictions
FROM public.shared_coursework sc
JOIN public.google_classroom_coursework gcw ON gcw.id = sc.coursework_id
JOIN public.google_classroom_courses gcc ON gcc.id = gcw.google_course_id
JOIN public.classes c ON c.id = sc.class_id
LEFT JOIN public.coursework_categories cc ON cc.id = sc.category_id
WHERE sc.visible = true
  AND gcw.state = 'PUBLISHED';

COMMENT ON VIEW public.student_coursework_view IS 'Simplified view of visible coursework for students with category information';

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.student_coursework_view TO authenticated;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: initialize_default_categories
-- Purpose: Create default coursework categories when a class is linked to Google Classroom
CREATE OR REPLACE FUNCTION public.initialize_default_categories(
    p_class_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    -- SECURITY CHECK: Verify caller is the teacher of this class or admin
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF auth.uid() IS NULL OR NOT (
        v_caller_role = 'admin'
        OR (v_caller_role = 'teacher' AND EXISTS (
            SELECT 1 FROM public.classes
            WHERE id = p_class_id
            AND teacher_id = auth.uid()
        ))
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not have permission to initialize categories for this class';
    END IF;

    -- Insert default categories (ON CONFLICT DO NOTHING to handle re-runs)
    INSERT INTO public.coursework_categories (class_id, name, icon, color, display_order, created_by)
    VALUES
        (p_class_id, 'Cours', '📚', '#3B82F6', 1, auth.uid()),
        (p_class_id, 'Exercices', '✏️', '#10B981', 2, auth.uid()),
        (p_class_id, 'Corrections', '✅', '#8B5CF6', 3, auth.uid()),
        (p_class_id, 'Devoirs', '📝', '#F59E0B', 4, auth.uid()),
        (p_class_id, 'Évaluations', '🎯', '#EF4444', 5, auth.uid())
    ON CONFLICT (class_id, name) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.initialize_default_categories IS 'Creates default coursework categories (Cours, Exercices, etc.) for a class. Caller must be the class teacher or admin.';

GRANT EXECUTE ON FUNCTION public.initialize_default_categories TO authenticated;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT permissions on all tables to authenticated users (RLS will further restrict)
GRANT SELECT ON public.google_integrations TO authenticated;
GRANT SELECT ON public.google_classroom_courses TO authenticated;
GRANT SELECT ON public.class_google_classroom_links TO authenticated;
GRANT SELECT ON public.coursework_categories TO authenticated;
GRANT SELECT ON public.google_classroom_coursework TO authenticated;
GRANT SELECT ON public.coursework_materials TO authenticated;
GRANT SELECT ON public.shared_coursework TO authenticated;
GRANT SELECT ON public.shared_coursework_students TO authenticated;

-- Grant INSERT, UPDATE, DELETE permissions (RLS policies will control actual access)
GRANT INSERT, UPDATE, DELETE ON public.google_integrations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.google_classroom_courses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.class_google_classroom_links TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coursework_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.google_classroom_coursework TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coursework_materials TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shared_coursework TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shared_coursework_students TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Google Classroom Integration';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Tables created: 8';
    RAISE NOTICE '  - google_integrations (OAuth tokens, encrypted by Node.js)';
    RAISE NOTICE '  - google_classroom_courses (synced courses)';
    RAISE NOTICE '  - class_google_classroom_links (class associations)';
    RAISE NOTICE '  - coursework_categories (teacher-defined organization)';
    RAISE NOTICE '  - google_classroom_coursework (assignments/travaux)';
    RAISE NOTICE '  - coursework_materials (files, links, videos)';
    RAISE NOTICE '  - shared_coursework (coursework shared with classes)';
    RAISE NOTICE '  - shared_coursework_students (per-student restrictions)';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies: 28 total (covering all CRUD operations)';
    RAISE NOTICE 'Indexes: 20 performance indexes';
    RAISE NOTICE 'Triggers: 5 updated_at triggers';
    RAISE NOTICE 'Functions: 1 (initialize_default_categories)';
    RAISE NOTICE 'Views: 1 (student_coursework_view)';
    RAISE NOTICE '';
    RAISE NOTICE 'ENCRYPTION: Handled server-side by Node.js (AES-256-GCM)';
    RAISE NOTICE 'See: src/lib/server/google/encryption.ts';
    RAISE NOTICE 'Encryption key must be set in .env.local:';
    RAISE NOTICE '  GOOGLE_TOKEN_ENCRYPTION_KEY="<base64 key>"';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Generate encryption key: node -e "console.log(require(''crypto'').randomBytes(32).toString(''base64''))"';
    RAISE NOTICE '  2. Add to .env.local: GOOGLE_TOKEN_ENCRYPTION_KEY="<key>"';
    RAISE NOTICE '  3. Run: pnpm db:types (to regenerate TypeScript types)';
    RAISE NOTICE '  4. Configure Google Cloud OAuth credentials';
    RAISE NOTICE '===============================================';
END $$;

-- ============================================================================
-- DEFERRED RLS POLICIES (require shared_coursework to exist first)
-- ============================================================================

-- RLS Policy: Students can view visible coursework for their classes
CREATE POLICY "Students can view visible shared coursework for their classes"
ON public.shared_coursework
FOR SELECT
TO authenticated
USING (
    visible = true
    AND EXISTS (
        SELECT 1 FROM public.class_members
        WHERE class_members.class_id = shared_coursework.class_id
        AND class_members.student_id = auth.uid()
    )
    -- Check if student is NOT restricted (no entry in shared_coursework_students OR student IS in list)
    AND (
        NOT EXISTS (SELECT 1 FROM public.shared_coursework_students WHERE shared_coursework_id = shared_coursework.id)
        OR EXISTS (
            SELECT 1 FROM public.shared_coursework_students scs
            WHERE scs.shared_coursework_id = shared_coursework.id
            AND scs.student_id = auth.uid()
        )
    )
);


-- RLS Policy: Students can view coursework shared with their classes
CREATE POLICY "Students can view coursework shared with their classes"
ON public.google_classroom_coursework
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.shared_coursework sc
        JOIN public.class_members cm ON cm.class_id = sc.class_id
        WHERE sc.coursework_id = google_classroom_coursework.id
        AND cm.student_id = auth.uid()
        AND sc.visible = true
    )
);

-- RLS Policy: Students can view materials for shared coursework
CREATE POLICY "Students can view materials for shared coursework"
ON public.coursework_materials
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.shared_coursework sc
        JOIN public.class_members cm ON cm.class_id = sc.class_id
        WHERE sc.coursework_id = coursework_materials.coursework_id
        AND cm.student_id = auth.uid()
        AND sc.visible = true
        -- Check if student is NOT restricted (no entry in shared_coursework_students OR student IS in list)
        AND (
            NOT EXISTS (SELECT 1 FROM public.shared_coursework_students WHERE shared_coursework_id = sc.id)
            OR EXISTS (
                SELECT 1 FROM public.shared_coursework_students scs
                WHERE scs.shared_coursework_id = sc.id
                AND scs.student_id = auth.uid()
            )
        )
    )
);
