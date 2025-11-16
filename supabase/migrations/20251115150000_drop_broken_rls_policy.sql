-- Drop the broken RLS policy that causes infinite recursion
-- This policy was attempting to allow students to view teacher profiles
-- but created a recursive dependency by referencing profiles.id in the USING clause

DROP POLICY IF EXISTS "Students can view teachers who shared coursework with them" ON public.profiles;

-- Note: Teacher names in student coursework view will show as "Unknown Teacher"
-- until we implement a proper solution (e.g., a materialized view or denormalized data)
