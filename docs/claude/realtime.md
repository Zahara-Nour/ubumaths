# Realtime Communication (Supabase)

Guide complet pour l'utilisation de Supabase Realtime dans UbuMaths.

**Architecture** : Migrated from custom WebSocket to Supabase Realtime (Nov 2025)

---

## Three Methods

### 1. postgres_changes (DB-backed)

- **Latency**: ~300ms
- **Quota**: COUNTS toward free tier limit
- **Use cases**: Friend presence, notifications
- **When to use**: Need persistence + JOINs + RLS

### 2. Broadcast API (Ephemeral)

- **Latency**: ~50ms
- **Quota**: FREE (doesn't count)
- **Use cases**: Typing indicators, live cursors
- **When to use**: Instant feedback, no persistence needed

### 3. Hybrid (Both methods)

- **Use case**: Chat messages
- **Pattern**: Broadcast (50ms UX) + postgres_changes (300ms reliability)
- **Benefit**: Best of both worlds with deduplication

---

## Critical Constants

```typescript
// BILLING CRITICAL - DO NOT CHANGE without recalculating quota
const HEARTBEAT_INTERVAL = 180000; // 180 seconds (3 minutes)
// Calculation: 200 users × 8h × 20 days = ~640K messages/month (32% of 2M free tier)
```

**Warning**: Modifying this constant impacts billing. Always recalculate quota before changes.

---

## Usage Pattern

### Basic Setup

```typescript
import { supabaseRealtimeManager } from '$lib/stores/supabaseRealtime.svelte';

// Initialize (once per app lifecycle)
supabaseRealtimeManager.init(supabase, userId);

// Create & subscribe to channel
const channel = supabaseRealtimeManager.createChannel('my-channel');
channel.on('postgres_changes', { event: 'INSERT', table: 'notifications' }, callback);
await supabaseRealtimeManager.subscribeChannel('my-channel');

// Cleanup (on component destroy)
await supabaseRealtimeManager.unsubscribeChannel('my-channel');
```

### Broadcast Pattern

```typescript
// Send ephemeral message (no DB storage)
channel.send({
	type: 'broadcast',
	event: 'typing',
	payload: { userId, isTyping: true }
});

// Listen for broadcasts
channel.on('broadcast', { event: 'typing' }, (payload) => {
	// Handle typing indicator
});
```

---

## Specialized Stores

### presenceManager

Friend online/offline status using postgres_changes.

```typescript
import { presenceManager } from '$lib/stores/presence.svelte';

// Initialize
presenceManager.init(supabase, userId);

// Get friend status
const status = presenceManager.getFriendPresence(friendId);
// Returns: 'online' | 'offline'
```

### notificationsRealtimeManager

New notification alerts using postgres_changes.

```typescript
import { notificationsRealtimeManager } from '$lib/stores/notificationsRealtime.svelte';

// Subscribe to new notifications
notificationsRealtimeManager.init(supabase, userId);
```

### chatStore

Hybrid chat with Broadcast + postgres_changes and automatic deduplication.

```typescript
import { chatStore } from '$lib/stores/chat.svelte';

// Initialize
chatStore.init(supabase, userId);

// Send message (uses hybrid approach)
await chatStore.sendMessage(conversationId, content);

// Messages arrive via both channels, deduplication handled automatically
```

---

## Chat Features

### Creating 1-on-1 Chats

```typescript
// Create or get existing chat with a friend
const conversationId = await chatStore.create1on1Chat(friendId);

if (conversationId) {
	chatStore.setActiveConversation(conversationId);
} else {
	toaster.error('Impossible de créer le chat (vous devez être amis)');
}
```

### Message Reporting

```typescript
// Report a message
const success = await chatStore.reportMessage(messageId, 'inappropriate', 'Optional details here');

if (success) {
	toaster.success('Message signalé');
} else {
	toaster.error('Échec du signalement');
}
```

### Using Chat with Presence

```typescript
import { presenceManager } from '$lib/stores/presence.svelte';
import { chatStore } from '$lib/stores/chat.svelte';

// Initialize both stores
presenceManager.init(supabase, userId);
chatStore.init(supabase, userId);

// Get friend online status in chat UI
const status = presenceManager.getFriendPresence(friendId);
```

---

## Best Practices

1. **Always cleanup**: Unsubscribe from channels when components are destroyed
2. **Batch updates**: Use debouncing for frequent updates (typing indicators)
3. **Handle reconnection**: Supabase handles this automatically, but verify state after reconnect
4. **Monitor quota**: Keep track of postgres_changes usage vs free tier limit
5. **Use Broadcast for ephemeral data**: Don't waste quota on non-persistent data

---

## Related Documentation

- [Supabase Realtime Architecture](../architecture/supabase-realtime.md)
- [Database Schema](./database.md)
