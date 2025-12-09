# Stores Reference

Complete API reference for all realtime stores in UbuMaths.

---

## supabaseRealtimeManager

**Location**: `src/lib/stores/supabaseRealtime.svelte.ts`

Central manager for Supabase Realtime channel lifecycle.

### State

```typescript
class SupabaseRealtimeManager {
	// Reactive state (Svelte 5)
	connectionStatus: 'connected' | 'disconnected' | 'connecting';

	// Computed getters
	get isConnected(): boolean;
	get channelCount(): number;
	get currentUserId(): string | null;
}
```

### Methods

#### `init(client, currentUserId)`

Initialize the realtime manager.

```typescript
init(client: SupabaseClient<Database>, currentUserId: string): void
```

**Parameters**:

- `client` - Supabase client instance
- `currentUserId` - Current authenticated user ID

**Example**:

```typescript
supabaseRealtimeManager.init(data.supabase, data.user.id);
```

#### `createChannel(channelName)`

Create or retrieve an existing channel.

```typescript
createChannel(channelName: string): RealtimeChannel
```

**Parameters**:

- `channelName` - Unique channel identifier

**Returns**: `RealtimeChannel` instance (existing if already created)

**Example**:

```typescript
const channel = supabaseRealtimeManager.createChannel('notifications:user123');
channel.on('postgres_changes', { event: 'INSERT', table: 'notifications' }, callback);
```

#### `subscribeChannel(channelName)`

Subscribe to a channel's events.

```typescript
subscribeChannel(channelName: string): Promise<void>
```

**Parameters**:

- `channelName` - Name of channel to subscribe

**Example**:

```typescript
await supabaseRealtimeManager.subscribeChannel('notifications:user123');
```

#### `unsubscribeChannel(channelName)`

Unsubscribe from a channel.

```typescript
unsubscribeChannel(channelName: string): Promise<void>
```

#### `getChannel(channelName)`

Get an existing channel by name.

```typescript
getChannel(channelName: string): RealtimeChannel | undefined
```

#### `disconnect()`

Disconnect all channels and cleanup.

```typescript
disconnect(): Promise<void>
```

---

## presenceManager

**Location**: `src/lib/stores/presence.svelte.ts`

Tracks friend online/offline status via heartbeats.

### Constants

```typescript
// BILLING CRITICAL - DO NOT CHANGE
export const HEARTBEAT_INTERVAL = 180000; // 180 seconds (3 minutes)

// Internal constants
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 5000;
```

### State

```typescript
class PresenceManager {
	// Internal reactive state
	private friendPresence = $state<Map<string, 'online' | 'offline'>>(new Map());
	private isReconnecting = false;
	private reconnectAttempts = 0;
}
```

### Methods

#### `init(supabase, userId)`

Initialize the presence manager.

```typescript
init(supabase: SupabaseClient<Database>, userId: string): void
```

#### `startPresenceTracking(friendIds)`

Start tracking presence for a list of friends.

```typescript
startPresenceTracking(friendIds: string[]): Promise<void>
```

**Parameters**:

- `friendIds` - Array of friend user IDs to track

**Behavior**:

1. Sets up heartbeat interval (180s)
2. Subscribes to `user_presence` table changes
3. Filters events to specified friend IDs

**Example**:

```typescript
presenceManager.init(supabase, userId);
const friendIds = friends.map((f) => f.friend_id);
await presenceManager.startPresenceTracking(friendIds);
```

#### `stopPresenceTracking()`

Stop all presence tracking and cleanup.

```typescript
stopPresenceTracking(): Promise<void>
```

**Behavior**:

1. Clears heartbeat interval
2. Clears reconnect timers
3. Unsubscribes from channel
4. Resets presence state

#### `updateFriendList(newFriendIds)`

Update the list of tracked friends.

```typescript
updateFriendList(newFriendIds: string[]): Promise<void>
```

**Use case**: When friend list changes (add/remove friend)

#### `getFriendPresence(friendId)`

Get a friend's current presence status.

```typescript
getFriendPresence(friendId: string): 'online' | 'offline'
```

**Returns**: `'online'` or `'offline'`

**Example**:

```svelte
<script lang="ts">
	const status = presenceManager.getFriendPresence(friend.id);
</script>

<span class={status === 'online' ? 'text-green-500' : 'text-gray-400'}>
	{status === 'online' ? 'En ligne' : 'Hors ligne'}
</span>
```

---

## chatStore

**Location**: `src/lib/stores/chat.svelte.ts`

Full-featured chat with hybrid realtime (Broadcast + postgres_changes).

### State

```typescript
class ChatStore {
	// Active conversation
	activeConversationId = $state<string | null>(null);

	// Loading states (private)
	private loadingConversations = $state<boolean>(false);
	private loadingMessages = $state<boolean>(false);
	loading = $state<boolean>(false); // Legacy compatibility

	// Public getters
	get isLoadingMessages(): boolean;
	get isLoadingConversations(): boolean;
	get conversations(): Conversation[];
	get activeConversation(): Conversation | null;
	get activeMessages(): Message[];
	get activeTypingUsers(): TypingUser[];
}
```

### Types

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
	other_user_id: string | null;
	other_user_firstname: string | null;
	other_user_lastname: string | null;
	other_user_avatar_url: string | null;
	is_muted: boolean;
	created_at: string | null;
	updated_at: string | null;
}

interface Message {
	id: string;
	conversation_id: string;
	sender_id: string;
	content: unknown; // TipTap JSON or string
	plain_text: string | null;
	created_at: string;
	is_optimistic?: boolean;
	sender_name?: string;
	sender_avatar?: string;
}

interface TypingUser {
	userId: string;
	name: string;
}
```

### Methods

#### `init(client, currentUserId, user?)`

Initialize the chat store.

```typescript
init(
  client: SupabaseClient<Database>,
  currentUserId: string,
  user?: { full_name: string | null; avatar_url: string | null }
): void
```

**Parameters**:

- `client` - Supabase client
- `currentUserId` - Current user ID
- `user` - Optional user profile for optimistic messages

#### `loadConversations()`

Load all conversations for the current user.

```typescript
loadConversations(): Promise<void>
```

#### `setActiveConversation(conversationId)`

Set the active conversation.

```typescript
setActiveConversation(conversationId: string | null): void
```

**Behavior**:

1. Updates `activeConversationId`
2. Subscribes to conversation channel
3. Loads message history
4. Marks conversation as read

#### `create1on1Chat(friendId)`

Create or get existing direct chat with a friend.

```typescript
create1on1Chat(friendId: string): Promise<string | null>
```

**Returns**: Conversation ID or `null` if failed

**Example**:

```typescript
const conversationId = await chatStore.create1on1Chat(friend.id);
if (conversationId) {
	chatStore.setActiveConversation(conversationId);
} else {
	toaster.error('Impossible de creer le chat');
}
```

#### `subscribeToConversation(conversationId)`

Subscribe to realtime events for a conversation.

```typescript
subscribeToConversation(conversationId: string): Promise<void>
```

**Events subscribed**:

- `postgres_changes` INSERT on `messages`
- Broadcast: `new_message`, `typing_indicator`, `message_reaction`, `message_read`

#### `unsubscribeFromConversation(conversationId)`

Unsubscribe from conversation events.

```typescript
unsubscribeFromConversation(conversationId: string): Promise<void>
```

**IMPORTANT**: Always call on cleanup to prevent memory leaks.

#### `loadConversationHistory(conversationId, limit?)`

Load initial messages for a conversation.

```typescript
loadConversationHistory(conversationId: string, limit?: number): Promise<void>
```

**Parameters**:

- `conversationId` - Conversation to load
- `limit` - Number of messages (default: 50)

#### `loadMoreMessages(conversationId, limit?)`

Load older messages (infinite scroll).

```typescript
loadMoreMessages(conversationId: string, limit?: number): Promise<void>
```

#### `canLoadMore(conversationId)`

Check if more messages exist.

```typescript
canLoadMore(conversationId: string): boolean
```

#### `sendMessage(conversationId, content, attachments?)`

Send a message with optimistic UI.

```typescript
sendMessage(
  conversationId: string,
  content: unknown,
  attachments?: Array<{ url: string; type: string; name: string }>
): Promise<Message | null>
```

**Flow**:

1. Create optimistic message (immediate UI update)
2. Broadcast via channel (~50ms to others)
3. Insert to database (~200ms)
4. postgres_changes replaces with DB version (~300ms)

**Example**:

```typescript
const message = await chatStore.sendMessage(conversationId, {
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello!' }] }]
});
```

#### `getMessages(conversationId)`

Get messages for a conversation.

```typescript
getMessages(conversationId: string): Message[]
```

#### `sendTypingIndicator(conversationId, isTyping)`

Send typing status via broadcast.

```typescript
sendTypingIndicator(conversationId: string, isTyping: boolean): void
```

**Note**: Debounce this at the component level.

#### `getTypingUsers(conversationId)`

Get currently typing users.

```typescript
getTypingUsers(conversationId: string): Set<string>
```

#### `toggleReaction(messageId, emoji)`

Toggle an emoji reaction on a message.

```typescript
toggleReaction(messageId: string, emoji: string): void
```

#### `reportMessage(messageId, reason, details?)`

Report a message for moderation.

```typescript
reportMessage(
  messageId: string,
  reason: 'spam' | 'harassment' | 'inappropriate' | 'other',
  details?: string
): Promise<boolean>
```

---

## notificationsRealtimeManager

**Location**: `src/lib/stores/notificationsRealtime.svelte.ts`

Real-time notification alerts.

### State

```typescript
class NotificationsRealtimeManager {
	get listening(): boolean;
}
```

### Methods

#### `init(client, currentUserId)`

```typescript
init(client: SupabaseClient<Database>, currentUserId: string): void
```

#### `startListening()`

Start listening for new notifications.

```typescript
startListening(): Promise<void>
```

**Behavior**: Subscribes to INSERT/UPDATE on `notifications` table, filtered by user ID.

#### `stopListening()`

```typescript
stopListening(): Promise<void>
```

---

## achievementsRealtimeManager

**Location**: `src/lib/stores/achievementsRealtime.svelte.ts`

Real-time achievement unlock notifications.

### State

```typescript
class AchievementsRealtimeManager {
	get isListening(): boolean;
}
```

### Methods

#### `init(client, currentUserId)`

```typescript
init(client: SupabaseClient<Database>, currentUserId: string): void
```

#### `startListening()`

Start listening for achievement unlocks.

```typescript
startListening(): Promise<void>
```

**Behavior**:

1. Subscribes to INSERT on `student_achievements`
2. Validates payload at runtime
3. Fetches full achievement details
4. Triggers `achievementsStore.showUnlockToast()`
5. Invalidates cache

#### `stopListening()`

```typescript
stopListening(): Promise<void>
```

---

## multiplayerStore

**Location**: `src/lib/stores/multiplayer.svelte.ts`

Game-specific realtime for multiplayer Minesweeper.

> **Note**: Uses direct `supabase.channel()` instead of `supabaseRealtimeManager` due to game-specific requirements.

### Constants

```typescript
const QUEUE_POLL_INTERVAL_MS = 3000; // Queue polling
const GRACE_PERIOD_MS = 30000; // Connection loss tolerance
const INACTIVITY_WARNING_MS = 30000; // Warning before abandon
const INACTIVITY_TIMEOUT_MS = 60000; // Auto-abandon timeout
```

### State

```typescript
class MultiplayerStore {
  // Queue state
  queue = $state<QueueState>({ status: 'idle', ... });
  get inQueue(): boolean;
  get queueStatus(): 'idle' | 'searching' | 'found' | 'error';
  get rank(): number | null;

  // Match state
  match = $state<MatchState>({ ... });
  get matchStatus(): MatchStatus;
  get countdown(): number;
  myProgress: PlayerProgress;
  opponentProgress: PlayerProgress;
  result: MatchResult | null;

  // Connection
  get isDisconnected(): boolean;

  // Loading states
  isJoiningQueue: boolean;
  isLeavingQueue: boolean;
  isCompletingMatch: boolean;
  isAbandoningMatch: boolean;
  error: string | null;
}
```

### Methods

#### `init(supabaseClient, currentUserId)`

```typescript
init(supabaseClient: SupabaseClient, currentUserId: string): void
```

#### `reset()`

Reset all state to initial values.

```typescript
reset(): void
```

#### `joinQueue(difficulty, matchType)`

Join the matchmaking queue.

```typescript
joinQueue(difficulty: string, matchType: MatchType): Promise<boolean>
```

#### `leaveQueue()`

Leave the matchmaking queue.

```typescript
leaveQueue(): Promise<boolean>
```

#### `startMatch()`

Start a matched game.

```typescript
startMatch(): Promise<boolean>
```

#### `updateProgress(cellsRevealed, flagsPlaced, percentComplete, isAlive)`

Send progress update to opponent.

```typescript
updateProgress(
  cellsRevealed: number,
  flagsPlaced: number,
  percentComplete: number,
  isAlive: boolean
): Promise<boolean>
```

#### `completeMatch(timeSeconds, gridState)`

Complete a match (win/lose).

```typescript
completeMatch(timeSeconds: number, gridState: GridState): Promise<boolean>
```

#### `abandonMatch(reason?)`

Abandon current match.

```typescript
abandonMatch(reason?: string): Promise<boolean>
```

#### `updateActivity()`

Reset inactivity timer.

```typescript
updateActivity(): void
```

#### `cleanup()`

Full cleanup of channels and timers.

```typescript
cleanup(): void
```

---

## Related Documentation

- [Architecture](./architecture.md) - System design
- [Chat System](./chat-system.md) - Chat details
- [Testing Guide](./testing.md) - How to test stores
