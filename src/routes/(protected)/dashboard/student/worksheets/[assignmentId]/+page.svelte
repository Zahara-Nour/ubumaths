<script lang="ts">
	import WorksheetHeader from '$lib/components/student/worksheets/WorksheetHeader.svelte';
	import ExerciseListItem from '$lib/components/student/worksheets/ExerciseListItem.svelte';
	import ExerciseModal from '$lib/components/student/worksheets/ExerciseModal.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Derived values
	let worksheet = $derived(data.worksheet);
	let exercises = $derived(worksheet.exercises ?? []);
	let exerciseCount = $derived(exercises.length);

	// Modal state
	let modalOpen = $state(false);
	let currentExerciseIndex = $state(0);

	function openExercise(index: number) {
		currentExerciseIndex = index;
		modalOpen = true;
	}

	function handleNavigate(index: number) {
		currentExerciseIndex = index;
	}

	function handleOpenChange(open: boolean) {
		modalOpen = open;
	}
</script>

<svelte:head>
	<title>{worksheet.title} | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Breadcrumb -->
	<nav class="mb-6 text-sm text-muted-foreground" aria-label="Fil d'Ariane">
		<ol class="flex items-center gap-2">
			<li>
				<a href="/dashboard/student/worksheets" class="hover:text-foreground hover:underline">
					Mes Feuilles de Travail
				</a>
			</li>
			<li aria-hidden="true">/</li>
			<li class="truncate font-medium text-foreground" aria-current="page">
				{worksheet.title}
			</li>
		</ol>
	</nav>

	<!-- Header -->
	<WorksheetHeader {worksheet} />

	<!-- Exercises Section -->
	<section class="mt-8">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold">
				Exercices ({exerciseCount})
			</h2>
		</div>

		<Separator class="mb-6" />

		{#if exercises.length === 0}
			<!-- Empty State -->
			<Card.Root class="border-dashed">
				<Card.Content class="flex min-h-48 items-center justify-center p-6">
					<p class="text-center text-muted-foreground">
						Aucun exercice disponible pour cette fiche.
					</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<!-- Exercise List -->
			<div class="space-y-3">
				{#each exercises as exercise, i (exercise.id)}
					<ExerciseListItem {exercise} index={i + 1} onclick={() => openExercise(i)} />
				{/each}
			</div>
		{/if}
	</section>
</div>

<!-- Exercise Modal -->
<ExerciseModal
	{exercises}
	currentIndex={currentExerciseIndex}
	open={modalOpen}
	onOpenChange={handleOpenChange}
	onNavigate={handleNavigate}
/>
