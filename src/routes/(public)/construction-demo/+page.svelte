<script lang="ts">
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';

	let PlayerComponent = $state<Component | null>(null);

	onMount(async () => {
		const mod = await import('$lib/constructions-v2/components/ConstructionPlayer.svelte');
		PlayerComponent = mod.default;
	});

	const demoScript = `# Demo: triangle equilateral avec mediatrice
@instruction("Placer le point A")
A = point(0, 0)

@instruction("Placer le point B")
@instrument("regle")
B = point(4, 0)

@instruction("Tracer le segment [AB]")
segment(A, B)

@pause(300)
@instruction("Construire le triangle equilateral")
@instrument("compas")
T = triangle_equilateral(A, B)

@pause(300)
@instruction("Tracer la mediatrice de [AB]")
@cacher
(M, d) = mediatrice(A, B)

@pause(500)
@instruction("Construction terminee !")`;
</script>

<svelte:head>
	<title>Demo Construction v2</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4">
	<h1 class="mb-4 text-2xl font-bold">Demo Construction v2</h1>
	<p class="mb-4 text-muted-foreground">
		Test du nouveau module de constructions geometriques animees, base sur geometry-core et le DSL.
	</p>

	{#if PlayerComponent}
		<PlayerComponent
			script={demoScript}
			title="Triangle equilateral avec mediatrice"
			width={700}
			height={500}
			showGrid={true}
		/>
	{:else}
		<div class="flex h-[500px] w-[700px] items-center justify-center rounded-md border">
			<p class="text-muted-foreground">Chargement...</p>
		</div>
	{/if}

	<details class="mt-4">
		<summary class="cursor-pointer text-sm text-muted-foreground">Voir le script DSL</summary>
		<pre class="mt-2 rounded-md bg-muted p-4 text-xs">{demoScript}</pre>
	</details>
</div>
