<script lang="ts">
	/**
	 * Bug Report List
	 *
	 * Displays a filterable list of bug reports.
	 * Used in both user and admin dashboards.
	 */
	import type {
		BugReportWithAuthor,
		BugReportStatus,
		BugReportCategory,
		BugReportSeverity
	} from '$lib/types/bug-reports';
	import { BUG_REPORT_STATUS_LABELS, BUG_REPORT_CATEGORY_LABELS } from '$lib/types/bug-reports';
	import BugReportCard from './BugReportCard.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Loader2 } from 'lucide-svelte';

	interface Props {
		reports: BugReportWithAuthor[];
		loading?: boolean;
		showFilters?: boolean;
		onReportClick?: (report: BugReportWithAuthor) => void;
		onFilterChange?: (filters: {
			status?: BugReportStatus;
			category?: BugReportCategory;
			severity?: BugReportSeverity;
		}) => void;
	}

	let {
		reports,
		loading = false,
		showFilters = true,
		onReportClick,
		onFilterChange
	}: Props = $props();

	// Filter state
	let statusFilter = $state<BugReportStatus | ''>('');
	let categoryFilter = $state<BugReportCategory | ''>('');

	// Filter options
	const statusOptions = [
		{ value: '', label: 'Tous les statuts' },
		...Object.entries(BUG_REPORT_STATUS_LABELS).map(([value, label]) => ({ value, label }))
	];

	const categoryOptions = [
		{ value: '', label: 'Toutes les catégories' },
		...Object.entries(BUG_REPORT_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))
	];

	// Apply filters
	$effect(() => {
		if (onFilterChange) {
			onFilterChange({
				status: statusFilter || undefined,
				category: categoryFilter || undefined
			});
		}
	});

	// Empty state
	const isEmpty = $derived(reports.length === 0 && !loading);
</script>

<div class="space-y-4">
	<!-- Filters -->
	{#if showFilters}
		<div class="flex flex-wrap gap-3">
			<div class="w-48">
				<MySelect
					type="single"
					bind:value={statusFilter}
					items={statusOptions}
					placeholder="Statut"
				/>
			</div>
			<div class="w-48">
				<MySelect
					type="single"
					bind:value={categoryFilter}
					items={categoryOptions}
					placeholder="Catégorie"
				/>
			</div>
		</div>
	{/if}

	<!-- Loading state -->
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
			<span class="ml-2 text-muted-foreground">Chargement...</span>
		</div>
	{:else if isEmpty}
		<!-- Empty state -->
		<div class="rounded-lg border border-dashed p-8 text-center">
			<p class="text-muted-foreground">Aucun rapport trouvé</p>
			{#if statusFilter || categoryFilter}
				<p class="mt-1 text-sm text-muted-foreground">Essayez de modifier les filtres</p>
			{/if}
		</div>
	{:else}
		<!-- Report list -->
		<div class="space-y-3">
			{#each reports as report (report.id)}
				<BugReportCard {report} onclick={() => onReportClick?.(report)} />
			{/each}
		</div>
	{/if}
</div>
