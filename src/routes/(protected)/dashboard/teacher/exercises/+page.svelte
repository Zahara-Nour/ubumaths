<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
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
	import { Send, Pencil, Trash2, Loader2, ArrowUp, ArrowDown } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Filter state
	let searchQuery = $state(data.filters.search);
	let selectedDifficulty = $state(data.filters.difficulty?.toString() || '');
	let selectedTopic = $state(data.filters.topic);

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
		data.exercises.forEach((ex) => selectedExercises.add(ex.id));
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
			await invalidateAll();
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
		if (selectedExercises.size === data.exercises.length) {
			clearSelection();
		} else {
			selectAll();
		}
	}

	/**
	 * Apply filters to URL
	 */
	function applyFilters() {
		const params = new URLSearchParams($page.url.searchParams);

		if (searchQuery) {
			params.set('search', searchQuery);
		} else {
			params.delete('search');
		}

		if (selectedDifficulty) {
			params.set('difficulty', selectedDifficulty);
		} else {
			params.delete('difficulty');
		}

		if (selectedTopic) {
			params.set('topic', selectedTopic);
		} else {
			params.delete('topic');
		}

		// Reset to page 1 when filtering
		params.set('page', '1');

		goto(`?${params.toString()}`, { keepFocus: true });
	}

	/**
	 * Clear all filters
	 */
	function clearFilters() {
		searchQuery = '';
		selectedDifficulty = '';
		selectedTopic = '';
		goto('/dashboard/teacher/exercises', { keepFocus: true });
	}

	/**
	 * Toggle sort order
	 */
	function toggleSortOrder() {
		const params = new URLSearchParams($page.url.searchParams);
		const newOrder = data.sortOrder === 'desc' ? 'asc' : 'desc';
		if (newOrder === 'desc') {
			params.delete('sort');
		} else {
			params.set('sort', 'asc');
		}
		goto(`?${params.toString()}`, { keepFocus: true });
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

				<!-- Topic -->
				<div class="space-y-2">
					<Label for="topic">Thème</Label>
					<Input
						id="topic"
						type="text"
						placeholder="Algèbre, Géométrie..."
						bind:value={selectedTopic}
					/>
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
			{data.pagination.total} exercice{data.pagination.total > 1 ? 's' : ''} trouvé{data.pagination
				.total > 1
				? 's'
				: ''}
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
								checked={selectedExercises.size === data.exercises.length &&
									data.exercises.length > 0}
								onchange={toggleSelectAll}
								class="h-4 w-4 cursor-pointer"
							/>
						</Table.Head>
						<Table.Head>Titre</Table.Head>
						<Table.Head>Source</Table.Head>
						<Table.Head>Difficulté</Table.Head>
						<Table.Head>Thème</Table.Head>
						<Table.Head>Tags</Table.Head>
						<Table.Head>
							<button
								onclick={toggleSortOrder}
								class="flex items-center gap-1 hover:text-foreground"
							>
								Modifié le
								{#if data.sortOrder === 'desc'}
									<ArrowDown class="h-4 w-4" />
								{:else}
									<ArrowUp class="h-4 w-4" />
								{/if}
							</button>
						</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if data.exercises.length === 0}
						<Table.Row>
							<Table.Cell colspan={8} class="py-8 text-center text-muted-foreground">
								Aucun exercice trouvé. Créez votre premier exercice !
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each data.exercises as exercise (exercise.id)}
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
								<Table.Cell>{exercise.source || '-'}</Table.Cell>
								<Table.Cell>
									<Badge variant={getDifficultyVariant(exercise.difficulty)}>
										{getDifficultyLabel(exercise.difficulty)}
									</Badge>
								</Table.Cell>
								<Table.Cell>{exercise.topic || '-'}</Table.Cell>
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
	{#if data.pagination.totalPages > 1}
		<div class="flex items-center justify-center gap-2">
			<Button
				variant="outline"
				disabled={data.pagination.page === 1}
				onclick={() => {
					const params = new URLSearchParams($page.url.searchParams);
					params.set('page', String(data.pagination.page - 1));
					goto(`?${params.toString()}`);
				}}
			>
				Précédent
			</Button>
			<span class="text-sm text-muted-foreground">
				Page {data.pagination.page} sur {data.pagination.totalPages}
			</span>
			<Button
				variant="outline"
				disabled={data.pagination.page === data.pagination.totalPages}
				onclick={() => {
					const params = new URLSearchParams($page.url.searchParams);
					params.set('page', String(data.pagination.page + 1));
					goto(`?${params.toString()}`);
				}}
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
