<script lang="ts">
	import DslDemo from '../../DslDemo.svelte';

	// Cas pédagogique classique de Terminale spé maths : aire entre y = sin(x)
	// et y = cos(x) sur [π/4, 5π/4] = 2√2 ≈ 2.828.
	// Les bornes par défaut (≈ π/4 et ≈ 5π/4) sont les intersections naturelles.
	// Note: resolveTemplate (figure.ts) traite TOUT {...} comme interpolation de
	// scalaire — donc on évite \text{...} et \sqrt{2} qui contiennent des accolades.
	// Pour la racine, on utilise \sqrt 2 (shorthand LaTeX 1-token, accepté par MathLive).
	const dsl = `f = courbe("y = sin(x)", couleur="bleu")
g = courbe("y = cos(x)", couleur="vert")
a = slider(min=-1, max=1.5, valeur=0.7853981633974483, pas=0.05)
b = slider(min=2, max=5, valeur=3.9269908169872414, pas=0.05)
E = aire_entre(f, g, a, b, opacite_fond=0.4)
mtexte(-3, 1.6, "\\int_a^b |f - g|\\, dx = {E:.3f}")
mtexte(-3, 1.2, "2\\sqrt 2 \\approx 2.828")`;
</script>

<svelte:head>
	<title>Aire entre deux courbes — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
	<div>
		<a href="/geometry-demo/sliders" class="text-sm text-muted-foreground hover:underline"
			>&larr; Sliders</a
		>
		<h1 class="mt-2 text-2xl font-bold">Aire entre deux courbes</h1>
		<p class="text-muted-foreground">
			La zone <span class="font-semibold text-orange-500">orange</span> est l'aire géométrique entre
			<span class="font-semibold text-blue-700">f(x) = sin(x)</span>
			et <span class="font-semibold text-green-600">g(x) = cos(x)</span>
			sur l'intervalle [a, b]. Avec les bornes par défaut a = π/4 et b = 5π/4 (les deux intersections
			consécutives), l'aire vaut exactement 2√2 ≈ 2.828. Quand a ou b traversent une intersection, le
			builtin <code>aire_entre</code> détecte le changement de signe de f − g et somme les contributions
			absolues sur chaque sous-région.
		</p>
	</div>

	<DslDemo {dsl} width={500} height={400} />

	<div class="prose prose-sm max-w-none">
		<h2>Pourquoi <code>aire_entre</code> et pas <code>aire(f) − aire(g)</code> ?</h2>
		<p>
			Quand <code>f</code> et <code>g</code> se croisent dans <code>[a, b]</code>, la différence des
			aires <code>aire(f) − aire(g)</code> peut être négative ou différente de l'aire géométrique
			entre les courbes. <code>aire_entre</code> calcule
			<code>∫ |f − g|</code>, en splittant l'intégrale sur les zéros de <code>f − g</code> pour additionner
			les valeurs absolues sur chaque sous-région.
		</p>
		<h2>Triade pédagogique</h2>
		<ul>
			<li>
				<code class="text-blue-700">integrale(f, a, b)</code> — intégrale signée
				<code>F(b) − F(a)</code> (peut être négative).
			</li>
			<li>
				<code class="text-green-600">aire(f, a, b)</code> — aire entre <code>f</code> et l'axe des x
				(toujours ≥ 0).
			</li>
			<li>
				<code class="text-orange-500">aire_entre(f, g, a, b)</code> — aire entre <code>f</code> et
				<code>g</code> (toujours ≥ 0).
			</li>
		</ul>
	</div>
</div>
