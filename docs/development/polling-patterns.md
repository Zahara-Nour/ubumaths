# Polling Patterns - UbuMaths

Guide for implementing efficient polling patterns in UbuMaths.

**Last Updated:** 2025-10-28
**Status:** Production

---

## Table of Contents

- [Overview](#overview)
- [Unified Activity Polling](#unified-activity-polling)
- [Implementation Guide](#implementation-guide)
- [Best Practices](#best-practices)
- [Testing Patterns](#testing-patterns)
- [Anti-patterns](#anti-patterns)

---

## Overview

Polling is used to keep the UI in sync with server state without using WebSocket connections. UbuMaths uses a unified polling pattern to minimize database overhead and network requests.

### Why Unified Polling?

**Problem:** Multiple independent polling mechanisms result in:

- Duplicate network requests
- Increased database load
- Higher server costs
- Unnecessary client overhead

**Solution:** A single polling mechanism that fetches multiple data points in one request.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client (Dashboard)                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              activityStore                             │    │
│  │  - Central polling coordinator                         │    │
│  │  - Single fetch() call every 30s                       │    │
│  │  - Distributes data to individual stores               │    │
│  └──────────────────┬─────────────────────────────────────┘    │
│                     │                                            │
│                     │ fetch('/api/activity/unread-counts')      │
│                     ▼                                            │
└─────────────────────┼────────────────────────────────────────────┘
                      │
                      │ GET /api/activity/unread-counts
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Server                                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │       Unified API Endpoint                             │    │
│  │       /api/activity/unread-counts                      │    │
│  └──────────────────┬─────────────────────────────────────┘    │
│                     │                                            │
│                     │ Promise.all([...])                         │
│                     ▼                                            │
│  ┌─────────────────────────────┬─────────────────────────┐     │
│  │  getUnreadCount()           │  get_private_messages_  │     │
│  │  (notifications)            │  unread_count() (RPC)   │     │
│  └─────────────────────────────┴─────────────────────────┘     │
│                                                                  │
│  Returns: { notifications: 5, messages: 3 }                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Unified Activity Polling

The production implementation for polling user activity (notifications, messages, etc.).

### Core Components

#### 1. Unified API Endpoint

**File:** `src/routes/api/activity/unread-counts/+server.ts`

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUnreadCount } from '$lib/server/notifications';

export const GET: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	try {
		// Fetch both counts in parallel
		const [notificationsCount, messagesResult] = await Promise.all([
			getUnreadCount(supabase, session.user.id),
			supabase.rpc('get_private_messages_unread_count', {
				p_user_id: session.user.id
			})
		]);

		if (messagesResult.error) {
			throw error(500, 'Erreur lors de la récupération du compteur de messages');
		}

		return json({
			notifications: notificationsCount,
			messages: messagesResult.data || 0
		});
	} catch (err) {
		throw error(500, 'Erreur serveur');
	}
};
```

**Key Points:**

- ✅ Uses `Promise.all()` for parallel execution
- ✅ Handles authentication
- ✅ Graceful error handling
- ✅ Null-safe (defaults to 0)

#### 2. Central Polling Store

**File:** `src/lib/stores/activity.svelte.ts`

```typescript
import { notificationStore } from './notifications.svelte';
import { privateMessages } from './privateMessages.svelte';

class ActivityStore {
	private pollInterval: ReturnType<typeof setInterval> | null = null;
	private pollIntervalMs = 30000;
	private isPolling = $state(false);

	async fetchUnreadCounts(): Promise<void> {
		try {
			const response = await fetch('/api/activity/unread-counts');

			if (!response.ok) {
				throw new Error('Failed to fetch activity counts');
			}

			const data = await response.json();

			// Update individual stores
			notificationStore.unreadCount = data.notifications || 0;
			privateMessages.unreadCount = data.messages || 0;
		} catch (err) {
			console.error('Error fetching activity counts:', err);
			// Don't reset counts on error (avoid UI flicker)
		}
	}

	startPolling(intervalMs = 30000): void {
		if (this.pollInterval !== null) {
			return; // Already polling
		}

		this.pollIntervalMs = intervalMs;
		this.isPolling = true;

		// Initial fetch
		this.fetchUnreadCounts();

		// Start interval
		this.pollInterval = setInterval(() => {
			this.fetchUnreadCounts();
		}, this.pollIntervalMs);
	}

	stopPolling(): void {
		if (this.pollInterval !== null) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
		this.isPolling = false;
	}

	get polling(): boolean {
		return this.isPolling;
	}

	async refresh(): Promise<void> {
		await this.fetchUnreadCounts();
	}

	reset(): void {
		this.stopPolling();
	}
}

export const activityStore = new ActivityStore();
```

**Key Points:**

- ✅ Singleton pattern (single instance)
- ✅ Prevents duplicate polling
- ✅ Manual refresh capability
- ✅ Clean cleanup on unmount

#### 3. Dashboard Integration

**File:** `src/routes/(protected)/dashboard/+layout.svelte`

```svelte
<script lang="ts">
	import { activityStore } from '$lib/stores/activity.svelte';

	// Start polling on mount, cleanup on unmount
	$effect(() => {
		activityStore.startPolling(30000); // 30 seconds

		return () => {
			activityStore.stopPolling();
		};
	});
</script>

<!-- Your dashboard content -->
```

**Key Points:**

- ✅ Uses Svelte 5 `$effect()` for lifecycle
- ✅ Cleanup function prevents memory leaks
- ✅ Single polling instance for entire dashboard

#### 4. Individual Stores (Consumers)

**File:** `src/lib/stores/notifications.svelte.ts`

```typescript
class NotificationStore {
	unreadCount = $state(0);
	notifications = $state<Notification[]>([]);

	// NO internal polling - managed by activityStore

	async markAsRead(id: string): Promise<void> {
		// Implementation...

		// Trigger immediate refresh
		await activityStore.refresh();
	}
}
```

**File:** `src/lib/stores/privateMessages.svelte.ts`

```typescript
class PrivateMessagesStore {
	unreadCount = $state(0);
	conversations = $state<Conversation[]>([]);

	// NO internal polling - managed by activityStore

	async markConversationAsRead(conversationId: string): Promise<void> {
		// Implementation...

		// Trigger immediate refresh
		await activityStore.refresh();
	}
}
```

**Key Points:**

- ✅ Stores are passive receivers
- ✅ No duplicate polling logic
- ✅ Can trigger manual refresh after mutations

---

## Implementation Guide

### Step 1: Create Unified API Endpoint

```typescript
// src/routes/api/activity/[endpoint-name]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	try {
		// Fetch all data points in parallel
		const [data1, data2, data3] = await Promise.all([
			fetchDataSource1(supabase, session.user.id),
			fetchDataSource2(supabase, session.user.id),
			fetchDataSource3(supabase, session.user.id)
		]);

		return json({
			source1: data1,
			source2: data2,
			source3: data3
		});
	} catch (err) {
		console.error('Error in unified endpoint:', err);
		throw error(500, 'Erreur serveur');
	}
};
```

### Step 2: Create Polling Store

```typescript
// src/lib/stores/yourPollingStore.svelte.ts
import { store1 } from './store1.svelte';
import { store2 } from './store2.svelte';

class YourPollingStore {
	private pollInterval: ReturnType<typeof setInterval> | null = null;
	private isPolling = $state(false);

	async fetchData(): Promise<void> {
		try {
			const response = await fetch('/api/activity/your-endpoint');
			if (!response.ok) throw new Error('Fetch failed');

			const data = await response.json();

			// Update individual stores
			store1.updateFromPolling(data.source1);
			store2.updateFromPolling(data.source2);
		} catch (err) {
			console.error('Polling error:', err);
		}
	}

	startPolling(intervalMs = 30000): void {
		if (this.pollInterval !== null) return;

		this.isPolling = true;
		this.fetchData(); // Initial fetch

		this.pollInterval = setInterval(() => {
			this.fetchData();
		}, intervalMs);
	}

	stopPolling(): void {
		if (this.pollInterval !== null) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
		this.isPolling = false;
	}
}

export const yourPollingStore = new YourPollingStore();
```

### Step 3: Integrate in Layout

```svelte
<script lang="ts">
	import { yourPollingStore } from '$lib/stores/yourPollingStore.svelte';

	$effect(() => {
		yourPollingStore.startPolling(30000);
		return () => yourPollingStore.stopPolling();
	});
</script>
```

### Step 4: Write Tests

```typescript
// src/routes/api/activity/your-endpoint.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GET } from './+server';

describe('GET /api/activity/your-endpoint', () => {
	it('should return unified data for authenticated user', async () => {
		// Test implementation
	});

	it('should handle errors gracefully', async () => {
		// Test implementation
	});

	it('should use Promise.all for parallel execution', async () => {
		// Test implementation
	});
});
```

---

## Best Practices

### ✅ DO

1. **Use Promise.all() for parallel execution**

   ```typescript
   const [data1, data2] = await Promise.all([fetch1(), fetch2()]);
   ```

2. **Provide manual refresh capability**

   ```typescript
   async refresh(): Promise<void> {
     await this.fetchData();
   }
   ```

3. **Prevent duplicate polling**

   ```typescript
   if (this.pollInterval !== null) return;
   ```

4. **Cleanup on unmount**

   ```svelte
   $effect(() => {
   	store.startPolling();
   	return () => store.stopPolling();
   });
   ```

5. **Handle errors without UI flicker**

   ```typescript
   catch (err) {
     console.error(err);
     // Don't reset data on error
   }
   ```

6. **Write comprehensive tests**
   - Authentication tests
   - Error handling
   - Parallel execution verification
   - Edge cases (null, zero, large values)

### ❌ DON'T

1. **Don't create multiple polling mechanisms for related data**

   ```typescript
   // ❌ BAD: Multiple polls
   notificationStore.startPolling();
   messageStore.startPolling();
   friendRequestStore.startPolling();

   // ✅ GOOD: Unified polling
   activityStore.startPolling(); // Fetches all 3
   ```

2. **Don't poll too frequently**

   ```typescript
   // ❌ TOO FREQUENT: Every 5 seconds
   startPolling(5000);

   // ✅ REASONABLE: Every 30 seconds
   startPolling(30000);
   ```

3. **Don't forget cleanup**

   ```svelte
   <!-- ❌ BAD: Memory leak -->
   <script>
   	activityStore.startPolling();
   </script>

   <!-- ✅ GOOD: Cleanup -->
   <script>
   	$effect(() => {
   		activityStore.startPolling();
   		return () => activityStore.stopPolling();
   	});
   </script>
   ```

4. **Don't ignore errors completely**

   ```typescript
   // ❌ BAD: Silent failure
   catch (err) {
     // Nothing
   }

   // ✅ GOOD: Log for debugging
   catch (err) {
     console.error('Polling error:', err);
   }
   ```

5. **Don't use sequential fetching when parallel is possible**

   ```typescript
   // ❌ BAD: Sequential (slow)
   const data1 = await fetch1();
   const data2 = await fetch2();

   // ✅ GOOD: Parallel (fast)
   const [data1, data2] = await Promise.all([fetch1(), fetch2()]);
   ```

---

## Testing Patterns

### Unit Tests for API Endpoint

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';

describe('GET /api/activity/unified', () => {
	let mockSupabase: { rpc: ReturnType<typeof vi.fn> };
	let mockLocals: {
		supabase: typeof mockSupabase;
		safeGetSession: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockSupabase = { rpc: vi.fn() };
		mockLocals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn()
		};
		vi.clearAllMocks();
	});

	it('should return unified data for authenticated user', async () => {
		mockLocals.safeGetSession.mockResolvedValue({
			session: { user: { id: 'user-id' } }
		});

		// Mock data sources
		vi.mocked(getSource1).mockResolvedValue(5);
		mockSupabase.rpc.mockResolvedValue({ data: 3, error: null });

		const response = await GET({ locals: mockLocals });
		const data = await response.json();

		expect(data).toEqual({
			source1: 5,
			source2: 3
		});
	});

	it('should use Promise.all for parallel execution', async () => {
		// Test parallel execution timing
		// See unread-counts.test.ts for full example
	});

	it('should handle errors gracefully', async () => {
		mockLocals.safeGetSession.mockResolvedValue({
			session: { user: { id: 'user-id' } }
		});

		vi.mocked(getSource1).mockRejectedValue(new Error('DB error'));

		await expect(GET({ locals: mockLocals })).rejects.toThrow();
	});
});
```

### Integration Tests

```typescript
describe('Activity Polling Integration', () => {
	it('should update all stores after polling', async () => {
		// Mock API response
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ notifications: 5, messages: 3 })
		});

		// Start polling
		activityStore.startPolling();

		// Wait for fetch
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Verify stores updated
		expect(notificationStore.unreadCount).toBe(5);
		expect(privateMessages.unreadCount).toBe(3);

		// Cleanup
		activityStore.stopPolling();
	});
});
```

---

## Anti-patterns

### 1. Polling Without Cleanup

```typescript
// ❌ MEMORY LEAK
onMount(() => {
	setInterval(() => fetchData(), 30000);
});
```

**Fix:**

```typescript
// ✅ PROPER CLEANUP
$effect(() => {
	const interval = setInterval(() => fetchData(), 30000);
	return () => clearInterval(interval);
});
```

### 2. Multiple Polling Instances

```typescript
// ❌ DUPLICATE POLLING
// In component A
activityStore.startPolling();

// In component B
activityStore.startPolling();

// Result: 2 polling instances!
```

**Fix:**

```typescript
// ✅ SINGLETON PATTERN
class ActivityStore {
	private pollInterval: ReturnType<typeof setInterval> | null = null;

	startPolling(): void {
		if (this.pollInterval !== null) {
			return; // Already polling
		}
		// Start polling...
	}
}
```

### 3. Polling in Components

```typescript
// ❌ POLLING IN LEAF COMPONENTS
// notifications-badge.svelte
$effect(() => {
	const interval = setInterval(() => {
		fetch('/api/notifications/count');
	}, 30000);
	return () => clearInterval(interval);
});
```

**Fix:**

```typescript
// ✅ POLLING IN LAYOUT
// dashboard/+layout.svelte
$effect(() => {
	activityStore.startPolling();
	return () => activityStore.stopPolling();
});

// notifications-badge.svelte
// Just read from store
const count = $derived(notificationStore.unreadCount);
```

### 4. Ignoring Errors and Resetting State

```typescript
// ❌ UI FLICKER ON ERROR
catch (err) {
  console.error(err);
  notificationStore.unreadCount = 0; // Resets to 0 on error!
}
```

**Fix:**

```typescript
// ✅ PRESERVE STATE ON ERROR
catch (err) {
  console.error(err);
  // Don't modify state - keeps last known good value
}
```

---

## Performance Metrics

### Before Unified Polling

- **Requests per minute:** 4 requests (2 endpoints × 2 polls)
- **Database queries per minute:** 4 queries
- **Network overhead:** ~100 bytes × 4 = 400 bytes/min

### After Unified Polling

- **Requests per minute:** 2 requests (1 endpoint × 2 polls)
- **Database queries per minute:** 4 queries (parallelized)
- **Network overhead:** ~40 bytes × 2 = 80 bytes/min

### Improvement

- ✅ **50% reduction** in HTTP requests
- ✅ **80% reduction** in network overhead
- ✅ **Faster response** via parallel execution (Promise.all)
- ✅ **Reduced server load** (fewer endpoint calls)

---

## Future Extensions

The unified polling pattern can be extended to include:

1. **Friend Requests**

   ```typescript
   const [notifications, messages, friendRequests] = await Promise.all([
   	getUnreadCount(supabase, userId),
   	getMessageCount(supabase, userId),
   	getFriendRequestCount(supabase, userId)
   ]);
   ```

2. **Assessment Results**

   ```typescript
   return json({
   	notifications,
   	messages,
   	friendRequests,
   	newAssessmentResults
   });
   ```

3. **Rewards/Badges**
   ```typescript
   return json({
   	notifications,
   	messages,
   	friendRequests,
   	newAssessmentResults,
   	unclaimedRewards
   });
   ```

**Pattern:** Just add to the `Promise.all()` array and update the store's `fetchUnreadCounts()` method.

---

## References

- [Performance Optimizations](../architecture/performance.md) - Full performance optimization history
- [Notifications System](../features/notifications/README.md) - Notification feature docs
- [Messaging System](../features/messaging/README.md) - Messaging feature docs
- [Svelte 5 Effects](https://svelte.dev/docs/svelte/$effect) - Official $effect() docs

---

**Maintained by:** Development Team
**Questions:** See [Contributing Guide](../contributing/README.md)
