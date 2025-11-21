<!--
	Teacher Student Journal Page
	============================

	Displays a timeline of all reward events for a specific student.
	Features filtering by reward type and infinite scroll pagination.

	FEATURES:
	- Student info header with avatar and name
	- Breadcrumb navigation
	- Reuses RewardEventCard and RewardJournalFilters from Phase 5
	- Same layout and UX as student journal

	SECURITY:
	- Teacher must own the student (verified server-side)
	- Admins can view any student
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { rewardJournalStore } from '$lib/stores/rewardJournal.svelte';
	import RewardEventCard from '$lib/components/rewards/RewardEventCard.svelte';
	import RewardJournalFilters from '$lib/components/rewards/RewardJournalFilters.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import {
		RefreshCw,
		ChevronDown,
		AlertCircle,
		Inbox,
		ChevronLeft,
		ChevronRight,
		Users
	} from 'lucide-svelte';
	import type { RewardType } from '$lib/types/reward-journal';
	import type { PageData } from './$types';

	// Props from server load
	let { data }: { data: PageData } = $props();

	// Local state for filter
	let selectedRewardType = $state<RewardType | null>(null);

	// Get student info from server data
	let student = $derived(data.student);
	let studentId = $derived($page.params.studentId);

	// Build student display name
	let studentName = $derived(
		student ? `${student.firstname || ''} ${student.lastname || ''}`.trim() || 'Eleve' : 'Eleve'
	);

	// Get initials for avatar fallback
	let studentInitials = $derived.by(() => {
		if (!student) return '?';
		const first = student.firstname?.charAt(0) || '';
		const last = student.lastname?.charAt(0) || '';
		return (first + last).toUpperCase() || '?';
	});

	// Initialize store on mount with studentId
	onMount(() => {
		rewardJournalStore.fetchEvents(studentId);

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
		rewardJournalStore.fetchEvents(studentId);
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
	<title>Journal de {studentName} - Ubumaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-6">
	<!-- Breadcrumb Navigation -->
	<nav class="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
		<a
			href="/dashboard/teacher/rewards"
			class="flex items-center gap-1 transition-colors hover:text-foreground"
		>
			<Users class="h-4 w-4" />
			<span>Eleves</span>
		</a>
		<ChevronRight class="h-4 w-4" />
		<span class="text-foreground">{studentName}</span>
		<ChevronRight class="h-4 w-4" />
		<span class="text-foreground">Journal</span>
	</nav>

	<!-- Header with Student Info -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<!-- Back Button -->
				<Button variant="ghost" size="icon" href="/dashboard/teacher/rewards" class="shrink-0">
					<ChevronLeft class="h-5 w-5" />
					<span class="sr-only">Retour</span>
				</Button>

				<!-- Student Avatar -->
				<Avatar.Root class="h-12 w-12">
					{#if student?.avatar_url}
						<Avatar.Image src={student.avatar_url} alt={studentName} />
					{/if}
					<Avatar.Fallback class="bg-primary/10 text-primary">
						{studentInitials}
					</Avatar.Fallback>
				</Avatar.Root>

				<!-- Title and Description -->
				<div>
					<h1 class="text-2xl font-bold sm:text-3xl">Journal de {studentName}</h1>
					<p class="text-sm text-muted-foreground sm:text-base">
						Historique des recompenses et activites
					</p>
				</div>
			</div>

			<!-- Refresh Button -->
			<Button
				variant="outline"
				size="icon"
				onclick={handleRefresh}
				disabled={loading}
				class="shrink-0"
			>
				<RefreshCw class={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
				<span class="sr-only">Rafraichir</span>
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
				<Button variant="outline" size="sm" onclick={handleRefresh}>Reessayer</Button>
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
						Aucun evenement trouve
					{:else}
						Le journal est vide
					{/if}
				</h3>
				<p class="max-w-sm text-sm text-muted-foreground">
					{#if isFiltered}
						Aucun evenement ne correspond aux filtres selectionnes. Essayez de modifier les filtres.
					{:else}
						Les evenements lies aux recompenses de cet eleve apparaitront ici.
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
				{events.length} sur {pagination.total} evenements
			</p>
		{/if}
	{/if}
</div>
