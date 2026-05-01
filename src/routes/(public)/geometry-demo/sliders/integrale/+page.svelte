<script lang="ts">
	import DslDemo from '../../DslDemo.svelte';

	const dsl = `f = courbe("y = x^3 - x", couleur="bleu")
a = slider(min=-2, max=2, valeur=-1.5, pas=0.05)
b = slider(min=-2, max=2, valeur=1.5, pas=0.05)
A = integrale(f, a, b, couleur="violet", opacite_fond=0.35)
mtexte(2.5, 2.5, "\\\\int_{a}^{b} (x^3 - x)\\\\, dx = {A:.3f}")`;
</script>

<svelte:head>
	<title>Integrale dynamique — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
	<div>
		<a href="/geometry-demo/sliders" class="text-sm text-muted-foreground hover:underline"
			>&larr; Sliders</a
		>
		<h1 class="mt-2 text-2xl font-bold">Integrale dynamique</h1>
		<p class="text-muted-foreground">
			Les sliders controlent les bornes a et b. La zone violette represente l'integrale &int;<sub
				>a</sub
			><sup>b</sup> (x<sup>3</sup> &minus; x) dx. Les regions ou f est negative apparaissent en teinte
			plus claire pour distinguer le signe algebrique. Quand a &gt; b, la valeur de l'integrale change
			de signe.
		</p>
	</div>

	<DslDemo {dsl} width={500} height={400} />
</div>
