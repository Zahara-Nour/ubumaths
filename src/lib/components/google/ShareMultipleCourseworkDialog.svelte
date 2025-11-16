<!--
	Share Multiple Coursework Dialog
	=================================

	Dialog for bulk sharing multiple Google Classroom coursework items with UbuMaths classes

	FEATURES:
	- Select which coursework to share (all selected by default)
	- Select which classes to share with
	- Shared configuration applies to ALL selected coursework
	- Choose between Google Topics OR UbuMaths Categories
	- Configure visibility and custom description
	- Single bulk API call to share all coursework at once
	- Loading states and error handling

	PROPS:
	- courseworkItems: Array of coursework being shared
	- onClose: Callback when dialog closes
	- onSuccess: Callback when sharing succeeds
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Input } from '$lib/components/ui/input';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Card from '$lib/components/ui/card';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Loader2, Search } from 'lucide-svelte';
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';

	// ============================================================================
	// Types
	// ============================================================================

	interface CourseworkItem {
		id: string;
		title: string;
		courseId: string;
		courseName: string;
		workType: string;
		dueDate?: string;
	}

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
	}

	interface CourseworkSelection {
		id: string;
		title: string;
		courseId: string;
		courseName: string;
		workType: string;
		dueDate?: string;
		selected: boolean;
	}

	interface Props {
		courseworkItems: CourseworkItem[];
		onClose: () => void;
		onSuccess: () => void;
	}

	// ============================================================================
	// Props & State
	// ============================================================================

	let { courseworkItems, onClose, onSuccess }: Props = $props();

	let courseworkSelections = $state<CourseworkSelection[]>(
		courseworkItems.map((c) => ({ ...c, selected: true }))
	);
	let searchQuery = $state('');
	let classes = $state<Class[]>([]);
	let selectedClassIds = new SvelteSet<string>();
	let submitting = $state(false);
	let fetchingClasses = $state(true);

	// Configuration options (shared across all coursework)
	let visible = $state(true);
	let useTopics = $state(true);
	let categoryId = $state('');
	let topicId = $state('');
	let descriptionOverride = $state('');

	// Categories and topics data
	let categories = $state<Category[]>([]);
	let topics = $state<Topic[]>([]);
	let loadingCategories = $state(false);
	let loadingTopics = $state(false);

	// ============================================================================
	// Lifecycle
	// ============================================================================

	// Fetch classes and topics on mount (once)
	fetchClasses();
	fetchTopics();

	// ============================================================================
	// Computed
	// ============================================================================

	let selectedCourseworkCount = $derived(courseworkSelections.filter((c) => c.selected).length);

	let selectedClassCount = $derived(selectedClassIds.size);

	let hasChanges = $derived(selectedCourseworkCount > 0 && selectedClassCount > 0);

	let totalShares = $derived(selectedCourseworkCount * selectedClassCount);

	let allCourseworkSelected = $derived(
		courseworkSelections.length > 0 && courseworkSelections.every((c) => c.selected)
	);

	let allClassesSelected = $derived(classes.length > 0 && selectedClassIds.size === classes.length);

	let filteredCoursework = $derived.by(() => {
		if (!searchQuery.trim()) {
			return courseworkSelections;
		}

		const query = searchQuery.toLowerCase();
		return courseworkSelections.filter(
			(c) => c.title.toLowerCase().includes(query) || c.courseName.toLowerCase().includes(query)
		);
	});

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
		} catch (err) {
			console.error('[ShareMultipleCourseworkDialog] Error fetching classes:', err);
			toaster.error('Erreur lors du chargement des classes');
		} finally {
			fetchingClasses = false;
		}
	}

	/**
	 * Fetch categories for selected classes (aggregated)
	 */
	async function fetchCategories() {
		if (selectedClassIds.size === 0) {
			categories = [];
			return;
		}

		loadingCategories = true;
		try {
			// Fetch categories for all selected classes
			const promises = Array.from(selectedClassIds).map(async (classId) => {
				const response = await fetch(`/api/teacher/categories/${classId}`);
				if (!response.ok) {
					return [];
				}
				const data = await response.json();
				return data.categories || [];
			});

			const results = await Promise.all(promises);

			// Aggregate unique categories
			const categoryMap = new SvelteMap<string, Category>();
			for (const classCats of results) {
				for (const cat of classCats) {
					categoryMap.set(cat.id, cat);
				}
			}

			categories = Array.from(categoryMap.values()).sort((a, b) => a.displayOrder - b.displayOrder);
		} catch (err) {
			console.error('[ShareMultipleCourseworkDialog] Error fetching categories:', err);
			categories = [];
		} finally {
			loadingCategories = false;
		}
	}

	/**
	 * Fetch topics for Google Classroom (all topics across teacher's courses)
	 */
	async function fetchTopics() {
		loadingTopics = true;
		try {
			const response = await fetch('/api/google/topics');
			if (!response.ok) {
				throw new Error('Failed to fetch topics');
			}

			const data = await response.json();
			topics = data.topics || [];
		} catch (err) {
			console.error('[ShareMultipleCourseworkDialog] Error fetching topics:', err);
			topics = [];
		} finally {
			loadingTopics = false;
		}
	}

	/**
	 * Bulk share coursework with selected classes
	 */
	async function handleShare() {
		if (!hasChanges) return;

		submitting = true;

		try {
			const selectedCoursework = courseworkSelections.filter((c) => c.selected);

			const response = await fetch('/api/google/coursework/bulk-share', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					courseworkIds: selectedCoursework.map((c) => c.id),
					classIds: Array.from(selectedClassIds),
					categoryId: !useTopics && categoryId ? categoryId : null,
					topicId: useTopics && topicId ? topicId : null,
					descriptionOverride: descriptionOverride.trim() || null,
					visible: visible
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Échec du partage');
			}

			const result = await response.json();

			toaster.success(
				`${result.courseworkShared} travail${result.courseworkShared > 1 ? 'aux' : ''} partagé${result.courseworkShared > 1 ? 's' : ''} (${result.sharesCreated} partage${result.sharesCreated > 1 ? 's' : ''})`
			);
			onSuccess();
			onClose();
		} catch (err) {
			console.error('[ShareMultipleCourseworkDialog] Error sharing:', err);
			if (err instanceof Error) {
				toaster.error(err.message);
			} else {
				toaster.error('Erreur lors du partage');
			}
		} finally {
			submitting = false;
		}
	}

	/**
	 * Toggle coursework selection
	 */
	function handleCourseworkToggle(courseworkId: string) {
		const coursework = courseworkSelections.find((c) => c.id === courseworkId);
		if (!coursework) return;

		coursework.selected = !coursework.selected;
	}

	/**
	 * Select/deselect all coursework
	 */
	function toggleAllCoursework() {
		const allSelected = courseworkSelections.every((c) => c.selected);
		courseworkSelections.forEach((c) => {
			c.selected = !allSelected;
		});
	}

	/**
	 * Toggle class selection
	 */
	function handleClassToggle(classId: string) {
		if (selectedClassIds.has(classId)) {
			selectedClassIds.delete(classId);
		} else {
			selectedClassIds.add(classId);
		}

		// Fetch categories when classes change and using categories mode
		if (!useTopics) {
			fetchCategories();
		}
	}

	/**
	 * Toggle all classes selection
	 */
	function toggleAllClasses() {
		if (allClassesSelected) {
			selectedClassIds.clear();
		} else {
			classes.forEach((c) => {
				selectedClassIds.add(c.id);
			});
		}

		// Fetch categories when classes change and using categories mode
		if (!useTopics) {
			fetchCategories();
		}
	}

	/**
	 * Toggle between Topics and Categories
	 */
	function toggleOrganizationMode() {
		useTopics = !useTopics;

		// Reset selections when switching modes
		categoryId = '';
		topicId = '';

		// Fetch categories if switching to categories mode
		if (!useTopics) {
			fetchCategories();
		}
	}

	// ============================================================================
	// Render Helpers
	// ============================================================================

	function getCategoryItems() {
		return [
			{ value: '', label: 'Aucune catégorie' },
			...categories.map((cat) => ({
				value: cat.id,
				label: cat.icon ? `${cat.icon} ${cat.name}` : cat.name
			}))
		];
	}

	function getTopicItems() {
		return [
			{ value: '', label: 'Aucun sujet' },
			...topics.map((topic) => ({
				value: topic.id,
				label: topic.name
			}))
		];
	}

	function formatWorkType(workType: string): string {
		const types: Record<string, string> = {
			ASSIGNMENT: 'Devoir',
			SHORT_ANSWER_QUESTION: 'Question courte',
			MULTIPLE_CHOICE_QUESTION: 'QCM',
			COURSE_WORK_TYPE_UNSPECIFIED: 'Non spécifié'
		};
		return types[workType] || workType;
	}

	function formatDueDate(dueDate?: string): string {
		if (!dueDate) return '';
		try {
			const date = new Date(dueDate);
			return date.toLocaleDateString('fr-FR', {
				day: 'numeric',
				month: 'short',
				year: 'numeric'
			});
		} catch {
			return '';
		}
	}
</script>

<Dialog.Root open={true} onOpenChange={onClose}>
	<Dialog.Content class="max-h-[90vh] max-w-4xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Partager plusieurs travaux</Dialog.Title>
			<Dialog.Description>
				Sélectionnez les travaux et les classes avec lesquelles les partager
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

		<div class="space-y-6 py-4">
			<!-- Coursework Selection Section -->
			<Card.Root>
				<Card.Header>
					<Card.Title>1. Sélectionnez les travaux</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="flex items-center justify-between">
						<Button size="sm" variant="outline" onclick={toggleAllCoursework}>
							{allCourseworkSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
						</Button>
						<span class="text-sm text-muted-foreground">
							{selectedCourseworkCount} sélectionné{selectedCourseworkCount > 1 ? 's' : ''}
						</span>
					</div>

					<!-- Search input -->
					<div class="relative">
						<Search
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							type="text"
							placeholder="Rechercher par titre ou cours..."
							bind:value={searchQuery}
							class="pl-9"
						/>
					</div>

					<!-- Coursework list with checkboxes -->
					<div class="max-h-60 space-y-2 overflow-y-auto">
						{#each filteredCoursework as coursework (coursework.id)}
							<div
								class={`rounded-md border p-3 transition-colors ${
									coursework.selected
										? 'border-primary bg-primary/5'
										: 'border-border hover:bg-muted/50'
								}`}
							>
								<MyCheckbox
									checked={coursework.selected}
									label={coursework.title}
									onCheckedChange={() => handleCourseworkToggle(coursework.id)}
								/>
								<div class="mt-1 ml-6 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
									<span>{coursework.courseName}</span>
									<span>•</span>
									<span>{formatWorkType(coursework.workType)}</span>
									{#if coursework.dueDate}
										<span>•</span>
										<span>Échéance: {formatDueDate(coursework.dueDate)}</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>

					{#if filteredCoursework.length === 0}
						<p class="py-4 text-center text-sm text-muted-foreground">
							Aucun travail trouvé pour "{searchQuery}"
						</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Class Selection Section -->
			<Card.Root>
				<Card.Header>
					<Card.Title>2. Sélectionnez les classes</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#if fetchingClasses}
						<div class="space-y-3">
							<div class="h-20 animate-pulse rounded-lg bg-muted"></div>
							<div class="h-20 animate-pulse rounded-lg bg-muted"></div>
							<div class="h-20 animate-pulse rounded-lg bg-muted"></div>
						</div>
					{:else if classes.length === 0}
						<div class="py-8 text-center text-muted-foreground">
							<p>Aucune classe disponible</p>
							<p class="text-sm">Créez une classe pour partager du contenu</p>
						</div>
					{:else}
						<div class="flex items-center justify-between">
							<Button size="sm" variant="outline" onclick={toggleAllClasses}>
								{allClassesSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
							</Button>
							<span class="text-sm text-muted-foreground">
								{selectedClassCount} sélectionnée{selectedClassCount > 1 ? 's' : ''}
							</span>
						</div>

						<div class="max-h-60 space-y-2 overflow-y-auto">
							{#each classes as cls (cls.id)}
								<div
									class={`rounded-md border p-3 transition-colors ${
										selectedClassIds.has(cls.id)
											? 'border-primary bg-primary/5'
											: 'border-border hover:bg-muted/50'
									}`}
								>
									<MyCheckbox
										checked={selectedClassIds.has(cls.id)}
										label={cls.name}
										onCheckedChange={() => handleClassToggle(cls.id)}
									/>
									{#if cls.studentCount !== undefined}
										<p class="mt-1 ml-6 text-xs text-muted-foreground">
											{cls.studentCount} élève{cls.studentCount > 1 ? 's' : ''}
										</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Configuration Options -->
			{#if hasChanges}
				<Card.Root>
					<Card.Header>
						<Card.Title>3. Options de partage</Card.Title>
						<p class="text-sm text-muted-foreground">
							Ces options s'appliquent à tous les travaux sélectionnés
						</p>
					</Card.Header>
					<Card.Content class="space-y-4">
						<!-- Visibility Toggle -->
						<div>
							<MyCheckbox
								bind:checked={visible}
								label="Visible pour les élèves"
								disabled={submitting}
							/>
							<p class="mt-1 ml-6 text-xs text-muted-foreground">
								Les élèves pourront voir ces travaux immédiatement
							</p>
						</div>

						<!-- Organization Mode Toggle -->
						<div class="space-y-2">
							<Label>Organisation</Label>
							<div class="flex gap-2" role="group" aria-label="Mode d'organisation">
								<Button
									size="sm"
									variant={useTopics ? 'default' : 'outline'}
									onclick={() => {
										if (!useTopics) {
											toggleOrganizationMode();
										}
									}}
									role="radio"
									aria-checked={useTopics}
									disabled={submitting}
								>
									Par sujet Google
								</Button>
								<Button
									size="sm"
									variant={!useTopics ? 'default' : 'outline'}
									onclick={() => {
										if (useTopics) {
											toggleOrganizationMode();
										}
									}}
									role="radio"
									aria-checked={!useTopics}
									disabled={submitting}
								>
									Par catégorie UbuMaths
								</Button>
							</div>
						</div>

						{#if useTopics}
							<!-- Topic Selection -->
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
									Organisez les travaux dans un sujet Google Classroom
								</p>
							</div>
						{:else}
							<!-- Category Selection -->
							<div class="space-y-2">
								<Label for="category">Catégorie UbuMaths (optionnel)</Label>
								{#if loadingCategories}
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
									Organisez les travaux dans une catégorie spécifique
								</p>
							</div>
						{/if}

						<!-- Custom Description -->
						<div class="space-y-2">
							<Label for="description">Description personnalisée (optionnel)</Label>
							<Textarea
								id="description"
								bind:value={descriptionOverride}
								placeholder="Remplace la description originale de tous les travaux..."
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
		</div>

		<Dialog.Footer>
			<div class="flex w-full items-center justify-between gap-4">
				<p class="text-sm text-muted-foreground">
					{selectedCourseworkCount} × {selectedClassCount} = {totalShares}
					partage{totalShares > 1 ? 's' : ''}
				</p>
				<div class="flex gap-2">
					<Button variant="outline" onclick={onClose} disabled={submitting}>Annuler</Button>
					<Button onclick={handleShare} disabled={!hasChanges || submitting}>
						{#if submitting}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Partage en cours...
						{:else}
							Partager {selectedCourseworkCount} travail{selectedCourseworkCount > 1 ? 'aux' : ''}
						{/if}
					</Button>
				</div>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
