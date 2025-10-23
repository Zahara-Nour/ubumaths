<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Plus } from 'lucide-svelte';
	import AssessmentCard from '$lib/components/assessments/AssessmentCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Filter assessments by status
	let drafts = $derived(data.assessments.filter((a) => a.status === 'draft'));
	let published = $derived(data.assessments.filter((a) => a.status === 'published'));
	let archived = $derived(data.assessments.filter((a) => a.status === 'archived'));

	function handleCreateNew() {
		goto('/dashboard/teacher/assessments/new');
	}

	function handleEdit(assessmentId: string) {
		goto(`/dashboard/teacher/assessments/${assessmentId}/edit`);
	}

	function handleAssign(assessmentId: string) {
		goto(`/dashboard/teacher/assessments/${assessmentId}/assign`);
	}

	function handleViewResults(assessmentId: string) {
		goto(`/dashboard/teacher/assessments/${assessmentId}/results`);
	}
</script>

<svelte:head>
	<title>Mes Évaluations | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Mes Évaluations</h1>
			<p class="mt-2 text-muted-foreground">Créez et gérez vos évaluations pour vos classes</p>
		</div>
		<Button onclick={handleCreateNew}>
			<Plus class="mr-2 h-4 w-4" />
			Nouvelle évaluation
		</Button>
	</div>

	<!-- Tabs -->
	<Tabs.Root value="published" class="space-y-6">
		<Tabs.List class="grid w-full grid-cols-3">
			<Tabs.Trigger value="drafts">
				Brouillons
				{#if drafts.length > 0}
					<span class="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs dark:bg-yellow-900">
						{drafts.length}
					</span>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="published">
				Publiées
				{#if published.length > 0}
					<span class="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs dark:bg-green-900">
						{published.length}
					</span>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="archived">
				Archivées
				{#if archived.length > 0}
					<span class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
						{archived.length}
					</span>
				{/if}
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Drafts Tab -->
		<Tabs.Content value="drafts" class="space-y-4">
			{#if drafts.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<p>Aucun brouillon</p>
					<p class="mt-2 text-sm">Les évaluations non publiées apparaîtront ici</p>
				</div>
			{:else}
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each drafts as assessment (assessment.id)}
						<AssessmentCard
							{assessment}
							variant="teacher"
							onEdit={() => handleEdit(assessment.id)}
						/>
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<!-- Published Tab -->
		<Tabs.Content value="published" class="space-y-4">
			{#if published.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<p>Aucune évaluation publiée</p>
					<p class="mt-2 text-sm">Créez une évaluation pour commencer</p>
					<Button onclick={handleCreateNew} class="mt-4">
						<Plus class="mr-2 h-4 w-4" />
						Créer une évaluation
					</Button>
				</div>
			{:else}
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each published as assessment (assessment.id)}
						<AssessmentCard
							{assessment}
							variant="teacher"
							onAssign={() => handleAssign(assessment.id)}
							onViewResults={() => handleViewResults(assessment.id)}
						/>
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<!-- Archived Tab -->
		<Tabs.Content value="archived" class="space-y-4">
			{#if archived.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<p>Aucune évaluation archivée</p>
				</div>
			{:else}
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each archived as assessment (assessment.id)}
						<AssessmentCard {assessment} variant="teacher" />
					{/each}
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>
