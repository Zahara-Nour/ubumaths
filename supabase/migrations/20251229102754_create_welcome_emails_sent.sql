-- Migration: Create Welcome Emails Sent Table
-- Created: 2025-12-29
-- Purpose: Track welcome emails sent to students by teachers
-- Note: Uses is_admin() and is_teacher_or_admin() helper functions from migrations 012 and 016

-- Create welcome_emails_sent table
CREATE TABLE IF NOT EXISTS public.welcome_emails_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up emails sent to a student (with sent_at for chronological order)
CREATE INDEX idx_welcome_emails_sent_student ON public.welcome_emails_sent(student_id, sent_at DESC);

-- Index for looking up emails sent by a teacher (with sent_at for chronological order)
CREATE INDEX idx_welcome_emails_sent_sender ON public.welcome_emails_sent(sent_by, sent_at DESC);

-- Enable RLS
ALTER TABLE public.welcome_emails_sent ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can view emails they have sent (using helper to avoid recursion)
CREATE POLICY "Teachers can view emails they sent"
  ON public.welcome_emails_sent
  FOR SELECT
  USING (auth.uid() = sent_by AND is_teacher_or_admin());

-- Policy: Teachers can insert emails (they must be the sender)
CREATE POLICY "Teachers can insert emails"
  ON public.welcome_emails_sent
  FOR INSERT
  WITH CHECK (auth.uid() = sent_by AND is_teacher_or_admin());

-- Policy: Admins can view all welcome emails
CREATE POLICY "Admins can view all welcome emails"
  ON public.welcome_emails_sent
  FOR SELECT
  USING (is_admin());

-- Policy: Admins can insert welcome emails on behalf of anyone
CREATE POLICY "Admins can insert welcome emails"
  ON public.welcome_emails_sent
  FOR INSERT
  WITH CHECK (is_admin());

-- Add helpful comments
COMMENT ON TABLE public.welcome_emails_sent IS
  'Audit log for welcome emails sent to students. Multiple entries allowed per student (resend supported).';

COMMENT ON COLUMN public.welcome_emails_sent.student_id IS
  'Reference to the student who received the welcome email';

COMMENT ON COLUMN public.welcome_emails_sent.sent_by IS
  'Reference to the teacher or admin who sent the email';

COMMENT ON COLUMN public.welcome_emails_sent.sent_at IS
  'Timestamp when the email was sent';
