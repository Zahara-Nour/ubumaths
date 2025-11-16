<!--
	Share Coursework Bulk Dialog
	=============================

	Dialog for sharing a single Google Classroom coursework item with multiple UbuMaths classes

	FEATURES:
	- Share 1 coursework with N classes (1-50)
	- Multi-select classes with "Select All" functionality
	- Configure visibility (default: true)
	- Optional category selection per class (UbuMaths categories)
	- Optional description override (shared across all classes)
	- Single bulk API call to share coursework
	- Loading states and error handling
	- Success feedback with toast notifications

	PROPS:
	- coursework: Object containing coursework details (id, title, courseId)
	- onClose: Callback when dialog closes
	- onSuccess: Callback when sharing succeeds (refresh parent)

	API ENDPOINT:
	POST /api/google/shared-coursework
	Body: { courseworkId, classIds[], visible, categoryId?, descriptionOverride? }
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
	import { Loader2, CheckCircle2, Users } from 'lucide-svelte';
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';

	// ============================================================================
	// Types
	// ============================================================================

	interface Class {
		id: string;
		name: string;
		studentCount?: number;
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

	interface Props {
		coursework: {
			id: string;
			title: string;
			courseId: string;
		};
		onClose: () => void;
		onSuccess: () => void;
	}

	// ============================================================================
	// Props & State
	// ============================================================================

	let { coursework, onClose, onSuccess }: Props = $props();

	let classes = $state<Class[]>([]);
	let selectedClassIds = new SvelteSet<string>();
	let visible = $state(true);
	let categoryId = $state<string>('');
	let topicId = $state<string>('');
	let descriptionOverride = $state('');
	let loading = $state(true);
	let submitting = $state(false);

	// Category management per class (for future enhancement)
	let categoriesMap = new SvelteMap<string, Category[]>();
	let loadingCategories = new SvelteSet<string>();

	// Topic management
	let topics = $state<Topic[]>([]);
	let loadingTopics = $state(false);

	// ============================================================================
	// Lifecycle
	// ============================================================================

	$effect(() => {
		fetchClasses();
		fetchTopics();
		return () => {
			// Cleanup effect will only run when component unmounts
		};
	});

	// ============================================================================
	// Computed Values
	// ============================================================================

	let allSelected = $derived(classes.length > 0 && selectedClassIds.size === classes.length);

	let hasSelection = $derived(selectedClassIds.size > 0);

	let submitButtonText = $derived.by(() => {
		const count = selectedClassIds.size;
		if (submitting) {
			return 'Partage en cours...';
		}
		if (count === 0) {
			return 'Sélectionnez des classes';
		}
		return `Partager avec ${count} classe${count > 1 ? 's' : ''}`;
	});

	// ============================================================================
	// Functions
	// ============================================================================

	/**
	 * Fetch teacher's classes
	 */
	async function fetchClasses() {
		loading = true;
		try {
			const response = await fetch('/api/teacher/classes');
			if (!response.ok) {
				throw new Error('Failed to fetch classes');
			}

			const data = await response.json();
			classes = data.classes || [];
		} catch (err) {
			console.error('[ShareCourseworkBulkDialog] Error fetching classes:', err);
			toaster.error('Erreur lors du chargement des classes');
			classes = [];
		} finally {
			loading = false;
		}
	}

	/**
	 * Fetch categories for a specific class
	 */
	async function fetchCategoriesForClass(classId: string) {
		if (categoriesMap.has(classId) || loadingCategories.has(classId)) {
			return;
		}

		loadingCategories.add(classId);
		try {
			const response = await fetch(`/api/teacher/categories/${classId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch categories');
			}

			const data = await response.json();
			categoriesMap.set(classId, data.categories || []);
		} catch (err) {
			console.error('[ShareCourseworkBulkDialog] Error fetching categories:', err);
			categoriesMap.set(classId, []);
		} finally {
			loadingCategories.delete(classId);
		}
	}

	/**
	 * Fetch topics for the coursework's Google Classroom course
	 */
	async function fetchTopics() {
		loadingTopics = true;
		try {
			const response = await fetch(
				`/api/google/topics?page=1&limit=100&courseId=${coursework.courseId}`
			);
			if (!response.ok) {
				throw new Error('Failed to fetch topics');
			}

			const data = await response.json();
			topics = data.topics || [];
		} catch (err) {
			console.error('[ShareCourseworkBulkDialog] Error fetching topics:', err);
			topics = [];
		} finally {
			loadingTopics = false;
		}
	}

	/**
	 * Handle sharing coursework with selected classes
	 */
	async function handleShare() {
		if (!hasSelection) return;

		submitting = true;
		try {
			const response = await fetch('/api/google/shared-coursework', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					courseworkId: coursework.id,
					classIds: Array.from(selectedClassIds),
					visible: visible,
					categoryId: categoryId || null,
					topicId: topicId || null,
					descriptionOverride: descriptionOverride.trim() || null
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Échec du partage');
			}

			const result = await response.json();

			// Handle partial failures
			if (result.errors && result.errors.length > 0) {
				const successCount = result.shared || 0;
				const errorCount = result.errors.length;

				if (successCount > 0) {
					toaster.warning(
						`Travail partagé avec ${successCount} classe${successCount > 1 ? 's' : ''}, ` +
							`mais ${errorCount} échec${errorCount > 1 ? 's' : ''}`
					);
				} else {
					toaster.error('Échec du partage avec toutes les classes sélectionnées');
				}
			} else {
				const count = result.shared || selectedClassIds.size;
				toaster.success(`Travail partagé avec ${count} classe${count > 1 ? 's' : ''}`);
			}

			onSuccess();
			onClose();
		} catch (err) {
			console.error('[ShareCourseworkBulkDialog] Error sharing:', err);
			if (err instanceof Error) {
				toaster.error(err.message);
			} else {
				toaster.error('Erreur lors du partage du travail');
			}
		} finally {
			submitting = false;
		}
	}

	/**
	 * Toggle all classes selection
	 */
	function toggleAll() {
		if (allSelected) {
			selectedClassIds.clear();
		} else {
			// Clear first, then add all
			selectedClassIds.clear();
			classes.forEach((cls) => {
				selectedClassIds.add(cls.id);
				// Fetch categories for all selected classes
				fetchCategoriesForClass(cls.id);
			});
		}
	}

	/**
	 * Toggle single class selection
	 */
	function toggleClass(classId: string) {
		if (selectedClassIds.has(classId)) {
			selectedClassIds.delete(classId);
		} else {
			selectedClassIds.add(classId);
			// Fetch categories when class is selected
			fetchCategoriesForClass(classId);
		}
	}

	/**
	 * Get category items for select dropdown
	 */
	function getCategoryItems() {
		// Aggregate categories from all selected classes
		const allCategories = new SvelteMap<string, Category>();

		for (const classId of selectedClassIds) {
			const categories = categoriesMap.get(classId) || [];
			for (const cat of categories) {
				// Use category ID as key to avoid duplicates
				allCategories.set(cat.id, cat);
			}
		}

		const items = [
			{ value: '', label: 'Aucune catégorie' },
			...Array.from(allCategories.values())
				.sort((a, b) => a.displayOrder - b.displayOrder)
				.map((cat) => ({
					value: cat.id,
					label: cat.icon ? `${cat.icon} ${cat.name}` : cat.name
				}))
		];

		return items;
	}

	/**
	 * Get topic items for select dropdown
	 */
	function getTopicItems() {
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
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<CheckCircle2 class="h-5 w-5 text-primary" />
				Partager : {coursework.title}
			</Dialog.Title>
			<Dialog.Description>
				Sélectionnez les classes avec lesquelles partager ce travail
			</Dialog.Description>
		</Dialog.Header>

		<!-- Screen reader announcements -->
		<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
			{#if loading}
				Chargement des classes...
			{:else if submitting}
				Partage en cours...
			{/if}
		</div>

		<div class="space-y-4 py-4">
			<!-- Loading state -->
			{#if loading}
				<div class="space-y-3">
					<div class="h-20 animate-pulse rounded-lg bg-muted"></div>
					<div class="h-20 animate-pulse rounded-lg bg-muted"></div>
					<div class="h-20 animate-pulse rounded-lg bg-muted"></div>
				</div>
			{:else if classes.length === 0}
				<!-- Empty state -->
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<Users class="mb-4 h-12 w-12 text-muted-foreground" />
					<p class="text-lg font-medium">Aucune classe disponible</p>
					<p class="mt-2 text-sm text-muted-foreground">
						Créez une classe pour pouvoir partager du contenu
					</p>
				</div>
			{:else}
				<!-- Class selection -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<Label class="text-base font-semibold">
							Classes ({classes.length})
						</Label>
						<Button size="sm" variant="outline" onclick={toggleAll} disabled={submitting}>
							{allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
						</Button>
					</div>

					<fieldset class="space-y-2" disabled={submitting}>
						<legend class="sr-only">Sélection des classes</legend>
						{#each classes as cls (cls.id)}
							<div
								class={`rounded-lg border transition-colors ${
									selectedClassIds.has(cls.id)
										? 'border-primary bg-primary/5'
										: 'border-border hover:bg-muted/50'
								}`}
							>
								<div class="p-3">
									<MyCheckbox
										checked={selectedClassIds.has(cls.id)}
										label={cls.name}
										onCheckedChange={() => toggleClass(cls.id)}
									/>
									{#if cls.studentCount !== undefined}
										<p class="mt-1 ml-6 text-sm text-muted-foreground">
											{cls.studentCount} élève{cls.studentCount > 1 ? 's' : ''}
										</p>
									{/if}
								</div>
							</div>
						{/each}
					</fieldset>

					<p class="text-sm text-muted-foreground">
						{selectedClassIds.size} classe{selectedClassIds.size > 1 ? 's' : ''}
						sélectionnée{selectedClassIds.size > 1 ? 's' : ''}
					</p>
				</div>

				<!-- Configuration options (shown when classes are selected) -->
				{#if hasSelection}
					<Card.Root>
						<Card.Header>
							<Card.Title class="text-base">Options de partage</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-4">
							<!-- Visibility toggle -->
							<div>
								<MyCheckbox
									bind:checked={visible}
									label="Visible pour les élèves"
									disabled={submitting}
								/>
								<p class="mt-1 ml-6 text-xs text-muted-foreground">
									Les élèves pourront voir ce travail immédiatement
								</p>
							</div>

							<!-- Category selection (optional) -->
							<div class="space-y-2">
								<Label for="category">Catégorie UbuMaths (optionnel)</Label>
								{#if loadingCategories.size > 0}
									<div class="h-10 animate-pulse rounded-md bg-muted"></div>
								{:else}
									<MySelect
										type="single"
										bind:value={categoryId}
										items={getCategoryItems()}
										placeholder="Sélectionnez une catégorie"
										disabled={submitting}
									/>
								{/if}
								<p class="text-xs text-muted-foreground">
									Organisez le travail dans une catégorie spécifique
								</p>
							</div>

							<!-- Topic selection (optional) -->
							<div class="space-y-2">
								<Label for="topic">Sujet Google Classroom (optionnel)</Label>
								{#if loadingTopics}
									<div class="h-10 animate-pulse rounded-md bg-muted"></div>
								{:else}
									<MySelect
										type="single"
										bind:value={topicId}
										items={getTopicItems()}
										placeholder="Sélectionnez un sujet"
										disabled={submitting}
									/>
								{/if}
								<p class="text-xs text-muted-foreground">
									Organisez le travail dans un sujet Google Classroom
								</p>
							</div>

							<!-- Description override (optional) -->
							<div class="space-y-2">
								<Label for="description">Description personnalisée (optionnel)</Label>
								<Textarea
									id="description"
									bind:value={descriptionOverride}
									placeholder="Remplace la description originale du travail..."
									maxlength={2000}
									rows={3}
									disabled={submitting}
									class="resize-none"
								/>
								<p class="text-xs text-muted-foreground" aria-live="polite" aria-atomic="true">
									{descriptionOverride.length}/2000 caractères
								</p>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onClose} disabled={submitting}>Annuler</Button>
			<Button onclick={handleShare} disabled={!hasSelection || submitting} class="min-w-[200px]">
				{#if submitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				{submitButtonText}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
