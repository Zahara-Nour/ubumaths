-- Fix RLS for google_classroom_courses table
-- Problem: RLS was enabled but NO policies exist, blocking all access
-- Solution: Add policies for teachers and students to view courses

-- ============================================================================
-- RLS Policies for google_classroom_courses
-- ============================================================================

-- Policy: Teachers can view their own courses
CREATE POLICY "Teachers can view their own courses"
ON public.google_classroom_courses
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- Policy: Teachers can manage (insert/update/delete) their own courses
CREATE POLICY "Teachers can manage their own courses"
ON public.google_classroom_courses
FOR ALL
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Policy: Students can view courses that have coursework shared with their classes
-- This is needed for the student devoirs view to display course names
CREATE POLICY "Students can view courses from shared coursework"
ON public.google_classroom_courses
FOR SELECT
TO authenticated
USING (
    -- User is a student
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'student'
    )
    AND
    -- The course has coursework shared with one of the student's classes
    EXISTS (
        SELECT 1
        FROM public.google_classroom_coursework gcw
        JOIN public.shared_coursework sc ON sc.coursework_id = gcw.id
        JOIN public.class_members cm ON cm.class_id = sc.class_id
        WHERE gcw.google_course_id = google_classroom_courses.id
        AND cm.student_id = auth.uid()
        AND sc.visible = true
    )
);

-- Policy: Admins can view all courses
CREATE POLICY "Admins can view all courses"
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

-- Policy: Admins can manage all courses
CREATE POLICY "Admins can manage all courses"
ON public.google_classroom_courses
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Add comment
COMMENT ON POLICY "Teachers can view their own courses" ON public.google_classroom_courses IS
    'Teachers can view courses they own';
COMMENT ON POLICY "Teachers can manage their own courses" ON public.google_classroom_courses IS
    'Teachers can insert/update/delete their own courses';
COMMENT ON POLICY "Students can view courses from shared coursework" ON public.google_classroom_courses IS
    'Students can view courses that have coursework shared with their classes';
COMMENT ON POLICY "Admins can view all courses" ON public.google_classroom_courses IS
    'Admins can view all courses for debugging and support';
COMMENT ON POLICY "Admins can manage all courses" ON public.google_classroom_courses IS
    'Admins can manage all courses for debugging and support';
