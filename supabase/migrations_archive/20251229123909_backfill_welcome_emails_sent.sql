-- Migration: Backfill welcome_emails_sent for existing students
-- ============================================================
--
-- This migration marks all existing students (who have an email and are
-- members of a class) as having received their welcome email.
--
-- This is needed because the welcome email feature was added after many
-- students were already approved and onboarded manually.
--
-- Going forward, only newly approved students will show the "Send email" button.

INSERT INTO public.welcome_emails_sent (student_id, sent_by, sent_at)
SELECT
    student_id,
    teacher_id,
    NOW()
FROM (
    SELECT DISTINCT ON (cm.student_id)
        cm.student_id,
        c.teacher_id
    FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    JOIN public.profiles p ON p.id = cm.student_id
    WHERE p.email IS NOT NULL
      AND c.teacher_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.welcome_emails_sent wes
        WHERE wes.student_id = cm.student_id
      )
    ORDER BY cm.student_id, cm.joined_at ASC
) AS first_class_per_student;
