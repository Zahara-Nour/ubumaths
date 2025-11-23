<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Badge } from '$lib/components/ui/badge';
	import { toaster } from '$lib/stores/toaster.svelte';
	import ExportDialog from '$lib/components/exercises/ExportDialog.svelte';
	import ImportDialog from '$lib/components/exercises/ImportDialog.svelte';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog/ConfirmDialog.svelte';
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import { Send, Pencil, Trash2, Loader2, ArrowUp, ArrowDown } from 'lucide-svelte';
	import type { PageData } from './$types';
	import type { GradeCode } from '$lib/types/grades';
	import { formatGradeShort } from '$lib/utils/grades';

	let { data }: { data: PageData } = $props();

	// Local state for exercises (allows fetch-based updates)
	let exercises = $state(data.exercises);
	let pagination = $state(data.pagination);
	let sortBy = $state<'title' | 'updated_at'>(data.sortBy || 'updated_at');
	let sortOrder = $state<'asc' | 'desc'>(data.sortOrder || 'desc');
	let isLoading = $state(false);

	// Filter state
	let searchQuery = $state(data.filters.search);
	let selectedDifficulty = $state(data.filters.difficulty?.toString() || '');
	let selectedGradeLevels = $state<GradeCode[]>((data.filters.grade_levels || []) as GradeCode[]);

	// Delete confirmation
	let deletingId = $state<string | null>(null);
	let deleteDialogOpen = $state(false);
	let exerciseToDelete = $state<{ id: string; title: string } | null>(null);

	// Export/Import state
	let selectedExercises = new SvelteSet<string>();
	let exportDialogOpen = $state(false);
	let importDialogOpen = $state(false);

	/**
	 * Toggle exercise selection
	 */
	function toggleExercise(id: string) {
		if (selectedExercises.has(id)) {
			selectedExercises.delete(id);
		} else {
			selectedExercises.add(id);
		}
	}

	/**
	 * Select all exercises
	 */
	function selectAll() {
		selectedExercises.clear();
		exercises.forEach((ex) => selectedExercises.add(ex.id));
	}

	/**
	 * Clear selection
	 */
	function clearSelection() {
		selectedExercises.clear();
	}

	/**
	 * Open delete confirmation dialog
	 */
	function openDeleteDialog(exercise: { id: string; title: string }) {
		exerciseToDelete = exercise;
		deleteDialogOpen = true;
	}

	/**
	 * Handle delete confirmation
	 */
	async function handleDelete() {
		if (!exerciseToDelete) return;

		deletingId = exerciseToDelete.id;
		deleteDialogOpen = false;

		const formData = new FormData();
		formData.append('exercise_id', exerciseToDelete.id);

		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			toaster.success('Exercice supprimé');
			// Refresh exercises list via fetch
			await fetchExercises(pagination.page);
		} else {
			toaster.error('Erreur lors de la suppression');
		}

		deletingId = null;
		exerciseToDelete = null;
	}

	/**
	 * Toggle all selection
	 */
	function toggleSelectAll() {
		if (selectedExercises.size === exercises.length) {
			clearSelection();
		} else {
			selectAll();
		}
	}

	/**
	 * Build URL params from current filter/sort state
	 */
	function buildParams(page = 1): URLSearchParams {
		const params = new URLSearchParams();

		if (searchQuery) params.set('search', searchQuery);
		if (selectedDifficulty) params.set('difficulty', selectedDifficulty);
		if (selectedGradeLevels.length > 0) params.set('grade_levels', selectedGradeLevels.join(','));
		if (sortBy !== 'updated_at') params.set('sortBy', sortBy);
		if (sortOrder !== 'desc') params.set('order', sortOrder);
		if (page > 1) params.set('page', String(page));

		return params;
	}

	/**
	 * Update browser URL without navigation
	 */
	function updateUrl(params: URLSearchParams) {
		const url = params.toString()
			? `${window.location.pathname}?${params.toString()}`
			: window.location.pathname;
		history.replaceState({}, '', url);
	}

	/**
	 * Fetch exercises via API
	 */
	async function fetchExercises(page = 1) {
		isLoading = true;

		const params = buildParams(page);
		updateUrl(params);

		try {
			const response = await fetch(`/api/teacher/exercises?${params.toString()}`);
			if (!response.ok) throw new Error('Failed to fetch');

			const result = await response.json();
			exercises = result.exercises;
			pagination = result.pagination;
		} catch (err) {
			console.error('Error fetching exercises:', err);
			toaster.error('Erreur lors du chargement des exercices');
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Apply filters (fetch-based)
	 */
	function applyFilters() {
		fetchExercises(1);
	}

	/**
	 * Clear all filters
	 */
	function clearFilters() {
		searchQuery = '';
		selectedDifficulty = '';
		selectedGradeLevels = [];
		fetchExercises(1);
	}

	/**
	 * Toggle sort on a column
	 */
	function toggleSort(column: 'title' | 'updated_at') {
		if (sortBy === column) {
			// Same column: toggle order
			sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
		} else {
			// Different column: switch to it with desc order
			sortBy = column;
			sortOrder = 'desc';
		}
		fetchExercises(1);
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

	/**
	 * Format date
	 */
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Banque d'exercices - UbuMaths</title>
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Banque d'exercices</h1>
			<p class="text-muted-foreground">Gérez vos exercices de mathématiques avec support LaTeX</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" onclick={() => (importDialogOpen = true)}>Importer</Button>
			<Button href="/dashboard/teacher/exercises/new">Nouvel exercice</Button>
		</div>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Filtres</Card.Title>
		</Card.Header>
		<Card.Content>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					applyFilters();
				}}
				class="grid gap-4 md:grid-cols-4"
			>
				<!-- Search -->
				<div class="space-y-2">
					<Label for="search">Recherche</Label>
					<Input
						id="search"
						type="text"
						placeholder="Titre ou source..."
						bind:value={searchQuery}
					/>
				</div>

				<!-- Difficulty -->
				<div class="space-y-2">
					<Label for="difficulty">Difficulté</Label>
					<select
						id="difficulty"
						bind:value={selectedDifficulty}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="">Toutes</option>
						<option value="1">Facile</option>
						<option value="2">Moyen</option>
						<option value="3">Difficile</option>
					</select>
				</div>

				<!-- Grade Level -->
				<div class="space-y-2">
					<Label>Niveau</Label>
					<GradeBadgeSelector bind:value={selectedGradeLevels} placeholder="Tous niveaux" />
				</div>

				<!-- Actions -->
				<div class="flex items-end gap-2">
					<Button type="submit" class="flex-1">Filtrer</Button>
					<Button type="button" variant="outline" onclick={clearFilters}>Effacer</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Results count & Actions -->
	<div class="flex items-center justify-between">
		<div class="text-sm text-muted-foreground">
			{#if isLoading}
				Chargement...
			{:else}
				{pagination.total} exercice{pagination.total > 1 ? 's' : ''} trouvé{pagination.total > 1
					? 's'
					: ''}
			{/if}
		</div>
		{#if selectedExercises.size > 0}
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">
					{selectedExercises.size} sélectionné{selectedExercises.size > 1 ? 's' : ''}
				</span>
				<Button variant="outline" size="sm" onclick={() => (exportDialogOpen = true)}>
					Exporter
				</Button>
				<Button variant="ghost" size="sm" onclick={clearSelection}>Désélectionner</Button>
			</div>
		{/if}
	</div>

	<!-- Exercises table -->
	<Card.Root>
		<Card.Content class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-12">
							<input
								type="checkbox"
								checked={selectedExercises.size === exercises.length && exercises.length > 0}
								onchange={toggleSelectAll}
								class="h-4 w-4 cursor-pointer"
							/>
						</Table.Head>
						<Table.Head>
							<button
								onclick={() => toggleSort('title')}
								class="flex items-center gap-1 hover:text-foreground"
							>
								Titre
								{#if sortBy === 'title'}
									{#if sortOrder === 'desc'}
										<ArrowDown class="h-4 w-4" />
									{:else}
										<ArrowUp class="h-4 w-4" />
									{/if}
								{/if}
							</button>
						</Table.Head>
						<Table.Head>Difficulté</Table.Head>
						<Table.Head>Niveau</Table.Head>
						<Table.Head>Tags</Table.Head>
						<Table.Head>
							<button
								onclick={() => toggleSort('updated_at')}
								class="flex items-center gap-1 hover:text-foreground"
							>
								Modifié le
								{#if sortBy === 'updated_at'}
									{#if sortOrder === 'desc'}
										<ArrowDown class="h-4 w-4" />
									{:else}
										<ArrowUp class="h-4 w-4" />
									{/if}
								{/if}
							</button>
						</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if exercises.length === 0}
						<Table.Row>
							<Table.Cell colspan={7} class="py-8 text-center text-muted-foreground">
								Aucun exercice trouvé. Créez votre premier exercice !
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each exercises as exercise (exercise.id)}
							<Table.Row>
								<Table.Cell>
									<input
										type="checkbox"
										checked={selectedExercises.has(exercise.id)}
										onchange={() => toggleExercise(exercise.id)}
										class="h-4 w-4 cursor-pointer"
									/>
								</Table.Cell>
								<Table.Cell class="font-medium">
									{exercise.title || '(Sans titre)'}
								</Table.Cell>
								<Table.Cell>
									<Badge variant={getDifficultyVariant(exercise.difficulty)}>
										{getDifficultyLabel(exercise.difficulty)}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-wrap gap-1">
										{#if exercise.grade_levels && exercise.grade_levels.length > 0}
											{#each exercise.grade_levels.slice(0, 3) as grade (grade)}
												<Badge variant="secondary" class="text-xs">{formatGradeShort(grade)}</Badge>
											{/each}
											{#if exercise.grade_levels.length > 3}
												<Badge variant="secondary" class="text-xs">
													+{exercise.grade_levels.length - 3}
												</Badge>
											{/if}
										{:else}
											<span class="text-sm text-muted-foreground">-</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-wrap gap-1">
										{#if exercise.tags && exercise.tags.length > 0}
											{#each exercise.tags.slice(0, 3) as tag (tag)}
												<Badge variant="outline" class="text-xs">{tag}</Badge>
											{/each}
											{#if exercise.tags.length > 3}
												<Badge variant="outline" class="text-xs">
													+{exercise.tags.length - 3}
												</Badge>
											{/if}
										{:else}
											<span class="text-sm text-muted-foreground">-</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell class="text-sm text-muted-foreground">
									{formatDate(exercise.updated_at)}
								</Table.Cell>
								<Table.Cell class="text-right">
									<Tooltip.Provider>
										<div class="flex justify-end gap-1">
											<Tooltip.Root>
												<Tooltip.Trigger>
													<Button
														size="icon"
														variant="ghost"
														href="/dashboard/teacher/exercises/{exercise.id}/assign"
														class="h-8 w-8"
													>
														<Send class="h-4 w-4" />
														<span class="sr-only">Assigner</span>
													</Button>
												</Tooltip.Trigger>
												<Tooltip.Content>
													<p>Assigner</p>
												</Tooltip.Content>
											</Tooltip.Root>
											<Tooltip.Root>
												<Tooltip.Trigger>
													<Button
														size="icon"
														variant="ghost"
														href="/dashboard/teacher/exercises/{exercise.id}"
														class="h-8 w-8"
													>
														<Pencil class="h-4 w-4" />
														<span class="sr-only">Modifier</span>
													</Button>
												</Tooltip.Trigger>
												<Tooltip.Content>
													<p>Modifier</p>
												</Tooltip.Content>
											</Tooltip.Root>
											<Tooltip.Root>
												<Tooltip.Trigger>
													<Button
														size="icon"
														variant="ghost"
														onclick={() =>
															openDeleteDialog({
																id: exercise.id,
																title: exercise.title || '(Sans titre)'
															})}
														disabled={deletingId === exercise.id}
														class="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
													>
														{#if deletingId === exercise.id}
															<Loader2 class="h-4 w-4 animate-spin" />
														{:else}
															<Trash2 class="h-4 w-4" />
														{/if}
														<span class="sr-only">Supprimer</span>
													</Button>
												</Tooltip.Trigger>
												<Tooltip.Content>
													<p>Supprimer</p>
												</Tooltip.Content>
											</Tooltip.Root>
										</div>
									</Tooltip.Provider>
								</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>

	<!-- Pagination -->
	{#if pagination.totalPages > 1}
		<div class="flex items-center justify-center gap-2">
			<Button
				variant="outline"
				disabled={pagination.page === 1 || isLoading}
				onclick={() => fetchExercises(pagination.page - 1)}
			>
				Précédent
			</Button>
			<span class="text-sm text-muted-foreground">
				Page {pagination.page} sur {pagination.totalPages}
			</span>
			<Button
				variant="outline"
				disabled={pagination.page === pagination.totalPages || isLoading}
				onclick={() => fetchExercises(pagination.page + 1)}
			>
				Suivant
			</Button>
		</div>
	{/if}
</div>

<!-- Export/Import Dialogs -->
<ExportDialog exerciseIds={Array.from(selectedExercises)} bind:open={exportDialogOpen} />
<ImportDialog bind:open={importDialogOpen} onSuccess={() => clearSelection()} />

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Supprimer cet exercice ?"
	description={`Vous allez supprimer l'exercice "${exerciseToDelete?.title || ''}". Cette action est irréversible.`}
	confirmLabel="Supprimer"
	variant="destructive"
	onConfirm={handleDelete}
/>
