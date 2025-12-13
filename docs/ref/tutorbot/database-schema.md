# Database Schema - Chat & Tutor System

> Technical reference for all database tables, relationships, and RLS policies in the chat and tutor system.

---

## Overview

The chat and tutor system uses multiple interconnected tables:

| Table Group     | Purpose                           |
| --------------- | --------------------------------- |
| **Peer Chat**   | Real-time messaging between users |
| **AI Tutor**    | Student-AI conversation sessions  |
| **RAG**         | Document retrieval for AI context |
| **Rate Limits** | API abuse prevention              |

---

## Entity Relationship Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                          CHAT & TUTOR DATABASE SCHEMA                          │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│                         ┌─────────────────┐                                   │
│                         │    profiles     │                                   │
│                         │    (users)      │                                   │
│                         └────────┬────────┘                                   │
│                                  │                                            │
│          ┌───────────────────────┼───────────────────────┐                   │
│          │                       │                       │                   │
│          ▼                       ▼                       ▼                   │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────────┐        │
│  │ conversations │      │    classes    │      │ tutor_conversations│        │
│  │               │      │               │      │                   │        │
│  │ - is_group    │◄─────┤ - tutor_config│      │ - student_id      │        │
│  │ - class_id    │      │               │      │ - class_id        │        │
│  │ - created_by  │      └───────┬───────┘      │ - exercise_id     │        │
│  └───────┬───────┘              │              │ - message_count   │        │
│          │                      │              │ - max_help_level  │        │
│          │                      │              └─────────┬─────────┘        │
│          │                      │                        │                   │
│          ▼                      │                        ▼                   │
│  ┌───────────────────┐         │              ┌─────────────────────┐       │
│  │ conversation_     │         │              │   tutor_messages    │       │
│  │ participants      │         │              │                     │       │
│  │                   │         │              │ - role (user/asst)  │       │
│  │ - user_id         │         │              │ - help_method_used  │       │
│  │ - last_read_at    │         │              │ - help_level        │       │
│  │ - is_muted        │         │              │ - cheat_detected    │       │
│  └───────────────────┘         │              └─────────────────────┘       │
│          │                     │                                             │
│          │                     │              ┌─────────────────────┐        │
│          ▼                     │              │   rag_documents     │        │
│  ┌───────────────┐             │              │                     │        │
│  │   messages    │             │              │ - source_type       │        │
│  │               │             │              │ - grade_levels[]    │        │
│  │ - content     │             │              │ - topics[]          │        │
│  │ - plain_text  │             │              │ - enabled_for_rag   │        │
│  │ - is_flagged  │             │              └──────────┬──────────┘        │
│  └───────┬───────┘             │                         │                   │
│          │                     │                         ▼                   │
│          │                     │              ┌─────────────────────┐        │
│          ├─────────────────────┤              │    rag_chunks       │        │
│          │                     │              │                     │        │
│          ▼                     │              │ - embedding (1024D) │        │
│  ┌───────────────────┐         │              │ - search_vector     │        │
│  │ message_          │         │              │ - chunk_index       │        │
│  │ attachments       │         │              └─────────────────────┘        │
│  │                   │         │                                             │
│  │ - file_name       │         │              ┌─────────────────────┐        │
│  │ - file_type       │         │              │    rate_limits      │        │
│  │ - storage_path    │         │              │                     │        │
│  └───────────────────┘         │              │ - key               │        │
│          │                     │              │ - count             │        │
│          ├─────────────────────┤              │ - expires_at        │        │
│          ▼                     │              └─────────────────────┘        │
│  ┌───────────────────┐         │                                             │
│  │ message_          │         │              ┌─────────────────────┐        │
│  │ reactions         │         │              │   ai_chat_usage     │        │
│  │                   │         │              │                     │        │
│  │ - emoji           │         │              │ - model             │        │
│  │ - user_id         │         │              │ - tokens_used       │        │
│  └───────────────────┘         │              │ - message_count     │        │
│          │                     │              └─────────────────────┘        │
│          ├─────────────────────┘                                             │
│          ▼                                                                   │
│  ┌───────────────────┐                                                       │
│  │ message_reports   │                                                       │
│  │                   │                                                       │
│  │ - reason          │                                                       │
│  │ - status          │                                                       │
│  │ - reviewed_by     │                                                       │
│  └───────────────────┘                                                       │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Peer Chat Tables

### conversations

Stores both group chats (class rooms) and 1-on-1 chats.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  name TEXT,                    -- For group chats (e.g., "Classe 6ème A - Maths")
  is_group BOOLEAN DEFAULT false,

  -- References
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Denormalized for performance
  last_message_id UUID,
  last_message_preview TEXT,   -- First 100 chars
  last_message_at TIMESTAMPTZ
);
```

**Indexes**:

- `idx_conversations_updated` - Sort by recent activity
- `idx_conversations_class` - Lookup by class
- `idx_conversations_last_message` - Sort by last message time

**RLS Policies**:
| Policy | Operation | Rule |
|--------|-----------|------|
| Teachers can create group chats | INSERT | `is_group = true AND is_teacher_or_admin()` |
| Students can create 1-on-1 chats | INSERT | `is_group = false AND auth.uid() IS NOT NULL` |
| Teachers can update their group chats | UPDATE | `is_group = true AND created_by = auth.uid()` |
| Teachers can delete their group chats | DELETE | `is_group = true AND created_by = auth.uid()` |

---

### conversation_participants

Many-to-many relationship between users and conversations.

```sql
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Participation
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  last_read_message_id UUID,

  -- Preferences
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,

  UNIQUE(conversation_id, user_id)
);
```

**Key Functions**:

- `get_unread_count(conversation_id, user_id)` - Calculate unread messages
- `mark_conversation_read(conversation_id, user_id)` - Update read status
- `create_1on1_chat(user1_id, user2_id)` - Create 1-on-1 conversation
- `validate_1on1_chat_creation(user1_id, user2_id)` - Validate friendship

---

### messages

Chat messages with rich text content (TipTap JSON).

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Content
  content JSONB NOT NULL,      -- TipTap JSON format
  plain_text TEXT,             -- Extracted for search

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,      -- Soft delete

  -- Moderation
  is_flagged BOOLEAN DEFAULT false,
  is_reported BOOLEAN DEFAULT false,
  flag_reason TEXT
);
```

**Indexes**:

- `idx_messages_conversation` - Lookup by conversation
- `idx_messages_content` - GIN index for JSONB search
- `idx_messages_plain_text` - Full-text search (French)
- `idx_messages_flagged` - Filter flagged messages
- `idx_messages_deleted` - Filter deleted messages

**Triggers**:

- `trigger_process_message_content` - Extract plain text, check profanity
- `trigger_update_conversation_last_message` - Update denormalized fields

**Key Functions**:

- `get_messages_paginated(conversation_id, limit, before_id)` - Cursor-based pagination
- `soft_delete_message(message_id)` - Safe deletion

---

### message_attachments

File attachments for messages (teachers only, 1MB limit).

```sql
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,

  -- File metadata
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,     -- MIME type
  file_size INTEGER NOT NULL,  -- Bytes (max 1MB)

  -- Storage
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,

  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (file_size > 0 AND file_size <= 1048576)
);
```

---

### message_reactions

Emoji reactions for messages.

```sql
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, user_id, emoji)
);
```

**Key Functions**:

- `toggle_reaction(message_id, emoji)` - Add or remove reaction
- `get_message_reaction_counts(message_id)` - Aggregated counts

---

### message_reports

User-reported messages for moderation.

```sql
CREATE TABLE message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Report details
  reason TEXT NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'inappropriate', 'other'
  )),
  details TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewed', 'dismissed', 'actioned'
  )),

  -- Review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, reported_by)
);
```

**Key Functions**:

- `report_message(message_id, reason, details)` - Create report
- `review_report(report_id, status, notes, delete_message)` - Teacher action
- `get_reports_for_moderation(status, limit, offset)` - Dashboard query

---

## AI Tutor Tables

### tutor_conversations

Conversation sessions between students and the AI tutor.

```sql
CREATE TABLE tutor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  exercise_id UUID,            -- NULL for free chat

  -- Denormalized exercise context
  exercise_statement TEXT,
  exercise_topic TEXT,

  -- Conversation metadata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  max_help_level_reached INTEGER DEFAULT 0,  -- 0-7
  effort_score INTEGER,        -- 0-100
  topics_covered TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes**:

- `idx_tutor_conversations_student` - Lookup by student
- `idx_tutor_conversations_class` - Lookup by class
- `idx_tutor_conversations_exercise` - Lookup by exercise
- `idx_tutor_conversations_active` - Filter active conversations
- `idx_tutor_conversations_started` - Sort by start time

**RLS Policies**:
| Policy | Operation | Rule |
|--------|-----------|------|
| Students can view own conversations | SELECT | `student_id = auth.uid()` |
| Students can create own conversations | INSERT | `student_id = auth.uid()` |
| Students can update own active conversations | UPDATE | `student_id = auth.uid() AND is_active = true` |
| Teachers can view class conversations | SELECT | Teacher owns the class |
| Admins can view all conversations | SELECT | `role = 'admin'` |

---

### tutor_messages

Individual messages within tutor conversations.

```sql
CREATE TABLE tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  conversation_id UUID NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,

  -- Interaction metadata
  help_method_used TEXT,       -- e.g., 'socratic', 'analogy'
  help_level INTEGER,          -- 0-7
  cheat_detected BOOLEAN DEFAULT false,

  -- Performance metrics
  response_time_ms INTEGER,
  tokens_used INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Triggers**:

- `trg_tutor_message_count` - Auto-increment conversation message_count and max_help_level_reached

---

### classes.tutor_config

Per-class AI tutor configuration (added to existing classes table).

```sql
ALTER TABLE classes
ADD COLUMN tutor_config JSONB DEFAULT '{
  "enabled": true,
  "schedule": {
    "monday": {"start": "07:00", "end": "22:00"},
    "tuesday": {"start": "07:00", "end": "22:00"},
    "wednesday": {"start": "07:00", "end": "22:00"},
    "thursday": {"start": "07:00", "end": "22:00"},
    "friday": {"start": "07:00", "end": "22:00"},
    "saturday": {"start": "09:00", "end": "18:00"},
    "sunday": {"start": "09:00", "end": "18:00"}
  },
  "historyRetentionDays": 30,
  "allowFreeChat": true,
  "maxHelpLevel": 7
}'::jsonb;
```

**Configuration Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Whether tutor is active for this class |
| `schedule` | object | Weekly availability by day |
| `historyRetentionDays` | integer | Days to keep conversation history |
| `allowFreeChat` | boolean | Allow chat without active exercise |
| `maxHelpLevel` | integer | Maximum help level (1-7) |

---

## RAG Tables

### rag_documents

Source documents for RAG retrieval.

```sql
CREATE TABLE rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source tracking
  source_type TEXT NOT NULL CHECK (source_type IN (
    'question_template', 'exercise', 'markdown_doc',
    'google_drive', 'manual_upload'
  )),
  source_id TEXT,              -- Reference to original source

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,  -- SHA-256 for deduplication
  metadata JSONB DEFAULT '{}',

  -- Ownership
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Classification (for filtering)
  grade_levels TEXT[] DEFAULT '{}',  -- e.g., ['6', '5', '4']
  topics TEXT[] DEFAULT '{}',        -- e.g., ['algebra', 'fractions']

  -- Control
  enabled_for_rag BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (source_type, source_id)
);
```

**Indexes**:

- `idx_rag_documents_grade_levels` - GIN index for array search
- `idx_rag_documents_topics` - GIN index for array search
- `idx_rag_documents_content_hash` - Deduplication lookups

---

### rag_chunks

Text chunks with embeddings for hybrid search.

```sql
CREATE TABLE rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,

  -- Search vectors
  embedding vector(1024),      -- multilingual-e5-large
  search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('french', content)) STORED,

  metadata JSONB DEFAULT '{}',

  UNIQUE (document_id, chunk_index)
);
```

**Indexes**:

- `idx_rag_chunks_embedding` - HNSW index for vector similarity (cosine)
- `idx_rag_chunks_search_vector` - GIN index for full-text search

**Key Function**:

```sql
-- Hybrid search using RRF (Reciprocal Rank Fusion)
rag_hybrid_search(
  query_embedding vector(1024),
  query_text TEXT,
  match_count INTEGER DEFAULT 5,
  vector_weight FLOAT DEFAULT 0.7,
  fts_weight FLOAT DEFAULT 0.3,
  filter_grade_levels TEXT[] DEFAULT NULL,
  filter_topics TEXT[] DEFAULT NULL
)
```

---

## Rate Limiting Table

### rate_limits

Database-based rate limiting (replaces Redis).

```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  key TEXT NOT NULL UNIQUE,    -- e.g., "tutor:hour:user-uuid"
  count INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Format**:
| Limit Type | Key Format |
|------------|------------|
| Per Exercise | `tutor:exercise:{userId}:{exerciseId}` |
| Per Hour | `tutor:hour:{userId}` |
| Per Day | `tutor:day:{userId}` |

**RLS Policy**:

```sql
-- No direct access (service role only)
CREATE POLICY "No direct access to rate_limits"
  ON rate_limits
  FOR ALL
  USING (false);
```

**Cleanup Function**:

```sql
CREATE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## Usage Logging Table

### ai_chat_usage

Track AI API usage for auditing and cost monitoring.

```sql
CREATE TABLE ai_chat_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES profiles(id),
  model TEXT,                  -- LLM model used
  message_count INTEGER,       -- Messages in conversation
  tokens_used INTEGER,         -- Total tokens
  response_length INTEGER,     -- Character count

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Automatic Triggers

### Class Chat Room Creation

When a class is created, a group chat room is automatically created:

```sql
CREATE TRIGGER trigger_create_class_chat_room
  AFTER INSERT ON classes
  FOR EACH ROW
  EXECUTE FUNCTION create_class_chat_room();
```

### Student Auto-Join

When a student joins a class, they're automatically added to the class chat:

```sql
CREATE TRIGGER trigger_add_student_to_class_chat
  AFTER INSERT ON class_members
  FOR EACH ROW
  EXECUTE FUNCTION add_student_to_class_chat();
```

### Message Processing

When a message is created/updated, plain text is extracted and profanity is checked:

```sql
CREATE TRIGGER trigger_process_message_content
  BEFORE INSERT OR UPDATE OF content ON messages
  FOR EACH ROW
  EXECUTE FUNCTION process_message_content();
```

### Last Message Update

After a message is inserted, the conversation's denormalized fields are updated:

```sql
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();
```

### Tutor Message Count

When a tutor message is added, conversation statistics are updated:

```sql
CREATE TRIGGER trg_tutor_message_count
  AFTER INSERT ON tutor_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_tutor_message_count();
```

---

## RLS Policy Summary

### Access Control Matrix

| Table                       | Student                 | Teacher           | Admin             |
| --------------------------- | ----------------------- | ----------------- | ----------------- |
| `conversations`             | Own (via participants)  | Own + class       | All               |
| `conversation_participants` | Own + same conversation | Own + class       | All               |
| `messages`                  | Own conversations       | Own + class       | All               |
| `message_attachments`       | Own conversations       | CRUD own          | All               |
| `message_reactions`         | Own conversations       | Own conversations | All               |
| `message_reports`           | Own reports             | All reports       | All               |
| `tutor_conversations`       | Own                     | Class students    | All               |
| `tutor_messages`            | Own conversations       | Class students    | All               |
| `rag_documents`             | System + class teachers | Own + system      | All               |
| `rag_chunks`                | Via documents           | Via documents     | All               |
| `rate_limits`               | None                    | None              | Service role only |

---

## Migration Files

| Migration                                        | Description                          |
| ------------------------------------------------ | ------------------------------------ |
| `036_create_chat_conversations_table.sql`        | Conversations table + triggers       |
| `037_create_conversation_participants_table.sql` | Participants + helper functions      |
| `038_create_messages_table.sql`                  | Messages + profanity checking        |
| `039_create_message_attachments_table.sql`       | File attachments                     |
| `040_create_message_reactions_table.sql`         | Emoji reactions                      |
| `041_create_message_reports_table.sql`           | Message moderation                   |
| `042_add_chat_constraints_and_indexes.sql`       | Additional constraints               |
| `043_create_storage_bucket_for_chat.sql`         | Supabase Storage bucket              |
| `20251030000000_create_rate_limits_table.sql`    | Rate limiting                        |
| `20251126100000_add_tutor_config.sql`            | Class tutor configuration            |
| `20251126100001_create_tutor_tables.sql`         | Tutor conversations/messages         |
| `20251126200001_create_rag_tables.sql`           | RAG documents/chunks + hybrid search |

---

## Performance Considerations

### Index Strategy

1. **B-tree indexes** for equality and range queries
2. **GIN indexes** for JSONB and tsvector (full-text search)
3. **HNSW indexes** for vector similarity search (pgvector)
4. **Partial indexes** for filtered queries (e.g., `WHERE is_active = true`)

### Denormalization

The `conversations` table denormalizes:

- `last_message_preview` - First 100 chars
- `last_message_at` - Timestamp
- `last_message_id` - Reference

This avoids JOINs in conversation list queries.

### Pagination

Use cursor-based pagination with `(created_at, id)` for messages:

```sql
WHERE m.created_at < p_before_timestamp
   OR (m.created_at = p_before_timestamp AND m.id < p_before_id)
ORDER BY m.created_at DESC, m.id DESC
LIMIT p_limit
```

---

## See Also

- [Architecture](./architecture.md) - System architecture
- [Peer Chat](./peer-chat.md) - Real-time chat implementation
- [RAG System](./rag-system.md) - Retrieval-augmented generation
- [Rate Limiting](./rate-limiting-security.md) - Security measures
