# Best Practices

Performance, security, and operational best practices for UbuMaths' realtime system.

---

## Quota Management

### Understanding Free Tier Limits

Supabase Realtime free tier provides:

- **2 million messages/month**
- Counted events: `postgres_changes` (INSERT, UPDATE, DELETE)
- **FREE**: Broadcast API, Presence API

### Current Usage Calculation

```
Presence Heartbeats:
- 200 active users
- 8 hours/day average usage
- 20 days/month active
- Heartbeat every 180 seconds

Calculation:
Users × Hours × Days × (3600s / 180s heartbeats)
= 200 × 8 × 20 × 20
= 640,000 messages/month

That's 32% of the free tier limit.
```

### Remaining Budget

```
Total budget:      2,000,000 messages
Presence usage:      640,000 messages (32%)
Remaining:         1,360,000 messages (68%)

Available for:
- Chat messages (postgres_changes)
- Notifications
- Achievement unlocks
- Other realtime features
```

### Best Practices for Quota

1. **Use Broadcast for ephemeral data**

   ```typescript
   // FREE - Use for typing, cursors, reactions preview
   channel.send({
   	type: 'broadcast',
   	event: 'typing',
   	payload: { userId, isTyping: true }
   });
   ```

2. **Batch database writes when possible**

   ```typescript
   // BAD - Multiple INSERT events
   for (const item of items) {
   	await supabase.from('table').insert(item);
   }

   // GOOD - Single INSERT event
   await supabase.from('table').insert(items);
   ```

3. **Filter subscriptions tightly**

   ```typescript
   // BAD - Receives all messages
   channel.on('postgres_changes', { event: 'INSERT', table: 'messages' }, cb);

   // GOOD - Only receives relevant messages
   channel.on(
   	'postgres_changes',
   	{
   		event: 'INSERT',
   		table: 'messages',
   		filter: `conversation_id=eq.${conversationId}`
   	},
   	cb
   );
   ```

4. **Don't change HEARTBEAT_INTERVAL without recalculating**
   ```typescript
   // BILLING CRITICAL
   export const HEARTBEAT_INTERVAL = 180000; // DO NOT CHANGE
   ```

---

## Performance Optimization

### Connection Management

```typescript
// GOOD: Reuse channels via central manager
const channel = supabaseRealtimeManager.createChannel('my-channel');

// BAD: Creating new channels directly
const channel = supabase.channel('my-channel'); // Don't do this
```

### Subscription Lifecycle

```typescript
// GOOD: Clean up on unmount
$effect(() => {
	return () => {
		supabaseRealtimeManager.unsubscribeChannel('my-channel');
	};
});

// BAD: Forgetting to unsubscribe (memory leak)
onMount(() => {
	supabaseRealtimeManager.subscribeChannel('my-channel');
	// No cleanup!
});
```

### Debouncing High-Frequency Events

```typescript
// GOOD: Debounce typing indicators
let typingTimeout: ReturnType<typeof setTimeout>;

function handleInput() {
	clearTimeout(typingTimeout);
	chatStore.sendTypingIndicator(conversationId, true);

	typingTimeout = setTimeout(() => {
		chatStore.sendTypingIndicator(conversationId, false);
	}, 2000);
}

// BAD: Sending on every keystroke
function handleInput() {
	chatStore.sendTypingIndicator(conversationId, true); // Floods the channel
}
```

### Pagination for Message History

```typescript
// GOOD: Load messages in batches
await chatStore.loadConversationHistory(conversationId, 50);

// Infinite scroll
if (chatStore.canLoadMore(conversationId)) {
	await chatStore.loadMoreMessages(conversationId, 50);
}

// BAD: Loading all messages at once
await chatStore.loadConversationHistory(conversationId, 10000); // Too many!
```

### Optimistic Updates

```typescript
// GOOD: Show immediately, sync later
async sendMessage(content: string) {
  // 1. Optimistic update (0ms)
  const optimisticMessage = this.createOptimisticMessage(content);
  this.messages.push(optimisticMessage);

  // 2. Broadcast to others (~50ms)
  channel.send({ type: 'broadcast', event: 'new_message', payload: optimisticMessage });

  // 3. Persist to DB (~200ms)
  const dbMessage = await this.persistMessage(content);

  // 4. Update optimistic with real ID
  this.updateOptimisticMessage(optimisticMessage.id, dbMessage);
}

// BAD: Wait for DB before showing
async sendMessage(content: string) {
  const dbMessage = await this.persistMessage(content); // 200ms delay
  this.messages.push(dbMessage);
}
```

---

## Memory Leak Prevention

### Timer Cleanup

```typescript
class MyStore {
	private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

	startTimer(id: string) {
		// Clear existing timer first
		this.clearTimer(id);

		this.timers.set(
			id,
			setTimeout(() => {
				// Timer action
			}, 5000)
		);
	}

	clearTimer(id: string) {
		const timer = this.timers.get(id);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(id);
		}
	}

	cleanup() {
		// Clear ALL timers
		for (const [id, timer] of this.timers) {
			clearTimeout(timer);
		}
		this.timers.clear();
	}
}
```

### Interval Cleanup

```typescript
class PresenceManager {
	private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

	startHeartbeat() {
		// Clear existing first
		this.stopHeartbeat();

		this.heartbeatInterval = setInterval(() => {
			this.sendHeartbeat();
		}, HEARTBEAT_INTERVAL);
	}

	stopHeartbeat() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}
}
```

### Map/Set Cleanup

```typescript
class ChatStore {
	private typingUsers = new Map<string, Set<string>>();
	private typingTimers = new Map<string, Map<string, ReturnType<typeof setTimeout>>>();

	unsubscribe(conversationId: string) {
		// Clear Sets
		this.typingUsers.delete(conversationId);

		// Clear all timers in the Map
		const timerMap = this.typingTimers.get(conversationId);
		if (timerMap) {
			for (const timer of timerMap.values()) {
				clearTimeout(timer);
			}
			this.typingTimers.delete(conversationId);
		}
	}
}
```

---

## Security Best Practices

### Input Validation

```typescript
// Always validate with Zod
import { z } from 'zod';

const messageSchema = z.object({
	content: z.union([
		z.string().min(1).max(10000),
		z.object({ type: z.literal('doc'), content: z.array(z.unknown()) })
	]),
	conversationId: z.string().uuid()
});

// Validate before processing
const result = messageSchema.safeParse(input);
if (!result.success) {
	throw new Error('Invalid message format');
}
```

### Runtime Payload Validation

```typescript
// Don't trust realtime payloads blindly
private handlePresenceUpdate(payload: unknown): void {
  // Validate structure at runtime
  if (!this.isValidPresencePayload(payload)) {
    console.warn('Invalid presence payload received');
    return;
  }

  // Now safe to use
  this.processPresence(payload as PresencePayload);
}

private isValidPresencePayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.user_id === 'string' &&
    typeof p.last_seen_at === 'string'
  );
}
```

### RLS Enforcement

```sql
-- Ensure realtime events respect RLS
-- Messages only visible to conversation participants
CREATE POLICY "conversation_participants_see_messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );
```

### Sensitive Data Handling

```typescript
// DON'T expose sensitive data in broadcast
channel.send({
	type: 'broadcast',
	event: 'user_update',
	payload: {
		userId: user.id,
		// DON'T: email: user.email,
		// DON'T: phone: user.phone,
		name: user.name, // OK: public info only
		avatarUrl: user.avatar_url // OK: public info only
	}
});
```

---

## Error Handling

### Graceful Degradation

```typescript
async function initRealtime() {
	try {
		await presenceManager.startPresenceTracking(friendIds);
	} catch (error) {
		console.error('Presence tracking failed:', error);
		// App continues to work, just without live presence
		// Don't crash the entire application
	}
}
```

### Reconnection with Limits

```typescript
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;

async function handleDisconnect() {
	if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
		// Show user-facing error
		toaster.error('Connexion perdue. Veuillez rafraichir la page.');
		return;
	}

	reconnectAttempts++;
	await attemptReconnect();
}

// Reset counter on successful reconnect
function onReconnected() {
	reconnectAttempts = 0;
}
```

### User Feedback

```typescript
// Show connection status to users
{#if supabaseRealtimeManager.connectionStatus === 'connecting'}
  <div class="bg-yellow-100 text-yellow-800 px-4 py-2">
    Reconnexion en cours...
  </div>
{:else if supabaseRealtimeManager.connectionStatus === 'disconnected'}
  <div class="bg-red-100 text-red-800 px-4 py-2">
    Connexion perdue. Les messages en temps reel sont desactives.
  </div>
{/if}
```

---

## Monitoring & Debugging

### Development Logging

```typescript
// Enable in development only
if (import.meta.env.DEV) {
	channel.on('*', (event) => {
		console.log('[Realtime]', event);
	});
}
```

### Channel State Inspection

```typescript
// Debug helper
function debugChannels() {
	console.log('Active channels:', supabaseRealtimeManager.channelCount);
	console.log('Connection status:', supabaseRealtimeManager.connectionStatus);
}
```

### Supabase Dashboard

Monitor realtime usage in the Supabase dashboard:

- **Project Settings > Usage** - Message counts
- **Database > Realtime** - Active connections
- **Logs > Realtime** - Event logs

---

## Component Patterns

### Initialization Pattern

```svelte
<script lang="ts">
	import { presenceManager } from '$lib/stores/presence.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();
	let initialized = false;

	onMount(() => {
		if (!data.user || !data.supabase || initialized) return;

		initialized = true;
		presenceManager.init(data.supabase, data.user.id);
	});

	// Cleanup
	$effect(() => {
		return () => {
			presenceManager.stopPresenceTracking();
		};
	});
</script>
```

### Conditional Subscription

```svelte
<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte';

	let previousConversationId: string | null = null;

	$effect(() => {
		const currentId = chatStore.activeConversationId;

		// Unsubscribe from previous
		if (previousConversationId && previousConversationId !== currentId) {
			chatStore.unsubscribeFromConversation(previousConversationId);
		}

		// Subscribe to new
		if (currentId && currentId !== previousConversationId) {
			chatStore.subscribeToConversation(currentId);
		}

		previousConversationId = currentId;
	});
</script>
```

### Layout-Level Initialization

```svelte
<!-- +layout.svelte -->
<script lang="ts">
	import { notificationsRealtimeManager } from '$lib/stores/notificationsRealtime.svelte';
	import { achievementsRealtimeManager } from '$lib/stores/achievementsRealtime.svelte';

	let { data, children } = $props();

	// Initialize once at layout level
	$effect(() => {
		if (!data.user || !data.supabase) return;

		notificationsRealtimeManager.init(data.supabase, data.user.id);
		achievementsRealtimeManager.init(data.supabase, data.user.id);

		notificationsRealtimeManager.startListening();
		achievementsRealtimeManager.startListening();

		return () => {
			notificationsRealtimeManager.stopListening();
			achievementsRealtimeManager.stopListening();
		};
	});
</script>

{@render children()}
```

---

## Checklist

### Before Adding New Realtime Feature

- [ ] Calculate quota impact
- [ ] Choose correct method (postgres_changes vs Broadcast)
- [ ] Plan cleanup strategy
- [ ] Design reconnection handling
- [ ] Add input validation
- [ ] Write tests

### Before Deployment

- [ ] Verify quota usage is within limits
- [ ] Test reconnection scenarios
- [ ] Verify cleanup on unmount
- [ ] Check for memory leaks in dev tools
- [ ] Test with slow/unstable connections

### Code Review Checklist

- [ ] Channel subscriptions have matching unsubscriptions
- [ ] Timers/intervals are cleared on cleanup
- [ ] Payloads are validated at runtime
- [ ] Error handling doesn't crash the app
- [ ] No sensitive data in broadcasts

---

## Related Documentation

- [Architecture](./architecture.md) - System design
- [Stores Reference](./stores-reference.md) - API documentation
- [Testing Guide](./testing.md) - Testing patterns
