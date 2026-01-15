<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import ConsentButton from '$lib/components/ConsentButton.svelte';
	import * as Card from '$lib/components/ui/card';
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { formatUserError, logNonCriticalError } from '$lib/utils/errors';
	import { formatDeadlineFull, getDeadlineStatus } from '$lib/utils/dates';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// State
	let showSolution = $state(false);
	let isCompleted = $state(!!data.completion?.completed_at);
	let loading = $state(false);

	// Track view on mount
	onMount(async () => {
		try {
			await fetch(`/api/exercises/${data.exercise.id}/view`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					assignment_id: data.assignment?.id
				})
			});
		} catch (err) {
			// Silent fail - view tracking is not critical
			logNonCriticalError('Exercise view tracking', err);
		}
	});

	// Toggle completion
	async function toggleCompletion() {
		loading = true;

		try {
			if (isCompleted) {
				// Mark as incomplete
				const response = await fetch(`/api/exercises/${data.exercise.id}/complete`, {
					method: 'DELETE'
				});

				if (!response.ok) {
					const result = await response.json();
					throw new Error(result.error || 'Échec de mise à jour');
				}

				isCompleted = false;
				toaster.success('Marqué comme non complété');
			} else {
				// Mark as complete
				const response = await fetch(`/api/exercises/${data.exercise.id}/complete`, {
					method: 'POST'
				});

				if (!response.ok) {
					const result = await response.json();
					throw new Error(result.error || 'Échec de mise à jour');
				}

				isCompleted = true;
				toaster.success('Exercice complété ! 🎉');
			}
		} catch (err) {
			toaster.error(formatUserError(err));
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{data.exercise.title || 'Exercice'} | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6">
		<Button variant="ghost" onclick={() => goto('/dashboard/student/exercises')}>
			← Retour aux exercices
		</Button>
	</div>

	<!-- Assignment info -->
	{#if data.assignment}
		<Card.Root class="mb-6">
			<Card.Header>
				<Card.Title>Informations d'assignation</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="space-y-3">
					{#if data.assignment.notes}
						<div>
							<p class="text-sm font-medium">Note du professeur :</p>
							<p class="mt-1 text-sm text-muted-foreground italic">{data.assignment.notes}</p>
						</div>
					{/if}

					{#if data.assignment.optional_deadline}
						{@const status = getDeadlineStatus(data.assignment.optional_deadline)}
						<div>
							<p class="text-sm font-medium">Échéance :</p>
							<p
								class="mt-1 text-sm font-medium"
								class:text-red-600={status === 'passed'}
								class:dark:text-red-400={status === 'passed'}
								class:text-orange-600={status === 'soon'}
								class:dark:text-orange-400={status === 'soon'}
								class:text-muted-foreground={status === 'normal'}
							>
								{formatDeadlineFull(data.assignment.optional_deadline)}
								{#if status === 'passed'}
									(échue)
								{:else if status === 'soon'}
									(bientôt)
								{/if}
							</p>
						</div>
					{/if}

					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<span>Assigné le {formatDeadlineFull(data.assignment.assigned_at)}</span>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Exercise Display -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<Card.Title class="text-2xl">{data.exercise.title || 'Exercice'}</Card.Title>

					{#if data.exercise.tags && data.exercise.tags.length > 0}
						<div class="mt-2 flex flex-wrap gap-1">
							{#each data.exercise.tags as tag, idx (idx)}
								<span class="rounded bg-secondary px-2 py-1 text-xs">{tag}</span>
							{/each}
						</div>
					{/if}

					<!-- Exercise metadata -->
					<div class="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
						<span>Difficulté: {data.exercise.difficulty}/3</span>

						{#if data.exercise.grades && data.exercise.grades.length > 0}
							<span>Niveaux: {data.exercise.grades.join(', ')}</span>
						{/if}
					</div>
				</div>

				<!-- Completion toggle (requires consent) -->
				<div class="flex gap-2">
					<ConsentButton
						variant={isCompleted ? 'default' : 'outline'}
						onclick={toggleCompletion}
						disabled={loading}
					>
						{loading ? '...' : isCompleted ? '✓ Complété' : 'Marquer comme complété'}
					</ConsentButton>
				</div>
			</div>
		</Card.Header>

		<Card.Content>
			<!-- Exercise content with instance generation -->
			<ExerciseDisplay
				exercise={data.exercise}
				mode="instance"
				userId={data.userId}
				groupId={data.classIds[0]}
				bind:showSolution
			/>
		</Card.Content>
	</Card.Root>
</div>
