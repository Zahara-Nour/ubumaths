<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	// ── Cas basique ──────────────────────────────────────────────

	const basicDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
T = trace(A, couleur="violet")`;

	const symmetryDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
B = symetrie(A, centre=O, couleur="vert")
T = trace(B, couleur="violet")`;

	// ── Avec slider ──────────────────────────────────────────────

	const sliderDsl = `O = point(0, 0, couleur="bleu")
r = slider(min=1, max=5, valeur=3, pas=0.1)
c = cercle(O, rayon=r, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
T = trace(A, couleur="violet")`;

	const rotationSliderDsl = `O = point(0, 0, couleur="bleu")
A = point(3, 0, couleur="rouge")
a = slider(min=0, max=360, valeur=0, pas=5)
B = rotation(A, centre=O, angle=a, couleur="vert")
T = trace(B, couleur="violet")`;

	// ── Constructions ────────────────────────────────────────────

	const segmentDsl = `A = point(-4, 0, couleur="bleu")
B = point(4, 0, couleur="bleu")
s = segment(A, B, couleur="bleu")
P = point(0, 4, couleur="vert")
D = point_sur(s, 0.5, couleur="rouge")
M = milieu(D, P, couleur="orange")
T = trace(M, couleur="violet")`;

	const curveDsl = `f = courbe("y = sin(x)", couleur="bleu")
A = point_sur(f, 1, couleur="rouge")
O = point(0, 0, couleur="bleu")
B = symetrie(A, centre=O, couleur="vert")
T = trace(B, couleur="violet")`;

	// ── Comparaison lieu vs trace ────────────────────────────────

	const compareDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 0, couleur="vert")
M = milieu(A, P, couleur="orange")
L = lieu(M, A, couleur="cyan")
T = trace(M, couleur="violet")`;
</script>

<svelte:head>
	<title>Geometry Demo — Trace</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-8 p-4">
	<h1 class="text-2xl font-bold">Trace (lieu progressif)</h1>
	<p class="text-muted-foreground">
		La fonction <code>trace(P)</code> accumule les positions du point P au fil des interactions.
		Contrairement a <code>lieu()</code> qui calcule le locus complet analytiquement,
		<code>trace()</code> construit la courbe progressivement en deplacant les points ou sliders.
	</p>

	<h2 class="mt-6 text-xl font-bold">Cas basiques</h2>

	<DslDemo
		dsl={basicDsl}
		title="1. Trace directe"
		description="Deplacez A (rouge) sur le cercle. La trace dessine progressivement le chemin parcouru par A."
		width={500}
		height={400}
	/>

	<DslDemo
		dsl={symmetryDsl}
		title="2. Trace d'une symetrie"
		description="B = symetrie(A, centre=O). Deplacez A sur le cercle et observez la trace de B se construire."
		width={500}
		height={400}
	/>

	<h2 class="mt-8 text-xl font-bold">Avec sliders</h2>

	<DslDemo
		dsl={sliderDsl}
		title="3. Rayon variable"
		description="Le slider r controle le rayon du cercle. Deplacez le slider puis deplacez A pour voir la trace s'adapter."
		width={500}
		height={400}
		interactive={true}
	/>

	<DslDemo
		dsl={rotationSliderDsl}
		title="4. Rotation par slider"
		description="Le slider a controle l'angle de rotation. Deplacez le slider pour faire tourner B autour de O et observer la trace."
		width={500}
		height={400}
		interactive={true}
	/>

	<h2 class="mt-8 text-xl font-bold">Constructions</h2>

	<DslDemo
		dsl={segmentDsl}
		title="5. Point sur segment"
		description="D glisse sur [AB], M = milieu(D, P). Deplacez D pour tracer le chemin de M. Deplacez aussi P (vert)."
		width={500}
		height={400}
	/>

	<DslDemo
		dsl={curveDsl}
		title="6. Point sur courbe sin(x)"
		description="A sur sin(x), B = symetrie(A, centre=O). Deplacez A le long de la sinusoide."
		width={600}
		height={400}
	/>

	<h2 class="mt-8 text-xl font-bold">Comparaison lieu vs trace</h2>

	<DslDemo
		dsl={compareDsl}
		title="7. lieu() (cyan) vs trace() (violet)"
		description="Le lieu (cyan) montre l'ellipse complete. La trace (violet) se construit au fur et a mesure que vous deplacez A. Deplacez aussi P (vert) pour voir la difference."
		width={600}
		height={400}
	/>
</div>
