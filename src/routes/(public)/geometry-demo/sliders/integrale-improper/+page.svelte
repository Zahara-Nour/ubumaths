<script lang="ts">
	import DslDemo from '../../DslDemo.svelte';

	const exponentialDecay = `f = courbe("y = exp(-x)")
A = integrale(f, 0, +inf, opacite_fond=0.35)
mtexte(3, 0.7, "\\int_0^{+\\infty} e^{-x}\\, dx = {A:.4f}")`;

	const gaussian = `f = courbe("y = exp(-x^2)")
A = integrale(f, -inf, +inf, opacite_fond=0.35)
mtexte(2.2, 0.7, "\\int_{-\\infty}^{+\\infty} e^{-x^2}\\, dx = {A:.4f} \\approx \\sqrt{\\pi}")`;

	const cauchy = `f = courbe("y = 1/(1 + x^2)")
A = integrale(f, -inf, +inf, opacite_fond=0.35)
mtexte(2.2, 0.7, "\\int_{-\\infty}^{+\\infty} \\frac{1}{1+x^2}\\, dx = {A:.4f} \\approx \\pi")`;

	const inverseSquare = `f = courbe("y = 1/x^2")
A = integrale(f, 1, +inf, opacite_fond=0.35)
mtexte(3, 0.6, "\\int_1^{+\\infty} \\frac{1}{x^2}\\, dx = {A:.4f}")`;

	const harmonic = `f = courbe("y = 1/x")
A = integrale(f, 1, +inf, opacite_fond=0.35)
mtexte(3, 0.7, "\\int_1^{+\\infty} \\frac{1}{x}\\, dx = {A:.3f} \\quad (divergent : NaN)")`;

	const oscillating = `f = courbe("y = sin(x)")
A = integrale(f, 0, +inf, opacite_fond=0.35)
mtexte(2, 1.4, "\\int_0^{+\\infty} \\sin(x)\\, dx = {A:.3f} \\quad (divergent : NaN)")`;

	const sliderDemo = `f = courbe("y = exp(-x)")
a = slider(min=0, max=5, valeur=0, pas=0.1)
A = integrale(f, a, +inf, opacite_fond=0.35)
mtexte(3, 0.7, "\\int_a^{+\\infty} e^{-x}\\, dx = e^{-a} = {A:.4f}")`;

	const aireBetween = `f = courbe("y = exp(-x)")
g = courbe("y = exp(-2*x)")
A = aire_entre(f, g, 0, +inf, opacite_fond=0.35)
mtexte(3, 0.4, "\\text{aire entre} = {A:.4f} = 1/2")`;
</script>

<svelte:head>
	<title>Intégrales généralisées — bornes infinies (V5)</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-8 p-4">
	<div>
		<a href="/geometry-demo/sliders" class="text-sm text-muted-foreground hover:underline"
			>&larr; Sliders</a
		>
		<h1 class="mt-2 text-2xl font-bold">Intégrales généralisées (bornes infinies)</h1>
		<p class="text-muted-foreground">
			V5 — support des bornes <code class="rounded bg-muted px-1">+inf</code>,
			<code class="rounded bg-muted px-1">-inf</code>,
			<code class="rounded bg-muted px-1">inf</code>
			dans
			<code>integrale()</code>, <code>aire()</code> et <code>aire_entre()</code>. Le rendu SVG
			clippe au cadre du viewport — la zone "sort" du cadre comme pour toute fonction non bornée.
		</p>
	</div>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">1. Décroissance exponentielle &mdash; convergent</h2>
		<p class="text-sm text-muted-foreground">
			∫₀<sup>+∞</sup> e<sup>&minus;x</sup> dx = 1.
		</p>
		<DslDemo dsl={exponentialDecay} width={500} height={350} />
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">2. Gaussienne &mdash; convergent</h2>
		<p class="text-sm text-muted-foreground">
			∫₋∞<sup>+∞</sup> e<sup>&minus;x²</sup> dx = √π ≈ 1.7724.
		</p>
		<DslDemo dsl={gaussian} width={500} height={350} />
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">3. Lorentzienne (Cauchy) &mdash; convergent</h2>
		<p class="text-sm text-muted-foreground">
			∫₋∞<sup>+∞</sup> 1/(1+x²) dx = π ≈ 3.1416.
		</p>
		<DslDemo dsl={cauchy} width={500} height={350} />
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">4. Fonction puissance 1/x² &mdash; convergent</h2>
		<p class="text-sm text-muted-foreground">∫₁<sup>+∞</sup> 1/x² dx = 1.</p>
		<DslDemo dsl={inverseSquare} width={500} height={350} />
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">5. Harmonique 1/x &mdash; <em>divergent</em></h2>
		<p class="text-sm text-muted-foreground">
			∫₁<sup>+∞</sup> 1/x dx diverge logarithmiquement. La diagnose détecte la stagnation des deltas
			et retourne <code>NaN</code> avec un <code>console.warn</code>.
		</p>
		<DslDemo dsl={harmonic} width={500} height={350} />
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">6. Oscillation sin(x) &mdash; <em>divergent</em></h2>
		<p class="text-sm text-muted-foreground">
			∫₀<sup>+∞</sup> sin(x) dx oscille sans converger. La diagnose détecte la croissance non bornée.
		</p>
		<DslDemo dsl={oscillating} width={500} height={350} />
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">7. Curseur sur la borne inférieure</h2>
		<p class="text-sm text-muted-foreground">
			∫<sub>a</sub><sup>+∞</sup> e<sup>&minus;x</sup> dx = e<sup>&minus;a</sup>. Bouge le curseur
			pour voir la valeur s'adapter en temps réel.
		</p>
		<DslDemo dsl={sliderDemo} width={500} height={350} />
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">8. Aire entre deux courbes (bornes ∞)</h2>
		<p class="text-sm text-muted-foreground">
			∫₀<sup>+∞</sup> (e<sup>&minus;x</sup> &minus; e<sup>&minus;2x</sup>) dx = 1 &minus; 1/2 = 1/2.
		</p>
		<DslDemo dsl={aireBetween} width={500} height={350} />
	</section>

	<section class="space-y-2 rounded-lg bg-muted p-4">
		<h2 class="text-xl font-semibold">Détails techniques</h2>
		<ul class="list-disc space-y-1 pl-5 text-sm">
			<li>
				<strong>Schéma numérique hybride</strong> : diagnose A (truncation adaptative
				<code>T₀=10, k=0..6</code>) puis substitution B (<code>u = (x−a)/(1+x−a)</code>) si
				convergent.
			</li>
			<li>
				<strong>Coût</strong> : 0.1–7 ms par évaluation sur les 8 cas pédagogiques (tests expérimentaux
				Phase 0).
			</li>
			<li>
				<strong>Détection de divergence</strong> : numérique uniquement (stagnation des deltas + croissance
				unboundée), pas d'analyse asymptotique symbolique en V1.
			</li>
			<li>
				<strong>Documentation</strong> :
				<a class="underline" href="/docs/wip/geometry/improper-integrals-study.md"
					>improper-integrals-study.md</a
				>
				(étude Phase 0).
			</li>
		</ul>
	</section>
</div>
