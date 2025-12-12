# Notification System Technical Reference

Technical reference documentation for the UbuMaths notification system.

## Overview

UbuMaths implements **three distinct notification systems**:

| System                       | Library           | Persistence   | Real-time | Use Case              |
| ---------------------------- | ----------------- | ------------- | --------- | --------------------- |
| **Toast (Toaster)**          | svelte-sonner     | None          | No        | Ephemeral UI feedback |
| **Persistent Notifications** | Custom + Supabase | PostgreSQL    | Yes       | Targeted messaging    |
| **Achievement Toasts**       | Custom Svelte     | None (memory) | Yes       | Achievement unlocks   |

## Documentation Index

| Document                             | Description                                             |
| ------------------------------------ | ------------------------------------------------------- |
| [architecture.md](./architecture.md) | System architecture, data flow, component relationships |
| [api.md](./api.md)                   | REST API endpoints, request/response schemas            |
| [stores.md](./stores.md)             | Client-side state management (Svelte 5 runes)           |
| [components.md](./components.md)     | UI components reference                                 |
| [database.md](./database.md)         | Database schema, migrations, RLS policies               |
| [security.md](./security.md)         | Security considerations, XSS prevention, rate limiting  |

## Quick Start

### Toast Notifications (Ephemeral)

```typescript
import { toaster } from '$lib/stores/toaster.svelte';

toaster.success('Operation reussie');
toaster.error('Une erreur est survenue');
toaster.warning('Attention');
toaster.info('Information');
```

### Persistent Notifications (Database-backed)

```typescript
// Server-side: Create notification
import { createNotification, createSystemNotification } from '$lib/server/notifications';

// Manual notification (teacher/admin)
await createNotification(
	supabase,
	{
		title: 'Nouveau devoir',
		message: '<p>Un nouveau devoir a ete assigne</p>',
		type: 'info',
		priority: 'normal',
		target_type: 'classes',
		target_class_ids: ['uuid-1', 'uuid-2']
	},
	userId
);

// System notification (automatic)
await createSystemNotification(supabase, {
	title: 'Evaluation assignee',
	message: '<p>Une nouvelle evaluation vous attend</p>',
	type: 'info',
	priority: 'important',
	system_event_type: 'assessment_assigned',
	target_type: 'users',
	target_user_ids: ['student-uuid']
});
```

```typescript
// Client-side: Read and manage notifications
import { notificationStore } from '$lib/stores/notifications.svelte';

// Fetch notifications
await notificationStore.fetchUnread();

// Access reactive state
const count = notificationStore.unreadCount;
const notifications = notificationStore.notifications;

// Mark as read
await notificationStore.markAsRead(notificationId);
await notificationStore.markAllAsRead();
```

### Achievement Toasts

```typescript
import { achievementsStore } from '$lib/stores/achievements.svelte';

// Show achievement unlock toast
achievementsStore.showUnlockToast(achievement, points, gidouilles);

// Dismiss toast
achievementsStore.dismissToast();
```

## File Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ToastDemo.svelte                          # Toast demo component
│   │   ├── notifications/
│   │   │   ├── NotificationDropdown.svelte           # Sidebar dropdown
│   │   │   └── NotificationBanner.svelte             # Sticky header banner
│   │   └── achievements/
│   │       ├── AchievementToast.svelte               # Achievement unlock toast
│   │       └── AchievementNotifications.svelte       # Integration wrapper
│   │
│   ├── stores/
│   │   ├── toaster.svelte.ts                         # Toast wrapper
│   │   ├── notifications.svelte.ts                   # Notification state
│   │   ├── notificationsRealtime.svelte.ts           # Real-time listener
│   │   ├── achievements.svelte.ts                    # Achievements state
│   │   └── achievementsRealtime.svelte.ts            # Achievement listener
│   │
│   ├── server/
│   │   ├── notifications.ts                          # Server functions
│   │   ├── auto-notifications.ts                     # Auto-notification helpers
│   │   ├── sanitization.ts                           # HTML sanitization
│   │   └── validation/
│   │       └── notifications.ts                      # Zod schemas
│   │
│   ├── types/
│   │   └── notification.ts                           # TypeScript types
│   │
│   └── utils/
│       └── html-escape.ts                            # HTML escaping utility
│
├── routes/
│   └── api/
│       └── notifications/
│           ├── unread/+server.ts                     # GET unread
│           ├── unread-count/+server.ts               # GET count
│           ├── mark-read/+server.ts                  # POST mark read
│           └── mark-all-read/+server.ts              # POST mark all read
│
└── supabase/
    └── migrations/
        └── 081_create_notifications_system.sql       # Database schema

docs/
├── features/
│   └── notifications-system.md                       # User-facing documentation
└── ref/
    └── notifications/                                # This directory
        ├── README.md                                 # Overview (this file)
        ├── architecture.md                           # System architecture
        ├── api.md                                    # API reference
        ├── stores.md                                 # State management
        ├── components.md                             # UI components
        ├── database.md                               # Database schema
        └── security.md                               # Security guide
```

## Key Concepts

### Notification Targeting

Notifications can target recipients in four ways:

| Target Type | Description    | Use Case                             |
| ----------- | -------------- | ------------------------------------ |
| `all`       | All users      | System announcements, maintenance    |
| `role`      | Users by role  | Teacher-only or student-only notices |
| `classes`   | Class members  | Assignment notifications             |
| `users`     | Specific users | Individual messages                  |

### Notification Types

| Type           | Icon      | Use Case            |
| -------------- | --------- | ------------------- |
| `info`         | Bell      | General information |
| `alert`        | Warning   | Important alerts    |
| `announcement` | Megaphone | Announcements       |
| `reminder`     | Clock     | Reminders           |

### Priority Levels

| Priority    | Color  | Use Case               |
| ----------- | ------ | ---------------------- |
| `normal`    | Blue   | Standard notifications |
| `important` | Orange | Important notices      |
| `urgent`    | Red    | Critical alerts        |

## Related Documentation

- [Feature Documentation](../../features/notifications-system.md) - User-facing docs
- [Realtime System](../realtime/) - Supabase Realtime integration
- [Database Schema](../../architecture/database-schema.md) - Full database docs
