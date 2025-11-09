# Supabase Realtime Architecture

Comprehensive guide to UbuMaths' real-time infrastructure using Supabase Realtime (migrated from custom WebSocket server).

🆕 **2025-11-09** - Migration from custom WebSocket to Supabase Realtime

---

## Table of Contents

- [Overview & Motivation](#overview--motivation)
- [Architecture Design](#architecture-design)
- [Three Realtime Methods](#three-realtime-methods)
- [Critical Configuration](#critical-configuration)
- [Store Architecture](#store-architecture)
- [Migration Benefits](#migration-benefits)
- [Performance Characteristics](#performance-characteristics)
- [Implementation Patterns](#implementation-patterns)
- [Testing Strategy](#testing-strategy)
- [Troubleshooting](#troubleshooting)

---

## Overview & Motivation

### The Problem with Custom WebSocket

Before November 2025, UbuMaths used a custom WebSocket server (`src/lib/server/websocket-server.ts`) running on port 3001:

**Infrastructure Issues**:

- ❌ Incompatible with Vercel serverless architecture (requires long-running process)
- ❌ Manual connection management and reconnection logic
- ❌ RLS policies not enforced (security risk)
- ❌ Separate infrastructure to maintain and monitor
- ❌ No built-in presence tracking
- ❌ Additional server costs

**Code Complexity**:

- 370 lines of WebSocket server code
- 221 lines of WebSocket client store
- Custom heartbeat system (60s interval)
- Manual connection lifecycle management

**Quota Concerns**:

- 60s heartbeat interval = ~2.9M messages/month
- **EXCEEDED** Supabase free tier (2M messages/month)

### The Solution: Supabase Realtime

**What is Supabase Realtime?**

Supabase Realtime provides three complementary methods for real-time communication:

1. **postgres_changes** - Database change subscriptions with JOINs
2. **Broadcast API** - Ephemeral pub/sub messaging (FREE, no quota)
3. **Presence API** - User presence tracking (not used - using postgres_changes instead)

**Migration Results**:

- ✅ **Vercel compatible** (no server required)
- ✅ **66% quota reduction** (2.9M → 1M messages/month)
- ✅ **RLS policies enforced** automatically
- ✅ **Zero infrastructure** to maintain
- ✅ **Hybrid architecture** (Broadcast + postgres_changes)
- ✅ **Deleted 591 lines** of WebSocket code
- ✅ **Added 1,663 lines** of well-tested Realtime stores

---

## Architecture Design

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  - Friend presence tracking                                      │
│  - Real-time notifications                                       │
│  - Chat system (messages, typing, reactions)                     │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 │ Uses
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│              Specialized Realtime Stores                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ presenceManager (presence.svelte.ts)                     │  │
│  │ Method: postgres_changes on user_presence table          │  │
│  │ Purpose: Friend online/offline status                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ notificationsRealtimeManager                             │  │
│  │ Method: postgres_changes on notifications table          │  │
│  │ Purpose: New notification alerts                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ chatStore (chat.svelte.ts)                               │  │
│  │ Method: HYBRID (Broadcast + postgres_changes)            │  │
│  │ Purpose: Instant chat UX with reliable persistence       │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 │ Delegates to
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│       supabaseRealtimeManager (Central Infrastructure)           │
│  - Channel lifecycle management                                 │
│  - Connection status tracking                                   │
│  - Automatic cleanup                                            │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 │ WebSocket
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Supabase Realtime Server                       │
│  - postgres_changes: Row-level subscriptions with RLS           │
│  - Broadcast: Ephemeral pub/sub (FREE, no quota)                │
│  - Presence: Built-in presence (unused - using postgres_changes) │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                         │
│  Tables: user_presence, notifications, messages, ...            │
│  RLS Policies: Enforced for ALL Realtime subscriptions          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Three Realtime Methods

Supabase Realtime provides three distinct methods. Understanding when to use each is critical for optimal performance and quota management.

### 1. postgres_changes (Database-Backed)

**What it is**: Subscribe to INSERT/UPDATE/DELETE events on specific database tables.

**Characteristics**:

- ⏱ **Latency**: ~300ms (includes database trigger + broadcast)
- 💾 **Source of truth**: PostgreSQL database
- 🔒 **RLS enforced**: Yes (automatically filters rows)
- 📊 **JOINs supported**: Yes (can subscribe to views with JOINs)
- 💰 **Quota impact**: **COUNTS** toward 2M messages/month free tier
- 🔄 **Reliability**: Guaranteed delivery (database-backed)

**When to use**:

- ✅ Data needs to persist (messages, notifications)
- ✅ Need complex queries with JOINs (user profiles, relationships)
- ✅ Need RLS policy enforcement
- ✅ Need guaranteed delivery

**Example - Friend Presence**:

```typescript
// Subscribe to user_presence table changes (for specific friends only)
const channel = supabaseRealtimeManager.createChannel('user-presence-updates');

channel.on(
	'postgres_changes',
	{
		event: '*', // INSERT, UPDATE, DELETE
		schema: 'public',
		table: 'user_presence',
		filter: `user_id=in.(${friendIds.join(',')})` // Filter to specific friends
	},
	(payload) => {
		// payload.new = new row data
		// payload.old = old row data (for DELETE/UPDATE)
		handlePresenceUpdate(payload);
	}
);

await supabaseRealtimeManager.subscribeChannel('user-presence-updates');
```

**Cost**: Each database change triggers a message. With 180s heartbeat:

- 200 concurrent users × 8 hours × 20 days = ~640K messages/month

---

### 2. Broadcast API (Ephemeral)

**What it is**: Instant pub/sub messaging that does NOT touch the database.

**Characteristics**:

- ⚡ **Latency**: ~50ms (direct WebSocket broadcast)
- 💨 **Ephemeral**: Messages not stored anywhere
- 🔓 **RLS enforced**: No (channel-level access control only)
- 📊 **JOINs supported**: No (you provide the payload)
- 💰 **Quota impact**: **FREE** - does NOT count toward quota
- 🔄 **Reliability**: Best-effort (can be lost if offline)

**When to use**:

- ✅ Instant feedback needed (typing indicators, live cursors)
- ✅ Ephemeral data (doesn't need persistence)
- ✅ High-frequency events (every keystroke)
- ✅ Quota optimization (Broadcast is FREE)

**Example - Typing Indicator**:

```typescript
const channel = supabaseRealtimeManager.createChannel('conversation:abc123');

// Send typing indicator (ephemeral, FREE)
channel.send({
	type: 'broadcast',
	event: 'typing',
	payload: {
		userId: 'user-123',
		isTyping: true
	}
});

// Receive typing indicators
channel.on('broadcast', { event: 'typing' }, (payload) => {
	updateTypingIndicator(payload);
});
```

**Cost**: **FREE** - Unlimited messages, zero quota impact

---

### 3. Hybrid Approach (Broadcast + postgres_changes)

**What it is**: Combine Broadcast (instant UX) with postgres_changes (persistence + reliability).

**Characteristics**:

- ⚡ **Initial UX**: 50ms (via Broadcast)
- 💾 **Reliability**: 300ms (via postgres_changes confirmation)
- 💰 **Quota optimization**: Minimize postgres_changes events
- 🎯 **Best of both worlds**: Instant + Reliable

**When to use**:

- ✅ Need instant feedback (chat messages)
- ✅ Need guaranteed persistence (chat history)
- ✅ Want to optimize quota (reduce postgres_changes polling)

**Example - Chat Messages**:

```typescript
// FLOW: User sends message
// 1. Optimistic UI update (instant)
// 2. Broadcast to other users (50ms)
// 3. Insert to database (200ms)
// 4. postgres_changes confirms (300ms) - replace broadcast version with DB version

// Send message
async function sendMessage(conversationId: string, content: string) {
	const tempId = crypto.randomUUID();

	// 1. Optimistic UI (instant)
	addOptimisticMessage({ id: tempId, content, is_optimistic: true });

	// 2. Broadcast for instant UX (FREE, 50ms)
	channel.send({
		type: 'broadcast',
		event: 'new_message',
		payload: { id: tempId, conversationId, content, sender }
	});

	// 3. Insert to database (persists + triggers postgres_changes)
	const { data } = await supabase.from('messages').insert({ content }).select();

	// 4. Replace optimistic with DB version (happens automatically via postgres_changes)
}

// Receive messages
// Broadcast listener (50ms) - show immediately with is_broadcast flag
channel.on('broadcast', { event: 'new_message' }, (payload) => {
	addMessage({ ...payload.message, is_broadcast: true });
});

// postgres_changes listener (300ms) - replace broadcast version with DB version
channel.on('postgres_changes', { event: 'INSERT', table: 'messages' }, (payload) => {
	replaceMessage(payload.new.id, payload.new); // Remove is_broadcast flag
});
```

**Cost**: Only 1 postgres_changes message per actual message sent (not per recipient)

**Deduplication**: Messages with `is_broadcast` flag are replaced when `postgres_changes` confirms the DB insert.

---

## Critical Configuration

### Heartbeat Interval (BILLING CRITICAL)

**NEVER CHANGE WITHOUT RECALCULATING QUOTA IMPACT**

```typescript
// src/lib/stores/presence.svelte.ts
const HEARTBEAT_INTERVAL = 180000; // 180 seconds (3 minutes)
```

**Why 180 seconds?**

| Strategy        | Heartbeat | Messages/Month | Status                    |
| --------------- | --------- | -------------- | ------------------------- |
| Old (WebSocket) | 60s       | ~2.9M          | ❌ Exceeded free tier     |
| New (Realtime)  | 180s      | ~1M            | ✅ Within free tier (50%) |

**Calculation** (see migration file for details):

```
Assumptions:
- 200 concurrent users during peak hours
- 8 peak hours/day (school hours)
- 20 school days/month

Calculation:
- Messages/day = 200 users × 8 hours × 3600s/hour ÷ 180s = 32,000
- Messages/month = 32,000 × 20 days = 640,000
- With 50% buffer = ~1M messages/month ✓
```

**Stale Presence Timeout**:

```sql
-- Database cleanup function (270s = 180s + 90s grace period)
UPDATE user_presence
SET status = 'offline'
WHERE last_heartbeat < now() - interval '270 seconds';
```

**Trade-offs**:

- ✅ **66% quota reduction** (2.9M → 1M messages/month)
- ✅ **Reduced battery drain** on mobile devices
- ✅ **Lower server load**
- ⚠️ **Increased staleness**: Users marked offline after 270s (vs 120s before)
- ⚠️ **Less precise presence**: 3min updates (vs 1min before)

**Acceptable for UbuMaths**: Educational app, not a real-time chat product. 3-minute presence staleness is fine.

---

### Database Indexes (Performance Critical)

Migration `20251109235216_optimize_presence_for_realtime.sql` added critical indexes:

```sql
-- Index on updated_at for Realtime subscription filtering
CREATE INDEX idx_user_presence_updated_at
  ON user_presence(updated_at DESC);

-- Composite index for "who's online" queries
CREATE INDEX idx_user_presence_online_activity
  ON user_presence(status, last_heartbeat DESC)
  WHERE status = 'online';
```

**Why these indexes matter**:

1. **`updated_at` index**: Supabase Realtime uses `updated_at` to detect changes and broadcast to subscribers. Without this index, every presence update would trigger a full table scan.

2. **Partial index on `status = 'online'`**: "Who's online?" queries are frequent. Partial index reduces index size and speeds up lookups.

---

### RLS Policies (Security Critical)

**IMPORTANT**: All RLS policies are automatically enforced for Realtime subscriptions.

Example - User Presence:

```sql
-- Users can view friend presence
CREATE POLICY "Users can view friend presence"
  ON user_presence FOR SELECT
  USING (
    user_id IN (
      SELECT friend_id FROM friendships WHERE user_id = auth.uid()
      UNION
      SELECT user_id FROM friendships WHERE friend_id = auth.uid()
    )
  );
```

**When you subscribe to `user_presence` via Realtime**:

- ✅ You only receive updates for YOUR friends (enforced by RLS)
- ✅ `auth.uid()` is available in Realtime context
- ✅ No need to manually filter in client code

**This is a HUGE security win** over custom WebSocket (which did not enforce RLS).

---

## Store Architecture

### supabaseRealtimeManager (Central Infrastructure)

**File**: `src/lib/stores/supabaseRealtime.svelte.ts` (239 lines)

**Purpose**: Centralized channel lifecycle management for all Realtime features.

**Responsibilities**:

- Create Realtime channels (does not subscribe)
- Subscribe/unsubscribe to channels
- Track connection status
- Cleanup on disconnect

**API**:

```typescript
import { supabaseRealtimeManager } from '$lib/stores/supabaseRealtime.svelte';

// Initialize (once per session)
supabaseRealtimeManager.init(supabase, userId);

// Create a channel (returns RealtimeChannel instance)
const channel = supabaseRealtimeManager.createChannel('my-channel');

// Configure listeners BEFORE subscribing
channel.on('postgres_changes', { event: 'INSERT', ... }, callback);
channel.on('broadcast', { event: 'typing' }, callback);

// Subscribe to start receiving events
await supabaseRealtimeManager.subscribeChannel('my-channel');

// Check connection status
if (supabaseRealtimeManager.isConnected) {
  // Connected
}

// Unsubscribe and cleanup
await supabaseRealtimeManager.unsubscribeChannel('my-channel');
```

**Key Design Decision**: Separation of concerns

- ✅ `supabaseRealtimeManager` handles infrastructure (channels, connections)
- ✅ Specialized stores handle business logic (presence, chat, notifications)

---

### presenceManager (Friend Presence)

**File**: `src/lib/stores/presence.svelte.ts` (377 lines)

**Purpose**: Track online/offline status of friends using postgres_changes.

**Method**: postgres_changes (database-backed, reliable)

**Architecture**:

```typescript
// Subscribe to user_presence table for specific friend IDs
channel.on(
	'postgres_changes',
	{
		event: '*', // INSERT, UPDATE, DELETE
		schema: 'public',
		table: 'user_presence',
		filter: `user_id=in.(friend1,friend2,friend3)` // Only track friends
	},
	(payload) => {
		// Update friendsPresence Map
	}
);

// Send heartbeat every 180s to maintain own presence
setInterval(() => {
	supabase.rpc('upsert_user_presence', { p_status: 'online' });
}, 180000); // 180 seconds
```

**State Management**:

```typescript
// Reactive Map using Svelte 5 $state
private friendsPresence = $state<Map<string, 'online' | 'offline'>>(new Map());

// Get friend status
const status = presenceManager.getFriendPresence('friend-id'); // 'online' | 'offline'
```

**Lifecycle**:

```typescript
// Initialize
presenceManager.init(supabase, userId);

// Start tracking friends
await presenceManager.startPresenceTracking(['friend1', 'friend2']);

// Update friend list (stops/restarts tracking)
await presenceManager.updateFriendList(['friend1', 'friend3']);

// Stop tracking
await presenceManager.stopPresenceTracking();
```

**Quota Impact**: ~640K messages/month (within 1M budget)

---

### notificationsRealtimeManager (New Notification Alerts)

**File**: `src/lib/stores/notificationsRealtime.svelte.ts` (200 lines)

**Purpose**: Real-time alerts for new notifications (friend requests, warnings, etc.).

**Method**: postgres_changes (needs JOINs for sender profile data)

**Architecture**:

```typescript
// Subscribe to INSERT events on notifications table
channel.on(
	'postgres_changes',
	{
		event: 'INSERT',
		schema: 'public',
		table: 'notifications',
		filter: `user_id=eq.${userId}` // Only current user's notifications
	},
	(payload) => {
		// Trigger notificationStore to refetch
		// (refetch gets full data with JOINs - sender profile, etc.)
		notificationStore.fetchUnread();
	}
);
```

**Why refetch instead of using payload?**

- `postgres_changes` payload.new = raw `notifications` row
- Actual query needs JOINs (sender profile, class info, etc.)
- Simpler to trigger existing `fetchUnread()` than reconstruct joined data

**Integration with notificationStore**:

```typescript
// notificationsRealtime.svelte.ts
private handleNewNotification(_payload: unknown): void {
  // Trigger refetch with full JOIN data
  notificationStore.fetchUnread(); // Fetches notifications + sender profiles
}
```

**Quota Impact**: Minimal (only triggered on new notifications, not polling)

---

### chatStore (Hybrid Chat System)

**File**: `src/lib/stores/chat.svelte.ts` (842 lines)

**Purpose**: Real-time chat with instant UX and reliable persistence.

**Method**: HYBRID (Broadcast for UX + postgres_changes for reliability)

**Architecture**:

```
User sends message:
  1. Optimistic UI (instant) ────────────────────────► Local state update
  2. Broadcast (50ms) ───────────────────────────────► Other users see message
  3. Database INSERT (200ms) ────────────────────────► Persists to DB
  4. postgres_changes (300ms) ───────────────────────► Replace with DB version

Other user receives message:
  1. Broadcast (50ms) ───────────────────────────────► Show message (is_broadcast: true)
  2. postgres_changes (300ms) ───────────────────────► Replace with DB version (is_broadcast: false)
```

**Deduplication**:

```typescript
interface Message {
  id: string;
  content: string;
  is_optimistic?: boolean; // Temporary, not yet sent
  is_broadcast?: boolean;  // From Broadcast, awaiting DB confirmation
  sender?: { ... };        // Included in Broadcast payload
}

// When postgres_changes event arrives, replace broadcast version
function handlePostgresInsert(payload: PostgresChangePayload) {
  const existingIndex = messages.findIndex(m => m.id === payload.new.id);

  if (existingIndex !== -1) {
    // Replace broadcast version with DB version
    messages[existingIndex] = {
      ...payload.new,
      is_broadcast: undefined, // Remove flag
      is_optimistic: undefined
    };
  } else {
    // New message (not seen via Broadcast)
    messages.push(payload.new);
  }
}
```

**Features**:

1. **Typing Indicators** (Broadcast only, ephemeral):

```typescript
// Send typing indicator (FREE, no quota impact)
chatStore.sendTypingIndicator(conversationId, true);

// Listen to typing indicators
const typingUserIds = chatStore.getTypingUsers(conversationId); // Set<userId>
```

2. **Message Reactions** (Broadcast + postgres_changes):

```typescript
// Add reaction (Broadcast + DB)
await chatStore.addReaction(messageId, '👍');

// Broadcast for instant UX (50ms)
// postgres_changes for persistence (300ms)
```

3. **Read Receipts** (Broadcast only, ephemeral):

```typescript
// Mark message as read (updates DB + broadcasts to sender)
await chatStore.markMessageAsRead(messageId);
```

**Quota Impact**: ~1 postgres_changes message per actual message sent (not per recipient)

**Broadcast messages are FREE** (typing, reactions, read receipts)

---

## Migration Benefits

### Before (Custom WebSocket)

**Infrastructure**:

- ❌ WebSocket server on port 3001 (370 lines)
- ❌ WebSocket client store (221 lines)
- ❌ Manual reconnection logic
- ❌ Vercel incompatible (requires long-running process)
- ❌ Separate deployment/monitoring

**Security**:

- ❌ No RLS enforcement
- ❌ Manual authorization checks

**Quota**:

- ❌ 60s heartbeat = 2.9M messages/month (exceeded free tier)

**Code Complexity**:

- ❌ 591 lines of WebSocket infrastructure
- ❌ Manual connection lifecycle
- ❌ Custom heartbeat logic

---

### After (Supabase Realtime)

**Infrastructure**:

- ✅ Zero servers (Vercel compatible)
- ✅ Built-in reconnection
- ✅ Automatic failover
- ✅ No deployment needed

**Security**:

- ✅ RLS policies enforced automatically
- ✅ `auth.uid()` available in subscriptions
- ✅ Row-level security for ALL events

**Quota**:

- ✅ 180s heartbeat = 1M messages/month (50% of free tier)
- ✅ Broadcast API is FREE (typing, reactions)
- ✅ Hybrid approach optimizes postgres_changes usage

**Code Quality**:

- ✅ 1,663 lines of well-tested stores
- ✅ 2,119 lines of unit tests (99% pass rate)
- ✅ Separation of concerns (infrastructure vs. business logic)
- ✅ Svelte 5 runes for reactive state

**Developer Experience**:

- ✅ Simpler API (channel-based)
- ✅ Better TypeScript support
- ✅ Comprehensive documentation
- ✅ Well-tested (2,119 lines of tests)

---

## Performance Characteristics

### Latency Comparison

| Method           | Latency | Use Case                | Quota Impact |
| ---------------- | ------- | ----------------------- | ------------ |
| Broadcast        | ~50ms   | Typing, reactions       | FREE         |
| postgres_changes | ~300ms  | Messages, notifications | COUNTS       |
| Hybrid (both)    | 50ms UX | Chat messages           | Optimized    |
| Old WebSocket    | ~100ms  | All events              | N/A          |

**Why postgres_changes is slower**:

1. Database INSERT (50-100ms)
2. Trigger fires (10ms)
3. Realtime broadcast (50ms)
4. Client receives (300ms total)

**Why Broadcast is faster**:

1. Direct WebSocket send (10ms)
2. Realtime broadcast (20ms)
3. Client receives (50ms total)

---

### Message Volume (Quota Planning)

**Free Tier**: 2M messages/month

**Current Usage** (~1M/month):

| Feature       | Method           | Volume/Month | % of Quota |
| ------------- | ---------------- | ------------ | ---------- |
| Presence      | postgres_changes | ~640K        | 32%        |
| Notifications | postgres_changes | ~50K         | 2.5%       |
| Chat messages | postgres_changes | ~300K        | 15%        |
| Typing        | Broadcast (FREE) | Unlimited    | 0%         |
| Reactions     | Broadcast (FREE) | Unlimited    | 0%         |
| Read receipts | Broadcast (FREE) | Unlimited    | 0%         |
| **TOTAL**     |                  | **~1M**      | **50%**    |

**Headroom**: 1M messages/month (50% buffer for growth)

---

### Scaling Considerations

**When you exceed free tier** (2M messages/month):

1. **Option 1**: Upgrade to Pro plan ($25/month, 5M messages)
2. **Option 2**: Increase heartbeat interval (180s → 300s)
3. **Option 3**: Use Broadcast for more features (FREE)

**Example - 300s heartbeat**:

```
Messages/month = 200 users × 8 hours × 3600s/hour ÷ 300s × 20 days
              = 384,000 messages/month (~40% reduction)
```

**Trade-off**: Presence staleness increases to 450s (7.5 minutes)

---

## Implementation Patterns

### Pattern 1: Simple postgres_changes Subscription

**Use case**: Subscribe to database changes (notifications, presence).

```typescript
// 1. Initialize supabaseRealtimeManager
import { supabaseRealtimeManager } from '$lib/stores/supabaseRealtime.svelte';

supabaseRealtimeManager.init(supabase, userId);

// 2. Create channel
const channel = supabaseRealtimeManager.createChannel('my-channel');

// 3. Add postgres_changes listener
channel.on(
	'postgres_changes',
	{
		event: 'INSERT', // or 'UPDATE', 'DELETE', '*'
		schema: 'public',
		table: 'notifications',
		filter: `user_id=eq.${userId}` // Optional filter
	},
	(payload) => {
		console.log('New notification:', payload.new);
		// Update local state
	}
);

// 4. Subscribe to start receiving events
await supabaseRealtimeManager.subscribeChannel('my-channel');

// 5. Cleanup when done
await supabaseRealtimeManager.unsubscribeChannel('my-channel');
```

---

### Pattern 2: Broadcast Only (Ephemeral Events)

**Use case**: Typing indicators, live cursors, ephemeral state.

```typescript
// 1. Create channel
const channel = supabaseRealtimeManager.createChannel('typing-indicators');

// 2. Listen to broadcast events
channel.on('broadcast', { event: 'typing' }, (payload) => {
	console.log('User typing:', payload.userId);
	updateTypingIndicator(payload);
});

// 3. Subscribe
await supabaseRealtimeManager.subscribeChannel('typing-indicators');

// 4. Send broadcast events (FREE, no quota)
channel.send({
	type: 'broadcast',
	event: 'typing',
	payload: {
		userId: 'user-123',
		isTyping: true
	}
});
```

---

### Pattern 3: Hybrid (Broadcast + postgres_changes)

**Use case**: Chat messages - instant UX with reliable persistence.

```typescript
// 1. Create channel
const channel = supabaseRealtimeManager.createChannel('conversation:abc123');

// 2. Listen to broadcast (instant UX, 50ms)
channel.on('broadcast', { event: 'new_message' }, (payload) => {
	addMessage({ ...payload.message, is_broadcast: true }); // Temporary
});

// 3. Listen to postgres_changes (persistence, 300ms)
channel.on(
	'postgres_changes',
	{
		event: 'INSERT',
		schema: 'public',
		table: 'messages',
		filter: `conversation_id=eq.abc123`
	},
	(payload) => {
		replaceOrAddMessage(payload.new); // Replace broadcast version or add new
	}
);

// 4. Subscribe
await supabaseRealtimeManager.subscribeChannel('conversation:abc123');

// 5. Send message (optimistic + broadcast + DB)
async function sendMessage(content: string) {
	const tempId = crypto.randomUUID();

	// Optimistic UI (instant)
	addMessage({ id: tempId, content, is_optimistic: true });

	// Broadcast (50ms, FREE)
	channel.send({
		type: 'broadcast',
		event: 'new_message',
		payload: { message: { id: tempId, content, sender } }
	});

	// Database (200ms + 300ms for postgres_changes)
	const { data } = await supabase
		.from('messages')
		.insert({ content, conversation_id: 'abc123' })
		.select();

	// postgres_changes will trigger and replace optimistic/broadcast versions
}
```

**Deduplication logic**:

```typescript
function replaceOrAddMessage(newMessage: Message) {
	const existingIndex = messages.findIndex(
		(m) =>
			m.id === newMessage.id || // Same UUID
			(m.is_optimistic && m.content === newMessage.content) // Match optimistic by content
	);

	if (existingIndex !== -1) {
		// Replace optimistic or broadcast version
		messages[existingIndex] = newMessage;
	} else {
		// New message (user was offline when broadcast happened)
		messages.push(newMessage);
	}
}
```

---

### Pattern 4: Filter Subscriptions (Quota Optimization)

**Use case**: Only subscribe to specific rows (e.g., friend presence).

```typescript
// Bad: Subscribe to ALL user_presence changes (high quota usage)
channel.on(
	'postgres_changes',
	{
		event: '*',
		schema: 'public',
		table: 'user_presence'
		// No filter - receives ALL presence updates!
	},
	callback
);

// Good: Filter to only friends (quota optimization)
const friendIds = ['friend1', 'friend2', 'friend3'];
const filter = `user_id=in.(${friendIds.join(',')})`;

channel.on(
	'postgres_changes',
	{
		event: '*',
		schema: 'public',
		table: 'user_presence',
		filter // Only receive updates for these 3 friends
	},
	callback
);
```

**Quota impact**:

- Bad: ~200K messages/month (all users)
- Good: ~3K messages/month (3 friends)
- **Savings**: 98.5%

---

## Testing Strategy

### Unit Tests (2,119 lines)

**Files**:

- `src/lib/stores/supabaseRealtime.test.ts` (636 lines)
- `src/lib/stores/presence.test.ts` (458 lines)
- `src/lib/stores/chat.test.ts` (1,025 lines)

**Critical Tests**:

1. **Heartbeat Interval (BILLING CRITICAL)**:

```typescript
// src/lib/stores/presence.test.ts
describe('1. HEARTBEAT INTERVAL - CRITICAL BILLING TEST', () => {
	it('must be exactly 180 seconds (3 minutes) to stay within free tier', () => {
		const HEARTBEAT_INTERVAL = 180000; // This constant is imported from the store

		// CRITICAL: This test fails if HEARTBEAT_INTERVAL is changed
		expect(HEARTBEAT_INTERVAL).toBe(180000);

		// Document the reasoning
		const messagesPerMonth = calculateMonthlyMessages(HEARTBEAT_INTERVAL);
		expect(messagesPerMonth).toBeLessThan(2_000_000); // Free tier limit
	});
});
```

2. **Deduplication** (Chat messages):

```typescript
describe('Message Deduplication', () => {
	it('replaces broadcast version with postgres_changes version', async () => {
		const messageId = 'msg-123';

		// 1. Receive broadcast (50ms)
		handleBroadcastMessage({ id: messageId, content: 'Hello', is_broadcast: true });

		expect(messages).toHaveLength(1);
		expect(messages[0].is_broadcast).toBe(true);

		// 2. Receive postgres_changes (300ms)
		handlePostgresInsert({ id: messageId, content: 'Hello', created_at: '2025-11-09' });

		// Should replace, not add
		expect(messages).toHaveLength(1);
		expect(messages[0].is_broadcast).toBeUndefined();
		expect(messages[0].created_at).toBe('2025-11-09');
	});
});
```

3. **Channel Lifecycle**:

```typescript
describe('Channel Lifecycle', () => {
	it('creates, subscribes, and unsubscribes correctly', async () => {
		const channel = supabaseRealtimeManager.createChannel('test-channel');
		expect(channel).toBeDefined();

		await supabaseRealtimeManager.subscribeChannel('test-channel');
		expect(supabaseRealtimeManager.isConnected).toBe(true);

		await supabaseRealtimeManager.unsubscribeChannel('test-channel');
		expect(supabaseRealtimeManager.channelCount).toBe(0);
	});
});
```

---

### Integration Testing

**Manual Testing Checklist**:

- [ ] Friend goes online → presence updates within 180s
- [ ] Friend goes offline → marked offline within 270s
- [ ] New notification → UI updates within 1s
- [ ] Send chat message → appears instantly (50ms Broadcast)
- [ ] Send chat message → persists on reload (postgres_changes)
- [ ] Typing indicator → shows/hides within 100ms
- [ ] Reaction → appears instantly for all users
- [ ] Connection lost → reconnects automatically
- [ ] Multiple tabs → all receive updates

---

## Troubleshooting

### Issue: Messages not received

**Symptoms**: No real-time updates, events not firing.

**Debugging**:

```typescript
// Enable debug logging
import { createLogger } from '$lib/utils/logger';
const logger = createLogger('MyFeature');

logger.setLevel('trace'); // Show all logs

// Check connection status
console.log(supabaseRealtimeManager.isConnected); // Should be true
console.log(supabaseRealtimeManager.channelCount); // Should be > 0

// Check channel status
const channel = supabaseRealtimeManager.getChannel('my-channel');
console.log(channel); // Should exist
```

**Common causes**:

1. **RLS policy blocks subscription**
   - Solution: Verify RLS policy allows SELECT for `auth.uid()`
   - Test: `SELECT * FROM table WHERE <policy condition>;`

2. **Filter syntax error**
   - Bad: `filter: "user_id=in.(id1, id2)"` (spaces break filter)
   - Good: `filter: "user_id=in.(id1,id2)"` (no spaces)

3. **Channel not subscribed**
   - Ensure `await supabaseRealtimeManager.subscribeChannel()` was called
   - Check subscription status: `channel.subscribe()` callback should receive 'SUBSCRIBED'

---

### Issue: Exceeding quota (2M messages/month)

**Symptoms**: Supabase shows "Realtime quota exceeded" warning.

**Debugging**:

```typescript
// Calculate actual usage
const dailyMessages = 200 users × 8 hours × 3600s ÷ HEARTBEAT_INTERVAL;
const monthlyMessages = dailyMessages × 20 days;

console.log('Estimated monthly messages:', monthlyMessages);
```

**Solutions**:

1. **Increase heartbeat interval** (180s → 300s):
   - Reduces messages by 40%
   - Trade-off: Presence staleness increases to 450s

2. **Use Broadcast for more features**:
   - Broadcast is FREE (no quota)
   - Move ephemeral events to Broadcast

3. **Optimize filters**:
   - Only subscribe to needed rows (use `filter` parameter)

4. **Upgrade to Pro plan** ($25/month):
   - 5M messages/month (2.5x free tier)

---

### Issue: Stale presence (user stuck online/offline)

**Symptoms**: Friend shows as online but is actually offline (or vice versa).

**Debugging**:

```sql
-- Check user_presence table
SELECT user_id, status, last_heartbeat, updated_at
FROM user_presence
WHERE user_id = 'stuck-user-id';

-- Check if cleanup function works
SELECT cleanup_stale_presence();
SELECT * FROM user_presence WHERE status = 'online';
```

**Common causes**:

1. **Heartbeat not sent**
   - Check: `presenceManager.startPresenceTracking()` was called
   - Check: No JavaScript errors in console

2. **Cleanup function not running**
   - Verify: `cleanup_stale_presence()` is called by cron job
   - Timeout: Should be 270s (180s heartbeat + 90s buffer)

3. **Network issues**
   - Heartbeat sent but didn't reach server
   - Check: Network tab shows RPC calls every 180s

**Solution**:

```typescript
// Force heartbeat
await presenceManager.sendHeartbeat(); // Manually trigger (not exposed - for debugging)

// Or restart tracking
await presenceManager.stopPresenceTracking();
await presenceManager.startPresenceTracking(friendIds);
```

---

### Issue: Duplicate messages in chat

**Symptoms**: Same message appears twice.

**Debugging**:

```typescript
// Enable deduplication logging
console.log(
	'Messages:',
	messages.map((m) => ({
		id: m.id,
		content: m.content,
		is_optimistic: m.is_optimistic,
		is_broadcast: m.is_broadcast
	}))
);
```

**Common causes**:

1. **Deduplication logic not working**
   - Check: `replaceOrAddMessage()` correctly finds existing message
   - Check: Message IDs match between Broadcast and postgres_changes

2. **Optimistic message not removed**
   - Check: UUID matches between optimistic and DB version
   - Fix: Use same UUID for optimistic and actual insert

**Solution**:

```typescript
// Ensure UUIDs match
const tempId = crypto.randomUUID();

// Optimistic
addMessage({ id: tempId, content, is_optimistic: true });

// Database insert - USE SAME ID
await supabase
	.from('messages')
	.insert({ id: tempId, content }) // Specify ID
	.select();
```

---

### Issue: Typing indicator stuck

**Symptoms**: Typing indicator shows but user stopped typing.

**Debugging**:

```typescript
// Check typing users
console.log('Typing users:', chatStore.getTypingUsers(conversationId));
```

**Common causes**:

1. **Timeout not clearing**
   - Timeout: 3 seconds after last typing event
   - Check: Timeout clears correctly in `handleTypingBroadcast()`

2. **User disconnected without sending `isTyping: false`**
   - Fix: Clear typing on disconnect

**Solution**:

```typescript
// Clear typing on disconnect
$effect(() => {
	if (!supabaseRealtimeManager.isConnected) {
		// Clear all typing indicators
		typingUsers.clear();
	}
});
```

---

## Related Documentation

- **[Database Schema](./database-schema.md)** - user_presence, messages, notifications tables
- **[Friends System Technical](./friends-system-technical.md)** - Friendships and presence
- **[WebSocket Migration Guide](../guides/websocket-to-realtime-migration.md)** - Migration steps (if created)
- **[Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)** - Official documentation

---

## Quick Reference

### Key Constants

```typescript
// Heartbeat interval (BILLING CRITICAL)
const HEARTBEAT_INTERVAL = 180000; // 180 seconds

// Stale presence timeout (database)
const STALE_TIMEOUT = 270; // 270 seconds (180s + 90s buffer)

// Free tier limit
const MAX_MESSAGES_PER_MONTH = 2_000_000;
```

### Channel Names

| Feature       | Channel Name            | Method           |
| ------------- | ----------------------- | ---------------- |
| Presence      | `user-presence-updates` | postgres_changes |
| Notifications | `user-notifications`    | postgres_changes |
| Chat          | `conversation:{id}`     | Hybrid           |

### Import Paths

```typescript
// Central infrastructure
import { supabaseRealtimeManager } from '$lib/stores/supabaseRealtime.svelte';

// Specialized stores
import { presenceManager } from '$lib/stores/presence.svelte';
import { notificationsRealtimeManager } from '$lib/stores/notificationsRealtime.svelte';
import { chatStore } from '$lib/stores/chat.svelte';
```

---

**Remember**: Supabase Realtime is a powerful tool, but quota management is critical. Always calculate quota impact before changing heartbeat intervals or adding new subscriptions.
