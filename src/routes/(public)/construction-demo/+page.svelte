<script lang="ts">
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';

	let EditorComponent = $state<Component | null>(null);
	let PlayerComponent = $state<Component | null>(null);

	onMount(async () => {
		const [editorMod, playerMod] = await Promise.all([
			import('$lib/constructions-v2/components/ScriptEditor.svelte'),
			import('$lib/constructions-v2/components/ConstructionPlayer.svelte')
		]);
		EditorComponent = editorMod.default;
		PlayerComponent = playerMod.default;
	});

	let script = $state(`# Triangle equilateral avec mediatrice
A = point(0, 0)
B = point(4, 0)
segment(A, B)

@instruction("Construire le triangle equilateral")
T = triangle_equilateral(A, B)

@pause(300)
@instruction("Tracer la mediatrice de [AB]")
(M, d) = mediatrice(A, B)
`);

	const playerScript = `# Demo animation
@instruction("Placer le point A")
A = point(0, 0)

@instrument("regle")
@instruction("Placer le point B")
B = point(4, 0)

@instruction("Tracer le segment [AB]")
segment(A, B)

@pause(300)
@instruction("Construire le triangle equilateral")
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

<div class="container mx-auto max-w-6xl p-4">
	<h1 class="mb-4 text-2xl font-bold">Demo Construction v2</h1>

	<!-- Section 1: Script Editor -->
	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">Editeur de script DSL</h2>
		<p class="mb-3 text-sm text-muted-foreground">
			Editez le script a gauche, l'apercu se met a jour en temps reel. Cliquez "Jouer" pour lancer
			l'animation.
		</p>

		{#if EditorComponent}
			<EditorComponent bind:value={script} width={500} height={400} />
		{:else}
			<div class="flex h-[400px] items-center justify-center rounded-md border">
				<p class="text-muted-foreground">Chargement de l'editeur...</p>
			</div>
		{/if}
	</section>

	<!-- Section 2: Player -->
	<section>
		<h2 class="mb-3 text-lg font-semibold">Player d'animation</h2>
		<p class="mb-3 text-sm text-muted-foreground">
			Animation pas-a-pas avec les controles play/pause/step.
		</p>

		{#if PlayerComponent}
			<PlayerComponent
				script={playerScript}
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
	</section>
</div>
