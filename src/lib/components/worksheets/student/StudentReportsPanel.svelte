<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { AlertCircle, Loader2 } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import StudentReportCard from './StudentReportCard.svelte';
	import CancelReportDialog from './CancelReportDialog.svelte';
	import type { StudentErrorReportWithDisplay, ErrorReportStatus } from '$lib/types/worksheets';

	// Props
	let {
		assignmentId
	}: {
		assignmentId?: string;
	} = $props();

	// State
	let loading = $state(true);
	let reports = $state<StudentErrorReportWithDisplay[]>([]);
	let statusFilter = $state<ErrorReportStatus | 'all'>('all');
	let page = $state(1);
	let totalPages = $state(1);
	let limit = $state(10);

	// Cancel dialog state
	let cancelDialog = $state<{
		open: boolean;
		report: StudentErrorReportWithDisplay | null;
		loading: boolean;
	}>({
		open: false,
		report: null,
		loading: false
	});

	// Derived values
	let filteredEmptyMessage = $derived(
		statusFilter === 'all'
			? 'Aucun signalement.'
			: `Aucun signalement ${
					statusFilter === 'pending'
						? 'en attente'
						: statusFilter === 'fixed'
							? 'corrigé'
							: 'rejeté'
				}.`
	);

	/**
	 * Load reports with current filters
	 */
	async function loadReports() {
		loading = true;

		try {
			// Build query params
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString()
			});

			// Add status filter if not 'all'
			if (statusFilter !== 'all') {
				params.set('status', statusFilter);
			}

			// Add assignment filter if provided
			if (assignmentId) {
				params.set('assignmentId', assignmentId);
			}

			const response = await fetch(`/api/student/reports?${params.toString()}`);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Erreur serveur' }));
				throw new Error(errorData.message || 'Erreur lors du chargement des signalements');
			}

			const data = await response.json();

			reports = data.reports || [];
			totalPages = data.pagination?.totalPages || 1;
		} catch (err) {
			console.error('Error loading reports:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors du chargement');
			reports = [];
		} finally {
			loading = false;
		}
	}

	/**
	 * Handle status filter change
	 */
	function handleStatusChange(value: string) {
		statusFilter = value as ErrorReportStatus | 'all';
		page = 1; // Reset to first page when changing filter
		loadReports();
	}

	/**
	 * Handle page change
	 */
	function handlePageChange(newPage: number) {
		page = newPage;
		loadReports();
	}

	/**
	 * Open cancel dialog
	 */
	function openCancelDialog(report: StudentErrorReportWithDisplay) {
		cancelDialog = {
			open: true,
			report,
			loading: false
		};
	}

	/**
	 * Close cancel dialog
	 */
	function closeCancelDialog() {
		if (!cancelDialog.loading) {
			cancelDialog = {
				open: false,
				report: null,
				loading: false
			};
		}
	}

	/**
	 * Confirm cancel report
	 */
	async function confirmCancel() {
		if (!cancelDialog.report) return;

		cancelDialog.loading = true;

		try {
			const response = await fetch(`/api/student/reports/${cancelDialog.report.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Erreur serveur' }));
				throw new Error(errorData.message || "Erreur lors de l'annulation");
			}

			toaster.success('Signalement annulé');

			// Close dialog and refresh list
			cancelDialog = {
				open: false,
				report: null,
				loading: false
			};

			loadReports();
		} catch (err) {
			console.error('Error canceling report:', err);
			toaster.error(err instanceof Error ? err.message : "Erreur lors de l'annulation");
			cancelDialog.loading = false;
		}
	}

	// Load reports on mount
	onMount(() => {
		loadReports();
	});
</script>

<div class="space-y-6">
	<!-- Status filter tabs -->
	<Tabs.Root value={statusFilter} onValueChange={handleStatusChange}>
		<Tabs.List>
			<Tabs.Trigger value="all">Tous</Tabs.Trigger>
			<Tabs.Trigger value="pending">En attente</Tabs.Trigger>
			<Tabs.Trigger value="fixed">Corrigés</Tabs.Trigger>
			<Tabs.Trigger value="rejected">Rejetés</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>

	<!-- Loading state -->
	{#if loading}
		<Card.Root>
			<Card.Content class="py-8 text-center" role="status" aria-live="polite">
				<Loader2 class="mx-auto h-6 w-6 animate-spin" />
				<p class="mt-2 text-sm text-muted-foreground">Chargement des signalements...</p>
			</Card.Content>
		</Card.Root>
	{:else if reports.length === 0}
		<!-- Empty state -->
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<AlertCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
				<p class="text-muted-foreground">{filteredEmptyMessage}</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Reports list -->
		<div class="grid gap-4">
			{#each reports as report (report.id)}
				<StudentReportCard {report} onCancel={openCancelDialog} />
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-4">
				<Button
					variant="outline"
					size="sm"
					disabled={page === 1}
					onclick={() => handlePageChange(page - 1)}
				>
					Précédent
				</Button>

				<span class="text-sm text-muted-foreground">
					Page {page} sur {totalPages}
				</span>

				<Button
					variant="outline"
					size="sm"
					disabled={page === totalPages}
					onclick={() => handlePageChange(page + 1)}
				>
					Suivant
				</Button>
			</div>
		{/if}
	{/if}
</div>

<!-- Cancel confirmation dialog -->
<CancelReportDialog
	report={cancelDialog.report}
	open={cancelDialog.open}
	onOpenChange={(open) => {
		if (!open) closeCancelDialog();
	}}
	onConfirm={confirmCancel}
	loading={cancelDialog.loading}
/>
