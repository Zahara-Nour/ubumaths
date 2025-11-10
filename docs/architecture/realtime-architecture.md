# UbuMaths Real-Time Architecture Analysis

**Analysis Date**: November 9, 2025
**Analyzer**: Claude Code
**Status**: Comprehensive real-time architecture review

---

## Executive Summary

UbuMaths has a **hybrid real-time architecture** combining:

- **WebSocket-based presence** for friend status updates
- **HTTP polling** (manual on-demand) for notifications
- **TTL-based caching** for dashboard data (10-120 min)
- **Optimistic UI updates** for rewards/warnings

**Current Real-Time Maturity: 6/10**

- ✅ Working: Friend presence, WebSocket infrastructure
- ⚠️ Partial: Chat system (structure exists, needs integration)
- ❌ Missing: Live quiz/assessment updates, teacher activity feeds, notifications

---

## 1. CURRENT REAL-TIME PATTERNS

### 1.1 WebSocket-Based Presence (Primary)

**File**: `/Users/david/Coding/js/ubumaths/src/lib/server/websocket-server.ts` (370 lines)
**Port**: 3001 (separate from HTTP server)

#### Architecture

```
┌──────────────────┐
│  Browser (Svelte)│
│  websocketManager│
└────────┬─────────┘
         │ (JWT Auth)
         │
   ┌─────▼──────┐
   │  WS Server  │ (port 3001)
   │  ws package │
   └─────┬──────┘
         │
         ├─► user_presence table
         ├─► friendships table (RLS)
         └─► Broadcast updates
```

#### Supported Message Types

```typescript
// src/lib/server/websocket-server.ts:24-43
type: 'heartbeat'; // Keep-alive (60s interval)
type: 'auth'; // JWT authentication
type: 'presence_update'; // Online/offline broadcast
type: 'chat_message'; // Real-time messaging
type: 'typing_indicator'; // Typing status
type: 'message_read'; // Read receipts
type: 'message_reaction'; // Emoji reactions
```

#### Key Features

1. **Authentication** (lines 166-200)
   - Requires JWT token on initial connection
   - Token verified with `supabase.auth.getUser()`
   - User stored in `connections` Map<userId, WebSocket>

2. **Presence Tracking** (lines 112-122, 185-193)
   - Online/offline status persisted to `user_presence` table
   - RPC call: `upsert_user_presence(userId, status)`
   - Friends notified via broadcast

3. **Heartbeat** (lines 202-208)
   - Client sends heartbeat every 60s (HEARTBEAT_INTERVAL in websocket.svelte.ts)
   - Server updates presence timestamp
   - Prevents false "offline" status from connection drops

4. **Friend Presence Broadcast** (lines 188-193)
   - When user comes online: notify all friends
   - When user goes offline: notify all friends
   - Friends determined via `get_friend_ids` RPC

5. **Automatic Cleanup** (lines 354-359)
   - Stale presence cleanup every 60 seconds
   - RPC: `cleanup_stale_presence()`
   - Removes users offline > 1 hour

#### Message Flow Examples

**User Comes Online**:

1. Client: `{ type: 'auth', token: JWT }`
2. Server: Verify JWT, store connection
3. Server: `updatePresence(userId, 'online')`
4. Server: `broadcastToUsers(friendIds, { type: 'presence_update', userId, status: 'online' })`
5. Friends receive broadcast and update UI

**Chat Message Broadcast** (lines 210-233):

1. Client: `{ type: 'chat_message', conversationId, messageId, content, ... }`
2. Server: Fetch conversation participants
3. Server: Broadcast to all except sender
4. Participants receive in real-time

---

### 1.2 Client-Side WebSocket Manager

**File**: `/Users/david/Coding/js/ubumaths/src/lib/stores/websocket.svelte.ts` (221 lines)

#### Singleton Pattern

```typescript
export const websocketManager = new WebSocketManager();

// Properties
friendsPresence = $state<Map<string, 'online' | 'offline'>>(new Map());
connectionStatus = $state<'connected' | 'disconnected' | 'connecting'>('disconnected');
```

#### Reconnection Logic (lines 194-210)

**Exponential Backoff**:

```
Attempt 1: 1000ms
Attempt 2: 2000ms
Attempt 3: 4000ms
Attempt 4: 8000ms
...max: 30000ms (30 seconds)
```

#### Lifecycle

1. **connect(userId, token)** - Initialize connection
2. **establishConnection()** - Create WebSocket
3. **startHeartbeat()** - Send heartbeat every 60s
4. **handleMessage()** - Process server messages
5. **scheduleReconnect()** - On disconnect
6. **disconnect()** - Explicit cleanup

---

### 1.3 Friends System Integration

**File**: `/Users/david/Coding/js/ubumaths/src/lib/stores/friends.svelte.ts` (333 lines)

#### Real-Time Presence Display (lines 250-254)

```typescript
// Integration point
websocketManager.friendsPresence.set(friendId, status);
// Later: getFriendPresence(friendId) returns status
```

#### Workflow

1. **loadFriendships()** - Initial load (lines 26-128)
   - Fetch friendships from Supabase
   - Fetch user_presence table
   - Populate friendsPresence map

2. **Listen to WebSocket** - Ongoing updates
   - Receives `presence_update` messages
   - Updates UI via reactive `friendsPresence` map

---

## 2. CLIENT-SERVER COMMUNICATION PATTERNS

### 2.1 Optimistic UI Updates (Rewards & Warnings)

**Files**:

- `/Users/david/Coding/js/ubumaths/src/lib/stores/studentDashboardCache.svelte.ts` (784 lines)
- `/Users/david/Coding/js/ubumaths/src/lib/utils/cache-sync.ts` (329 lines)

#### Pattern: Predict + Sync

```typescript
// BEFORE API call - instant UI update
studentCache.updateGidouillesOptimistic(+5);

// Make API request
try {
	await fetch('/api/rewards/add', { body: { amount: 5 } });
	// Success: cache already correct ✅
} catch (error) {
	// Rollback on failure
	studentCache.updateGidouillesOptimistic(-5);
}
```

#### TTL-Based Caching

```typescript
// src/lib/stores/studentDashboardCache.svelte.ts:114-133
PROFILE_TTL = 2 * 60 * 60 * 1000; // 2 hours
REWARDS_TTL = 10 * 60 * 1000; // 10 minutes
WARNINGS_TTL = 10 * 60 * 1000; // 10 minutes
```

**Lifecycle**:

1. Check cache: fresh? → return cached data (< 1ms)
2. Cache miss/expired → fetch from API (100-200ms)
3. Update cache timestamp
4. Reactive state updates automatically

---

### 2.2 Teacher Dashboard Cache

**File**: `/Users/david/Coding/js/ubumaths/src/lib/stores/teacherDashboardCache.svelte.ts` (895 lines)

#### Multi-Class Context

Teacher sees multiple classes, each with:

- Student list (2h TTL)
- Rewards per student (10min TTL)
- Warnings per student per period (10min TTL)

**Composite Key Pattern**:

```typescript
warningsCache.get(`${classId}:${periodId}`);
```

#### SvelteMap Reactivity

```typescript
private rewardsCache = new SvelteMap<string, CachedRewards>();
// .set() automatically triggers Svelte 5 reactivity
```

---

### 2.3 Notification System

**File**: `/Users/david/Coding/js/ubumaths/src/lib/stores/notifications.svelte.ts` (80+ lines)

#### Current Approach: Manual Polling

```typescript
// NOTE: Manual refresh only - no automatic polling
// (architecture simplified 2025-10-30)

async fetchUnread(): Promise<void> {
    const response = await fetch('/api/notifications/unread');
    this.notifications = await response.json();
}

async fetchUnreadCount(): Promise<void> {
    const response = await fetch('/api/notifications/unread-count');
    this.unreadCount = data.count;
}
```

**Trigger Points**:

- Page load
- Manual refresh button
- On-demand in effects

---

### 2.4 Chat System (Partial Implementation)

**File**: `/Users/david/Coding/js/ubumaths/src/lib/stores/chat.svelte.ts` (100+ lines)

#### Structure Exists

```typescript
conversations = $state<Conversation[]>([]);
messages = $state<Map<string, Message[]>>(new Map());
typingUsers = $state<Map<string, TypingUser[]>>(new Map());
activeConversationId = $state<string | null>(null);
```

#### WebSocket Integration Point

```typescript
// Ready for real-time integration with websocketManager
// Currently not fully connected to WebSocket broadcasts
private supabase: SupabaseClient | null = null;
```

**Status**: Scaffolding complete, needs WebSocket integration for:

- Real-time chat messages
- Typing indicators
- Read receipts
- Reactions

---

## 3. SUPABASE INTEGRATION

### 3.1 Client Configuration

**File**: `/Users/david/Coding/js/ubumaths/src/lib/server/supabase.ts` (115 lines)

#### Server-Side Setup (Hook)

```typescript
// Creates SSR-compatible client
event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
	cookies: { getAll, setAll }
});
```

#### Session Verification (lines 71-105)

```typescript
// SECURITY: safeGetSession() verifies with Supabase auth server
// (doesn't just trust cookies)
const {
	data: { user },
	error
} = await event.locals.supabase.auth.getUser();
```

**Timeout Protection**: 15-second timeout prevents hanging

### 3.2 Real-Time Capable Tables

From database schema:

| Table                | Features              | Real-Time Potential                         |
| -------------------- | --------------------- | ------------------------------------------- |
| `friendships`        | Mutual relationships  | ⚠️ RLS prevents Supabase Realtime           |
| `user_presence`      | Online/offline status | ✅ Custom WebSocket (preferred)             |
| `messages`           | Chat content          | ✅ Ready for Supabase Realtime or WebSocket |
| `messages_reactions` | Emoji reactions       | ✅ Ready for real-time                      |
| `notifications`      | User notifications    | ✅ Ready for real-time                      |
| `student_warnings`   | Behavioral records    | ⚠️ Teachers only (not shared real-time)     |

---

## 4. DATABASE SCHEMA FOR REAL-TIME

### Tables Involved

**user_presence** (real-time status):

```
id (PK)
user_id (FK → profiles)
status: 'online' | 'offline'
last_heartbeat: TIMESTAMPTZ
created_at
updated_at
```

**friendships** (request-response model):

```
id (PK)
requester_id (FK → profiles)
addressee_id (FK → profiles)
status: 'pending' | 'accepted' | 'rejected'
friendship_type: 'classmate' | 'mentor'
created_at
```

**messages** (chat):

```
id (PK)
conversation_id (FK)
sender_id (FK)
content (JSONB - TipTap)
plain_text
created_at
```

**notifications**:

```
id (PK)
user_id (FK)
type (activity | mention | achievement | etc)
read_at: nullable
created_at
```

---

## 5. USE CASES FOR REAL-TIME

### Currently Implemented (✅)

1. **Friend Presence**
   - Friends see online/offline status
   - 60-second heartbeat
   - Automatic stale cleanup

### Partially Implemented (⚠️)

2. **Chat System**
   - Infrastructure ready
   - Message persistence: ✅
   - Real-time delivery: ⚠️ Not integrated with WebSocket

### Not Implemented (❌)

3. **Teacher Dashboard - Live Student Activity**
   - Exercise completion events
   - Quiz submissions
   - Class participation
   - → Would benefit from SSE or WebSocket broadcast

4. **Live Assessments**
   - Question delivery to students
   - Answer collection
   - Countdown timer synchronization
   - → Requires bidirectional real-time

5. **Notifications**
   - Manual polling only
   - → Should use WebSocket or Supabase Realtime

6. **Class Collaboration**
   - Live problem-solving
   - Whiteboard synchronization
   - → High-frequency events (would need efficient encoding)

---

## 6. PERFORMANCE CHARACTERISTICS

### Connection Overhead

```
WebSocket Connection Setup:
- TCP handshake: ~50-100ms
- TLS negotiation: ~50-100ms
- JWT verification: ~20-50ms
Total: ~120-250ms per connection

Heartbeat Overhead:
- Client sends every 60s
- Payload: ~20 bytes
- Total bandwidth per user/hour: ~20KB (negligible)
```

### Cache Performance

```
Cache Hit: <1ms (in-memory access)
Cache Miss: 100-200ms (API roundtrip)
TTL Values:
  - Profile: 2h (slow-changing)
  - Rewards: 10min (frequent updates)
  - Warnings: 10min (teacher-driven)
```

### WebSocket Broadcast

```
getConversationParticipantIds() → ~50-200ms
broadcastToUsers() → ~1-10ms per recipient
Total: 50-210ms per message broadcast
```

---

## 7. CURRENT CONSTRAINTS & LIMITATIONS

### Architecture Constraints

| Constraint                | Impact                                      | Severity |
| ------------------------- | ------------------------------------------- | -------- |
| **WebSocket Port 3001**   | Separate from HTTP (needs CORS/proxy setup) | Medium   |
| **No Supabase Realtime**  | Dual messaging infrastructure               | Medium   |
| **TTL caching only**      | Data freshness depends on TTL               | Low      |
| **No subscription model** | Must implement custom channels              | Medium   |
| **No rate limiting**      | Spam possible on friend requests            | High     |

### Scalability Considerations

```
Current Setup:
- Single WebSocket server (port 3001)
- All connections to one process
- In-memory connections map
- Bottleneck: ~1000-5000 concurrent users per instance

For Scaling:
- Need Redis pub/sub for multi-instance
- Load balancer with sticky sessions
- Supabase Realtime alternative
```

---

## 8. FILE REFERENCE MAP

### Core Real-Time Infrastructure

| File                                 | Lines | Purpose                                        |
| ------------------------------------ | ----- | ---------------------------------------------- |
| `src/lib/server/websocket-server.ts` | 370   | WebSocket server, message handling, broadcasts |
| `src/lib/stores/websocket.svelte.ts` | 221   | Client-side manager, reconnection logic        |
| `src/lib/stores/friends.svelte.ts`   | 333   | Friend system, presence integration            |

### Caching & State Management

| File                                             | Lines | Purpose                                    |
| ------------------------------------------------ | ----- | ------------------------------------------ |
| `src/lib/stores/studentDashboardCache.svelte.ts` | 784   | Student cache (profile, rewards, warnings) |
| `src/lib/stores/teacherDashboardCache.svelte.ts` | 895   | Teacher cache (multi-class context)        |
| `src/lib/utils/cache-sync.ts`                    | 329   | Cache sync utilities (optimistic updates)  |

### Real-Time Features

| File                                     | Lines | Purpose                        |
| ---------------------------------------- | ----- | ------------------------------ |
| `src/lib/stores/chat.svelte.ts`          | 100+  | Chat store (scaffold ready)    |
| `src/lib/stores/notifications.svelte.ts` | 80+   | Notifications (manual polling) |
| `src/lib/stores/activity.svelte.ts`      | ?     | User activity tracking         |

### Database

| Migration                            | Purpose                          |
| ------------------------------------ | -------------------------------- |
| `035_create_user_presence_table.sql` | Presence table + RLS             |
| `034_create_friendships_table.sql`   | Friendships + unique constraints |

### API Endpoints

| Endpoint                            | Method | Purpose                    |
| ----------------------------------- | ------ | -------------------------- |
| `/api/notifications/unread`         | GET    | Fetch unread notifications |
| `/api/notifications/unread-count`   | GET    | Count only                 |
| `/api/chat/`                        | POST   | Chat API (if implemented)  |
| `/api/student/profile`              | GET    | Student profile            |
| `/api/student/rewards`              | GET    | Student rewards            |
| `/api/student/warnings/[periodId]`  | GET    | Student warnings           |
| `/api/classes/[classId]/gidouilles` | GET    | Class rewards              |
| `/api/classes/[classId]/warnings`   | GET    | Class warnings             |

---

## 9. SECURITY ANALYSIS

### WebSocket Security

✅ **Implemented**:

- JWT authentication required
- Token verified with Supabase auth
- Connection stored only after verification

⚠️ **Gaps**:

- No rate limiting on message frequency
- No message size validation
- Potential spam via rapid message sends

### Database Security

✅ **RLS Policies**:

- Friendships: Users see only their own
- Presence: Users see only friends' presence
- Teachers: Can see all students in class

❌ **Gaps** (from friends-system.md):

- No input validation with Zod
- No rate limiting on friend requests
- No cooldown after rejection

---

## 10. RECOMMENDATIONS & NEXT STEPS

### Immediate (P0 - 2-3 days)

1. **Add Input Validation**
   - Implement Zod schemas for friend requests
   - Validate message content before broadcast

2. **Add Rate Limiting**
   - Friend requests: 10/hour per user
   - Messages: 50/minute per user
   - Use existing `rateLimiter.ts`

3. **WebSocket Error Handling**
   - Add explicit message validation
   - Return error responses to malformed messages

### Short-Term (P1 - 3-5 days)

1. **Integrate Chat with WebSocket**
   - Route `chat_message` events to chatStore
   - Implement typing indicators
   - Add read receipts

2. **Replace Notification Polling**
   - Add WebSocket subscription on auth
   - Broadcast new notifications
   - Update unread count in real-time

3. **Teacher Activity Feed**
   - Broadcast student completion events
   - Show live class participation
   - Real-time assignment collection

### Medium-Term (P2 - 1-2 weeks)

1. **Supabase Realtime Migration (Optional)**
   - Evaluate Supabase Realtime for chat
   - Keep custom WebSocket for presence (performance)
   - Reduce dual infrastructure

2. **Live Quiz/Assessment**
   - Broadcast questions to students
   - Collect answers in real-time
   - Synchronize timers

3. **Caching Enhancements**
   - Add Redis for multi-instance scaling
   - Implement cache invalidation pubsub
   - Reduce database load

---

## 11. TECHNOLOGY COMPARISON

### Current: Custom WebSocket

**Pros**:

- Full control, lower latency
- Presence optimized for this use case
- No external service dependency

**Cons**:

- Requires separate server process
- Manual reconnection logic
- Not auto-scaling friendly

### Alternative: Supabase Realtime

**Pros**:

- Managed service, auto-scaling
- Works with RLS policies
- Less code to maintain

**Cons**:

- Slightly higher latency
- Can't access conn map for targeted broadcasts
- Additional cost

### Hybrid Approach (Recommended)

```
Keep: Custom WebSocket for presence (low-frequency, specific)
Add: Supabase Realtime for chat (high-frequency, broadcast)
Benefit: Best of both worlds
```

---

## 12. MONITORING & OBSERVABILITY

### What's Missing

- [ ] WebSocket connection metrics
- [ ] Message throughput tracking
- [ ] Cache hit/miss rates
- [ ] Real-time alerts for disconnections
- [ ] Bandwidth usage monitoring

### Suggested Additions

```typescript
// Track metrics
metrics = {
	connectionsActive: 0,
	messagesPerSecond: 0,
	averageLatency: 0,
	cacheHitRate: 0
};

// Periodic logging
setInterval(() => {
	logger.info('WS Metrics:', metrics);
}, 60000);
```

---

## CONCLUSION

**Current State**: UbuMaths has a solid foundation for real-time features with a working WebSocket infrastructure for presence and a structured caching system. The architecture is production-ready for current features but needs enhancements for scaling and new features.

**Quick Wins** (2-3 days):

- Add rate limiting
- Complete chat integration
- Replace notification polling

**Growth Path**:

- Live assessments
- Teacher activity feeds
- Cross-instance scaling (Redis)

**Next Checkpoint**: Evaluate after implementing live notifications and chat to determine if Supabase Realtime migration is beneficial.
