<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { toaster } from '$lib/stores/toaster.svelte';
	import ExportDialog from '$lib/components/exercises/ExportDialog.svelte';
	import ImportDialog from '$lib/components/exercises/ImportDialog.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Filter state
	let searchQuery = $state(data.filters.search);
	let selectedDifficulty = $state(data.filters.difficulty?.toString() || '');
	let selectedTopic = $state(data.filters.topic);

	// Delete confirmation
	let deletingId = $state<string | null>(null);

	// Export/Import state
	let selectedExercises = $state<Set<string>>(new Set());
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
		selectedExercises = selectedExercises; // Trigger reactivity
	}

	/**
	 * Select all exercises
	 */
	function selectAll() {
		selectedExercises = new Set(data.exercises.map((ex) => ex.id));
	}

	/**
	 * Clear selection
	 */
	function clearSelection() {
		selectedExercises = new Set();
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
			<Button
				variant="outline"
				onclick={() => (exportDialogOpen = true)}
				disabled={selectedExercises.size === 0}
			>
				Exporter ({selectedExercises.size})
			</Button>
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

	<!-- Results count & selection -->
	<div class="flex items-center justify-between">
		<div class="text-sm text-muted-foreground">
			{data.pagination.total} exercice{data.pagination.total > 1 ? 's' : ''} trouvé{data.pagination
				.total > 1
				? 's'
				: ''}
		</div>
		{#if selectedExercises.size > 0}
			<Button variant="ghost" size="sm" onclick={clearSelection}>
				Désélectionner ({selectedExercises.size})
			</Button>
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
						<Table.Head>Créé le</Table.Head>
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
									{formatDate(exercise.created_at)}
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										<Button
											size="sm"
											variant="ghost"
											href="/dashboard/teacher/exercises/{exercise.id}/assign"
										>
											Assigner
										</Button>
										<Button
											size="sm"
											variant="outline"
											href="/dashboard/teacher/exercises/{exercise.id}"
										>
											Modifier
										</Button>
										<form
											method="POST"
											action="?/delete"
											use:enhance={() => {
												deletingId = exercise.id;
												return async ({ result, update }) => {
													await update();
													if (result.type === 'success') {
														toaster.success('Exercice supprimé');
														await invalidateAll();
													} else {
														toaster.error('Erreur lors de la suppression');
													}
													deletingId = null;
												};
											}}
										>
											<input type="hidden" name="exercise_id" value={exercise.id} />
											<Button
												size="sm"
												variant="destructive"
												type="submit"
												disabled={deletingId === exercise.id}
											>
												{deletingId === exercise.id ? 'Suppression...' : 'Supprimer'}
											</Button>
										</form>
									</div>
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
