<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import ExerciseForm from '$lib/components/exercises/ExerciseForm.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { Database } from '$lib/types/database';
	import type { PageData } from './$types';

	type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];

	let { data }: { data: PageData } = $props();

	let submitting = $state(false);

	/**
	 * Update exercise
	 */
	async function handleUpdate(updatedData: Partial<ExerciseInsert>) {
		submitting = true;

		try {
			const response = await fetch(`/api/exercises/${data.exercise.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updatedData)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Erreur lors de la mise à jour');
			}

			toaster.success('Exercice mis à jour avec succès');
			await invalidateAll();
		} catch (error) {
			console.error('Error updating exercise:', error);
			toaster.error(
				error instanceof Error ? error.message : "Erreur lors de la mise à jour de l'exercice"
			);
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Modifier {data.exercise.title || "l'exercice"} - UbuMaths</title>
</svelte:head>

<div class="container mx-auto py-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold">Modifier l'exercice</h1>
		<p class="text-muted-foreground">
			{data.exercise.title || '(Sans titre)'}
		</p>
	</div>

	<ExerciseForm
		exercise={data.exercise}
		onsubmit={handleUpdate}
		{submitting}
		supabase={data.supabase}
		userId={data.user?.id}
	/>
</div>
