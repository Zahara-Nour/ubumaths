<script lang="ts">
	import DslDemo from '../../DslDemo.svelte';

	const dsl = `O = point(0, 3, couleur="bleu")
A = point(-10, 0, couleur="gris")
B = point(10, 0, couleur="gris")
d = droite(A, B, couleur="gris")
D = point_sur(d, 0.5, couleur="rouge")
l = droite(O, D, couleur="gris")
r = slider(min=1, max=8, valeur=4, pas=0.1)
c = cercle(D, rayon=r, couleur="gris")
P1 = intersection(l, c, choix=1, couleur="vert")
P2 = intersection(l, c, choix=2, couleur="orange")
L1 = lieu(P1, D, couleur="violet")
L2 = lieu(P2, D, couleur="cyan")`;
</script>

<svelte:head>
	<title>Conchoide de Nicomede — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
	<div>
		<a href="/geometry-demo/sliders" class="text-sm text-muted-foreground hover:underline"
			>&larr; Sliders</a
		>
		<h1 class="mt-2 text-2xl font-bold">Conchoide de Nicomede</h1>
		<p class="text-muted-foreground">
			Pour chaque D sur la droite, on trace (OD) et le cercle de centre D et rayon r. Les deux
			intersections donnent les deux branches. Quand r &gt; distance(O, droite) = 3, la boucle
			interieure (cyan) apparait.
		</p>
	</div>

	<DslDemo {dsl} width={600} height={500} />
</div>
