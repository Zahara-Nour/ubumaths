-- Drop the broken RLS policy that causes infinite recursion
-- We'll use service role in the API instead to bypass RLS safely

DROP POLICY IF EXISTS "Students can view courses from shared coursework" ON public.google_classroom_courses;

-- Keep the simple policies that don't cause circular dependencies
-- (Teachers, admins policies are fine as they don't reference other RLS-protected tables)
