<script lang="ts">
	/**
	 * User Bug Reports Page
	 *
	 * Displays user's own bug reports with filtering.
	 */
	import { goto, invalidateAll } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import BugReportList from '$lib/components/bug-reports/BugReportList.svelte';
	import BugReportDialog from '$lib/components/bug-reports/BugReportDialog.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import type { BugReportWithAuthor } from '$lib/types/bug-reports';
	import {
		BUG_REPORT_CATEGORY_LABELS,
		BUG_REPORT_CATEGORY_ICONS,
		BUG_REPORT_SEVERITY_LABELS
	} from '$lib/types/bug-reports';
	import BugReportStatusBadge from '$lib/components/bug-reports/BugReportStatusBadge.svelte';
	import { Plus, Bug, Clock, CheckCircle, ArrowLeft } from 'lucide-svelte';

	let { data } = $props();

	// Dialog states
	let createDialogOpen = $state(false);
	let detailDialogOpen = $state(false);
	let selectedReport = $state<BugReportWithAuthor | null>(null);

	// Handle filter change
	function handleFilterChange(filters: { status?: string; category?: string }) {
		const params = new URLSearchParams();
		if (filters.status) params.set('status', filters.status);
		if (filters.category) params.set('category', filters.category);
		goto(`?${params.toString()}`);
	}

	// Handle report click
	function handleReportClick(report: BugReportWithAuthor) {
		selectedReport = report;
		detailDialogOpen = true;
	}

	// Handle dialog close for create
	function handleCreateDialogChange(open: boolean) {
		createDialogOpen = open;
		if (!open) {
			// Refresh data after closing
			invalidateAll();
		}
	}

	// Format date
	function formatDate(dateString: string): string {
		return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
	}
</script>

<div class="container mx-auto max-w-4xl py-6">
	<!-- Back link -->
	<div class="mb-4">
		<Button variant="ghost" size="sm" onclick={() => goto('/dashboard')}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour au tableau de bord
		</Button>
	</div>

	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Mes signalements</h1>
			<p class="mt-1 text-muted-foreground">Suivez l'état de vos rapports de bugs</p>
		</div>
		<Button onclick={() => (createDialogOpen = true)}>
			<Plus class="mr-2 h-4 w-4" />
			Nouveau rapport
		</Button>
	</div>

	<!-- Statistics -->
	<div class="mb-6 grid gap-4 sm:grid-cols-3">
		<Card.Root>
			<Card.Content class="flex items-center gap-3 pt-6">
				<div class="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900">
					<Clock class="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
				</div>
				<div>
					<p class="text-2xl font-bold">{data.statusCounts.pending}</p>
					<p class="text-sm text-muted-foreground">En attente</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center gap-3 pt-6">
				<div class="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
					<Bug class="h-5 w-5 text-blue-600 dark:text-blue-400" />
				</div>
				<div>
					<p class="text-2xl font-bold">{data.statusCounts.in_progress}</p>
					<p class="text-sm text-muted-foreground">En cours</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center gap-3 pt-6">
				<div class="rounded-full bg-green-100 p-2 dark:bg-green-900">
					<CheckCircle class="h-5 w-5 text-green-600 dark:text-green-400" />
				</div>
				<div>
					<p class="text-2xl font-bold">{data.statusCounts.resolved}</p>
					<p class="text-sm text-muted-foreground">Résolus</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Reports list -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Rapports ({data.reports.length})</Card.Title>
		</Card.Header>
		<Card.Content>
			<BugReportList
				reports={data.reports}
				onReportClick={handleReportClick}
				onFilterChange={handleFilterChange}
			/>
		</Card.Content>
	</Card.Root>
</div>

<!-- Create dialog -->
<BugReportDialog open={createDialogOpen} onOpenChange={handleCreateDialogChange} />

<!-- Detail dialog -->
<Dialog.Root bind:open={detailDialogOpen}>
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
		{#if selectedReport}
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2">
					<span class="text-xl">{BUG_REPORT_CATEGORY_ICONS[selectedReport.category]}</span>
					{selectedReport.title}
				</Dialog.Title>
				<Dialog.Description>
					{BUG_REPORT_CATEGORY_LABELS[selectedReport.category]} •
					{formatDate(selectedReport.created_at)}
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				<!-- Status and severity -->
				<div class="flex items-center gap-3">
					<BugReportStatusBadge status={selectedReport.status} />
					<span class="text-sm text-muted-foreground">
						Priorité : {BUG_REPORT_SEVERITY_LABELS[selectedReport.severity]}
					</span>
				</div>

				<!-- Description -->
				<div class="space-y-2">
					<h3 class="font-medium">Description</h3>
					<p class="text-sm whitespace-pre-wrap text-muted-foreground">
						{selectedReport.description}
					</p>
				</div>

				<!-- Screenshot -->
				{#if selectedReport.screenshot_url}
					<div class="space-y-2">
						<h3 class="font-medium">Capture d'écran</h3>
						<img
							src={selectedReport.screenshot_url}
							alt="Capture d'écran du bug"
							class="max-h-64 rounded-lg border"
						/>
					</div>
				{/if}

				<!-- Technical info -->
				{#if selectedReport.page_url || selectedReport.viewport_size}
					<div class="space-y-2">
						<h3 class="font-medium">Informations techniques</h3>
						<div class="rounded-lg bg-muted p-3 font-mono text-xs">
							{#if selectedReport.page_url}
								<p>Page : {selectedReport.page_url}</p>
							{/if}
							{#if selectedReport.viewport_size}
								<p>Écran : {selectedReport.viewport_size}</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Resolution notes -->
				{#if selectedReport.resolution_notes}
					<div class="space-y-2">
						<h3 class="font-medium">Réponse de l'équipe</h3>
						<div class="rounded-lg border-l-4 border-green-500 bg-green-50 p-3 dark:bg-green-950">
							<p class="text-sm">
								{selectedReport.resolution_notes}
							</p>
							{#if selectedReport.resolved_at}
								<p class="mt-2 text-xs text-muted-foreground">
									Résolu {formatDate(selectedReport.resolved_at)}
								</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Auto-generated indicator -->
				{#if selectedReport.auto_generated}
					<div
						class="rounded-lg bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-950 dark:text-orange-200"
					>
						Ce rapport a été généré automatiquement suite à la détection d'un freeze de
						l'application.
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (detailDialogOpen = false)}>Fermer</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
