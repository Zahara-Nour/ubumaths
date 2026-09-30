<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Plus } from '@lucide/svelte';
	import EvaluationCard from '$lib/components/assessments/EvaluationCard.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { refreshPageData, submitAction } from '$lib/utils/form-action';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Évaluations par statut
	let drafts = $derived(data.evaluations.filter((a) => a.status === 'draft'));
	let published = $derived(data.evaluations.filter((a) => a.status === 'published'));
	let archived = $derived(data.evaluations.filter((a) => a.status === 'archived'));

	// Une évaluation se crée depuis une série (page « Séries »)
	function handleCreateNew() {
		goto('/dashboard/teacher/series').then(() => {});
	}

	async function handlePublish(evaluationId: string) {
		const formData = new FormData();
		formData.set('id', evaluationId);
		const outcome = await submitAction('?/publish', formData);
		if (!outcome.ok) {
			toaster.error(outcome.message);
			return;
		}
		toaster.success('Évaluation publiée');
		await refreshPageData();
	}

	function handleEdit(evaluationId: string) {
		goto(`/dashboard/teacher/assessments/${evaluationId}/edit`).then(() => {});
	}

	function handleAssign(evaluationId: string) {
		goto(`/dashboard/teacher/assessments/${evaluationId}/assign`).then(() => {});
	}

	function handleViewResults(evaluationId: string) {
		goto(`/dashboard/teacher/assessments/${evaluationId}/results`).then(() => {});
	}
</script>

<svelte:head>
	<title>Mes Évaluations | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Mes Évaluations</h1>
			<p class="mt-2 text-muted-foreground">
				Créez et gérez vos évaluations pour vos {lore.entities.class}s
			</p>
		</div>
		<Button onclick={handleCreateNew}>
			<Plus class="mr-2 h-4 w-4" />
			Nouvelle évaluation (depuis une série)
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
					{#each drafts as evaluation (evaluation.id)}
						<EvaluationCard
							{evaluation}
							variant="teacher"
							onEdit={() => handleEdit(evaluation.id)}
							onPublish={() => handlePublish(evaluation.id)}
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
					{#each published as evaluation (evaluation.id)}
						<EvaluationCard
							{evaluation}
							variant="teacher"
							onAssign={() => handleAssign(evaluation.id)}
							onViewResults={() => handleViewResults(evaluation.id)}
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
					{#each archived as evaluation (evaluation.id)}
						<EvaluationCard {evaluation} variant="teacher" />
					{/each}
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>
