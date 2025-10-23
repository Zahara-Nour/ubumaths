-- Migration 095: Private Messages System - RLS Policies
-- Description: Row Level Security policies for private messages

-- =====================================================
-- POLICIES: private_messages
-- =====================================================

-- SELECT: Users can view messages they sent or received
CREATE POLICY "Users can view their sent or received messages"
ON private_messages FOR SELECT
USING (
  auth.uid() = sender_id
  OR
  EXISTS (
    SELECT 1 FROM message_inbox
    WHERE message_inbox.message_id = private_messages.id
      AND message_inbox.recipient_id = auth.uid()
      AND message_inbox.deleted = FALSE
  )
);

-- Teachers can view messages for moderation
CREATE POLICY "Teachers can view messages for moderation"
ON private_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
  )
  AND can_moderate_message(auth.uid(), private_messages.id)
);

-- INSERT: Users can send messages (validation in function)
CREATE POLICY "Users can send messages"
ON private_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
);

-- UPDATE: Senders can edit their own messages (soft delete)
CREATE POLICY "Senders can edit their messages"
ON private_messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- =====================================================
-- POLICIES: message_inbox
-- =====================================================

-- SELECT: Users can view their own inbox entries
CREATE POLICY "Users can view their inbox"
ON message_inbox FOR SELECT
USING (auth.uid() = recipient_id);

-- UPDATE: Users can update their own inbox entries (read status, folder, etc)
CREATE POLICY "Users can update their inbox entries"
ON message_inbox FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- INSERT: System creates inbox entries (via send_private_message function)
-- No INSERT policy needed as function uses SECURITY DEFINER

-- DELETE: Users can delete their inbox entries
CREATE POLICY "Users can delete their inbox entries"
ON message_inbox FOR DELETE
USING (auth.uid() = recipient_id);

-- =====================================================
-- POLICIES: message_attachments_v2
-- =====================================================

-- SELECT: Users can view attachments for messages they have access to
CREATE POLICY "Users can view attachments for their messages"
ON message_attachments_v2 FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM private_messages pm
    WHERE pm.id = message_attachments_v2.message_id
      AND (
        pm.sender_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM message_inbox mi
          WHERE mi.message_id = pm.id
            AND mi.recipient_id = auth.uid()
            AND mi.deleted = FALSE
        )
      )
  )
);

-- INSERT: Uploaders can add attachments to their messages
CREATE POLICY "Users can upload attachments to their messages"
ON message_attachments_v2 FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM private_messages
    WHERE private_messages.id = message_attachments_v2.message_id
      AND private_messages.sender_id = auth.uid()
  )
);

-- DELETE: Uploaders can delete their attachments
CREATE POLICY "Users can delete their attachments"
ON message_attachments_v2 FOR DELETE
USING (auth.uid() = uploaded_by);

-- =====================================================
-- POLICIES: user_folders
-- =====================================================

-- SELECT: Users can view their own folders
CREATE POLICY "Users can view their folders"
ON user_folders FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can create folders
CREATE POLICY "Users can create folders"
ON user_folders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own folders
CREATE POLICY "Users can update their folders"
ON user_folders FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own folders
CREATE POLICY "Users can delete their folders"
ON user_folders FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- POLICIES: message_drafts
-- =====================================================

-- SELECT: Users can view their own drafts
CREATE POLICY "Users can view their drafts"
ON message_drafts FOR SELECT
USING (auth.uid() = author_id);

-- INSERT: Users can create drafts
CREATE POLICY "Users can create drafts"
ON message_drafts FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- UPDATE: Users can update their own drafts
CREATE POLICY "Users can update their drafts"
ON message_drafts FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- DELETE: Users can delete their own drafts
CREATE POLICY "Users can delete their drafts"
ON message_drafts FOR DELETE
USING (auth.uid() = author_id);

-- =====================================================
-- POLICIES: message_search_index
-- =====================================================

-- SELECT: Users can search messages they have access to
CREATE POLICY "Users can search their messages"
ON message_search_index FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM private_messages pm
    WHERE pm.id = message_search_index.message_id
      AND (
        pm.sender_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM message_inbox mi
          WHERE mi.message_id = pm.id
            AND mi.recipient_id = auth.uid()
            AND mi.deleted = FALSE
        )
      )
  )
);

-- INSERT/UPDATE/DELETE: Managed by triggers (no user policies needed)

-- =====================================================
-- POLICIES: message_moderation_logs
-- =====================================================

-- SELECT: Teachers can view their own moderation logs
CREATE POLICY "Teachers can view their moderation logs"
ON message_moderation_logs FOR SELECT
USING (
  auth.uid() = moderator_id
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

-- INSERT: Teachers and admins can create moderation logs
CREATE POLICY "Teachers can create moderation logs"
ON message_moderation_logs FOR INSERT
WITH CHECK (
  auth.uid() = moderator_id
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
  )
);

-- No UPDATE or DELETE policies - logs should be immutable

-- =====================================================
-- ADDITIONAL HELPER POLICIES
-- =====================================================

-- Admin override: Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON private_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

-- Admin override: Admins can view all inbox entries
CREATE POLICY "Admins can view all inbox entries"
ON message_inbox FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

COMMENT ON POLICY "Users can view their sent or received messages" ON private_messages IS 'Allow users to view messages they sent or received';
COMMENT ON POLICY "Teachers can view messages for moderation" ON private_messages IS 'Allow teachers to view messages involving their students for moderation';
COMMENT ON POLICY "Users can send messages" ON private_messages IS 'Allow users to send messages (permissions validated by function)';
