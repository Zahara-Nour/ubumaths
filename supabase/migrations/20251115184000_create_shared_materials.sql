-- Migration: Create Shared Materials Table with Strategic Denormalization
-- Purpose: Track which CourseWorkMaterials are shared with UbuMaths classes
-- Date: 2025-11-15
-- Related: Part of Topics & CourseWorkMaterials feature (Phase 1)
-- Pattern: Follows same denormalization strategy as shared_coursework

-- ============================================================================
-- TABLE: shared_materials
-- Purpose: Track materials shared with UbuMaths classes
-- Note: Uses denormalized course_name and teacher_name to avoid RLS circular dependency
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shared_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.google_classroom_materials(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.coursework_categories(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.google_classroom_topics(id) ON DELETE SET NULL,
    shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    description_override TEXT, -- Teacher's custom description (overrides material.description)
    visible BOOLEAN NOT NULL DEFAULT true, -- Toggle visibility for students
    -- DENORMALIZED FIELDS (to avoid RLS circular dependency)
    course_name TEXT,
    teacher_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_material_class UNIQUE(material_id, class_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.shared_materials IS 'Tracks Google Classroom materials shared with UbuMaths classes (with denormalized names)';
COMMENT ON COLUMN public.shared_materials.material_id IS 'The material being shared';
COMMENT ON COLUMN public.shared_materials.class_id IS 'The UbuMaths class receiving the material';
COMMENT ON COLUMN public.shared_materials.category_id IS 'Optional category for organization (NULL = uncategorized)';
COMMENT ON COLUMN public.shared_materials.topic_id IS 'Optional Google Classroom topic for organization';
COMMENT ON COLUMN public.shared_materials.shared_by IS 'Teacher who shared the material';
COMMENT ON COLUMN public.shared_materials.description_override IS 'Custom description that overrides original material description';
COMMENT ON COLUMN public.shared_materials.visible IS 'Whether students can currently see this material';
COMMENT ON COLUMN public.shared_materials.course_name IS 'Denormalized course name from google_classroom_courses (eliminates RLS circular dependency)';
COMMENT ON COLUMN public.shared_materials.teacher_name IS 'Denormalized teacher name from profiles (eliminates extra JOIN)';

-- Indexes
CREATE INDEX idx_shared_materials_material ON public.shared_materials(material_id);
CREATE INDEX idx_shared_materials_class ON public.shared_materials(class_id);
CREATE INDEX idx_shared_materials_category ON public.shared_materials(category_id);
CREATE INDEX idx_shared_materials_topic ON public.shared_materials(topic_id);
CREATE INDEX idx_shared_materials_visible ON public.shared_materials(class_id, visible)
WHERE visible = true;
CREATE INDEX idx_shared_materials_course_name ON public.shared_materials(course_name)
WHERE course_name IS NOT NULL;

-- ============================================================================
-- TRIGGERS FOR DENORMALIZATION
-- ============================================================================

-- Trigger function to auto-populate course_name and teacher_name on INSERT
CREATE OR REPLACE FUNCTION public.populate_shared_material_names()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS to fetch names
SET search_path = public
AS $$
DECLARE
    v_course_name TEXT;
    v_teacher_name TEXT;
BEGIN
    -- Fetch course name through the relationship
    SELECT gcc.name INTO v_course_name
    FROM public.google_classroom_materials gcm
    JOIN public.google_classroom_courses gcc ON gcc.id = gcm.google_course_id
    WHERE gcm.id = NEW.material_id;

    -- Fetch teacher name
    SELECT CONCAT(firstname, ' ', lastname) INTO v_teacher_name
    FROM public.profiles
    WHERE id = NEW.shared_by;

    -- Set the denormalized values
    NEW.course_name := COALESCE(v_course_name, 'Unknown Course');
    NEW.teacher_name := COALESCE(v_teacher_name, 'Unknown Teacher');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_populate_shared_material_names ON public.shared_materials;
CREATE TRIGGER trigger_populate_shared_material_names
    BEFORE INSERT ON public.shared_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.populate_shared_material_names();

-- Trigger to update course_name when course name changes
CREATE OR REPLACE FUNCTION public.update_shared_material_course_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only update if the name actually changed
    IF NEW.name IS DISTINCT FROM OLD.name THEN
        -- Update all shared materials that reference this course
        UPDATE public.shared_materials sm
        SET course_name = NEW.name,
            updated_at = NOW()
        FROM public.google_classroom_materials gcm
        WHERE sm.material_id = gcm.id
        AND gcm.google_course_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_shared_material_course_name ON public.google_classroom_courses;
CREATE TRIGGER trigger_update_shared_material_course_name
    AFTER UPDATE ON public.google_classroom_courses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_shared_material_course_name();

-- Trigger to update teacher_name when profile name changes
CREATE OR REPLACE FUNCTION public.update_shared_material_teacher_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only update if the name actually changed
    IF (NEW.firstname IS DISTINCT FROM OLD.firstname) OR (NEW.lastname IS DISTINCT FROM OLD.lastname) THEN
        -- Update all shared materials created by this teacher
        UPDATE public.shared_materials
        SET teacher_name = CONCAT(NEW.firstname, ' ', NEW.lastname),
            updated_at = NOW()
        WHERE shared_by = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_shared_material_teacher_name ON public.profiles;
CREATE TRIGGER trigger_update_shared_material_teacher_name
    AFTER UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_shared_material_teacher_name();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_shared_materials_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_shared_materials_updated_at ON public.shared_materials;
CREATE TRIGGER trigger_update_shared_materials_updated_at
    BEFORE UPDATE ON public.shared_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_shared_materials_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.shared_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can view shared materials they created
CREATE POLICY "Teachers can view shared materials they created"
ON public.shared_materials
FOR SELECT
TO authenticated
USING (shared_by = auth.uid());

-- RLS Policy: Teachers can insert shared materials for their classes
CREATE POLICY "Teachers can insert shared materials"
ON public.shared_materials
FOR INSERT
TO authenticated
WITH CHECK (
    shared_by = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = shared_materials.class_id
        AND classes.teacher_id = auth.uid()
    )
);

-- RLS Policy: Teachers can update their shared materials
CREATE POLICY "Teachers can update their shared materials"
ON public.shared_materials
FOR UPDATE
TO authenticated
USING (shared_by = auth.uid())
WITH CHECK (shared_by = auth.uid());

-- RLS Policy: Teachers can delete their shared materials
CREATE POLICY "Teachers can delete their shared materials"
ON public.shared_materials
FOR DELETE
TO authenticated
USING (shared_by = auth.uid());

-- RLS Policy: Students can view visible shared materials in their classes
CREATE POLICY "Students can view visible shared materials in their classes"
ON public.shared_materials
FOR SELECT
TO authenticated
USING (
    visible = true
    AND EXISTS (
        SELECT 1 FROM public.class_members cm
        WHERE cm.class_id = shared_materials.class_id
        AND cm.student_id = auth.uid()
        AND cm.is_test = false
    )
);

-- RLS Policy: Admins can view all shared materials
CREATE POLICY "Admins can view all shared materials"
ON public.shared_materials
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- RLS Policy: Students can view shared materials through materials table
-- This allows students to fetch material details when they have access via shared_materials
CREATE POLICY "Students can view materials shared with their classes"
ON public.google_classroom_materials
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.shared_materials sm
        JOIN public.class_members cm ON cm.class_id = sm.class_id
        WHERE sm.material_id = google_classroom_materials.id
        AND cm.student_id = auth.uid()
        AND cm.is_test = false
        AND sm.visible = true
    )
);

-- RLS Policy: Students can view attachments for shared materials
CREATE POLICY "Students can view attachments for shared materials"
ON public.google_classroom_material_attachments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.shared_materials sm
        JOIN public.class_members cm ON cm.class_id = sm.class_id
        WHERE sm.material_id = google_classroom_material_attachments.google_material_id
        AND cm.student_id = auth.uid()
        AND cm.is_test = false
        AND sm.visible = true
    )
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_materials TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Shared Materials';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Tables created: 1';
    RAISE NOTICE '  - shared_materials (materials shared with classes)';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies: 8 total';
    RAISE NOTICE '  - 4 for shared_materials table (teachers + students + admins)';
    RAISE NOTICE '  - 2 cross-table policies (materials + attachments access for students)';
    RAISE NOTICE '';
    RAISE NOTICE 'Indexes: 6 (material, class, category, topic, visible, course_name)';
    RAISE NOTICE 'Triggers: 4';
    RAISE NOTICE '  - populate_shared_material_names (auto-fill denormalized fields)';
    RAISE NOTICE '  - update_shared_material_course_name (sync course name changes)';
    RAISE NOTICE '  - update_shared_material_teacher_name (sync teacher name changes)';
    RAISE NOTICE '  - update_shared_materials_updated_at (auto-update timestamp)';
    RAISE NOTICE '';
    RAISE NOTICE 'DENORMALIZATION: course_name and teacher_name fields';
    RAISE NOTICE '  - Automatically maintained by triggers';
    RAISE NOTICE '  - Eliminates RLS circular dependency';
    RAISE NOTICE '  - Follows same pattern as shared_coursework';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Add topic_id to google_classroom_coursework';
    RAISE NOTICE '===============================================';
END $$;
