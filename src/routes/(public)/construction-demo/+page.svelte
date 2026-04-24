<script lang="ts">
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';

	let EditorComponent = $state<Component | null>(null);

	onMount(async () => {
		const mod = await import('$lib/constructions-v2/components/ScriptEditor.svelte');
		EditorComponent = mod.default;
	});

	let script = $state(`# Triangle equilateral avec mediatrice
@instruction("Placer les points A et B")
A = point(0, 0)
B = point(4, 0)

@instruction("Tracer le segment [AB]")
segment(A, B)

@pause(300)
@instruction("Construire le triangle equilateral")
T = triangle_equilateral(A, B)

@pause(300)
@instruction("Tracer la mediatrice de [AB]")
(M, d) = mediatrice(A, B)

@pause(500)
@instruction("Construction terminee !")
`);
</script>

<svelte:head>
	<title>Demo Construction v2</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-4">
	<h1 class="mb-4 text-2xl font-bold">Demo Construction v2</h1>
	<p class="mb-3 text-sm text-muted-foreground">
		Editez le script a gauche, l'apercu se met a jour en temps reel. Cliquez "Jouer" pour lancer
		l'animation a droite.
	</p>

	{#if EditorComponent}
		<EditorComponent bind:value={script} width={500} height={450} />
	{:else}
		<div class="flex h-[450px] items-center justify-center rounded-md border">
			<p class="text-muted-foreground">Chargement de l'editeur...</p>
		</div>
	{/if}
</div>
