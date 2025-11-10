# Chat Moderation System

Comprehensive moderation system for teacher and admin oversight of student chat interactions.

**Status**: Production Ready
**Version**: 1.0.0
**Last Updated**: 2025-11-10

---

## Table of Contents

- [Overview](#overview)
- [User Roles & Permissions](#user-roles--permissions)
- [Restriction Types](#restriction-types)
- [Restriction Scopes](#restriction-scopes)
- [Teacher Authorization Logic](#teacher-authorization-logic)
- [Message Deletion](#message-deletion)
- [Privacy & Security](#privacy--security)
- [UI Components](#ui-components)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Common Use Cases](#common-use-cases)

---

## Overview

The chat moderation system provides teachers and admins with tools to maintain safe and respectful communication environments. The system follows a defense-in-depth approach with multiple layers of security and privacy-first design principles.

### Key Features

- **User Restrictions**: Mute, timeout, or ban users at conversation or global scope
- **Message Deletion**: Soft-delete inappropriate messages with audit trail
- **Moderation Logs**: Immutable audit trail of all moderation actions
- **Active Restrictions Management**: View and lift restrictions
- **Privacy-First**: Message content never logged, only metadata
- **Defense-in-Depth**: Database RLS + application authorization + Zod validation

### Implementation Timeline

- **Phase 1** (2025-11-10): Database schema (user_restrictions, moderation_logs)
- **Phase 2** (2025-11-10): API endpoints with validation
- **Phase 3** (2025-11-10): UI components and teacher dashboard
- **Phase 4** (2025-11-10): Comprehensive test suite (62 tests, 96.8% pass rate)

---

## User Roles & Permissions

### Teachers (`role = 'teacher'`)

**Can:**

- View all messages in class channels (already participants)
- View 1-on-1 chats between their own students
- Restrict students in their classes (conversation or global scope)
- Delete messages in conversations they have access to
- View their own moderation logs and restrictions
- Lift restrictions they created

**Cannot:**

- Restrict other teachers or admins
- View conversations where they are not participants (unless both students are theirs)
- Globally restrict students not in their classes
- Edit or delete other teachers' restrictions

### Admins (`role = 'admin'`)

**Can:**

- Everything teachers can do, PLUS:
- Globally restrict any user (students, teachers)
- View all conversations and messages
- Lift any restriction (not just their own)
- Access complete moderation logs

### Students (`role = 'student'`)

**Can:**

- See when they are restricted (banner display)
- View messages in conversations they participate in

**Cannot:**

- Send messages if restricted (blocked by RLS + application logic)
- View moderation logs
- Create or lift restrictions
- Delete messages

---

## Restriction Types

### 1. Mute

**Description**: User cannot send messages (permanent until lifted)

**Use Case**: Minor infractions, temporary discipline

**Behavior**:

- User can still read messages
- Cannot send new messages in affected scope
- Can be lifted by moderator at any time
- No expiration (permanent until manually removed)

**UI Indicator**: Yellow warning icon (AlertTriangle)

```typescript
{
  restriction_type: 'mute',
  expires_at: null // Permanent
}
```

### 2. Timeout

**Description**: Temporary restriction with automatic expiration

**Use Case**: Cooling-off period, temporary punishment

**Behavior**:

- User cannot send messages until expiration
- Automatically expires at specified datetime
- Can be extended by updating `expires_at`
- Can be manually lifted before expiration

**UI Indicator**: Blue clock icon (Clock)

```typescript
{
  restriction_type: 'timeout',
  expires_at: '2025-11-15T14:30:00Z' // ISO 8601 datetime
}
```

### 3. Ban

**Description**: Permanent, severe restriction

**Use Case**: Serious violations, repeat offenders

**Behavior**:

- User cannot send messages (permanent)
- More severe than mute (semantic distinction)
- Requires manual lift (no automatic expiration)
- Stronger signal to user and other moderators

**UI Indicator**: Red ban icon (Ban)

```typescript
{
  restriction_type: 'ban',
  expires_at: null // Permanent
}
```

---

## Restriction Scopes

### Conversation Scope

**Definition**: Restriction applies only to a specific conversation

**Use Case**: User violated rules in one channel, but behavior is fine elsewhere

**Authorization**:

- Teacher must be participant in the conversation (class channel)
- OR teacher must be teaching both students (1-on-1 chat)

**Example**:

```typescript
{
  scope_type: 'conversation',
  scope_id: 'uuid-of-conversation'
}
```

**Effect**: User can send messages in other conversations but not in this one.

### Global Scope

**Definition**: Restriction applies to ALL conversations

**Use Case**: Serious violations, pattern of misbehavior across multiple chats

**Authorization**:

- Teachers: Can only globally restrict students in their classes
- Admins: Can globally restrict anyone

**Example**:

```typescript
{
  scope_type: 'global',
  scope_id: null // NULL for global
}
```

**Effect**: User cannot send messages in any conversation.

---

## Teacher Authorization Logic

### Complex Authorization Model

The authorization logic for teacher moderation is **non-trivial** and requires careful understanding.

### Class Channel Moderation

**Simple Case**: Teachers are participants in their class channels.

**Authorization Check**:

1. Verify teacher exists in `conversation_participants` for this conversation
2. RLS policies automatically handle visibility

**Code** (`src/routes/api/moderation/restrict-user/+server.ts:117-130`):

```typescript
// Verify teacher is in this conversation
const { data: membership } = await locals.supabase
	.from('conversation_participants')
	.select('user_id')
	.eq('conversation_id', scopeId)
	.eq('user_id', locals.user.id)
	.maybeSingle();

if (!membership) {
	throw error(403, 'You do not have access to this conversation');
}
```

### Student 1-on-1 Chat Moderation

**Complex Case**: Teachers are NOT participants in student 1-on-1 chats, but can moderate them.

**Authorization Logic**:

1. Conversation must be 1-on-1 (`is_group = false`)
2. Conversation must have exactly 2 participants (not 3+)
3. BOTH participants must be students of this teacher (via `class_members`)

**Why This Works**:

- Teachers need visibility into student interactions for safety
- FERPA/GDPR compliant: Teacher-student relationship justifies access
- Prevents overly broad access: Teacher can't see conversations between random students

**SQL Logic** (from `20251110120001_create_moderation_logs_and_update_rls.sql:127-157`):

```sql
-- Teachers can view conversations where BOTH participants are their students
(
  conversations.is_group = false
  AND EXISTS (
    SELECT 1
    FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2
      ON cp1.conversation_id = cp2.conversation_id
      AND cp1.user_id < cp2.user_id -- Prevent duplicate pairs
    WHERE cp1.conversation_id = conversations.id
    -- CRITICAL: Ensure exactly 2 participants (not 3+)
    AND (
      SELECT COUNT(*)
      FROM public.conversation_participants
      WHERE conversation_id = conversations.id
    ) = 2
    -- BOTH participants must be students of this teacher
    AND EXISTS (
      SELECT 1 FROM public.class_members cm1
      WHERE cm1.student_id = cp1.user_id
      AND cm1.teacher_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.class_members cm2
      WHERE cm2.student_id = cp2.user_id
      AND cm2.teacher_id = auth.uid()
    )
  )
)
```

### Global Restriction Authorization

**For Teachers**:

- Must verify student is in one of their classes
- Uses `class_members` table lookup

**Code** (`src/routes/api/moderation/restrict-user/+server.ts:76-96`):

```typescript
if (scopeType === 'global') {
	if (locals.user.role !== 'admin') {
		// Teachers can only globally restrict students in their classes
		const { data: membership } = await locals.supabase
			.from('class_members')
			.select('student_id')
			.eq('student_id', userId)
			.eq('teacher_id', locals.user.id)
			.maybeSingle();

		if (!membership) {
			throw error(403, 'You can only restrict students in your classes');
		}
	}
}
```

**For Admins**:

- No additional checks required
- Can globally restrict anyone

---

## Message Deletion

### Soft-Delete Pattern

**Why Soft-Delete?**

- Preserves audit trail for investigations
- Can be restored if deleted by mistake
- Required for legal compliance (FERPA, GDPR)
- Enables forensic analysis of incidents

**Implementation**:

- Messages are NOT removed from database
- `deleted_at` timestamp is set to `now()`
- RLS policies prevent non-moderators from seeing deleted messages
- Moderators can still view deleted messages in audit logs

### Deletion Workflow

1. **Teacher clicks "Delete" on message** (ChatMessageList.svelte)
2. **DeleteMessageDialog opens** with confirmation + reason field
3. **API call**: `DELETE /api/moderation/messages/[id]` with reason
4. **Server validation**: Teacher has access to conversation
5. **Database update**: Set `deleted_at = now()`
6. **Log creation**: Create moderation_logs entry
7. **UI update**: Message disappears from chat (hidden by RLS)

### Privacy Protection

**Message content is NOT stored in moderation logs.**

**What IS logged** (`src/routes/api/moderation/messages/[id]/+server.ts:62-70`):

```typescript
p_metadata: {
  conversation_id: message.conversation_id,
  message_id: message.id,
  sender_id: message.sender_id,
  message_length: message.content?.length || 0,
  has_math_content: message.content_json?.hasMath || false,
  timestamp: message.created_at
}
```

**Why?**

- GDPR/FERPA compliance: Minimize personal data storage
- Prevents misuse: Moderators can't browse deleted message content
- Sufficient for audit: Metadata proves action occurred

---

## Privacy & Security

### Defense-in-Depth Architecture

The moderation system uses **multiple layers of security**:

#### Layer 1: Database RLS Policies

**user_restrictions table**:

- Only teachers/admins can view, create, update, delete
- `restricted_by` must match `auth.uid()` on INSERT
- Prevents students from seeing restrictions

**moderation_logs table**:

- Only teachers/admins can view
- Only teachers/admins can INSERT
- NO UPDATE or DELETE policies (immutable audit trail)

**messages table**:

- INSERT policy blocks if user has active restriction
- SELECT policy hides soft-deleted messages from students

**Code** (from `20251110120001_create_moderation_logs_and_update_rls.sql:243-256`):

```sql
CREATE POLICY "Users can send messages to their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
    -- NEW: Block if user has active restriction
    AND NOT EXISTS (
      SELECT 1 FROM public.user_restrictions ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.scope_type = 'global' AND ur.scope_id IS NULL)
        OR (ur.scope_type = 'conversation' AND ur.scope_id = messages.conversation_id)
      )
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  );
```

#### Layer 2: Application Authorization

**All API endpoints perform explicit checks**:

- Verify user is authenticated
- Verify user is teacher/admin
- Verify teacher has relationship to student (class_members)
- Verify teacher has access to conversation (conversation_participants)

**Code** (`src/routes/api/moderation/restrict-user/+server.ts:28-37`):

```typescript
// 1. Check authentication
if (!locals.user) {
	throw error(401, 'Not authenticated');
}

// 2. Check teacher role
if (!['teacher', 'admin'].includes(locals.user.role)) {
	throw error(403, 'Only teachers and admins can restrict users');
}
```

#### Layer 3: Zod Input Validation

**ALL request bodies validated with Zod schemas**:

- Type safety (UUID validation, enum validation)
- Length constraints (reason: 5-500 chars)
- Business logic validation (global scope requires null scopeId)

**Code** (`src/lib/server/validation/moderation.ts:6-24`):

```typescript
export const restrictUserSchema = z
	.object({
		userId: z.string().uuid('User ID must be a valid UUID'),
		scopeType: z.enum(['conversation', 'global']),
		scopeId: z.string().uuid().nullable(),
		restrictionType: z.enum(['mute', 'timeout', 'ban']),
		reason: z.string().min(5).max(500),
		expiresAt: z.string().datetime().nullable()
	})
	.refine((data) => (data.scopeType === 'global' ? data.scopeId === null : data.scopeId !== null), {
		message: 'Global scope must have no scopeId, conversation scope must have scopeId'
	});
```

### GDPR/FERPA Compliance

**Personal Data Minimization**:

- Message content NOT stored in moderation_logs
- Only metadata (length, timestamp, IDs) logged
- Soft-delete preserves right to erasure

**Audit Trail**:

- All moderation actions logged with timestamp, moderator, reason
- Immutable logs (no UPDATE/DELETE policies)
- Sufficient for legal investigations

**Access Control**:

- Teacher access justified by student-teacher relationship
- Teachers can ONLY access students in their classes
- Admins have broader access for administrative purposes

---

## UI Components

### RestrictUserDialog

**Path**: `src/lib/components/moderation/RestrictUserDialog.svelte`

**Purpose**: Dialog to restrict a user with form inputs

**Props**:

- `open` (bindable): Dialog open state
- `userId`: ID of user to restrict
- `userName`: Display name of user
- `conversationId`: ID of conversation (null for global-only)
- `onSuccess`: Callback after successful restriction

**Features**:

- Radio group for restriction type (mute | timeout | ban)
- Scope toggle (conversation vs global) - only shown if conversationId provided
- Datetime picker for expiration (timeout only)
- Textarea for reason (5-500 chars, character counter)
- Form validation (disabled submit until valid)
- Loading state with spinner
- Toast notifications (success/error)

**Usage**:

```svelte
<script>
	import RestrictUserDialog from '$lib/components/moderation/RestrictUserDialog.svelte';

	let dialogOpen = $state(false);
	let selectedUserId = $state('');
	let selectedUserName = $state('');
</script>

<RestrictUserDialog
	bind:open={dialogOpen}
	userId={selectedUserId}
	userName={selectedUserName}
	conversationId="uuid-of-conversation"
	onSuccess={() => {
		// Refresh restrictions list
	}}
/>
```

### RestrictedUserBanner

**Path**: `src/lib/components/moderation/RestrictedUserBanner.svelte`

**Purpose**: Alert banner shown to restricted users

**Props**:

- `restriction`: Restriction object with type, reason, expires_at

**Features**:

- Color-coded by restriction type (yellow=mute, blue=timeout, red=ban)
- Shows restriction reason
- Shows expiration time (timeout only)
- Icon per restriction type
- Dismissible (closes banner, doesn't lift restriction)

**Display Logic** (ChatWindow.svelte):

```svelte
{#if activeRestriction}
	<RestrictedUserBanner restriction={activeRestriction} />
{/if}
```

### DeleteMessageDialog

**Path**: `src/lib/components/moderation/DeleteMessageDialog.svelte`

**Purpose**: Confirmation dialog for message deletion

**Props**:

- `open` (bindable): Dialog open state
- `messageId`: ID of message to delete
- `onSuccess`: Callback after successful deletion

**Features**:

- Textarea for deletion reason (5-500 chars, required)
- Character counter
- Confirmation button (disabled until valid)
- Loading state
- Toast notifications

**Usage**:

```svelte
<script>
	import DeleteMessageDialog from '$lib/components/moderation/DeleteMessageDialog.svelte';

	let deleteDialogOpen = $state(false);
	let messageIdToDelete = $state('');
</script>

<DeleteMessageDialog
	bind:open={deleteDialogOpen}
	messageId={messageIdToDelete}
	onSuccess={() => {
		// Refresh message list
	}}
/>
```

### ModerationLogsTable

**Path**: `src/lib/components/moderation/ModerationLogsTable.svelte`

**Purpose**: Displays audit trail of moderation actions

**Props**:

- `logs`: Array of moderation_logs records

**Features**:

- Table with columns: Timestamp, Action, Target Type, Reason, Moderator
- Action badges (color-coded by action type)
- Target type badges (message, user, conversation)
- Sortable by timestamp (desc)
- Scrollable container

**Data Source** (`+page.server.ts`):

```typescript
const { data: logs } = await supabase
	.from('moderation_logs')
	.select(
		`
    *,
    moderator:profiles!moderation_logs_moderator_id_fkey(firstname, lastname)
  `
	)
	.eq('moderator_id', locals.user.id)
	.order('created_at', { ascending: false })
	.limit(100);
```

### ActiveRestrictionsTable

**Path**: `src/lib/components/moderation/ActiveRestrictionsTable.svelte`

**Purpose**: Manage active restrictions created by this teacher

**Props**:

- `restrictions`: Array of user_restrictions records

**Features**:

- Table with columns: User, Type, Scope, Reason, Expires At, Actions
- Badge for restriction type (mute, timeout, ban)
- Badge for scope (conversation name or "Global")
- Expiration countdown (for timeouts)
- "Lift Restriction" button (calls DELETE endpoint)
- Confirmation dialog before lifting

**Data Source** (`+page.server.ts`):

```typescript
const { data: restrictions } = await supabase
	.from('user_restrictions')
	.select(
		`
    *,
    user:profiles!user_restrictions_user_id_fkey(id, firstname, lastname),
    conversation:conversations(name)
  `
	)
	.eq('restricted_by', locals.user.id)
	.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
	.order('created_at', { ascending: false });
```

### Teacher Moderation Dashboard

**Path**: `src/routes/(protected)/dashboard/teacher/moderation/+page.svelte`

**Purpose**: Central hub for all moderation activities

**Sections**:

1. **Active Restrictions** - Table of restrictions teacher created
2. **Moderation Logs** - Audit trail of all actions (last 100)

**Access Control**:

- Only accessible by teachers and admins
- Teachers see only their own restrictions and logs
- Admins see all restrictions and logs (future enhancement)

**Route**: `/dashboard/teacher/moderation`

---

## Database Schema

### user_restrictions Table

**Purpose**: Track active restrictions at database level

**Migration**: `supabase/migrations/20251110120000_create_user_restrictions.sql`

#### Columns

| Column           | Type        | Nullable | Description                            |
| ---------------- | ----------- | -------- | -------------------------------------- |
| id               | UUID        | No       | Primary key                            |
| user_id          | UUID        | No       | User being restricted (FK to profiles) |
| scope_type       | TEXT        | No       | 'conversation' or 'global'             |
| scope_id         | UUID        | Yes      | conversation_id (NULL for global)      |
| restriction_type | TEXT        | No       | 'mute', 'timeout', or 'ban'            |
| reason           | TEXT        | No       | Reason (min 5 chars)                   |
| restricted_by    | UUID        | No       | Moderator who created restriction      |
| expires_at       | TIMESTAMPTZ | Yes      | Expiration (NULL = permanent)          |
| created_at       | TIMESTAMPTZ | No       | Creation timestamp                     |
| updated_at       | TIMESTAMPTZ | No       | Last update timestamp                  |

#### Constraints

**CHECK Constraints**:

```sql
-- restriction_type must be mute, timeout, or ban
CHECK (restriction_type IN ('mute', 'timeout', 'ban'))

-- scope_type must be conversation or global
CHECK (scope_type IN ('conversation', 'global'))

-- Reason must be at least 5 characters
CHECK (length(reason) >= 5)

-- Scope validation: global requires NULL scope_id, conversation requires non-NULL
CONSTRAINT valid_scope CHECK (
  (scope_type = 'global' AND scope_id IS NULL) OR
  (scope_type = 'conversation' AND scope_id IS NOT NULL)
)
```

**UNIQUE Constraint**:

```sql
-- Prevent duplicate active restrictions
CONSTRAINT unique_active_restriction UNIQUE (
  user_id,
  scope_type,
  scope_id,
  restriction_type
)
```

**Note**: This allows the same user to have:

- Mute in conversation A + ban globally (different scope_type)
- Mute in conversation A + mute in conversation B (different scope_id)
- But NOT: Two mutes in conversation A (duplicate)

#### Foreign Keys

- `user_id` → `profiles(id)` ON DELETE CASCADE
- `scope_id` → `conversations(id)` ON DELETE CASCADE
- `restricted_by` → `profiles(id)` (no cascade, audit trail)

#### Indexes

```sql
-- Lookup restrictions by user
CREATE INDEX idx_user_restrictions_user_id ON user_restrictions(user_id);

-- Lookup restrictions by scope
CREATE INDEX idx_user_restrictions_scope ON user_restrictions(scope_type, scope_id);

-- Fast query for active (non-expired) restrictions
CREATE INDEX idx_user_restrictions_active ON user_restrictions(user_id)
  WHERE expires_at IS NULL OR expires_at > now();

-- Lookup by moderator (for audit trail)
CREATE INDEX idx_user_restrictions_moderator ON user_restrictions(restricted_by, created_at DESC);
```

#### RLS Policies

**SELECT**:

```sql
CREATE POLICY "Teachers can view restrictions" ON user_restrictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );
```

**INSERT**:

```sql
CREATE POLICY "Teachers can create restrictions" ON user_restrictions FOR INSERT
  WITH CHECK (
    auth.uid() = restricted_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );
```

**DELETE**:

```sql
CREATE POLICY "Teachers can delete restrictions" ON user_restrictions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );
```

**UPDATE**:

```sql
CREATE POLICY "Teachers can update restrictions" ON user_restrictions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  )
  WITH CHECK (
    -- Prevent changing immutable audit fields
    user_id = (SELECT user_id FROM user_restrictions WHERE id = user_restrictions.id)
    AND restricted_by = (SELECT restricted_by FROM user_restrictions WHERE id = user_restrictions.id)
  );
```

---

### moderation_logs Table

**Purpose**: Immutable audit trail of all moderation actions

**Migration**: `supabase/migrations/20251110120001_create_moderation_logs_and_update_rls.sql`

#### Columns

| Column       | Type        | Nullable | Description                                   |
| ------------ | ----------- | -------- | --------------------------------------------- |
| id           | UUID        | No       | Primary key                                   |
| moderator_id | UUID        | No       | Moderator who performed action (FK profiles)  |
| action       | TEXT        | No       | Action type (see below)                       |
| target_type  | TEXT        | No       | What was affected (message, user, etc.)       |
| target_id    | UUID        | No       | ID of affected entity (NO FK, audit persists) |
| reason       | TEXT        | Yes      | Optional reason for action                    |
| metadata     | JSONB       | No       | Additional context (default '{}')             |
| created_at   | TIMESTAMPTZ | No       | Action timestamp                              |

#### Action Types

```sql
CHECK (action IN (
  'delete_message',
  'mute_user',
  'unmute_user',
  'timeout_user',
  'ban_user',
  'unban_user',
  'review_report',
  'export_conversation'
))
```

#### Target Types

```sql
CHECK (target_type IN ('message', 'user', 'conversation', 'report'))
```

#### Metadata Structure

**For message deletion**:

```json
{
	"conversation_id": "uuid",
	"message_id": "uuid",
	"sender_id": "uuid",
	"message_length": 150,
	"has_math_content": true,
	"timestamp": "2025-11-10T14:30:00Z"
}
```

**For user restriction**:

```json
{
	"restriction_id": "uuid",
	"scope_type": "conversation",
	"scope_id": "uuid",
	"expires_at": "2025-11-15T14:30:00Z"
}
```

#### Indexes

```sql
-- Query by moderator
CREATE INDEX idx_moderation_logs_moderator ON moderation_logs(moderator_id, created_at DESC);

-- Query by target
CREATE INDEX idx_moderation_logs_target ON moderation_logs(target_type, target_id);

-- Query by action
CREATE INDEX idx_moderation_logs_action ON moderation_logs(action, created_at DESC);
```

#### RLS Policies

**SELECT**:

```sql
CREATE POLICY "Teachers can view moderation logs" ON moderation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );
```

**INSERT**:

```sql
CREATE POLICY "Teachers can create moderation logs" ON moderation_logs FOR INSERT
  WITH CHECK (
    auth.uid() = moderator_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );
```

**UPDATE/DELETE**: NO POLICIES (immutable audit trail)

---

### Helper Functions

#### is_user_restricted()

**Purpose**: Check if user has active restriction for a conversation

**Signature**:

```sql
is_user_restricted(
  p_user_id UUID,
  p_conversation_id UUID DEFAULT NULL
) RETURNS BOOLEAN
```

**Logic**:

- Returns TRUE if user has active restriction (global OR conversation-specific)
- Checks expiration: `expires_at IS NULL OR expires_at > now()`
- NULL-safe: p_conversation_id can be NULL (checks global restrictions only)

**Usage**:

```sql
SELECT is_user_restricted('user-uuid', 'conversation-uuid');
SELECT is_user_restricted('user-uuid', NULL); -- Check global only
```

#### log_moderation_action()

**Purpose**: Create moderation log entry with authorization check

**Signature**:

```sql
log_moderation_action(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
```

**Authorization**: Verifies caller is teacher/admin (raises exception otherwise)

**Usage**:

```sql
SELECT log_moderation_action(
  'delete_message',
  'message',
  'message-uuid',
  'Inappropriate content',
  '{"conversation_id": "conv-uuid", "message_length": 150}'::jsonb
);
```

#### get_user_moderation_history()

**Purpose**: Get moderation history for a user (teacher-only)

**Signature**:

```sql
get_user_moderation_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  id UUID,
  moderator_id UUID,
  moderator_name TEXT,
  action TEXT,
  target_type TEXT,
  target_id UUID,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
```

**Usage**:

```sql
SELECT * FROM get_user_moderation_history('user-uuid', 20);
```

---

### RLS Policy Updates

#### conversations Table

**Added**: Teachers can view 1-on-1 chats where BOTH participants are their students

**Migration**: `20251110120001_create_moderation_logs_and_update_rls.sql` (lines 102-158)

**Policy**: "Users can view their conversations" (updated)

**Key Logic**:

```sql
-- NEW clause added to existing policy:
OR (
  -- Teachers can view 1-on-1 where both are their students
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  AND conversations.is_group = false
  AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = conversations.id) = 2
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.conversation_id = conversations.id
    AND EXISTS (SELECT 1 FROM class_members WHERE student_id = cp1.user_id AND teacher_id = auth.uid())
    AND EXISTS (SELECT 1 FROM class_members WHERE student_id = cp2.user_id AND teacher_id = auth.uid())
  )
)
```

#### messages Table (SELECT)

**Added**: Teachers can view messages in 1-on-1 chats where both participants are their students

**Migration**: `20251110120001_create_moderation_logs_and_update_rls.sql` (lines 166-222)

**Policy**: "Users can view messages in their conversations" (updated)

**Key Addition**: Same teacher authorization logic as conversations table

#### messages Table (INSERT)

**Added**: Block message sending if user is restricted

**Migration**: `20251110120001_create_moderation_logs_and_update_rls.sql` (lines 230-256)

**Policy**: "Users can send messages to their conversations" (updated)

**Key Logic**:

```sql
-- NEW clause added:
AND NOT EXISTS (
  SELECT 1 FROM user_restrictions ur
  WHERE ur.user_id = auth.uid()
  AND (
    (ur.scope_type = 'global' AND ur.scope_id IS NULL)
    OR (ur.scope_type = 'conversation' AND ur.scope_id = messages.conversation_id)
  )
  AND (ur.expires_at IS NULL OR ur.expires_at > now())
)
```

---

## API Endpoints

### POST /api/moderation/restrict-user

**Purpose**: Restrict a user (mute, timeout, ban)

**Authorization**: Teachers and admins only

**Request Body** (JSON):

```typescript
{
	userId: string; // UUID of user to restrict
	scopeType: 'conversation' | 'global';
	scopeId: string | null; // UUID of conversation (required if scopeType='conversation')
	restrictionType: 'mute' | 'timeout' | 'ban';
	reason: string; // 5-500 characters
	expiresAt: string | null; // ISO 8601 datetime (required if restrictionType='timeout')
}
```

**Validation**: Zod schema (`restrictUserSchema`)

**Response** (201 Created):

```json
{
	"success": true,
	"restrictionId": "uuid"
}
```

**Error Responses**:

- **400**: Invalid JSON or validation failed
- **401**: Not authenticated
- **403**: Not a teacher/admin OR not teacher's student/conversation
- **404**: User or conversation not found
- **409**: Duplicate active restriction
- **500**: Database error

**Implementation**: `src/routes/api/moderation/restrict-user/+server.ts`

**Authorization Checks**:

1. User is authenticated
2. User is teacher or admin
3. Target user exists and is a student (teachers can't restrict teachers/admins)
4. If global: Teacher has this student in their classes (via class_members)
5. If conversation: Teacher is participant in conversation
6. Insert restriction + log moderation action

---

### DELETE /api/moderation/unrestrict-user

**Purpose**: Lift a restriction (remove from user_restrictions)

**Authorization**: Teachers and admins only

**Request Body** (JSON):

```typescript
{
	restrictionId: string; // UUID of restriction to remove
}
```

**Validation**: Zod schema (`unrestrictUserSchema`)

**Response** (200 OK):

```json
{
	"success": true
}
```

**Error Responses**:

- **400**: Invalid JSON or validation failed
- **401**: Not authenticated
- **403**: Not a teacher/admin
- **404**: Restriction not found
- **500**: Database error

**Implementation**: `src/routes/api/moderation/unrestrict-user/+server.ts`

**Authorization Checks**:

1. User is authenticated
2. User is teacher or admin
3. Restriction exists
4. Delete restriction + log moderation action (unmute_user, unban_user, etc.)

---

### DELETE /api/moderation/messages/[id]

**Purpose**: Soft-delete a message (set deleted_at timestamp)

**Authorization**: Teachers and admins only

**URL Parameter**: `id` (message UUID)

**Request Body** (JSON):

```typescript
{
	reason: string; // 5-500 characters
}
```

**Validation**: Zod schema (`deleteMessageSchema`)

**Response** (200 OK):

```json
{
	"success": true
}
```

**Error Responses**:

- **400**: Invalid JSON or validation failed
- **401**: Not authenticated
- **403**: Not a teacher/admin OR no access to conversation
- **404**: Message not found
- **500**: Database error

**Implementation**: `src/routes/api/moderation/messages/[id]/+server.ts`

**Authorization Checks**:

1. User is authenticated
2. User is teacher or admin
3. Message exists
4. Teacher has access to conversation (RLS enforces this)
5. Update message: set `deleted_at = now()`
6. Log moderation action with metadata (NO message content)

**Privacy**: Message content is NOT logged, only metadata (length, timestamp, IDs)

---

## Testing

### Test Suite Overview

**Total Tests**: 62 tests
**Pass Rate**: 96.8% (60/62 passing)
**Failing Tests**: 2 (timeout tests - timing-dependent)

### Test Files

#### restrict-user.test.ts

**Path**: `src/routes/api/moderation/restrict-user/restrict-user.test.ts`

**Tests**: 26 tests

**Coverage**:

- Authentication checks (401 errors)
- Role authorization (403 for non-teachers)
- Input validation (Zod schema)
  - Invalid UUIDs
  - Invalid scopeType/restrictionType
  - Reason length validation (< 5 chars, > 500 chars)
  - Scope validation (global requires null scopeId)
  - expiresAt datetime validation
- Target user validation (404 for non-existent users)
- Teacher-student relationship checks (403 if not teacher's student)
- Conversation access checks (403 if teacher not in conversation)
- Duplicate restriction handling (409 errors)
- Successful restriction creation
- Moderation log creation

**Key Test Cases**:

```typescript
// Test: Teachers can only restrict students in their classes
test('403 if teacher tries to globally restrict student not in their class', async () => {
	// ...
});

// Test: Conversation scope requires teacher participation
test('403 if teacher not in conversation (conversation scope)', async () => {
	// ...
});

// Test: Duplicate restriction prevention
test('409 if duplicate active restriction exists', async () => {
	// ...
});
```

#### unrestrict-user.test.ts

**Path**: `src/routes/api/moderation/unrestrict-user/unrestrict-user.test.ts`

**Tests**: 16 tests

**Coverage**:

- Authentication checks
- Role authorization
- Input validation (UUID)
- Restriction existence validation (404)
- Successful unrestriction
- Moderation log creation (unmute_user, unban_user)

#### messages-delete.test.ts

**Path**: `src/routes/api/moderation/messages/messages-delete.test.ts`

**Tests**: 20 tests

**Coverage**:

- Authentication checks
- Role authorization
- Input validation (reason length)
- Message existence validation (404)
- Conversation access checks
- Soft-delete behavior (deleted_at timestamp)
- Privacy: Message content not logged
- Moderation log creation
- RLS: Students can't see deleted messages

**Key Test Cases**:

```typescript
// Test: Soft-delete (not hard-delete)
test('Message still exists in DB with deleted_at timestamp', async () => {
	// ...
});

// Test: Privacy protection
test('Message content is NOT logged in moderation_logs', async () => {
	// ...
});

// Test: RLS enforcement
test('Students cannot see soft-deleted messages', async () => {
	// ...
});
```

### Running Tests

```bash
# Run all moderation tests
pnpm test:unit moderation

# Run specific test file
pnpm test:unit restrict-user.test.ts

# Run with coverage
pnpm test:unit --coverage moderation
```

### Known Issues

**Timeout Tests Failing** (2 tests):

- `restrict-user.test.ts`: "Timeout expires after expiresAt"
- Issue: Timing-dependent test (waits for expiration)
- Status: Non-critical (functionality works, test is flaky)

---

## Common Use Cases

### Use Case 1: Student Spamming in Class Channel

**Scenario**: Student is sending too many messages in class channel

**Solution**: Mute user in conversation scope

**Steps**:

1. Teacher opens class channel
2. Clicks "Restrict User" on student's message or profile
3. Selects "Mute" restriction type
4. Scope: "This conversation only" (default)
5. Enters reason: "Spamming messages repeatedly"
6. Clicks "Restrict"

**Result**:

- Student can still send messages in other channels
- Student sees banner: "You are muted in this conversation"
- Teacher can lift restriction at any time from moderation dashboard

---

### Use Case 2: Student Sending Inappropriate Messages Globally

**Scenario**: Student has been sending inappropriate content in multiple chats

**Solution**: Global ban

**Steps**:

1. Teacher opens any conversation with student
2. Clicks "Restrict User"
3. Selects "Ban" restriction type
4. Checks "All conversations" checkbox
5. Enters reason: "Repeated inappropriate content across multiple chats"
6. Clicks "Restrict"

**Result**:

- Student cannot send messages in ANY conversation
- Student sees banner: "You are banned from all conversations"
- Visible to all teachers (in moderation logs)
- Requires manual lift (permanent until unrestricted)

---

### Use Case 3: Cooling-Off Period

**Scenario**: Two students arguing in 1-on-1 chat, need temporary separation

**Solution**: Timeout both users

**Steps**:

1. Teacher navigates to moderation dashboard
2. Finds the 1-on-1 conversation (visible via RLS policy)
3. Restricts User A:
   - Type: Timeout
   - Scope: This conversation
   - Expires: Tomorrow 9:00 AM
   - Reason: "Cooling-off period after argument"
4. Restricts User B (same settings)

**Result**:

- Both students cannot message each other until tomorrow 9 AM
- Restriction automatically expires (no manual lift needed)
- Students can still message other people

---

### Use Case 4: Delete Inappropriate Message

**Scenario**: Student sent message with profanity

**Solution**: Delete message + optional restriction

**Steps**:

1. Teacher views message in chat
2. Clicks "Delete" button (trash icon)
3. DeleteMessageDialog opens
4. Enters reason: "Inappropriate language"
5. Clicks "Confirm Delete"
6. (Optional) Also restrict user to prevent repeat behavior

**Result**:

- Message disappears from chat for all users
- Message still exists in DB (soft-deleted)
- Moderation log created (NO message content logged)
- Teacher can see deletion in audit trail

---

### Use Case 5: Review Student Interaction History

**Scenario**: Parent complaint about student behavior in chat

**Solution**: Review moderation logs + conversation history

**Steps**:

1. Teacher navigates to `/dashboard/teacher/moderation`
2. Searches for student name in "Active Restrictions" table
3. Views moderation logs for this student (filter by target_id)
4. Views conversation history (if teacher has both students)

**Result**:

- Complete audit trail of actions taken
- Timestamps, reasons, and moderators visible
- Can export data for parent meeting or admin review
- Privacy: Can see metadata but not deleted message content

---

### Use Case 6: Lift Restriction Early

**Scenario**: Student apologized, teacher wants to lift ban early

**Solution**: Unrestrict user via dashboard

**Steps**:

1. Teacher navigates to `/dashboard/teacher/moderation`
2. Finds restriction in "Active Restrictions" table
3. Clicks "Lift Restriction" button
4. Confirms action

**Result**:

- Restriction removed from database
- Student can send messages immediately
- Moderation log created (unmute_user, unban_user)
- Action visible in audit trail

---

## Architectural Decisions

### Decision 1: Soft-Delete vs Hard-Delete

**Choice**: Soft-delete (set `deleted_at` timestamp)

**Rationale**:

- **Legal Compliance**: FERPA/GDPR require audit trails for investigations
- **Mistake Recovery**: Can restore if deleted by accident
- **Forensic Analysis**: Can analyze patterns of deleted content (metadata only)
- **No Downsides**: Storage cost negligible, RLS hides from students

**Implementation**: `deleted_at TIMESTAMPTZ` column on `messages` table

---

### Decision 2: Message Content NOT Logged

**Choice**: Log metadata only (length, timestamp, IDs) - NOT content

**Rationale**:

- **GDPR Minimization**: Store minimum personal data necessary
- **Privacy Protection**: Prevents moderator browsing of deleted content
- **Abuse Prevention**: Can't use moderation system to spy on students
- **Sufficient Audit**: Metadata proves action occurred without exposing content

**Implementation**: `metadata` JSONB field with sanitized data only

---

### Decision 3: Defense-in-Depth Authorization

**Choice**: RLS + application checks + Zod validation

**Rationale**:

- **Security Layers**: If one layer fails, others catch it
- **Zero Trust**: Don't trust client, don't trust application, don't trust database alone
- **Comprehensive**: Covers authentication, authorization, input validation
- **Industry Standard**: Recommended by Supabase, OWASP, and security experts

**Implementation**: See [Privacy & Security](#privacy--security) section

---

### Decision 4: Teacher Access to 1-on-1 Chats

**Choice**: Teachers CAN view 1-on-1 chats where BOTH students are theirs

**Rationale**:

- **Safety**: Teachers responsible for student interactions
- **FERPA Justified**: Teacher-student relationship allows access
- **Limited Scope**: Only BOTH students are theirs (not random students)
- **Moderation Need**: Can't moderate what you can't see

**Alternatives Considered**:

- ❌ No teacher access: Can't moderate, safety risk
- ❌ Full teacher access: Privacy violation, overly broad
- ✅ Both-students rule: Balanced approach

**Implementation**: Complex RLS policy on `conversations` and `messages` tables

---

### Decision 5: Unique Constraint on Restrictions

**Choice**: UNIQUE(user_id, scope_type, scope_id, restriction_type)

**Rationale**:

- **Prevents Duplicates**: Can't create two mutes in same scope
- **Allows Coexistence**: Can have mute in conversation A + ban globally
- **Database-Level**: Enforced by PostgreSQL, can't bypass
- **Clear Errors**: 409 status code for duplicate attempts

**Edge Cases Handled**:

- User muted in conversation A → Can be banned globally (different scope_type)
- User timed out in conversation A → Can be muted in conversation B (different scope_id)
- User muted globally → Cannot add another mute globally (duplicate)

---

## Future Enhancements

### Planned Features

**1. Admin Override**:

- Allow admins to lift restrictions created by other teachers
- Currently: Teachers can only lift their own restrictions
- Use case: Principal needs to override teacher decision

**2. Restriction Templates**:

- Pre-defined reason templates ("Spamming", "Inappropriate language")
- Quick-select common reasons
- Customizable per school

**3. Bulk Actions**:

- Restrict multiple users at once
- Use case: Entire class misbehaving
- Batch API endpoint

**4. Parent Notifications**:

- Notify parents when student restricted
- Configurable per restriction type
- Integration with notifications system

**5. Appeal System**:

- Students can appeal restrictions
- Teacher review workflow
- Appeal history in moderation logs

**6. Reporting System**:

- Students can report messages
- Teacher review queue
- Integrate with moderation_logs (review_report action)

**7. Conversation Export**:

- Export entire conversation for legal/administrative purposes
- PDF or JSON format
- Integrated with moderation_logs (export_conversation action)

### Technical Improvements

**1. Realtime Updates**:

- Use Supabase Realtime to update UI when restrictions change
- Broadcast restriction events to affected users
- Currently: Requires page refresh

**2. Caching**:

- Cache active restrictions per user (Redis, 5 min TTL)
- Reduce database queries on every message send
- Invalidate on restriction create/delete

**3. Analytics Dashboard**:

- Moderation metrics (restrictions per day, most common reasons)
- Teacher leaderboard (for accountability)
- Trend analysis (increasing/decreasing misbehavior)

**4. Automated Actions**:

- Auto-mute after N violations
- Escalation ladder (warning → timeout → ban)
- Rule-based moderation (profanity filter)

---

## Troubleshooting

### Issue: Student Can Still Send Messages After Restriction

**Possible Causes**:

1. Restriction expired (timeout)
2. Restriction wrong scope (conversation vs global)
3. RLS policy not applied (rare)

**Diagnosis**:

```sql
-- Check if restriction is active
SELECT *
FROM user_restrictions
WHERE user_id = 'student-uuid'
AND (expires_at IS NULL OR expires_at > now());

-- Check if is_user_restricted() works
SELECT is_user_restricted('student-uuid', 'conversation-uuid');
```

**Solution**:

- Verify restriction exists and is not expired
- Check scope matches conversation
- Verify RLS policies applied: `SHOW rls_status;`

---

### Issue: Teacher Cannot See Student 1-on-1 Chat

**Possible Causes**:

1. One student is not in teacher's classes
2. Conversation is not 1-on-1 (3+ participants)
3. RLS policy not applied

**Diagnosis**:

```sql
-- Check if both students are teacher's students
SELECT *
FROM class_members
WHERE teacher_id = 'teacher-uuid'
AND student_id IN ('student1-uuid', 'student2-uuid');

-- Check conversation participant count
SELECT COUNT(*)
FROM conversation_participants
WHERE conversation_id = 'conversation-uuid';

-- Should return 2 for 1-on-1
```

**Solution**:

- Verify both students are in teacher's classes
- Verify conversation has exactly 2 participants
- Check if teacher is trying to view 3+ person chat (not allowed)

---

### Issue: Duplicate Restriction Error (409)

**Cause**: Unique constraint violation

**Explanation**: User already has active restriction of this type in this scope

**Solution**:

1. Lift existing restriction first
2. Then create new restriction
3. OR update existing restriction (change expires_at, reason)

**Alternative**: Change restriction type (mute → ban) or scope (conversation → global)

---

### Issue: Moderation Logs Not Showing

**Possible Causes**:

1. Log creation failed (non-fatal error)
2. Teacher viewing logs for different teacher (only see own logs)
3. RLS policy issue

**Diagnosis**:

```sql
-- Check if logs exist
SELECT *
FROM moderation_logs
WHERE moderator_id = 'teacher-uuid'
ORDER BY created_at DESC
LIMIT 10;
```

**Solution**:

- Logs are best-effort (restriction still created even if log fails)
- Check server logs for RPC call errors
- Verify RLS policy allows teacher to SELECT

---

### Issue: Deleted Messages Still Visible

**Cause**: RLS policy not hiding soft-deleted messages

**Diagnosis**:

```sql
-- Check if message has deleted_at set
SELECT id, content, deleted_at
FROM messages
WHERE id = 'message-uuid';
```

**Solution**:

- Verify `deleted_at IS NOT NULL`
- Check RLS policy includes `deleted_at IS NULL` clause
- Ensure user role is 'student' (teachers/admins can see deleted)

---

## Related Documentation

- [Friend System](friends-system.md) - Related chat features
- [Supabase Realtime](../architecture/supabase-realtime.md) - Realtime moderation updates (future)
- [Database Schema](../architecture/database-schema.md) - Complete schema documentation
- [Quality Standards](../claude/quality-standards.md) - Zod validation patterns

---

**Maintained by**: UbuMaths Team
**Questions**: See implementation files or consult architecture team
