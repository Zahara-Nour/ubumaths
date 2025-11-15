<!--
	Share Material Dialog
	======================

	Dialog for sharing Google Classroom course work materials with UbuMaths classes

	FEATURES:
	- Select which classes to share with
	- Hybrid organization: Choose between Google Topics OR UbuMaths Categories
	- Configure visibility and custom description per class
	- Handle multiple class sharing at once
	- Real-time API calls to share materials
	- Loading states and error handling

	PROPS:
	- material: The material being shared (id, title, description)
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

	interface Material {
		id: string;
		title: string;
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

	interface Topic {
		id: string;
		name: string;
	}

	interface ClassShareConfig {
		classId: string;
		className: string;
		selected: boolean;
		visible: boolean;
		useTopics: boolean; // true = Topics, false = Categories
		topicId: string; // Empty string for no topic
		categoryId: string; // Empty string for no category
		customDescription: string;
		categories: Category[];
		loadingCategories: boolean;
		topics: Topic[];
		loadingTopics: boolean;
	}

	interface Props {
		material: Material;
		onClose: () => void;
		onSuccess: () => void;
	}

	// ============================================================================
	// Props & State
	// ============================================================================

	let { material, onClose, onSuccess }: Props = $props();

	let classes = $state<Class[]>([]);
	let classConfigs = $state<ClassShareConfig[]>([]);
	let submitting = $state(false);
	let fetchingClasses = $state(true);
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

	let selectedCount = $derived(classConfigs.filter((c) => c.selected).length);

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
			classConfigs = classes.map((cls) => ({
				classId: cls.id,
				className: cls.name,
				selected: false,
				visible: true,
				useTopics: true, // Default to Topics
				topicId: '',
				categoryId: '',
				customDescription: '',
				categories: [],
				loadingCategories: false,
				topics: [],
				loadingTopics: false
			}));
		} catch (err) {
			console.error('[ShareMaterialDialog] Error fetching classes:', err);
			toaster.error('Erreur lors du chargement des classes');
		} finally {
			fetchingClasses = false;
		}
	}

	/**
	 * Fetch categories for a specific class
	 */
	async function fetchCategoriesForClass(classId: string) {
		const config = classConfigs.find((c) => c.classId === classId);
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
			console.error('[ShareMaterialDialog] Error fetching categories:', err);
			// Don't show error toast for categories - non-critical
		} finally {
			config.loadingCategories = false;
		}
	}

	/**
	 * Fetch topics for Google Classroom (all topics across teacher's courses)
	 */
	async function fetchTopicsForClass(classId: string) {
		const config = classConfigs.find((c) => c.classId === classId);
		if (!config) return;

		config.loadingTopics = true;
		try {
			const response = await fetch('/api/google/topics');
			if (!response.ok) {
				throw new Error('Failed to fetch topics');
			}

			const data = await response.json();
			config.topics = data.topics || [];
		} catch (err) {
			console.error('[ShareMaterialDialog] Error fetching topics:', err);
			config.topics = [];
		} finally {
			config.loadingTopics = false;
		}
	}

	/**
	 * Share material with selected classes
	 */
	async function handleShare() {
		submitting = true;

		try {
			const selectedClasses = classConfigs.filter((c) => c.selected);

			// Share with each selected class
			const promises = selectedClasses.map(async (config) => {
				const response = await fetch(`/api/google/materials/${material.id}/share`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						classIds: [config.classId],
						categoryId: !config.useTopics && config.categoryId ? config.categoryId : null,
						topicId: config.useTopics && config.topicId ? config.topicId : null,
						descriptionOverride: config.customDescription ? config.customDescription : null,
						visible: config.visible
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
				`Matériel partagé avec ${selectedClasses.length} classe${selectedClasses.length > 1 ? 's' : ''}`
			);
			onSuccess();
		} catch (err) {
			console.error('[ShareMaterialDialog] Error sharing:', err);
			toaster.error('Erreur lors du partage');
		} finally {
			submitting = false;
		}
	}

	/**
	 * Handle class selection toggle
	 */
	async function handleClassToggle(classId: string) {
		const config = classConfigs.find((c) => c.classId === classId);
		if (!config) return;

		config.selected = !config.selected;

		// If selected, load categories and topics if not already loaded
		if (config.selected) {
			if (config.categories.length === 0 && !config.loadingCategories) {
				await fetchCategoriesForClass(classId);
			}
			if (config.topics.length === 0 && !config.loadingTopics) {
				await fetchTopicsForClass(classId);
			}
		}
	}

	/**
	 * Toggle between Topics and Categories for a class
	 */
	function toggleOrganizationMode(classId: string) {
		const config = classConfigs.find((c) => c.classId === classId);
		if (!config) return;

		config.useTopics = !config.useTopics;

		// Reset selections when switching modes
		config.topicId = '';
		config.categoryId = '';
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
			{ value: '', label: 'Aucune rubrique' },
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
			<Dialog.Title>Partager : {material.title}</Dialog.Title>
			<Dialog.Description>
				Sélectionnez les classes avec lesquelles partager ce matériel pédagogique
			</Dialog.Description>
		</Dialog.Header>

		<!-- Screen reader announcements -->
		<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
			{#if fetchingClasses}
				Chargement des classes...
			{:else if submitting}
				Partage en cours...
			{/if}
		</div>

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
						{@const config = classConfigs.find((c) => c.classId === cls.id)}
						{#if config}
							<Card.Root class={config.selected ? 'border-primary' : ''}>
								<Card.Content class="p-4">
									<div class="space-y-3">
										<!-- Class Selection -->
										<div class="flex items-center justify-between">
											<MyCheckbox
												checked={config.selected}
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

												<!-- Organization Mode Toggle (Topics vs Categories) -->
												<div class="space-y-2">
													<Label>Organisation</Label>
													<div class="flex gap-2" role="group" aria-label="Mode d'organisation">
														<Button
															size="sm"
															variant={config.useTopics ? 'default' : 'outline'}
															onclick={() => {
																if (!config.useTopics) {
																	toggleOrganizationMode(cls.id);
																}
															}}
															role="radio"
															aria-checked={config.useTopics}
														>
															Par rubrique Google
														</Button>
														<Button
															size="sm"
															variant={!config.useTopics ? 'default' : 'outline'}
															onclick={() => {
																if (config.useTopics) {
																	toggleOrganizationMode(cls.id);
																}
															}}
															role="radio"
															aria-checked={!config.useTopics}
														>
															Par catégorie UbuMaths
														</Button>
													</div>
												</div>

												{#if config.useTopics}
													<!-- Topic Selection -->
													<div class="space-y-2">
														<Label for="topic-{cls.id}">Rubrique Google (optionnel)</Label>
														{#if config.loadingTopics}
															<div class="h-10 animate-pulse rounded-md bg-muted"></div>
														{:else}
															<MySelect
																type="single"
																bind:value={config.topicId}
																items={getTopicItems(config.topics)}
																placeholder="Sélectionnez une rubrique"
															/>
														{/if}
													</div>
												{:else}
													<!-- Category Selection -->
													<div class="space-y-2">
														<Label for="category-{cls.id}">Catégorie UbuMaths (optionnel)</Label>
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
												{/if}

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
													<p
														class="text-xs text-muted-foreground"
														aria-live="polite"
														aria-atomic="true"
													>
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
