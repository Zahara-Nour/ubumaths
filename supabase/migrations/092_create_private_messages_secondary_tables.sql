-- Migration 092: Private Messages System - Secondary Tables
-- Description: Folders, search index, and drafts for the private messaging system

-- =====================================================
-- TABLE: user_folders
-- Description: Custom folders for organizing messages
-- =====================================================
CREATE TABLE IF NOT EXISTS user_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Folder details
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 50),
  color TEXT CHECK (color ~ '^#[0-9A-Fa-f]{6}$'), -- Hex color validation
  icon TEXT, -- Emoji or icon name
  sort_order INT DEFAULT 0,

  -- Denormalized count for performance
  message_count INT DEFAULT 0 CHECK (message_count >= 0),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique folder name per user
  UNIQUE(user_id, name)
);

-- Indexes
CREATE INDEX idx_user_folders_user ON user_folders(user_id, sort_order);

COMMENT ON TABLE user_folders IS 'Custom folders for organizing messages (per user)';
COMMENT ON COLUMN user_folders.message_count IS 'Denormalized count of messages in this folder';
COMMENT ON COLUMN user_folders.color IS 'Hex color code for folder UI (e.g., #FF5733)';

-- Add foreign key to message_inbox now that user_folders exists
ALTER TABLE message_inbox
  ADD CONSTRAINT fk_message_inbox_folder
  FOREIGN KEY (folder_id) REFERENCES user_folders(id) ON DELETE SET NULL;

-- =====================================================
-- TABLE: message_search_index
-- Description: Full-text search index for messages
-- =====================================================
CREATE TABLE IF NOT EXISTS message_search_index (
  message_id UUID PRIMARY KEY REFERENCES private_messages(id) ON DELETE CASCADE,

  -- Denormalized search fields
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,

  -- Full-text search vectors
  subject_tsv TSVECTOR,
  content_tsv TSVECTOR,

  -- Search metadata
  sent_at TIMESTAMPTZ NOT NULL,
  has_attachments BOOLEAN DEFAULT FALSE,
  recipient_count INT DEFAULT 1,

  -- Combined full-text search index
  search_tsv TSVECTOR GENERATED ALWAYS AS (
    setweight(subject_tsv, 'A') || setweight(content_tsv, 'B')
  ) STORED
);

-- Full-text search indexes
CREATE INDEX idx_message_search_tsv ON message_search_index USING GIN(search_tsv);
CREATE INDEX idx_message_search_sender ON message_search_index(sender_name);
CREATE INDEX idx_message_search_sent_at ON message_search_index(sent_at DESC);

COMMENT ON TABLE message_search_index IS 'Full-text search index for private messages';
COMMENT ON COLUMN message_search_index.search_tsv IS 'Combined tsvector for full-text search (subject weighted A, content weighted B)';

-- =====================================================
-- TABLE: message_drafts
-- Description: Draft messages with autosave
-- =====================================================
CREATE TABLE IF NOT EXISTS message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Author
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Draft content
  subject TEXT,
  content JSONB, -- TipTap JSON format
  recipient_ids UUID[] DEFAULT '{}',

  -- Group message data
  is_group_message BOOLEAN DEFAULT FALSE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,

  -- Reply context (if replying to a message)
  replying_to_message_id UUID REFERENCES private_messages(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_autosave_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_message_drafts_author ON message_drafts(author_id, updated_at DESC);
CREATE INDEX idx_message_drafts_replying ON message_drafts(replying_to_message_id) WHERE replying_to_message_id IS NOT NULL;

COMMENT ON TABLE message_drafts IS 'Draft messages with autosave support';
COMMENT ON COLUMN message_drafts.last_autosave_at IS 'Timestamp of last automatic save';

-- =====================================================
-- TABLE: moderation_logs
-- Description: Logs for teacher moderation actions
-- =====================================================
CREATE TABLE IF NOT EXISTS message_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who performed the action
  moderator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- What was moderated
  message_id UUID REFERENCES private_messages(id) ON DELETE SET NULL,

  -- Action details
  action TEXT NOT NULL CHECK (action IN ('view', 'delete', 'restore')),
  reason TEXT,

  -- Context
  student_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Student whose message was moderated
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_moderation_logs_moderator ON message_moderation_logs(moderator_id, created_at DESC);
CREATE INDEX idx_moderation_logs_message ON message_moderation_logs(message_id);
CREATE INDEX idx_moderation_logs_student ON message_moderation_logs(student_id);

COMMENT ON TABLE message_moderation_logs IS 'Audit log for teacher moderation of student messages';

-- =====================================================
-- Enable Row Level Security
-- =====================================================
ALTER TABLE user_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_moderation_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Update trigger for user_folders.updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_folders_updated_at
  BEFORE UPDATE ON user_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_user_folders_updated_at();

-- =====================================================
-- Update trigger for message_drafts.updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_message_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_autosave_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_message_drafts_updated_at
  BEFORE UPDATE ON message_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_message_drafts_updated_at();
