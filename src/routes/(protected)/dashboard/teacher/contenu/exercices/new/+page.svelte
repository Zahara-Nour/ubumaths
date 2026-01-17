<script lang="ts">
	import { goto } from '$app/navigation';
	import ExerciseForm from '$lib/components/exercises/ExerciseForm.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { Database } from '$lib/types/database';
	import type { PageData } from './$types';

	type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];

	let { data }: { data: PageData } = $props();

	let submitting = $state(false);

	/**
	 * Create new exercise
	 */
	async function handleCreate(data: Partial<ExerciseInsert>) {
		submitting = true;

		try {
			const response = await fetch('/api/exercises', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Erreur lors de la création');
			}

			const result = await response.json();
			toaster.success('Exercice créé avec succès');
			goto(`/dashboard/teacher/contenu/exercices/${result.exercise.id}`);
		} catch (error) {
			console.error('Error creating exercise:', error);
			toaster.error(
				error instanceof Error ? error.message : "Erreur lors de la création de l'exercice"
			);
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Nouvel exercice - UbuMaths</title>
</svelte:head>

<div class="container mx-auto py-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold">Nouvel exercice</h1>
		<p class="text-muted-foreground">Créez un nouvel exercice avec support LaTeX</p>
	</div>

	<ExerciseForm
		onsubmit={handleCreate}
		{submitting}
		supabase={data.supabase}
		userId={data.user?.id}
	/>
</div>
