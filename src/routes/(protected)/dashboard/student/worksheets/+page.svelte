<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import MySelect from '$lib/components/MySelect.svelte';
	import WorksheetCard from '$lib/components/student/worksheets/WorksheetCard.svelte';
	import { FileText, ChevronLeft, ChevronRight, Filter } from 'lucide-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Filter state
	let selectedClass = $state(data.filters.classId);
	let currentPage = $state(data.filters.page);
	let isLoading = $state(false);

	// Derived values
	let hasFilters = $derived(!!selectedClass);
	let worksheets = $derived(data.worksheets);

	// Class items for MySelect
	let classItems = $derived([
		{ value: '', label: 'Toutes les classes' },
		...data.classes.map((c) => ({ value: c.id, label: c.name }))
	]);

	// Functions
	function applyFilters() {
		isLoading = true;

		const params = new URLSearchParams();
		if (selectedClass) params.set('class_id', selectedClass);
		params.set('page', '1'); // Reset to page 1 when filters change

		goto(`/dashboard/student/worksheets?${params.toString()}`).finally(() => {
			isLoading = false;
		});
	}

	function clearFilters() {
		selectedClass = '';
		isLoading = true;

		goto('/dashboard/student/worksheets').finally(() => {
			isLoading = false;
		});
	}

	function goToPage(page: number) {
		if (page < 1 || page > data.pagination.totalPages) return;

		isLoading = true;
		currentPage = page;

		const params = new URLSearchParams();
		if (selectedClass) params.set('class_id', selectedClass);
		params.set('page', page.toString());

		goto(`/dashboard/student/worksheets?${params.toString()}`).finally(() => {
			isLoading = false;
		});
	}
</script>

<svelte:head>
	<title>Mes Feuilles de Travail | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight">Mes Feuilles de Travail</h1>
		<p class="mt-2 text-muted-foreground">
			{data.pagination.total} fiche{data.pagination.total > 1 ? 's' : ''} disponible{data.pagination
				.total > 1
				? 's'
				: ''}
		</p>
	</div>

	<!-- Filters Section (only show if student has multiple classes) -->
	{#if data.classes.length > 1}
		<Card.Root class="mb-6">
			<Card.Header class="pb-3">
				<Card.Title class="flex items-center gap-2 text-lg">
					<Filter class="h-5 w-5" />
					Filtres
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-end">
					<!-- Class Filter -->
					<div class="flex-1">
						<label for="class-select" class="mb-2 block text-sm font-medium">Classe</label>
						<MySelect
							bind:value={selectedClass}
							items={classItems}
							placeholder="Selectionner une classe"
							triggerClass="w-full h-10 rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
						/>
					</div>

					<!-- Action Buttons -->
					<div class="flex gap-2">
						<Button onclick={applyFilters} disabled={isLoading}>
							{isLoading ? 'Chargement...' : 'Appliquer'}
						</Button>
						{#if hasFilters}
							<Button variant="outline" onclick={clearFilters} disabled={isLoading}>Effacer</Button>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Worksheets Grid -->
	{#if isLoading}
		<!-- Loading Skeletons -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each Array(6) as _, i (i)}
				<Card.Root>
					<Card.Header>
						<div class="mb-2 flex gap-2">
							<div class="h-5 w-24 animate-pulse rounded-md bg-muted"></div>
						</div>
						<div class="h-6 w-3/4 animate-pulse rounded bg-muted"></div>
						<div class="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted"></div>
					</Card.Header>
					<Card.Content class="space-y-3">
						<div class="h-4 w-1/3 animate-pulse rounded bg-muted"></div>
						<div class="h-4 w-1/2 animate-pulse rounded bg-muted"></div>
					</Card.Content>
					<Card.Footer>
						<div class="h-10 w-full animate-pulse rounded-md bg-muted"></div>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{:else if worksheets.length === 0}
		<!-- Empty State -->
		<Card.Root class="border-dashed">
			<Card.Content class="flex min-h-96 items-center justify-center p-12">
				<div class="text-center">
					<FileText class="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
					<h2 class="text-xl font-semibold text-muted-foreground">
						{hasFilters ? 'Aucune fiche trouvee avec ces filtres' : 'Aucune fiche disponible'}
					</h2>
					<p class="mt-2 text-sm text-muted-foreground">
						{hasFilters
							? 'Essayez de modifier les filtres pour voir plus de fiches'
							: "Vos professeurs n'ont pas encore partage de fiches de travail"}
					</p>
					{#if hasFilters}
						<Button variant="outline" class="mt-4" onclick={clearFilters}>
							Effacer les filtres
						</Button>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Worksheet Cards -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each worksheets as worksheet (worksheet.assignment_id)}
				<WorksheetCard {worksheet} />
			{/each}
		</div>

		<!-- Pagination -->
		{#if data.pagination.totalPages > 1}
			<div class="mt-8 flex items-center justify-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={currentPage === 1 || isLoading}
					onclick={() => goToPage(currentPage - 1)}
				>
					<ChevronLeft class="h-4 w-4" />
					<span class="sr-only sm:not-sr-only sm:ml-1">Precedent</span>
				</Button>

				<div class="flex items-center gap-2 px-4 text-sm">
					<span class="text-muted-foreground">
						Page {currentPage} sur {data.pagination.totalPages}
					</span>
				</div>

				<Button
					variant="outline"
					size="sm"
					disabled={currentPage === data.pagination.totalPages || isLoading}
					onclick={() => goToPage(currentPage + 1)}
				>
					<span class="sr-only sm:not-sr-only sm:mr-1">Suivant</span>
					<ChevronRight class="h-4 w-4" />
				</Button>
			</div>
		{/if}
	{/if}
</div>
