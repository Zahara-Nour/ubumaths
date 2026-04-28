<script lang="ts">
	import DslDemo from '../../DslDemo.svelte';

	const dsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 3, couleur="vert")
k = slider(min=-2, max=3, valeur=0.5, pas=0.1)
B = homothetie(P, centre=A, rapport=k, couleur="orange")
L = lieu(B, A, couleur="violet")`;
</script>

<svelte:head>
	<title>Homothetie variable — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
	<div>
		<a href="/geometry-demo/sliders" class="text-sm text-muted-foreground hover:underline"
			>&larr; Sliders</a
		>
		<h1 class="mt-2 text-2xl font-bold">Homothetie variable</h1>
		<p class="text-muted-foreground">
			B = homothetie(P, centre=A, rapport=k). Le slider k controle le rapport. Deplacez P (vert)
			pour changer la courbe. k&gt;0 : meme cote, k&lt;0 : oppose, k=1 : B=P, k=0 : B=A.
		</p>
	</div>

	<DslDemo {dsl} width={600} height={400} />
</div>
