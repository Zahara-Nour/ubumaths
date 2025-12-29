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
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
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
		selectable?: boolean;
		selectedIds?: Set<string>;
		onSelectionChange?: (ids: Set<string>) => void;
	}

	let {
		reports,
		loading = false,
		showFilters = true,
		onReportClick,
		onFilterChange,
		selectable = false,
		selectedIds = new Set<string>(),
		onSelectionChange
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

	// Selection state
	const selectedCount = $derived(selectedIds.size);
	const allSelected = $derived(reports.length > 0 && selectedIds.size === reports.length);
	const someSelected = $derived(selectedIds.size > 0 && selectedIds.size < reports.length);
	const selectAllState = $derived<boolean | 'indeterminate'>(
		allSelected ? true : someSelected ? 'indeterminate' : false
	);

	// Handle select all toggle
	function handleSelectAll(checked: boolean | 'indeterminate') {
		if (checked === true) {
			// Select all reports
			const newSelected = new Set(reports.map((r) => r.id));
			onSelectionChange?.(newSelected);
		} else {
			// Deselect all
			const newSelected = new Set<string>();
			onSelectionChange?.(newSelected);
		}
	}

	// Handle individual report selection
	function handleReportSelection(reportId: string, selected: boolean) {
		const newSelected = new Set(selectedIds);
		if (selected) {
			newSelected.add(reportId);
		} else {
			newSelected.delete(reportId);
		}
		onSelectionChange?.(newSelected);
	}
</script>

<div class="space-y-4">
	<!-- Selection header -->
	{#if selectable && !loading && !isEmpty}
		<div class="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
			<MyCheckbox checked={selectAllState} onCheckedChange={handleSelectAll} />
			<span class="text-sm font-medium">
				{#if selectedCount > 0}
					{selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
				{:else}
					Tout sélectionner
				{/if}
			</span>
		</div>
	{/if}

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
				<BugReportCard
					{report}
					onclick={() => onReportClick?.(report)}
					{selectable}
					selected={selectedIds.has(report.id)}
					onSelectionChange={(selected) => handleReportSelection(report.id, selected)}
				/>
			{/each}
		</div>
	{/if}
</div>
