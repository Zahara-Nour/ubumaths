<!--
	Student Riddles Page
	====================
	Display riddle of the day and assigned riddles
-->

<script lang="ts">
	import type { PageData } from './$types';
	import RiddleOfTheDayCard from '$lib/components/riddles/RiddleOfTheDayCard.svelte';
	import RiddleCard from '$lib/components/riddles/RiddleCard.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Sparkles, BookOpen } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Énigmes - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-4 sm:p-6">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="flex items-center gap-2 text-3xl font-bold">
			<Sparkles class="h-8 w-8 text-primary" />
			Énigmes Mathématiques
		</h1>
		<p class="mt-2 text-muted-foreground">Résous l'énigme du jour et gagne des gidouilles !</p>
	</div>

	<!-- Riddle of the Day -->
	{#if data.riddleOfTheDay && data.riddleOfTheDayDate}
		<div class="mb-8">
			<RiddleOfTheDayCard
				riddle={data.riddleOfTheDay}
				assignmentDate={data.riddleOfTheDayDate}
				studentAttempt={data.studentAttempt}
			/>
		</div>
	{:else}
		<Card.Root class="mb-8 border-dashed">
			<Card.Content class="flex flex-col items-center justify-center gap-4 py-12">
				<Sparkles class="h-16 w-16 text-muted-foreground/50" />
				<div class="text-center">
					<h3 class="text-lg font-semibold">Pas d'énigme du jour aujourd'hui</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						Reviens demain pour une nouvelle énigme !
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Assigned Riddles -->
	{#if data.assignments && data.assignments.length > 0}
		<div class="space-y-4">
			<div class="flex items-center gap-2">
				<BookOpen class="h-6 w-6 text-primary" />
				<h2 class="text-2xl font-semibold">Énigmes assignées</h2>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				{#each data.assignments as assignment (assignment.id)}
					{#if assignment.riddle}
						<!-- @ts-expect-error showActions is a valid prop but not in type definition -->
						<RiddleCard riddle={assignment.riddle} mode="display" showActions={true} />
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>
