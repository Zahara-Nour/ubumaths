<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import ExerciseSkeleton from '$lib/components/ExerciseSkeleton.svelte';
	import { formatDeadline, isDeadlinePassed, isDeadlineSoon } from '$lib/utils/dates';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Filter state
	let searchQuery = $state(data.filters.search);
	let showCompleted = $state(data.filters.completed);
	let assignedOnly = $state(data.filters.assigned_only);
	let hasDeadline = $state(data.filters.has_deadline);
	let loading = $state(false);

	// Build filter URL
	function applyFilters() {
		loading = true;
		const params = new URLSearchParams();
		if (showCompleted) params.set('completed', 'true');
		if (assignedOnly) params.set('assigned_only', 'true');
		if (hasDeadline) params.set('has_deadline', 'true');
		if (searchQuery) params.set('search', searchQuery);

		goto(`/dashboard/student/exercises?${params.toString()}`).finally(() => {
			loading = false;
		});
	}

	// Sort exercises by deadline urgency
	let sortedExercises = $derived(
		[...data.exercises].sort((a, b) => {
			// Deadlines first
			if (a.assignment?.optional_deadline && !b.assignment?.optional_deadline) return -1;
			if (!a.assignment?.optional_deadline && b.assignment?.optional_deadline) return 1;

			// Then by deadline date
			if (a.assignment?.optional_deadline && b.assignment?.optional_deadline) {
				return (
					new Date(a.assignment.optional_deadline).getTime() -
					new Date(b.assignment.optional_deadline).getTime()
				);
			}

			// Finally by assignment date
			return (
				new Date(b.assignment?.assigned_at || 0).getTime() -
				new Date(a.assignment?.assigned_at || 0).getTime()
			);
		})
	);
</script>

<svelte:head>
	<title>Mes Exercices | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<div class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight">Mes exercices</h1>
		<p class="mt-2 text-muted-foreground">{data.exercises.length} exercice(s) accessible(s)</p>
	</div>

	<!-- Filters -->
	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>Filtres</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<!-- Search -->
				<div>
					<label for="search-input" class="mb-2 block text-sm font-medium">Recherche</label>
					<Input
						id="search-input"
						type="text"
						bind:value={searchQuery}
						placeholder="Titre, tags..."
						onkeydown={(e) => e.key === 'Enter' && applyFilters()}
					/>
				</div>

				<!-- Completed filter -->
				<div class="flex items-center gap-2 pt-6">
					<input
						type="checkbox"
						id="show-completed"
						bind:checked={showCompleted}
						onchange={applyFilters}
						class="h-4 w-4 rounded border-input"
					/>
					<label for="show-completed" class="text-sm">Afficher complétés</label>
				</div>

				<!-- Assigned only filter -->
				<div class="flex items-center gap-2 pt-6">
					<input
						type="checkbox"
						id="assigned-only"
						bind:checked={assignedOnly}
						onchange={applyFilters}
						class="h-4 w-4 rounded border-input"
					/>
					<label for="assigned-only" class="text-sm">Assignés uniquement</label>
				</div>

				<!-- Has deadline filter -->
				<div class="flex items-center gap-2 pt-6">
					<input
						type="checkbox"
						id="has-deadline"
						bind:checked={hasDeadline}
						onchange={applyFilters}
						class="h-4 w-4 rounded border-input"
					/>
					<label for="has-deadline" class="text-sm">Avec échéance</label>
				</div>
			</div>

			<div class="mt-4">
				<Button onclick={applyFilters}>Appliquer les filtres</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Exercise List -->
	{#if loading}
		<ExerciseSkeleton count={5} />
	{:else if sortedExercises.length === 0}
		<Card.Root class="border-dashed">
			<Card.Content class="py-12 text-center">
				<p class="text-muted-foreground">Aucun exercice trouvé</p>
				<p class="mt-2 text-sm text-muted-foreground">
					Modifiez les filtres pour voir plus d'exercices
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid grid-cols-1 gap-4">
			{#each sortedExercises as exercise (exercise.id)}
				{@const deadline = exercise.assignment?.optional_deadline}
				{@const isCompleted = exercise.completion?.completed_at}

				<Card.Root
					class="cursor-pointer transition-shadow hover:shadow-md"
					onclick={() => goto(`/dashboard/student/exercises/${exercise.id}`)}
				>
					<Card.Header>
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1">
								<Card.Title class="text-xl">
									{exercise.title || 'Sans titre'}
								</Card.Title>

								<!-- Tags -->
								{#if exercise.tags && exercise.tags.length > 0}
									<div class="mt-2 flex flex-wrap gap-1">
										{#each exercise.tags.slice(0, 3) as tag, idx (idx)}
											<span class="rounded bg-secondary px-2 py-1 text-xs">
												{tag}
											</span>
										{/each}
									</div>
								{/if}
							</div>

							<!-- Status badges -->
							<div class="flex flex-col items-end gap-2">
								<!-- Completion status -->
								{#if isCompleted}
									<span
										class="rounded bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900 dark:text-green-100"
									>
										✓ Complété
									</span>
								{:else if exercise.completion}
									<span
										class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-100"
									>
										En cours ({exercise.completion.view_count} vue(s))
									</span>
								{/if}

								<!-- Deadline status -->
								{#if deadline}
									<span
										class="rounded px-2 py-1 text-xs"
										class:bg-red-100={isDeadlinePassed(deadline)}
										class:text-red-800={isDeadlinePassed(deadline)}
										class:dark:bg-red-900={isDeadlinePassed(deadline)}
										class:dark:text-red-100={isDeadlinePassed(deadline)}
										class:bg-orange-100={isDeadlineSoon(deadline)}
										class:text-orange-800={isDeadlineSoon(deadline)}
										class:dark:bg-orange-900={isDeadlineSoon(deadline)}
										class:dark:text-orange-100={isDeadlineSoon(deadline)}
										class:bg-blue-100={!isDeadlinePassed(deadline) && !isDeadlineSoon(deadline)}
										class:text-blue-800={!isDeadlinePassed(deadline) && !isDeadlineSoon(deadline)}
										class:dark:bg-blue-900={!isDeadlinePassed(deadline) &&
											!isDeadlineSoon(deadline)}
										class:dark:text-blue-100={!isDeadlinePassed(deadline) &&
											!isDeadlineSoon(deadline)}
									>
										📅 {formatDeadline(deadline)}
									</span>
								{/if}
							</div>
						</div>
					</Card.Header>

					<Card.Content>
						<!-- Teacher notes -->
						{#if exercise.assignment?.notes}
							<div class="mb-3 rounded-md bg-muted p-3">
								<p class="mb-1 text-sm font-medium">Note du professeur :</p>
								<p class="text-sm italic">{exercise.assignment.notes}</p>
							</div>
						{/if}

						<!-- Metadata -->
						<div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
							<span>Difficulté: {exercise.difficulty}/3</span>

							{#if exercise.grades && exercise.grades.length > 0}
								<span>Niveaux: {exercise.grades.join(', ')}</span>
							{/if}

							{#if exercise.distribution_mode === 'per_student'}
								<span class="text-purple-600 dark:text-purple-400">🎲 Personnalisé</span>
							{:else if exercise.distribution_mode === 'on_demand'}
								<span class="text-blue-600 dark:text-blue-400">🔄 À la demande</span>
							{/if}
						</div>
					</Card.Content>

					<Card.Footer>
						<Button
							class="w-full"
							onclick={(e) => {
								e.stopPropagation();
								goto(`/dashboard/student/exercises/${exercise.id}`);
							}}
						>
							{isCompleted ? 'Revoir' : 'Commencer'}
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
