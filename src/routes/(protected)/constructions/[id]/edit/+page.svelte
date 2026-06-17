<script lang="ts">
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { goto } from '$app/navigation';
	import { ArrowLeft } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	// Snapshot for $state inits below.
	// svelte-ignore state_referenced_locally
	const initialData = data;

	let EditorComponent = $state<Component | null>(null);

	onMount(async () => {
		const mod = await import('$lib/constructions-v2/components/ScriptEditor.svelte');
		EditorComponent = mod.default;
	});

	let title = $state(initialData.construction.title);
	let description = $state(initialData.construction.description ?? '');
	let isPublic = $state(initialData.construction.is_public ?? false);
	let isSaving = $state(false);
	let script = $state(initialData.construction.dsl_script ?? '');

	let isDsl = $derived(data.construction.format === 'dsl');

	async function handleSave() {
		if (!title.trim()) {
			toaster.error('Le titre est requis');
			return;
		}

		isSaving = true;
		try {
			const body: Record<string, unknown> = {
				title: title.trim(),
				description: description.trim() || undefined,
				is_public: isPublic
			};

			if (isDsl) {
				body.dsl_script = script;
			}

			const response = await fetch(`/api/constructions/${data.construction.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (response.ok) {
				toaster.success('Construction mise a jour');
				goto(`/constructions/${data.construction.id}`);
			} else {
				const result = await response.json();
				toaster.error(result.message || 'Erreur lors de la mise a jour');
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
	<title>Modifier - {data.construction.title} - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-4 sm:p-6">
	<Button variant="ghost" href="/constructions/{data.construction.id}" class="mb-4 w-fit">
		<ArrowLeft class="mr-2 h-4 w-4" />
		Retour a la construction
	</Button>

	<h1 class="mb-6 text-2xl font-bold">Modifier la construction</h1>

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

	<!-- Script editor (DSL only) -->
	{#if isDsl}
		{#if EditorComponent}
			<EditorComponent bind:value={script} width={500} height={400} onSave={handleSave} />
		{:else}
			<div class="flex h-[400px] items-center justify-center rounded-md border">
				<p class="text-muted-foreground">Chargement de l'editeur...</p>
			</div>
		{/if}
	{:else}
		<div class="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
			Cette construction utilise l'ancien format JSON. L'edition du script n'est pas disponible dans
			ce mode. Vous pouvez modifier le titre, la description et la visibilite.
		</div>
	{/if}

	<!-- Save button -->
	<div class="mt-4 flex justify-end">
		<Button onclick={handleSave} disabled={isSaving || !title.trim()}>
			{isSaving ? 'Enregistrement...' : 'Enregistrer'}
		</Button>
	</div>
</div>
