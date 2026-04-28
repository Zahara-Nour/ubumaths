<script lang="ts">
	import DslDemo from '../../DslDemo.svelte';

	const dsl = `O = point(0, 0, couleur="bleu")
r = slider(min=0.5, max=5, valeur=2, pas=0.1)
c = cercle(O, rayon=r, couleur="violet")
A = point_sur(c, 45, couleur="rouge")
B = point_sur(c, 135, couleur="vert")
C = point_sur(c, 225, couleur="orange")
D = point_sur(c, 315, couleur="cyan")
segment(A, B, couleur="gris")
segment(B, C, couleur="gris")
segment(C, D, couleur="gris")
segment(D, A, couleur="gris")`;
</script>

<svelte:head>
	<title>Cercle dynamique — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
	<div>
		<a href="/geometry-demo/sliders" class="text-sm text-muted-foreground hover:underline"
			>&larr; Sliders</a
		>
		<h1 class="mt-2 text-2xl font-bold">Cercle dynamique</h1>
		<p class="text-muted-foreground">
			Le slider r controle le rayon du cercle. Les 4 points contraints et le carre inscrit suivent
			dynamiquement.
		</p>
	</div>

	<DslDemo {dsl} width={500} height={400} />
</div>
