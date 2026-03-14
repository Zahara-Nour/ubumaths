-- ============================================================================
-- Migration: Sync student grade from class when added to class_members
-- Date: 2026-03-14
-- ============================================================================
-- When a student is added to a class, copy the class's grade to the student's
-- profile. This is needed for minesweeper reward calculation (cycle detection).
-- Also backfill existing students with NULL grade.
-- ============================================================================

-- PART 1: Update the existing trigger to also sync grade on INSERT
CREATE OR REPLACE FUNCTION public.sync_class_members_to_class_ids()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_class_grade TEXT;
BEGIN
    v_student_id := COALESCE(NEW.student_id, OLD.student_id);

    -- Update the profile's class_ids array based on class_members
    UPDATE profiles
    SET class_ids = (
        SELECT COALESCE(array_agg(class_id), ARRAY[]::uuid[])
        FROM class_members
        WHERE student_id = v_student_id
    )
    WHERE id = v_student_id;

    -- On INSERT: also sync grade from the class to the student profile
    IF TG_OP = 'INSERT' THEN
        SELECT grade INTO v_class_grade
        FROM classes
        WHERE id = NEW.class_id;

        IF v_class_grade IS NOT NULL THEN
            UPDATE profiles
            SET grade = v_class_grade
            WHERE id = v_student_id
              AND (grade IS NULL OR grade != v_class_grade);
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- PART 2: Backfill existing students with NULL grade
UPDATE profiles p
SET grade = c.grade
FROM class_members cm
JOIN classes c ON c.id = cm.class_id
WHERE cm.student_id = p.id
  AND cm.status = 'active'
  AND p.grade IS NULL
  AND c.grade IS NOT NULL;
