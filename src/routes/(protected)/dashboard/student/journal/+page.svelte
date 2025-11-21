<!--
	Student Reward Journal Page
	===========================

	Displays a timeline of all reward events for the student.
	Features filtering by reward type and infinite scroll pagination.
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import { rewardJournalStore } from '$lib/stores/rewardJournal.svelte';
	import RewardEventCard from '$lib/components/rewards/RewardEventCard.svelte';
	import RewardJournalFilters from '$lib/components/rewards/RewardJournalFilters.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
	import { BookOpen, RefreshCw, ChevronDown, AlertCircle, Inbox } from 'lucide-svelte';
	import type { RewardType } from '$lib/types/reward-journal';

	// Local state for filter
	let selectedRewardType = $state<RewardType | null>(null);

	// Initialize store on mount
	onMount(() => {
		rewardJournalStore.fetchEvents();

		return () => {
			rewardJournalStore.reset();
		};
	});

	// Handle filter change
	function handleFilterChange(type: RewardType | null) {
		selectedRewardType = type;
		rewardJournalStore.setFilters({
			reward_type: type ?? undefined
		});
	}

	// Handle load more
	function handleLoadMore() {
		rewardJournalStore.loadMore();
	}

	// Handle refresh
	function handleRefresh() {
		rewardJournalStore.fetchEvents();
	}

	// Computed values from store
	let events = $derived(rewardJournalStore.events);
	let loading = $derived(rewardJournalStore.loading);
	let error = $derived(rewardJournalStore.error);
	let hasMore = $derived(rewardJournalStore.hasMore);
	let isEmpty = $derived(rewardJournalStore.isEmpty);
	let isFiltered = $derived(rewardJournalStore.isFiltered);
	let pagination = $derived(rewardJournalStore.pagination);

	// Initial loading state (first fetch)
	let isInitialLoading = $derived(loading && events.length === 0);
</script>

<svelte:head>
	<title>Mon Journal - Ubumaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-6">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
					<BookOpen class="h-6 w-6 text-primary" />
				</div>
				<div>
					<h1 class="text-2xl font-bold sm:text-3xl">Mon Journal</h1>
					<p class="text-sm text-muted-foreground sm:text-base">
						Historique de tes r\u00e9compenses et activit\u00e9s
					</p>
				</div>
			</div>
			<Button
				variant="outline"
				size="icon"
				onclick={handleRefresh}
				disabled={loading}
				class="shrink-0"
			>
				<RefreshCw class={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
				<span class="sr-only">Rafra\u00eechir</span>
			</Button>
		</div>
	</div>

	<!-- Filters -->
	<Card.Root class="mb-6">
		<Card.Content class="p-4">
			<RewardJournalFilters
				bind:selectedType={selectedRewardType}
				onFilterChange={handleFilterChange}
			/>
		</Card.Content>
	</Card.Root>

	<!-- Error state -->
	{#if error}
		<Card.Root class="mb-6 border-destructive/50 bg-destructive/10">
			<Card.Content class="flex items-center gap-3 p-4">
				<AlertCircle class="h-5 w-5 text-destructive" />
				<div class="flex-1">
					<p class="font-medium text-destructive">Erreur</p>
					<p class="text-sm text-destructive/80">{error}</p>
				</div>
				<Button variant="outline" size="sm" onclick={handleRefresh}>R\u00e9essayer</Button>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Loading skeleton -->
	{#if isInitialLoading}
		<div class="space-y-4">
			{#each Array(5) as _, i (i)}
				<Card.Root>
					<Card.Content class="flex items-start gap-4 p-4">
						<Skeleton class="h-10 w-10 shrink-0 rounded-full" />
						<div class="flex-1 space-y-2">
							<div class="flex gap-2">
								<Skeleton class="h-5 w-16" />
								<Skeleton class="h-5 w-20" />
							</div>
							<Skeleton class="h-4 w-3/4" />
							<Skeleton class="h-3 w-24" />
						</div>
						<Skeleton class="h-6 w-12" />
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else if isEmpty}
		<!-- Empty state -->
		<Card.Root>
			<Card.Content class="flex flex-col items-center justify-center py-12 text-center">
				<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
					<Inbox class="h-8 w-8 text-muted-foreground" />
				</div>
				<h3 class="mb-2 text-lg font-semibold">
					{#if isFiltered}
						Aucun \u00e9v\u00e9nement trouv\u00e9
					{:else}
						Ton journal est vide
					{/if}
				</h3>
				<p class="max-w-sm text-sm text-muted-foreground">
					{#if isFiltered}
						Aucun \u00e9v\u00e9nement ne correspond aux filtres s\u00e9lectionn\u00e9s. Essaie de
						modifier les filtres.
					{:else}
						Les \u00e9v\u00e9nements li\u00e9s \u00e0 tes r\u00e9compenses appara\u00eetront ici.
						Continue \u00e0 jouer pour d\u00e9bloquer des succ\u00e8s !
					{/if}
				</p>
				{#if isFiltered}
					<Button
						variant="outline"
						class="mt-4"
						onclick={() => {
							selectedRewardType = null;
							rewardJournalStore.clearFilters();
						}}
					>
						Effacer les filtres
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Events list -->
		<div class="space-y-3">
			{#each events as event (event.id)}
				<RewardEventCard {event} />
			{/each}
		</div>

		<!-- Load more button -->
		{#if hasMore}
			<div class="mt-6 flex justify-center">
				<Button variant="outline" onclick={handleLoadMore} disabled={loading} class="gap-2">
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
			<p class="mt-4 text-center text-sm text-muted-foreground">
				{events.length} sur {pagination.total} \u00e9v\u00e9nements
			</p>
		{/if}
	{/if}
</div>
