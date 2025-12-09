# Frontend Integration

> Complete guide for Svelte 5 components, stores, and UI patterns for the rewards system.

## Overview

The rewards system frontend uses:

- **Svelte 5 runes** (`$state`, `$derived`, `$effect`)
- **Class-based stores** for state management
- **Optimistic UI** with debounced server sync
- **Real-time subscriptions** via Supabase Realtime

## Component Architecture

```
src/lib/components/
├── rewards/
│   ├── VipCardDrawModal.svelte      # Card draw animation
│   ├── VipCardBatchReveal.svelte    # Multi-card reveal
│   ├── VipCardMultiHoloReveal.svelte # Holographic animation
│   ├── VipCardChooseModal.svelte    # Choose card action UI
│   ├── VipCardExchangeModal.svelte  # Exchange cards action
│   ├── RemoveWarningsModal.svelte   # Remove warnings action
│   ├── RewardEventCard.svelte       # Single journal event
│   └── RewardJournalFilters.svelte  # Filter controls
├── shop/
│   ├── ShopBrowse.svelte            # Shop item listing
│   ├── ShopItemCard.svelte          # Single item display
│   ├── ShopCategoryFilter.svelte    # Category filter
│   └── ShopPurchaseModal.svelte     # Purchase confirmation
├── VipCardsModal.svelte             # View card collection
├── VipCardSelector.svelte           # Card selection dropdown
├── VipCardImage.svelte              # Single card image
└── GidouilleDisplay.svelte          # Animated gidouille treasure
```

---

## Reward Journal Store

### Store Definition

```typescript
// src/lib/stores/rewardJournal.svelte.ts

class RewardJournalStore {
	// State using Svelte 5 runes
	events = $state<RewardEvent[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);
	pagination = $state<PaginationMeta | null>(null);
	filters = $state<RewardJournalFilters>({});

	// Computed values
	hasMore = $derived(this.pagination?.hasMore ?? false);
	isEmpty = $derived(this.events.length === 0 && !this.loading);
	isFiltered = $derived(
		Boolean(
			this.filters.reward_type || this.filters.event_type || this.filters.from || this.filters.to
		)
	);

	// Methods
	async fetchEvents(studentId?: string): Promise<void>;
	async loadMore(): Promise<void>;
	setFilters(newFilters: Partial<RewardJournalFilters>): void;
	clearFilters(): void;
	reset(): void;
}

export const rewardJournalStore = new RewardJournalStore();
```

### Usage

```svelte
<script lang="ts">
	import { rewardJournalStore } from '$lib/stores/rewardJournal.svelte';
	import RewardEventCard from '$lib/components/rewards/RewardEventCard.svelte';
	import RewardJournalFilters from '$lib/components/rewards/RewardJournalFilters.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		rewardJournalStore.fetchEvents();
	});

	function handleScroll(event: Event) {
		const target = event.target as HTMLElement;
		const nearBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;

		if (nearBottom && rewardJournalStore.hasMore) {
			rewardJournalStore.loadMore();
		}
	}
</script>

<RewardJournalFilters />

<div class="overflow-y-auto" onscroll={handleScroll}>
	{#each rewardJournalStore.events as event}
		<RewardEventCard {event} />
	{/each}

	{#if rewardJournalStore.loading}
		<div class="loading-spinner" />
	{/if}

	{#if rewardJournalStore.isEmpty}
		<p class="text-muted">Aucun evenement</p>
	{/if}
</div>
```

---

## Teacher Dashboard Cache

### Optimistic Updates

The teacher rewards page uses optimistic updates with debouncing:

```typescript
// src/lib/stores/teacherDashboardCache.svelte.ts

class TeacherDashboardCache {
	students = $state<Map<string, StudentData>>(new Map());
	pendingChanges = $state<Map<string, number>>(new Map());
	debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

	// Optimistic update (immediate)
	updateGidouillesOptimistic(studentId: string, delta: number) {
		const student = this.students.get(studentId);
		if (student) {
			student.gidouilles += delta;
		}

		// Accumulate pending changes
		const pending = this.pendingChanges.get(studentId) ?? 0;
		this.pendingChanges.set(studentId, pending + delta);

		// Debounce API call
		this.scheduleSync(studentId);
	}

	// Debounced sync (after 500ms of no changes)
	private scheduleSync(studentId: string) {
		const existing = this.debounceTimers.get(studentId);
		if (existing) clearTimeout(existing);

		this.debounceTimers.set(
			studentId,
			setTimeout(() => {
				this.syncToServer(studentId);
			}, 500)
		);
	}

	// Server sync
	private async syncToServer(studentId: string) {
		const delta = this.pendingChanges.get(studentId);
		if (!delta) return;

		try {
			await fetch('/api/teacher/rewards/update-student', {
				method: 'POST',
				body: JSON.stringify({ studentId, delta })
			});
			this.pendingChanges.delete(studentId);
		} catch (error) {
			// Rollback on failure
			this.rollbackOptimistic(studentId, delta);
		}
	}
}
```

### UI Pattern

```svelte
<script lang="ts">
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';

	let { student } = $props<{ student: StudentData }>();

	function handleIncrement() {
		teacherCache.updateGidouillesOptimistic(student.id, 1);
	}

	function handleDecrement() {
		teacherCache.updateGidouillesOptimistic(student.id, -1);
	}
</script>

<div class="flex items-center gap-2">
	<button onclick={handleDecrement}>-</button>
	<span class="font-mono">{student.gidouilles}</span>
	<button onclick={handleIncrement}>+</button>
</div>
```

---

## VIP Card Components

### VipCardDrawModal

Animated modal for drawing VIP cards:

```svelte
<script lang="ts">
	import VipCardDrawModal from '$lib/components/rewards/VipCardDrawModal.svelte';

	let showDrawModal = $state(false);
	let drawnCards = $state<DrawnCard[]>([]);

	async function handleDraw() {
		const response = await fetch('/api/rewards/draw-vip-cards', {
			method: 'POST',
			body: JSON.stringify({
				studentId,
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: 3
			})
		});

		const result = await response.json();
		drawnCards = result.cards;
		showDrawModal = true;
	}
</script>

<button onclick={handleDraw}>Tirer une carte (3 gidouilles)</button>

{#if showDrawModal}
	<VipCardDrawModal cards={drawnCards} onClose={() => (showDrawModal = false)} />
{/if}
```

### VipCardsModal

View student's card collection:

```svelte
<script lang="ts">
	import VipCardsModal from '$lib/components/VipCardsModal.svelte';

	let { student, vipCardTemplates } = $props();
	let showModal = $state(false);
</script>

<button onclick={() => (showModal = true)}>
	Voir les cartes ({Object.keys(student.vip_cards).length})
</button>

{#if showModal}
	<VipCardsModal
		cards={student.vip_cards}
		templates={vipCardTemplates}
		studentName={student.name}
		onClose={() => (showModal = false)}
	/>
{/if}
```

### Card Action Modals

```svelte
<!-- VipCardChooseModal - Select cards from list -->
<VipCardChooseModal
	action={cardAction}
	availableCards={templates}
	onConfirm={handleChooseConfirm}
	onCancel={handleCancel}
/>

<!-- VipCardExchangeModal - Exchange cards -->
<VipCardExchangeModal
	action={exchangeAction}
	studentCards={myCards}
	onConfirm={handleExchangeConfirm}
	onCancel={handleCancel}
/>

<!-- RemoveWarningsModal - Select warnings to remove -->
<RemoveWarningsModal
	warnings={studentWarnings}
	maxToRemove={cardAction.count}
	onConfirm={handleRemoveConfirm}
	onCancel={handleCancel}
/>
```

---

## Shop Components

### ShopBrowse

Main shop browsing component:

```svelte
<script lang="ts">
	import ShopBrowse from '$lib/components/shop/ShopBrowse.svelte';

	let { studentBalance, items } = $props();
</script>

<ShopBrowse {items} balance={studentBalance} onPurchase={handlePurchase} />
```

### ShopPurchaseModal

Purchase confirmation with balance check:

```svelte
<script lang="ts">
	import ShopPurchaseModal from '$lib/components/shop/ShopPurchaseModal.svelte';

	let selectedItem = $state<ShopItem | null>(null);
</script>

{#if selectedItem}
	<ShopPurchaseModal
		item={selectedItem}
		balance={studentBalance}
		onConfirm={handleConfirmPurchase}
		onCancel={() => (selectedItem = null)}
	/>
{/if}
```

---

## Journal Components

### RewardEventCard

Display a single reward event:

```svelte
<script lang="ts">
	import type { RewardEvent } from '$lib/types/reward-journal';

	let { event } = $props<{ event: RewardEvent }>();

	// Icon based on reward type
	const icons: Record<string, string> = {
		gidouilles: '🪙',
		bonus: '⭐',
		vip_card: '🃏',
		achievement: '🏆',
		item: '📦'
	};

	// Color based on event type
	const colors: Record<string, string> = {
		earned: 'text-green-600',
		spent: 'text-red-600',
		traded: 'text-blue-600',
		used: 'text-orange-600',
		unlocked: 'text-purple-600'
	};
</script>

<div class="flex items-start gap-3 border-b p-3">
	<span class="text-2xl">{icons[event.reward_type]}</span>

	<div class="flex-1">
		<p class={colors[event.event_type]}>
			{event.description}
		</p>
		<time class="text-xs text-muted">
			{new Date(event.created_at).toLocaleDateString('fr-FR')}
		</time>
	</div>

	{#if event.amount}
		<span class="font-mono {event.amount > 0 ? 'text-green-600' : 'text-red-600'}">
			{event.amount > 0 ? '+' : ''}{event.amount}
		</span>
	{/if}
</div>
```

### RewardJournalFilters

Filter controls for the journal:

```svelte
<script lang="ts">
	import { rewardJournalStore } from '$lib/stores/rewardJournal.svelte';
	import MySelect from '$lib/components/MySelect.svelte';

	const rewardTypeOptions = [
		{ value: '', label: 'Tous les types' },
		{ value: 'gidouilles', label: 'Gidouilles' },
		{ value: 'bonus', label: 'Bonus' },
		{ value: 'vip_card', label: 'Cartes VIP' },
		{ value: 'achievement', label: 'Succes' },
		{ value: 'item', label: 'Articles' }
	];

	let selectedType = $state(rewardJournalStore.filters.reward_type ?? '');

	function handleFilterChange() {
		rewardJournalStore.setFilters({
			reward_type: selectedType || undefined
		});
	}
</script>

<div class="mb-4 flex gap-2">
	<MySelect
		type="single"
		items={rewardTypeOptions}
		bind:value={selectedType}
		onValueChange={handleFilterChange}
	/>

	{#if rewardJournalStore.isFiltered}
		<button onclick={() => rewardJournalStore.clearFilters()}> Effacer les filtres </button>
	{/if}
</div>
```

---

## GidouilleDisplay

Animated treasure chest displaying gidouilles:

```svelte
<script lang="ts">
	import GidouilleDisplay from '$lib/components/GidouilleDisplay.svelte';

	let { gidouilles } = $props<{ gidouilles: number }>();
</script>

<GidouilleDisplay value={gidouilles} animated={true} />
```

Features:

- Treasure chest animation
- Coin pile visualization
- Number animation on change
- Hover effects

---

## Real-time Updates

### Supabase Realtime Subscription

```typescript
// Subscribe to reward changes
const channel = supabase
	.channel('rewards-changes')
	.on(
		'postgres_changes',
		{
			event: 'UPDATE',
			schema: 'public',
			table: 'profiles',
			filter: `id=eq.${userId}`
		},
		(payload) => {
			// Update local state
			currentGidouilles = payload.new.gidouilles;
			currentBonus = payload.new.bonus;
		}
	)
	.subscribe();

// Cleanup on unmount
onDestroy(() => {
	supabase.removeChannel(channel);
});
```

### Optimistic + Real-time Pattern

```typescript
// 1. Optimistic update (instant UI feedback)
studentData.gidouilles += delta;

// 2. Server request
await fetch('/api/teacher/rewards/update-student', {...});

// 3. Real-time confirms (or rollback on mismatch)
// Supabase subscription receives the actual value
```

---

## Best Practices

### 1. Use Svelte 5 Runes

```svelte
<script lang="ts">
	// State
	let count = $state(0);

	// Derived
	let doubled = $derived(count * 2);

	// Props
	let { title } = $props<{ title: string }>();

	// Effects (for side effects only)
	$effect(() => {
		console.log('Count changed:', count);
	});
</script>
```

### 2. Use MySelect/MyCheckbox

```svelte
<!-- CORRECT -->
<MySelect type="single" bind:value={selected} {items} />

<!-- NEVER use native or Shadcn directly -->
<!-- <select> or <Select.Root> -->
```

### 3. Toast Notifications

```typescript
import { toaster } from '$lib/stores/toaster.svelte';

// Success
toaster.success('Gidouilles mises a jour');

// Error
toaster.error('Echec de la mise a jour');

// Warning
toaster.warning('Solde insuffisant');
```

### 4. Loading States

```svelte
{#if loading}
	<div class="flex justify-center p-4">
		<Loader2 class="animate-spin" />
	</div>
{:else if error}
	<Alert variant="destructive">{error}</Alert>
{:else}
	<!-- Content -->
{/if}
```
