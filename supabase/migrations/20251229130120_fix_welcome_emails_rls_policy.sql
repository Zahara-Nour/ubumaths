-- Migration: Fix welcome_emails_sent RLS policy for teachers
-- ============================================================
--
-- Problem: Teachers could only see emails THEY sent, not emails sent
-- to their students by other teachers or via backfill migration.
--
-- Solution: Allow teachers to view emails sent to students they teach.

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Teachers can view emails they sent" ON public.welcome_emails_sent;

-- Create new policy: Teachers can view emails sent to their students
-- Uses EXISTS subquery to check if teacher teaches the student
CREATE POLICY "Teachers can view emails for their students"
  ON public.welcome_emails_sent
  FOR SELECT
  USING (
    is_teacher_or_admin() AND (
      -- Teacher sent the email themselves
      auth.uid() = sent_by
      OR
      -- Or teacher teaches the student (via class_members -> classes)
      EXISTS (
        SELECT 1 FROM public.class_members cm
        JOIN public.classes c ON c.id = cm.class_id
        WHERE cm.student_id = welcome_emails_sent.student_id
          AND c.teacher_id = auth.uid()
      )
    )
  );
