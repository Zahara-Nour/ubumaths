<!--
	Manage Shared Coursework Dialog
	================================

	Dialog for managing already-shared Google Classroom coursework

	FEATURES:
	- View all classes coursework is shared with
	- Update visibility, category, and custom description
	- Remove sharing from specific classes
	- Real-time API calls with optimistic updates
	- Loading states and error handling

	PROPS:
	- coursework: The coursework being managed with sharing info
	- onClose: Callback when dialog closes
	- onSuccess: Callback when changes are saved successfully
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Card from '$lib/components/ui/card';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Loader2, Trash2 } from 'lucide-svelte';

	// ============================================================================
	// Types
	// ============================================================================

	interface Course {
		id: string;
		title: string;
	}

	interface Category {
		id: string;
		classId: string;
		name: string;
		icon: string | null;
		color: string | null;
		displayOrder: number;
	}

	interface Topic {
		id: string;
		name: string;
		googleCourseId: string;
	}

	interface SharedCourseworkRecord {
		id: string;
		classId: string;
		className: string;
		visible: boolean;
		categoryId: string | null;
		categoryName: string | null;
		topicId: string | null;
		descriptionOverride: string | null;
		categories: Category[];
		topics: Topic[];
		loadingCategories: boolean;
		loadingTopics: boolean;
		modified: boolean;
	}

	interface Props {
		coursework: Course;
		onClose: () => void;
		onSuccess: () => void;
	}

	// ============================================================================
	// Props & State
	// ============================================================================

	let { coursework, onClose, onSuccess }: Props = $props();

	let sharedRecords = $state<Map<string, SharedCourseworkRecord>>(new Map());
	let loading = $state(true);
	let submitting = $state(false);
	let removingClass = $state<string | null>(null);

	// ============================================================================
	// Lifecycle
	// ============================================================================

	$effect(() => {
		fetchSharedCourseworkRecords();
	});

	// ============================================================================
	// Computed
	// ============================================================================

	let hasChanges = $derived(Array.from(sharedRecords.values()).some((record) => record.modified));

	let recordsList = $derived(Array.from(sharedRecords.values()));

	// ============================================================================
	// API Functions
	// ============================================================================

	/**
	 * Fetch full shared_coursework records to get IDs and current values
	 */
	async function fetchSharedCourseworkRecords() {
		loading = true;
		try {
			// Fetch shared coursework records for this coursework
			const response = await fetch(
				`/api/google/shared-coursework?page=1&limit=100&courseworkId=${coursework.id}`
			);

			if (!response.ok) {
				throw new Error('Failed to fetch shared coursework');
			}

			const data = await response.json();
			// Server now filters by courseworkId, so all records are relevant
			const relevantRecords = data.sharedCoursework || [];

			// Initialize records map
			const recordsMap = new Map<string, SharedCourseworkRecord>();
			for (const record of relevantRecords) {
				recordsMap.set(record.classId, {
					id: record.id,
					classId: record.classId,
					className: record.className,
					visible: record.visible,
					categoryId: record.categoryId,
					categoryName: record.categoryName,
					topicId: record.topicId || null,
					descriptionOverride: record.descriptionOverride,
					categories: [],
					topics: [],
					loadingCategories: false,
					loadingTopics: false,
					modified: false
				});

				// Load categories and topics for each class
				await fetchCategoriesForClass(record.classId);
				await fetchTopicsForClass(record.classId);
			}

			sharedRecords = recordsMap;
		} catch (err) {
			console.error('[ManageDialog] Error fetching records:', err);
			toaster.error('Erreur lors du chargement des partages');
		} finally {
			loading = false;
		}
	}

	/**
	 * Fetch categories for a specific class
	 */
	async function fetchCategoriesForClass(classId: string) {
		const record = sharedRecords.get(classId);
		if (!record) return;

		record.loadingCategories = true;
		try {
			const response = await fetch(`/api/teacher/categories/${classId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch categories');
			}

			const data = await response.json();
			record.categories = data.categories || [];
		} catch (err) {
			console.error('[ManageDialog] Error fetching categories:', err);
			// Don't show error toast for categories - non-critical
		} finally {
			record.loadingCategories = false;
		}
	}

	/**
	 * Fetch topics for the coursework's Google Classroom course
	 */
	async function fetchTopicsForClass(classId: string) {
		const record = sharedRecords.get(classId);
		if (!record) return;

		record.loadingTopics = true;
		try {
			// Fetch all topics for the user's courses
			const response = await fetch('/api/google/topics?page=1&limit=100');
			if (!response.ok) {
				throw new Error('Failed to fetch topics');
			}

			const data = await response.json();
			record.topics = data.topics || [];
		} catch (err) {
			console.error('[ManageDialog] Error fetching topics:', err);
			// Don't show error toast for topics - non-critical
		} finally {
			record.loadingTopics = false;
		}
	}

	/**
	 * Save changes for all modified records
	 */
	async function handleSave() {
		submitting = true;

		try {
			const modifiedRecords = Array.from(sharedRecords.values()).filter((r) => r.modified);

			// Update each modified record using new endpoint
			const promises = modifiedRecords.map(async (record) => {
				const response = await fetch(`/api/google/shared-coursework/${record.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						visible: record.visible,
						categoryId: record.categoryId || null,
						topicId: record.topicId || null,
						descriptionOverride: record.descriptionOverride || null
					})
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || 'Failed to update');
				}

				return response.json();
			});

			await Promise.all(promises);

			toaster.success(
				`${modifiedRecords.length} partage${modifiedRecords.length > 1 ? 's' : ''} mis à jour`
			);
			onSuccess();
		} catch (err) {
			console.error('[ManageDialog] Error saving:', err);
			toaster.error('Erreur lors de la sauvegarde');
		} finally {
			submitting = false;
		}
	}

	/**
	 * Remove sharing from a specific class
	 */
	async function handleRemove(classId: string) {
		const record = sharedRecords.get(classId);
		if (!record) return;

		removingClass = classId;
		try {
			// Use new endpoint with shared_coursework record ID
			const response = await fetch(`/api/google/shared-coursework/${record.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to unshare');
			}

			// Remove from map
			sharedRecords.delete(classId);
			sharedRecords = sharedRecords; // Trigger reactivity

			toaster.success(`Partage retiré de ${record.className}`);

			// If no more shares, close dialog
			if (sharedRecords.size === 0) {
				onSuccess();
			}
		} catch (err) {
			console.error('[ManageDialog] Error removing share:', err);
			toaster.error('Erreur lors de la suppression du partage');
		} finally {
			removingClass = null;
		}
	}

	/**
	 * Mark record as modified when a field changes
	 */
	function markModified(classId: string) {
		const record = sharedRecords.get(classId);
		if (record) {
			record.modified = true;
			sharedRecords = sharedRecords; // Trigger reactivity
		}
	}

	/**
	 * Handle visibility toggle
	 */
	function handleVisibilityChange(classId: string, checked: boolean) {
		const record = sharedRecords.get(classId);
		if (record) {
			record.visible = checked;
			markModified(classId);
		}
	}

	/**
	 * Handle category change
	 */
	function handleCategoryChange(classId: string, categoryId: string) {
		const record = sharedRecords.get(classId);
		if (record) {
			record.categoryId = categoryId || null;
			markModified(classId);
		}
	}

	/**
	 * Handle topic change
	 */
	function handleTopicChange(classId: string, topicId: string) {
		const record = sharedRecords.get(classId);
		if (record) {
			record.topicId = topicId || null;
			markModified(classId);
		}
	}

	// ============================================================================
	// Render Helpers
	// ============================================================================

	function getCategoryItems(categories: Category[]) {
		return [
			{ value: '', label: 'Aucune catégorie' },
			...categories.map((cat) => ({
				value: cat.id,
				label: cat.icon ? `${cat.icon} ${cat.name}` : cat.name
			}))
		];
	}

	function getTopicItems(topics: Topic[]) {
		return [
			{ value: '', label: 'Aucun sujet' },
			...topics.map((topic) => ({
				value: topic.id,
				label: topic.name
			}))
		];
	}
</script>

<Dialog.Root open={true} onOpenChange={onClose}>
	<Dialog.Content class="max-h-[90vh] max-w-3xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Gérer : {coursework.title}</Dialog.Title>
			<Dialog.Description>Modifiez les paramètres de partage pour chaque classe</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			{#if loading}
				<div class="space-y-3">
					<div class="h-32 animate-pulse rounded-lg bg-muted"></div>
					<div class="h-32 animate-pulse rounded-lg bg-muted"></div>
				</div>
			{:else if recordsList.length === 0}
				<div class="py-8 text-center text-muted-foreground">
					<p>Ce travail n'est partagé avec aucune classe</p>
				</div>
			{:else}
				<div class="space-y-3">
					<p class="text-sm text-muted-foreground">
						Partagé avec {recordsList.length} classe{recordsList.length > 1 ? 's' : ''} :
					</p>

					{#each recordsList as record (record.classId)}
						<Card.Root class={record.modified ? 'border-primary' : ''}>
							<Card.Header class="pb-3">
								<div class="flex items-center justify-between">
									<h3 class="text-lg font-semibold">{record.className}</h3>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleRemove(record.classId)}
										disabled={removingClass === record.classId || submitting}
										class="text-destructive hover:bg-destructive/10"
									>
										{#if removingClass === record.classId}
											<Loader2 class="h-4 w-4 animate-spin" />
										{:else}
											<Trash2 class="mr-2 h-4 w-4" />
											Retirer
										{/if}
									</Button>
								</div>
							</Card.Header>

							<Card.Content class="space-y-4">
								<!-- Visibility Toggle -->
								<div>
									<MyCheckbox
										checked={record.visible}
										label={record.visible ? 'Visible pour les élèves' : 'Masqué aux élèves'}
										onCheckedChange={(checked) => {
											const isChecked = typeof checked === 'boolean' ? checked : false;
											handleVisibilityChange(record.classId, isChecked);
										}}
									/>
								</div>

								<!-- Category Selection -->
								<div class="space-y-2">
									<Label for="category-{record.classId}">Catégorie (UbuMaths)</Label>
									{#if record.loadingCategories}
										<div class="h-10 animate-pulse rounded-md bg-muted"></div>
									{:else}
										<MySelect
											type="single"
											value={record.categoryId || ''}
											items={getCategoryItems(record.categories)}
											placeholder="Sélectionnez une catégorie"
											onValueChange={(value) => handleCategoryChange(record.classId, value ?? '')}
										/>
									{/if}
								</div>

								<!-- Topic Selection -->
								<div class="space-y-2">
									<Label for="topic-{record.classId}">Sujet (Google Classroom)</Label>
									{#if record.loadingTopics}
										<div class="h-10 animate-pulse rounded-md bg-muted"></div>
									{:else}
										<MySelect
											type="single"
											value={record.topicId || ''}
											items={getTopicItems(record.topics)}
											placeholder="Sélectionnez un sujet"
											onValueChange={(value) => handleTopicChange(record.classId, value ?? '')}
										/>
									{/if}
								</div>

								<!-- Custom Description -->
								<div class="space-y-2">
									<Label for="description-{record.classId}">Description personnalisée</Label>
									<Textarea
										id="description-{record.classId}"
										bind:value={record.descriptionOverride}
										oninput={() => markModified(record.classId)}
										placeholder="Remplace la description originale..."
										maxlength={2000}
										rows={3}
										class="resize-none"
									/>
									<p class="text-xs text-muted-foreground">
										{(record.descriptionOverride || '').length}/2000 caractères
									</p>
								</div>

								{#if record.modified}
									<p class="text-xs text-primary">Modifications non sauvegardées</p>
								{/if}
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<div class="flex items-center justify-between gap-4">
				<div class="text-sm text-muted-foreground">
					{#if hasChanges}
						<span class="font-medium text-primary">Modifications en attente</span>
					{:else}
						<span>Aucune modification</span>
					{/if}
				</div>
				<div class="flex gap-2">
					<Button variant="outline" onclick={onClose} disabled={submitting}>Fermer</Button>
					<Button onclick={handleSave} disabled={!hasChanges || submitting}>
						{#if submitting}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Enregistrer
					</Button>
				</div>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
