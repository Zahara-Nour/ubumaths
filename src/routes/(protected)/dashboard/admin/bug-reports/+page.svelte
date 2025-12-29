<script lang="ts">
	/**
	 * Admin Bug Reports Page
	 *
	 * Displays all bug reports with filtering and management actions.
	 */
	import { goto, invalidateAll } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import BugReportList from '$lib/components/bug-reports/BugReportList.svelte';
	import BugReportStatusBadge from '$lib/components/bug-reports/BugReportStatusBadge.svelte';
	import ExportClaudeCodeButton from '$lib/components/bug-reports/ExportClaudeCodeButton.svelte';
	import BugReportsConfigCard from '$lib/components/bug-reports/BugReportsConfigCard.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import type { BugReportWithAuthor, BugReportStatus } from '$lib/types/bug-reports';
	import {
		BUG_REPORT_CATEGORY_LABELS,
		BUG_REPORT_CATEGORY_ICONS,
		BUG_REPORT_STATUS_LABELS,
		BUG_REPORT_SEVERITY_LABELS,
		BUG_REPORT_SEVERITY_COLORS
	} from '$lib/types/bug-reports';
	import { Bug, AlertTriangle, Clock, Calendar, Loader2, ArrowLeft, Trash2 } from 'lucide-svelte';

	let { data } = $props();

	// Dialog states
	let detailDialogOpen = $state(false);
	let selectedReport = $state<BugReportWithAuthor | null>(null);
	let deleteDialogOpen = $state(false);

	// Edit state
	let isUpdating = $state(false);
	let isDeleting = $state(false);
	let newStatus = $state<BugReportStatus | ''>('');
	let resolutionNotes = $state('');

	// Status options for update
	const statusItems = Object.entries(BUG_REPORT_STATUS_LABELS).map(([value, label]) => ({
		value,
		label
	}));

	// Handle filter change
	function handleFilterChange(filters: { status?: string; category?: string; severity?: string }) {
		const params = new URLSearchParams();
		if (filters.status) params.set('status', filters.status);
		if (filters.category) params.set('category', filters.category);
		if (filters.severity) params.set('severity', filters.severity);
		goto(`?${params.toString()}`);
	}

	// Handle report click
	function handleReportClick(report: BugReportWithAuthor) {
		selectedReport = report;
		newStatus = report.status;
		resolutionNotes = report.resolution_notes || '';
		detailDialogOpen = true;
	}

	// Format date
	function formatDate(dateString: string): string {
		return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
	}

	// Update report status
	async function handleUpdateStatus() {
		if (!selectedReport || !newStatus) return;

		isUpdating = true;
		try {
			const response = await fetch(`/api/bug-reports/${selectedReport.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: newStatus,
					resolutionNotes: resolutionNotes.trim() || undefined
				})
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Erreur lors de la mise à jour');
			}

			toaster.success('Rapport mis à jour');
			detailDialogOpen = false;
			await invalidateAll();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Erreur inconnue';
			toaster.error(message);
		} finally {
			isUpdating = false;
		}
	}

	// Delete report
	async function handleDelete() {
		if (!selectedReport) return;

		isDeleting = true;
		try {
			const response = await fetch(`/api/bug-reports/${selectedReport.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Erreur lors de la suppression');
			}

			toaster.success('Rapport supprimé');
			deleteDialogOpen = false;
			detailDialogOpen = false;
			await invalidateAll();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Erreur inconnue';
			toaster.error(message);
		} finally {
			isDeleting = false;
		}
	}

	// Get author display name
	function getAuthorName(report: BugReportWithAuthor): string {
		if (!report.author) return 'Utilisateur inconnu';
		const author = report.author as { full_name: string | null; email: string };
		return author.full_name || author.email;
	}
</script>

<div class="container mx-auto py-8">
	<!-- Back link -->
	<div class="mb-4">
		<Button variant="ghost" size="sm" onclick={() => goto('/dashboard/admin')}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour à l'admin
		</Button>
	</div>

	<!-- Header -->
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold">Rapports de bugs</h1>
		<p class="text-muted-foreground">Gestion des signalements utilisateurs</p>
	</div>

	<!-- Statistics -->
	<div class="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Total</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center gap-2">
					<Bug class="h-5 w-5 text-muted-foreground" />
					<span class="text-2xl font-bold">{data.stats.total}</span>
				</div>
				<p class="text-xs text-muted-foreground">rapports</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">En attente</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center gap-2">
					<Clock class="h-5 w-5 text-yellow-500" />
					<span class="text-2xl font-bold text-yellow-600">{data.stats.pending}</span>
				</div>
				<p class="text-xs text-muted-foreground">à traiter</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Critiques</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center gap-2">
					<AlertTriangle class="h-5 w-5 text-red-500" />
					<span class="text-2xl font-bold text-red-600">{data.stats.critical}</span>
				</div>
				<p class="text-xs text-muted-foreground">urgents</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Aujourd'hui</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center gap-2">
					<Calendar class="h-5 w-5 text-blue-500" />
					<span class="text-2xl font-bold">{data.stats.today}</span>
				</div>
				<p class="text-xs text-muted-foreground">nouveaux</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Configuration -->
	<div class="mb-8">
		<BugReportsConfigCard />
	</div>

	<!-- Reports list -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Rapports ({data.reports.length})</Card.Title>
			<Card.Description>Cliquez sur un rapport pour le gérer</Card.Description>
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

<!-- Detail/Edit dialog -->
<Dialog.Root bind:open={detailDialogOpen}>
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
		{#if selectedReport}
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2">
					<span class="text-xl">{BUG_REPORT_CATEGORY_ICONS[selectedReport.category]}</span>
					{selectedReport.title}
				</Dialog.Title>
				<Dialog.Description>
					Par {getAuthorName(selectedReport)} • {formatDate(selectedReport.created_at)}
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				<!-- Current status and severity -->
				<div class="flex flex-wrap items-center gap-3">
					<BugReportStatusBadge status={selectedReport.status} />
					<span class={BUG_REPORT_SEVERITY_COLORS[selectedReport.severity]}>
						{BUG_REPORT_SEVERITY_LABELS[selectedReport.severity]}
					</span>
					<span class="text-sm text-muted-foreground">
						{BUG_REPORT_CATEGORY_LABELS[selectedReport.category]}
					</span>
					{#if selectedReport.auto_generated}
						<span class="text-xs text-orange-600 dark:text-orange-400"> ⚡ Auto-généré </span>
					{/if}
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
						<a href={selectedReport.screenshot_url} target="_blank" rel="noopener">
							<img
								src={selectedReport.screenshot_url}
								alt="Capture d'écran du bug"
								class="max-h-64 cursor-pointer rounded-lg border hover:opacity-90"
							/>
						</a>
					</div>
				{/if}

				<!-- Technical info -->
				{#if selectedReport.page_url || selectedReport.viewport_size || selectedReport.user_agent}
					<div class="space-y-2">
						<h3 class="font-medium">Informations techniques</h3>
						<div class="space-y-1 rounded-lg bg-muted p-3 font-mono text-xs">
							{#if selectedReport.page_url}
								<p>Page : {selectedReport.page_url}</p>
							{/if}
							{#if selectedReport.viewport_size}
								<p>Viewport : {selectedReport.viewport_size}</p>
							{/if}
							{#if selectedReport.user_agent}
								<p class="truncate" title={selectedReport.user_agent}>
									UA : {selectedReport.user_agent}
								</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Session context preview -->
				{#if selectedReport.session_context}
					{@const ctx = selectedReport.session_context as Record<string, unknown>}
					<div class="space-y-2">
						<h3 class="font-medium">Contexte de session</h3>
						<div class="rounded-lg bg-muted p-3 text-xs">
							{#if ctx.freezeEvents && Array.isArray(ctx.freezeEvents) && ctx.freezeEvents.length > 0}
								<p>🥶 {ctx.freezeEvents.length} freeze(s) détecté(s)</p>
							{/if}
							{#if ctx.recentErrors && Array.isArray(ctx.recentErrors) && ctx.recentErrors.length > 0}
								<p>❌ {ctx.recentErrors.length} erreur(s) récente(s)</p>
							{/if}
							{#if ctx.recentActions && Array.isArray(ctx.recentActions) && ctx.recentActions.length > 0}
								<p>🖱️ {ctx.recentActions.length} action(s) enregistrée(s)</p>
							{/if}
							{#if ctx.webVitals}
								<p>📊 Web Vitals capturés</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Update status section -->
				<div class="space-y-3 rounded-lg border p-4">
					<h3 class="font-medium">Mettre à jour le statut</h3>

					<div class="space-y-2">
						<Label>Statut</Label>
						<MySelect type="single" bind:value={newStatus} items={statusItems} />
					</div>

					<div class="space-y-2">
						<Label for="resolution-notes">Notes de résolution</Label>
						<Textarea
							id="resolution-notes"
							bind:value={resolutionNotes}
							placeholder="Ajoutez une note pour l'utilisateur..."
							rows={3}
						/>
					</div>

					<Button onclick={handleUpdateStatus} disabled={isUpdating || !newStatus}>
						{#if isUpdating}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Mise à jour...
						{:else}
							Mettre à jour
						{/if}
					</Button>
				</div>
			</div>

			<Dialog.Footer class="flex-wrap gap-2">
				<div class="flex flex-1 gap-2">
					<ExportClaudeCodeButton reportId={selectedReport.id} reportTitle={selectedReport.title} />
					<Button variant="destructive" size="sm" onclick={() => (deleteDialogOpen = true)}>
						<Trash2 class="mr-2 h-4 w-4" />
						Supprimer
					</Button>
				</div>
				<Button variant="outline" onclick={() => (detailDialogOpen = false)}>Fermer</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Delete confirmation dialog -->
<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title class="text-destructive">Supprimer ce rapport ?</Dialog.Title>
			<Dialog.Description>
				Cette action est irréversible. Le rapport sera définitivement supprimé.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteDialogOpen = false)} disabled={isDeleting}>
				Annuler
			</Button>
			<Button variant="destructive" onclick={handleDelete} disabled={isDeleting}>
				{#if isDeleting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Suppression...
				{:else}
					Supprimer
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
