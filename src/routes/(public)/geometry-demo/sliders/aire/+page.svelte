<script lang="ts">
	import DslDemo from '../../DslDemo.svelte';

	const dsl = `f = courbe("y = x^3 - x", couleur="noir")
a = slider(min=-2, max=2, valeur=-1, pas=0.05)
b = slider(min=-2, max=2, valeur=1, pas=0.05)
I = integrale(f, a, b, opacite_fond=0.35)
A = aire(f, a, b, opacite_fond=0.35)
mtexte(2.5, 2.4, "\\int_a^b f = {I:.3f}\\quad(\\text{integrale signee})")
mtexte(2.5, 1.7, "\\mathrm{aire}(f, a, b) = {A:.3f}\\quad(\\text{aire geometrique})")`;
</script>

<svelte:head>
	<title>Aire geometrique vs integrale signee — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
	<div>
		<a href="/geometry-demo/sliders" class="text-sm text-muted-foreground hover:underline"
			>&larr; Sliders</a
		>
		<h1 class="mt-2 text-2xl font-bold">Aire geometrique vs integrale signee</h1>
		<p class="text-muted-foreground">
			La meme fonction f(x) = x<sup>3</sup> &minus; x avec deux mesures distinctes :
			<span class="font-semibold text-blue-700">integrale</span> (zone bleue, signee, peut etre
			negative ou nulle) et <span class="font-semibold text-green-600">aire</span> (zone verte, toujours
			positive, somme des aires absolues sur les sous-regions). Quand les bornes encadrent le zero x
			= 0, l'integrale s'annule mais l'aire vaut 0.5.
		</p>
	</div>

	<DslDemo {dsl} width={500} height={400} />
</div>
