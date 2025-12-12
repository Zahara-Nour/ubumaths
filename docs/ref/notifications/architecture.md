# Notification System Architecture

Detailed architecture documentation for the UbuMaths notification system.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NOTIFICATION SYSTEMS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  TOAST SYSTEM    │  │  PERSISTENT      │  │  ACHIEVEMENT     │          │
│  │  (Ephemeral)     │  │  NOTIFICATIONS   │  │  TOASTS          │          │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤          │
│  │ svelte-sonner    │  │ Custom + Supabase│  │ Custom Svelte    │          │
│  │ No persistence   │  │ PostgreSQL       │  │ Memory queue     │          │
│  │ No real-time     │  │ Real-time via WS │  │ Real-time via WS │          │
│  │ UI feedback      │  │ Targeted msgs    │  │ Game achievements│          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1. Toast System (svelte-sonner)

### Data Flow

```
User Action → Handler → toaster.method() → svelte-sonner → DOM Update
```

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TOAST SYSTEM                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐    ┌──────────────────────────┐  │
│  │ Any Component    │───▶│ toaster.svelte.ts        │  │
│  │ (trigger)        │    │ (wrapper)                │  │
│  └──────────────────┘    └───────────┬──────────────┘  │
│                                      │                  │
│                                      ▼                  │
│                          ┌──────────────────────────┐  │
│                          │ svelte-sonner            │  │
│                          │ (toast library)          │  │
│                          └───────────┬──────────────┘  │
│                                      │                  │
│                                      ▼                  │
│                          ┌──────────────────────────┐  │
│                          │ <Toaster />              │  │
│                          │ (+layout.svelte)         │  │
│                          └──────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Key Files

| File                               | Purpose                       |
| ---------------------------------- | ----------------------------- |
| `src/lib/stores/toaster.svelte.ts` | Wrapper around svelte-sonner  |
| `src/routes/+layout.svelte`        | `<Toaster />` component mount |
| `src/app.css`                      | Toast styling overrides       |

### Configuration

```svelte
<!-- src/routes/+layout.svelte:84 -->
<Toaster richColors position="top-right" expand={true} visibleToasts={5} gap={12} offset="16px" />
```

## 2. Persistent Notification System

### Data Flow (Creation)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         NOTIFICATION CREATION                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   MANUAL (Teacher/Admin)              AUTOMATIC (System)                  │
│   ┌──────────────────┐               ┌──────────────────┐                │
│   │ Form Submission  │               │ Event Trigger    │                │
│   │ (Form Action)    │               │ (API/Action)     │                │
│   └────────┬─────────┘               └────────┬─────────┘                │
│            │                                   │                          │
│            ▼                                   ▼                          │
│   ┌──────────────────┐               ┌──────────────────┐                │
│   │ Zod Validation   │               │ auto-notifications│                │
│   │ (schemas)        │               │ helpers          │                │
│   └────────┬─────────┘               └────────┬─────────┘                │
│            │                                   │                          │
│            ▼                                   ▼                          │
│   ┌──────────────────┐               ┌──────────────────┐                │
│   │ createNotification│               │createSystemNotif.│                │
│   │ (permissions)    │               │ (no auth check)  │                │
│   └────────┬─────────┘               └────────┬─────────┘                │
│            │                                   │                          │
│            └─────────────┬─────────────────────┘                          │
│                          │                                                │
│                          ▼                                                │
│            ┌─────────────────────────┐                                   │
│            │ HTML Sanitization       │                                   │
│            │ (DOMPurify)             │                                   │
│            └───────────┬─────────────┘                                   │
│                        │                                                  │
│                        ▼                                                  │
│            ┌─────────────────────────┐                                   │
│            │ Supabase INSERT         │                                   │
│            │ (notifications table)   │                                   │
│            └─────────────────────────┘                                   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Data Flow (Reading)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       NOTIFICATION READING                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                      CLIENT SIDE                                 │   │
│   ├─────────────────────────────────────────────────────────────────┤   │
│   │                                                                  │   │
│   │  ┌──────────────────┐     ┌──────────────────┐                  │   │
│   │  │ Component Mount  │────▶│ notificationStore │                  │   │
│   │  │ (useEffect)      │     │ .fetchUnread()   │                  │   │
│   │  └──────────────────┘     └────────┬─────────┘                  │   │
│   │                                    │                             │   │
│   │  ┌──────────────────┐              ▼                             │   │
│   │  │ Real-time Event  │     ┌──────────────────┐                  │   │
│   │  │ (postgres_changes)│────▶│ fetch('/api/    │                  │   │
│   │  └──────────────────┘     │  notifications/  │                  │   │
│   │                           │  unread')        │                  │   │
│   │                           └────────┬─────────┘                  │   │
│   │                                    │                             │   │
│   └────────────────────────────────────┼─────────────────────────────┘   │
│                                        │                                  │
│   ┌────────────────────────────────────┼─────────────────────────────┐   │
│   │                      SERVER SIDE   │                              │   │
│   ├────────────────────────────────────┼─────────────────────────────┤   │
│   │                                    ▼                              │   │
│   │                           ┌──────────────────┐                   │   │
│   │                           │ requireAuth()    │                   │   │
│   │                           │ (middleware)     │                   │   │
│   │                           └────────┬─────────┘                   │   │
│   │                                    │                              │   │
│   │                                    ▼                              │   │
│   │                           ┌──────────────────┐                   │   │
│   │                           │ getUnreadNotifs  │                   │   │
│   │                           │ (pagination)     │                   │   │
│   │                           └────────┬─────────┘                   │   │
│   │                                    │                              │   │
│   │                                    ▼                              │   │
│   │  ┌────────────────────────────────────────────────────────────┐ │   │
│   │  │                    SUPABASE QUERIES                         │ │   │
│   │  ├────────────────────────────────────────────────────────────┤ │   │
│   │  │ 1. Get user profile (role, class_ids)                      │ │   │
│   │  │ 2. Build targeting conditions (all, role, classes, users)  │ │   │
│   │  │ 3. Fetch notifications with JOIN to profiles               │ │   │
│   │  │ 4. Batch fetch read status from notification_reads         │ │   │
│   │  │ 5. Filter unread (in-memory, no anti-join support)         │ │   │
│   │  │ 6. Apply pagination                                        │ │   │
│   │  └────────────────────────────────────────────────────────────┘ │   │
│   │                                                                   │   │
│   └───────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Real-time Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        REAL-TIME NOTIFICATIONS                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     SUPABASE REALTIME                               │ │
│  │  ┌───────────────────────────────────────────────────────────────┐ │ │
│  │  │                    postgres_changes                            │ │ │
│  │  │  ┌─────────────────┐    ┌─────────────────┐                   │ │ │
│  │  │  │ INSERT on       │    │ UPDATE on       │                   │ │ │
│  │  │  │ notifications   │    │ notifications   │                   │ │ │
│  │  │  │ (filter: user)  │    │ (filter: user)  │                   │ │ │
│  │  │  └────────┬────────┘    └────────┬────────┘                   │ │ │
│  │  │           │                      │                             │ │ │
│  │  └───────────┼──────────────────────┼─────────────────────────────┘ │ │
│  │              │                      │                               │ │
│  └──────────────┼──────────────────────┼───────────────────────────────┘ │
│                 │                      │                                  │
│                 ▼                      ▼                                  │
│       ┌─────────────────────────────────────────┐                        │
│       │    notificationsRealtimeManager         │                        │
│       │    (singleton)                          │                        │
│       ├─────────────────────────────────────────┤                        │
│       │ handleNewNotification()                 │                        │
│       │   → notificationStore.fetchUnread()     │                        │
│       │                                         │                        │
│       │ handleNotificationUpdate()              │                        │
│       │   → (optimistic update already applied) │                        │
│       └──────────────────┬──────────────────────┘                        │
│                          │                                                │
│                          ▼                                                │
│       ┌─────────────────────────────────────────┐                        │
│       │         notificationStore               │                        │
│       │         (reactive state)                │                        │
│       └──────────────────┬──────────────────────┘                        │
│                          │                                                │
│           ┌──────────────┼──────────────┐                                │
│           ▼              ▼              ▼                                 │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                    │
│   │ Notification │ │ Notification │ │ Notifications│                    │
│   │ Banner       │ │ Dropdown     │ │ Page         │                    │
│   └──────────────┘ └──────────────┘ └──────────────┘                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Targeting Resolution

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       TARGETING RESOLUTION                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User Request: "Get my notifications"                                    │
│  User: { id: 'abc', role: 'student', class_ids: ['class-1', 'class-2'] } │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      TARGETING CONDITIONS                          │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │                                                                    │  │
│  │  OR (any match = visible to user):                                │  │
│  │                                                                    │  │
│  │  1. target_type = 'all'                                           │  │
│  │     → Everyone sees this notification                             │  │
│  │                                                                    │  │
│  │  2. target_type = 'role' AND 'student' IN target_roles            │  │
│  │     → User's role matches target                                  │  │
│  │                                                                    │  │
│  │  3. target_type = 'classes' AND target_class_ids                  │  │
│  │     OVERLAPS ['class-1', 'class-2']                               │  │
│  │     → User is member of targeted class                            │  │
│  │                                                                    │  │
│  │  4. target_type = 'users' AND 'abc' IN target_user_ids            │  │
│  │     → User is directly targeted                                   │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Additional Filters:                                                     │
│  - deleted_at IS NULL (not soft-deleted)                                │
│  - expires_at > NOW() (not expired)                                     │
│  - NOT IN notification_reads (unread only)                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3. Achievement Toast System

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ACHIEVEMENT TOAST SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    UNLOCK DETECTION                                 │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │                                                                     │ │
│  │  Database INSERT on student_achievements                           │ │
│  │         │                                                          │ │
│  │         ▼                                                          │ │
│  │  ┌──────────────────┐                                              │ │
│  │  │ postgres_changes │                                              │ │
│  │  │ (Supabase RT)    │                                              │ │
│  │  └────────┬─────────┘                                              │ │
│  │           │                                                         │ │
│  │           ▼                                                         │ │
│  │  ┌──────────────────────────────────────────┐                      │ │
│  │  │ achievementsRealtimeManager              │                      │ │
│  │  │ (filter: student_id = currentUser)       │                      │ │
│  │  └────────────────────┬─────────────────────┘                      │ │
│  │                       │                                             │ │
│  │                       ▼                                             │ │
│  │  ┌──────────────────────────────────────────┐                      │ │
│  │  │ handleNewAchievement()                   │                      │ │
│  │  │ 1. Get achievement from cache or DB      │                      │ │
│  │  │ 2. achievementsStore.showUnlockToast()   │                      │ │
│  │  │ 3. Clear cache for fresh data            │                      │ │
│  │  └──────────────────────────────────────────┘                      │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    TOAST RENDERING                                  │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │                                                                     │ │
│  │  achievementsStore.toastQueue                                      │ │
│  │         │                                                          │ │
│  │         ▼                                                          │ │
│  │  ┌──────────────────────────────────────────┐                      │ │
│  │  │ AchievementNotifications.svelte          │                      │ │
│  │  │ (wrapper in protected layout)            │                      │ │
│  │  └────────────────────┬─────────────────────┘                      │ │
│  │                       │                                             │ │
│  │                       ▼                                             │ │
│  │  ┌──────────────────────────────────────────┐                      │ │
│  │  │ AchievementToast.svelte                  │                      │ │
│  │  │ - Animated entry (fly + scale)           │                      │ │
│  │  │ - Rarity-based styling                   │                      │ │
│  │  │ - Particle effects                       │                      │ │
│  │  │ - Auto-close (5 seconds)                 │                      │ │
│  │  └──────────────────────────────────────────┘                      │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      COMPONENT HIERARCHY                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  +layout.svelte (root)                                                  │
│  ├── <Toaster />                      ← svelte-sonner mount point       │
│  │                                                                       │
│  └── +layout.svelte (dashboard)                                         │
│      ├── <NotificationBanner />       ← Sticky header carousel          │
│      │   └── notificationStore        ← Shared reactive state           │
│      │                                                                   │
│      ├── <Sidebar />                                                    │
│      │   └── <NotificationDropdown /> ← Popover with bell icon          │
│      │       └── notificationStore    ← Shared reactive state           │
│      │                                                                   │
│      ├── <AchievementNotifications /> ← Achievement toast wrapper       │
│      │   └── <AchievementToast />     ← Individual toast                │
│      │       └── achievementsStore    ← Achievement state               │
│      │                                                                   │
│      └── {children}                                                     │
│          └── /notifications           ← Full notifications page         │
│              └── notificationStore    ← Shared reactive state           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Singleton Pattern

All stores use the singleton pattern to ensure consistent state:

```typescript
// Pattern used across all notification stores
class NotificationStore {
	// Svelte 5 runes for reactive state
	unreadCount = $state(0);
	notifications = $state<NotificationWithDetails[]>([]);

	// Methods operate on shared state
	async fetchUnread() {
		/* ... */
	}
}

// Single export - all imports share the same instance
export const notificationStore = new NotificationStore();
```

## Integration Points

### 1. Layout Integration

The toast system is mounted in the root layout:

```svelte
<!-- src/routes/+layout.svelte -->
<Toaster richColors position="top-right" ... />
```

### 2. Protected Layout Integration

Notification components are mounted in protected layouts:

```svelte
<!-- src/routes/(protected)/dashboard/+layout.svelte -->
<NotificationBanner />
<NotificationDropdown />
<!-- in sidebar -->
<AchievementNotifications />
```

### 3. Real-time Initialization

Real-time listeners are initialized when the user authenticates:

```typescript
// On mount in protected layout
notificationsRealtimeManager.init(supabase, userId);
await notificationsRealtimeManager.startListening();

achievementsRealtimeManager.init(supabase, userId);
await achievementsRealtimeManager.startListening();

// On unmount
await notificationsRealtimeManager.stopListening();
await achievementsRealtimeManager.stopListening();
```

## Performance Considerations

### 1. Pagination

Notifications use server-side pagination to avoid loading large datasets:

```typescript
// Default: 20 per page, max: 100
await notificationStore.fetchUnread(); // Page 1
await notificationStore.loadMore(); // Page 2+
```

### 2. Optimistic Updates

Mark-as-read uses optimistic updates for instant UI feedback:

```typescript
async markAsRead(notificationId: string) {
  // Immediately update UI
  this.notifications = this.notifications.filter(n => n.id !== notificationId);
  this.unreadCount = Math.max(0, this.unreadCount - 1);

  // Then sync with server
  const response = await fetch('/api/notifications/mark-read', ...);

  // Rollback on failure
  if (!response.ok) {
    await this.fetchUnread();
  }
}
```

### 3. Cache Strategy

Achievement store uses 5-minute cache TTL:

```typescript
private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

private isCacheValid(): boolean {
  return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
}
```

### 4. Batch Queries

N+1 queries are avoided through batch fetching:

```typescript
// Instead of N queries for read status:
// BAD: for each notification, query notification_reads

// Use batch query:
const { data: reads } = await supabase
	.from('notification_reads')
	.select('notification_id')
	.eq('user_id', userId)
	.in('notification_id', notificationIds); // Single query
```
