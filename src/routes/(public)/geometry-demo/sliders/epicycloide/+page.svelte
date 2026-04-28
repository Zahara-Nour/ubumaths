<script lang="ts">
	import DslDemo from '../../DslDemo.svelte';

	const dsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 0, couleur="vert")
a = slider(min=30, max=300, valeur=120, pas=10)
B = rotation(P, centre=A, angle=a, couleur="orange")
L = lieu(B, A, couleur="violet")`;
</script>

<svelte:head>
	<title>Epicycloide parametrique — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
	<div>
		<a href="/geometry-demo/sliders" class="text-sm text-muted-foreground hover:underline"
			>&larr; Sliders</a
		>
		<h1 class="mt-2 text-2xl font-bold">Epicycloide parametrique</h1>
		<p class="text-muted-foreground">
			A parcourt le cercle. B = rotation(P, centre=A, angle=a). Essayez 120 = deltoide, 90 =
			asteroide, 72 = 5 boucles, 60 = hexagone. Deplacez aussi P (vert) pour changer la taille.
		</p>
	</div>

	<DslDemo {dsl} width={600} height={400} />
</div>
