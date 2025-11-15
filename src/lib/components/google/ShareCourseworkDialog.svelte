<!--
	Share Coursework Dialog
	=======================

	Dialog for sharing Google Classroom coursework with UbuMaths classes

	FEATURES:
	- Select which classes to share with
	- Configure visibility, category, and custom description per class
	- Handle already-shared classes (allow unsharing)
	- Real-time API calls to share/unshare
	- Loading states and error handling

	PROPS:
	- coursework: The coursework being shared
	- existingShares: Classes already shared with (to pre-check)
	- onClose: Callback when dialog closes
	- onSuccess: Callback when sharing succeeds
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
	import { Loader2 } from 'lucide-svelte';

	// ============================================================================
	// Types
	// ============================================================================

	interface Course {
		id: string;
		title: string;
		courseId: string;
	}

	interface ExistingShare {
		classId: string;
		className: string;
		visible: boolean;
		categoryName: string | null;
	}

	interface Class {
		id: string;
		name: string;
	}

	interface Category {
		id: string;
		classId: string;
		name: string;
		icon: string | null;
		color: string | null;
		displayOrder: number;
	}

	interface ClassShareConfig {
		classId: string;
		className: string;
		selected: boolean;
		visible: boolean;
		categoryId: string; // Empty string for no category
		customDescription: string;
		categories: Category[];
		loadingCategories: boolean;
	}

	interface Props {
		coursework: Course;
		existingShares: ExistingShare[];
		onClose: () => void;
		onSuccess: () => void;
	}

	// ============================================================================
	// Props & State
	// ============================================================================

	let { coursework, existingShares, onClose, onSuccess }: Props = $props();

	let classes = $state<Class[]>([]);
	let classConfigs = $state<Map<string, ClassShareConfig>>(new Map());
	let submitting = $state(false);
	let fetchingClasses = $state(true);

	// ============================================================================
	// Lifecycle
	// ============================================================================

	$effect(() => {
		fetchClasses();
	});

	// ============================================================================
	// Computed
	// ============================================================================

	let selectedCount = $derived(Array.from(classConfigs.values()).filter((c) => c.selected).length);

	let hasChanges = $derived(selectedCount > 0);

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

			// Initialize class configs
			const configs = new Map<string, ClassShareConfig>();
			for (const cls of classes) {
				const existingShare = existingShares.find((s) => s.classId === cls.id);

				configs.set(cls.id, {
					classId: cls.id,
					className: cls.name,
					selected: !!existingShare,
					visible: existingShare?.visible ?? true,
					categoryId: '',
					customDescription: '',
					categories: [],
					loadingCategories: false
				});

				// If class is already shared, load its categories
				if (existingShare) {
					await fetchCategoriesForClass(cls.id);
				}
			}

			classConfigs = configs;
		} catch (err) {
			console.error('[ShareDialog] Error fetching classes:', err);
			toaster.error('Erreur lors du chargement des classes');
		} finally {
			fetchingClasses = false;
		}
	}

	/**
	 * Fetch categories for a specific class
	 */
	async function fetchCategoriesForClass(classId: string) {
		const config = classConfigs.get(classId);
		if (!config) return;

		config.loadingCategories = true;
		try {
			const response = await fetch(`/api/teacher/categories/${classId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch categories');
			}

			const data = await response.json();
			config.categories = data.categories || [];
		} catch (err) {
			console.error('[ShareDialog] Error fetching categories:', err);
			// Don't show error toast for categories - non-critical
		} finally {
			config.loadingCategories = false;
		}
	}

	/**
	 * Share coursework with selected classes
	 */
	async function handleShare() {
		submitting = true;

		try {
			const selectedClasses = Array.from(classConfigs.values()).filter((c) => c.selected);

			// Share with each selected class
			const promises = selectedClasses.map(async (config) => {
				const response = await fetch(`/api/google/courses/${coursework.courseId}/share`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						courseworkId: coursework.id,
						classId: config.classId,
						visible: config.visible,
						categoryId: config.categoryId ? config.categoryId : null,
						customDescription: config.customDescription ? config.customDescription : null
					})
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || 'Failed to share');
				}

				return response.json();
			});

			await Promise.all(promises);

			toaster.success(
				`Coursework partagé avec ${selectedClasses.length} classe${selectedClasses.length > 1 ? 's' : ''}`
			);
			onSuccess();
		} catch (err) {
			console.error('[ShareDialog] Error sharing:', err);
			toaster.error('Erreur lors du partage');
		} finally {
			submitting = false;
		}
	}

	/**
	 * Handle class selection toggle
	 */
	async function handleClassToggle(classId: string) {
		const config = classConfigs.get(classId);
		if (!config) return;

		config.selected = !config.selected;
		classConfigs = classConfigs; // Trigger reactivity

		// If selected, load categories if not already loaded
		if (config.selected && config.categories.length === 0 && !config.loadingCategories) {
			await fetchCategoriesForClass(classId);
		}

		// If deselected, unshare if it was previously shared
		const existingShare = existingShares.find((s) => s.classId === classId);
		if (!config.selected && existingShare) {
			await unshareFromClass(classId);
		}
	}

	/**
	 * Unshare coursework from a class
	 */
	async function unshareFromClass(classId: string) {
		try {
			const response = await fetch(
				`/api/google/courses/${coursework.courseId}/share?courseworkId=${coursework.id}&classId=${classId}`,
				{
					method: 'DELETE'
				}
			);

			if (!response.ok) {
				throw new Error('Failed to unshare');
			}
		} catch (err) {
			console.error('[ShareDialog] Error unsharing:', err);
			toaster.error('Erreur lors de la suppression du partage');
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
</script>

<Dialog.Root open={true} onOpenChange={onClose}>
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Partager : {coursework.title}</Dialog.Title>
			<Dialog.Description>
				Sélectionnez les classes avec lesquelles partager ce travail
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			{#if fetchingClasses}
				<div class="space-y-3">
					<div class="h-24 animate-pulse rounded-lg bg-muted"></div>
					<div class="h-24 animate-pulse rounded-lg bg-muted"></div>
					<div class="h-24 animate-pulse rounded-lg bg-muted"></div>
				</div>
			{:else if classes.length === 0}
				<div class="py-8 text-center text-muted-foreground">
					<p>Aucune classe disponible</p>
					<p class="text-sm">Créez une classe pour partager du contenu</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each classes as cls (cls.id)}
						{@const config = classConfigs.get(cls.id)}
						{#if config}
							<Card.Root class={config.selected ? 'border-primary' : ''}>
								<Card.Content class="p-4">
									<div class="space-y-3">
										<!-- Class Selection -->
										<div class="flex items-center justify-between">
											<MyCheckbox
												bind:checked={config.selected}
												label={cls.name}
												onCheckedChange={() => handleClassToggle(cls.id)}
											/>
										</div>

										<!-- Configuration Options (shown when selected) -->
										{#if config.selected}
											<div class="ml-6 space-y-3 border-l-2 border-muted pl-4">
												<!-- Visibility Toggle -->
												<div>
													<MyCheckbox
														bind:checked={config.visible}
														label="Visible pour les élèves"
													/>
												</div>

												<!-- Category Selection -->
												<div class="space-y-2">
													<Label for="category-{cls.id}">Catégorie</Label>
													{#if config.loadingCategories}
														<div class="h-10 animate-pulse rounded-md bg-muted"></div>
													{:else}
														<MySelect
															type="single"
															bind:value={config.categoryId}
															items={getCategoryItems(config.categories)}
															placeholder="Sélectionnez une catégorie"
														/>
													{/if}
												</div>

												<!-- Custom Description -->
												<div class="space-y-2">
													<Label for="description-{cls.id}"
														>Description personnalisée (optionnel)</Label
													>
													<Textarea
														id="description-{cls.id}"
														bind:value={config.customDescription}
														placeholder="Remplace la description originale..."
														maxlength={2000}
														rows={3}
														class="resize-none"
													/>
													<p class="text-xs text-muted-foreground">
														{config.customDescription.length}/2000 caractères
													</p>
												</div>
											</div>
										{/if}
									</div>
								</Card.Content>
							</Card.Root>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<div class="flex items-center justify-between gap-4">
				<p class="text-sm text-muted-foreground">
					{selectedCount} classe{selectedCount > 1 ? 's' : ''} sélectionnée{selectedCount > 1
						? 's'
						: ''}
				</p>
				<div class="flex gap-2">
					<Button variant="outline" onclick={onClose} disabled={submitting}>Annuler</Button>
					<Button onclick={handleShare} disabled={!hasChanges || submitting}>
						{#if submitting}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Partager
					</Button>
				</div>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
