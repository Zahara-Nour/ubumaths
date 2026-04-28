<script lang="ts">
	import DslDemo from '../../DslDemo.svelte';

	const dsl = `O = point(0, 0, couleur="bleu")
c1 = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c1, 0, couleur="rouge")
r = slider(min=0.5, max=5, valeur=2, pas=0.1)
c2 = cercle(A, rayon=r, couleur="gris")
P = intersection(c1, c2, choix=1, couleur="vert")
L = lieu(P, A, couleur="violet")`;
</script>

<svelte:head>
	<title>Rosace dynamique — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
	<div>
		<a href="/geometry-demo/sliders" class="text-sm text-muted-foreground hover:underline"
			>&larr; Sliders</a
		>
		<h1 class="mt-2 text-2xl font-bold">Rosace dynamique</h1>
		<p class="text-muted-foreground">
			Intersection de deux cercles : c1 fixe (rayon 3) et c2 mobile centre sur A. Le slider r
			controle le rayon du second cercle. r=3 : cercle, r&lt;3 : rosace interne, r&gt;3 : rosace
			externe.
		</p>
	</div>

	<DslDemo {dsl} width={600} height={400} />
</div>
