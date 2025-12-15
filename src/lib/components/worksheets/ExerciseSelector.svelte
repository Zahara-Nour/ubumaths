<!--
	ExerciseSelector Component
	==========================

	A dialog-based component for selecting exercises to add to worksheets.
	Features search, filters, pagination, and exercise preview.

	Features:
	- Search exercises by title (debounced)
	- Filter by difficulty, grade levels, and tags
	- Display results in a list with compact preview
	- Select multiple exercises
	- Full exercise preview in modal
	- Returns selected exercises to parent

	Usage:
	```svelte
	<script lang="ts">
	  import ExerciseSelector from '$lib/components/worksheets/ExerciseSelector.svelte';

	  let selectedIds = $state<string[]>([]);

	  function handleSelect(exercises: Exercise[]) {
	    // Handle selected exercises
	  }
	</script>

	<ExerciseSelector
	  onSelect={handleSelect}
	  selectedIds={selectedIds}
	  limit={10}
	/>
	```
-->
<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import {
		Search,
		Filter,
		Plus,
		Eye,
		Loader2,
		FileText,
		ChevronLeft,
		ChevronRight,
		X
	} from 'lucide-svelte';
	import { formatGradeShort } from '$lib/utils/grades';
	import type { GradeCode } from '$lib/types/grades';
	import type { Exercise } from '$lib/exercises/types';
	import ExercisePreview from './ExercisePreview.svelte';

	// Types
	interface ExerciseListItem extends Exercise {
		is_public?: boolean;
	}

	interface PaginationInfo {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	}

	// Props
	interface Props {
		onSelect: (exercises: Exercise[]) => void;
		selectedIds?: string[];
		limit?: number;
		open?: boolean;
	}

	let { onSelect, selectedIds = [], limit, open = $bindable(false) }: Props = $props();

	// State
	let exercises = $state<ExerciseListItem[]>([]);
	let pagination = $state<PaginationInfo>({ page: 1, limit: 20, total: 0, totalPages: 0 });
	let isLoading = $state(false);
	let loadError = $state<string | null>(null);

	// Filter state
	let searchQuery = $state('');
	let selectedDifficulty = $state<string>('');
	let selectedGrades = $state<string>('');
	let selectedTags = $state<string>('');
	let showFilters = $state(false);

	// Selection state - using SvelteMap for reactivity
	let selectedExercises = new SvelteMap<string, Exercise>();

	// Preview state
	let previewExercise = $state<Exercise | null>(null);
	let showPreview = $state(false);

	// Debounce timer
	let searchTimer: ReturnType<typeof setTimeout>;

	// Filter options
	const difficultyOptions = [
		{ value: '', label: 'Toutes' },
		{ value: '1', label: 'Facile' },
		{ value: '2', label: 'Moyen' },
		{ value: '3', label: 'Difficile' }
	];

	// Derived values
	let selectionCount = $derived(selectedExercises.size);
	let canSelectMore = $derived(limit === undefined || selectionCount < limit);
	let hasActiveFilters = $derived(
		selectedDifficulty !== '' || selectedGrades !== '' || selectedTags !== ''
	);

	/**
	 * Fetch exercises from API
	 */
	async function fetchExercises(page = 1): Promise<void> {
		isLoading = true;
		loadError = null;

		try {
			const params = new URLSearchParams();
			params.set('page', page.toString());
			params.set('limit', '20');

			if (searchQuery.trim()) {
				params.set('search', searchQuery.trim());
			}
			if (selectedDifficulty) {
				params.set('difficulty', selectedDifficulty);
			}
			if (selectedGrades) {
				params.set('grade_levels', selectedGrades);
			}
			if (selectedTags) {
				params.set('tags', selectedTags);
			}

			const response = await fetch(`/api/exercises?${params.toString()}`);
			if (!response.ok) {
				throw new Error('Failed to fetch exercises');
			}

			const data = await response.json();
			exercises = data.exercises;
			pagination = data.pagination;
		} catch (err) {
			console.error('Error fetching exercises:', err);
			loadError = 'Impossible de charger les exercices';
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Handle search input with debounce
	 */
	function handleSearchInput(value: string): void {
		searchQuery = value;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			fetchExercises(1);
		}, 400);
	}

	/**
	 * Apply filters immediately
	 */
	function applyFilters(): void {
		fetchExercises(1);
	}

	/**
	 * Clear all filters
	 */
	function clearFilters(): void {
		searchQuery = '';
		selectedDifficulty = '';
		selectedGrades = '';
		selectedTags = '';
		fetchExercises(1);
	}

	/**
	 * Toggle exercise selection
	 * SvelteMap is automatically reactive, no need for self-assignment
	 */
	function toggleExercise(exercise: Exercise): void {
		if (selectedExercises.has(exercise.id)) {
			selectedExercises.delete(exercise.id);
		} else if (canSelectMore) {
			selectedExercises.set(exercise.id, exercise);
		}
	}

	/**
	 * Check if exercise is selected
	 */
	function isSelected(exerciseId: string): boolean {
		return selectedExercises.has(exerciseId) || selectedIds.includes(exerciseId);
	}

	/**
	 * Check if exercise is already in worksheet
	 */
	function isAlreadyAdded(exerciseId: string): boolean {
		return selectedIds.includes(exerciseId);
	}

	/**
	 * Open exercise preview
	 */
	function openPreview(exercise: Exercise): void {
		previewExercise = exercise;
		showPreview = true;
	}

	/**
	 * Close preview
	 */
	function closePreview(): void {
		showPreview = false;
		previewExercise = null;
	}

	/**
	 * Confirm selection and call onSelect callback
	 */
	function confirmSelection(): void {
		const selected = Array.from(selectedExercises.values());
		onSelect(selected);
		// Clear selection after confirming
		selectedExercises.clear();
		open = false;
	}

	/**
	 * Cancel and close dialog
	 */
	function cancelSelection(): void {
		selectedExercises.clear();
		open = false;
	}

	/**
	 * Handle dialog open state change
	 */
	function handleOpenChange(isOpen: boolean): void {
		if (isOpen) {
			// Reset state when opening
			selectedExercises.clear();
			searchQuery = '';
			selectedDifficulty = '';
			selectedGrades = '';
			selectedTags = '';
			fetchExercises(1);
		}
		open = isOpen;
	}

	/**
	 * Navigate to page
	 */
	function goToPage(page: number): void {
		if (page >= 1 && page <= pagination.totalPages) {
			fetchExercises(page);
		}
	}

	/**
	 * Get difficulty badge variant
	 */
	function getDifficultyVariant(difficulty: number): 'default' | 'secondary' | 'destructive' {
		if (difficulty === 1) return 'default';
		if (difficulty === 2) return 'secondary';
		return 'destructive';
	}

	/**
	 * Get difficulty label
	 */
	function getDifficultyLabel(difficulty: number): string {
		if (difficulty === 1) return 'Facile';
		if (difficulty === 2) return 'Moyen';
		return 'Difficile';
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			clearTimeout(searchTimer);
		};
	});
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline" class="gap-2">
				<Plus class="h-4 w-4" />
				Ajouter des exercices
			</Button>
		{/snippet}
	</Dialog.Trigger>

	<Dialog.Content class="max-h-[90vh] max-w-4xl overflow-hidden">
		<Dialog.Header>
			<Dialog.Title>Selectionner des exercices</Dialog.Title>
			<Dialog.Description>
				{#if limit}
					{selectionCount} / {limit} exercice(s) selectionne(s)
				{:else if selectionCount > 0}
					{selectionCount} exercice(s) selectionne(s)
				{:else}
					Recherchez et selectionnez les exercices a ajouter
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-4 overflow-hidden">
			<!-- Search and filters -->
			<div class="space-y-3">
				<div class="flex gap-2">
					<!-- Search input -->
					<div class="relative flex-1">
						<Search
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							type="text"
							placeholder="Rechercher par titre..."
							value={searchQuery}
							oninput={(e) => handleSearchInput(e.currentTarget.value)}
							class="pl-10"
						/>
					</div>

					<!-- Filter toggle -->
					<Button
						variant="outline"
						size="icon"
						onclick={() => (showFilters = !showFilters)}
						class="relative"
						aria-label="Afficher les filtres"
					>
						<Filter class="h-4 w-4" />
						{#if hasActiveFilters}
							<span class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary"></span>
						{/if}
					</Button>
				</div>

				<!-- Expandable filters -->
				{#if showFilters}
					<Card.Root>
						<Card.Content class="pt-4">
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<div class="space-y-2">
									<Label>Difficulte</Label>
									<MySelect
										type="single"
										bind:value={selectedDifficulty}
										items={difficultyOptions}
									/>
								</div>

								<div class="space-y-2">
									<Label>Niveaux (ex: 6,5,4)</Label>
									<Input
										type="text"
										placeholder="6,5,4,3"
										bind:value={selectedGrades}
										onblur={applyFilters}
									/>
								</div>

								<div class="space-y-2">
									<Label>Tags (ex: algebre,equations)</Label>
									<Input
										type="text"
										placeholder="algebre,equations"
										bind:value={selectedTags}
										onblur={applyFilters}
									/>
								</div>
							</div>

							<div class="mt-4 flex justify-between">
								<Button variant="ghost" size="sm" onclick={clearFilters}>
									Effacer les filtres
								</Button>
								<Button size="sm" onclick={applyFilters}>Appliquer</Button>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>

			<Separator />

			<!-- Exercise list -->
			<div class="max-h-[400px] min-h-[300px] overflow-y-auto">
				{#if isLoading}
					<div class="flex items-center justify-center py-12">
						<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				{:else if loadError}
					<div class="py-8 text-center">
						<p class="text-destructive">{loadError}</p>
						<Button variant="outline" size="sm" onclick={() => fetchExercises(1)} class="mt-4">
							Reessayer
						</Button>
					</div>
				{:else if exercises.length === 0}
					<div class="py-12 text-center text-muted-foreground">
						<FileText class="mx-auto h-12 w-12 opacity-50" />
						<p class="mt-2">Aucun exercice trouve</p>
						{#if hasActiveFilters || searchQuery}
							<Button variant="link" size="sm" onclick={clearFilters}>Effacer les filtres</Button>
						{/if}
					</div>
				{:else}
					<div class="space-y-2">
						{#each exercises as exercise (exercise.id)}
							{@const alreadyAdded = isAlreadyAdded(exercise.id)}
							{@const selected = isSelected(exercise.id)}
							{@const disabled = alreadyAdded || (!selected && !canSelectMore)}

							<div
								class="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 {selected &&
								!alreadyAdded
									? 'border-primary bg-primary/5'
									: ''} {alreadyAdded ? 'opacity-60' : ''}"
							>
								<!-- Checkbox -->
								<div class="pt-1">
									<Checkbox
										checked={selected}
										onCheckedChange={() => toggleExercise(exercise)}
										{disabled}
										aria-label="Selectionner {exercise.title || 'exercice'}"
									/>
								</div>

								<!-- Content -->
								<div class="min-w-0 flex-1">
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<h4 class="truncate font-medium text-foreground">
												{exercise.title || '(Sans titre)'}
											</h4>
											<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
												{exercise.statement_md.slice(0, 150)}{exercise.statement_md.length > 150
													? '...'
													: ''}
											</p>
										</div>

										<!-- Preview button -->
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 shrink-0"
											onclick={() => openPreview(exercise)}
											aria-label="Apercu de l'exercice"
										>
											<Eye class="h-4 w-4" />
										</Button>
									</div>

									<!-- Metadata -->
									<div class="mt-2 flex flex-wrap items-center gap-2">
										<Badge variant={getDifficultyVariant(exercise.difficulty)}>
											{getDifficultyLabel(exercise.difficulty)}
										</Badge>

										{#if exercise.variables && exercise.variables.length > 0}
											<Badge variant="outline">Parametrable</Badge>
										{/if}

										{#if exercise.grade_levels && exercise.grade_levels.length > 0}
											{#each exercise.grade_levels.slice(0, 2) as grade (grade)}
												<Badge variant="outline" class="text-xs">
													{formatGradeShort(grade as GradeCode)}
												</Badge>
											{/each}
											{#if exercise.grade_levels.length > 2}
												<span class="text-xs text-muted-foreground">
													+{exercise.grade_levels.length - 2}
												</span>
											{/if}
										{/if}

										{#if alreadyAdded}
											<Badge variant="secondary">Deja ajoute</Badge>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Pagination -->
			{#if pagination.totalPages > 1}
				<div class="flex items-center justify-between border-t pt-4">
					<p class="text-sm text-muted-foreground">
						Page {pagination.page} sur {pagination.totalPages} ({pagination.total} exercices)
					</p>
					<div class="flex gap-2">
						<Button
							variant="outline"
							size="icon"
							disabled={pagination.page <= 1}
							onclick={() => goToPage(pagination.page - 1)}
							aria-label="Page precedente"
						>
							<ChevronLeft class="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							disabled={pagination.page >= pagination.totalPages}
							onclick={() => goToPage(pagination.page + 1)}
							aria-label="Page suivante"
						>
							<ChevronRight class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/if}
		</div>

		<Dialog.Footer class="gap-2 sm:gap-0">
			<Button variant="outline" onclick={cancelSelection}>Annuler</Button>
			<Button onclick={confirmSelection} disabled={selectionCount === 0}>
				Ajouter {selectionCount} exercice(s)
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Exercise Preview Dialog -->
<Dialog.Root bind:open={showPreview}>
	<Dialog.Content class="max-h-[90vh] max-w-3xl overflow-hidden">
		<Dialog.Header>
			<div class="flex items-center justify-between">
				<Dialog.Title>Apercu de l'exercice</Dialog.Title>
				<Button variant="ghost" size="icon" onclick={closePreview} class="h-8 w-8">
					<X class="h-4 w-4" />
				</Button>
			</div>
		</Dialog.Header>

		<div class="max-h-[70vh] overflow-y-auto">
			{#if previewExercise}
				<ExercisePreview exercise={previewExercise} />
			{/if}
		</div>

		<Dialog.Footer>
			{#if previewExercise && !isAlreadyAdded(previewExercise.id)}
				{@const selected = isSelected(previewExercise.id)}
				<Button
					variant={selected ? 'secondary' : 'default'}
					onclick={() => {
						if (previewExercise) toggleExercise(previewExercise);
					}}
					disabled={!selected && !canSelectMore}
				>
					{selected ? 'Retire de la selection' : 'Ajouter a la selection'}
				</Button>
			{/if}
			<Button variant="outline" onclick={closePreview}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
