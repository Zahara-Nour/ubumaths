# Hybrid WebSocket + Ably Architecture Research

**Date**: 2025-11-09  
**Status**: Research/Planning Document  
**Focus**: Detailed analysis of implementing a hybrid real-time communication system

---

## Executive Summary

This document provides comprehensive research on implementing a **hybrid WebSocket + Ably architecture** for UbuMaths. The analysis evaluates the current WebSocket implementation, identifies which features should remain on custom WebSocket vs. migrate to Ably, and provides a concrete migration path.

**Key Finding**: A hybrid approach is viable and beneficial. Some features (presence, typing indicators) work well on lightweight WebSocket, while others (chat, notifications) would benefit from Ably's persistence and rich features.

---

## Part 1: Current WebSocket Architecture Deep Dive

### 1.1 Overview

The current architecture uses a **custom WebSocket server** for real-time presence tracking:

- **Server**: `src/lib/server/websocket-server.ts` (Node.js standalone, port 3001)
- **Client**: `src/lib/stores/websocket.svelte.ts` (Svelte 5 rune-based class)
- **Integration**: `src/lib/stores/chat.svelte.ts` and `src/lib/stores/friends.svelte.ts`

### 1.2 Server Architecture

**File**: `/Users/david/Coding/js/ubumaths/src/lib/server/websocket-server.ts`

**Port**: 3001 (runs independently from SvelteKit)

**Key Components**:

```
┌─────────────────────────────────────────┐
│  WebSocket Server (ws://localhost:3001) │
├─────────────────────────────────────────┤
│ 1. Connection Management                │
│    - Map<userId, WebSocket>             │
│    - JWT token authentication           │
│                                         │
│ 2. Message Routing                      │
│    - 6 message types handled            │
│    - Type-safe broadcast                │
│                                         │
│ 3. Database Integration                 │
│    - Supabase RPC calls                 │
│    - Presence table updates             │
│                                         │
│ 4. Maintenance Tasks                    │
│    - 60-second cleanup interval         │
│    - Stale connection removal           │
└─────────────────────────────────────────┘
```

### 1.3 Message Types (6 Total)

**Currently Implemented**:

| Message Type       | Direction                | Frequency              | Purpose               | Current Status             |
| ------------------ | ------------------------ | ---------------------- | --------------------- | -------------------------- |
| `auth`             | Client → Server          | Once at connect        | JWT authentication    | ✅ Active                  |
| `heartbeat`        | Client → Server          | Every 60 seconds       | Keep-alive signal     | ✅ Active                  |
| `presence_update`  | Server → Clients         | On login/logout        | Online/offline status | ✅ Active                  |
| `chat_message`     | Client → Server → Others | Variable (user-driven) | Broadcast new message | ✅ Defined, partially used |
| `typing_indicator` | Client → Server → Others | Variable (user-driven) | Show who's typing     | ✅ Defined, partially used |
| `message_read`     | Client → Server → Others | Variable (user-driven) | Read receipts         | ✅ Defined, partially used |
| `message_reaction` | Client → Server → Others | Variable (user-driven) | Emoji reactions       | ✅ Defined, partially used |

**Line References**:

- Message type definitions: lines 24-44 (server), lines 11-27 (client)
- Chat message handlers: server lines 210-234, client lines 567-569
- Typing indicators: server lines 236-255, client lines 570-572
- Message read: server lines 258-278, client lines 573-575
- Reactions: server lines 281-312, client lines 576-578

### 1.4 Current Message Flow

**Authentication Flow** (server lines 156-200):

```
1. Client creates WebSocket connection
2. Client sends { type: 'auth', token: 'jwt-token' }
3. Server calls supabase.auth.getUser(token) to verify
4. If valid:
   a. Add to connections Map<userId, ws>
   b. Call updatePresence(userId, 'online')
   c. Get friend IDs via getFriendIds(userId) RPC
   d. Broadcast presence_update to all friends
   e. Send auth_success confirmation
5. If invalid: close connection with error
```

**Presence Update Flow** (server lines 112-122):

```
1. WebSocket receives 'presence_update' from server
2. Client stores in friendsPresence Map
3. UI subscribes to friendsPresence and re-renders
4. OnlineStatus.svelte component shows green/gray dot
```

**Broadcast Logic** (server lines 124-139):

```typescript
function broadcastToUsers(userIds: string[], message: BroadcastMessage): void {
	userIds.forEach((userId) => {
		const ws = connections.get(userId);
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(message));
		}
	});
}
```

### 1.5 Database Integration

**RPC Functions Called**:

1. **`get_friend_ids(p_user_id UUID)`** (lines 86-95)
   - Returns list of accepted friend IDs
   - Called on connect/disconnect to target broadcast
   - Query: Get all friends where status = 'accepted'

2. **`upsert_user_presence(p_user_id UUID, p_status TEXT)`** (lines 113-122)
   - Insert/update presence status and last_heartbeat
   - Called on connect/disconnect/heartbeat
   - Ensures presence table is always in sync

3. **`cleanup_stale_presence()`** (lines 354-359)
   - Runs every 60 seconds
   - Marks users offline if no heartbeat in 2 minutes
   - Handles network failures gracefully

**Presence Table Schema** (inferred from code):

```sql
user_presence {
  user_id UUID (PRIMARY KEY)
  status: 'online' | 'offline'
  last_heartbeat: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

**Friendships Table** (inferred from code):

```sql
friendships {
  requester_id UUID
  addressee_id UUID
  status: 'accepted' | 'pending' | 'rejected'
  created_at TIMESTAMPTZ
}
```

### 1.6 Client Store Architecture

**File**: `/Users/david/Coding/js/ubumaths/src/lib/stores/websocket.svelte.ts`

**Reactive State**:

```typescript
friendsPresence = $state<Map<string, 'online' | 'offline'>>(new Map());
connectionStatus = $state<'connected' | 'disconnected' | 'connecting'>('disconnected');
```

**Connection Lifecycle**:

```
1. connect(userId, token) called
   ↓
2. establishConnection() creates WebSocket
   ↓
3. onopen: sends auth message, starts heartbeat
   ↓
4. heartbeat every 60 seconds (setInterval)
   ↓
5. onmessage: handles presence_update
   ↓
6. onclose/onerror: scheduleReconnect with exponential backoff
```

**Reconnection Strategy** (lines 194-210):

- Base delay: 1 second
- Max delay: 30 seconds
- Formula: `min(1000 * 2^attempts, 30000)`
- Example progression: 1s → 2s → 4s → 8s → 16s → 30s → 30s...

### 1.7 Current Feature Integration

**Friends System** (uses WebSocket for presence):

- File: `src/lib/stores/friends.svelte.ts` (line 3: imports websocketManager)
- Usage: `getFriendPresence(friendId)` calls `websocketManager.getFriendPresence(friendId)`
- Component: `src/lib/components/FriendsList.svelte` displays online status via WebSocket
- Route: `/dashboard/friends` shows real-time friend presence

**Chat System** (WebSocket message types defined but not fully integrated):

- File: `src/lib/stores/chat.svelte.ts` (line 19: imports websocketManager)
- Sends: `chat_message`, `typing_indicator`, `message_read`, `message_reaction`
- Receives: Not yet wired (placeholder at line 126-130)
- Status: Infrastructure ready but reception logic incomplete

**Teacher Dashboard**:

- File: `src/routes/(protected)/dashboard/admin/friendships/+page.svelte`
- Purpose: Moderation of friendships
- Real-time needs: Could benefit from activity monitoring

### 1.8 Performance Characteristics

**Current Performance**:

- **Connections**: One per authenticated user
- **Memory per connection**: ~2-5 KB (minimal overhead)
- **Bandwidth**: ~100 bytes/minute (heartbeat only, until chat used)
- **Latency**: <50ms (local network, same server)
- **Database writes**: 1 write/minute per user (heartbeat)

**Scalability Limits**:

- **Current setup**: Suitable for 100-1000 concurrent connections
- **Single process limitation**: All connections handled by one Node.js process
- **Memory ceiling**: ~500 MB for 10,000 connections
- **CPU scaling**: Linear with connection count

---

## Part 2: Responsibility Separation Analysis

### 2.1 Feature Matrix

| Feature                        | Current Implementation | Message Type     | Frequency             | Persistence        | History | Candidate for                 |
| ------------------------------ | ---------------------- | ---------------- | --------------------- | ------------------ | ------- | ----------------------------- |
| **Friend Presence**            | WebSocket ✅           | presence_update  | Low (on login/logout) | DB (user_presence) | No      | Stay WebSocket                |
| **Chat Messages**              | Partial (DB only)      | chat_message     | Variable              | DB (messages)      | Yes     | Ably (better)                 |
| **Typing Indicators**          | Defined, unused        | typing_indicator | High (while typing)   | No                 | No      | Stay WebSocket                |
| **Message Read Receipts**      | Defined, unused        | message_read     | Variable              | DB                 | No      | Ably (better)                 |
| **Emoji Reactions**            | Defined, unused        | message_reaction | Low                   | DB                 | No      | Either (Ably slight edge)     |
| **Notifications**              | Not implemented        | N/A              | Variable              | DB                 | Yes     | Ably (better)                 |
| **Teacher Dashboard Activity** | Not implemented        | N/A              | High                  | DB                 | Maybe   | Either (WebSocket for speed)  |
| **Gifting/Transactions**       | Not implemented        | N/A              | Low                   | DB                 | Yes     | Either (Ably for audit trail) |

### 2.2 Decision Criteria

**Stay on Custom WebSocket** (criteria: ✓✓✓ on all):

```
✓ Ephemeral (no persistence needed)
✓ Low-frequency or simple broadcasts
✓ Requires minimal latency
✓ No history requirement
✓ No complex message delivery guarantees
```

**Migrate to Ably** (criteria: ✓ on most):

```
✓ Requires persistence/history
✓ Complex delivery guarantees needed
✓ Multi-room/channel management required
✓ Server-side processing needed
✓ Mobile-friendly presence tracking
```

### 2.3 Detailed Feature Analysis

#### Friend Presence

**Current**: Custom WebSocket ✅  
**Recommendation**: KEEP on WebSocket

**Reasoning**:

- Ephemeral data (online/offline only)
- No history needed
- Simple broadcast to friends list
- Low frequency (only on login/logout)
- Minimal persistence (just last_heartbeat)

**Characteristics**:

- Message type: `presence_update`
- Frequency: 1-2 per login/logout
- Payload: `{ userId, status }`
- Target users: Friends only (via RPC lookup)

**WebSocket Advantage**: Lightweight, no database reads per broadcast

---

#### Chat Messages

**Current**: Partial (stored in DB, no real-time broadcast)  
**Recommendation**: MIGRATE to Ably

**Reasoning**:

- Requires persistent storage (messages table)
- Needs message history (pagination)
- Complex delivery: multiple recipients, different permissions
- Requires read receipts and reactions (meta-messages)
- Mobile users expect offline-first sync
- Server-side filtering/validation needed

**Characteristics**:

- Message type: `chat_message`
- Frequency: User-driven (0-100/minute depending on activity)
- Payload: `{ conversationId, messageId, content, attachments, sender }`
- Target users: All conversation participants
- Persistence: Required (messages table)
- History: Required for pagination

**Current Implementation Gaps**:

- Chat store defines handler but doesn't wire reception (line 126-130)
- No real-time sync when participants receive messages
- Server broadcasts to participants but client doesn't re-render

**Ably Advantage**:

- Built-in history (100+ messages)
- Automatic multi-device sync
- Typing indicators as separate channel
- Better for offline-first apps
- Less server code (Ably handles routing)

---

#### Typing Indicators

**Current**: Message type defined, not used  
**Recommendation**: KEEP on WebSocket (or Ably secondary)

**Reasoning**:

- Ephemeral (3-second timeout in chat store, line 618-627)
- Simple broadcast to conversation participants
- No persistence needed
- High frequency while typing
- Minimal payload

**Characteristics**:

- Message type: `typing_indicator`
- Frequency: 1-2 per second while user typing
- Payload: `{ conversationId, userId, isTyping }`
- Target users: Other conversation participants
- Timeout: 3 seconds client-side

**WebSocket Advantage**: Very lightweight, no persistence overhead

**Alternative**: Ably channels provide good ephemeral support too

---

#### Message Read Receipts

**Current**: Message type defined, not used  
**Recommendation**: MIGRATE to Ably

**Reasoning**:

- Requires database persistence (notification_reads table exists)
- Multiple read states per message (who read, when)
- Part of message metadata flow
- Better with Ably's persistent channels
- Less code on WebSocket side

**Characteristics**:

- Message type: `message_read`
- Frequency: Once per conversation view
- Payload: `{ conversationId, userId, messageId, readAt }`
- Target users: Message sender and other participants
- Persistence: Required for UI state

**Ably Advantage**: Attach to message as metadata, built-in synchronization

---

#### Emoji Reactions

**Current**: Message type defined, stored in DB  
**Recommendation**: MIGRATE to Ably

**Reasoning**:

- Requires database persistence (message_reactions table)
- Multiple reactions per message
- Easier to manage as message metadata in Ably
- Server-side RPC (`toggle_reaction`) already exists
- Better sync across devices

**Characteristics**:

- Message type: `message_reaction`
- Frequency: Low (user action)
- Payload: `{ messageId, userId, emoji, action: 'add'|'remove' }`
- Target users: All message viewers
- Persistence: Required (message_reactions table)

**Current Implementation** (lines 393-422):

- Chat store calls `toggle_reaction` RPC
- Broadcasts via WebSocket
- Reloads reactions via `get_message_reaction_counts` RPC

**Ably Advantage**: Reactions as first-class message features

---

#### Notifications System

**Current**: Not implemented (infrastructure exists in DB)  
**Recommendation**: IMPLEMENT on Ably

**Reasoning**:

- Requires persistence (notifications table)
- Needs history (user should see past notifications)
- Complex delivery (filtering by recipient, type, class)
- Server-side generation (triggerred by other events)
- Mobile notification integration needed
- Better with Ably's server API

**Database Support** (inferred from types):

```
notifications {
  id UUID
  created_by UUID
  notification_type TEXT
  recipient_id UUID | NULL (NULL = broadcast)
  title TEXT
  content TEXT
  metadata JSON
  created_at TIMESTAMPTZ
}

notification_reads {
  notification_id UUID
  user_id UUID
  read_at TIMESTAMPTZ
}
```

**Characteristics**:

- Frequency: Variable (event-driven)
- Payload: `{ title, content, metadata, type }`
- Target: Single user or broadcast
- Persistence: Required
- History: Required (notification center)

**Ably Advantage**:

- Server-side publication from backend
- Per-user channels for targeting
- Built-in history
- Mobile push integration support

---

#### Teacher Dashboard Real-Time Activity

**Current**: Not implemented  
**Recommendation**: KEEP on WebSocket (if needed)

**Reasoning**:

- High-frequency activity stream
- No persistence requirement (just real-time view)
- Simple broadcast to dashboard viewers
- Could be implemented as separate WebSocket message type

**Characteristics**:

- Frequency: High (student actions)
- Payload: `{ studentId, action, timestamp }`
- Target users: Teachers in same class
- Persistence: No (UI only)
- Timeout: Activity log expires on page refresh

**WebSocket Advantage**: Simple, fast, no database overhead

**Alternative**: Supabase Realtime (built-in to Supabase, simpler)

---

#### Gifting System (Future)

**Current**: Not implemented  
**Recommendation**: MIGRATE to Ably

**Reasoning**:

- Database persistence (gift_transactions table)
- Audit trail needed
- Server-side validation required
- Complex rules (VIP card inventory, limits)
- Notifications on gift received

**Characteristics**:

- Frequency: Low (user action)
- Payload: `{ giftType, amount, sender, recipient }`
- Target: Recipient user
- Persistence: Required
- History: Audit trail

**Ably Advantage**: Better for server-side generation and audit

---

### 2.4 Conflict Analysis

**Potential Conflicts**:

1. **Presence Tracking**
   - WebSocket: Custom implementation with heartbeat
   - Ably: Built-in presence channels
   - **Resolution**: Keep WebSocket for now (working well), can migrate later if scaling requires

2. **Typing Indicators**
   - WebSocket: Defined but not used
   - Ably: Ephemeral channels support
   - **Resolution**: Implement on WebSocket first, Ably if load requires

3. **Message Delivery Guarantees**
   - WebSocket: Best-effort (no retry on disconnect)
   - Ably: At-least-once delivery
   - **Resolution**: Chat messages → Ably (needs guarantee), typing → WebSocket (ephemeral)

---

## Part 3: Integration Patterns

### 3.1 Initialization Strategy

**Parallel Initialization Approach**:

```typescript
// src/lib/stores/realtime.svelte.ts (new unified store)

class RealtimeManager {
	private websocketManager = websocketManager;
	private ablyClient: Ably.Realtime | null = null;

	async init(userId: string, token: string, ablyToken?: string): Promise<void> {
		// Initialize both in parallel
		await Promise.all([this.initWebSocket(userId, token), this.initAbly(userId, ablyToken)]);
	}

	private initWebSocket(userId: string, token: string): Promise<void> {
		return new Promise((resolve) => {
			this.websocketManager.connect(userId, token);
			// Wait for connection
			const checkConnection = setInterval(() => {
				if (this.websocketManager.connectionStatus === 'connected') {
					clearInterval(checkConnection);
					resolve();
				}
			}, 100);
			// Timeout after 10 seconds
			setTimeout(() => {
				clearInterval(checkConnection);
				resolve();
			}, 10000);
		});
	}

	private async initAbly(userId: string, ablyToken?: string): Promise<void> {
		if (!ablyToken) {
			console.warn('Ably token not provided, skipping Ably init');
			return;
		}

		try {
			const Ably = (await import('ably')).default;
			this.ablyClient = new Ably.Realtime({ token: ablyToken });

			await new Promise<void>((resolve, reject) => {
				this.ablyClient!.connection.on('connected', () => resolve());
				setTimeout(() => reject(new Error('Ably connection timeout')), 10000);
			});
		} catch (error) {
			console.error('Failed to initialize Ably:', error);
			// Continue without Ably (graceful degradation)
		}
	}
}
```

### 3.2 Shared Authentication

**Strategy**: Use existing JWT for both systems

```typescript
// Backend: Generate Ably token from JWT

// In +page.server.ts or API endpoint
import { createClient } from '@supabase/supabase-js';
import Ably from 'ably/promises';

export async function load({ locals }) {
	const supabase = locals.supabase;
	const session = await locals.getSession();

	// Generate Ably token (valid for 1 hour)
	const ablyClient = new Ably.Rest({
		key: process.env.ABLY_API_KEY
	});

	const ablyToken = (
		await ablyClient.auth.createTokenRequest({
			clientId: session.user.id,
			ttl: 3600000, // 1 hour
			capability: {
				[`presence:${session.user.id}`]: ['subscribe', 'publish'],
				[`chat:*`]: ['subscribe', 'history'],
				[`notifications:${session.user.id}`]: ['subscribe', 'history']
			}
		})
	).token;

	return {
		ablyToken,
		accessToken: session.access_token
	};
}

// Client: Initialize both with tokens
websocketManager.connect(userId, accessToken);
ablyManager.connect(userId, ablyToken);
```

**Benefits**:

- Single authentication point (Supabase)
- Ably tokens scoped by user ID (security)
- Token refresh handled by Ably SDK
- Capability matrix enforces channel permissions

### 3.3 Unified Store Interface

**Goal**: Abstract away the difference between WebSocket and Ably

```typescript
// src/lib/stores/realtime.svelte.ts

interface RealtimeEvent {
	type: 'presence_update' | 'chat_message' | 'typing_indicator' | 'notification';
	data: unknown;
}

class RealtimeManager {
	private eventHandlers = new Map<string, (data: unknown) => void>();

	on(eventType: string, handler: (data: unknown) => void): void {
		this.eventHandlers.set(eventType, handler);
	}

	// Presence (WebSocket)
	subscribePresence(friendIds: string[]): void {
		this.websocketManager.on('presence_update', (data) => {
			this.eventHandlers.get('presence_update')?.(data);
		});
	}

	// Chat (Ably)
	subscribeChat(conversationId: string): void {
		const channel = this.ablyClient!.channels.get(`chat:${conversationId}`);
		channel.subscribe('message', (msg) => {
			this.eventHandlers.get('chat_message')?.(msg.data);
		});
	}

	// Notifications (Ably)
	subscribeNotifications(): void {
		const channel = this.ablyClient!.channels.get(`notifications:${this.userId}`);
		channel.subscribe('notification', (msg) => {
			this.eventHandlers.get('notification')?.(msg.data);
		});
	}
}
```

### 3.4 Connection State Management

**Unified Status**:

```typescript
connectionState = $state<{
	websocket: 'connected' | 'disconnected' | 'connecting';
	ably: 'connected' | 'disconnected' | 'connecting';
	overall: 'healthy' | 'degraded' | 'offline';
}>({
	websocket: 'disconnected',
	ably: 'disconnected',
	overall: 'offline'
});

$effect(() => {
	const ws = this.connectionState.websocket;
	const ably = this.connectionState.ably;

	if (ws === 'connected' && ably === 'connected') {
		this.connectionState.overall = 'healthy';
	} else if (ws === 'connected' || ably === 'connected') {
		this.connectionState.overall = 'degraded';
	} else {
		this.connectionState.overall = 'offline';
	}
});
```

### 3.5 Duplicate Message Prevention

**Challenge**: Message could arrive via both WebSocket and Ably

**Solution**: Idempotency keys + deduplication

```typescript
// Chat store
private processedMessageIds = new Set<string>();

async handleChatMessage(message: ChatMessage): Promise<void> {
  // Skip if already processed
  if (this.processedMessageIds.has(message.id)) {
    return;
  }

  // Mark as processed
  this.processedMessageIds.add(message.id);

  // Clean up old IDs (keep only recent 1000)
  if (this.processedMessageIds.size > 1000) {
    const idsArray = Array.from(this.processedMessageIds);
    idsArray.slice(0, -1000).forEach(id =>
      this.processedMessageIds.delete(id)
    );
  }

  // Process message
  this.addMessage(message);
}

// When sending, include messageId
const messageId = crypto.randomUUID();
const message = { id: messageId, content, ... };

// Send via both systems
websocketManager.send({ type: 'chat_message', ...message });
ablyManager.send('chat_message', message); // if available

// Mark as processed immediately (optimistic)
this.processedMessageIds.add(messageId);
```

### 3.6 Error Handling and Fallback

**Graceful Degradation**:

```typescript
class HybridRealtimeManager {
	async sendMessage(msg: ChatMessage): Promise<boolean> {
		let succeeded = false;

		// Try Ably first (more reliable)
		if (this.ablyClient?.connection.state === 'connected') {
			try {
				await this.ablyClient!.channels.get(`chat:${msg.conversationId}`).publish('message', msg);
				succeeded = true;
			} catch (error) {
				console.error('Ably send failed, trying WebSocket:', error);
			}
		}

		// Fallback to WebSocket
		if (!succeeded && this.websocketManager.connectionStatus === 'connected') {
			try {
				this.websocketManager.send({
					type: 'chat_message',
					...msg
				});
				succeeded = true;
			} catch (error) {
				console.error('WebSocket send failed:', error);
			}
		}

		if (!succeeded) {
			throw new Error('All real-time channels unavailable');
		}

		return succeeded;
	}
}
```

---

## Part 4: Code Organization

### 4.1 Proposed Directory Structure

```
src/
├── lib/
│   ├── stores/
│   │   ├── websocket.svelte.ts          # Keep: Custom WebSocket manager
│   │   ├── ably.svelte.ts               # New: Ably manager
│   │   ├── realtime.svelte.ts           # New: Unified manager
│   │   ├── websocket.test.ts            # Keep: WebSocket tests
│   │   ├── ably.test.ts                 # New: Ably tests
│   │   ├── chat.svelte.ts               # Modify: Use unified store
│   │   ├── friends.svelte.ts            # Modify: Minor tweaks
│   │   └── notifications.svelte.ts      # New: Notification manager
│   │
│   ├── server/
│   │   ├── websocket-server.ts          # Keep: Custom WebSocket
│   │   ├── realtime/                    # New: Realtime utilities
│   │   │   ├── presence.ts              # Presence management
│   │   │   ├── chat.ts                  # Chat utilities
│   │   │   ├── notifications.ts         # Notification generation
│   │   │   └── ably-server.ts           # Ably server integration
│   │   └── validation/
│   │       ├── realtime.ts              # New: Realtime message validation
│   │       └── ...existing
│   │
│   ├── types/
│   │   ├── realtime.ts                  # New: Unified message types
│   │   ├── chat.ts                      # Modify: Update types
│   │   └── database.ts                  # Existing
│   │
│   └── config/
│       └── realtime.ts                  # New: Configuration
│
└── routes/
    └── api/
        ├── realtime/
        │   ├── ably-token/+server.ts    # New: Generate Ably tokens
        │   └── presence/+server.ts      # New: Presence endpoints
        └── ...existing
```

### 4.2 WebSocket Store (Keep with Minor Changes)

**File**: `src/lib/stores/websocket.svelte.ts`

**Changes Needed**:

- Add `messageEventHandler` callback for non-presence messages
- Add method to subscribe to chat/reaction/read messages
- Keep all existing functionality

```typescript
class WebSocketManager {
	private messageHandlers = new Map<string, (msg: unknown) => void>();

	// Keep existing: connect, disconnect, send, heartbeat, reconnect

	// NEW: Event subscription
	on(type: string, handler: (data: unknown) => void): void {
		this.messageHandlers.set(type, handler);
	}

	// Keep handleMessage but route to handlers
	private handleMessage(event: MessageEvent): void {
		const message = JSON.parse(event.data);

		switch (message.type) {
			case 'presence_update':
				this.friendsPresence.set(message.userId, message.status);
				break;
			case 'chat_message':
			case 'typing_indicator':
			case 'message_read':
			case 'message_reaction':
				this.messageHandlers.get(message.type)?.(message);
				break;
		}
	}
}
```

**Impact**: Minimal, backward compatible

### 4.3 New Ably Store

**File**: `src/lib/stores/ably.svelte.ts` (new)

```typescript
import { browser } from '$app/environment';
import type Ably from 'ably';

class AblyManager {
	private client: Ably.Realtime | null = null;
	private userId: string | null = null;
	private channels = new Map<string, Ably.RealtimeChannel>();

	connectionState = $state<'connected' | 'disconnected' | 'connecting'>('disconnected');

	async init(userId: string, token: string): Promise<void> {
		if (!browser) return;

		this.userId = userId;

		try {
			const AblyModule = await import('ably');
			this.client = new AblyModule.default.Realtime({ token });

			this.client.connection.on('connected', () => {
				this.connectionState = 'connected';
			});

			this.client.connection.on('disconnected', () => {
				this.connectionState = 'disconnected';
			});

			this.client.connection.on('failed', () => {
				this.connectionState = 'disconnected';
			});
		} catch (error) {
			console.error('Failed to initialize Ably:', error);
			this.connectionState = 'disconnected';
		}
	}

	// Channel management
	getChannel(name: string): Ably.RealtimeChannel | null {
		if (!this.client) return null;

		if (!this.channels.has(name)) {
			this.channels.set(name, this.client.channels.get(name));
		}

		return this.channels.get(name) || null;
	}

	// Subscribe to channel events
	subscribe(
		channelName: string,
		eventName: string,
		handler: (msg: Ably.Message) => void
	): () => void {
		const channel = this.getChannel(channelName);
		if (!channel) return () => {};

		channel.subscribe(eventName, handler);

		// Return unsubscribe function
		return () => channel.unsubscribe(eventName, handler);
	}

	// Publish event
	async publish(channelName: string, eventName: string, data: unknown): Promise<void> {
		const channel = this.getChannel(channelName);
		if (!channel) throw new Error(`Channel ${channelName} not available`);

		await channel.publish(eventName, data);
	}

	disconnect(): void {
		if (this.client) {
			this.client.close();
			this.client = null;
		}
		this.connectionState = 'disconnected';
	}
}

export const ablyManager = new AblyManager();
```

### 4.4 Unified Realtime Store

**File**: `src/lib/stores/realtime.svelte.ts` (new)

```typescript
import { websocketManager } from './websocket.svelte';
import { ablyManager } from './ably.svelte';

class RealtimeManager {
	connectionState = $state<'healthy' | 'degraded' | 'offline'>('offline');

	async init(userId: string, wsToken: string, ablyToken?: string): Promise<void> {
		// Start both in parallel
		const wsPromise = this.initWebSocket(userId, wsToken);
		const ablyPromise = ablyToken ? this.initAbly(userId, ablyToken) : Promise.resolve();

		await Promise.allSettled([wsPromise, ablyPromise]);
		this.updateConnectionState();
	}

	private async initWebSocket(userId: string, token: string): Promise<void> {
		return new Promise((resolve) => {
			websocketManager.connect(userId, token);
			const timeout = setTimeout(resolve, 5000);

			const checkConnection = setInterval(() => {
				if (websocketManager.connectionStatus === 'connected') {
					clearInterval(checkConnection);
					clearTimeout(timeout);
					resolve();
				}
			}, 100);
		});
	}

	private async initAbly(userId: string, token: string): Promise<void> {
		await ablyManager.init(userId, token);
	}

	private updateConnectionState(): void {
		const wsConnected = websocketManager.connectionStatus === 'connected';
		const ablyConnected = ablyManager.connectionState === 'connected';

		if (wsConnected && ablyConnected) {
			this.connectionState = 'healthy';
		} else if (wsConnected || ablyConnected) {
			this.connectionState = 'degraded';
		} else {
			this.connectionState = 'offline';
		}
	}

	disconnect(): void {
		websocketManager.disconnect();
		ablyManager.disconnect();
		this.connectionState = 'offline';
	}
}

export const realtimeManager = new RealtimeManager();
```

### 4.5 Chat Store Updates

**File**: `src/lib/stores/chat.svelte.ts` (modifications)

**Current Issues**:

- Line 19: Imports websocketManager
- Lines 113-131: WebSocket subscription placeholder
- Line 329-335: Sends chat_message but no reception

**Changes**:

```typescript
import { websocketManager } from './websocket.svelte';
import { ablyManager } from './ably.svelte';

// In init():
private subscribeToWebSocket(): void {
  if (!browser) return;

  // Subscribe to WebSocket chat events
  websocketManager.on('chat_message', (msg) => {
    this.handleIncomingMessage(msg);
  });

  websocketManager.on('typing_indicator', (msg) => {
    this.handleTypingIndicator(msg);
  });

  websocketManager.on('message_reaction', (msg) => {
    this.handleMessageReaction(msg);
  });
}

// NEW: Subscribe to Ably chat events
private subscribeToAbly(conversationId: string): void {
  if (!this.supabase) return;

  const unsubscribe = ablyManager.subscribe(
    `chat:${conversationId}`,
    'message',
    (msg) => {
      this.handleIncomingMessage(msg.data);
    }
  );

  // Store for cleanup on conversation switch
  // ...
}

// Update sendMessage to try both
async sendMessage(...): Promise<Message | null> {
  // ... existing code ...

  // Broadcast via Ably (preferred)
  if (ablyManager.connectionState === 'connected') {
    try {
      await ablyManager.publish(`chat:${conversationId}`, 'message', {
        type: 'chat_message',
        id: message.id,
        content: message.content,
        sender_id: this.userId,
        created_at: message.created_at,
        attachments: attachmentRecords
      });
    } catch (error) {
      console.error('Ably publish failed, falling back to WebSocket:', error);
      // Fall through to WebSocket
    }
  }

  // Fallback to WebSocket
  websocketManager.send({
    type: 'chat_message',
    conversationId,
    messageId: message.id,
    content: message.content,
    attachments: attachmentRecords
  });

  return message;
}
```

### 4.6 New Notification Store

**File**: `src/lib/stores/notifications.svelte.ts` (new)

```typescript
import { browser } from '$app/environment';
import { ablyManager } from './ably.svelte';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface Notification {
	id: string;
	title: string;
	content: string;
	type: 'friend_request' | 'message' | 'mention' | 'assignment' | 'system';
	read_at: string | null;
	created_at: string;
	metadata?: Record<string, unknown>;
}

class NotificationStore {
	notifications = $state<Notification[]>([]);
	unreadCount = $state(0);
	isLoading = $state(false);

	private supabase: SupabaseClient | null = null;
	private userId: string | null = null;

	init(supabase: SupabaseClient, userId: string): void {
		if (!browser) return;

		this.supabase = supabase;
		this.userId = userId;

		this.loadNotifications();
		this.subscribeToNewNotifications();
	}

	private async loadNotifications(): Promise<void> {
		if (!this.supabase || !this.userId) return;

		this.isLoading = true;

		try {
			const { data, error } = await this.supabase
				.from('notifications')
				.select('*')
				.eq('recipient_id', this.userId)
				.order('created_at', { ascending: false })
				.limit(50);

			if (error) throw error;

			this.notifications = data || [];
			this.unreadCount = this.notifications.filter((n) => !n.read_at).length;
		} finally {
			this.isLoading = false;
		}
	}

	private subscribeToNewNotifications(): void {
		if (!this.userId) return;

		// Subscribe via Ably for real-time updates
		ablyManager.subscribe(`notifications:${this.userId}`, 'notification', (msg) => {
			const notification = msg.data as Notification;
			this.notifications.unshift(notification);
			if (!notification.read_at) {
				this.unreadCount++;
			}
		});
	}

	async markAsRead(notificationId: string): Promise<void> {
		if (!this.supabase) return;

		// Update database
		const { error } = await this.supabase.from('notification_reads').upsert({
			notification_id: notificationId,
			user_id: this.userId,
			read_at: new Date().toISOString()
		});

		if (error) throw error;

		// Update local state
		const notif = this.notifications.find((n) => n.id === notificationId);
		if (notif && !notif.read_at) {
			notif.read_at = new Date().toISOString();
			this.unreadCount--;
		}
	}
}

export const notificationStore = new NotificationStore();
```

---

## Part 5: Migration Path

### 5.1 Phase 1: Foundation (Weeks 1-2)

**Goal**: Set up Ably integration alongside WebSocket

**Tasks**:

1. **Setup Ably Account**
   - Create Ably account at ably.com
   - Create API key
   - Add to environment variables: `ABLY_API_KEY`

2. **Create Ably Token Endpoint**
   - File: `src/routes/api/realtime/ably-token/+server.ts`
   - Generates Ably token request from backend
   - Scoped to user ID with specific capabilities
   - TTL: 1 hour

3. **Implement Ably Store**
   - File: `src/lib/stores/ably.svelte.ts`
   - Connection management
   - Channel subscription
   - Event publishing
   - Error handling

4. **Update WebSocket Store**
   - Add event handler registration (minimal change)
   - Maintain backward compatibility
   - Test existing friends feature

5. **Tests**
   - Unit tests for Ably manager
   - Connection lifecycle tests
   - Error handling tests

**Success Criteria**:

- Ably connects successfully alongside WebSocket
- No impact on existing features
- Ably token generation working
- All tests passing

---

### 5.2 Phase 2: Chat Migration (Weeks 3-4)

**Goal**: Migrate chat messages to Ably

**Tasks**:

1. **Update Chat Store**
   - Wire Ably subscription in `subscribeToAbly()`
   - Update `sendMessage()` to publish to Ably
   - Implement fallback to WebSocket

2. **Create Chat Channel Subscription**
   - Subscribe when conversation opened
   - Unsubscribe when conversation closed
   - Handle channel history pagination

3. **Update UI Components**
   - Chat window shows "via Ably" vs "via WebSocket" badge (dev only)
   - Test real-time message delivery
   - Verify typing indicators still work

4. **Database Updates**
   - No schema changes needed
   - Messages already stored via RPC
   - Ably just adds real-time delivery

5. **Tests**
   - Chat message delivery tests
   - Offline message handling
   - Conversation switching
   - Multi-device sync

**Success Criteria**:

- Chat messages arrive via Ably in real-time
- WebSocket fallback works
- Typing indicators continue to work
- Message persistence unchanged
- All tests passing

---

### 5.3 Phase 3: Read Receipts & Reactions (Week 5)

**Goal**: Add real-time read receipts and reactions via Ably

**Tasks**:

1. **Wire Read Receipt Updates**
   - Subscribe to `chat:conversationId` 'message_read' event
   - Update local message state
   - Show read indicator in UI

2. **Wire Reaction Updates**
   - Subscribe to 'message_reaction' event
   - Update reactions count
   - Show emoji picker with live count

3. **Update Chat Store**
   - `toggleReaction()` publishes to Ably
   - `markAsRead()` publishes read receipt

4. **Tests**
   - Reaction delivery
   - Read receipt delivery
   - Reaction count synchronization

**Success Criteria**:

- Read receipts show in real-time
- Emoji reactions update live
- WebSocket fallback available
- All tests passing

---

### 5.4 Phase 4: Notifications (Week 6)

**Goal**: Implement notification system via Ably

**Tasks**:

1. **Create Notification Store**
   - File: `src/lib/stores/notifications.svelte.ts`
   - Load notification history
   - Subscribe to real-time updates
   - Mark as read

2. **Create Notification Bell Component**
   - Show unread count
   - Dropdown with recent notifications
   - Link to notification center

3. **Notification Center Page**
   - Route: `/dashboard/notifications`
   - List all notifications
   - Mark as read/archive
   - Filter by type

4. **Create Notification Generation**
   - Backend generates notifications on events
   - Friend request received
   - Message received (optional, could be silent)
   - Assignment deadline
   - System announcements

5. **Tests**
   - Notification generation
   - Real-time delivery
   - History loading
   - Mark as read

**Success Criteria**:

- Users receive notifications in real-time
- Notification history persists
- Unread count accurate
- All tests passing

---

### 5.5 Phase 5: Optimization (Week 7)

**Goal**: Optimize and monitor hybrid system

**Tasks**:

1. **Add Monitoring**
   - Track connection state
   - Measure latency for each system
   - Log fallback events
   - Monitor error rates

2. **Performance Testing**
   - Load test with 1000 concurrent users
   - Measure bandwidth usage
   - Profile memory usage
   - Test mobile performance

3. **Documentation**
   - Update CLAUDE.md with Ably setup
   - Add monitoring guide
   - Document fallback behavior
   - Troubleshooting guide

4. **Feature Flags**
   - Feature flag for Ably chat
   - Feature flag for notifications
   - Gradual rollout capability

5. **Tests**
   - End-to-end tests
   - Network failure scenarios
   - Token expiration handling
   - Cleanup on disconnect

**Success Criteria**:

- System performs well under load
- Monitoring/observability in place
- Documentation complete
- Feature flags working

---

### 5.6 Phase 6: Teacher Features (Week 8)

**Goal**: Add real-time features for teacher dashboards

**Tasks**:

1. **Student Activity Stream**
   - Track student actions (exercise completed, riddle attempted, etc.)
   - Broadcast via WebSocket or Ably
   - Show in teacher dashboard
   - Filterable by student/class

2. **Real-time Class Status**
   - Show students online
   - Show current activity
   - Last login timestamp

3. **Assignment Notifications**
   - Teacher assigns exercise/riddle
   - Students receive notification
   - Students see in assignment list
   - Teacher sees acceptance status

4. **Tests**
   - Activity stream delivery
   - Filtering
   - Permission checks

**Success Criteria**:

- Teachers see real-time student activity
- Assignments notify students instantly
- All tests passing

---

### 5.7 Rollback Strategy

**If Issues Occur**:

1. **Feature Flags**

   ```typescript
   // In +page.svelte
   const useAblyChat = $derived(features.ablyChat ?? false);

   if (useAblyChat) {
   	subscribeAblyChat();
   } else {
   	subscribeWebSocketChat();
   }
   ```

2. **Graceful Degradation**
   - If Ably fails, fall back to WebSocket
   - If WebSocket fails, fall back to Ably (if available)
   - If both fail, show offline state
   - Show toast notification on degradation

3. **Monitoring Alerts**
   - Alert if Ably unavailable for >1 minute
   - Alert if fallback rate >10%
   - Alert if error rate >1%

4. **Quick Rollback**
   - Disable Ably via feature flag
   - No code deployment needed
   - Users automatically revert to WebSocket
   - Monitor error rates decrease

**Rollback Checklist**:

- [ ] Disable Ably feature flag
- [ ] Monitor error logs
- [ ] Verify users on WebSocket
- [ ] Check performance metrics
- [ ] Communicate with team

---

## Part 6: Use Case Analysis

### 6.1 Friend Presence

**Current**: Custom WebSocket ✅  
**Recommendation**: KEEP on WebSocket (at least initially)

**Architecture**:

```
┌─────────────────────────────────────────┐
│        Browser (User A)                 │
│  connects: FriendsPage                  │
│  calls: websocketManager.connect()      │
└────────────┬────────────────────────────┘
             │ WebSocket
             │ auth + heartbeat
             ▼
┌─────────────────────────────────────────┐
│    WebSocket Server (port 3001)         │
│  connections.set('userA', ws)           │
│  getFriendIds('userA') → [userB, userC]│
│  broadcastToUsers([B,C], presence_msg)  │
└────────────┬────────────────────────────┘
             │ Presence broadcast
             ▼
      [Browsers of userB, userC]
      update friendsPresence Map
      re-render OnlineStatus components
```

**Tradeoffs**:

| Aspect       | WebSocket         | Ably             |
| ------------ | ----------------- | ---------------- |
| Latency      | <50ms             | <100ms           |
| Persistence  | No                | Yes              |
| Multi-device | Single connection | Auto sync        |
| Scalability  | Limited           | Unlimited        |
| Cost         | Included          | Per user/message |

**Recommendation**: Keep on WebSocket for now (works well). Consider Ably when:

- Scaling beyond 5000 concurrent users
- Need multi-device presence
- Want presence history/audit trail

---

### 6.2 Chat Messages

**Current**: Stored in DB, no real-time delivery  
**Recommendation**: MIGRATE to Ably

**Flow**:

```
User A (sender)
   │
   └─→ chatStore.sendMessage()
       ├─→ Insert into Supabase (persist)
       ├─→ ablyManager.publish('chat:conv1', 'message', msg)
       │   └─→ [Ably Channel]
       │       ├─→ Delivers to User B (real-time)
       │       ├─→ Delivers to User C (real-time)
       │       └─→ Stores in Ably history
       └─→ websocketManager.send() (fallback)
```

**Why Ably**:

- Persistent storage (message history)
- Automatic multi-device sync
- Read receipts built-in
- Typing indicators channel
- Less server code

**Implementation**:

```typescript
// Chat store changes
async sendMessage(conversationId: string, content: unknown): Promise<Message | null> {
  // 1. Insert into database
  const { data, error } = await this.supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: this.userId, content })
    .select()
    .single();

  if (error) return null;

  // 2. Publish to Ably
  try {
    await ablyManager.publish(`chat:${conversationId}`, 'message', {
      id: data.id,
      sender_id: data.sender_id,
      content: data.content,
      created_at: data.created_at
    });
  } catch (ablyError) {
    console.error('Ably publish failed, using WebSocket fallback:', ablyError);
    websocketManager.send({
      type: 'chat_message',
      conversationId,
      messageId: data.id,
      content
    });
  }

  return data;
}
```

**Benefits**:

- Real-time message delivery
- Message history available
- Typing indicators on same channel
- Fewer database queries
- Better offline support (queue)

---

### 6.3 Typing Indicators

**Current**: Message type defined, not used  
**Recommendation**: KEEP on WebSocket OR use Ably ephemeral

**Tradeoffs**:

| Aspect      | WebSocket | Ably           |
| ----------- | --------- | -------------- |
| Latency     | <50ms     | <100ms         |
| Persistence | No        | No (ephemeral) |
| Payload     | Minimal   | Standard       |
| Scale       | Limited   | High           |

**Recommendation**: Start with WebSocket (simpler), migrate to Ably if chat already there

**Implementation**:

```typescript
// Chat store
sendTypingIndicator(conversationId: string, isTyping: boolean): void {
  // Option 1: WebSocket (current)
  websocketManager.send({
    type: 'typing_indicator',
    conversationId,
    isTyping
  });

  // Option 2: Ably (future)
  // ablyManager.publish(`chat:${conversationId}`, 'typing', { userId, isTyping });
}
```

---

### 6.4 Read Receipts

**Current**: Message type defined, not stored  
**Recommendation**: MIGRATE to Ably

**Data Structure**:

```sql
-- When using Ably, metadata on message:
message.metadata = {
  readBy: {
    'userId1': '2025-11-09T10:00:00Z',
    'userId2': '2025-11-09T10:05:00Z'
  }
}

-- Or separate event stream:
'message_read' event:
{
  messageId: string
  userId: string
  readAt: ISO timestamp
}
```

**Implementation**:

```typescript
// Chat store
async markAsRead(conversationId: string, messageId: string): Promise<void> {
  const readAt = new Date().toISOString();

  // Update database
  await this.supabase.rpc('mark_message_read', {
    p_message_id: messageId,
    p_user_id: this.userId,
    p_read_at: readAt
  });

  // Broadcast via Ably
  try {
    await ablyManager.publish(`chat:${conversationId}`, 'message_read', {
      messageId,
      userId: this.userId,
      readAt
    });
  } catch (error) {
    websocketManager.send({
      type: 'message_read',
      conversationId,
      messageId
    });
  }
}

// Receive read receipts
ablyManager.subscribe(`chat:${conversationId}`, 'message_read', (msg) => {
  const { messageId, userId, readAt } = msg.data;
  // Update message.readBy[userId] = readAt
  this.updateMessageReadReceipt(messageId, userId, readAt);
});
```

---

### 6.5 Emoji Reactions

**Current**: Message type defined, stored in DB  
**Recommendation**: MIGRATE to Ably

**Data Model**:

```sql
message_reactions {
  id UUID
  message_id UUID
  user_id UUID
  emoji TEXT
  created_at TIMESTAMPTZ
}
```

**Implementation**:

```typescript
// Chat store
async toggleReaction(messageId: string, emoji: string): Promise<void> {
  const { data: added, error } = await this.supabase.rpc('toggle_reaction', {
    p_message_id: messageId,
    p_emoji: emoji,
    p_user_id: this.userId
  });

  if (error) throw error;

  // Get conversation ID for channel
  const conversation = this.findConversationByMessageId(messageId);
  if (!conversation) return;

  // Broadcast via Ably
  try {
    await ablyManager.publish(`chat:${conversation.id}`, 'reaction', {
      messageId,
      emoji,
      userId: this.userId,
      action: added ? 'add' : 'remove'
    });
  } catch (error) {
    websocketManager.send({
      type: 'message_reaction',
      messageId,
      emoji,
      action: added ? 'add' : 'remove'
    });
  }
}

// Receive reactions
ablyManager.subscribe(`chat:${conversationId}`, 'reaction', (msg) => {
  const { messageId, emoji, userId, action } = msg.data;
  this.updateMessageReaction(messageId, emoji, userId, action);
});
```

---

### 6.6 Notifications

**Current**: Not implemented  
**Recommendation**: IMPLEMENT on Ably

**Types**:

```typescript
// Friend request received
{
	type: ('friend_request', friendId, friendName);
}

// Message received (optional, could stay silent)
{
	type: ('message', conversationId, senderName);
}

// Mentioned in conversation
{
	type: ('mention', conversationId, messageId, senderName);
}

// Assignment deadline
{
	type: ('assignment', assignmentId, assignmentName, dueDate);
}

// Achievement unlocked
{
	type: ('achievement', achievement);
}

// System announcement
{
	type: ('system', title, content);
}
```

**Backend Generation** (example):

```typescript
// src/routes/api/friends/accept/+server.ts
async function acceptFriendRequest(friendship) {
	// Update database
	await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendship.id);

	// Generate notification
	const ablyClient = new Ably.Rest({ key: process.env.ABLY_API_KEY });
	const channel = ablyClient.channels.get(`notifications:${friendship.requester_id}`);

	await channel.publish('notification', {
		type: 'friend_request_accepted',
		friendId: friendship.addressee_id,
		friendName: addresseeProfile.full_name
	});
}
```

**Client Subscription**:

```typescript
// In chat store or new notifications store
ablyManager.subscribe(`notifications:${this.userId}`, 'notification', (msg) => {
	const notification = msg.data;
	this.notifications.unshift(notification);
	this.showToast(notification); // Show toast notification
});
```

---

### 6.7 Teacher Dashboard Activity

**Current**: Not implemented  
**Recommendation**: Use WebSocket (if implemented)

**Purpose**: Show real-time student activity on dashboard

**Data**:

- Student completed exercise
- Student attempted riddle
- Student joined class
- Student changed VIP card

**Stream Format**:

```typescript
{
  type: 'student_activity',
  studentId: string,
  studentName: string,
  action: 'exercise_completed' | 'riddle_attempted' | 'joined_class' | 'vip_card_activated',
  timestamp: ISO timestamp,
  metadata: {
    exerciseId?: string,
    riddleId?: string,
    vipCardId?: string
  }
}
```

**Implementation** (WebSocket):

```typescript
// WebSocket server: new message type
case 'student_activity': {
  if (!userId) return;

  // Get teacher ID from token/session
  const teacherId = await getTeacherIdForStudent(userId);
  if (!teacherId) return;

  // Broadcast to teacher if dashboard open
  const teacherWs = connections.get(teacherId);
  if (teacherWs && teacherWs.readyState === WebSocket.OPEN) {
    teacherWs.send(JSON.stringify({
      type: 'student_activity',
      studentId: userId,
      action: message.action,
      timestamp: new Date().toISOString(),
      metadata: message.metadata
    }));
  }
}
```

**Why WebSocket**:

- High frequency (many students)
- No persistence needed (UI only)
- Low latency important
- Simple broadcast pattern

---

## Part 7: Performance Considerations

### 7.1 Bandwidth Impact

**Current** (WebSocket only):

- Heartbeat: 100 bytes/user/minute = 1.7 bytes/second
- Presence updates: ~200 bytes × (number of friends) per login/logout
- Chat: 0-1000 bytes/user/day (depends on usage)

**With Ably Added**:

- Heartbeat: unchanged (WebSocket only)
- Chat via Ably: Same size (just routed differently)
- Notifications via Ably: ~100-500 bytes per notification

**Impact Analysis**:

For 1000 concurrent users:

- Heartbeat: 1,700 bytes/second (negligible)
- Chat (average): 10 messages/user/day = 10KB/user (low)
- Notifications: 5 per user/day = 2.5KB/user (low)
- **Total**: ~200 KB/day for all users (very manageable)

**Recommendation**: Bandwidth not a concern for current user base

---

### 7.2 Memory Footprint

**Current** (WebSocket):

- Per connection: ~5 KB (WebSocket object, maps)
- Total for 1000 users: ~5 MB

**Added** (Ably):

- Per user: ~2 KB (Ably client, channel subscriptions)
- Total for 1000 users: ~2 MB

**Total with Both**: ~7 MB (still very manageable)

**Browser Memory**:

- WebSocket store: ~1 KB
- Ably client: ~500 KB (SDK size)
- Event listeners: ~1 KB per channel

**Recommendation**: Memory footprint acceptable for all platforms

---

### 7.3 Battery Impact (Mobile)

**Current** (WebSocket):

- Heartbeat every 60 seconds: ~0.1% battery/hour
- Network connection: Keeps radio on

**Added** (Ably):

- Second connection: ~0.05% battery/hour
- Same radio (shared)

**Mitigation**:

- Increase heartbeat interval to 90 seconds (if acceptable)
- Only connect Ably when needed (lazy load)
- Disable in low-battery mode

**Recommendation**: Monitor battery usage in testing. Consider feature flag to disable Ably on mobile if needed.

---

### 7.4 Connection Overhead

**Current**:

- WebSocket handshake: ~100ms
- TLS setup: ~50ms
- Authentication: ~10ms
- Total: ~160ms per user

**Added** (Ably):

- Second handshake: ~100ms (parallel, so no additional latency)
- Authentication via token: ~5ms
- Total increase: 0ms (parallel)

**Recommendation**: Handshakes done in parallel, no perceptible impact

---

### 7.5 Latency Comparison

| Metric           | WebSocket | Ably   | Impact              |
| ---------------- | --------- | ------ | ------------------- |
| Presence update  | <50ms     | N/A    | WebSocket best      |
| Chat message     | N/A       | <100ms | Acceptable          |
| Typing indicator | <50ms     | <100ms | WebSocket preferred |
| Read receipt     | N/A       | <100ms | Acceptable          |
| Notification     | N/A       | <200ms | Acceptable          |

**Conclusion**: No issues with latency for any feature

---

## Part 8: Code Examples

### 8.1 Basic Hybrid Setup in Component

```svelte
<script lang="ts">
	import { page } from '$app/stores';
	import { realtimeManager } from '$lib/stores/realtime.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { notificationStore } from '$lib/stores/notifications.svelte';

	let { data } = $props();

	// Initialize on mount
	$effect(() => {
		if (data.user && data.ablyToken) {
			realtimeManager.init(data.user.id, data.session.access_token, data.ablyToken);

			chatStore.init(data.supabase, data.user.id);
			notificationStore.init(data.supabase, data.user.id);
		}

		return () => {
			realtimeManager.disconnect();
		};
	});
</script>

<div>
	{#if realtimeManager.connectionState === 'healthy'}
		<p class="text-green-600">Real-time connected</p>
	{:else if realtimeManager.connectionState === 'degraded'}
		<p class="text-yellow-600">Real-time degraded</p>
	{:else}
		<p class="text-red-600">Real-time offline</p>
	{/if}

	<slot />
</div>
```

### 8.2 Chat Component with Hybrid Support

```svelte
<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte';
	import { ablyManager } from '$lib/stores/ably.svelte';

	let { conversationId } = $props();
	let messageInput = $state('');

	let conversation = $derived(chatStore.conversations.find((c) => c.id === conversationId));

	let messages = $derived(chatStore.messages.get(conversationId) ?? []);

	// Set active conversation (auto-loads messages and subscribes)
	$effect(() => {
		chatStore.setActiveConversation(conversationId);
	});

	// Send message
	async function handleSendMessage() {
		if (!messageInput.trim()) return;

		const content = { type: 'doc', content: [{ type: 'text', text: messageInput }] };

		try {
			await chatStore.sendMessage(conversationId, content);
			messageInput = '';
		} catch (error) {
			console.error('Failed to send message:', error);
		}
	}

	// Typing indicator
	let typingTimeout: number;

	function handleInput() {
		chatStore.sendTypingIndicator(conversationId, true);

		clearTimeout(typingTimeout);
		typingTimeout = setTimeout(() => {
			chatStore.sendTypingIndicator(conversationId, false);
		}, 1000);
	}
</script>

<div class="chat-container">
	<div class="messages">
		{#each messages as message (message.id)}
			<div class="message">
				<strong>{message.sender_firstname}</strong>
				<p>{message.plain_text}</p>
				<small>{message.created_at}</small>
			</div>
		{/each}
	</div>

	<input bind:value={messageInput} on:input={handleInput} placeholder="Type a message..." />

	<button onclick={handleSendMessage}>Send</button>
</div>
```

### 8.3 Ably Token Generation (Backend)

```typescript
// src/routes/api/realtime/ably-token/+server.ts
import { error, json } from '@sveltejs/kit';
import Ably from 'ably/promises';
import { getEnv } from '$lib/server/env';

const env = getEnv();
const ablyClient = new Ably.Rest({ key: env.ABLY_API_KEY });

export async function GET({ locals }) {
	const session = await locals.getSession();

	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		const tokenRequest = await ablyClient.auth.createTokenRequest({
			clientId: session.user.id,
			ttl: 3600000, // 1 hour
			capability: {
				// Presence for the user
				[`presence:${session.user.id}`]: ['subscribe'],

				// Chat channels: can view and subscribe to any conversation
				'chat:*': ['subscribe', 'history'],

				// Own notification channel: receive notifications
				[`notifications:${session.user.id}`]: ['subscribe', 'history'],

				// Typing indicators: ephemeral
				'typing:*': ['subscribe', 'publish']
			}
		});

		return json({ token: tokenRequest.token });
	} catch (err) {
		console.error('Error generating Ably token:', err);
		throw error(500, 'Failed to generate Ably token');
	}
}
```

### 8.4 Graceful Fallback Example

```typescript
// src/lib/stores/chat.svelte.ts

async function sendMessage(
  conversationId: string,
  content: unknown
): Promise<Message | null> {
  // 1. Persist to database first
  const { data: message, error: dbError } = await this.supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: this.userId, content })
    .select()
    .single();

  if (dbError) {
    throw new Error(`Database error: ${dbError.message}`);
  }

  // 2. Try Ably first
  let broadcastSuccess = false;

  if (ablyManager.connectionState === 'connected') {
    try {
      await ablyManager.publish(`chat:${conversationId}`, 'message', {
        id: message.id,
        sender_id: message.sender_id,
        content: message.content,
        created_at: message.created_at
      });
      broadcastSuccess = true;
      console.log('[Ably] Chat message delivered');
    } catch (ablyError) {
      console.warn('[Ably] Failed to deliver chat message:', ablyError);
    }
  }

  // 3. Fallback to WebSocket
  if (!broadcastSuccess && websocketManager.connectionStatus === 'connected') {
    try {
      websocketManager.send({
        type: 'chat_message',
        conversationId,
        messageId: message.id,
        content
      });
      broadcastSuccess = true;
      console.log('[WebSocket] Chat message delivered (fallback)');
    } catch (wsError) {
      console.warn('[WebSocket] Failed to deliver chat message:', wsError);
    }
  }

  // 4. If both failed, warn but don't fail (message persisted in DB)
  if (!broadcastSuccess) {
    console.warn('Real-time delivery failed, message persisted in database');
  }

  // Optimistic UI update
  const enrichedMessage = { ...message, sender_firstname: '...', ... };
  this.messages.get(conversationId)?.push(enrichedMessage);

  return message;
}
```

---

## Part 9: Monitoring & Observability

### 9.1 Key Metrics to Track

```typescript
// src/lib/server/monitoring/realtime-metrics.ts

interface RealtimeMetrics {
	// Connection metrics
	websocket_connections: number;
	ably_connections: number;
	connection_failures: number;
	reconnection_attempts: number;

	// Message metrics
	websocket_messages_sent: number;
	websocket_messages_received: number;
	ably_messages_sent: number;
	ably_messages_received: number;
	message_delivery_time_ms: number;

	// Error metrics
	websocket_errors: number;
	ably_errors: number;
	fallback_events: number;

	// Performance
	latency_p50: number;
	latency_p95: number;
	latency_p99: number;
}

export const realtimeMetrics = $state<RealtimeMetrics>({
	websocket_connections: 0,
	ably_connections: 0,
	connection_failures: 0,
	reconnection_attempts: 0,
	websocket_messages_sent: 0,
	websocket_messages_received: 0,
	ably_messages_sent: 0,
	ably_messages_received: 0,
	message_delivery_time_ms: 0,
	websocket_errors: 0,
	ably_errors: 0,
	fallback_events: 0,
	latency_p50: 0,
	latency_p95: 0,
	latency_p99: 0
});

// Helper functions
export function recordMessageLatency(system: 'websocket' | 'ably', delayMs: number): void {
	// Update percentile calculations
}

export function recordFallback(from: 'ably' | 'websocket', to: 'websocket' | 'ably'): void {
	realtimeMetrics.fallback_events++;
	console.warn(`[Metrics] Fallback from ${from} to ${to}`);
}
```

### 9.2 Logging Strategy

```typescript
// Log levels
const logger = createLogger('realtime');

// Connection lifecycle
logger.info('[WebSocket] Connected');
logger.info('[Ably] Connected');
logger.warn('[WebSocket] Disconnected, attempting reconnect');
logger.error('[Ably] Connection failed', error);

// Message delivery
logger.debug('[Ably] Publishing chat message', { conversationId, messageId });
logger.debug('[WebSocket] Sending fallback message', { type, payload });
logger.warn('[Fallback] Switching to WebSocket after Ably failure');

// Errors
logger.error('[Ably] Token generation failed', error);
logger.error('[WebSocket] Heartbeat failed', error);

// Performance
logger.info('[Latency] Chat message delivered in 45ms');
logger.warn('[Performance] Slow delivery (250ms)', { system: 'ably' });
```

### 9.3 Error Alerting

```typescript
// Set up alerts in monitoring service (e.g., Sentry, DataDog)

// Alert conditions:
// - WebSocket unavailable for >5 minutes
// - Ably unavailable for >5 minutes
// - Fallback rate > 10%
// - Error rate > 1%
// - Message delivery time > 1 second
// - Both systems down (critical)

interface AlertRules {
	websocket_down_threshold: 300000; // 5 minutes
	ably_down_threshold: 300000;
	fallback_rate_threshold: 0.1; // 10%
	error_rate_threshold: 0.01; // 1%
	latency_threshold: 1000; // 1 second
}
```

---

## Part 10: Testing Strategy

### 10.1 Unit Tests

```typescript
// src/lib/stores/ably.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ablyManager } from './ably.svelte';

describe('AblyManager', () => {
	beforeEach(() => {
		// Mock Ably SDK
	});

	it('should connect with valid token', async () => {
		await ablyManager.init('user-1', 'valid-token');
		expect(ablyManager.connectionState).toBe('connected');
	});

	it('should handle connection errors', async () => {
		await ablyManager.init('user-1', 'invalid-token');
		expect(ablyManager.connectionState).toBe('disconnected');
	});

	it('should publish to channel', async () => {
		await ablyManager.init('user-1', 'token');
		const channel = ablyManager.getChannel('test');
		expect(channel).toBeDefined();
	});

	it('should subscribe to channel events', async () => {
		let received = false;
		ablyManager.subscribe('test', 'message', () => {
			received = true;
		});

		// Simulate incoming message
		// Verify handler called
	});
});
```

### 10.2 Integration Tests

```typescript
// tests/integration/chat-hybrid.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { chatStore } from '$lib/stores/chat.svelte';
import { websocketManager } from '$lib/stores/websocket.svelte';
import { ablyManager } from '$lib/stores/ably.svelte';

describe('Hybrid Chat', () => {
	it('should deliver message via Ably', async () => {
		// Send message from User A
		const message = await chatStore.sendMessage('conv-1', { type: 'text', content: 'Hello' });

		// Subscribe as User B
		let received = false;
		ablyManager.subscribe('chat:conv-1', 'message', () => {
			received = true;
		});

		// Simulate Ably delivery
		// Expect message received
		expect(received).toBe(true);
	});

	it('should fallback to WebSocket on Ably failure', async () => {
		// Disconnect Ably
		ablyManager.disconnect();

		// Send message
		const message = await chatStore.sendMessage('conv-1', { content: 'Hello' });

		// Verify WebSocket fallback used
		expect(message).toBeDefined();
	});

	it('should prevent duplicate messages', async () => {
		const messageId = 'msg-1';
		let count = 0;

		// Message arrives via both channels
		chatStore.handleWebSocketMessage({
			type: 'chat_message',
			messageId
		});

		chatStore.handleAblyMessage({
			id: messageId
		});

		// Deduplication should prevent double processing
		expect(count).toBe(1);
	});
});
```

### 10.3 Scenario Tests

```typescript
// Network failure scenarios
describe('Network Failures', () => {
	it('should reconnect WebSocket on network loss', () => {
		// Disconnect WebSocket
		websocketManager.disconnect();

		// Restore network
		// Verify automatic reconnection
	});

	it('should queue messages during offline', () => {
		websocketManager.disconnect();
		ablyManager.disconnect();

		// Try to send message
		chatStore.sendMessage('conv-1', { content: 'Hello' });

		// Message should be queued
		// When connection restored, should auto-send
	});

	it('should handle token expiration', () => {
		// Simulate Ably token expiration
		// Should attempt token refresh
		// Should not lose connection
	});
});
```

---

## Part 11: Decision Matrix

### Final Recommendations by Feature

| Feature           | Decision               | Priority | Effort  | Risk   | Notes             |
| ----------------- | ---------------------- | -------- | ------- | ------ | ----------------- |
| Friend Presence   | Keep WebSocket         | Critical | None    | Low    | Working well      |
| Chat Messages     | Migrate to Ably        | High     | 2 weeks | Low    | Improves UX       |
| Typing Indicators | Keep WebSocket         | High     | 1 week  | Low    | Simple ephemeral  |
| Read Receipts     | Migrate to Ably        | Medium   | 1 week  | Low    | Ably handles well |
| Emoji Reactions   | Migrate to Ably        | Medium   | 1 week  | Low    | Message metadata  |
| Notifications     | Implement on Ably      | Medium   | 2 weeks | Medium | New feature       |
| Teacher Activity  | Implement on WebSocket | Low      | 2 weeks | Low    | High frequency    |
| Gifting           | Implement on Ably      | Low      | 2 weeks | Medium | Audit needed      |

### Implementation Roadmap

```
Week 1: Foundation
  ✓ Ably setup & token endpoint
  ✓ Ably store implementation
  ✓ Test both systems in parallel

Week 2: Chat Migration
  ✓ Wire Ably for chat
  ✓ WebSocket fallback
  ✓ Integration tests

Week 3: Polish Chat
  ✓ Read receipts via Ably
  ✓ Emoji reactions
  ✓ Performance tuning

Week 4: Notifications
  ✓ Notification store
  ✓ Backend generation
  ✓ UI components

Week 5-6: Polish & Document
  ✓ Monitoring setup
  ✓ Documentation
  ✓ Feature flags
  ✓ Load testing

Week 7-8: Optional Enhancements
  ✓ Teacher activity stream
  ✓ Gifting system
  ✓ Advanced features
```

---

## Conclusion

A hybrid WebSocket + Ably architecture is **feasible and beneficial** for UbuMaths:

### Advantages

- **Custom WebSocket keeps**: Presence (ephemeral, low-frequency)
- **Ably adds**: Chat, notifications, read receipts (persistent, complex)
- **Graceful degradation**: Works even if one system fails
- **Manageable migration**: Incremental, no disruptive changes
- **Scalable**: Both systems grow independently
- **Cost-effective**: Ably costs scale with actual usage

### Key Principles

1. **Parallel initialization** (both systems start together)
2. **Shared authentication** (single JWT, Ably tokens generated from it)
3. **Unified error handling** (fallback automatically)
4. **Deduplication** (prevent double-processing)
5. **Graceful degradation** (works with either or both)
6. **Observable** (monitor health of both)

### Recommended Next Steps

1. Review with team (architecture, costs, timeline)
2. Set up Ably account and API key
3. Create Phase 1: Foundation (2 weeks)
4. Validate with staging environment
5. Feature-flag for gradual rollout
6. Monitor and iterate

---

## Appendix: Ably Pricing & Quotas

**Ably Free Tier**:

- 3 million messages/month
- 100 concurrent connections
- Good for dev/testing

**Ably Pay-As-You-Go**:

- $0.10 per million messages over free tier
- For 1000 users, ~10M messages/month = $1/month
- Very affordable at any scale

**Ably Capabilities**:

- Pub/sub channels
- Presence tracking
- History (100+ messages)
- Ephemeral channels
- Token authentication
- Flexible permissions

---

**Document End**
