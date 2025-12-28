<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import MySelect from '$lib/components/MySelect.svelte';
	import { AlertCircle, Loader2 } from 'lucide-svelte';
	import ErrorReportCard from './ErrorReportCard.svelte';
	import type { TeacherErrorReportView, ErrorReportStatus } from '$lib/types/worksheets';

	// Extended report type for worksheet-wide view
	interface WorksheetReportView extends TeacherErrorReportView {
		assignment_title?: string | null;
		assignment_class_names?: string[];
	}

	interface AssignmentInfo {
		id: string;
		title: string | null;
		class_names: string[];
	}

	// Props - assignmentId is now optional for worksheet-wide mode
	interface Props {
		worksheetId: string;
		assignmentId?: string;
	}

	let { worksheetId, assignmentId }: Props = $props();

	// Derived: are we in worksheet-wide mode?
	let isWorksheetWide = $derived(!assignmentId);

	// State
	let loading = $state(true);
	let reports = $state<WorksheetReportView[]>([]);
	let counts = $state({ pending: 0, fixed: 0, rejected: 0, total: 0 });
	let currentFilter = $state<ErrorReportStatus | 'all'>('all');
	let currentPage = $state(1);
	let totalPages = $state(1);
	let limit = $state(50);

	// Assignment filter state (for worksheet-wide mode)
	let assignments = $state<AssignmentInfo[]>([]);
	let selectedAssignmentId = $state<string>('');

	// Assignment filter items for MySelect
	let assignmentItems = $derived([
		{ value: '', label: 'Toutes les assignations' },
		...assignments.map((a) => ({
			value: a.id,
			label: a.title || a.class_names.join(', ') || 'Sans titre'
		}))
	]);

	// Filter buttons configuration
	let filterButtons = $derived([
		{ label: 'Tous', value: 'all' as const, count: counts.total },
		{ label: 'En attente', value: 'pending' as const, count: counts.pending },
		{ label: 'Corriges', value: 'fixed' as const, count: counts.fixed },
		{ label: 'Rejetes', value: 'rejected' as const, count: counts.rejected }
	]);

	/**
	 * Load error reports with current filters
	 */
	async function loadReports() {
		loading = true;

		try {
			// Build query params
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: limit.toString()
			});

			// Add status filter if not 'all'
			if (currentFilter !== 'all') {
				params.set('status', currentFilter);
			}

			// Determine API endpoint
			let url: string;
			if (isWorksheetWide) {
				// Worksheet-wide mode
				url = `/api/worksheets/${worksheetId}/reports`;
				if (selectedAssignmentId) {
					params.set('assignmentId', selectedAssignmentId);
				}
			} else {
				// Single assignment mode
				url = `/api/worksheets/${worksheetId}/assignments/${assignmentId}/reports`;
			}

			const response = await fetch(`${url}?${params.toString()}`);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Erreur serveur' }));
				throw new Error(errorData.message || 'Erreur lors du chargement des signalements');
			}

			const data = await response.json();

			reports = data.reports || [];
			counts = data.counts || { pending: 0, fixed: 0, rejected: 0, total: 0 };
			totalPages = data.pagination?.totalPages || 1;

			// In worksheet-wide mode, also get assignments list
			if (isWorksheetWide && data.assignments) {
				assignments = data.assignments;
			}
		} catch (err) {
			console.error('Error loading reports:', err);
			reports = [];
			counts = { pending: 0, fixed: 0, rejected: 0, total: 0 };
		} finally {
			loading = false;
		}
	}

	/**
	 * Handle filter change
	 */
	function handleFilterChange(filter: ErrorReportStatus | 'all') {
		currentFilter = filter;
		currentPage = 1;
		loadReports();
	}

	/**
	 * Handle assignment filter change
	 */
	function handleAssignmentFilterChange() {
		currentPage = 1;
		loadReports();
	}

	/**
	 * Handle page change
	 */
	function handlePageChange(page: number) {
		currentPage = page;
		loadReports();
	}

	// Load reports on mount and when props change
	$effect(() => {
		// Reset state when switching modes
		currentPage = 1;
		currentFilter = 'all';
		selectedAssignmentId = '';
		loadReports();
	});

	// Reload when assignment filter changes (for worksheet-wide mode)
	$effect(() => {
		if (isWorksheetWide) {
			// This effect tracks selectedAssignmentId changes
			const _ = selectedAssignmentId;
		}
	});
</script>

<div class="space-y-6">
	<!-- Filters row -->
	<div class="flex flex-wrap items-center gap-4">
		<!-- Assignment filter (only in worksheet-wide mode) -->
		{#if isWorksheetWide && assignments.length > 1}
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">Assignation:</span>
				<MySelect
					type="single"
					bind:value={selectedAssignmentId}
					items={assignmentItems}
					class="w-48"
					onchange={handleAssignmentFilterChange}
				/>
			</div>
		{/if}

		<!-- Status filter buttons -->
		<div class="flex flex-wrap gap-2">
			{#each filterButtons as filterBtn (filterBtn.value)}
				<Button
					variant={currentFilter === filterBtn.value ? 'default' : 'outline'}
					size="sm"
					onclick={() => handleFilterChange(filterBtn.value)}
				>
					{filterBtn.label}
					<Badge variant={currentFilter === filterBtn.value ? 'secondary' : 'outline'} class="ml-2">
						{filterBtn.count}
					</Badge>
				</Button>
			{/each}
		</div>
	</div>

	<!-- Loading state -->
	{#if loading}
		<Card.Root>
			<Card.Content class="py-8 text-center">
				<Loader2 class="mx-auto h-6 w-6 animate-spin" />
				<p class="mt-2 text-sm text-muted-foreground">Chargement des signalements...</p>
			</Card.Content>
		</Card.Root>
	{:else if reports.length === 0}
		<!-- Empty state -->
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<AlertCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
				<p class="text-muted-foreground">
					{#if currentFilter === 'all'}
						{#if isWorksheetWide}
							Aucun signalement pour cette feuille.
						{:else}
							Aucun signalement pour ce devoir.
						{/if}
					{:else}
						Aucun signalement {currentFilter === 'pending'
							? 'en attente'
							: currentFilter === 'fixed'
								? 'corrige'
								: 'rejete'}.
					{/if}
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Reports list -->
		<div class="grid gap-4">
			{#each reports as report (report.id)}
				<!-- Show assignment info in worksheet-wide mode -->
				{#if isWorksheetWide && report.assignment_class_names}
					<div class="space-y-1">
						{#if report.assignment_title || report.assignment_class_names.length > 0}
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								<span class="font-medium">
									{report.assignment_title || report.assignment_class_names.join(', ')}
								</span>
							</div>
						{/if}
						<ErrorReportCard {report} {worksheetId} />
					</div>
				{:else}
					<ErrorReportCard {report} {worksheetId} />
				{/if}
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex justify-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={currentPage === 1}
					onclick={() => handlePageChange(currentPage - 1)}
				>
					Precedent
				</Button>

				<div class="flex items-center gap-2">
					{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
						let pageNum;
						if (totalPages <= 5) {
							pageNum = i + 1;
						} else if (currentPage <= 3) {
							pageNum = i + 1;
						} else if (currentPage >= totalPages - 2) {
							pageNum = totalPages - 4 + i;
						} else {
							pageNum = currentPage - 2 + i;
						}
						return pageNum;
					}) as pageNum (pageNum)}
						<Button
							variant={currentPage === pageNum ? 'default' : 'outline'}
							size="sm"
							onclick={() => handlePageChange(pageNum)}
						>
							{pageNum}
						</Button>
					{/each}
				</div>

				<Button
					variant="outline"
					size="sm"
					disabled={currentPage === totalPages}
					onclick={() => handlePageChange(currentPage + 1)}
				>
					Suivant
				</Button>
			</div>
		{/if}
	{/if}
</div>
