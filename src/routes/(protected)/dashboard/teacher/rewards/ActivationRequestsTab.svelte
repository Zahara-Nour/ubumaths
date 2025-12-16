<!--
	Activation Requests Tab Component
	==================================

	Displays and manages VIP card activation requests from students.

	Features:
	- Search by student name
	- Filter by card type
	- Sort by date (oldest/newest)
	- Bulk selection and actions (approve/reject multiple)
	- Individual approve/reject actions
	- Optimistic updates
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { invalidateAll } from '$app/navigation';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog/ConfirmDialog.svelte';
	import {
		Search,
		CheckCircle,
		XCircle,
		AlertCircle,
		Sparkles,
		Loader2,
		Check,
		X
	} from 'lucide-svelte';
	import {
		vipCardTemplates,
		getTemplateById,
		getEnabledTemplates
	} from '$lib/stores/vipCardTemplates.svelte';
	import { getActionDescription } from '$lib/utils/vip-cards';

	// Exported type for use by parent component
	export interface ActivationRequest {
		instanceId: string;
		studentId: string;
		studentName: string;
		cardId: string;
		cardName: string;
		actionDescription: string;
		requestedAt: string;
	}

	interface Props {
		activationRequests: ActivationRequest[];
		onRequestsChange: (requests: ActivationRequest[]) => void;
	}

	let { activationRequests, onRequestsChange }: Props = $props();

	// Search and filter state
	let requestSearchQuery = $state('');
	let requestCardFilter = $state<string>('all');
	let requestSortOrder = $state<'oldest' | 'newest'>('oldest');

	// Bulk selection state
	let selectedRequests = $state<Set<string>>(new Set());

	// Bulk action state
	let isBulkProcessing = $state(false);
	let bulkProgress = $state({ current: 0, total: 0 });

	// Confirmation modals
	let showBulkApproveDialog = $state(false);
	let showBulkRejectDialog = $state(false);

	// Processing state for use-card requests
	let processingRequests = $state<Record<string, boolean>>({});

	// Card filter items for requests tab
	const requestCardFilterItems = $derived([
		{ value: 'all', label: 'Toutes les cartes' },
		...getEnabledTemplates($vipCardTemplates).map((template) => ({
			value: template.id,
			label: template.name
		}))
	]);

	// Filtered and sorted activation requests
	let filteredActivationRequests = $derived.by(() => {
		let results = [...activationRequests];

		// Apply search filter
		if (requestSearchQuery.trim()) {
			const query = requestSearchQuery.toLowerCase();
			results = results.filter((r) => r.studentName.toLowerCase().includes(query));
		}

		// Apply card filter
		if (requestCardFilter !== 'all') {
			results = results.filter((r) => r.cardId === requestCardFilter);
		}

		// Apply sort
		results.sort((a, b) => {
			const aTime = new Date(a.requestedAt).getTime();
			const bTime = new Date(b.requestedAt).getTime();
			return requestSortOrder === 'oldest' ? aTime - bTime : bTime - aTime;
		});

		return results;
	});

	// Check if all visible requests are selected
	let allVisibleSelected = $derived(
		filteredActivationRequests.length > 0 &&
			filteredActivationRequests.every((r) => selectedRequests.has(r.instanceId))
	);

	// Get list of selected requests with details
	let selectedRequestDetails = $derived(
		filteredActivationRequests.filter((r) => selectedRequests.has(r.instanceId))
	);

	/**
	 * Toggle select all visible requests
	 */
	function toggleSelectAll() {
		if (allVisibleSelected) {
			filteredActivationRequests.forEach((r) => selectedRequests.delete(r.instanceId));
		} else {
			filteredActivationRequests.forEach((r) => selectedRequests.add(r.instanceId));
		}
		selectedRequests = new Set(selectedRequests);
	}

	/**
	 * Toggle individual request selection
	 */
	function toggleRequestSelection(instanceId: string) {
		if (selectedRequests.has(instanceId)) {
			selectedRequests.delete(instanceId);
		} else {
			selectedRequests.add(instanceId);
		}
		selectedRequests = new Set(selectedRequests);
	}

	/**
	 * Clear all selections
	 */
	function clearSelections() {
		selectedRequests.clear();
		selectedRequests = new Set(selectedRequests);
	}

	/**
	 * Get relative time string in French
	 */
	function getRelativeTime(isoDate: string): string {
		const date = new Date(isoDate);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return "A l'instant";
		if (diffMins < 60) return `Il y a ${diffMins} min`;

		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `Il y a ${diffHours}h`;

		const diffDays = Math.floor(diffHours / 24);
		if (diffDays < 7) return `Il y a ${diffDays}j`;

		return date.toLocaleDateString('fr-FR');
	}

	/**
	 * Handle bulk approve action
	 */
	async function handleBulkApprove() {
		if (selectedRequestDetails.length === 0) return;

		isBulkProcessing = true;
		bulkProgress = { current: 0, total: selectedRequestDetails.length };

		const requestsToProcess = [...selectedRequestDetails];
		const results = { success: 0, failed: 0 };

		for (const request of requestsToProcess) {
			try {
				const response = await fetch('/api/vip-cards/use-card', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						instanceId: request.instanceId,
						studentId: request.studentId
					})
				});

				if (response.ok) {
					results.success++;
				} else {
					results.failed++;
					console.error(`Failed to approve request ${request.instanceId}`);
				}
			} catch (error) {
				results.failed++;
				console.error(`Error approving request ${request.instanceId}:`, error);
			}

			bulkProgress.current++;
		}

		// Show results
		if (results.success > 0) {
			toaster.success(
				`${results.success} demande${results.success > 1 ? 's' : ''} approuvee${results.success > 1 ? 's' : ''}`
			);
		}
		if (results.failed > 0) {
			toaster.error(
				`${results.failed} demande${results.failed > 1 ? 's' : ''} echouee${results.failed > 1 ? 's' : ''}`
			);
		}

		clearSelections();

		// Optimistic update
		const processedInstanceIds = new Set(requestsToProcess.map((r) => r.instanceId));
		onRequestsChange(activationRequests.filter((req) => !processedInstanceIds.has(req.instanceId)));

		await invalidateAll();

		isBulkProcessing = false;
		showBulkApproveDialog = false;
	}

	/**
	 * Handle bulk reject action
	 */
	async function handleBulkReject() {
		if (selectedRequestDetails.length === 0) return;

		isBulkProcessing = true;
		bulkProgress = { current: 0, total: selectedRequestDetails.length };

		const requestsToProcess = [...selectedRequestDetails];
		const results = { success: 0, failed: 0 };

		for (const request of requestsToProcess) {
			try {
				const response = await fetch('/api/vip-cards/reject-activation', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						instanceId: request.instanceId,
						studentId: request.studentId
					})
				});

				if (response.ok) {
					results.success++;
				} else {
					results.failed++;
					console.error(`Failed to reject request ${request.instanceId}`);
				}
			} catch (error) {
				results.failed++;
				console.error(`Error rejecting request ${request.instanceId}:`, error);
			}

			bulkProgress.current++;
		}

		// Show results
		if (results.success > 0) {
			toaster.success(
				`${results.success} demande${results.success > 1 ? 's' : ''} rejetee${results.success > 1 ? 's' : ''}`
			);
		}
		if (results.failed > 0) {
			toaster.error(
				`${results.failed} demande${results.failed > 1 ? 's' : ''} echouee${results.failed > 1 ? 's' : ''}`
			);
		}

		clearSelections();

		// Optimistic update
		const processedInstanceIds = new Set(requestsToProcess.map((r) => r.instanceId));
		onRequestsChange(activationRequests.filter((req) => !processedInstanceIds.has(req.instanceId)));

		await invalidateAll();

		isBulkProcessing = false;
		showBulkRejectDialog = false;
	}

	/**
	 * Handle use card from demandes tab
	 */
	async function handleUseCard(instanceId: string, studentId: string, studentName: string) {
		processingRequests[instanceId] = true;

		try {
			const response = await fetch('/api/vip-cards/use-card', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ instanceId, studentId })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || "Erreur lors de l'utilisation");
			}

			// Success toast with action details
			let message = `Carte ${result.cardName} approuvee pour ${studentName} ! L'eleve peut maintenant l'activer.`;
			if (result.actionResult) {
				const ar = result.actionResult;
				if (ar.cardsDrawn) {
					const cardNames = ar.cardsDrawn.map((c: { name: string }) => c.name).join(', ');
					message += `\n-> Cartes tirees : ${cardNames}`;
				} else if (ar.warningsRemoved !== undefined) {
					message += `\n-> ${ar.warningsRemoved} avertissement(s) enleve(s)`;
				} else if (ar.cardsReceived) {
					message += `\n-> Cartes recues : ${ar.cardsReceived.join(', ')}`;
				} else if (ar.newBalance !== undefined) {
					message += `\n-> Nouveau solde : ${ar.newBalance} gidouilles`;
				}
			}

			toaster.success(message);

			// Optimistic update
			onRequestsChange(activationRequests.filter((req) => req.instanceId !== instanceId));

			await invalidateAll();
		} catch (_error) {
			console.error('[rewards] Use card error:', _error);
			toaster.error(_error instanceof Error ? _error.message : 'Erreur');
		} finally {
			processingRequests[instanceId] = false;
		}
	}

	/**
	 * Handle reject activation request
	 */
	async function handleReject(instanceId: string, studentId: string, studentName: string) {
		processingRequests[instanceId] = true;

		try {
			const response = await fetch('/api/vip-cards/reject-activation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ instanceId, studentId })
			});

			if (!response.ok) throw new Error('Erreur lors du rejet');

			toaster.success(`Demande rejetee pour ${studentName}`);

			// Optimistic update
			onRequestsChange(activationRequests.filter((req) => req.instanceId !== instanceId));

			await invalidateAll();
		} catch (_error) {
			toaster.error('Erreur lors du rejet');
		} finally {
			processingRequests[instanceId] = false;
		}
	}
</script>

<div class="space-y-6">
	{#if activationRequests.length === 0}
		<!-- Empty state -->
		<Card.Root>
			<Card.Content class="pt-6 text-center">
				<Sparkles class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
				<p class="text-lg text-muted-foreground">Aucune demande d'activation en attente</p>
				<p class="mt-2 text-sm text-muted-foreground">
					Les demandes de vos eleves apparaitront ici
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Search and Filters -->
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
					<!-- Search -->
					<div class="relative flex-1">
						<Search
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							type="text"
							placeholder="Rechercher un eleve..."
							bind:value={requestSearchQuery}
							class="pl-10"
						/>
					</div>

					<!-- Card Filter -->
					<div class="w-full sm:w-64">
						<MySelect
							type="single"
							bind:value={requestCardFilter}
							items={requestCardFilterItems}
							placeholder="Filtrer par carte"
						/>
					</div>

					<!-- Sort Order -->
					<div class="w-full sm:w-48">
						<MySelect
							type="single"
							bind:value={requestSortOrder}
							items={[
								{ value: 'oldest', label: 'Plus anciennes' },
								{ value: 'newest', label: 'Plus recentes' }
							]}
							placeholder="Trier par"
						/>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Requests Table -->
		{#if filteredActivationRequests.length === 0}
			<Card.Root>
				<Card.Content class="pt-6 text-center">
					<AlertCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
					<p class="text-lg text-muted-foreground">Aucune demande ne correspond aux filtres</p>
					<p class="mt-2 text-sm text-muted-foreground">
						Essayez de modifier vos criteres de recherche
					</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center justify-between">
						<span>Demandes en attente</span>
						<Badge variant="secondary">
							{filteredActivationRequests.length}
							{#if filteredActivationRequests.length !== activationRequests.length}
								/ {activationRequests.length}
							{/if}
						</Badge>
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<!-- Responsive Table -->
					<div class="overflow-x-auto">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<!-- Select All Checkbox -->
									<Table.Head class="w-12">
										<MyCheckbox checked={allVisibleSelected} onCheckedChange={toggleSelectAll} />
									</Table.Head>
									<Table.Head>Eleve</Table.Head>
									<Table.Head>Carte</Table.Head>
									<Table.Head class="hidden md:table-cell">Action</Table.Head>
									<Table.Head class="hidden sm:table-cell">Demande</Table.Head>
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each filteredActivationRequests as request (request.instanceId)}
									{@const template = getTemplateById(request.cardId, $vipCardTemplates)}
									<Table.Row class="group hover:bg-muted/50">
										<!-- Checkbox -->
										<Table.Cell>
											<MyCheckbox
												checked={selectedRequests.has(request.instanceId)}
												onCheckedChange={() => toggleRequestSelection(request.instanceId)}
												disabled={processingRequests[request.instanceId]}
											/>
										</Table.Cell>

										<!-- Student Name -->
										<Table.Cell class="font-medium">
											{request.studentName}
										</Table.Cell>

										<!-- Card -->
										<Table.Cell>
											<div class="flex items-center gap-2">
												{#if template}
													<img
														src={template.image_path}
														alt={template.name}
														class="h-8 w-8 rounded object-cover"
													/>
												{/if}
												<Badge variant="outline" class="font-semibold">
													{request.cardName}
												</Badge>
											</div>
										</Table.Cell>

										<!-- Action Description (hidden on mobile) -->
										<Table.Cell class="hidden text-sm text-muted-foreground md:table-cell">
											{#if template && template.action}
												{getActionDescription(template.action, $vipCardTemplates)}
											{:else}
												{request.actionDescription}
											{/if}
										</Table.Cell>

										<!-- Requested Time (hidden on small screens) -->
										<Table.Cell class="hidden text-sm sm:table-cell">
											{getRelativeTime(request.requestedAt)}
										</Table.Cell>

										<!-- Actions -->
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-2">
												<Button
													onclick={() =>
														handleUseCard(
															request.instanceId,
															request.studentId,
															request.studentName
														)}
													disabled={processingRequests[request.instanceId]}
													size="sm"
													class="bg-green-600 hover:bg-green-700"
												>
													{#if processingRequests[request.instanceId]}
														<Loader2 class="h-4 w-4 animate-spin" />
													{:else}
														<Check class="mr-1 h-4 w-4" />
														<span class="hidden sm:inline">Utiliser</span>
													{/if}
												</Button>
												<Button
													onclick={() =>
														handleReject(
															request.instanceId,
															request.studentId,
															request.studentName
														)}
													disabled={processingRequests[request.instanceId]}
													size="sm"
													variant="destructive"
												>
													{#if processingRequests[request.instanceId]}
														<Loader2 class="h-4 w-4 animate-spin" />
													{:else}
														<X class="mr-1 h-4 w-4" />
														<span class="hidden sm:inline">Rejeter</span>
													{/if}
												</Button>
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>

					<!-- Bulk Actions -->
					{#if selectedRequests.size > 0}
						<div
							class="mt-4 flex flex-col items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row"
						>
							<div class="flex items-center gap-2 text-sm font-medium">
								<span>
									{selectedRequests.size} demande{selectedRequests.size > 1 ? 's' : ''}
									selectionnee{selectedRequests.size > 1 ? 's' : ''}
								</span>
								<Button variant="ghost" size="sm" onclick={clearSelections}>
									Deselectionner tout
								</Button>
							</div>

							<div class="flex gap-2">
								<Button
									onclick={() => (showBulkApproveDialog = true)}
									disabled={isBulkProcessing}
									size="sm"
									class="bg-green-600 hover:bg-green-700"
								>
									{#if isBulkProcessing && !showBulkRejectDialog}
										<Loader2 class="mr-2 h-4 w-4 animate-spin" />
										{bulkProgress.current}/{bulkProgress.total}
									{:else}
										<CheckCircle class="mr-2 h-4 w-4" />
										Approuver selectionnees
									{/if}
								</Button>

								<Button
									onclick={() => (showBulkRejectDialog = true)}
									disabled={isBulkProcessing}
									size="sm"
									variant="destructive"
								>
									{#if isBulkProcessing && showBulkRejectDialog}
										<Loader2 class="mr-2 h-4 w-4 animate-spin" />
										{bulkProgress.current}/{bulkProgress.total}
									{:else}
										<XCircle class="mr-2 h-4 w-4" />
										Rejeter selectionnees
									{/if}
								</Button>
							</div>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</div>

<!-- Bulk Approve Confirmation Dialog -->
<ConfirmDialog
	bind:open={showBulkApproveDialog}
	title="Approuver les demandes selectionnees"
	description={`Vous etes sur le point d'approuver ${selectedRequestDetails.length} demande${selectedRequestDetails.length > 1 ? 's' : ''} d'activation VIP :\n\n${selectedRequestDetails.map((r) => `- ${r.studentName} - ${r.cardName}`).join('\n')}\n\nApres approbation, les eleves pourront activer leurs cartes eux-memes.`}
	confirmLabel="Approuver tout"
	cancelLabel="Annuler"
	variant="default"
	onConfirm={handleBulkApprove}
/>

<!-- Bulk Reject Confirmation Dialog -->
<ConfirmDialog
	bind:open={showBulkRejectDialog}
	title="Rejeter les demandes selectionnees"
	description={`Vous etes sur le point de rejeter ${selectedRequestDetails.length} demande${selectedRequestDetails.length > 1 ? 's' : ''} d'activation VIP :\n\n${selectedRequestDetails.map((r) => `- ${r.studentName} - ${r.cardName}`).join('\n')}\n\nLes cartes retourneront dans la collection des eleves sans effet.`}
	confirmLabel="Rejeter tout"
	cancelLabel="Annuler"
	variant="destructive"
	onConfirm={handleBulkReject}
/>
