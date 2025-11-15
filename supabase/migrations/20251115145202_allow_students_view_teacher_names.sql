-- Allow Students to View Teacher Names for Shared Coursework
-- ===========================================================
--
-- Purpose: Allow students to see the names (firstname, lastname) of teachers
--          who have shared Google Classroom coursework with their classes.
--
-- Security: Students can only see teacher profiles for teachers who have
--           shared coursework with classes the student is a member of.
--
-- Context: Part of Google Classroom integration - Phase 4 (Student View)

-- Create RLS policy for students to view teacher profiles who shared coursework
CREATE POLICY "Students can view teachers who shared coursework with them"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Allow if the profile is a teacher who has shared coursework with the student's classes
  role = 'teacher'
  AND EXISTS (
    SELECT 1
    FROM shared_coursework sc
    JOIN class_members cm ON cm.class_id = sc.class_id
    WHERE sc.shared_by = profiles.id
      AND cm.student_id = auth.uid()
      AND sc.visible = true
  )
);

COMMENT ON POLICY "Students can view teachers who shared coursework with them"
ON public.profiles IS
'Allows students to see firstname and lastname of teachers who have shared visible coursework with their classes. Required for displaying teacher names in student coursework view.';
