<script lang="ts">
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { goto } from '$app/navigation';
	import { ArrowLeft } from '@lucide/svelte';

	let EditorComponent = $state<Component | null>(null);

	onMount(async () => {
		const mod = await import('$lib/constructions-v2/components/ScriptEditor.svelte');
		EditorComponent = mod.default;
	});

	let title = $state('');
	let description = $state('');
	let isPublic = $state(false);
	let isSaving = $state(false);
	let script = $state(`# Nouvelle construction
A = point(0, 0)
B = point(4, 0)
segment(A, B)
`);

	async function handleSave() {
		if (!title.trim()) {
			toaster.error('Le titre est requis');
			return;
		}

		isSaving = true;
		try {
			const response = await fetch('/api/constructions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					description: description.trim() || undefined,
					format: 'dsl',
					dsl_script: script,
					is_public: isPublic
				})
			});

			if (response.ok) {
				const result = await response.json();
				toaster.success('Construction creee');
				goto(`/constructions/${result.construction.id}`);
			} else {
				const result = await response.json();
				toaster.error(result.message || 'Erreur lors de la creation');
			}
		} catch (err: unknown) {
			console.error('Save error:', err);
			toaster.error('Erreur de connexion');
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Nouvelle construction - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-4 sm:p-6">
	<Button variant="ghost" href="/constructions" class="mb-4 w-fit">
		<ArrowLeft class="mr-2 h-4 w-4" />
		Retour aux constructions
	</Button>

	<h1 class="mb-6 text-2xl font-bold">Nouvelle construction DSL</h1>

	<!-- Metadata form -->
	<div class="mb-6 grid gap-4 sm:grid-cols-2">
		<div>
			<Label for="title">Titre</Label>
			<Input id="title" bind:value={title} placeholder="Ma construction" class="mt-1" />
		</div>
		<div>
			<Label for="description">Description (optionnelle)</Label>
			<Input id="description" bind:value={description} placeholder="Description..." class="mt-1" />
		</div>
	</div>

	<div class="mb-4 flex items-center gap-2">
		<input type="checkbox" id="public" bind:checked={isPublic} class="rounded" />
		<Label for="public">Rendre publique</Label>
	</div>

	<!-- Script editor -->
	{#if EditorComponent}
		<EditorComponent bind:value={script} width={500} height={400} onSave={handleSave} />
	{:else}
		<div class="flex h-[400px] items-center justify-center rounded-md border">
			<p class="text-muted-foreground">Chargement de l'editeur...</p>
		</div>
	{/if}

	<!-- Save button -->
	<div class="mt-4 flex justify-end">
		<Button onclick={handleSave} disabled={isSaving || !title.trim()}>
			{isSaving ? 'Enregistrement...' : 'Enregistrer'}
		</Button>
	</div>
</div>
