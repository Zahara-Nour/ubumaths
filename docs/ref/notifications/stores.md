# Notification Stores Reference

Client-side state management for the notification system using Svelte 5 runes.

## Overview

| Store                          | File                              | Purpose                                     |
| ------------------------------ | --------------------------------- | ------------------------------------------- |
| `toaster`                      | `toaster.svelte.ts`               | Toast notifications (svelte-sonner wrapper) |
| `notificationStore`            | `notifications.svelte.ts`         | Persistent notification state               |
| `notificationsRealtimeManager` | `notificationsRealtime.svelte.ts` | Real-time notification updates              |
| `achievementsStore`            | `achievements.svelte.ts`          | Achievement state and toasts                |
| `achievementsRealtimeManager`  | `achievementsRealtime.svelte.ts`  | Real-time achievement unlocks               |

---

## toaster

Simple wrapper around svelte-sonner for consistent API.

### Import

```typescript
import { toaster } from '$lib/stores/toaster.svelte';
```

### Methods

| Method    | Signature                                         | Description            |
| --------- | ------------------------------------------------- | ---------------------- |
| `success` | `(message: string, data?: ExternalToast) => void` | Success toast (green)  |
| `error`   | `(message: string, data?: ExternalToast) => void` | Error toast (red)      |
| `warning` | `(message: string, data?: ExternalToast) => void` | Warning toast (yellow) |
| `info`    | `(message: string, data?: ExternalToast) => void` | Info toast (blue)      |
| `message` | `(message: string, data?: ExternalToast) => void` | Neutral toast          |

### Usage

```typescript
// Basic usage
toaster.success('Operation reussie');
toaster.error('Une erreur est survenue');
toaster.warning('Attention aux modifications');
toaster.info('Information importante');

// With options
toaster.success('Fichier sauvegarde', {
	description: 'Le document a ete enregistre avec succes',
	duration: 5000
});

// With action
toaster.info('Nouvelle version disponible', {
	action: {
		label: 'Rafraichir',
		onClick: () => window.location.reload()
	}
});
```

### Options (ExternalToast)

```typescript
interface ExternalToast {
	description?: string;
	duration?: number; // ms, default varies by type
	action?: {
		label: string;
		onClick: () => void;
	};
	cancel?: {
		label: string;
		onClick: () => void;
	};
	onDismiss?: (toast: Toast) => void;
	onAutoClose?: (toast: Toast) => void;
}
```

---

## notificationStore

Manages persistent notification state with API synchronization.

### Import

```typescript
import { notificationStore } from '$lib/stores/notifications.svelte';
```

### Reactive State

| Property        | Type                        | Description                     |
| --------------- | --------------------------- | ------------------------------- |
| `unreadCount`   | `number`                    | Total unread notification count |
| `notifications` | `NotificationWithDetails[]` | Loaded notifications            |
| `isLoading`     | `boolean`                   | Loading state                   |
| `error`         | `string \| null`            | Error message                   |
| `currentPage`   | `number`                    | Current page (1-indexed)        |
| `pageSize`      | `number`                    | Items per page (default: 20)    |
| `totalPages`    | `number`                    | Total pages available           |
| `hasMore`       | `boolean`                   | More pages available            |

### Methods

#### fetchUnread()

Fetch unread notifications (resets to page 1).

```typescript
await notificationStore.fetchUnread();
```

#### loadMore()

Load next page of notifications (appends to existing).

```typescript
if (notificationStore.hasMore) {
	await notificationStore.loadMore();
}
```

#### fetchUnreadCount()

Lightweight count-only fetch.

```typescript
await notificationStore.fetchUnreadCount();
```

#### markAsRead(notificationId)

Mark single notification as read (optimistic update).

```typescript
const success = await notificationStore.markAsRead('notification-uuid');
```

#### markAllAsRead()

Mark all notifications as read (optimistic update).

```typescript
const success = await notificationStore.markAllAsRead();
```

#### reset()

Reset store to initial state.

```typescript
notificationStore.reset();
```

### Computed Getters

| Getter                   | Type                        | Description                                |
| ------------------------ | --------------------------- | ------------------------------------------ |
| `sortedNotifications`    | `NotificationWithDetails[]` | Notifications (already sorted from server) |
| `hasUrgentNotifications` | `boolean`                   | Has any urgent notifications               |
| `urgentCount`            | `number`                    | Count of urgent notifications              |

#### getTopNotifications(limit)

Get top N notifications for dropdown/banner.

```typescript
const top5 = notificationStore.getTopNotifications(5);
```

### Usage Example

```svelte
<script lang="ts">
	import { notificationStore } from '$lib/stores/notifications.svelte';
	import { onMount } from 'svelte';

	onMount(async () => {
		await notificationStore.fetchUnread();
	});

	// Reactive access
	const count = $derived(notificationStore.unreadCount);
	const notifications = $derived(notificationStore.notifications);
	const loading = $derived(notificationStore.isLoading);
</script>

{#if loading}
	<p>Chargement...</p>
{:else}
	<p>{count} notifications non lues</p>
	{#each notifications as notif}
		<NotificationItem {notif} onRead={() => notificationStore.markAsRead(notif.id)} />
	{/each}
{/if}
```

---

## notificationsRealtimeManager

Real-time listener for notification changes via Supabase postgres_changes.

### Import

```typescript
import { notificationsRealtimeManager } from '$lib/stores/notificationsRealtime.svelte';
```

### Methods

#### init(client, userId)

Initialize with Supabase client and current user ID.

```typescript
notificationsRealtimeManager.init(supabase, user.id);
```

#### startListening()

Start listening to real-time notification changes.

```typescript
await notificationsRealtimeManager.startListening();
```

**Listens to**:

- `INSERT` on `notifications` table (filter: user targeted)
- `UPDATE` on `notifications` table (filter: user targeted)

#### stopListening()

Stop listening to changes.

```typescript
await notificationsRealtimeManager.stopListening();
```

### Reactive State

| Property    | Type      | Description         |
| ----------- | --------- | ------------------- |
| `listening` | `boolean` | Currently listening |

### Usage Example

```svelte
<script lang="ts">
	import { notificationsRealtimeManager } from '$lib/stores/notificationsRealtime.svelte';
	import { notificationStore } from '$lib/stores/notifications.svelte';
	import { onMount, onDestroy } from 'svelte';

	let { data } = $props(); // { supabase, user }

	onMount(async () => {
		// Initialize
		notificationsRealtimeManager.init(data.supabase, data.user.id);

		// Start listening
		await notificationsRealtimeManager.startListening();

		// Initial fetch
		await notificationStore.fetchUnread();
	});

	onDestroy(async () => {
		// Cleanup
		await notificationsRealtimeManager.stopListening();
	});
</script>
```

### How It Works

When a new notification is inserted in the database:

1. Supabase Realtime sends `postgres_changes` event
2. `notificationsRealtimeManager` receives the event
3. `handleNewNotification()` triggers `notificationStore.fetchUnread()`
4. Store updates with fresh data
5. UI components re-render automatically

**Why refetch instead of using payload?**

- `notificationStore.fetchUnread()` does complex queries with JOINs (creator profiles, read status)
- `postgres_changes` payload only contains raw notification row
- Refetching is simpler and more reliable than reconstructing joined data

---

## achievementsStore

Manages achievement state, caching, and unlock toasts.

### Import

```typescript
import { achievementsStore } from '$lib/stores/achievements.svelte';
```

### Reactive State

| Property     | Type                 | Description           |
| ------------ | -------------------- | --------------------- |
| `loading`    | `boolean`            | Loading state         |
| `error`      | `string \| null`     | Error message         |
| `toastQueue` | `AchievementToast[]` | Pending unlock toasts |

### Methods

#### init()

Initialize the store (once, typically in layout).

```typescript
achievementsStore.init();
```

#### loadAchievements(context?)

Load all achievements, optionally filtered by context.

```typescript
const achievements = await achievementsStore.loadAchievements('minesweeper');
```

#### loadStudentAchievements(studentId, context?)

Load unlocked achievements for a student.

```typescript
const unlocked = await achievementsStore.loadStudentAchievements(studentId, 'minesweeper');
```

#### processEvent(eventType, studentId, eventData)

Process an achievement event (may trigger unlocks).

```typescript
const unlocked = await achievementsStore.processEvent('minesweeper_game_completed', studentId, {
	difficulty: 'expert',
	time: 120
});
```

#### showUnlockToast(achievement, points, gidouilles?)

Show unlock toast (called automatically or manually).

```typescript
achievementsStore.showUnlockToast(achievement, 100, 50);
```

#### dismissToast()

Dismiss the oldest toast.

```typescript
achievementsStore.dismissToast();
```

#### clearToasts()

Clear all pending toasts.

```typescript
achievementsStore.clearToasts();
```

#### clearCache()

Clear all cached data.

```typescript
achievementsStore.clearCache();
```

### Computed Getters

| Getter                   | Type                        | Description                     |
| ------------------------ | --------------------------- | ------------------------------- |
| `achievementsList`       | `AchievementWithProgress[]` | All achievements with progress  |
| `unlockedCount`          | `number`                    | Number of unlocked achievements |
| `totalCount`             | `number`                    | Total achievements available    |
| `totalPoints`            | `number`                    | Total points earned             |
| `totalGidouilles`        | `number`                    | Total gidouilles earned         |
| `completionPercentage`   | `number`                    | Completion percentage (0-100)   |
| `currentToast`           | `AchievementToast \| null`  | Current toast to display        |
| `hasToasts`              | `boolean`                   | Has pending toasts              |
| `unlockedAchievements`   | `AchievementWithProgress[]` | Only unlocked                   |
| `lockedAchievements`     | `AchievementWithProgress[]` | Only locked                     |
| `inProgressAchievements` | `AchievementWithProgress[]` | With progress > 0               |

### Filter Methods

```typescript
// By category
const participation = achievementsStore.getByCategory('participation');

// By rarity
const legendary = achievementsStore.getByRarity('legendary');

// Check specific
const isUnlocked = achievementsStore.isUnlocked('achievement-id');

// Get specific
const achievement = achievementsStore.getAchievement('achievement-id');
```

### Toast Queue Management

```typescript
// Queue has max size of 10
// Oldest toasts are removed when queue is full

// Get current toast
const toast = achievementsStore.currentToast;

// Check for toasts
if (achievementsStore.hasToasts) {
	// Render toast component
}
```

---

## achievementsRealtimeManager

Real-time listener for achievement unlocks via Supabase postgres_changes.

### Import

```typescript
import { achievementsRealtimeManager } from '$lib/stores/achievementsRealtime.svelte';
```

### Methods

#### init(client, userId)

Initialize with Supabase client and current user ID.

```typescript
achievementsRealtimeManager.init(supabase, user.id);
```

#### startListening()

Start listening to achievement unlocks.

```typescript
await achievementsRealtimeManager.startListening();
```

**Listens to**:

- `INSERT` on `student_achievements` table (filter: `student_id = userId`)

#### stopListening()

Stop listening.

```typescript
await achievementsRealtimeManager.stopListening();
```

### Reactive State

| Property      | Type      | Description         |
| ------------- | --------- | ------------------- |
| `isListening` | `boolean` | Currently listening |

### How It Works

When an achievement is unlocked:

1. Server inserts row in `student_achievements`
2. Supabase Realtime sends `postgres_changes` INSERT event
3. `achievementsRealtimeManager.handleNewAchievement()` is called
4. Achievement details fetched (from cache or database)
5. `achievementsStore.showUnlockToast()` is called
6. Cache is cleared for fresh data on next load
7. `AchievementToast` component renders the celebration

### Usage Example

```svelte
<script lang="ts">
	import { achievementsRealtimeManager } from '$lib/stores/achievementsRealtime.svelte';
	import { achievementsStore } from '$lib/stores/achievements.svelte';
	import { onMount, onDestroy } from 'svelte';

	let { data } = $props();

	onMount(async () => {
		achievementsStore.init();
		achievementsRealtimeManager.init(data.supabase, data.user.id);
		await achievementsRealtimeManager.startListening();
	});

	onDestroy(async () => {
		await achievementsRealtimeManager.stopListening();
	});
</script>

<!-- Render toasts -->
{#if achievementsStore.hasToasts && achievementsStore.currentToast}
	<AchievementToast
		achievement={achievementsStore.currentToast.achievement}
		points={achievementsStore.currentToast.points}
		gidouilles={achievementsStore.currentToast.gidouilles}
		onClose={() => achievementsStore.dismissToast()}
	/>
{/if}
```

---

## TypeScript Types

### AchievementToast

```typescript
interface AchievementToast {
	id: string;
	achievement: Achievement;
	points: number;
	gidouilles: number;
	timestamp: number;
}
```

### NotificationWithDetails

See [api.md](./api.md#notificationwithdetails) for full type definition.

---

## Performance Notes

### Singleton Pattern

All stores are singletons - the same instance is shared across all imports:

```typescript
// Both imports reference the same instance
import { notificationStore } from '$lib/stores/notifications.svelte';
// In another file
import { notificationStore } from '$lib/stores/notifications.svelte';
// Same instance!
```

### Optimistic Updates

Both `markAsRead` and `markAllAsRead` use optimistic updates:

1. Update UI immediately
2. Send request to server
3. Rollback on failure (re-fetch)

### Caching

`achievementsStore` uses a 5-minute cache TTL to avoid unnecessary API calls:

```typescript
private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

### Queue Size Limits

Toast queues have maximum sizes to prevent memory issues:

```typescript
// achievementsStore
private readonly MAX_TOAST_QUEUE_SIZE = 10;
```
