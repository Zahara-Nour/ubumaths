# WebSocket to Supabase Realtime Migration Guide

Complete migration guide from custom WebSocket server (port 3001) to Supabase Realtime.

🆕 **2025-11-09** - Phase 7: Realtime Migration

---

## Table of Contents

- [Migration Overview](#migration-overview)
- [Step-by-Step Migration](#step-by-step-migration)
- [Breaking Changes](#breaking-changes)
- [Testing Strategy](#testing-strategy)
- [Rollback Plan](#rollback-plan)
- [Lessons Learned](#lessons-learned)

---

## Migration Overview

### Why Migrate?

**Problems with Custom WebSocket**:

- ❌ Vercel incompatible (requires long-running process)
- ❌ No RLS enforcement (security risk)
- ❌ Manual reconnection logic
- ❌ Quota exceeded (2.9M messages/month vs 2M free tier)
- ❌ Additional infrastructure to maintain

**Benefits of Supabase Realtime**:

- ✅ Serverless compatible
- ✅ RLS policies enforced automatically
- ✅ Built-in reconnection
- ✅ 66% quota reduction (1M messages/month)
- ✅ Zero infrastructure maintenance

### Migration Scope

**Files Deleted** (591 lines):

- `src/lib/server/websocket-server.ts` (370 lines)
- `src/lib/stores/websocket.svelte.ts` (221 lines)

**Files Created** (1,663 lines):

- `src/lib/stores/supabaseRealtime.svelte.ts` (239 lines)
- `src/lib/stores/presence.svelte.ts` (395 lines)
- `src/lib/stores/notificationsRealtime.svelte.ts` (186 lines)
- `src/lib/stores/chat.svelte.ts` (842 lines)

**Tests Created** (2,119 lines):

- `src/lib/stores/supabaseRealtime.test.ts` (636 lines)
- `src/lib/stores/presence.test.ts` (458 lines)
- `src/lib/stores/chat.test.ts` (1,025 lines)

**Database Migration**:

- `supabase/migrations/20251109235216_optimize_presence_for_realtime.sql`

---

## Step-by-Step Migration

### Phase 1: Database Preparation

**1. Create migration file**:

```bash
# Create timestamped migration
pnpm db:migrate -- create optimize_presence_for_realtime
```

**2. Update `cleanup_stale_presence()` function**:

```sql
-- Change timeout from 120s to 270s
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  UPDATE user_presence
  SET status = 'offline', updated_at = now()
  WHERE status = 'online'
  AND last_heartbeat < now() - interval '270 seconds';
  -- Changed from '2 minutes' to '270 seconds' (180s heartbeat + 90s buffer)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**3. Add performance indexes**:

```sql
-- Index for Realtime subscription filtering
CREATE INDEX IF NOT EXISTS idx_user_presence_updated_at
  ON user_presence(updated_at DESC);

-- Partial index for "who's online" queries
CREATE INDEX IF NOT EXISTS idx_user_presence_online_activity
  ON user_presence(status, last_heartbeat DESC)
  WHERE status = 'online';
```

**4. Push migration**:

```bash
pnpm db:migrate
```

---

### Phase 2: Central Infrastructure

**1. Create `supabaseRealtime.svelte.ts`**:

This store manages channel lifecycle for ALL Realtime features.

```typescript
// src/lib/stores/supabaseRealtime.svelte.ts
import { browser } from '$app/environment';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

class SupabaseRealtimeManager {
	private supabase: SupabaseClient<Database> | null = null;
	private userId: string | null = null;
	private channels = new Map<string, RealtimeChannel>();

	connectionStatus = $state<'connected' | 'disconnected' | 'connecting'>('disconnected');

	get isConnected(): boolean {
		return this.connectionStatus === 'connected';
	}

	init(client: SupabaseClient<Database>, currentUserId: string): void {
		if (!browser) return;
		this.supabase = client;
		this.userId = currentUserId;
		this.connectionStatus = 'connecting';
	}

	createChannel(channelName: string): RealtimeChannel {
		if (!browser || !this.supabase) {
			throw new Error('Realtime manager not initialized');
		}

		if (this.channels.has(channelName)) {
			return this.channels.get(channelName)!;
		}

		const channel = this.supabase.channel(channelName);
		this.channels.set(channelName, channel);
		return channel;
	}

	async subscribeChannel(channelName: string): Promise<void> {
		if (!browser) return;

		const channel = this.channels.get(channelName);
		if (!channel) {
			throw new Error(`Channel "${channelName}" not found`);
		}

		return new Promise((resolve, reject) => {
			channel.subscribe((status) => {
				switch (status) {
					case 'SUBSCRIBED':
						this.connectionStatus = 'connected';
						resolve();
						break;
					case 'CHANNEL_ERROR':
					case 'TIMED_OUT':
						this.connectionStatus = 'disconnected';
						reject(new Error(`Failed to subscribe: ${status}`));
						break;
				}
			});
		});
	}

	async unsubscribeChannel(channelName: string): Promise<void> {
		if (!browser || !this.supabase) return;

		const channel = this.channels.get(channelName);
		if (!channel) return;

		await this.supabase.removeChannel(channel);
		this.channels.delete(channelName);

		if (this.channels.size === 0) {
			this.connectionStatus = 'disconnected';
		}
	}

	async disconnect(): Promise<void> {
		if (!browser || !this.supabase) return;

		for (const [channelName, channel] of this.channels.entries()) {
			await this.supabase.removeChannel(channel);
		}

		this.channels.clear();
		this.connectionStatus = 'disconnected';
	}

	get channelCount(): number {
		return this.channels.size;
	}
}

export const supabaseRealtimeManager = new SupabaseRealtimeManager();
```

**Key Design Decisions**:

- Singleton pattern (one manager for all features)
- Separation of concerns (infrastructure vs. business logic)
- Reactive state with Svelte 5 `$state`

---

### Phase 3: Presence Tracking

**1. Create `presence.svelte.ts`**:

```typescript
// src/lib/stores/presence.svelte.ts
import { browser } from '$app/environment';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseRealtimeManager } from './supabaseRealtime.svelte';

const HEARTBEAT_INTERVAL = 180000; // 180 seconds (BILLING CRITICAL)
const CHANNEL_NAME = 'user-presence-updates';

class PresenceManager {
	private friendsPresence = $state<Map<string, 'online' | 'offline'>>(new Map());
	private supabase: SupabaseClient | null = null;
	private userId: string | null = null;
	private friendIds: string[] = [];
	private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

	init(supabase: SupabaseClient, userId: string): void {
		if (!browser) return;
		this.supabase = supabase;
		this.userId = userId;
		supabaseRealtimeManager.init(supabase, userId);
	}

	async startPresenceTracking(friendIds: string[]): Promise<void> {
		if (!browser || !this.supabase || !this.userId) return;

		this.friendIds = friendIds;

		if (friendIds.length === 0) {
			this.startHeartbeat(); // Still maintain own presence
			return;
		}

		// Subscribe to postgres_changes
		const filter = `user_id=in.(${friendIds.join(',')})`;
		const channel = supabaseRealtimeManager.createChannel(CHANNEL_NAME);

		channel.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'user_presence',
				filter
			},
			(payload) => {
				this.handlePresenceUpdate(payload);
			}
		);

		await supabaseRealtimeManager.subscribeChannel(CHANNEL_NAME);
		await this.fetchInitialPresence();
		this.startHeartbeat();
	}

	private async fetchInitialPresence(): Promise<void> {
		if (!this.supabase || this.friendIds.length === 0) return;

		const { data } = await this.supabase
			.from('user_presence')
			.select('user_id, status')
			.in('user_id', this.friendIds);

		if (data) {
			for (const row of data) {
				this.friendsPresence.set(row.user_id, row.status);
			}
		}
	}

	private handlePresenceUpdate(payload: any): void {
		const { eventType, new: newRecord, old: oldRecord } = payload;

		if (eventType === 'DELETE') {
			this.friendsPresence.set(oldRecord.user_id, 'offline');
		} else if (eventType === 'INSERT' || eventType === 'UPDATE') {
			this.friendsPresence.set(newRecord.user_id, newRecord.status);
		}
	}

	private startHeartbeat(): void {
		if (!browser) return;

		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}

		void this.sendHeartbeat(); // Initial heartbeat

		this.heartbeatInterval = setInterval(() => {
			void this.sendHeartbeat();
		}, HEARTBEAT_INTERVAL);
	}

	private async sendHeartbeat(): Promise<void> {
		if (!this.supabase || !this.userId) return;

		await this.supabase.rpc('upsert_user_presence', {
			p_user_id: this.userId,
			p_status: 'online'
		});
	}

	async stopPresenceTracking(): Promise<void> {
		if (!browser) return;

		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}

		if (this.supabase && this.userId) {
			await this.supabase.rpc('upsert_user_presence', {
				p_user_id: this.userId,
				p_status: 'offline'
			});
		}

		await supabaseRealtimeManager.unsubscribeChannel(CHANNEL_NAME);
		this.friendsPresence.clear();
	}

	getFriendPresence(friendId: string): 'online' | 'offline' {
		return this.friendsPresence.get(friendId) ?? 'offline';
	}
}

export const presenceManager = new PresenceManager();
```

**Migration Notes**:

- Old: 60s heartbeat via WebSocket
- New: 180s heartbeat via Supabase RPC (66% reduction)
- Old: Manual connection management
- New: Automatic reconnection via Supabase

---

### Phase 4: Notifications

**1. Create `notificationsRealtime.svelte.ts`**:

```typescript
// src/lib/stores/notificationsRealtime.svelte.ts
import { browser } from '$app/environment';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseRealtimeManager } from './supabaseRealtime.svelte';
import { notificationStore } from './notifications.svelte';

const CHANNEL_NAME = 'user-notifications';

class NotificationsRealtimeManager {
	private supabase: SupabaseClient | null = null;
	private userId: string | null = null;

	init(client: SupabaseClient, currentUserId: string): void {
		if (!browser) return;
		this.supabase = client;
		this.userId = currentUserId;
		supabaseRealtimeManager.init(client, currentUserId);
	}

	async startListening(): Promise<void> {
		if (!browser || !this.supabase || !this.userId) return;

		const channel = supabaseRealtimeManager.createChannel(CHANNEL_NAME);

		// Listen for new notifications
		channel.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'notifications',
				filter: `user_id=eq.${this.userId}`
			},
			() => {
				// Refetch to get full notification with JOINs (sender profile, etc.)
				notificationStore.fetchUnread();
			}
		);

		await supabaseRealtimeManager.subscribeChannel(CHANNEL_NAME);
	}

	async stopListening(): Promise<void> {
		if (!browser) return;
		await supabaseRealtimeManager.unsubscribeChannel(CHANNEL_NAME);
	}
}

export const notificationsRealtimeManager = new NotificationsRealtimeManager();
```

**Migration Notes**:

- Old: WebSocket event `notification:new`
- New: postgres_changes INSERT on notifications table
- Why refetch? JOINs (sender profile) not available in postgres_changes payload

---

### Phase 5: Chat (Hybrid Approach)

**1. Create `chat.svelte.ts`** with hybrid architecture:

```typescript
// src/lib/stores/chat.svelte.ts
// ... (see full implementation in docs/architecture/supabase-realtime.md)
```

**Key Pattern - Deduplication**:

```typescript
// 1. Broadcast listener (50ms)
channel.on('broadcast', { event: 'new_message' }, (payload) => {
	addMessage({ ...payload.message, is_broadcast: true });
});

// 2. postgres_changes listener (300ms)
channel.on('postgres_changes', { event: 'INSERT', table: 'messages' }, (payload) => {
	const existingIndex = messages.findIndex((m) => m.id === payload.new.id);

	if (existingIndex !== -1) {
		// Replace broadcast version with DB version
		messages[existingIndex] = payload.new;
	} else {
		// Add new message (user was offline during broadcast)
		messages.push(payload.new);
	}
});
```

---

### Phase 6: Update Components

**1. Replace WebSocket imports**:

```typescript
// OLD
import { websocketStore } from '$lib/stores/websocket.svelte';
websocketStore.connect(userId);

// NEW
import { presenceManager } from '$lib/stores/presence.svelte';
presenceManager.init(supabase, userId);
await presenceManager.startPresenceTracking(friendIds);
```

**2. Update presence checks**:

```typescript
// OLD
const isOnline = websocketStore.isUserOnline(friendId);

// NEW
const isOnline = presenceManager.getFriendPresence(friendId) === 'online';
```

**3. Update notification listeners**:

```typescript
// OLD
websocketStore.on('notification:new', (data) => {
	// Handle notification
});

// NEW
import { notificationsRealtimeManager } from '$lib/stores/notificationsRealtime.svelte';
notificationsRealtimeManager.init(supabase, userId);
await notificationsRealtimeManager.startListening();
// Notifications automatically refetched via notificationStore
```

---

### Phase 7: Remove Old Code

**1. Delete WebSocket files**:

```bash
rm src/lib/server/websocket-server.ts
rm src/lib/stores/websocket.svelte.ts
```

**2. Remove WebSocket dependencies**:

```json
// package.json
{
	"dependencies": {
		// Remove if no longer needed
		// "ws": "^8.0.0"
	}
}
```

**3. Remove WebSocket references**:

```bash
# Search for remaining references
grep -r "websocket" src/
grep -r "WebSocket" src/
```

---

## Breaking Changes

### 1. Import Paths

**Before**:

```typescript
import { websocketStore } from '$lib/stores/websocket.svelte';
```

**After**:

```typescript
import { presenceManager } from '$lib/stores/presence.svelte';
import { notificationsRealtimeManager } from '$lib/stores/notificationsRealtime.svelte';
import { chatStore } from '$lib/stores/chat.svelte';
```

---

### 2. Presence API

**Before**:

```typescript
websocketStore.connect(userId);
const isOnline = websocketStore.isUserOnline(friendId);
websocketStore.disconnect();
```

**After**:

```typescript
presenceManager.init(supabase, userId);
await presenceManager.startPresenceTracking(friendIds);
const isOnline = presenceManager.getFriendPresence(friendId) === 'online';
await presenceManager.stopPresenceTracking();
```

---

### 3. Heartbeat Interval

**Before**: 60 seconds
**After**: 180 seconds

**Impact**: Users marked offline slower (270s vs 120s)

---

### 4. RLS Policies Enforced

**Before**: No RLS enforcement (security risk)
**After**: All subscriptions filtered by RLS policies

**Migration Action**: Verify RLS policies allow SELECT for authenticated users.

---

## Testing Strategy

### 1. Unit Tests

**Created**:

- `supabaseRealtime.test.ts` - Channel lifecycle
- `presence.test.ts` - Heartbeat interval (CRITICAL)
- `chat.test.ts` - Deduplication logic

**Run**:

```bash
pnpm test:unit
```

**Critical Test** (HEARTBEAT_INTERVAL):

```typescript
it('must be exactly 180 seconds to stay within free tier', () => {
	expect(HEARTBEAT_INTERVAL).toBe(180000);
	const messagesPerMonth = calculateMonthlyMessages(HEARTBEAT_INTERVAL);
	expect(messagesPerMonth).toBeLessThan(2_000_000);
});
```

---

### 2. Integration Testing

**Manual Checklist**:

- [ ] Friend goes online → presence updates within 180s
- [ ] Friend goes offline → marked offline within 270s
- [ ] New notification → UI updates within 1s
- [ ] Send chat message → appears instantly (50ms)
- [ ] Send chat message → persists on reload (postgres_changes)
- [ ] Typing indicator → shows/hides correctly
- [ ] Multiple tabs → all receive updates
- [ ] Connection lost → reconnects automatically

---

### 3. Load Testing

**Quota Validation**:

```typescript
// Calculate expected message volume
const peakUsers = 200;
const peakHoursPerDay = 8;
const schoolDaysPerMonth = 20;

const messagesPerDay = (peakUsers * peakHoursPerDay * 3600) / HEARTBEAT_INTERVAL;
const messagesPerMonth = messagesPerDay * schoolDaysPerMonth;

console.log('Estimated messages/month:', messagesPerMonth);
// Expected: ~640K (32% of 2M free tier)
```

---

## Rollback Plan

### If Migration Fails

**1. Restore WebSocket files from git**:

```bash
git checkout HEAD~1 -- src/lib/server/websocket-server.ts
git checkout HEAD~1 -- src/lib/stores/websocket.svelte.ts
```

**2. Revert database migration**:

```sql
-- Restore old cleanup_stale_presence() timeout
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  UPDATE user_presence
  SET status = 'offline', updated_at = now()
  WHERE status = 'online'
  AND last_heartbeat < now() - interval '2 minutes'; -- Back to 120s
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**3. Restore component imports**:

```bash
# Find all files using new stores
grep -r "presenceManager\|notificationsRealtimeManager\|chatStore" src/

# Manually restore websocketStore imports
```

**4. Restart WebSocket server**:

```bash
# Re-deploy WebSocket server on port 3001
```

---

### Gradual Rollback

**Option 1: Keep both systems running**

Run WebSocket + Supabase Realtime in parallel:

- WebSocket for production traffic
- Supabase Realtime for testing

**Option 2: Feature flag**

```typescript
const USE_SUPABASE_REALTIME = import.meta.env.VITE_USE_REALTIME === 'true';

if (USE_SUPABASE_REALTIME) {
	presenceManager.init(supabase, userId);
} else {
	websocketStore.connect(userId);
}
```

---

## Lessons Learned

### What Went Well

1. **Separation of Concerns**
   - Central infrastructure (`supabaseRealtimeManager`)
   - Specialized stores (presence, notifications, chat)
   - Easier to test and maintain

2. **Comprehensive Testing**
   - 2,119 lines of tests (99% pass rate)
   - Caught heartbeat interval issue early
   - Deduplication logic validated

3. **Hybrid Architecture**
   - Broadcast for instant UX (FREE)
   - postgres_changes for reliability
   - Best of both worlds

4. **Documentation**
   - Migration documented during implementation
   - Clear quota calculations
   - Troubleshooting guide

---

### Challenges

1. **Quota Management**
   - Initial 60s heartbeat exceeded free tier
   - Required recalculation → 180s
   - Created CRITICAL test to prevent regression

2. **Deduplication Logic**
   - Broadcast + postgres_changes = potential duplicates
   - Solved with `is_broadcast` flag
   - Required careful testing

3. **RLS Policy Compatibility**
   - Existing policies needed verification
   - `auth.uid()` must be available in Realtime context
   - Some policies needed adjustment

4. **Migration Coordination**
   - Database migration → Store creation → Component updates
   - Required careful sequencing
   - Testing at each step

---

### Recommendations

**For Future Migrations**:

1. **Start with Infrastructure** (supabaseRealtimeManager first)
2. **Migrate One Feature at a Time** (presence → notifications → chat)
3. **Test Quota Impact** before deploying
4. **Keep Old Code** until new code is proven
5. **Document as You Go** (not after)

**For Quota Management**:

1. **Always calculate** message volume before changing intervals
2. **Create tests** to prevent regressions (HEARTBEAT_INTERVAL test)
3. **Use Broadcast** for ephemeral events (FREE)
4. **Monitor usage** in Supabase dashboard

**For Testing**:

1. **Unit test critical logic** (deduplication, heartbeat)
2. **Integration test** user workflows
3. **Load test** quota impact
4. **Manual test** edge cases (connection loss, multiple tabs)

---

## Related Documentation

- **[Supabase Realtime Architecture](../architecture/supabase-realtime.md)** - Complete technical guide
- **[Database Schema](../architecture/database-schema.md)** - user_presence, messages, notifications
- **[Friends System](../architecture/friends-system-technical.md)** - Presence integration

---

## Summary

**Migration Success Metrics**:

| Metric                 | Before        | After      | Improvement |
| ---------------------- | ------------- | ---------- | ----------- |
| **Infrastructure**     | Custom server | Serverless | ✅          |
| **Code Lines**         | 591           | 1,663      | 181% more   |
| **Test Lines**         | 0             | 2,119      | ✅          |
| **Messages/Month**     | 2.9M          | 1M         | 66% less    |
| **Quota Usage**        | 145% (OVER)   | 50% (SAFE) | ✅          |
| **RLS Enforcement**    | No            | Yes        | ✅          |
| **Vercel Compatible**  | No            | Yes        | ✅          |
| **Maintenance Burden** | High          | Low        | ✅          |

**Result**: Successful migration with improved security, reliability, and maintainability.
