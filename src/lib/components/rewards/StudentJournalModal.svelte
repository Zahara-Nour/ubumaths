<!--
	StudentJournalModal Component
	==============================

	Reusable modal displaying a filtered view of the student reward journal.
	Uses the same RewardEventCard and rewardJournalStore as the teacher journal
	for consistent presentation.

	Props:
	- rewardType: Optional filter to show only one type (e.g. 'gidouilles', 'bonus')
	- title: Modal title

	Used in: RewardsBlock.svelte (student dashboard)
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { rewardJournalStore } from '$lib/stores/rewardJournal.svelte';
	import RewardEventCard from '$lib/components/rewards/RewardEventCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
	import { X, RefreshCw, ChevronDown, Inbox } from 'lucide-svelte';
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import type { RewardType } from '$lib/types/reward-journal';
	import type { Snippet } from 'svelte';

	interface Props {
		rewardType?: RewardType;
		title: string;
		icon?: Snippet;
	}

	let { rewardType, title, icon }: Props = $props();

	// Computed values from store
	let events = $derived(rewardJournalStore.events);
	let loading = $derived(rewardJournalStore.loading);
	let error = $derived(rewardJournalStore.error);
	let hasMore = $derived(rewardJournalStore.hasMore);
	let isEmpty = $derived(rewardJournalStore.isEmpty);
	let pagination = $derived(rewardJournalStore.pagination);
	let isInitialLoading = $derived(loading && events.length === 0);

	onMount(() => {
		// Apply filter if specified, then fetch
		if (rewardType) {
			rewardJournalStore.setFilters({ reward_type: rewardType });
		} else {
			rewardJournalStore.fetchEvents();
		}
	});

	onDestroy(() => {
		rewardJournalStore.reset();
	});

	function handleClose() {
		modalStack.pop();
	}

	function handleLoadMore() {
		rewardJournalStore.loadMore();
	}

	function handleRefresh() {
		if (rewardType) {
			rewardJournalStore.setFilters({ reward_type: rewardType });
		} else {
			rewardJournalStore.fetchEvents();
		}
	}
</script>

<div
	class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
	role="dialog"
	aria-modal="true"
	aria-labelledby="journal-modal-title"
>
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<h2 id="journal-modal-title" class="flex items-center gap-2 text-2xl font-bold">
			{#if icon}
				{@render icon()}
			{/if}
			{title}
		</h2>
		<div class="flex items-center gap-2">
			<button
				onclick={handleRefresh}
				disabled={loading}
				class="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
				aria-label="Rafraîchir"
			>
				<RefreshCw class={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
			</button>
			<button
				onclick={handleClose}
				class="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
				aria-label="Fermer"
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	</div>

	<!-- Error state -->
	{#if error}
		<Card.Root class="mb-4 border-destructive/50 bg-destructive/10">
			<Card.Content class="flex items-center gap-3 p-4">
				<p class="flex-1 text-sm text-destructive">{error}</p>
				<Button variant="outline" size="sm" onclick={handleRefresh}>Réessayer</Button>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Loading skeleton -->
	{#if isInitialLoading}
		<div class="space-y-3">
			{#each Array(5) as _, i (i)}
				<Card.Root>
					<Card.Content class="flex items-center gap-3 px-4 py-2.5">
						<Skeleton class="h-8 w-8 shrink-0 rounded-full" />
						<div class="flex-1 space-y-1.5">
							<Skeleton class="h-4 w-3/4" />
						</div>
						<div class="space-y-1 text-right">
							<Skeleton class="h-5 w-10" />
							<Skeleton class="h-3 w-20" />
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else if isEmpty}
		<!-- Empty state -->
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
				<Inbox class="h-8 w-8 text-muted-foreground" />
			</div>
			<h3 class="mb-2 text-lg font-semibold">Le journal est vide</h3>
			<p class="max-w-sm text-sm text-muted-foreground">
				Aucun événement à afficher pour le moment.
			</p>
		</div>
	{:else}
		<!-- Events list -->
		<div class="space-y-3">
			{#each events as event (event.id)}
				<RewardEventCard {event} />
			{/each}
		</div>

		<!-- Load more button -->
		{#if hasMore}
			<div class="mt-4 flex justify-center">
				<Button
					variant="outline"
					size="sm"
					onclick={handleLoadMore}
					disabled={loading}
					class="gap-2"
				>
					{#if loading}
						<RefreshCw class="h-4 w-4 animate-spin" />
						Chargement...
					{:else}
						<ChevronDown class="h-4 w-4" />
						Charger plus
					{/if}
				</Button>
			</div>
		{/if}

		<!-- Pagination info -->
		{#if pagination}
			<p class="mt-3 text-center text-sm text-muted-foreground">
				{events.length} sur {pagination.total} événements
			</p>
		{/if}
	{/if}

	<!-- Footer -->
	<div class="mt-6 flex justify-end">
		<Button variant="outline" onclick={handleClose}>Fermer</Button>
	</div>
</div>
