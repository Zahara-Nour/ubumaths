<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showSolution = $state(false);
</script>

<svelte:head>
	<title>{data.exercise.title || 'Exercice'} | UbuMaths</title>
	<meta
		name="description"
		content={data.exercise.statement_md.slice(0, 160).replace(/[#*$]/g, '')}
	/>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6">
		<Button variant="ghost" href="/">← Retour à l'accueil</Button>
	</div>

	<!-- Exercise Card -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<Card.Title class="text-2xl">{data.exercise.title || 'Exercice'}</Card.Title>

					{#if data.exercise.topic}
						<p class="mt-1 text-sm text-muted-foreground">{data.exercise.topic}</p>
					{/if}

					{#if data.exercise.tags && data.exercise.tags.length > 0}
						<div class="mt-2 flex flex-wrap gap-1">
							{#each data.exercise.tags as tag, idx (idx)}
								<span class="rounded bg-secondary px-2 py-1 text-xs">{tag}</span>
							{/each}
						</div>
					{/if}

					<!-- Exercise metadata -->
					<div class="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
						<span>
							Difficulté :
							{#if data.exercise.difficulty === 1}
								Facile
							{:else if data.exercise.difficulty === 2}
								Moyen
							{:else}
								Difficile
							{/if}
						</span>

						{#if data.exercise.grade_levels && data.exercise.grade_levels.length > 0}
							<span>Niveaux : {data.exercise.grade_levels.join(', ')}</span>
						{/if}

						{#if data.exercise.source}
							<span>Source : {data.exercise.source}</span>
						{/if}
					</div>
				</div>
			</div>
		</Card.Header>

		<Card.Content>
			<!-- Exercise content -->
			<ExerciseDisplay exercise={data.exercise} mode="instance" bind:showSolution />
		</Card.Content>
	</Card.Root>

	<!-- Share section -->
	<div class="mt-6 text-center text-sm text-muted-foreground">
		<p>
			Partagez cet exercice :
			<span class="font-mono text-xs"
				>{typeof window !== 'undefined' ? window.location.href : ''}</span
			>
		</p>
	</div>
</div>
