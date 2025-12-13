# Peer Chat System - Real-time Messaging

> Technical reference for the peer-to-peer chat system with hybrid real-time strategy.

---

## Overview

The peer chat system provides real-time messaging between users (students and teachers) using a **hybrid subscription strategy** that optimizes for both speed and reliability.

### Key Features

| Feature                 | Implementation                                      |
| ----------------------- | --------------------------------------------------- |
| **Real-time messaging** | Hybrid: Broadcast (50ms) + postgres_changes (300ms) |
| **Typing indicators**   | Broadcast only (ephemeral, FREE)                    |
| **Message reactions**   | Broadcast only (ephemeral, NOT persisted)           |
| **Read receipts**       | Broadcast only (ephemeral)                          |
| **1-on-1 chats**        | RPC with duplicate detection                        |
| **Group chats**         | Class-based conversations                           |
| **Message reporting**   | API endpoint with moderation                        |
| **User restrictions**   | Mute, timeout, ban (RLS enforced)                   |

---

## Hybrid Real-time Strategy

The system uses a **dual subscription approach** to balance instant UX with reliable persistence:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HYBRID REAL-TIME STRATEGY                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────┐     ┌───────────────────────────────┐   │
│  │     BROADCAST CHANNEL         │     │     POSTGRES_CHANGES          │   │
│  │                               │     │                               │   │
│  │  • FREE (no quota impact)     │     │  • COUNTS toward quota        │   │
│  │  • ~50ms latency              │     │  • ~300ms latency             │   │
│  │  • Ephemeral (no persistence) │     │  • Source of truth            │   │
│  │  • No JOINs                   │     │  • Full JOINs (profiles)      │   │
│  │                               │     │                               │   │
│  │  Used for:                    │     │  Used for:                    │   │
│  │  • Instant message delivery   │     │  • Message confirmation       │   │
│  │  • Typing indicators          │     │  • Deduplication              │   │
│  │  • Reactions                  │     │  • Full message data          │   │
│  │  • Read receipts              │     │                               │   │
│  └───────────────────────────────┘     └───────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Message Flow

```
User Types Message
        │
        ▼
┌───────────────────────┐
│ 1. OPTIMISTIC UPDATE  │ ← Local state (instant, pending=true)
└────────┬──────────────┘
         │
         ├──────────────────────────────────────────┐
         │                                          │
         ▼                                          ▼
┌───────────────────────┐              ┌───────────────────────┐
│ 2a. BROADCAST         │              │ 2b. DATABASE INSERT   │
│     (~50ms)           │              │     (~200ms)          │
│                       │              │                       │
│ • Send to channel     │              │ • INSERT to messages  │
│ • Other users see     │              │ • Persistent storage  │
│   immediately         │              │ • Triggers RLS        │
└────────┬──────────────┘              └────────┬──────────────┘
         │                                      │
         │                                      ▼
         │                             ┌───────────────────────┐
         │                             │ 3. POSTGRES_CHANGES   │
         │                             │     (~300ms)          │
         │                             │                       │
         │                             │ • Source of truth     │
         │                             │ • Has JOINed profile  │
         │                             └────────┬──────────────┘
         │                                      │
         └──────────────────┬───────────────────┘
                            │
                            ▼
               ┌────────────────────────┐
               │ 4. DEDUPLICATION       │
               │                        │
               │ Replace broadcast msg  │
               │ with DB version        │
               │ (same ID or timestamp) │
               └────────────────────────┘
```

---

## Chat Store

### Location

`src/lib/stores/chat.svelte.ts`

### Class Structure

```typescript
class ChatStore {
  // ===========================================
  // STATE (Svelte 5 Runes)
  // ===========================================

  // Messages by conversation ID
  private messages = $state<Map<string, Message[]>>(new Map());

  // Currently active conversation
  activeConversationId = $state<string | null>(null);

  // Typing users per conversation (user IDs only)
  private typingUsers = $state<Map<string, Set<string>>>(new Map());

  // Typing users with full profile info
  private typingUsersMap = $state<Map<string, Map<string, TypingUser>>>(new Map());

  // All conversations
  private conversationsMap = $state<Map<string, Conversation>>(new Map());

  // Loading states
  private loadingConversations = $state<boolean>(false);
  private loadingMessages = $state<boolean>(false);

  // Pagination tracking
  private hasMore = $state<Map<string, boolean>>(new Map());

  // ===========================================
  // DERIVED STATE
  // ===========================================

  get conversations(): Conversation[] { /* sorted by last message */ }
  get activeConversation(): Conversation | null { ... }
  get activeMessages(): Message[] { ... }
  get activeTypingUsers(): TypingUser[] { ... }
  get isLoadingMessages(): boolean { ... }
  get isLoadingConversations(): boolean { ... }

  // ===========================================
  // INITIALIZATION
  // ===========================================

  init(client, userId, user?): void;
  cleanup(): Promise<void>;

  // ===========================================
  // SUBSCRIPTIONS
  // ===========================================

  subscribeToConversation(conversationId): Promise<void>;
  unsubscribeFromConversation(conversationId): Promise<void>;
  setActiveConversation(conversationId): void;

  // ===========================================
  // MESSAGE OPERATIONS
  // ===========================================

  sendMessage(conversationId, content, attachments?): Promise<Message | null>;
  loadConversationHistory(conversationId, limit?): Promise<void>;
  loadMoreMessages(conversationId, limit?): Promise<void>;
  loadMessages(conversationId, limit?, beforeId?): Promise<void>;

  // ===========================================
  // EPHEMERAL FEATURES
  // ===========================================

  sendTypingIndicator(conversationId, isTyping): void;
  toggleReaction(messageId, emoji): void;

  // ===========================================
  // CONVERSATION MANAGEMENT
  // ===========================================

  loadConversations(): Promise<void>;
  create1on1Chat(friendId): Promise<string | null>;

  // ===========================================
  // MODERATION
  // ===========================================

  reportMessage(messageId, reason, details?): Promise<boolean>;

  // ===========================================
  // GETTERS
  // ===========================================

  getMessages(conversationId): Message[];
  getTypingUsers(conversationId): Set<string>;
  canLoadMore(conversationId): boolean;
}

export const chatStore = new ChatStore();
```

---

## Types

### Message

```typescript
interface Message {
	id: string;
	conversation_id: string;
	sender_id: string | null;
	content: TipTapJSON; // Rich text content
	plain_text: string | null; // Plain text preview
	created_at: string | null;
	edited_at: string | null;
	deleted_at: string | null;
	is_flagged: boolean | null;
	flag_reason: string | null;

	// Client-side flags
	is_optimistic?: boolean; // Not yet saved to DB
	is_broadcast?: boolean; // From broadcast, awaiting DB confirm

	// JOINed data
	sender?: {
		id: string;
		full_name: string | null;
		avatar_url: string | null;
	};

	// Optional data
	attachments?: MessageAttachment[];
	reactions?: MessageReaction[];
}
```

### Conversation

```typescript
interface Conversation {
	id: string;
	name: string | null;
	is_group: boolean;
	class_id: string | null;
	last_message_preview: string | null;
	last_message_at: string | null;
	unread_count: number;
	participant_count: number;

	// For 1-on-1 chats
	other_user_id: string | null;
	other_user_firstname: string | null;
	other_user_lastname: string | null;
	other_user_avatar_url: string | null;

	is_muted: boolean;
	created_at: string | null;
	updated_at: string | null;
}
```

### MessageReaction

```typescript
interface MessageReaction {
	id: string;
	message_id: string;
	user_id: string;
	emoji: string;
	created_at: string | null;
	count?: number; // Aggregated count
	user_reacted?: boolean; // Did current user react
}
```

---

## Broadcast Events

### Event Types

| Event              | Payload                       | Purpose                  |
| ------------------ | ----------------------------- | ------------------------ |
| `new_message`      | `BroadcastMessagePayload`     | Instant message delivery |
| `typing_indicator` | `BroadcastTypingPayload`      | Show who's typing        |
| `message_reaction` | `BroadcastReactionPayload`    | Toggle reactions         |
| `message_read`     | `BroadcastReadReceiptPayload` | Mark as read             |

### Payload Schemas (Zod Validated)

```typescript
// Message payload
const broadcastMessagePayloadSchema = z.object({
	type: z.literal('new_message'),
	message: z.object({
		id: z.string().uuid(),
		conversation_id: z.string().uuid(),
		sender_id: z.string().uuid(),
		content: z.unknown(),
		plain_text: z.string().nullable(),
		created_at: z.string(),
		sender: z.object({
			id: z.string(),
			full_name: z.string().nullable(),
			avatar_url: z.string().nullable()
		})
	})
});

// Typing indicator
const broadcastTypingPayloadSchema = z.object({
	type: z.literal('typing_indicator'),
	userId: z.string().uuid(),
	isTyping: z.boolean()
});

// Reaction
const broadcastReactionPayloadSchema = z.object({
	type: z.literal('message_reaction'),
	messageId: z.string().uuid(),
	userId: z.string().uuid(),
	emoji: z.string().min(1).max(10),
	action: z.enum(['add', 'remove'])
});

// Read receipt
const broadcastReadReceiptPayloadSchema = z.object({
	type: z.literal('message_read'),
	userId: z.string().uuid(),
	messageId: z.string().uuid(),
	conversationId: z.string().uuid()
});
```

---

## Usage Examples

### Initialize Store

```typescript
import { chatStore } from '$lib/stores/chat.svelte';

// In +page.svelte or +layout.svelte
$effect(() => {
	if (data.user) {
		chatStore.init(data.supabase, data.user.id, {
			full_name: data.user.full_name,
			avatar_url: data.user.avatar_url
		});
	}

	return () => {
		chatStore.cleanup();
	};
});
```

### Load Conversations

```typescript
// Load all user's conversations
await chatStore.loadConversations();

// Access conversations (reactive)
const conversations = chatStore.conversations;
```

### Set Active Conversation

```typescript
// Set active (auto-subscribes and loads history)
chatStore.setActiveConversation(conversationId);

// Access active conversation messages
const messages = chatStore.activeMessages;
```

### Send Message

```typescript
// Send plain text
await chatStore.sendMessage(conversationId, 'Hello world!');

// Send rich content (TipTap JSON)
await chatStore.sendMessage(conversationId, {
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello!' }] }]
});

// Send with attachments
await chatStore.sendMessage(conversationId, 'Check this file', [
	{
		file_name: 'document.pdf',
		file_type: 'application/pdf',
		file_size: 12345,
		storage_path: 'chat/abc.pdf',
		public_url: 'https://...'
	}
]);
```

### Typing Indicators

```typescript
// Send typing indicator (call on input change)
chatStore.sendTypingIndicator(conversationId, true);

// Stop typing (call on blur or send)
chatStore.sendTypingIndicator(conversationId, false);

// Access typing users
const typingUsers = chatStore.activeTypingUsers;
// Returns: [{ id: 'user-123', firstname: 'John', lastname: 'Doe' }]
```

### Reactions

```typescript
// Toggle reaction (add or remove)
chatStore.toggleReaction(messageId, '👍');
chatStore.toggleReaction(messageId, '❤️');

// Note: Reactions are EPHEMERAL (not persisted to database)
```

### Create 1-on-1 Chat

```typescript
// Creates or finds existing conversation
const conversationId = await chatStore.create1on1Chat(friendId);

if (conversationId) {
	chatStore.setActiveConversation(conversationId);
}
```

### Report Message

```typescript
const success = await chatStore.reportMessage(
	messageId,
	'harassment', // 'spam' | 'harassment' | 'inappropriate' | 'other'
	'This message is offensive' // optional details
);
```

### Pagination

```typescript
// Check if more messages exist
if (chatStore.canLoadMore(conversationId)) {
	await chatStore.loadMoreMessages(conversationId, 50);
}
```

---

## Reconnection Logic

The store includes automatic reconnection with exponential backoff:

```typescript
// Configuration
MAX_RECONNECT_ATTEMPTS = 5;
RECONNECT_DELAY_MS = 5000; // Base delay

// Exponential backoff: 5s, 10s, 20s, 40s, 80s
delay = RECONNECT_DELAY_MS * Math.pow(2, attempts);
```

### Flow

```
Channel Error
      │
      ▼
┌─────────────────────┐
│ Check if already    │
│ reconnecting        │─── Yes ──► Ignore
└──────────┬──────────┘
           │ No
           ▼
┌─────────────────────┐
│ Check max attempts  │─── Exceeded ──► Give up, log error
└──────────┬──────────┘
           │ Not exceeded
           ▼
┌─────────────────────┐
│ Calculate delay     │
│ (exponential        │
│ backoff)            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Schedule reconnect  │
└──────────┬──────────┘
           │ After delay
           ▼
┌─────────────────────┐
│ 1. Unsubscribe      │
│ 2. Wait 1s          │
│ 3. Re-subscribe     │
└──────────┬──────────┘
           │
      ┌────┴────┐
      │         │
   Success    Failure
      │         │
      ▼         ▼
   Reset     Retry
   state     (loop)
```

---

## API Endpoints

### Report Message

**POST** `/api/chat/reports`

```typescript
// Request
{
  messageId: string;       // UUID
  reason: 'spam' | 'harassment' | 'inappropriate' | 'other';
  details?: string;        // Optional additional info
}

// Response (201)
{
  success: true;
  report: {
    id: string;
    message_id: string;
    reporter_id: string;
    reason: string;
    details: string | null;
    status: 'pending';
    created_at: string;
  }
}
```

---

## Database Functions (RPC)

| Function                                                                                | Purpose                             |
| --------------------------------------------------------------------------------------- | ----------------------------------- |
| `get_user_conversations(p_user_id)`                                                     | Get all conversations with metadata |
| `get_messages_paginated(p_conversation_id, p_limit, p_before_id?, p_before_timestamp?)` | Paginated message loading           |
| `mark_conversation_read(p_conversation_id, p_user_id)`                                  | Update last_read_at                 |
| `create_1on1_chat(p_user1_id, p_user2_id)`                                              | Create or find 1-on-1 conversation  |

---

## Features Not Implemented

Based on the codebase analysis, these features are mentioned but not fully implemented:

| Feature           | Status          | Notes                     |
| ----------------- | --------------- | ------------------------- |
| Message reactions | Ephemeral only  | Not persisted to database |
| Read receipts     | Broadcast only  | Not persisted             |
| Message search    | Not implemented |                           |
| Message editing   | Schema exists   | UI not implemented        |
| Voice messages    | Not implemented |                           |
| Video calls       | Not implemented |                           |

---

## See Also

- [Architecture](./architecture.md) - System architecture
- [Database Schema](./database-schema.md) - Tables and RLS policies
- [Realtime Guide](../../claude/realtime.md) - Supabase Realtime patterns
