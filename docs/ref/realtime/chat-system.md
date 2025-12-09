# Chat System

Detailed documentation for UbuMaths' real-time chat implementation.

---

## Overview

The chat system uses a **hybrid approach** combining Broadcast (fast, free) with postgres_changes (reliable, persistent) to achieve optimal user experience.

### Strategy

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        HYBRID CHAT STRATEGY                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  USER SENDS MESSAGE                                                        │
│         │                                                                  │
│         ▼                                                                  │
│  ┌──────────────────┐                                                      │
│  │ 1. Optimistic UI │  (~0ms) Message appears immediately in sender's UI   │
│  │    Update        │                                                      │
│  └────────┬─────────┘                                                      │
│           │                                                                │
│           ├─────────────────────────────────────────┐                      │
│           │                                         │                      │
│           ▼                                         ▼                      │
│  ┌──────────────────┐                    ┌──────────────────┐              │
│  │ 2. Broadcast     │  (~50ms)           │ 3. DB Insert     │  (~200ms)    │
│  │    (FREE)        │  Other clients     │    Persist data  │              │
│  │                  │  see message       │                  │              │
│  └────────┬─────────┘                    └────────┬─────────┘              │
│           │                                       │                        │
│           │                                       ▼                        │
│           │                              ┌──────────────────┐              │
│           │                              │ 4. postgres_     │  (~300ms)    │
│           │                              │    changes       │              │
│           │                              │    (COUNTS)      │              │
│           │                              └────────┬─────────┘              │
│           │                                       │                        │
│           └───────────────────┬───────────────────┘                        │
│                               │                                            │
│                               ▼                                            │
│                      ┌──────────────────┐                                  │
│                      │ 5. Deduplication │  Replace optimistic/broadcast    │
│                      │    by ID or      │  message with DB version         │
│                      │    created_at    │  (has JOINs, full data)          │
│                      └──────────────────┘                                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Message Deduplication

Critical for preventing duplicate messages in the UI.

### Algorithm

```typescript
// Location: src/lib/stores/chat.svelte.ts:892-908

private handlePostgresMessage(payload: { new: DatabaseMessage }): void {
  const data = payload.new;
  const existingMessages = this.messages.get(conversationId) ?? [];

  // CRITICAL: Deduplication logic
  const existingIndex = existingMessages.findIndex(
    (msg) =>
      // Match by ID (optimistic message updated to DB ID)
      msg.id === data.id ||
      // OR match by timestamp (broadcast message or pre-update optimistic)
      msg.created_at === data.created_at
  );

  if (existingIndex !== -1) {
    // Replace existing with full DB version (has JOINs)
    existingMessages[existingIndex] = {
      ...enrichedMessage,
      is_optimistic: false
    };
  } else {
    // New message from another user
    existingMessages.push(enrichedMessage);
  }
}
```

### Why Two Match Criteria?

1. **By ID**: When optimistic message is updated with DB ID after insert
2. **By created_at**: When broadcast arrives before optimistic is updated, or for messages from other users

---

## Message Content Format

Messages use TipTap JSON format for rich text.

### Structure

```typescript
interface TipTapContent {
  type: 'doc';
  content: TipTapNode[];
}

interface TipTapNode {
  type: 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'listItem' | 'text' | ...;
  content?: TipTapNode[];
  text?: string;
  marks?: TipTapMark[];
}

interface TipTapMark {
  type: 'bold' | 'italic' | 'underline' | 'strike' | 'link' | ...;
  attrs?: Record<string, unknown>;
}
```

### Example

```json
{
	"type": "doc",
	"content": [
		{
			"type": "paragraph",
			"content": [
				{ "type": "text", "text": "Hello " },
				{
					"type": "text",
					"text": "world",
					"marks": [{ "type": "bold" }]
				},
				{ "type": "text", "text": "!" }
			]
		}
	]
}
```

### Plain Text Extraction

Database trigger extracts `plain_text` for search and preview:

```sql
-- Trigger: trigger_process_message_content
CREATE OR REPLACE FUNCTION process_message_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract plain text from TipTap JSON
  NEW.plain_text := extract_plain_text(NEW.content);

  -- Check for profanity
  IF contains_profanity(NEW.plain_text) THEN
    NEW.is_flagged := true;
    NEW.flag_reason := 'Profanite detectee automatiquement';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Typing Indicators

Real-time typing status via Broadcast (free, fast).

### Implementation

```typescript
// Send typing status
sendTypingIndicator(conversationId: string, isTyping: boolean): void {
  const channel = this.conversationChannels.get(conversationId);
  if (!channel) return;

  channel.send({
    type: 'broadcast',
    event: 'typing_indicator',
    payload: {
      userId: this.currentUserId,
      userName: this.currentUserName,
      isTyping
    }
  });
}

// Handle incoming typing indicator
private handleTypingIndicator(payload: TypingPayload): void {
  const { userId, userName, isTyping } = payload;

  // Ignore own typing
  if (userId === this.currentUserId) return;

  if (isTyping) {
    this.typingUsers.get(conversationId)?.add(userId);
    this.typingUsersMap.get(conversationId)?.set(userId, userName);

    // Auto-clear after 3 seconds (in case "stopped typing" was lost)
    const timer = setTimeout(() => {
      this.typingUsers.get(conversationId)?.delete(userId);
      this.typingUsersMap.get(conversationId)?.delete(userId);
    }, 3000);

    this.typingTimers.get(conversationId)?.set(userId, timer);
  } else {
    this.clearTypingIndicator(conversationId, userId);
  }
}
```

### Component Usage

```svelte
<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte';

	let typingTimeout: ReturnType<typeof setTimeout>;

	function handleInput() {
		clearTimeout(typingTimeout);
		chatStore.sendTypingIndicator(conversationId, true);

		// Stop typing after 2 seconds of inactivity
		typingTimeout = setTimeout(() => {
			chatStore.sendTypingIndicator(conversationId, false);
		}, 2000);
	}
</script>

<input oninput={handleInput} />

{#if chatStore.activeTypingUsers.length > 0}
	<p class="text-sm text-muted-foreground">
		{chatStore.activeTypingUsers.map((u) => u.name).join(', ')}
		{chatStore.activeTypingUsers.length === 1 ? 'ecrit' : 'ecrivent'}...
	</p>
{/if}
```

---

## Reactions

Emoji reactions on messages via Broadcast + Database.

### Flow

```
User clicks reaction
        │
        ▼
┌───────────────────┐
│ Optimistic UI     │  Immediately show reaction
└─────────┬─────────┘
          │
          ├─────────────────────┐
          │                     │
          ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ Broadcast       │   │ Database Update │
│ (instant to     │   │ (persist)       │
│  other users)   │   │                 │
└─────────────────┘   └─────────────────┘
```

### Implementation

```typescript
toggleReaction(messageId: string, emoji: string): void {
  // Optimistic update
  const message = this.findMessage(messageId);
  if (!message) return;

  const hasReaction = message.reactions?.some(
    r => r.emoji === emoji && r.user_id === this.currentUserId
  );

  if (hasReaction) {
    // Remove reaction
    message.reactions = message.reactions?.filter(
      r => !(r.emoji === emoji && r.user_id === this.currentUserId)
    );
  } else {
    // Add reaction
    message.reactions = [...(message.reactions ?? []), {
      emoji,
      user_id: this.currentUserId,
      created_at: new Date().toISOString()
    }];
  }

  // Broadcast to others
  channel.send({
    type: 'broadcast',
    event: 'message_reaction',
    payload: { messageId, emoji, action: hasReaction ? 'remove' : 'add' }
  });

  // Persist to database
  this.persistReaction(messageId, emoji, !hasReaction);
}
```

---

## Read Receipts

Track when messages are read.

### Database Schema

```sql
-- conversation_participants table
ALTER TABLE conversation_participants
ADD COLUMN last_read_at TIMESTAMP WITH TIME ZONE;
```

### Implementation

```typescript
// Mark conversation as read
async markAsRead(conversationId: string): Promise<void> {
  await this.client
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', this.currentUserId);

  // Broadcast to others
  channel.send({
    type: 'broadcast',
    event: 'message_read',
    payload: { userId: this.currentUserId, conversationId }
  });
}
```

---

## Conversation Types

### Direct (1-on-1)

```typescript
// Create direct conversation
const conversationId = await chatStore.create1on1Chat(friendId);
```

### Group Chat

```typescript
// Created via API
POST /api/conversations
{
  "type": "group",
  "name": "Study Group",
  "participant_ids": ["user1", "user2", "user3"]
}
```

### Class Chat

Automatically created via database trigger when a class is created:

```sql
CREATE TRIGGER trigger_create_class_chat_room
  AFTER INSERT ON classes
  FOR EACH ROW
  EXECUTE FUNCTION create_class_chat_room();
```

Students are automatically added when they join the class:

```sql
CREATE TRIGGER trigger_add_student_to_class_chat
  AFTER INSERT ON class_students
  FOR EACH ROW
  EXECUTE FUNCTION add_student_to_class_chat();
```

---

## Message Moderation

### Profanity Detection

Automatic detection via database trigger:

```sql
-- Bad words list in migration
INSERT INTO profanity_list (word) VALUES
  ('merde'), ('putain'), ('connard'), ...;

-- Trigger checks on INSERT
IF contains_profanity(NEW.plain_text) THEN
  NEW.is_flagged := true;
  NEW.flag_reason := 'Profanite detectee automatiquement';
END IF;
```

### User Reporting

```typescript
const success = await chatStore.reportMessage(
	messageId,
	'inappropriate', // 'spam' | 'harassment' | 'inappropriate' | 'other'
	'Optional additional details'
);
```

### User Restrictions

```typescript
interface UserRestriction {
	type: 'mute' | 'timeout' | 'ban';
	scope: 'conversation' | 'global';
	expires_at: string | null;
	reason: string;
}

// Enforced in ChatWindow component
if (restriction.type === 'ban') {
	// Hide chat entirely
} else if (restriction.type === 'mute') {
	// Disable send button
} else if (restriction.type === 'timeout') {
	// Show countdown, disable until expires_at
}
```

---

## Validation Schemas

**Location**: `src/lib/server/validation/chat.ts`

```typescript
// Message content
export const messageContentSchema = z.union([
	z.string().min(1).max(10000),
	z
		.array(z.discriminatedUnion('type', [textContentSchema, imageUrlContentSchema]))
		.min(1)
		.max(10)
]);

// Report message
export const reportMessageSchema = z.object({
	messageId: z.string().uuid(),
	reason: z.enum(['spam', 'harassment', 'inappropriate', 'other']),
	details: z.string().max(500).optional()
});

// Create conversation
export const createConversationSchema = z.object({
	friendId: z.string().uuid()
});
```

---

## Component Integration

### ChatWindow

**Location**: `src/lib/components/chat/ChatWindow.svelte`

```svelte
<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte';
	import { onMount, onDestroy } from 'svelte';

	let { supabase, userId } = $props();

	onMount(() => {
		chatStore.init(supabase, userId);
	});

	onDestroy(() => {
		if (chatStore.activeConversationId) {
			chatStore.unsubscribeFromConversation(chatStore.activeConversationId);
		}
	});

	// Auto-subscribe when active conversation changes
	$effect(() => {
		if (chatStore.activeConversationId) {
			chatStore.subscribeToConversation(chatStore.activeConversationId);
		}
	});
</script>

<div class="chat-container">
	<!-- Conversation list -->
	{#each chatStore.conversations as conversation}
		<button onclick={() => chatStore.setActiveConversation(conversation.id)}>
			{conversation.name}
			{#if conversation.unread_count > 0}
				<span class="badge">{conversation.unread_count}</span>
			{/if}
		</button>
	{/each}

	<!-- Message list -->
	{#if chatStore.activeConversation}
		{#each chatStore.activeMessages as message}
			<MessageBubble {message} />
		{/each}

		<!-- Typing indicator -->
		{#if chatStore.activeTypingUsers.length > 0}
			<TypingIndicator users={chatStore.activeTypingUsers} />
		{/if}
	{/if}
</div>
```

---

## Memory Leak Prevention

### Timer Cleanup

```typescript
// On unsubscribe, clear all typing timers
unsubscribeFromConversation(conversationId: string): Promise<void> {
  // Clear typing indicators
  this.typingUsers.delete(conversationId);
  this.typingUsersMap.delete(conversationId);

  // Clear all typing timers (CRITICAL for memory leaks)
  const timerMap = this.typingTimers.get(conversationId);
  if (timerMap) {
    for (const timer of timerMap.values()) {
      clearTimeout(timer);
    }
    this.typingTimers.delete(conversationId);
  }

  // Unsubscribe from channel
  await supabaseRealtimeManager.unsubscribeChannel(`chat:${conversationId}`);
}
```

---

## Related Documentation

- [Stores Reference](./stores-reference.md) - Full API
- [Testing Guide](./testing.md) - Chat testing patterns
- [Best Practices](./best-practices.md) - Performance tips
