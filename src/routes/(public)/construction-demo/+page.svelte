<script lang="ts">
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';
	import MySelect from '$lib/components/MySelect.svelte';

	let EditorComponent = $state<Component | null>(null);

	onMount(async () => {
		const mod = await import('$lib/constructions-v2/components/ScriptEditor.svelte');
		EditorComponent = mod.default;
	});

	const examples: { label: string; value: string; script: string }[] = [
		{
			label: 'Triangle equilateral',
			value: 'triangle',
			script: `# Triangle equilateral avec mediatrice
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
`
		},
		{
			label: 'Arcs — angles et compas',
			value: 'arcs',
			script: `# Demo des arcs

# Arc par angles (arc de compas)
O = point(0, 0)
a1 = arc(O, rayon=3, debut=30, fin=150)
style(a1, couleur="bleu")

# Arc par 3 points (trace d'angle)
A = point(4, 0)
V = point(1, -1)
B = point(2, 2)
segment(V, A)
segment(V, B)
a2 = arc(A, V, B)
style(a2, couleur="rouge")

# Arc quasi-complet (> 180 deg)
C = point(-3, 2)
a3 = arc(C, rayon=1.5, debut=10, fin=300)
style(a3, couleur="vert")

# Petit arc pointille
D = point(4, 3)
a4 = arc(D, rayon=1, debut=0, fin=90)
style(a4, pointilles=1)
`
		}
	];

	let selectedExample = $state('triangle');
	let script = $state(examples[0].script);

	function onExampleChange(value: string) {
		const ex = examples.find((e) => e.value === value);
		if (ex) script = ex.script;
	}

	const selectItems = examples.map((e) => ({ label: e.label, value: e.value }));
</script>

<svelte:head>
	<title>Demo Construction v2</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-4">
	<h1 class="mb-4 text-2xl font-bold">Demo Construction v2</h1>
	<div class="mb-3 flex items-center gap-4">
		<p class="text-sm text-muted-foreground">
			Editez le script a gauche, l'apercu se met a jour en temps reel.
		</p>
		<div class="w-56">
			<MySelect
				type="single"
				bind:value={selectedExample}
				items={selectItems}
				onchange={onExampleChange}
			/>
		</div>
	</div>

	{#if EditorComponent}
		<EditorComponent bind:value={script} width={500} height={450} />
	{:else}
		<div class="flex h-[450px] items-center justify-center rounded-md border">
			<p class="text-muted-foreground">Chargement de l'editeur...</p>
		</div>
	{/if}
</div>
