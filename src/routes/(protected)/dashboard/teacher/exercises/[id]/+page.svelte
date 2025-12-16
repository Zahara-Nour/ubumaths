<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import ExerciseForm from '$lib/components/exercises/ExerciseForm.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Users, Braces, Copy, Check } from 'lucide-svelte';
	import CodeViewer from '$lib/components/CodeViewer.svelte';
	import type { Database } from '$lib/types/database';
	import type { PageData } from './$types';

	type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];

	let { data }: { data: PageData } = $props();

	let submitting = $state(false);
	let jsonDialogOpen = $state(false);
	let copied = $state(false);

	// Format JSON for display
	let formattedJson = $derived(JSON.stringify(data.exercise, null, 2));

	/**
	 * Copy JSON to clipboard
	 */
	async function copyJson() {
		try {
			await navigator.clipboard.writeText(formattedJson);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			toaster.error('Erreur lors de la copie');
		}
	}

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
	<div class="mb-6 flex items-start justify-between">
		<div class="flex items-center gap-3">
			<div>
				<h1 class="text-3xl font-bold">Modifier l'exercice</h1>
				<p class="text-muted-foreground">
					{data.exercise.title || '(Sans titre)'}
				</p>
			</div>
			<!-- Debug JSON Button -->
			<Button
				variant="ghost"
				size="icon"
				onclick={() => (jsonDialogOpen = true)}
				title="Voir le JSON"
				class="text-muted-foreground hover:text-foreground"
			>
				<Braces class="h-5 w-5" />
			</Button>
		</div>

		<!-- Assignments Quick Access -->
		{#if data.assignmentCount > 0}
			<Card.Root class="w-64">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Users class="h-5 w-5 text-muted-foreground" />
							<div>
								<div class="text-sm font-medium">Assignations</div>
								<div class="text-xs text-muted-foreground">
									{data.assignmentCount} active{data.assignmentCount > 1 ? 's' : ''}
								</div>
							</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							href="/dashboard/teacher/exercises/{data.exercise.id}/assign"
						>
							Gérer
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<Button variant="outline" href="/dashboard/teacher/exercises/{data.exercise.id}/assign">
				<Users class="mr-2 h-4 w-4" />
				Assigner
			</Button>
		{/if}
	</div>

	<ExerciseForm
		exercise={data.exercise}
		onsubmit={handleUpdate}
		{submitting}
		supabase={data.supabase}
		userId={data.user?.id}
	/>
</div>

<!-- JSON Debug Dialog -->
<Dialog.Root bind:open={jsonDialogOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-5xl">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Braces class="h-5 w-5" />
				JSON de l'exercice
			</Dialog.Title>
			<Dialog.Description class="flex items-center justify-between">
				<span>Donnees brutes importees de la base de donnees</span>
				<Button variant="outline" size="sm" onclick={copyJson}>
					{#if copied}
						<Check class="mr-1 h-4 w-4 text-green-500" />
						Copié
					{:else}
						<Copy class="mr-1 h-4 w-4" />
						Copier
					{/if}
				</Button>
			</Dialog.Description>
		</Dialog.Header>

		<CodeViewer value={formattedJson} language="json" height="60vh" label="JSON de l'exercice" />
	</Dialog.Content>
</Dialog.Root>
