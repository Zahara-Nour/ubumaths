<!-- eslint-disable custom/require-zod-validation -->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toaster } from '$lib/stores/toaster.svelte';

	let { data } = $props();

	// Filter state
	let searchInput = $state(data.filters.search || '');
	let typeFilter = $state(data.filters.type || 'all');
	let severityFilter = $state(data.filters.severity || 'all');
	let resolvedFilter = $state(
		data.filters.resolved === null ? 'all' : data.filters.resolved ? 'true' : 'false'
	);

	// Items for MySelect dropdowns
	const typeItems = [
		{ value: 'all', label: 'Tous types' },
		{ value: 'client_js', label: 'Client JS' },
		{ value: 'server_api', label: 'Server API' },
		{ value: 'server_load', label: 'Server Load' },
		{ value: 'server_action', label: 'Server Action' },
		{ value: 'validation', label: 'Validation' },
		{ value: 'performance', label: 'Performance' },
		{ value: 'database', label: 'Database' }
	];

	const severityItems = [
		{ value: 'all', label: 'Toutes sévérités' },
		{ value: 'critical', label: 'Critique' },
		{ value: 'error', label: 'Erreur' },
		{ value: 'warning', label: 'Avertissement' },
		{ value: 'info', label: 'Info' }
	];

	const resolvedItems = [
		{ value: 'all', label: 'Toutes' },
		{ value: 'false', label: 'Non résolues' },
		{ value: 'true', label: 'Résolues' }
	];

	// Bulk resolution state
	let bulkResolveDialogOpen = $state(false);
	let bulkResolveNotes = $state('');
	let submitting = $state(false);

	// Computed: filtered occurrences (for bulk actions)
	const filteredOccurrences = $derived(data.occurrences || []);

	// Computed: check if all filtered errors are already resolved
	const allFilteredResolved = $derived(
		filteredOccurrences.length > 0 && filteredOccurrences.every((o) => o.is_resolved)
	);

	// Computed: total count of individual errors in filtered occurrences
	const totalFilteredErrors = $derived(
		filteredOccurrences.reduce((sum, o) => sum + o.occurrence_count, 0)
	);

	// Computed: active filters for display
	const activeFilters = $derived(() => {
		const filters: string[] = [];
		if (typeFilter !== 'all') {
			const typeLabel = typeItems.find((item) => item.value === typeFilter)?.label || typeFilter;
			filters.push(`Type: ${typeLabel}`);
		}
		if (severityFilter !== 'all') {
			const severityLabel =
				severityItems.find((item) => item.value === severityFilter)?.label || severityFilter;
			filters.push(`Sévérité: ${severityLabel}`);
		}
		if (resolvedFilter !== 'all') {
			const resolvedLabel =
				resolvedItems.find((item) => item.value === resolvedFilter)?.label || resolvedFilter;
			filters.push(`État: ${resolvedLabel}`);
		}
		if (searchInput) {
			filters.push(`Recherche: "${searchInput}"`);
		}
		return filters;
	});

	// Apply filters
	function applyFilters() {
		const params = new URLSearchParams();

		if (typeFilter !== 'all') params.set('type', typeFilter);
		if (severityFilter !== 'all') params.set('severity', severityFilter);
		if (resolvedFilter !== 'all') params.set('resolved', resolvedFilter);
		if (searchInput) params.set('search', searchInput);

		goto(`?${params.toString()}`);
	}

	// Reset filters
	function resetFilters() {
		searchInput = '';
		typeFilter = 'all';
		severityFilter = 'all';
		resolvedFilter = 'all';
		goto('?').then(() => {});
	}

	// Open bulk resolve dialog
	function openBulkResolveDialog() {
		bulkResolveNotes = '';
		bulkResolveDialogOpen = true;
	}

	// Confirm bulk resolve
	async function confirmBulkResolve() {
		submitting = true;
		try {
			// Build request body with current filters
			const requestBody = {
				error_type: typeFilter !== 'all' ? typeFilter : undefined,
				severity: severityFilter !== 'all' ? severityFilter : undefined,
				resolved: resolvedFilter !== 'all' ? resolvedFilter : undefined,
				search: searchInput || undefined,
				notes: bulkResolveNotes || undefined
			};

			const response = await fetch('/api/errors/bulk-resolve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Erreur lors de la résolution groupée');
			}

			const result = await response.json();

			// Show success toast
			toaster.success(
				`${result.resolved_count} ${result.resolved_count > 1 ? 'erreurs résolues' : 'erreur résolue'} avec succès`
			);

			// Close dialog and refresh data
			bulkResolveDialogOpen = false;
			await invalidateAll();
		} catch (err) {
			// Show error toast
			const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(errorMessage);
		} finally {
			submitting = false;
		}
	}

	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('fr-FR', {
			dateStyle: 'short' as const,
			timeStyle: 'short' as const
		}).format(date);
	}

	// Get severity badge variant
	function getSeverityVariant(
		severity: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (severity) {
			case 'critical':
				return 'destructive';
			case 'error':
				return 'destructive';
			case 'warning':
				return 'secondary';
			case 'info':
				return 'outline';
			default:
				return 'default';
		}
	}

	// Get error type display name
	function getErrorTypeName(type: string): string {
		const types: Record<string, string> = {
			client_js: 'Client JS',
			server_api: 'Server API',
			server_load: 'Server Load',
			server_action: 'Server Action',
			validation: 'Validation',
			performance: 'Performance',
			database: 'Database'
		};
		return types[type] || type;
	}
</script>

<div class="container mx-auto py-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold">Monitoring des Erreurs</h1>
		<p class="text-muted-foreground">Surveillance et gestion des erreurs de l'application</p>
	</div>

	<!-- Statistics Cards -->
	{#if data.stats}
		<div class="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm font-medium text-muted-foreground">Total Erreurs</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{data.stats.total_errors}</div>
					<p class="text-xs text-muted-foreground">Dernières 24h</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm font-medium text-muted-foreground">Non Résolues</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold text-orange-500">{data.stats.unresolved_errors}</div>
					<p class="text-xs text-muted-foreground">À traiter</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm font-medium text-muted-foreground">Critiques</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold text-red-500">{data.stats.critical_errors}</div>
					<p class="text-xs text-muted-foreground">Urgentes</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm font-medium text-muted-foreground">Dernière Heure</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{data.stats.errors_last_hour}</div>
					<p class="text-xs text-muted-foreground">Erreurs récentes</p>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

	<!-- Filters -->
	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>Filtres</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 md:grid-cols-4">
				<!-- Type Filter -->
				<div class="space-y-2">
					<Label>Type d'erreur</Label>
					<MySelect
						type="single"
						bind:value={typeFilter}
						items={typeItems}
						placeholder="Tous types"
						triggerClass="h-9 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				</div>

				<!-- Severity Filter -->
				<div class="space-y-2">
					<Label>Sévérité</Label>
					<MySelect
						type="single"
						bind:value={severityFilter}
						items={severityItems}
						placeholder="Toutes sévérités"
						triggerClass="h-9 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				</div>

				<!-- Resolved Filter -->
				<div class="space-y-2">
					<Label>Statut</Label>
					<MySelect
						type="single"
						bind:value={resolvedFilter}
						items={resolvedItems}
						placeholder="Tous statuts"
						triggerClass="h-9 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				</div>

				<!-- Search -->
				<div class="space-y-2">
					<Label for="error-search">Recherche</Label>
					<Input
						id="error-search"
						type="text"
						placeholder="Message d'erreur..."
						bind:value={searchInput}
						onkeydown={(e) => e.key === 'Enter' && applyFilters()}
					/>
				</div>
			</div>

			<div class="mt-4 flex flex-wrap gap-2">
				<Button onclick={applyFilters}>Appliquer</Button>
				<Button variant="outline" onclick={resetFilters}>Réinitialiser</Button>
				<Button
					variant="destructive"
					disabled={filteredOccurrences.length === 0 || allFilteredResolved}
					onclick={openBulkResolveDialog}
				>
					Marquer tous comme résolus
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Bulk Resolve Confirmation Dialog -->
	<Dialog.Root bind:open={bulkResolveDialogOpen}>
		<Dialog.Content class="sm:max-w-[550px]">
			<Dialog.Header>
				<Dialog.Title>Marquer comme résolus ?</Dialog.Title>
				<Dialog.Description>
					Vous allez marquer {filteredOccurrences.length}
					{filteredOccurrences.length > 1 ? "occurrences d'erreur" : "occurrence d'erreur"}
					comme {filteredOccurrences.length > 1 ? 'résolues' : 'résolue'}
					(représentant {totalFilteredErrors}
					{totalFilteredErrors > 1 ? 'erreurs individuelles' : 'erreur individuelle'} au total).
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				<!-- Active Filters Display -->
				{#if activeFilters().length > 0}
					<div class="rounded-lg border border-muted bg-muted/50 p-3">
						<p class="mb-2 text-sm font-medium">Filtres actifs :</p>
						<ul class="space-y-1 text-sm text-muted-foreground">
							{#each activeFilters() as filter, index (index)}
								<li>• {filter}</li>
							{/each}
						</ul>
					</div>
				{/if}

				<!-- Notes Input -->
				<div class="space-y-2">
					<Label for="bulk-resolve-notes">Notes de résolution (optionnel)</Label>
					<Textarea
						id="bulk-resolve-notes"
						bind:value={bulkResolveNotes}
						placeholder="Notes de résolution (optionnel)..."
						maxlength={2000}
						rows={4}
						class="resize-none"
					/>
					<p class="text-xs text-muted-foreground">
						Ces notes seront ajoutées à toutes les erreurs résolues
					</p>
				</div>

				<!-- Warning -->
				<div
					class="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200"
				>
					<span class="text-base">⚠️</span>
					<p>Cette action affectera toutes les erreurs correspondant aux filtres actifs.</p>
				</div>
			</div>

			<Dialog.Footer>
				<Button
					variant="outline"
					onclick={() => (bulkResolveDialogOpen = false)}
					disabled={submitting}
				>
					Annuler
				</Button>
				<Button onclick={confirmBulkResolve} disabled={submitting}>
					{#if submitting}
						Résolution en cours...
					{:else}
						Confirmer
					{/if}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Error Occurrences List -->
	<Card.Root>
		<Card.Header>
			<Card.Title
				>Erreurs ({data.count}
				{#if data.count <= 1}occurrence{:else}occurrences{/if})</Card.Title
			>
			<Card.Description>Erreurs dédupliquées triées par fréquence</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if !data.occurrences || data.occurrences.length === 0}
				<div class="py-8 text-center text-muted-foreground">
					<p>Aucune erreur trouvée</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.occurrences as occurrence (occurrence.id)}
						<div class="rounded-lg border p-4 transition-colors hover:bg-accent/50">
							<div class="mb-2 flex items-start justify-between">
								<div class="flex-1">
									<div class="mb-2 flex items-center gap-2">
										<Badge variant={getSeverityVariant(occurrence.severity)}>
											{occurrence.severity}
										</Badge>
										<Badge variant="outline">{getErrorTypeName(occurrence.error_type)}</Badge>
										{#if occurrence.is_resolved}
											<Badge variant="secondary">✓ Résolu</Badge>
										{/if}
										<span class="text-sm text-muted-foreground">
											×{occurrence.occurrence_count}
										</span>
									</div>
									<h3 class="mb-1 text-sm font-medium">{occurrence.message}</h3>
									<div class="flex items-center gap-4 text-xs text-muted-foreground">
										{#if occurrence.url}
											<span>URL: {occurrence.url}</span>
										{/if}
										{#if occurrence.file_path}
											<span>
												{occurrence.file_path}{#if occurrence.line_number}:{occurrence.line_number}{/if}
											</span>
										{/if}
									</div>
								</div>
								<div class="space-y-1 text-right text-xs text-muted-foreground">
									<div>Première: {formatDate(occurrence.first_seen)}</div>
									<div>Dernière: {formatDate(occurrence.last_seen)}</div>
								</div>
							</div>

							<Separator class="my-2" />

							<div class="flex justify-end">
								<Button
									variant="outline"
									size="sm"
									onclick={() =>
										goto(`/dashboard/admin/errors/${occurrence.last_error_log_id}`).then(() => {})}
								>
									Voir détails
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
