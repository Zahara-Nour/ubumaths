-- =============================================
-- Chat System: Storage Bucket Setup
-- =============================================
-- Migration: 043
-- Description: Create Supabase Storage bucket for chat attachments
--
-- Features:
-- - Create chat-attachments bucket
-- - RLS policies for teachers to upload
-- - RLS policies for participants to view

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- Storage RLS Policies
-- =============================================

-- Allow authenticated teachers to upload files
CREATE POLICY "Teachers can upload chat attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND is_teacher_or_admin()
);

-- Allow all authenticated users to view attachments in their conversations
CREATE POLICY "Users can view chat attachments in their conversations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    -- Allow if user is participant in the conversation
    -- Path format: conversation_id/message_id/filename
    -- Extract conversation_id from path (first folder)
    EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.user_id = auth.uid()
      AND cp.conversation_id = (string_to_array(name, '/'))[1]::uuid
    )
  )
);

-- Allow teachers to delete their own uploaded files
CREATE POLICY "Teachers can delete their own chat attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND is_teacher_or_admin()
  AND owner = auth.uid()
);

-- Allow teachers who own the conversation to delete any attachment
CREATE POLICY "Teachers can delete attachments in their conversations"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND is_teacher_or_admin()
  AND EXISTS (
    SELECT 1
    FROM conversations c
    WHERE c.id = (string_to_array(name, '/'))[1]::uuid
    AND c.created_by = auth.uid()
  )
);

-- =============================================
-- Success Message
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Chat attachments storage bucket created successfully!';
  RAISE NOTICE 'Bucket: chat-attachments (public)';
  RAISE NOTICE 'Upload limit: 1MB (enforced in application)';
  RAISE NOTICE 'Teachers only: Upload restricted via RLS';
END $$;
