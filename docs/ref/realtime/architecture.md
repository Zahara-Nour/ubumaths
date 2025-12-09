# Realtime Architecture

Detailed architecture documentation for UbuMaths' Supabase Realtime implementation.

---

## System Components

### 1. Central Manager (`supabaseRealtimeManager`)

**Location**: `src/lib/stores/supabaseRealtime.svelte.ts`

The central hub for all realtime channel management. Implements the singleton pattern to ensure consistent channel lifecycle across the application.

```typescript
class SupabaseRealtimeManager {
	// Reactive State (Svelte 5 runes)
	connectionStatus = $state<'connected' | 'disconnected' | 'connecting'>('disconnected');

	private client: SupabaseClient<Database> | null = null;
	private channels = new Map<string, RealtimeChannel>();
	private currentUserId: string | null = null;

	// Computed properties
	get isConnected(): boolean;
	get channelCount(): number;
	get currentUserId(): string | null;
}
```

**Responsibilities**:

- Maintain single Supabase client reference
- Create/reuse channels (prevents duplicates)
- Track connection status
- Coordinate cleanup across stores

### 2. Specialized Stores

Each specialized store handles a specific domain:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Store Responsibilities                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  presenceManager          notificationsRealtimeManager          │
│  ┌───────────────────┐    ┌───────────────────────────────┐    │
│  │ • Friend status   │    │ • New notification alerts     │    │
│  │ • Heartbeat mgmt  │    │ • Unread count sync           │    │
│  │ • Online/offline  │    │ • Badge updates               │    │
│  └───────────────────┘    └───────────────────────────────┘    │
│                                                                 │
│  chatStore                achievementsRealtimeManager           │
│  ┌───────────────────┐    ┌───────────────────────────────┐    │
│  │ • Message sync    │    │ • Achievement unlock toasts   │    │
│  │ • Typing status   │    │ • Cache invalidation          │    │
│  │ • Reactions       │    │ • Progress updates            │    │
│  │ • Read receipts   │    └───────────────────────────────┘    │
│  │ • Deduplication   │                                         │
│  └───────────────────┘    multiplayerStore                     │
│                           ┌───────────────────────────────┐    │
│                           │ • Match state sync            │    │
│                           │ • Player progress             │    │
│                           │ • Connection monitoring       │    │
│                           │ • Queue management            │    │
│                           └───────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Channel Architecture

### Channel Naming Convention

```typescript
// Presence (single shared channel)
const CHANNEL_NAME = 'user-presence-updates';

// Chat channels (per conversation)
`chat-${conversationId}`; // Conversation messages

// Notifications (single shared channel)
const CHANNEL_NAME = 'user-notifications';

// Achievements (single shared channel)
const CHANNEL_NAME = 'achievements-realtime';

// Multiplayer (dynamic per match)
`queue:${matchType}:${difficulty}` // Match queue
`match:${matchId}`; // Active match
```

> **Note**: Presence, notifications, and achievements use constant channel names (shared),
> while chat and multiplayer use dynamic names per conversation/match.

### Channel Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    Channel Lifecycle                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CREATE                     2. CONFIGURE                     │
│  ┌─────────────────────┐       ┌─────────────────────────────┐  │
│  │ createChannel(name) │ ────▶ │ channel.on('postgres_changes')│ │
│  │                     │       │ channel.on('broadcast')       │ │
│  │ Returns existing    │       │ channel.on('presence')        │ │
│  │ if already created  │       └─────────────────────────────┘  │
│  └─────────────────────┘                    │                   │
│                                             ▼                   │
│  4. CLEANUP                    3. SUBSCRIBE                     │
│  ┌─────────────────────┐       ┌─────────────────────────────┐  │
│  │ unsubscribeChannel()│ ◀──── │ subscribeChannel(name)       │ │
│  │                     │       │                              │ │
│  │ Removes from map    │       │ Waits for SUBSCRIBED status  │ │
│  │ Unsubscribes        │       └─────────────────────────────┘  │
│  └─────────────────────┘                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Event Types

### postgres_changes Events

Database change events filtered by RLS policies.

```typescript
// Event structure
interface PostgresChangesPayload<T> {
	eventType: 'INSERT' | 'UPDATE' | 'DELETE';
	new: T; // New row data (INSERT/UPDATE)
	old: T; // Old row data (UPDATE/DELETE)
	table: string;
	schema: string;
}

// Subscribe to events
channel.on(
	'postgres_changes',
	{
		event: 'INSERT', // or 'UPDATE', 'DELETE', '*'
		schema: 'public',
		table: 'messages',
		filter: 'conversation_id=eq.${conversationId}'
	},
	(payload) => handlePayload(payload)
);
```

### Broadcast Events

Ephemeral events (not persisted).

```typescript
// Event types used in UbuMaths
type BroadcastEvent =
	| 'new_message' // Chat: instant message preview
	| 'typing_indicator' // Chat: user typing
	| 'message_reaction' // Chat: reaction added/removed
	| 'message_read' // Chat: read receipt
	| 'player_progress' // Multiplayer: game progress
	| 'match_complete'; // Multiplayer: game finished

// Send broadcast
channel.send({
	type: 'broadcast',
	event: 'typing_indicator',
	payload: { userId, conversationId, isTyping: true }
});

// Receive broadcast
channel.on('broadcast', { event: 'typing_indicator' }, (payload) => {
	handleTyping(payload.payload);
});
```

### Presence Events

Track who is in a channel.

```typescript
// Join presence
channel.track({
	online_at: new Date().toISOString(),
	user_id: userId
});

// Listen for presence changes
channel.on('presence', { event: 'sync' }, () => {
	const state = channel.presenceState();
	// state is Record<string, { user_id, online_at }[]>
});

channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
	// User joined
});

channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
	// User left
});
```

---

## Connection Management

### Connection States

```typescript
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

// State transitions
'disconnected' ──init()──▶ 'connecting' ──success──▶ 'connected'
                                │
                                └──failure──▶ 'disconnected'

'connected' ──network loss──▶ 'disconnected'
'connected' ──disconnect()──▶ 'disconnected'
```

### Reconnection Strategy

Built into Supabase Realtime client with additional application-level handling:

```typescript
// presenceManager reconnection (src/lib/stores/presence.svelte.ts)
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 5000; // Base delay

private async attemptReconnect(): Promise<void> {
  if (this.isReconnecting || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    return;
  }

  this.isReconnecting = true;
  const delay = RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts);

  await new Promise(resolve => setTimeout(resolve, delay));

  try {
    await this.resubscribe();
    this.reconnectAttempts = 0;
  } catch {
    this.reconnectAttempts++;
  } finally {
    this.isReconnecting = false;
  }
}
```

### Exponential Backoff

```
Attempt 1: 5000ms (5 seconds)
Attempt 2: 10000ms (10 seconds)
Attempt 3: 20000ms (20 seconds)
Attempt 4: 40000ms (40 seconds)
Attempt 5: 80000ms (80 seconds) - MAX
```

---

## Database Integration

### Tables with Realtime

| Table                       | Events                 | Filter                 | Purpose       |
| --------------------------- | ---------------------- | ---------------------- | ------------- |
| `user_presence`             | INSERT, UPDATE, DELETE | `user_id IN (friends)` | Friend status |
| `messages`                  | INSERT                 | `conversation_id=eq.X` | New messages  |
| `notifications`             | INSERT, UPDATE         | `user_id=eq.X`         | Alerts        |
| `student_achievements`      | INSERT                 | `student_id=eq.X`      | Unlocks       |
| `conversation_participants` | UPDATE                 | `user_id=eq.X`         | Read status   |

### Database Triggers

```sql
-- Auto-flag profanity in messages
CREATE TRIGGER trigger_process_message_content
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION process_message_content();

-- Update conversation metadata
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Auto-create class chat room
CREATE TRIGGER trigger_create_class_chat_room
  AFTER INSERT ON classes
  FOR EACH ROW
  EXECUTE FUNCTION create_class_chat_room();

-- Add student to class chat
CREATE TRIGGER trigger_add_student_to_class_chat
  AFTER INSERT ON class_students
  FOR EACH ROW
  EXECUTE FUNCTION add_student_to_class_chat();
```

---

## Security Architecture

### Row Level Security (RLS)

All realtime events are filtered by RLS policies:

```sql
-- Example: Messages visible only to conversation participants
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );
```

### Client-Side Validation

```typescript
// Runtime payload validation (achievementsRealtimeManager)
private validatePayload(payload: unknown): payload is ValidAchievementPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.achievement_id === 'string' &&
    typeof p.student_id === 'string' &&
    typeof p.unlocked_at === 'string'
  );
}
```

### User Restrictions

```typescript
// Chat restrictions check
interface UserRestriction {
	type: 'mute' | 'timeout' | 'ban';
	scope: 'conversation' | 'global';
	expires_at: string | null;
	reason: string;
}

// Enforced at UI and API level
if (restriction.type === 'ban') {
	// Hide chat entirely
}
```

---

## Related Documentation

- [Stores Reference](./stores-reference.md) - Complete API documentation
- [Chat System](./chat-system.md) - Chat implementation details
- [Best Practices](./best-practices.md) - Performance and security
