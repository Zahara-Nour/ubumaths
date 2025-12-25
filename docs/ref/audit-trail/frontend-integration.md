# Frontend Integration

> Svelte components, stores, and UI patterns for displaying audit trails.

## Table of Contents

- [Components](#components)
  - [RewardEventCard](#rewardeventcard)
  - [RewardJournalFilters](#rewardjournalfilters)
- [Stores](#stores)
  - [rewardJournal Store](#rewardjournal-store)
- [Pages](#pages)
  - [Student Journal Page](#student-journal-page)
  - [Teacher Student Journal Page](#teacher-student-journal-page)
- [Usage Examples](#usage-examples)
- [Real-time Updates](#real-time-updates)
  - [Basic Subscription](#basic-subscription)
  - [Integration with Store](#integration-with-store)
  - [Toast Notifications](#toast-notifications)
  - [Teacher Real-time View](#teacher-real-time-view)
- [Styling Reference](#styling-reference)

---

## Components

### RewardEventCard

**File**: `src/lib/components/rewards/RewardEventCard.svelte`

Displays a single reward event in a timeline-style card.

#### Props

```typescript
interface Props {
	event: RewardEvent;
	compact?: boolean; // Smaller layout for lists
}
```

#### Features

- **Icon mapping** by reward_type:

  - `gidouilles` → Coins icon
  - `bonus` → Star icon
  - `vip_card` → Crown icon
  - `achievement` → Trophy icon
  - `item` → Package icon

- **Color-coded badges** by event_type:

  - `earned`, `awarded`, `unlocked` → Green
  - `spent`, `used` → Orange
  - `traded` → Blue
  - `removed`, `expired` → Red

- **Relative timestamps** using date-fns (`formatDistanceToNow`)

#### Example Usage

```svelte
<script lang="ts">
	import RewardEventCard from '$lib/components/rewards/RewardEventCard.svelte';
	import type { RewardEvent } from '$lib/types/reward-journal';

	let { event }: { event: RewardEvent } = $props();
</script>

<RewardEventCard {event} />
```

#### Visual Structure

```
┌─────────────────────────────────────────────────────────┐
│  🪙  Tu as gagné 10 gidouilles : Exercice    [earned]  │
│      il y a 2 heures                                   │
└─────────────────────────────────────────────────────────┘
```

---

### RewardJournalFilters

**File**: `src/lib/components/rewards/RewardJournalFilters.svelte`

Filter buttons for journal filtering by reward type.

#### Props

```typescript
interface Props {
	selected: RewardType | null;
	onchange: (type: RewardType | null) => void;
}
```

#### Features

- Toggle buttons for each reward type
- "All" option to clear filter
- Visual feedback for active filter
- Accessible keyboard navigation

#### Example Usage

```svelte
<script lang="ts">
	import RewardJournalFilters from '$lib/components/rewards/RewardJournalFilters.svelte';
	import type { RewardType } from '$lib/types/reward-journal';

	let selectedType = $state<RewardType | null>(null);

	function handleFilterChange(type: RewardType | null) {
		selectedType = type;
		// Trigger data refetch...
	}
</script>

<RewardJournalFilters selected={selectedType} onchange={handleFilterChange} />
```

---

## Stores

### rewardJournal Store

**File**: `src/lib/stores/rewardJournal.svelte.ts`

Svelte 5 reactive store for managing reward journal state.

#### State

```typescript
interface RewardJournalState {
	events: RewardEvent[];
	loading: boolean;
	error: string | null;
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
	filters: {
		rewardType: RewardType | null;
		eventType: RewardEventType | null;
		from: string | null;
		to: string | null;
	};
}
```

#### Methods

| Method                | Description                             |
| --------------------- | --------------------------------------- |
| `fetchEvents()`       | Fetches events based on current filters |
| `loadMore()`          | Loads next page (appends to existing)   |
| `setFilters(filters)` | Updates filters and refetches           |
| `clearFilters()`      | Resets all filters                      |
| `reset()`             | Clears all state                        |

#### Implementation

```typescript
// src/lib/stores/rewardJournal.svelte.ts
import type { RewardEvent, RewardType, RewardEventType } from '$lib/types/reward-journal';

class RewardJournalStore {
	events = $state<RewardEvent[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	pagination = $state({
		page: 1,
		limit: 20,
		total: 0,
		totalPages: 0,
		hasMore: false
	});

	filters = $state({
		rewardType: null as RewardType | null,
		eventType: null as RewardEventType | null,
		from: null as string | null,
		to: null as string | null
	});

	async fetchEvents() {
		this.loading = true;
		this.error = null;

		try {
			const params = new URLSearchParams();
			params.set('page', this.pagination.page.toString());
			params.set('limit', this.pagination.limit.toString());

			if (this.filters.rewardType) {
				params.set('reward_type', this.filters.rewardType);
			}
			if (this.filters.eventType) {
				params.set('event_type', this.filters.eventType);
			}
			if (this.filters.from) {
				params.set('from', this.filters.from);
			}
			if (this.filters.to) {
				params.set('to', this.filters.to);
			}

			const response = await fetch(`/api/rewards/journal?${params}`);

			if (!response.ok) {
				throw new Error('Failed to fetch events');
			}

			const data = await response.json();

			if (this.pagination.page === 1) {
				this.events = data.events;
			} else {
				this.events = [...this.events, ...data.events];
			}

			this.pagination = data.pagination;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			this.loading = false;
		}
	}

	async loadMore() {
		if (!this.pagination.hasMore || this.loading) return;

		this.pagination.page += 1;
		await this.fetchEvents();
	}

	setFilters(filters: Partial<typeof this.filters>) {
		this.filters = { ...this.filters, ...filters };
		this.pagination.page = 1;
		this.fetchEvents();
	}

	clearFilters() {
		this.filters = {
			rewardType: null,
			eventType: null,
			from: null,
			to: null
		};
		this.pagination.page = 1;
		this.fetchEvents();
	}

	reset() {
		this.events = [];
		this.loading = false;
		this.error = null;
		this.pagination = {
			page: 1,
			limit: 20,
			total: 0,
			totalPages: 0,
			hasMore: false
		};
		this.clearFilters();
	}
}

export const rewardJournal = new RewardJournalStore();
```

#### Usage in Components

```svelte
<script lang="ts">
	import { rewardJournal } from '$lib/stores/rewardJournal.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		rewardJournal.fetchEvents();
		return () => rewardJournal.reset();
	});
</script>

{#if rewardJournal.loading && rewardJournal.events.length === 0}
	<LoadingSkeleton />
{:else if rewardJournal.error}
	<ErrorMessage message={rewardJournal.error} />
{:else if rewardJournal.events.length === 0}
	<EmptyState message="Aucun événement à afficher" />
{:else}
	{#each rewardJournal.events as event (event.id)}
		<RewardEventCard {event} />
	{/each}

	{#if rewardJournal.pagination.hasMore}
		<Button onclick={() => rewardJournal.loadMore()}>Charger plus</Button>
	{/if}
{/if}
```

---

## Pages

### Student Journal Page

**File**: `src/routes/(protected)/dashboard/student/journal/+page.svelte`

Full-page journal view for students.

#### Features

- Timeline display of all reward events
- Filter by reward type
- Infinite scroll pagination
- Loading skeletons
- Empty state handling
- Pull-to-refresh (mobile)

#### Page Structure

```svelte
<script lang="ts">
	import { rewardJournal } from '$lib/stores/rewardJournal.svelte';
	import RewardEventCard from '$lib/components/rewards/RewardEventCard.svelte';
	import RewardJournalFilters from '$lib/components/rewards/RewardJournalFilters.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		rewardJournal.fetchEvents();
		return () => rewardJournal.reset();
	});
</script>

<div class="container mx-auto max-w-2xl p-4">
	<h1 class="mb-4 text-2xl font-bold">Mon Journal</h1>

	<RewardJournalFilters
		selected={rewardJournal.filters.rewardType}
		onchange={(type) => rewardJournal.setFilters({ rewardType: type })}
	/>

	<div class="mt-6 space-y-4">
		{#if rewardJournal.loading && rewardJournal.events.length === 0}
			{#each Array(5) as _}
				<div class="h-20 animate-pulse rounded-lg bg-muted" />
			{/each}
		{:else if rewardJournal.events.length === 0}
			<div class="py-12 text-center text-muted-foreground">
				<p>Aucun événement à afficher</p>
			</div>
		{:else}
			{#each rewardJournal.events as event (event.id)}
				<RewardEventCard {event} />
			{/each}

			{#if rewardJournal.pagination.hasMore}
				<div class="py-4 text-center">
					<Button
						variant="outline"
						onclick={() => rewardJournal.loadMore()}
						disabled={rewardJournal.loading}
					>
						{rewardJournal.loading ? 'Chargement...' : 'Voir plus'}
					</Button>
				</div>
			{/if}
		{/if}
	</div>
</div>
```

---

### Teacher Student Journal Page

**File**: `src/routes/(protected)/dashboard/teacher/students/[studentId]/journal/+page.svelte`

Journal view for teachers viewing a specific student's activity.

#### Features

- Same as student journal
- Shows student name in header
- Back button to student list
- Additional context for awarded/removed events

#### Data Loading

```typescript
// +page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { studentId } = params;
	const supabase = locals.supabase;

	// Verify teacher has access to this student
	const { data: student, error: err } = await supabase
		.from('profiles')
		.select(
			`
            id,
            firstname,
            lastname,
            class_members!inner(class_id)
        `
		)
		.eq('id', studentId)
		.single();

	if (err || !student) {
		throw error(404, 'Élève non trouvé');
	}

	return { student };
};
```

---

## Usage Examples

### Complete Journal Implementation

```svelte
<!-- src/routes/(protected)/dashboard/student/journal/+page.svelte -->
<script lang="ts">
	import { rewardJournal } from '$lib/stores/rewardJournal.svelte';
	import RewardEventCard from '$lib/components/rewards/RewardEventCard.svelte';
	import RewardJournalFilters from '$lib/components/rewards/RewardJournalFilters.svelte';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	let containerRef: HTMLElement;

	onMount(() => {
		rewardJournal.fetchEvents();

		// Infinite scroll
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && rewardJournal.pagination.hasMore) {
					rewardJournal.loadMore();
				}
			},
			{ rootMargin: '100px' }
		);

		const sentinel = document.getElementById('scroll-sentinel');
		if (sentinel) observer.observe(sentinel);

		return () => {
			observer.disconnect();
			rewardJournal.reset();
		};
	});
</script>

<div bind:this={containerRef} class="container mx-auto max-w-2xl p-4">
	<header class="mb-6">
		<h1 class="text-2xl font-bold">Mon Journal d'Activité</h1>
		<p class="text-muted-foreground">Historique de tes récompenses et activités</p>
	</header>

	<section class="mb-6">
		<RewardJournalFilters
			selected={rewardJournal.filters.rewardType}
			onchange={(type) => rewardJournal.setFilters({ rewardType: type })}
		/>
	</section>

	<section class="space-y-3">
		{#if rewardJournal.error}
			<div class="rounded-lg bg-destructive/10 p-4 text-destructive">
				<p>{rewardJournal.error}</p>
				<Button
					variant="outline"
					size="sm"
					class="mt-2"
					onclick={() => rewardJournal.fetchEvents()}
				>
					Réessayer
				</Button>
			</div>
		{:else if rewardJournal.loading && rewardJournal.events.length === 0}
			{#each Array(5) as _, i}
				<div class="animate-pulse rounded-lg bg-muted p-4" style="animation-delay: {i * 100}ms">
					<div class="flex items-center gap-3">
						<div class="h-10 w-10 rounded-full bg-muted-foreground/20" />
						<div class="flex-1 space-y-2">
							<div class="h-4 w-3/4 rounded bg-muted-foreground/20" />
							<div class="h-3 w-1/4 rounded bg-muted-foreground/20" />
						</div>
					</div>
				</div>
			{/each}
		{:else if rewardJournal.events.length === 0}
			<div class="py-16 text-center">
				<div class="mb-4 text-6xl">📭</div>
				<h3 class="text-lg font-medium">Aucun événement</h3>
				<p class="text-muted-foreground">
					{#if rewardJournal.filters.rewardType}
						Aucun événement de type "{rewardJournal.filters.rewardType}"
					{:else}
						Commence à utiliser l'application pour voir ton historique
					{/if}
				</p>
			</div>
		{:else}
			{#each rewardJournal.events as event, i (event.id)}
				<div
					class="animate-in fade-in slide-in-from-bottom-2"
					style="animation-delay: {Math.min(i * 50, 500)}ms"
				>
					<RewardEventCard {event} />
				</div>
			{/each}

			<!-- Infinite scroll sentinel -->
			<div id="scroll-sentinel" class="h-4" />

			{#if rewardJournal.loading}
				<div class="py-4 text-center">
					<span class="loading loading-spinner" />
				</div>
			{/if}

			{#if !rewardJournal.pagination.hasMore && rewardJournal.events.length > 0}
				<p class="py-4 text-center text-muted-foreground">Fin de l'historique</p>
			{/if}
		{/if}
	</section>
</div>
```

---

## Real-time Updates

Use Supabase Realtime to receive instant updates when new reward events are created.

### Basic Subscription

```typescript
// src/lib/utils/realtime-rewards.ts
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { RewardEvent } from '$lib/types/reward-journal';

export function subscribeToRewardEvents(
	supabase: SupabaseClient,
	studentId: string,
	onNewEvent: (event: RewardEvent) => void
): RealtimeChannel {
	return supabase
		.channel(`reward_events:${studentId}`)
		.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'reward_events',
				filter: `student_id=eq.${studentId}`
			},
			(payload) => {
				const newEvent = payload.new as RewardEvent;
				onNewEvent(newEvent);
			}
		)
		.subscribe((status) => {
			if (status === 'SUBSCRIBED') {
				console.log('Subscribed to reward events');
			}
		});
}

export function unsubscribe(channel: RealtimeChannel) {
	channel.unsubscribe();
}
```

#### Usage in Component

```svelte
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { subscribeToRewardEvents, unsubscribe } from '$lib/utils/realtime-rewards';
	import type { RealtimeChannel } from '@supabase/supabase-js';

	let { supabase, userId } = $props();
	let channel: RealtimeChannel | null = null;
	let events = $state<RewardEvent[]>([]);

	onMount(() => {
		channel = subscribeToRewardEvents(supabase, userId, (newEvent) => {
			// Prepend new event to list
			events = [newEvent, ...events];
		});
	});

	onDestroy(() => {
		if (channel) unsubscribe(channel);
	});
</script>
```

---

### Integration with Store

Enhanced `rewardJournal` store with real-time support:

```typescript
// src/lib/stores/rewardJournal.svelte.ts
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { RewardEvent, RewardType, RewardEventType } from '$lib/types/reward-journal';

class RewardJournalStore {
	events = $state<RewardEvent[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	private channel: RealtimeChannel | null = null;
	private supabase: SupabaseClient | null = null;
	private studentId: string | null = null;

	pagination = $state({
		page: 1,
		limit: 20,
		total: 0,
		totalPages: 0,
		hasMore: false
	});

	filters = $state({
		rewardType: null as RewardType | null,
		eventType: null as RewardEventType | null,
		from: null as string | null,
		to: null as string | null
	});

	// Initialize real-time subscription
	initRealtime(supabase: SupabaseClient, studentId: string) {
		this.supabase = supabase;
		this.studentId = studentId;

		// Clean up existing subscription
		this.destroyRealtime();

		this.channel = supabase
			.channel(`reward_events:${studentId}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'reward_events',
					filter: `student_id=eq.${studentId}`
				},
				(payload) => {
					this.handleNewEvent(payload.new as RewardEvent);
				}
			)
			.subscribe();
	}

	private handleNewEvent(newEvent: RewardEvent) {
		// Check if event matches current filters
		if (this.filters.rewardType && newEvent.reward_type !== this.filters.rewardType) {
			return; // Don't add if filtered out
		}
		if (this.filters.eventType && newEvent.event_type !== this.filters.eventType) {
			return;
		}

		// Prepend to events list (newest first)
		this.events = [newEvent, ...this.events];
		this.pagination.total += 1;

		// Emit custom event for notifications
		if (typeof window !== 'undefined') {
			window.dispatchEvent(
				new CustomEvent('reward-event', {
					detail: newEvent
				})
			);
		}
	}

	destroyRealtime() {
		if (this.channel) {
			this.channel.unsubscribe();
			this.channel = null;
		}
	}

	async fetchEvents() {
		// ... existing implementation
	}

	async loadMore() {
		// ... existing implementation
	}

	setFilters(filters: Partial<typeof this.filters>) {
		// ... existing implementation
	}

	reset() {
		this.destroyRealtime();
		this.events = [];
		this.loading = false;
		this.error = null;
		this.pagination = {
			page: 1,
			limit: 20,
			total: 0,
			totalPages: 0,
			hasMore: false
		};
	}
}

export const rewardJournal = new RewardJournalStore();
```

#### Usage with Real-time

```svelte
<script lang="ts">
	import { rewardJournal } from '$lib/stores/rewardJournal.svelte';
	import { onMount, onDestroy } from 'svelte';

	let { data } = $props();

	onMount(() => {
		// Initialize real-time subscription
		rewardJournal.initRealtime(data.supabase, data.user.id);

		// Fetch initial events
		rewardJournal.fetchEvents();
	});

	onDestroy(() => {
		rewardJournal.reset();
	});
</script>
```

---

### Toast Notifications

Show toast notifications for new reward events:

```typescript
// src/lib/utils/reward-notifications.ts
import { toaster } from '$lib/stores/toaster.svelte';
import type { RewardEvent } from '$lib/types/reward-journal';

const EVENT_ICONS: Record<string, string> = {
	gidouilles: '🪙',
	bonus: '⭐',
	vip_card: '👑',
	achievement: '🏆',
	item: '📦'
};

export function showRewardNotification(event: RewardEvent) {
	const icon = EVENT_ICONS[event.reward_type] || '🎁';

	// Determine toast type based on event
	const isPositive = ['earned', 'awarded', 'unlocked', 'purchased'].includes(event.event_type);

	if (isPositive) {
		toaster.success(`${icon} ${event.description}`);
	} else {
		toaster.info(`${icon} ${event.description}`);
	}
}

// Listen for real-time events globally
export function initRewardNotifications() {
	if (typeof window === 'undefined') return;

	window.addEventListener('reward-event', ((e: CustomEvent<RewardEvent>) => {
		showRewardNotification(e.detail);
	}) as EventListener);
}
```

#### Initialize in Layout

```svelte
<!-- src/routes/(protected)/+layout.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { initRewardNotifications } from '$lib/utils/reward-notifications';

	onMount(() => {
		initRewardNotifications();
	});
</script>
```

#### Custom Toast Component for Rewards

```svelte
<!-- src/lib/components/rewards/RewardToast.svelte -->
<script lang="ts">
	import type { RewardEvent } from '$lib/types/reward-journal';
	import { Coins, Star, Crown, Trophy, Package } from 'lucide-svelte';
	import { fly } from 'svelte/transition';

	let { event, onclose }: { event: RewardEvent; onclose: () => void } = $props();

	const icons = {
		gidouilles: Coins,
		bonus: Star,
		vip_card: Crown,
		achievement: Trophy,
		item: Package
	};

	const Icon = icons[event.reward_type] || Package;

	// Auto-dismiss after 5 seconds
	$effect(() => {
		const timer = setTimeout(onclose, 5000);
		return () => clearTimeout(timer);
	});
</script>

<div
	class="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-lg"
	transition:fly={{ y: -20, duration: 300 }}
>
	<div class="rounded-full bg-primary/10 p-2">
		<Icon class="h-5 w-5 text-primary" />
	</div>
	<div class="flex-1">
		<p class="text-sm font-medium">{event.description}</p>
		{#if event.amount}
			<p class="text-xs text-muted-foreground">
				{event.amount > 0 ? '+' : ''}{event.amount}
			</p>
		{/if}
	</div>
	<button onclick={onclose} class="text-muted-foreground hover:text-foreground"> × </button>
</div>
```

---

### Teacher Real-time View

Teachers can subscribe to events for all students in a class:

```typescript
// src/lib/utils/teacher-realtime.ts
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { RewardEvent } from '$lib/types/reward-journal';

export function subscribeToClassEvents(
	supabase: SupabaseClient,
	classId: string,
	onNewEvent: (event: RewardEvent) => void
): RealtimeChannel {
	return supabase
		.channel(`class_reward_events:${classId}`)
		.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'reward_events',
				filter: `class_id=eq.${classId}`
			},
			(payload) => {
				onNewEvent(payload.new as RewardEvent);
			}
		)
		.subscribe();
}
```

#### Teacher Dashboard with Live Feed

```svelte
<!-- src/routes/(protected)/dashboard/teacher/activity/+page.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { subscribeToClassEvents } from '$lib/utils/teacher-realtime';
	import RewardEventCard from '$lib/components/rewards/RewardEventCard.svelte';
	import type { RealtimeChannel } from '@supabase/supabase-js';
	import type { RewardEvent } from '$lib/types/reward-journal';

	let { data } = $props();

	let liveEvents = $state<RewardEvent[]>([]);
	let channels: RealtimeChannel[] = [];

	onMount(() => {
		// Subscribe to all classes the teacher manages
		for (const classInfo of data.classes) {
			const channel = subscribeToClassEvents(data.supabase, classInfo.id, (event) => {
				// Add student info to event for display
				const enrichedEvent = {
					...event,
					studentName: getStudentName(event.student_id)
				};
				liveEvents = [enrichedEvent, ...liveEvents].slice(0, 50); // Keep last 50
			});
			channels.push(channel);
		}
	});

	onDestroy(() => {
		channels.forEach((ch) => ch.unsubscribe());
	});

	function getStudentName(studentId: string): string {
		// Look up from data.students or fetch
		const student = data.students.find((s) => s.id === studentId);
		return student ? `${student.firstname} ${student.lastname}` : 'Élève';
	}
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">Activité en direct</h1>

	{#if liveEvents.length === 0}
		<div class="py-12 text-center text-muted-foreground">
			<p>En attente d'activité...</p>
			<p class="mt-2 text-sm">Les événements apparaîtront ici en temps réel</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each liveEvents as event (event.id)}
				<div class="animate-in fade-in slide-in-from-top-2">
					<div class="mb-1 text-xs text-muted-foreground">
						{event.studentName}
					</div>
					<RewardEventCard {event} compact />
				</div>
			{/each}
		</div>
	{/if}
</div>
```

---

### Connection Status Indicator

Show real-time connection status to users:

```svelte
<!-- src/lib/components/rewards/RealtimeStatus.svelte -->
<script lang="ts">
	import { Wifi, WifiOff } from 'lucide-svelte';

	let { connected = $bindable(false) }: { connected: boolean } = $props();
</script>

<div class="flex items-center gap-2 text-xs">
	{#if connected}
		<Wifi class="h-3 w-3 text-green-500" />
		<span class="text-green-600">En direct</span>
	{:else}
		<WifiOff class="h-3 w-3 text-muted-foreground" />
		<span class="text-muted-foreground">Hors ligne</span>
	{/if}
</div>
```

#### Track Connection Status

```typescript
// In your store or component
channel = supabase
	.channel(`reward_events:${studentId}`)
	.on(
		'postgres_changes',
		{
			/* ... */
		},
		handleNewEvent
	)
	.subscribe((status) => {
		switch (status) {
			case 'SUBSCRIBED':
				connected = true;
				break;
			case 'CLOSED':
			case 'CHANNEL_ERROR':
				connected = false;
				break;
		}
	});
```

---

### Performance Considerations

1. **Filter server-side when possible**: Use the `filter` parameter to reduce events sent to client
2. **Limit subscriptions**: Don't subscribe to more channels than necessary
3. **Debounce UI updates**: If many events arrive quickly, batch UI updates
4. **Clean up on unmount**: Always unsubscribe when component is destroyed

```typescript
// Debounced event handler
import { debounce } from '$lib/utils/debounce';

const debouncedUpdate = debounce((events: RewardEvent[]) => {
    this.events = events;
}, 100);

private handleNewEvent(newEvent: RewardEvent) {
    const updated = [newEvent, ...this.events];
    debouncedUpdate(updated);
}
```

---

## Styling Reference

### Color Scheme by Event Type

```css
/* Badge colors */
.badge-earned,
.badge-awarded,
.badge-unlocked {
	@apply bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200;
}

.badge-spent,
.badge-used {
	@apply bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200;
}

.badge-traded {
	@apply bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200;
}

.badge-removed,
.badge-expired {
	@apply bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200;
}
```

### Icon Mapping

```typescript
const REWARD_ICONS: Record<RewardType, typeof Coins> = {
	gidouilles: Coins,
	bonus: Star,
	vip_card: Crown,
	achievement: Trophy,
	item: Package
};

const ICON_COLORS: Record<RewardType, string> = {
	gidouilles: 'text-yellow-500',
	bonus: 'text-purple-500',
	vip_card: 'text-amber-500',
	achievement: 'text-emerald-500',
	item: 'text-sky-500'
};
```

### Timeline Styling

```svelte
<style>
	/* Timeline connector line */
	.timeline-item:not(:last-child)::after {
		content: '';
		position: absolute;
		left: 1.25rem;
		top: 3rem;
		bottom: -0.75rem;
		width: 2px;
		background: hsl(var(--border));
	}
</style>
```
