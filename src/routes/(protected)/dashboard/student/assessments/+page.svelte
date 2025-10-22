<script lang="ts">
	import { goto } from '$app/navigation';
	import AssessmentCard from '$lib/components/assessments/AssessmentCard.svelte';
	import * as Card from '$lib/components/ui/card';
	import { FileQuestion } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Group assignments by status
	let toDo = $derived(
		data.assignments.filter(
			(a) => a.status === 'not_started' || a.status === 'in_progress'
		)
	);
	let completed = $derived(data.assignments.filter((a) => a.status === 'completed'));
	let expired = $derived(data.assignments.filter((a) => a.status === 'expired'));

	function handleStart(assignmentId: string) {
		goto(`/automaths/test?assignment=${assignmentId}&mode=interactive`);
	}

	function handleViewResults(assignmentId: string) {
		goto(`/dashboard/student/assessments/${assignmentId}/results`);
	}
</script>

<svelte:head>
	<title>Mes Évaluations | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold tracking-tight">Mes Évaluations</h1>
		<p class="text-muted-foreground mt-2">Vos évaluations assignées par vos professeurs</p>
	</div>

	<!-- To Do Section -->
	{#if toDo.length > 0}
		<section class="mb-12">
			<h2 class="text-2xl font-semibold mb-4">À faire</h2>
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each toDo as assignment (assignment.id)}
					<AssessmentCard
						assessment={assignment.assessment}
						variant="student"
						assignmentData={assignment}
						onStart={() => handleStart(assignment.id)}
					/>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Completed Section -->
	{#if completed.length > 0}
		<section class="mb-12">
			<h2 class="text-2xl font-semibold mb-4">Terminées</h2>
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each completed as assignment (assignment.id)}
					<AssessmentCard
						assessment={assignment.assessment}
						variant="student"
						assignmentData={assignment}
						onViewResults={() => handleViewResults(assignment.id)}
					/>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Expired Section -->
	{#if expired.length > 0}
		<section class="mb-12">
			<h2 class="text-2xl font-semibold mb-4 text-muted-foreground">Expirées</h2>
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each expired as assignment (assignment.id)}
					<AssessmentCard
						assessment={assignment.assessment}
						variant="student"
						assignmentData={assignment}
					/>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Empty State -->
	{#if data.assignments.length === 0}
		<Card.Root class="border-dashed">
			<Card.Content class="flex min-h-96 items-center justify-center p-12">
				<div class="text-center">
					<FileQuestion class="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
					<h2 class="text-xl font-semibold text-muted-foreground">Aucune évaluation</h2>
					<p class="mt-2 text-sm text-muted-foreground">
						Vos professeurs n'ont pas encore assigné d'évaluations
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
