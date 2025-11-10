# Real-Time Architecture - Quick Reference

**Quick lookup guide for UbuMaths real-time systems**

---

## One-Minute Overview

UbuMaths uses **3 real-time mechanisms**:

1. **WebSocket (Port 3001)**: Friend presence, chat messages
2. **HTTP Polling (Manual)**: Notifications
3. **TTL Cache (10-120min)**: Dashboard data (rewards, warnings)

**Maturity: 6/10** - Presence working, chat ready, notifications need upgrade

---

## File Locations

### WebSocket Infrastructure

- **Server**: `/Users/david/Coding/js/ubumaths/src/lib/server/websocket-server.ts` (370 lines)
- **Client**: `/Users/david/Coding/js/ubumaths/src/lib/stores/websocket.svelte.ts` (221 lines)

### Friends System

- **Store**: `/Users/david/Coding/js/ubumaths/src/lib/stores/friends.svelte.ts` (333 lines)
- **Integration**: WebSocket presence updates

### Caching

- **Student**: `/Users/david/Coding/js/ubumaths/src/lib/stores/studentDashboardCache.svelte.ts` (784 lines)
- **Teacher**: `/Users/david/Coding/js/ubumaths/src/lib/stores/teacherDashboardCache.svelte.ts` (895 lines)
- **Utilities**: `/Users/david/Coding/js/ubumaths/src/lib/utils/cache-sync.ts` (329 lines)

### Chat (Ready but not integrated)

- **Store**: `/Users/david/Coding/js/ubumaths/src/lib/stores/chat.svelte.ts` (100+ lines)
- **Status**: Scaffold complete, needs WebSocket integration

### Notifications (Manual polling)

- **Store**: `/Users/david/Coding/js/ubumaths/src/lib/stores/notifications.svelte.ts` (80+ lines)
- **Status**: On-demand only, no auto push

---

## WebSocket Message Types

Implemented in `websocket-server.ts:24-43`:

```typescript
'heartbeat'; // Keep-alive (60s client → server)
'auth'; // Initial authentication with JWT
'presence_update'; // Online/offline broadcast
'chat_message'; // Real-time messages
'typing_indicator'; // User typing status
'message_read'; // Read receipt
'message_reaction'; // Emoji reaction
```

---

## Cache TTLs

```typescript
PROFILE_TTL   = 2 hours      // Slow-changing
REWARDS_TTL   = 10 minutes   // Frequent updates
WARNINGS_TTL  = 10 minutes   // Teacher-driven
CLASS_TTL     = 24 hours     // Class info
SCHOOL_TTL    = 24 hours     // School info
```

---

## Optimistic Update Pattern

```typescript
// 1. Instant UI update BEFORE API call
studentCache.updateGidouillesOptimistic(+5);

// 2. Make API request
try {
	await fetch('/api/rewards/add', { amount: 5 });
	// Cache already correct ✅
} catch (error) {
	// 3. Rollback on failure
	studentCache.updateGidouillesOptimistic(-5);
}
```

---

## WebSocket Connection Lifecycle

```
1. Client calls: websocketManager.connect(userId, token)
2. Create WebSocket to ws://localhost:3001
3. Send: { type: 'auth', token: JWT }
4. Server verifies, stores connection
5. Client starts heartbeat (every 60s)
6. On disconnect: Attempt reconnect with exponential backoff
   - 1s, 2s, 4s, 8s, ... max 30s
```

---

## Real-Time Status by Feature

| Feature           | Status       | File                    | Notes               |
| ----------------- | ------------ | ----------------------- | ------------------- |
| Friend Presence   | ✅ Working   | websocket-server.ts     | Uses 60s heartbeat  |
| Chat Messages     | ⚠️ Structure | chat.svelte.ts          | Ready for WebSocket |
| Typing Indicators | ⚠️ Ready     | websocket-server.ts     | Needs frontend      |
| Notifications     | ❌ Polling   | notifications.svelte.ts | Manual only         |
| Teacher Activity  | ❌ Missing   | —                       | Not implemented     |
| Live Assessments  | ❌ Missing   | —                       | Not implemented     |

---

## Security Status

### Implemented

- ✅ JWT authentication on WebSocket
- ✅ RLS policies on database
- ✅ User isolation in presence

### Missing (Gaps)

- ❌ Rate limiting on messages
- ❌ Input validation with Zod
- ❌ Message size limits
- ❌ Cooldown after rejection

---

## Performance Metrics

```
WebSocket Setup: 120-250ms
Cache Hit: <1ms
Cache Miss: 100-200ms
Message Broadcast: 50-210ms
Heartbeat Overhead: ~20KB/hour per user
```

---

## Database Tables

### user_presence

- Stores online/offline status
- Updated via RPC: `upsert_user_presence(userId, status)`
- Cleanup: every 60s for stale entries (>1h offline)

### friendships

- requester_id, addressee_id, status, friendship_type
- Unidirectional storage, bidirectional UI
- Unique constraint on (requester_id, addressee_id)

### messages, notifications, etc

- Ready for real-time but not yet integrated

---

## Key Performance Optimizations

1. **TTL-based caching**: Reduces API calls
2. **Optimistic updates**: Instant UI feedback
3. **Heartbeat only**: Minimal bandwidth (20 bytes/60s)
4. **SvelteMap reactivity**: Automatic UI sync
5. **Exponential backoff**: Prevents reconnection storms

---

## Quick Start: WebSocket Integration

To add WebSocket to a new feature:

```typescript
// 1. Listen for messages in chat store
websocketManager.on('chat_message', (msg) => {
	chatStore.addMessage(msg);
});

// 2. Send message from client
websocketManager.send({
	type: 'chat_message',
	conversationId: 'conv-123',
	messageId: 'msg-456',
	content: {
		/* ... */
	}
});

// 3. Server broadcasts to participants
// (already implemented in websocket-server.ts)
```

---

## Scaling Considerations

Current bottleneck: Single WebSocket server (port 3001)

For multi-instance:

- Need Redis pub/sub
- Sticky session load balancing
- Or: Migrate to Supabase Realtime

---

## Common Patterns

### Check Cache Freshness

```typescript
const cached = this.cache;
const isExpired = Date.now() - cached.fetchedAt >= TTL;
```

### Reactive Derived Value

```typescript
let rewards = $derived(teacherCache.getRewardsSync(classId));
```

### Sync Across Teacher/Student

```typescript
import { syncVipCards } from '$lib/utils/cache-sync';
syncVipCards(context, updatedCards); // Handles both contexts
```

---

## Next Steps (Priority Order)

### P0 (2-3 days): Security

- [ ] Add rate limiting (rateLimiter.ts exists)
- [ ] Validate with Zod
- [ ] Add message size limits

### P1 (3-5 days): Features

- [ ] Integrate chat with WebSocket
- [ ] Replace notification polling
- [ ] Add typing indicators UI

### P2 (1-2 weeks): Enhancement

- [ ] Live assessments
- [ ] Teacher activity feeds
- [ ] Consider Supabase Realtime

---

## Troubleshooting

**Users not seeing presence updates?**

- Check WebSocket connection status (browser DevTools)
- Verify JWT token valid
- Check heartbeat running (every 60s)

**Stale presence not clearing?**

- Check: RPC `cleanup_stale_presence()` runs hourly
- Manual trigger: `SELECT cleanup_stale_presence()`

**High latency on message broadcast?**

- Profile: `getConversationParticipantIds()` is slow
- Solution: Cache participant list

---

**Full docs**: See `/docs/architecture/realtime-architecture.md`
