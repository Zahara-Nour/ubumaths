-- =============================================
-- Chat System: Message Reports Table
-- =============================================
-- Migration: 041
-- Description: User-reported messages for moderation
--
-- Features:
-- - Students can report inappropriate messages
-- - Teachers review and take action
-- - Track report status and resolution
-- - RLS policies for privacy

-- Create message_reports table
CREATE TABLE message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Report details
  reason TEXT NOT NULL CHECK (reason IN (
    'spam',
    'harassment',
    'inappropriate',
    'other'
  )),
  details TEXT, -- Optional explanation from reporter

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Awaiting review
    'reviewed',   -- Teacher looked at it but took no action
    'dismissed',  -- Report dismissed (not a violation)
    'actioned'    -- Action taken (message deleted, user warned, etc.)
  )),

  -- Review information
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Teacher who reviewed
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT, -- Internal notes from reviewer

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: One report per user per message
  UNIQUE(message_id, reported_by)
);

-- Indexes for performance
CREATE INDEX idx_reports_message ON message_reports(message_id);
CREATE INDEX idx_reports_reporter ON message_reports(reported_by);
CREATE INDEX idx_reports_status ON message_reports(status, created_at DESC);
CREATE INDEX idx_reports_reviewer ON message_reports(reviewed_by) WHERE reviewed_by IS NOT NULL;
CREATE INDEX idx_reports_pending ON message_reports(created_at DESC) WHERE status = 'pending';

-- =============================================
-- Enable Row Level Security
-- =============================================
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON message_reports
  FOR SELECT
  USING (reported_by = auth.uid());

-- Teachers can view all reports
CREATE POLICY "Teachers can view all reports"
  ON message_reports
  FOR SELECT
  USING (is_teacher_or_admin());

-- Users can create reports for messages in their conversations
CREATE POLICY "Users can report messages in their conversations"
  ON message_reports
  FOR INSERT
  WITH CHECK (
    reported_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reports.message_id
      AND cp.user_id = auth.uid()
    )
  );

-- Teachers can update reports (review them)
CREATE POLICY "Teachers can update reports"
  ON message_reports
  FOR UPDATE
  USING (is_teacher_or_admin())
  WITH CHECK (is_teacher_or_admin());

-- Teachers can delete reports (if needed)
CREATE POLICY "Teachers can delete reports"
  ON message_reports
  FOR DELETE
  USING (is_teacher_or_admin());

-- =============================================
-- Helper Function: Get pending reports count
-- =============================================

CREATE OR REPLACE FUNCTION get_pending_reports_count()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Only teachers can check this
  IF NOT is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Permission denied: teachers only';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM message_reports
  WHERE status = 'pending';

  RETURN v_count;
END;
$$;

-- =============================================
-- Helper Function: Get reports for moderation dashboard
-- =============================================

CREATE OR REPLACE FUNCTION get_reports_for_moderation(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  report_id UUID,
  message_id UUID,
  message_content JSONB,
  message_plain_text TEXT,
  message_created_at TIMESTAMPTZ,
  sender_id UUID,
  sender_firstname TEXT,
  sender_lastname TEXT,
  sender_avatar_url TEXT,
  conversation_id UUID,
  conversation_name TEXT,
  reported_by UUID,
  reporter_firstname TEXT,
  reporter_lastname TEXT,
  reason TEXT,
  details TEXT,
  status TEXT,
  reviewed_by UUID,
  reviewer_firstname TEXT,
  reviewer_lastname TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only teachers can access this
  IF NOT is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Permission denied: teachers only';
  END IF;

  RETURN QUERY
  SELECT
    mr.id,
    m.id,
    m.content,
    m.plain_text,
    m.created_at,
    m.sender_id,
    sender.firstname,
    sender.lastname,
    sender.avatar_url,
    c.id,
    c.name,
    mr.reported_by,
    reporter.firstname,
    reporter.lastname,
    mr.reason,
    mr.details,
    mr.status,
    mr.reviewed_by,
    reviewer.firstname,
    reviewer.lastname,
    mr.reviewed_at,
    mr.review_notes,
    mr.created_at
  FROM message_reports mr
  JOIN messages m ON m.id = mr.message_id
  JOIN conversations c ON c.id = m.conversation_id
  LEFT JOIN profiles sender ON sender.id = m.sender_id
  JOIN profiles reporter ON reporter.id = mr.reported_by
  LEFT JOIN profiles reviewer ON reviewer.id = mr.reviewed_by
  WHERE (p_status IS NULL OR mr.status = p_status)
  ORDER BY
    CASE mr.status
      WHEN 'pending' THEN 1
      WHEN 'reviewed' THEN 2
      WHEN 'actioned' THEN 3
      WHEN 'dismissed' THEN 4
    END,
    mr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =============================================
-- Helper Function: Report a message
-- =============================================

CREATE OR REPLACE FUNCTION report_message(
  p_message_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_report_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Validate reason
  IF p_reason NOT IN ('spam', 'harassment', 'inappropriate', 'other') THEN
    RAISE EXCEPTION 'Invalid reason. Must be: spam, harassment, inappropriate, or other';
  END IF;

  -- Check if user is a participant in the conversation
  IF NOT EXISTS (
    SELECT 1
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = p_message_id
    AND cp.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a participant';
  END IF;

  -- Check if user has already reported this message
  IF EXISTS (
    SELECT 1 FROM message_reports
    WHERE message_id = p_message_id
    AND reported_by = v_user_id
  ) THEN
    RAISE EXCEPTION 'You have already reported this message';
  END IF;

  -- Create the report
  INSERT INTO message_reports (
    message_id,
    reported_by,
    reason,
    details,
    status
  ) VALUES (
    p_message_id,
    v_user_id,
    p_reason,
    p_details,
    'pending'
  )
  RETURNING id INTO v_report_id;

  -- Mark message as reported
  UPDATE messages
  SET is_reported = true
  WHERE id = p_message_id;

  RETURN v_report_id;
END;
$$;

-- =============================================
-- Helper Function: Review a report (teacher action)
-- =============================================

CREATE OR REPLACE FUNCTION review_report(
  p_report_id UUID,
  p_new_status TEXT,
  p_review_notes TEXT DEFAULT NULL,
  p_delete_message BOOLEAN DEFAULT false
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Only teachers can review reports
  IF NOT is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Permission denied: teachers only';
  END IF;

  -- Validate status
  IF p_new_status NOT IN ('reviewed', 'dismissed', 'actioned') THEN
    RAISE EXCEPTION 'Invalid status. Must be: reviewed, dismissed, or actioned';
  END IF;

  -- Get message_id
  SELECT message_id INTO v_message_id
  FROM message_reports
  WHERE id = p_report_id;

  -- Update report
  UPDATE message_reports
  SET
    status = p_new_status,
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    review_notes = p_review_notes
  WHERE id = p_report_id;

  -- If delete_message flag is set, soft delete the message
  IF p_delete_message THEN
    UPDATE messages
    SET deleted_at = NOW()
    WHERE id = v_message_id;
  END IF;
END;
$$;

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE message_reports IS 'User reports for inappropriate messages';
COMMENT ON COLUMN message_reports.reason IS 'spam, harassment, inappropriate, or other';
COMMENT ON COLUMN message_reports.status IS 'pending, reviewed, dismissed, or actioned';
COMMENT ON FUNCTION get_pending_reports_count IS 'Get count of pending reports for notification badge';
COMMENT ON FUNCTION get_reports_for_moderation IS 'Get reports for teacher moderation dashboard';
COMMENT ON FUNCTION report_message IS 'Report a message as inappropriate';
COMMENT ON FUNCTION review_report IS 'Teacher reviews and updates report status';
