<script lang="ts">
	import DslDemo from '../../DslDemo.svelte';

	const dsl = `O = point(0, 0, couleur="bleu")
R = slider(min=1, max=6, valeur=3, pas=0.5)
c = cercle(O, rayon=R, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
a1 = slider(min=30, max=330, valeur=72, pas=6)
B = rotation(A, centre=O, angle=a1, couleur="gris")
M = milieu(A, B, couleur="orange")
L = lieu(M, A, couleur="violet")`;
</script>

<svelte:head>
	<title>Spirographe — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
	<div>
		<a href="/geometry-demo/sliders" class="text-sm text-muted-foreground hover:underline"
			>&larr; Sliders</a
		>
		<h1 class="mt-2 text-2xl font-bold">Spirographe</h1>
		<p class="text-muted-foreground">
			M = milieu(A, B) ou B = rotation(A, centre=O, angle=a1). Deux sliders : R (rayon du cercle) et
			a1 (angle de rotation). Essayez a1=72 (pentagone), 60 (hexagone), 144 (etoile), 90 (carre).
		</p>
	</div>

	<DslDemo {dsl} width={600} height={400} />
</div>
