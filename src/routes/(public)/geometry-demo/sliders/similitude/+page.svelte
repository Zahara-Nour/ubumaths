<script lang="ts">
	import DslDemo from '../../DslDemo.svelte';

	const dsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(4, 0, couleur="vert")
a = slider(min=0, max=360, valeur=45, pas=5)
k = slider(min=0.2, max=2, valeur=0.7, pas=0.1)
B = similitude(P, centre=A, angle=a, rapport=k, couleur="orange")
L = lieu(B, A, couleur="violet")`;
</script>

<svelte:head>
	<title>Similitude — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
	<div>
		<a href="/geometry-demo/sliders" class="text-sm text-muted-foreground hover:underline"
			>&larr; Sliders</a
		>
		<h1 class="mt-2 text-2xl font-bold">Similitude (rotation + homothetie)</h1>
		<p class="text-muted-foreground">
			Combine rotation (angle a) et homothetie (rapport k). Deplacez P (vert) pour changer la
			courbe. a=0,k=1 : B=P. a=180,k=1 : symetrie centrale.
		</p>
	</div>

	<DslDemo {dsl} width={600} height={400} />
</div>
