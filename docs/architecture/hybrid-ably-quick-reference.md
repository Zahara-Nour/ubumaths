# Hybrid WebSocket + Ably: Quick Reference

## At a Glance

**Problem**: Custom WebSocket works well for presence, but lacks features needed for chat, notifications, and reactions.

**Solution**: Hybrid architecture - keep WebSocket for ephemeral features, migrate complex features to Ably.

**Timeline**: 7-8 weeks incremental migration, zero breaking changes.

---

## Current State (WebSocket Only)

```
┌─ Presence Updates (Friend online/offline)     ✅ Working
├─ Chat Message Infrastructure                  ✅ Defined (not used)
├─ Typing Indicators                            ✅ Defined (not used)
├─ Read Receipts                                ✅ Defined (not used)
└─ Emoji Reactions                              ✅ Defined (not used)
```

## Target State (Hybrid)

```
┌─ Presence Updates                 WebSocket   ✅ Fast, ephemeral
├─ Chat Messages                    Ably        ✅ Persistent, synced
├─ Typing Indicators                WebSocket   ✅ Ephemeral, low-latency
├─ Read Receipts                    Ably        ✅ Persistent metadata
├─ Emoji Reactions                  Ably        ✅ Message metadata
└─ Notifications (NEW)              Ably        ✅ Server-side delivery
```

---

## Quick Decision Tree

**Is it ephemeral?** (no persistence needed)

- Yes → **WebSocket** (presence, typing)
- No → **Ably** (chat, reactions, notifications)

**Is it simple broadcast?** (no metadata, routing)

- Yes → **WebSocket** (quick, lightweight)
- No → **Ably** (complex delivery, routing)

**Needs history/sync?** (across devices, sessions)

- Yes → **Ably** (built-in)
- No → **WebSocket** (saves overhead)

**Is it server-initiated?** (notifications, tasks)

- Yes → **Ably** (server API)
- No → **WebSocket** (peer-to-peer)

---

## Implementation Phases

| Phase | Feature                             | Duration  | Status      |
| ----- | ----------------------------------- | --------- | ----------- |
| **1** | Ably setup, token endpoint, manager | Week 1    | Not started |
| **2** | Chat message migration              | Weeks 2-3 | Not started |
| **3** | Read receipts + Reactions           | Week 4    | Not started |
| **4** | Notifications system                | Week 5    | Not started |
| **5** | Monitoring + Documentation          | Week 6    | Not started |
| **6** | Teacher features (optional)         | Week 7-8  | Not started |

---

## File Changes Needed

### New Files (Create)

```
src/lib/stores/ably.svelte.ts                 # Ably client manager
src/lib/stores/realtime.svelte.ts             # Unified interface
src/lib/stores/notifications.svelte.ts        # Notification management
src/lib/server/realtime/                      # Server utilities
  ├── ably-server.ts
  ├── notifications.ts
  ├── chat.ts
  └── presence.ts
src/routes/api/realtime/                      # API endpoints
  ├── ably-token/+server.ts
  └── presence/+server.ts
src/lib/types/realtime.ts                     # Unified message types
```

### Modified Files

```
src/lib/stores/websocket.svelte.ts            # Add event handler registration
src/lib/stores/chat.svelte.ts                 # Wire Ably subscriptions
src/lib/stores/friends.svelte.ts              # Minor updates
src/lib/server/websocket-server.ts            # Keep as-is (backward compatible)
package.json                                   # Add 'ably' dependency
```

### No Changes Needed

```
Database schema (no migrations)
Existing components (compatible)
Auth system (uses same JWT)
```

---

## Message Type Summary

| Type               | System    | Direction | Frequency    | Example                         |
| ------------------ | --------- | --------- | ------------ | ------------------------------- |
| `auth`             | WebSocket | C→S       | Once         | `{ token }`                     |
| `heartbeat`        | WebSocket | C→S       | 60s          | `{}`                            |
| `presence_update`  | WebSocket | S→C       | Login/logout | `{ userId, status }`            |
| `chat_message`     | Ably      | C→S→C     | Variable     | `{ conversationId, content }`   |
| `typing_indicator` | WebSocket | C→S→C     | 1-2/sec      | `{ conversationId, isTyping }`  |
| `message_read`     | Ably      | C→S→C     | On view      | `{ conversationId, messageId }` |
| `message_reaction` | Ably      | C→S→C     | On action    | `{ messageId, emoji }`          |
| `notification`     | Ably      | S→C       | Variable     | `{ type, title, content }`      |

---

## Configuration Template

### Environment Variables

```env
# Existing (keep)
PUBLIC_SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
WS_URL=ws://localhost:3001  # or wss://...

# New (add)
ABLY_API_KEY=your-ably-api-key
PUBLIC_ABLY_KEY=your-ably-public-key  # For client
```

### Feature Flags

```typescript
// src/lib/config/features.ts
export const features = {
	ablyChat: process.env.VITE_FEATURE_ABLY_CHAT === 'true',
	ablyNotifications: process.env.VITE_FEATURE_ABLY_NOTIFICATIONS === 'true',
	teacherActivity: process.env.VITE_FEATURE_TEACHER_ACTIVITY === 'true'
};
```

---

## Integration Points

### In Page Component

```typescript
$effect(() => {
	realtimeManager.init(userId, wsToken, ablyToken);
	chatStore.init(supabase, userId);
	notificationStore.init(supabase, userId);

	return () => {
		realtimeManager.disconnect();
	};
});
```

### In Chat Component

```typescript
// No changes to usage, all abstracted:
await chatStore.sendMessage(conversationId, content);
chatStore.setActiveConversation(conversationId);
const messages = $derived(chatStore.activeMessages);
```

### In Friend Component

```typescript
// Still works exactly the same:
const status = friendsManager.getFriendPresence(friendId);
```

---

## Fallback Behavior

**All failing?**

- Show "Offline" banner
- Queued messages saved to IndexedDB (future)
- Auto-retry when connection restored

**Only WebSocket failing?**

- Chat uses Ably only
- Presence unavailable
- Reduced functionality banner

**Only Ably failing?**

- Chat falls back to WebSocket
- Notifications unavailable
- Other features work normally

---

## Performance Impact

| Metric      | Before    | After     | Impact      |
| ----------- | --------- | --------- | ----------- |
| Memory/user | ~5 KB     | ~7 KB     | +40% (2 KB) |
| Connections | 1         | 2         | Parallel    |
| Latency p95 | <50ms     | <100ms    | Acceptable  |
| Bandwidth   | ~2 KB/min | ~3 KB/min | Minimal     |

---

## Monitoring Checklist

### During Development

- [ ] Both connections initialize in parallel
- [ ] Connection status updates correctly
- [ ] No duplicate messages (deduplication working)
- [ ] Fallback triggers correctly
- [ ] Token refresh works
- [ ] Reconnection works
- [ ] No memory leaks

### In Production

- [ ] Monitor connection success rate (target: >99.9%)
- [ ] Monitor fallback rate (target: <5%)
- [ ] Monitor message latency (target: <200ms p95)
- [ ] Monitor error rates (target: <0.1%)
- [ ] Monitor Ably API usage
- [ ] Alert on both systems down

---

## Common Issues & Solutions

| Issue                       | Cause                     | Solution                            |
| --------------------------- | ------------------------- | ----------------------------------- |
| Ably token generation fails | Invalid API key           | Check env var `ABLY_API_KEY`        |
| Messages not delivering     | Wrong channel name        | Verify `chat:conversationId` format |
| Duplicate messages          | Deduplication not working | Check message ID in Set             |
| High memory usage           | Event listener leaks      | Verify cleanup in $effect           |
| Slow chat                   | Ably unavailable          | Check Ably status, should fallback  |

---

## Testing Coverage

| Area            | Test Type   | Status      |
| --------------- | ----------- | ----------- |
| Ably connection | Unit        | Not started |
| Hybrid init     | Integration | Not started |
| Chat delivery   | E2E         | Not started |
| Fallback        | Scenario    | Not started |
| Deduplication   | Unit        | Not started |
| Token refresh   | Integration | Not started |

---

## Rollback Plan

**If major issues**, revert in 5 minutes:

1. Disable in feature flags

   ```typescript
   ablyChat: false,
   ablyNotifications: false
   ```

2. No code changes needed
3. Users auto-revert to WebSocket
4. Monitor error rate drops
5. Investigate and fix

---

## Cost Analysis

**For 1000 active users**:

- Ably messages: ~10M/month (free tier = 3M)
- Cost: $0.70/month (10M × $0.10/M)
- WebSocket: Included in hosting

**Very affordable** - less than $10/month at 10K users

---

## Success Metrics

### Technical

- [ ] 0 breaking changes to existing code
- [ ] 99.9% connection uptime
- [ ] <100ms message latency p95
- [ ] <5% fallback rate
- [ ] Zero duplicate messages

### User Experience

- [ ] Chat messages feel instant
- [ ] Typing indicators responsive
- [ ] Read receipts working
- [ ] Notifications delivered
- [ ] No connection issues visible

### Operational

- [ ] Monitoring/alerting in place
- [ ] Documentation complete
- [ ] Team trained
- [ ] Runbooks written

---

## Team Responsibilities

| Role         | Responsibility                               |
| ------------ | -------------------------------------------- |
| **Frontend** | Chat/notification UI, store integration      |
| **Backend**  | Ably token generation, notification triggers |
| **DevOps**   | Ably setup, monitoring, secrets management   |
| **QA**       | Test all features, network failure scenarios |

---

## Key Wins

1. **Better UX**: Real-time chat without page refresh
2. **Scalability**: Both systems scale independently
3. **Reliability**: Either system handles failures
4. **Future-proof**: Ably supports advanced features
5. **Cost-effective**: Pay-as-you-go pricing
6. **Zero risk**: Gradual migration with fallbacks

---

## Next Steps

1. **This week**: Review this document with team
2. **Next week**: Set up Ably account (5 minutes)
3. **Week 2-3**: Implement Phase 1 (foundation)
4. **Week 4-5**: Implement Phase 2 (chat)
5. **Week 6-8**: Implement remaining phases

**Start date target**: Early December 2024

---

## Resources

- Full architecture doc: `docs/architecture/hybrid-websocket-ably-architecture.md`
- Ably docs: https://ably.com/docs
- WebSocket current implementation: `src/lib/server/websocket-server.ts`
- Chat store: `src/lib/stores/chat.svelte.ts`

---

**Questions?** Check the full architecture document or discuss in team meeting.
