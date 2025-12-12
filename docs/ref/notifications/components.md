# Notification Components Reference

UI components for displaying notifications in UbuMaths.

## Overview

| Component                  | File                                           | Purpose             |
| -------------------------- | ---------------------------------------------- | ------------------- |
| `<Toaster />`              | svelte-sonner                                  | Toast mount point   |
| `NotificationDropdown`     | `notifications/NotificationDropdown.svelte`    | Sidebar popover     |
| `NotificationBanner`       | `notifications/NotificationBanner.svelte`      | Sticky header       |
| `ToastDemo`                | `ToastDemo.svelte`                             | Development demo    |
| `AchievementToast`         | `achievements/AchievementToast.svelte`         | Achievement unlock  |
| `AchievementNotifications` | `achievements/AchievementNotifications.svelte` | Integration wrapper |

---

## Toaster (svelte-sonner)

Root mount point for ephemeral toast notifications.

### Location

```svelte
<!-- src/routes/+layout.svelte:84 -->
<Toaster richColors position="top-right" expand={true} visibleToasts={5} gap={12} offset="16px" />
```

### Props

| Prop            | Type    | Value         | Description             |
| --------------- | ------- | ------------- | ----------------------- |
| `richColors`    | boolean | `true`        | Enhanced color theming  |
| `position`      | string  | `"top-right"` | Toast position          |
| `expand`        | boolean | `true`        | Expanded view           |
| `visibleToasts` | number  | `5`           | Max visible toasts      |
| `gap`           | number  | `12`          | Gap between toasts (px) |
| `offset`        | string  | `"16px"`      | Edge offset             |

### CSS Overrides

Custom styles in `src/app.css`:

```css
/* Forces proper vertical stacking */
[data-sonner-toaster] {
	display: flex !important;
	flex-direction: column !important;
	gap: 12px !important;
}

[data-sonner-toast] {
	margin-bottom: 12px !important;
	position: relative !important;
}

[data-sonner-toaster][data-y-position='top'] {
	top: 16px !important;
}

[data-sonner-toaster][data-x-position='right'] {
	right: 16px !important;
}
```

---

## NotificationDropdown

Sidebar popover showing unread notifications with bell icon.

### Location

```
src/lib/components/notifications/NotificationDropdown.svelte
```

### Features

- Bell icon with unread count badge
- Max 5 notifications displayed
- "Tout marquer lu" button
- Click to navigate to action URL
- Individual "Lue" buttons
- "Voir toutes" link to notifications page
- Empty state with bell icon

### Visual States

**With Notifications**:

```
┌─────────────────────────────────────┐
│ Notifications    [Tout marquer lu] │
├─────────────────────────────────────┤
│ 🔔 Jean Dupont          Il y a 5m  │
│    Nouveau devoir assigne           │
│    → Voir le devoir            [Lue]│
├─────────────────────────────────────┤
│ ⚠️ Systeme              Hier       │
│    Maintenance prevue               │
│                                [Lue]│
├─────────────────────────────────────┤
│     Voir toutes les notifications   │
└─────────────────────────────────────┘
```

**Empty State**:

```
┌─────────────────────────────────────┐
│           🔔                        │
│    Aucune notification              │
└─────────────────────────────────────┘
```

### Props

None - uses `notificationStore` directly.

### Usage

```svelte
<script>
	import NotificationDropdown from '$lib/components/notifications/NotificationDropdown.svelte';
</script>

<!-- In sidebar -->
<NotificationDropdown />
```

### Key Implementation Details

```svelte
<script lang="ts">
	import { notificationStore } from '$lib/stores/notifications.svelte';

	const MAX_DROPDOWN_NOTIFICATIONS = 5;

	// Derived state
	const notifications = $derived(notificationStore.getTopNotifications(MAX_DROPDOWN_NOTIFICATIONS));
	const unreadCount = $derived(notificationStore.unreadCount);

	// Handlers
	async function handleMarkAsRead(notificationId: string) {
		await notificationStore.markAsRead(notificationId);
	}

	async function handleNotificationClick(notification: NotificationWithDetails) {
		await notificationStore.markAsRead(notification.id);
		isOpen = false;
		if (notification.action_url) {
			goto(notification.action_url);
		}
	}
</script>
```

### Priority Colors

Uses `NOTIFICATION_PRIORITY_COLORS` for styling:

| Priority    | Background     | Border              | Text              |
| ----------- | -------------- | ------------------- | ----------------- |
| `normal`    | `bg-blue-50`   | `border-blue-200`   | `text-blue-900`   |
| `important` | `bg-orange-50` | `border-orange-200` | `text-orange-900` |
| `urgent`    | `bg-red-50`    | `border-red-200`    | `text-red-900`    |

---

## NotificationBanner

Sticky header carousel for important notifications.

### Location

```
src/lib/components/notifications/NotificationBanner.svelte
```

### Features

- Sticky top positioning
- Carousel navigation (prev/next)
- Counter display (1/5)
- Priority-based background colors
- Action button (from notification)
- "Marquer comme lue" button
- Close button (marks as read)
- Auto-adjusts when notifications dismissed

### Visual Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🔔 M. Dupont  5m  │  Nouveau devoir assigne  │ [<][1/3][>] [Action] [X]│
└────────────────────────────────────────────────────────────────────────┘
```

### Props

None - uses `notificationStore` directly.

### Usage

```svelte
<script>
	import NotificationBanner from '$lib/components/notifications/NotificationBanner.svelte';
</script>

<!-- In protected layout, before main content -->
<NotificationBanner />
```

### Key Implementation Details

```svelte
<script lang="ts">
	import { notificationStore } from '$lib/stores/notifications.svelte';

	const MAX_NOTIFICATIONS = 5;
	let currentIndex = $state(0);

	const notifications = $derived(notificationStore.getTopNotifications(MAX_NOTIFICATIONS));
	const currentNotification = $derived(notifications[currentIndex] || null);
	const showCarousel = $derived(notifications.length > 1);

	// Carousel navigation
	function handlePrev() {
		currentIndex = (currentIndex - 1 + notifications.length) % notifications.length;
	}

	function handleNext() {
		currentIndex = (currentIndex + 1) % notifications.length;
	}

	// Reset index when notifications change
	$effect(() => {
		if (currentIndex >= notifications.length && notifications.length > 0) {
			currentIndex = 0;
		}
	});
</script>
```

### Conditional Rendering

Only renders when notifications exist:

```svelte
{#if hasNotifications && currentNotification}
	<div class="sticky top-0 z-50 border-b ...">
		<!-- Banner content -->
	</div>
{/if}
```

---

## AchievementToast

Celebratory notification for achievement unlocks.

### Location

```
src/lib/components/achievements/AchievementToast.svelte
```

### Features

- Animated entry (fly + scale with backOut easing)
- Rarity-based styling (5 rarity levels)
- Particle/confetti effect (CSS animation)
- Auto-close after 5 seconds
- Progress bar countdown
- Manual close button
- Keyboard dismiss (Escape key)
- ARIA live region for accessibility

### Props

| Prop          | Type          | Required | Default | Description        |
| ------------- | ------------- | -------- | ------- | ------------------ |
| `achievement` | `Achievement` | Yes      | -       | Achievement data   |
| `points`      | `number`      | Yes      | -       | Points awarded     |
| `gidouilles`  | `number`      | No       | `0`     | Gidouilles awarded |
| `onClose`     | `() => void`  | Yes      | -       | Close callback     |

### Usage

```svelte
<script>
	import AchievementToast from '$lib/components/achievements/AchievementToast.svelte';
	import { achievementsStore } from '$lib/stores/achievements.svelte';
</script>

{#if achievementsStore.currentToast}
	<AchievementToast
		achievement={achievementsStore.currentToast.achievement}
		points={achievementsStore.currentToast.points}
		gidouilles={achievementsStore.currentToast.gidouilles}
		onClose={() => achievementsStore.dismissToast()}
	/>
{/if}
```

### Rarity Configuration

| Rarity      | Gradient | Icon     | Label      |
| ----------- | -------- | -------- | ---------- |
| `common`    | Gray     | Trophy   | Commun     |
| `uncommon`  | Green    | Star     | Peu commun |
| `rare`      | Blue     | Sparkles | Rare       |
| `epic`      | Purple   | Crown    | Epique     |
| `legendary` | Amber    | Gem      | Legendaire |

### Visual Layout

```
┌────────────────────────────────────┐
│  ✨ ACHIEVEMENT DEBLOQUER!     [X] │
├────────────────────────────────────┤
│  ┌──────┐                          │
│  │  🏆  │  Premier Pas             │
│  │      │  +100 points  🎉         │
│  └──────┘  +50 gidouilles          │
├────────────────────────────────────┤
│  ⭐ Peu commun       [▓▓▓▓▓░░░░░] │
└────────────────────────────────────┘
```

### CSS Animations

```css
/* Icon bounce */
@keyframes bounce-subtle {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-4px);
	}
}

/* Progress bar shrink */
@keyframes shrink {
	from {
		width: 100%;
	}
	to {
		width: 0%;
	}
}

/* Particle float up */
@keyframes float-up {
	0% {
		opacity: 1;
		transform: translateY(0) scale(1) rotate(0deg);
	}
	100% {
		opacity: 0;
		transform: translateY(-120px) scale(0.5) rotate(180deg);
	}
}
```

---

## AchievementNotifications

Integration wrapper for protected layouts.

### Location

```
src/lib/components/achievements/AchievementNotifications.svelte
```

### Purpose

- Initializes `achievementsRealtimeManager` on mount
- Renders `AchievementToast` from store queue
- Handles cleanup on unmount

### Usage

```svelte
<!-- In protected layout -->
<script>
	import AchievementNotifications from '$lib/components/achievements/AchievementNotifications.svelte';
</script>

<AchievementNotifications />
```

### Implementation

```svelte
<script lang="ts">
	import { achievementsRealtimeManager } from '$lib/stores/achievementsRealtime.svelte';
	import { achievementsStore } from '$lib/stores/achievements.svelte';
	import AchievementToast from './AchievementToast.svelte';
	import { onMount, onDestroy } from 'svelte';

	let { data } = $props(); // { supabase, user }

	onMount(async () => {
		achievementsStore.init();
		achievementsRealtimeManager.init(data.supabase, data.user.id);
		await achievementsRealtimeManager.startListening();
	});

	onDestroy(async () => {
		await achievementsRealtimeManager.stopListening();
	});
</script>

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

## ToastDemo

Development component for testing toast types.

### Location

```
src/lib/components/ToastDemo.svelte
```

### Purpose

Test all toast variants during development.

### Usage

```svelte
<script>
	import ToastDemo from '$lib/components/ToastDemo.svelte';
</script>

<!-- In dev mode only -->
{#if dev}
	<ToastDemo />
{/if}
```

---

## Helper Constants

### NOTIFICATION_TYPE_ICONS

```typescript
const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
	info: '🔔',
	alert: '⚠️',
	announcement: '📢',
	reminder: '⏰'
};
```

### NOTIFICATION_PRIORITY_COLORS

```typescript
const NOTIFICATION_PRIORITY_COLORS: Record<
	NotificationPriority,
	{
		bg: string;
		border: string;
		text: string;
	}
> = {
	urgent: {
		bg: 'bg-red-50 dark:bg-red-950',
		border: 'border-red-200 dark:border-red-800',
		text: 'text-red-900 dark:text-red-100'
	},
	important: {
		bg: 'bg-orange-50 dark:bg-orange-950',
		border: 'border-orange-200 dark:border-orange-800',
		text: 'text-orange-900 dark:text-orange-100'
	},
	normal: {
		bg: 'bg-blue-50 dark:bg-blue-950',
		border: 'border-blue-200 dark:border-blue-800',
		text: 'text-blue-900 dark:text-blue-100'
	}
};
```

### Helper Functions

```typescript
// Format creator name
function formatCreatorName(notification: NotificationWithDetails): string;

// Get relative time string (French)
function getRelativeTime(dateString: string): string;
// Examples: "À l'instant", "Il y a 5 min", "Hier", "Il y a 3 jours"
```

---

## Accessibility

### ARIA Attributes

**NotificationDropdown**:

- `aria-label` on badge with count
- `title` on trigger button

**NotificationBanner**:

- `aria-label` on navigation buttons

**AchievementToast**:

- `role="alert"` on container
- `aria-live="polite"` for screen readers
- `aria-hidden="true"` on decorative elements
- `aria-label` on close button
- Keyboard dismiss with Escape

### Focus Management

- Popover traps focus when open
- Focus returns to trigger on close
- Toast auto-closes but can be manually dismissed

---

## Z-Index Layers

| Component               | Z-Index   | Purpose              |
| ----------------------- | --------- | -------------------- |
| Loading bar             | `z-[200]` | Navigation indicator |
| Achievement toast       | `z-50`    | Above content        |
| Notification banner     | `z-50`    | Above content        |
| Toaster (svelte-sonner) | Internal  | Toast stack          |
