<!--
	Unshare Topic Materials Dialog
	===============================

	Dialog for bulk unsharing Google Classroom materials from a topic with UbuMaths classes

	FEATURES:
	- Removes ALL materials in a topic from selected classes
	- Select which classes to unshare from (all selected by default)
	- Shows confirmation with total operations count
	- Single bulk API call per material to unshare from all selected classes
	- Loading states and error handling

	PROPS:
	- materials: Array of materials being unshared
	- topicName: Topic name for display context
	- topicId: Topic ID (for reference)
	- onClose: Callback when dialog closes
	- onSuccess: Callback when unsharing succeeds
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Loader2, AlertTriangle } from 'lucide-svelte';

	// ============================================================================
	// Types
	// ============================================================================

	interface Material {
		id: string;
		title: string;
	}

	interface Class {
		id: string;
		name: string;
	}

	interface ClassSelection {
		classId: string;
		className: string;
		selected: boolean;
	}

	interface Props {
		materials: Material[];
		topicName: string;
		topicId: string;
		onClose: () => void;
		onSuccess: () => void;
	}

	// ============================================================================
	// Props & State
	// ============================================================================

	let { materials, topicName, topicId: _topicId, onClose, onSuccess }: Props = $props();

	let classes = $state<Class[]>([]);
	let classSelections = $state<ClassSelection[]>([]);
	let fetchingClasses = $state(true);
	let submitting = $state(false);
	let initialized = $state(false);

	// ============================================================================
	// Lifecycle
	// ============================================================================

	$effect(() => {
		if (!initialized) {
			initialized = true;
			fetchClasses();
		}
	});

	// ============================================================================
	// Computed
	// ============================================================================

	let selectedClassCount = $derived(classSelections.filter((c) => c.selected).length);

	let totalOperations = $derived(materials.length * selectedClassCount);

	let canSubmit = $derived(selectedClassCount > 0 && !submitting);

	// ============================================================================
	// API Functions
	// ============================================================================

	/**
	 * Fetch teacher's classes
	 */
	async function fetchClasses() {
		fetchingClasses = true;
		try {
			const response = await fetch('/api/teacher/classes');
			if (!response.ok) {
				throw new Error('Failed to fetch classes');
			}

			const data = await response.json();
			classes = data.classes || [];

			// Initialize all classes as selected by default
			classSelections = classes.map((cls) => ({
				classId: cls.id,
				className: cls.name,
				selected: true
			}));
		} catch (err) {
			console.error('[UnshareTopicMaterialsDialog] Error fetching classes:', err);
			toaster.error('Erreur lors du chargement des classes');
		} finally {
			fetchingClasses = false;
		}
	}

	/**
	 * Bulk unshare materials from selected classes
	 */
	async function handleUnshare() {
		submitting = true;

		try {
			const selectedClassIds = classSelections.filter((c) => c.selected).map((c) => c.classId);

			// Unshare each material from selected classes
			const promises = materials.map(async (material) => {
				const response = await fetch('/api/google/shared-materials', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						materialId: material.id,
						classIds: selectedClassIds
					})
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || 'Failed to unshare');
				}

				return response.json();
			});

			await Promise.all(promises);

			toaster.success(
				`${materials.length} matériel${materials.length > 1 ? 's' : ''} retiré${materials.length > 1 ? 's' : ''} de ${selectedClassIds.length} classe${selectedClassIds.length > 1 ? 's' : ''}`
			);
			onSuccess();
		} catch (err) {
			console.error('[UnshareTopicMaterialsDialog] Error unsharing:', err);
			toaster.error('Erreur lors du retrait du partage');
		} finally {
			submitting = false;
		}
	}

	// ============================================================================
	// UI Functions
	// ============================================================================

	/**
	 * Toggle class selection
	 */
	function toggleClass(classId: string) {
		const selection = classSelections.find((c) => c.classId === classId);
		if (selection) {
			selection.selected = !selection.selected;
		}
	}

	/**
	 * Select all classes
	 */
	function selectAll() {
		classSelections.forEach((c) => {
			c.selected = true;
		});
	}

	/**
	 * Deselect all classes
	 */
	function deselectAll() {
		classSelections.forEach((c) => {
			c.selected = false;
		});
	}
</script>

<Dialog.Root open={true} onOpenChange={onClose}>
	<Dialog.Content class="max-h-[80vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Retirer le partage - {topicName}</Dialog.Title>
			<Dialog.Description>
				Les {materials.length} matériel{materials.length > 1 ? 's' : ''} de ce topic seront retirés des
				classes sélectionnées
			</Dialog.Description>
		</Dialog.Header>

		<!-- Screen reader announcements -->
		<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
			{#if fetchingClasses}
				Chargement des classes...
			{:else if submitting}
				Retrait du partage en cours...
			{/if}
		</div>

		{#if fetchingClasses}
			<div class="flex items-center justify-center py-8">
				<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		{:else}
			<div class="space-y-4">
				<!-- Warning summary card -->
				<Card.Root class="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
					<Card.Content class="flex items-start gap-3 pt-6">
						<AlertTriangle class="mt-0.5 h-5 w-5 text-orange-600 dark:text-orange-400" />
						<div class="flex-1">
							<p class="text-sm font-medium text-orange-900 dark:text-orange-100">
								{totalOperations} partage{totalOperations > 1 ? 's' : ''}
								{totalOperations > 1 ? 'seront retirés' : 'sera retiré'}
							</p>
							<p class="mt-1 text-xs text-orange-700 dark:text-orange-300">
								{materials.length} matériel{materials.length > 1 ? 's' : ''} × {selectedClassCount}
								classe{selectedClassCount > 1 ? 's' : ''}
							</p>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Class selection -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<Label class="text-base font-semibold">Classes</Label>
						<div class="flex gap-2">
							<Button variant="ghost" size="sm" onclick={selectAll} disabled={submitting}>
								Tout sélectionner
							</Button>
							<Button variant="ghost" size="sm" onclick={deselectAll} disabled={submitting}>
								Tout désélectionner
							</Button>
						</div>
					</div>

					<div class="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
						{#if classSelections.length === 0}
							<p class="py-4 text-center text-sm text-muted-foreground">Aucune classe disponible</p>
						{:else}
							{#each classSelections as selection (selection.classId)}
								<div class="flex items-center gap-2 rounded-md p-2 hover:bg-muted">
									<MyCheckbox bind:checked={selection.selected} disabled={submitting} />
									<Label
										class="flex-1 cursor-pointer"
										onclick={() => toggleClass(selection.classId)}
									>
										{selection.className}
									</Label>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<Dialog.Footer class="gap-2">
			<Button variant="outline" onclick={onClose} disabled={submitting}>Annuler</Button>
			<Button
				variant="destructive"
				onclick={handleUnshare}
				disabled={!canSubmit || fetchingClasses}
			>
				{#if submitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Retrait en cours...
				{:else}
					Confirmer le retrait
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
