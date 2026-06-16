-- Migration 091: Private Messages System - Core Tables
-- Description: Creates the foundation for a private messaging system separate from chat
-- This allows students to message their teachers (not friends) and teachers to message their students

-- =====================================================
-- TABLE: private_messages
-- Description: Main messages table with threading support
-- =====================================================
CREATE TABLE IF NOT EXISTS private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sender
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,

  -- Content
  subject TEXT NOT NULL CHECK (char_length(subject) >= 1 AND char_length(subject) <= 200),
  content JSONB NOT NULL, -- TipTap JSON format
  plain_text TEXT, -- Extracted for search

  -- Threading
  parent_message_id UUID REFERENCES private_messages(id) ON DELETE SET NULL,
  thread_root_id UUID REFERENCES private_messages(id) ON DELETE SET NULL,

  -- Timestamps
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_by_sender BOOLEAN DEFAULT FALSE,

  -- Group message metadata
  is_group_message BOOLEAN DEFAULT FALSE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  recipient_count INT DEFAULT 1 CHECK (recipient_count > 0)
);

-- Indexes for performance
CREATE INDEX idx_private_messages_sender ON private_messages(sender_id) WHERE deleted_by_sender = FALSE;
CREATE INDEX idx_private_messages_thread_root ON private_messages(thread_root_id) WHERE thread_root_id IS NOT NULL;
CREATE INDEX idx_private_messages_sent_at ON private_messages(sent_at DESC);
CREATE INDEX idx_private_messages_class ON private_messages(class_id) WHERE class_id IS NOT NULL;

COMMENT ON TABLE private_messages IS 'Private messages between students and teachers';
COMMENT ON COLUMN private_messages.subject IS 'Subject line (required, 1-200 chars)';
COMMENT ON COLUMN private_messages.content IS 'Rich text content in TipTap JSON format';
COMMENT ON COLUMN private_messages.thread_root_id IS 'Root message ID for threading (NULL if this is root)';
COMMENT ON COLUMN private_messages.is_group_message IS 'TRUE if sent to entire class, FALSE for individual recipients';

-- =====================================================
-- TABLE: message_inbox
-- Description: Inbox entries for each recipient (one per message per recipient)
-- =====================================================
CREATE TABLE IF NOT EXISTS message_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship
  message_id UUID NOT NULL REFERENCES private_messages(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Read status
  read_at TIMESTAMPTZ,
  is_starred BOOLEAN DEFAULT FALSE,

  -- Organization
  status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'archived', 'trash')),
  folder_id UUID, -- Will be FK to user_folders in next migration

  -- Timestamps
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE,

  -- Ensure one inbox entry per message per recipient
  UNIQUE(message_id, recipient_id)
);

-- Indexes for performance
CREATE INDEX idx_message_inbox_recipient ON message_inbox(recipient_id, status) WHERE deleted = FALSE;
CREATE INDEX idx_message_inbox_unread ON message_inbox(recipient_id, received_at DESC) WHERE read_at IS NULL AND deleted = FALSE;
CREATE INDEX idx_message_inbox_message ON message_inbox(message_id);
CREATE INDEX idx_message_inbox_folder ON message_inbox(folder_id) WHERE folder_id IS NOT NULL;

COMMENT ON TABLE message_inbox IS 'Inbox entries for message recipients - one per message per recipient';
COMMENT ON COLUMN message_inbox.status IS 'Organization status: inbox (default), archived, or trash';
COMMENT ON COLUMN message_inbox.read_at IS 'When the recipient read the message (NULL = unread)';

-- =====================================================
-- TABLE: message_attachments_v2
-- Description: File attachments for private messages (all users can upload)
-- =====================================================
CREATE TABLE IF NOT EXISTS message_attachments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship
  message_id UUID NOT NULL REFERENCES private_messages(id) ON DELETE CASCADE,

  -- File metadata
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 5242880), -- Max 5MB

  -- Storage
  storage_path TEXT NOT NULL,
  public_url TEXT,

  -- Uploader
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure file name is not empty
  CHECK (char_length(file_name) > 0)
);

-- Indexes
CREATE INDEX idx_message_attachments_message ON message_attachments_v2(message_id);
CREATE INDEX idx_message_attachments_uploader ON message_attachments_v2(uploaded_by);

COMMENT ON TABLE message_attachments_v2 IS 'File attachments for private messages (max 5MB per file, max 3 per message)';
COMMENT ON COLUMN message_attachments_v2.file_size IS 'File size in bytes (max 5MB = 5,242,880 bytes)';

-- Trigger to enforce max 3 attachments per message
CREATE OR REPLACE FUNCTION check_max_attachments()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM message_attachments_v2 WHERE message_id = NEW.message_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 attachments per message allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_attachments
  BEFORE INSERT ON message_attachments_v2
  FOR EACH ROW
  EXECUTE FUNCTION check_max_attachments();

-- =====================================================
-- Enable Row Level Security
-- =====================================================
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments_v2 ENABLE ROW LEVEL SECURITY;
