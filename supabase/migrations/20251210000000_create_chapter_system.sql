-- Migration: Create Chapter System
-- ============================================================================
-- Purpose: Enable teachers to organize class content into chapters with:
--   - Documents (PDF, images) uploaded to Supabase Storage or Google Drive links
--   - Quiz questions linked to existing question_templates
--   - Checklist items for student self-assessment
--   - Exercises linked from existing exercises table
--
-- Date: 2025-12-10
--
-- Tables Created:
--   1. class_chapters - Chapter definitions per class
--   2. chapter_documents - Documents (uploads or Google Drive)
--   3. chapter_quiz_questions - Links to question_templates
--   4. chapter_quiz_results - Student quiz answers
--   5. chapter_checklist_items - Checklist items defined by teacher
--   6. student_checklist_progress - Student progress on checklist items
--   7. chapter_exercises - Links to existing exercises
--   8. orphaned_documents - Documents from deleted chapters
--
-- Storage Bucket: chapter-documents
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS (if not already exist)
-- ============================================================================

-- Verify helper functions exist from migration 017
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_teacher_or_admin') THEN
        RAISE EXCEPTION 'Required function is_teacher_or_admin() does not exist. Run migration 017 first.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        RAISE EXCEPTION 'Required function is_admin() does not exist. Run migration 017 first.';
    END IF;
END $$;

-- Helper function: Check if user is teacher of a specific class
CREATE OR REPLACE FUNCTION public.is_class_teacher(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.classes
        WHERE id = p_class_id
        AND teacher_id = auth.uid()
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.is_class_teacher(UUID) IS 'Security definer function to check if current user is teacher of a specific class';
GRANT EXECUTE ON FUNCTION public.is_class_teacher(UUID) TO authenticated;

-- Helper function: Check if user is student enrolled in a specific class
CREATE OR REPLACE FUNCTION public.is_class_student(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.class_members
        WHERE class_id = p_class_id
        AND student_id = auth.uid()
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.is_class_student(UUID) IS 'Security definer function to check if current user is enrolled in a specific class';
GRANT EXECUTE ON FUNCTION public.is_class_student(UUID) TO authenticated;

-- ============================================================================
-- TABLE 1: class_chapters
-- Purpose: Chapter definitions for organizing class content
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.class_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Content
    title TEXT NOT NULL,
    description TEXT,

    -- Display settings
    display_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT false,

    -- Optional metadata
    color TEXT, -- Hex color for UI (e.g., '#3B82F6')
    icon TEXT,  -- Emoji or icon identifier

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_color_format CHECK (color IS NULL OR color ~* '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0)
);

COMMENT ON TABLE public.class_chapters IS 'Chapters for organizing class content (documents, quizzes, exercises)';
COMMENT ON COLUMN public.class_chapters.class_id IS 'Class this chapter belongs to';
COMMENT ON COLUMN public.class_chapters.teacher_id IS 'Denormalized from classes.teacher_id for efficient RLS';
COMMENT ON COLUMN public.class_chapters.title IS 'Chapter title (required, non-empty)';
COMMENT ON COLUMN public.class_chapters.description IS 'Optional chapter description';
COMMENT ON COLUMN public.class_chapters.display_order IS 'Order for displaying chapters (lower = first)';
COMMENT ON COLUMN public.class_chapters.is_visible IS 'Whether students can see this chapter (default: hidden)';
COMMENT ON COLUMN public.class_chapters.color IS 'Hex color code for UI styling (e.g., #3B82F6)';
COMMENT ON COLUMN public.class_chapters.icon IS 'Emoji or icon identifier for visual representation';

-- Indexes
CREATE INDEX idx_class_chapters_class ON public.class_chapters(class_id);
CREATE INDEX idx_class_chapters_teacher ON public.class_chapters(teacher_id);
CREATE INDEX idx_class_chapters_order ON public.class_chapters(class_id, display_order);
CREATE INDEX idx_class_chapters_visible ON public.class_chapters(class_id, is_visible)
    WHERE is_visible = true;

-- Enable RLS
ALTER TABLE public.class_chapters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_chapters
CREATE POLICY "Teachers can manage chapters of their classes"
ON public.class_chapters
FOR ALL
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Students can view visible chapters of their classes"
ON public.class_chapters
FOR SELECT
TO authenticated
USING (
    is_visible = true
    AND is_class_student(class_id)
);

CREATE POLICY "Admins can manage all chapters"
ON public.class_chapters
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_class_chapters_updated_at
    BEFORE UPDATE ON public.class_chapters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 2: chapter_documents
-- Purpose: Documents attached to chapters (uploads or Google Drive links)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chapter_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.class_chapters(id) ON DELETE CASCADE,

    -- Document info
    title TEXT NOT NULL,
    description TEXT,

    -- Source type
    source_type TEXT NOT NULL DEFAULT 'upload', -- 'upload' or 'google_drive'

    -- For uploads (Supabase Storage)
    storage_path TEXT, -- Path in chapter-documents bucket
    file_name TEXT,
    file_size INTEGER, -- Size in bytes
    mime_type TEXT,

    -- For Google Drive
    google_drive_url TEXT,
    google_file_id TEXT,

    -- Display
    display_order INTEGER NOT NULL DEFAULT 0,
    thumbnail_url TEXT, -- Preview thumbnail (optional)

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_source_type CHECK (source_type IN ('upload', 'google_drive')),
    CONSTRAINT valid_upload_fields CHECK (
        (source_type = 'upload' AND storage_path IS NOT NULL AND file_name IS NOT NULL)
        OR (source_type = 'google_drive')
    ),
    CONSTRAINT valid_google_drive_fields CHECK (
        (source_type = 'google_drive' AND google_drive_url IS NOT NULL)
        OR (source_type = 'upload')
    ),
    CONSTRAINT valid_mime_type CHECK (
        mime_type IS NULL
        OR mime_type IN (
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/gif'
        )
    ),
    CONSTRAINT valid_file_size CHECK (
        file_size IS NULL OR (file_size > 0 AND file_size <= 10485760) -- Max 10MB
    ),
    CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0)
);

COMMENT ON TABLE public.chapter_documents IS 'Documents attached to chapters (uploaded files or Google Drive links)';
COMMENT ON COLUMN public.chapter_documents.source_type IS 'Document source: upload (Supabase Storage) or google_drive';
COMMENT ON COLUMN public.chapter_documents.storage_path IS 'Path in chapter-documents storage bucket (for uploads)';
COMMENT ON COLUMN public.chapter_documents.file_size IS 'File size in bytes (max 10MB = 10485760)';
COMMENT ON COLUMN public.chapter_documents.mime_type IS 'Accepted: PDF, PNG, JPG, JPEG, GIF';
COMMENT ON COLUMN public.chapter_documents.google_drive_url IS 'Full Google Drive sharing URL';
COMMENT ON COLUMN public.chapter_documents.google_file_id IS 'Google Drive file ID for API operations';

-- Indexes
CREATE INDEX idx_chapter_documents_chapter ON public.chapter_documents(chapter_id);
CREATE INDEX idx_chapter_documents_order ON public.chapter_documents(chapter_id, display_order);
CREATE INDEX idx_chapter_documents_source ON public.chapter_documents(source_type);

-- Enable RLS
ALTER TABLE public.chapter_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapter_documents
CREATE POLICY "Teachers can manage documents of their chapters"
ON public.chapter_documents
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_documents.chapter_id
        AND ch.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_documents.chapter_id
        AND ch.teacher_id = auth.uid()
    )
);

CREATE POLICY "Students can view documents of visible chapters"
ON public.chapter_documents
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_documents.chapter_id
        AND ch.is_visible = true
        AND is_class_student(ch.class_id)
    )
);

CREATE POLICY "Admins can manage all documents"
ON public.chapter_documents
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_chapter_documents_updated_at
    BEFORE UPDATE ON public.chapter_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 3: orphaned_documents
-- Purpose: Store metadata for documents from deleted chapters (files moved to orphaned-documents/)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orphaned_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Original document info
    original_document_id UUID NOT NULL,
    original_chapter_id UUID NOT NULL,
    original_class_id UUID NOT NULL,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Document metadata
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER,

    -- New location
    orphaned_storage_path TEXT NOT NULL, -- Path in chapter-documents/orphaned-documents/

    -- Audit
    orphaned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    original_created_at TIMESTAMPTZ
);

COMMENT ON TABLE public.orphaned_documents IS 'Metadata for documents orphaned when chapters are deleted (files moved, not deleted)';
COMMENT ON COLUMN public.orphaned_documents.orphaned_storage_path IS 'New path in chapter-documents bucket under orphaned-documents/';

-- Indexes
CREATE INDEX idx_orphaned_documents_teacher ON public.orphaned_documents(teacher_id);
CREATE INDEX idx_orphaned_documents_original_class ON public.orphaned_documents(original_class_id);
CREATE INDEX idx_orphaned_documents_orphaned_at ON public.orphaned_documents(orphaned_at DESC);

-- Enable RLS
ALTER TABLE public.orphaned_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orphaned_documents
CREATE POLICY "Teachers can view their orphaned documents"
ON public.orphaned_documents
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their orphaned documents"
ON public.orphaned_documents
FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "Admins can manage all orphaned documents"
ON public.orphaned_documents
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- TABLE 4: chapter_quiz_questions
-- Purpose: Link question_templates to chapters for quizzes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chapter_quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.class_chapters(id) ON DELETE CASCADE,
    question_template_id UUID NOT NULL REFERENCES public.question_templates(id) ON DELETE CASCADE,

    -- Display settings
    display_order INTEGER NOT NULL DEFAULT 0,
    points_override INTEGER, -- Override default points (optional)

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_question_per_chapter UNIQUE(chapter_id, question_template_id),
    CONSTRAINT valid_points_override CHECK (points_override IS NULL OR points_override > 0)
);

COMMENT ON TABLE public.chapter_quiz_questions IS 'Links question_templates to chapters for quiz functionality';
COMMENT ON COLUMN public.chapter_quiz_questions.question_template_id IS 'Reference to existing question template';
COMMENT ON COLUMN public.chapter_quiz_questions.display_order IS 'Order of questions in the quiz';
COMMENT ON COLUMN public.chapter_quiz_questions.points_override IS 'Optional: override default points for this question in this chapter';

-- Indexes
CREATE INDEX idx_chapter_quiz_questions_chapter ON public.chapter_quiz_questions(chapter_id);
CREATE INDEX idx_chapter_quiz_questions_template ON public.chapter_quiz_questions(question_template_id);
CREATE INDEX idx_chapter_quiz_questions_order ON public.chapter_quiz_questions(chapter_id, display_order);

-- Enable RLS
ALTER TABLE public.chapter_quiz_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapter_quiz_questions
CREATE POLICY "Teachers can manage quiz questions of their chapters"
ON public.chapter_quiz_questions
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_quiz_questions.chapter_id
        AND ch.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_quiz_questions.chapter_id
        AND ch.teacher_id = auth.uid()
    )
);

CREATE POLICY "Students can view quiz questions of visible chapters"
ON public.chapter_quiz_questions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_quiz_questions.chapter_id
        AND ch.is_visible = true
        AND is_class_student(ch.class_id)
    )
);

CREATE POLICY "Admins can manage all quiz questions"
ON public.chapter_quiz_questions
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- TABLE 5: chapter_quiz_results
-- Purpose: Record student quiz answers and scores
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chapter_quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_quiz_question_id UUID NOT NULL REFERENCES public.chapter_quiz_questions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Answer details
    submitted_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,

    -- Timing
    time_spent_seconds INTEGER, -- How long student spent on this question

    -- Metadata
    attempt_number INTEGER NOT NULL DEFAULT 1, -- Support multiple attempts

    -- Audit
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_points_earned CHECK (points_earned >= 0),
    CONSTRAINT valid_time_spent CHECK (time_spent_seconds IS NULL OR time_spent_seconds >= 0),
    CONSTRAINT valid_attempt_number CHECK (attempt_number > 0)
);

COMMENT ON TABLE public.chapter_quiz_results IS 'Student answers and scores for chapter quiz questions';
COMMENT ON COLUMN public.chapter_quiz_results.submitted_answer IS 'Student''s answer (JSON string for complex answers)';
COMMENT ON COLUMN public.chapter_quiz_results.is_correct IS 'Whether the answer was correct';
COMMENT ON COLUMN public.chapter_quiz_results.attempt_number IS 'Attempt number (1 = first attempt, 2 = retry, etc.)';
COMMENT ON COLUMN public.chapter_quiz_results.submitted_at IS 'Timestamp when answer was submitted';

-- Indexes
CREATE INDEX idx_chapter_quiz_results_question ON public.chapter_quiz_results(chapter_quiz_question_id);
CREATE INDEX idx_chapter_quiz_results_student ON public.chapter_quiz_results(student_id);
CREATE INDEX idx_chapter_quiz_results_submitted ON public.chapter_quiz_results(submitted_at DESC);
CREATE INDEX idx_chapter_quiz_results_student_question ON public.chapter_quiz_results(student_id, chapter_quiz_question_id);

-- Enable RLS
ALTER TABLE public.chapter_quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapter_quiz_results
CREATE POLICY "Students can view their own quiz results"
ON public.chapter_quiz_results
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own quiz results"
ON public.chapter_quiz_results
FOR INSERT
TO authenticated
WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.chapter_quiz_questions cqq
        JOIN public.class_chapters ch ON ch.id = cqq.chapter_id
        WHERE cqq.id = chapter_quiz_results.chapter_quiz_question_id
        AND ch.is_visible = true
        AND is_class_student(ch.class_id)
    )
);

CREATE POLICY "Teachers can view quiz results of their students"
ON public.chapter_quiz_results
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.chapter_quiz_questions cqq
        JOIN public.class_chapters ch ON ch.id = cqq.chapter_id
        WHERE cqq.id = chapter_quiz_results.chapter_quiz_question_id
        AND ch.teacher_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all quiz results"
ON public.chapter_quiz_results
FOR SELECT
TO authenticated
USING (is_admin());

-- ============================================================================
-- TABLE 6: chapter_checklist_items
-- Purpose: Checklist items for student self-assessment
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chapter_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.class_chapters(id) ON DELETE CASCADE,

    -- Content
    content TEXT NOT NULL,
    description TEXT, -- Optional detailed description

    -- Display
    display_order INTEGER NOT NULL DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT content_not_empty CHECK (length(trim(content)) > 0)
);

COMMENT ON TABLE public.chapter_checklist_items IS 'Checklist items for student self-assessment within chapters';
COMMENT ON COLUMN public.chapter_checklist_items.content IS 'Short checklist item text (e.g., "Je sais calculer une fraction")';
COMMENT ON COLUMN public.chapter_checklist_items.description IS 'Optional longer description or criteria';

-- Indexes
CREATE INDEX idx_chapter_checklist_items_chapter ON public.chapter_checklist_items(chapter_id);
CREATE INDEX idx_chapter_checklist_items_order ON public.chapter_checklist_items(chapter_id, display_order);

-- Enable RLS
ALTER TABLE public.chapter_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapter_checklist_items
CREATE POLICY "Teachers can manage checklist items of their chapters"
ON public.chapter_checklist_items
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_checklist_items.chapter_id
        AND ch.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_checklist_items.chapter_id
        AND ch.teacher_id = auth.uid()
    )
);

CREATE POLICY "Students can view checklist items of visible chapters"
ON public.chapter_checklist_items
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_checklist_items.chapter_id
        AND ch.is_visible = true
        AND is_class_student(ch.class_id)
    )
);

CREATE POLICY "Admins can manage all checklist items"
ON public.chapter_checklist_items
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_chapter_checklist_items_updated_at
    BEFORE UPDATE ON public.chapter_checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 7: student_checklist_progress
-- Purpose: Track student progress on checklist items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_checklist_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_item_id UUID NOT NULL REFERENCES public.chapter_checklist_items(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Progress
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ, -- Auto-set when is_completed becomes true

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_student_checklist_item UNIQUE(checklist_item_id, student_id)
);

COMMENT ON TABLE public.student_checklist_progress IS 'Tracks which checklist items students have completed';
COMMENT ON COLUMN public.student_checklist_progress.is_completed IS 'Whether student marked this item as completed';
COMMENT ON COLUMN public.student_checklist_progress.completed_at IS 'Auto-filled when is_completed changes to true';

-- Indexes
CREATE INDEX idx_student_checklist_progress_item ON public.student_checklist_progress(checklist_item_id);
CREATE INDEX idx_student_checklist_progress_student ON public.student_checklist_progress(student_id);
CREATE INDEX idx_student_checklist_progress_completed ON public.student_checklist_progress(student_id, is_completed)
    WHERE is_completed = true;

-- Enable RLS
ALTER TABLE public.student_checklist_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_checklist_progress
CREATE POLICY "Students can view their own checklist progress"
ON public.student_checklist_progress
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Students can manage their own checklist progress"
ON public.student_checklist_progress
FOR INSERT
TO authenticated
WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.chapter_checklist_items cci
        JOIN public.class_chapters ch ON ch.id = cci.chapter_id
        WHERE cci.id = student_checklist_progress.checklist_item_id
        AND ch.is_visible = true
        AND is_class_student(ch.class_id)
    )
);

CREATE POLICY "Students can update their own checklist progress"
ON public.student_checklist_progress
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can delete their own checklist progress"
ON public.student_checklist_progress
FOR DELETE
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Teachers can view checklist progress of their students"
ON public.student_checklist_progress
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.chapter_checklist_items cci
        JOIN public.class_chapters ch ON ch.id = cci.chapter_id
        WHERE cci.id = student_checklist_progress.checklist_item_id
        AND ch.teacher_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all checklist progress"
ON public.student_checklist_progress
FOR SELECT
TO authenticated
USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_student_checklist_progress_updated_at
    BEFORE UPDATE ON public.student_checklist_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-set completed_at when is_completed changes
CREATE OR REPLACE FUNCTION public.set_checklist_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set completed_at when is_completed becomes true
    IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
        NEW.completed_at = NOW();
    END IF;

    -- Clear completed_at when is_completed becomes false
    IF NEW.is_completed = false AND OLD.is_completed = true THEN
        NEW.completed_at = NULL;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER set_checklist_completed_at_trigger
    BEFORE UPDATE ON public.student_checklist_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.set_checklist_completed_at();

-- Also handle INSERT
CREATE OR REPLACE FUNCTION public.set_checklist_completed_at_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.is_completed = true AND NEW.completed_at IS NULL THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_checklist_completed_at_insert_trigger
    BEFORE INSERT ON public.student_checklist_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.set_checklist_completed_at_insert();

-- ============================================================================
-- TABLE 8: chapter_exercises
-- Purpose: Link existing exercises to chapters
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chapter_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.class_chapters(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,

    -- Display settings
    display_order INTEGER NOT NULL DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_exercise_per_chapter UNIQUE(chapter_id, exercise_id)
);

COMMENT ON TABLE public.chapter_exercises IS 'Links existing exercises to chapters';
COMMENT ON COLUMN public.chapter_exercises.exercise_id IS 'Reference to existing exercise';
COMMENT ON COLUMN public.chapter_exercises.display_order IS 'Order of exercises within the chapter';

-- Indexes
CREATE INDEX idx_chapter_exercises_chapter ON public.chapter_exercises(chapter_id);
CREATE INDEX idx_chapter_exercises_exercise ON public.chapter_exercises(exercise_id);
CREATE INDEX idx_chapter_exercises_order ON public.chapter_exercises(chapter_id, display_order);

-- Enable RLS
ALTER TABLE public.chapter_exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapter_exercises
CREATE POLICY "Teachers can manage exercises of their chapters"
ON public.chapter_exercises
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_exercises.chapter_id
        AND ch.teacher_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_exercises.chapter_id
        AND ch.teacher_id = auth.uid()
    )
);

CREATE POLICY "Students can view exercises of visible chapters"
ON public.chapter_exercises
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id = chapter_exercises.chapter_id
        AND ch.is_visible = true
        AND is_class_student(ch.class_id)
    )
);

CREATE POLICY "Admins can manage all chapter exercises"
ON public.chapter_exercises
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- TRIGGER: Auto-set teacher_id on chapter insert
-- Purpose: Denormalize teacher_id from classes table for efficient RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_chapter_teacher_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_teacher_id UUID;
BEGIN
    -- Get teacher_id from the class
    SELECT teacher_id INTO v_teacher_id
    FROM public.classes
    WHERE id = NEW.class_id;

    IF v_teacher_id IS NULL THEN
        RAISE EXCEPTION 'Class not found or has no teacher';
    END IF;

    -- Set the teacher_id
    NEW.teacher_id = v_teacher_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER set_chapter_teacher_id_trigger
    BEFORE INSERT ON public.class_chapters
    FOR EACH ROW
    EXECUTE FUNCTION public.set_chapter_teacher_id();

-- ============================================================================
-- TRIGGER: Move documents to orphaned-documents on chapter delete
-- Purpose: Preserve documents when chapters are deleted
-- Note: This creates the orphaned_documents record; the actual file move
--       must be handled by the application (Edge Function or server action)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.orphan_chapter_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only process uploaded documents (not Google Drive links)
    INSERT INTO public.orphaned_documents (
        original_document_id,
        original_chapter_id,
        original_class_id,
        teacher_id,
        title,
        file_name,
        mime_type,
        file_size,
        orphaned_storage_path,
        original_created_at
    )
    SELECT
        cd.id,
        cd.chapter_id,
        ch.class_id,
        ch.teacher_id,
        cd.title,
        cd.file_name,
        cd.mime_type,
        cd.file_size,
        'orphaned-documents/' || ch.teacher_id || '/' || cd.id || '/' || cd.file_name,
        cd.created_at
    FROM public.chapter_documents cd
    JOIN public.class_chapters ch ON ch.id = cd.chapter_id
    WHERE cd.chapter_id = OLD.id
      AND cd.source_type = 'upload'
      AND cd.storage_path IS NOT NULL;

    RETURN OLD;
END;
$$;

CREATE TRIGGER orphan_documents_on_chapter_delete
    BEFORE DELETE ON public.class_chapters
    FOR EACH ROW
    EXECUTE FUNCTION public.orphan_chapter_documents();

-- ============================================================================
-- STORAGE BUCKET: chapter-documents
-- Purpose: Store uploaded chapter documents (PDF, images)
-- ============================================================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chapter-documents',
    'chapter-documents',
    false, -- Private bucket
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies
-- Teachers can upload to their own chapters
CREATE POLICY "Teachers can upload chapter documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'chapter-documents'
    AND (
        -- Path format: chapters/{chapter_id}/{filename}
        -- Must start with 'chapters/' prefix AND verify teacher owns the chapter
        (
            (string_to_array(name, '/'))[1] = 'chapters'
            AND EXISTS (
                SELECT 1 FROM public.class_chapters ch
                WHERE ch.id::text = (string_to_array(name, '/'))[2]
                AND ch.teacher_id = auth.uid()
            )
        )
        OR
        -- Allow orphaned-documents path for admins only
        (
            (string_to_array(name, '/'))[1] = 'orphaned-documents'
            AND is_admin()
        )
    )
);

-- Teachers can read documents from their chapters
CREATE POLICY "Teachers can read chapter documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'chapter-documents'
    AND (
        -- Documents in chapters they own (must start with 'chapters/' prefix)
        (
            (string_to_array(name, '/'))[1] = 'chapters'
            AND EXISTS (
                SELECT 1 FROM public.class_chapters ch
                WHERE ch.id::text = (string_to_array(name, '/'))[2]
                AND ch.teacher_id = auth.uid()
            )
        )
        OR
        -- Their own orphaned documents
        (
            (string_to_array(name, '/'))[1] = 'orphaned-documents'
            AND (string_to_array(name, '/'))[2] = auth.uid()::text
        )
        OR
        -- Admin can read all
        is_admin()
    )
);

-- Students can read documents from visible chapters they're enrolled in
CREATE POLICY "Students can read visible chapter documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'chapter-documents'
    AND (string_to_array(name, '/'))[1] = 'chapters'
    AND EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id::text = (string_to_array(name, '/'))[2]
        AND ch.is_visible = true
        AND is_class_student(ch.class_id)
    )
);

-- Teachers can update/delete documents from their chapters
CREATE POLICY "Teachers can update chapter documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'chapter-documents'
    AND (string_to_array(name, '/'))[1] = 'chapters'
    AND EXISTS (
        SELECT 1 FROM public.class_chapters ch
        WHERE ch.id::text = (string_to_array(name, '/'))[2]
        AND ch.teacher_id = auth.uid()
    )
);

CREATE POLICY "Teachers can delete chapter documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'chapter-documents'
    AND (
        -- Their own chapter documents (must start with 'chapters/' prefix)
        (
            (string_to_array(name, '/'))[1] = 'chapters'
            AND EXISTS (
                SELECT 1 FROM public.class_chapters ch
                WHERE ch.id::text = (string_to_array(name, '/'))[2]
                AND ch.teacher_id = auth.uid()
            )
        )
        OR
        -- Their own orphaned documents
        (
            (string_to_array(name, '/'))[1] = 'orphaned-documents'
            AND (string_to_array(name, '/'))[2] = auth.uid()::text
        )
    )
);

-- Admins can manage all storage
CREATE POLICY "Admins can manage all chapter documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'chapter-documents'
    AND is_admin()
)
WITH CHECK (
    bucket_id = 'chapter-documents'
    AND is_admin()
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Tables
GRANT SELECT ON public.class_chapters TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.class_chapters TO authenticated;

GRANT SELECT ON public.chapter_documents TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chapter_documents TO authenticated;

GRANT SELECT ON public.orphaned_documents TO authenticated;
GRANT DELETE ON public.orphaned_documents TO authenticated;

GRANT SELECT ON public.chapter_quiz_questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chapter_quiz_questions TO authenticated;

GRANT SELECT ON public.chapter_quiz_results TO authenticated;
GRANT INSERT ON public.chapter_quiz_results TO authenticated;

GRANT SELECT ON public.chapter_checklist_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chapter_checklist_items TO authenticated;

GRANT SELECT ON public.student_checklist_progress TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.student_checklist_progress TO authenticated;

GRANT SELECT ON public.chapter_exercises TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chapter_exercises TO authenticated;

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
        'class_chapters',
        'chapter_documents',
        'orphaned_documents',
        'chapter_quiz_questions',
        'chapter_quiz_results',
        'chapter_checklist_items',
        'student_checklist_progress',
        'chapter_exercises'
    );

    -- Count RLS policies on chapter tables
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
        'class_chapters',
        'chapter_documents',
        'orphaned_documents',
        'chapter_quiz_questions',
        'chapter_quiz_results',
        'chapter_checklist_items',
        'student_checklist_progress',
        'chapter_exercises'
    );

    -- Count indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_chapter%'
       OR indexname LIKE 'idx_class_chapters%'
       OR indexname LIKE 'idx_student_checklist%'
       OR indexname LIKE 'idx_orphaned%';

    -- Count triggers
    SELECT COUNT(*) INTO v_trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND (
        event_object_table IN (
            'class_chapters',
            'chapter_documents',
            'student_checklist_progress',
            'chapter_checklist_items'
        )
        OR trigger_name LIKE '%chapter%'
        OR trigger_name LIKE '%checklist%'
    );

    -- Count helper functions
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'is_class_teacher',
        'is_class_student',
        'set_chapter_teacher_id',
        'orphan_chapter_documents',
        'set_checklist_completed_at',
        'set_checklist_completed_at_insert'
    );

    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Chapter System';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Tables created: % / 8', v_table_count;
    RAISE NOTICE '  - class_chapters (chapter definitions)';
    RAISE NOTICE '  - chapter_documents (uploaded files & Drive links)';
    RAISE NOTICE '  - orphaned_documents (preserved on chapter delete)';
    RAISE NOTICE '  - chapter_quiz_questions (links to question_templates)';
    RAISE NOTICE '  - chapter_quiz_results (student quiz answers)';
    RAISE NOTICE '  - chapter_checklist_items (self-assessment items)';
    RAISE NOTICE '  - student_checklist_progress (student progress)';
    RAISE NOTICE '  - chapter_exercises (links to exercises)';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies: %', v_policy_count;
    RAISE NOTICE 'Indexes: %', v_index_count;
    RAISE NOTICE 'Triggers: %', v_trigger_count;
    RAISE NOTICE 'Helper Functions: % / 6', v_function_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Storage Bucket: chapter-documents';
    RAISE NOTICE '  - Max file size: 10MB';
    RAISE NOTICE '  - Allowed types: PDF, PNG, JPG, JPEG, GIF';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run: pnpm db:migrate (to apply this migration)';
    RAISE NOTICE '  2. Run: pnpm db:types (to regenerate TypeScript types)';
    RAISE NOTICE '  3. Update: src/lib/types/database.ts';
    RAISE NOTICE '  4. Update: docs/architecture/database-schema.md';
    RAISE NOTICE '===============================================';

    -- Validate all tables exist
    IF v_table_count < 8 THEN
        RAISE EXCEPTION 'Not all tables were created! Expected 8, got %', v_table_count;
    END IF;

    -- Validate RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'class_chapters'
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS is not enabled on class_chapters table!';
    END IF;
END $$;
