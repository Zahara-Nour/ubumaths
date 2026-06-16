-- Create notifications system
-- Notifications table stores all notification data with intelligent targeting
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL, -- Rich text HTML
  type TEXT NOT NULL CHECK (type IN ('info', 'alert', 'announcement', 'reminder')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),

  -- Optional action (redirect link)
  action_label TEXT, -- e.g., "Voir le devoir"
  action_url TEXT, -- e.g., "/dashboard/student/devoirs/123"

  -- Targeting
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'role', 'classes', 'users')),
  target_roles TEXT[], -- ['student', 'teacher'] if target_type='role'
  target_class_ids UUID[], -- Class IDs if target_type='classes'
  target_user_ids UUID[], -- User IDs if target_type='users'

  -- Management
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  deleted_at TIMESTAMPTZ, -- Soft delete by creator

  -- System metadata (for automatic notifications)
  is_system BOOLEAN NOT NULL DEFAULT false,
  system_event_type TEXT -- 'assignment_created', 'resource_added', etc.
);

-- Notification reads tracks which users have read which notifications
CREATE TABLE notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_notifications_active ON notifications(created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_created_by ON notifications(created_by)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_notification_reads_user ON notification_reads(user_id, notification_id);

CREATE INDEX idx_notification_reads_notification ON notification_reads(notification_id);

-- Index for targeting queries
CREATE INDEX idx_notifications_target_type ON notifications(target_type)
  WHERE deleted_at IS NULL;

-- Separate index for expiration filtering (without now() in predicate)
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at)
  WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications

-- Users can view notifications that target them
CREATE POLICY "Users can view notifications targeting them"
  ON notifications
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND expires_at > now()
    AND (
      -- All users
      target_type = 'all'
      -- By role
      OR (target_type = 'role' AND (SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = ANY(target_roles))
      -- By class (check if user is member of any target class)
      OR (target_type = 'classes' AND EXISTS (
        SELECT 1 FROM class_members cm
        WHERE cm.student_id = auth.uid()
        AND cm.class_id = ANY(target_class_ids)
      ))
      -- Directly targeted
      OR (target_type = 'users' AND auth.uid() = ANY(target_user_ids))
      -- Creator can always see their notifications
      OR created_by = auth.uid()
    )
  );

-- Teachers can create notifications for their classes or students
CREATE POLICY "Teachers can create notifications for their classes"
  ON notifications
  FOR INSERT
  WITH CHECK (
    (SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'teacher'
    AND (
      -- Can target their own classes
      (target_type = 'classes' AND target_class_ids <@ (
        SELECT array_agg(id) FROM classes WHERE teacher_id = auth.uid()
      ))
      -- Can target their own students
      OR (target_type = 'users' AND target_user_ids <@ (
        SELECT array_agg(DISTINCT cm.student_id)
        FROM class_members cm
        JOIN classes c ON c.id = cm.class_id
        WHERE c.teacher_id = auth.uid()
      ))
    )
  );

-- Admins can create any notification
CREATE POLICY "Admins can create any notification"
  ON notifications
  FOR INSERT
  WITH CHECK (
    (SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Users can delete (soft delete) their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Admins can delete any notification
CREATE POLICY "Admins can delete any notification"
  ON notifications
  FOR UPDATE
  USING ((SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'admin');

-- RLS Policies for notification_reads

-- Users can view their own read status
CREATE POLICY "Users can view their own read status"
  ON notification_reads
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can mark notifications as read
CREATE POLICY "Users can mark notifications as read"
  ON notification_reads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Creators and admins can view read stats for their notifications
CREATE POLICY "Creators can view read stats for their notifications"
  ON notification_reads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_reads.notification_id
      AND (
        n.created_by = auth.uid()
        OR (SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'admin'
      )
    )
  );

-- Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notification_reads TO authenticated;

-- Comments for documentation
COMMENT ON TABLE notifications IS 'Stores all notifications with intelligent targeting system';
COMMENT ON TABLE notification_reads IS 'Tracks which users have read which notifications';
COMMENT ON COLUMN notifications.target_type IS 'How notification is targeted: all users, by role, by classes, or specific users';
COMMENT ON COLUMN notifications.is_system IS 'True if notification was created automatically by the system';
COMMENT ON COLUMN notifications.system_event_type IS 'Type of system event that triggered this notification';
