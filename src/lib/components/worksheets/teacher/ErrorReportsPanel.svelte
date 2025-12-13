<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { AlertCircle, Loader2 } from 'lucide-svelte';
	import ErrorReportCard from './ErrorReportCard.svelte';
	import ReviewReportDialog from './ReviewReportDialog.svelte';
	import type { TeacherErrorReportView, ErrorReportStatus } from '$lib/types/worksheets';

	// Props
	let {
		worksheetId,
		assignmentId
	}: {
		worksheetId: string;
		assignmentId: string;
	} = $props();

	// State
	let loading = $state(true);
	let reports = $state<TeacherErrorReportView[]>([]);
	let counts = $state({ pending: 0, fixed: 0, rejected: 0, total: 0 });
	let currentFilter = $state<ErrorReportStatus | 'all'>('all');
	let currentPage = $state(1);
	let totalPages = $state(1);
	let limit = $state(50);

	// Dialog state
	let selectedReport = $state<TeacherErrorReportView | null>(null);
	let dialogOpen = $state(false);

	// Filter buttons configuration
	let filterButtons = $derived([
		{ label: 'Tous', value: 'all' as const, count: counts.total, variant: 'outline' as const },
		{
			label: 'En attente',
			value: 'pending' as const,
			count: counts.pending,
			variant: 'default' as const
		},
		{
			label: 'Corrigés',
			value: 'fixed' as const,
			count: counts.fixed,
			variant: 'outline' as const
		},
		{
			label: 'Rejetés',
			value: 'rejected' as const,
			count: counts.rejected,
			variant: 'outline' as const
		}
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

			const response = await fetch(
				`/api/worksheets/${worksheetId}/assignments/${assignmentId}/reports?${params.toString()}`
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Erreur serveur' }));
				throw new Error(errorData.message || 'Erreur lors du chargement des signalements');
			}

			const data = await response.json();

			reports = data.reports || [];
			counts = data.counts || { pending: 0, fixed: 0, rejected: 0, total: 0 };
			totalPages = data.pagination?.totalPages || 1;
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
		currentPage = 1; // Reset to first page when changing filter
		loadReports();
	}

	/**
	 * Handle page change
	 */
	function handlePageChange(page: number) {
		currentPage = page;
		loadReports();
	}

	/**
	 * Handle review button click
	 */
	function handleReviewClick(report: TeacherErrorReportView) {
		selectedReport = report;
		dialogOpen = true;
	}

	/**
	 * Handle successful review
	 */
	function handleReviewSuccess() {
		dialogOpen = false;
		selectedReport = null;
		loadReports(); // Reload to update counts and list
	}

	// Load reports on mount
	$effect(() => {
		loadReports();
	});
</script>

<div class="space-y-6">
	<!-- Filter buttons -->
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
					{currentFilter === 'all'
						? 'Aucun signalement pour ce devoir.'
						: `Aucun signalement ${
								currentFilter === 'pending'
									? 'en attente'
									: currentFilter === 'fixed'
										? 'corrigé'
										: 'rejeté'
							}.`}
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Reports list -->
		<div class="grid gap-4">
			{#each reports as report (report.id)}
				<ErrorReportCard {report} onReview={handleReviewClick} />
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
					Précédent
				</Button>

				<div class="flex items-center gap-2">
					{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
						// Show pages around current page
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

<!-- Review dialog -->
{#if selectedReport}
	<ReviewReportDialog
		report={selectedReport}
		{worksheetId}
		{assignmentId}
		open={dialogOpen}
		onClose={() => {
			dialogOpen = false;
			selectedReport = null;
		}}
		onSuccess={handleReviewSuccess}
	/>
{/if}
