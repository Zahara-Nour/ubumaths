# Presence System

Documentation for UbuMaths' friend online/offline status tracking.

---

## Overview

The presence system tracks which friends are currently online using a heartbeat mechanism with Supabase Realtime `postgres_changes`.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRESENCE SYSTEM FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USER A (You)                           USER B (Friend)                     │
│  ───────────────                        ────────────────                    │
│                                                                             │
│  ┌──────────────────┐                   ┌──────────────────┐                │
│  │ presenceManager  │                   │ presenceManager  │                │
│  │ .init()          │                   │ .init()          │                │
│  └────────┬─────────┘                   └────────┬─────────┘                │
│           │                                      │                          │
│           │ startPresenceTracking([B])           │ startPresenceTracking([A])
│           │                                      │                          │
│           ▼                                      ▼                          │
│  ┌──────────────────┐                   ┌──────────────────┐                │
│  │ Send Heartbeat   │                   │ Send Heartbeat   │                │
│  │ every 180s       │                   │ every 180s       │                │
│  │                  │                   │                  │                │
│  │ upsert_user_     │                   │ upsert_user_     │                │
│  │ presence RPC     │                   │ presence RPC     │                │
│  └────────┬─────────┘                   └────────┬─────────┘                │
│           │                                      │                          │
│           ▼                                      ▼                          │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                    user_presence TABLE                       │            │
│  │  ┌──────────┬───────────────────────────────────┐           │            │
│  │  │ user_id  │ last_seen_at                      │           │            │
│  │  ├──────────┼───────────────────────────────────┤           │            │
│  │  │ A        │ 2025-11-15T10:30:00Z             │           │            │
│  │  │ B        │ 2025-11-15T10:29:45Z             │           │            │
│  │  └──────────┴───────────────────────────────────┘           │            │
│  └─────────────────────────────────────────────────────────────┘            │
│           │                                      │                          │
│           │ postgres_changes                     │ postgres_changes         │
│           │ (filtered by friend IDs)             │ (filtered by friend IDs) │
│           ▼                                      ▼                          │
│  ┌──────────────────┐                   ┌──────────────────┐                │
│  │ Update B status  │                   │ Update A status  │                │
│  │ to 'online'      │                   │ to 'online'      │                │
│  └──────────────────┘                   └──────────────────┘                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │           DATABASE CLEANUP (runs periodically)               │            │
│  │                                                              │            │
│  │  cleanup_stale_presence() - Removes entries older than 270s │            │
│  │  (4.5 minutes) to mark users as offline                     │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Critical Constants

```typescript
// Location: src/lib/stores/presence.svelte.ts:32

// BILLING CRITICAL - DO NOT CHANGE without recalculating quota
export const HEARTBEAT_INTERVAL = 180000; // 180 seconds (3 minutes)

// Why 180 seconds?
// - Supabase free tier: 2M realtime messages/month
// - Calculation: 200 users × 8h/day × 20 days/month
// - At 180s interval: (8×60×60/180) × 200 × 20 = 640,000 messages
// - This is 32% of free tier limit
//
// Database cleanup uses 270s (4.5 minutes) threshold
// This provides 90s buffer before user marked offline
```

### Timing Relationship

```
0s        180s       270s       360s
│          │          │          │
▼          ▼          ▼          ▼
┌──────────┬──────────┬──────────┬──────────┐
│ Heartbeat│ Heartbeat│ CLEANUP  │ Heartbeat│
│ #1       │ #2       │ removes  │ #3       │
│          │          │ if no #2 │          │
└──────────┴──────────┴──────────┴──────────┘

90s buffer between heartbeat and cleanup
ensures tolerance for network delays
```

---

## Database Schema

### user_presence Table

```sql
CREATE TABLE user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status TEXT DEFAULT 'online',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient cleanup queries
CREATE INDEX idx_user_presence_last_seen ON user_presence(last_seen_at);

-- RLS Policy
CREATE POLICY "Users can see presence of their friends"
  ON user_presence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.user_id = auth.uid() AND f.friend_id = user_presence.user_id)
         OR (f.friend_id = auth.uid() AND f.user_id = user_presence.user_id)
    )
  );
```

### Heartbeat RPC

```sql
CREATE OR REPLACE FUNCTION upsert_user_presence()
RETURNS void AS $$
BEGIN
  INSERT INTO user_presence (user_id, last_seen_at, status)
  VALUES (auth.uid(), NOW(), 'online')
  ON CONFLICT (user_id)
  DO UPDATE SET
    last_seen_at = NOW(),
    status = 'online';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Cleanup Function

```sql
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM user_presence
  WHERE last_seen_at < NOW() - INTERVAL '270 seconds';
END;
$$ LANGUAGE plpgsql;

-- Called periodically by pg_cron or application
```

---

## Implementation Details

### Initialization

```typescript
// Location: src/lib/stores/presence.svelte.ts

init(supabase: SupabaseClient<Database>, userId: string): void {
  if (this.initialized && this.userId === userId) {
    return; // Already initialized for this user
  }

  this.client = supabase;
  this.userId = userId;
  this.initialized = true;

  // Use central manager for channel lifecycle
  supabaseRealtimeManager.init(supabase, userId);
}
```

### Starting Presence Tracking

```typescript
async startPresenceTracking(friendIds: string[]): Promise<void> {
  if (!this.client || !this.userId) {
    console.error('PresenceManager not initialized');
    return;
  }

  this.trackedFriendIds = new Set(friendIds);

  // 1. Send initial heartbeat
  await this.sendHeartbeat();

  // 2. Start recurring heartbeat
  this.startHeartbeatInterval();

  // 3. Subscribe to friend presence changes
  await this.subscribeToPresenceChanges();

  // 4. Fetch initial presence state
  await this.fetchInitialPresence();
}
```

### Heartbeat Mechanism

```typescript
private startHeartbeatInterval(): void {
  // Clear existing interval
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval);
  }

  this.heartbeatInterval = setInterval(() => {
    this.sendHeartbeat();
  }, HEARTBEAT_INTERVAL);
}

private async sendHeartbeat(): Promise<void> {
  if (!this.client || !this.userId) return;

  try {
    await this.client.rpc('upsert_user_presence', {
      p_user_id: this.userId,
      p_status: 'online'
    });
  } catch (error) {
    console.error('Failed to send heartbeat:', error);
    // Don't throw - heartbeat failures shouldn't crash the app
  }
}
```

### Subscribing to Changes

```typescript
const CHANNEL_NAME = 'user-presence-updates'; // Constant, shared channel

private async subscribeToPresenceChanges(): Promise<void> {
  const channel = supabaseRealtimeManager.createChannel(CHANNEL_NAME);

  // Listen for INSERT, UPDATE, DELETE on user_presence
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'user_presence'
    },
    (payload) => this.handlePresenceUpdate(payload)
  );

  await supabaseRealtimeManager.subscribeChannel(channelName);
}
```

### Handling Updates

```typescript
private handlePresenceUpdate(payload: RealtimePostgresChangesPayload<UserPresence>): void {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  // Get the user ID from the payload
  const userId = (newRecord?.user_id || oldRecord?.user_id) as string;

  // Only process if this is a tracked friend
  if (!this.trackedFriendIds.has(userId)) {
    return;
  }

  switch (eventType) {
    case 'INSERT':
    case 'UPDATE':
      // Friend is online (just sent heartbeat)
      this.friendPresence.set(userId, 'online');
      break;

    case 'DELETE':
      // Friend's presence was cleaned up (offline)
      this.friendPresence.set(userId, 'offline');
      break;
  }
}
```

---

## Reconnection Logic

### Exponential Backoff

```typescript
// Constants
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 5000; // 5 seconds base

private async attemptReconnect(): Promise<void> {
  // Prevent concurrent reconnection attempts
  if (this.isReconnecting) {
    return;
  }

  if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Max reconnection attempts reached');
    return;
  }

  this.isReconnecting = true;

  // Calculate delay with exponential backoff
  const delay = RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts);

  // Wait before reconnecting
  await new Promise(resolve => {
    this.reconnectTimer = setTimeout(resolve, delay);
  });

  try {
    await this.resubscribe();
    this.reconnectAttempts = 0; // Reset on success
  } catch (error) {
    console.error('Reconnection failed:', error);
    this.reconnectAttempts++;
  } finally {
    this.isReconnecting = false;
  }
}
```

### Backoff Schedule

| Attempt | Delay      |
| ------- | ---------- |
| 1       | 5 seconds  |
| 2       | 10 seconds |
| 3       | 20 seconds |
| 4       | 40 seconds |
| 5       | 80 seconds |
| 6+      | Give up    |

---

## Component Integration

### Friends Page

**Location**: `src/routes/(protected)/dashboard/friends/+page.svelte`

```svelte
<script lang="ts">
	import { presenceManager } from '$lib/stores/presence.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(async () => {
		if (data.user && data.supabase) {
			// Initialize presence tracking
			presenceManager.init(data.supabase, data.user.id);

			// Get friend IDs from loaded data
			const friendIds = data.friends.map((f) => f.friend_id);

			// Start tracking
			await presenceManager.startPresenceTracking(friendIds);
		}
	});

	// Cleanup on unmount
	$effect(() => {
		return () => {
			presenceManager.stopPresenceTracking();
		};
	});
</script>

<!-- Friend list with presence indicators -->
{#each data.friends as friend}
	<div class="flex items-center gap-2">
		<Avatar src={friend.avatar_url} />
		<span>{friend.full_name}</span>

		<!-- Presence indicator -->
		{@const status = presenceManager.getFriendPresence(friend.id)}
		<span
			class="h-2 w-2 rounded-full"
			class:bg-green-500={status === 'online'}
			class:bg-gray-400={status === 'offline'}
		/>
		<span class="text-xs text-muted-foreground">
			{status === 'online' ? 'En ligne' : 'Hors ligne'}
		</span>
	</div>
{/each}
```

### Chat Sidebar with Presence

```svelte
<script lang="ts">
	import { presenceManager } from '$lib/stores/presence.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';

	// Get the other participant in a direct chat
	function getOtherParticipant(conversation: Conversation) {
		return conversation.participants.find((p) => p.user_id !== currentUserId);
	}
</script>

{#each chatStore.conversations as conversation}
	{#if conversation.type === 'direct'}
		{@const other = getOtherParticipant(conversation)}
		{@const status = presenceManager.getFriendPresence(other?.user_id ?? '')}

		<button onclick={() => chatStore.setActiveConversation(conversation.id)}>
			<div class="relative">
				<Avatar src={other?.avatar_url} />
				{#if status === 'online'}
					<span
						class="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-background bg-green-500"
					/>
				{/if}
			</div>
			<span>{other?.full_name}</span>
		</button>
	{/if}
{/each}
```

---

## Updating Friend List

When friends are added/removed:

```typescript
// After adding a new friend
async function onFriendAdded(newFriendId: string) {
	const currentFriends = Array.from(presenceManager.trackedFriendIds);
	await presenceManager.updateFriendList([...currentFriends, newFriendId]);
}

// After removing a friend
async function onFriendRemoved(removedFriendId: string) {
	const currentFriends = Array.from(presenceManager.trackedFriendIds);
	await presenceManager.updateFriendList(currentFriends.filter((id) => id !== removedFriendId));
}
```

---

## Cleanup

### Stopping Tracking

```typescript
async stopPresenceTracking(): Promise<void> {
  // 1. Clear heartbeat interval
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
  }

  // 2. Clear reconnect timer
  if (this.reconnectTimer) {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  // 3. Unsubscribe from channel
  const channelName = `friend-presence:${this.userId}`;
  await supabaseRealtimeManager.unsubscribeChannel(channelName);

  // 4. Reset state
  this.friendPresence.clear();
  this.trackedFriendIds.clear();
  this.reconnectAttempts = 0;
  this.isReconnecting = false;
}
```

---

## Error Handling

### Browser Check

```typescript
private isBrowser(): boolean {
  return typeof window !== 'undefined';
}

startPresenceTracking(friendIds: string[]): Promise<void> {
  if (!this.isBrowser()) {
    console.warn('Presence tracking only available in browser');
    return Promise.resolve();
  }
  // ... rest of implementation
}
```

### Empty Friend List

```typescript
startPresenceTracking(friendIds: string[]): Promise<void> {
  if (friendIds.length === 0) {
    console.log('No friends to track');
    return Promise.resolve();
  }
  // ... rest of implementation
}
```

### RPC Failures

```typescript
private async sendHeartbeat(): Promise<void> {
  try {
    await this.client.rpc('upsert_user_presence');
  } catch (error) {
    console.error('Heartbeat failed:', error);
    // Don't throw - isolated failures shouldn't crash the app
    // Reconnection logic will handle persistent failures
  }
}
```

---

## Related Documentation

- [Stores Reference](./stores-reference.md) - Full API
- [Architecture](./architecture.md) - System design
- [Testing Guide](./testing.md) - Presence testing
- [Best Practices](./best-practices.md) - Quota management
