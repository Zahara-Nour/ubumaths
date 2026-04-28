<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { runDsl } from '$lib/geometry-core/dsl';

	// ==========================================================================
	// 1. Symmetrie par centre sur cercle → lieu = cercle
	// ==========================================================================
	const circleFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
B = symetrie(A, centre=O, couleur="vert")
L = lieu(B, A, couleur="violet")`
	).figure;

	// ==========================================================================
	// 2. Milieu avec point fixe + driver sur cercle → ellipse
	// ==========================================================================
	const ellipseFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=4, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(3, 0, couleur="vert")
M = milieu(A, P, couleur="orange")
L = lieu(M, A, couleur="violet")`
	).figure;

	// ==========================================================================
	// 3. Driver sur segment → lieu = segment
	// ==========================================================================
	const segmentFig = runDsl(
		`A = point(0, 0, couleur="bleu")
B = point(8, 0, couleur="bleu")
s = segment(A, B, couleur="bleu")
P = point(0, 6, couleur="vert")
D = point_sur(s, 0.5, couleur="rouge")
M = milieu(D, P, couleur="orange")
L = lieu(M, D, couleur="violet")`
	).figure;

	// ==========================================================================
	// 4. Symmetrie de y=x^2 → parabole inversee
	// ==========================================================================
	const parabolaFig = runDsl(
		`O = point(0, 0, couleur="bleu")
f = courbe("y = x^2", couleur="bleu")
A = point_sur(f, 1, couleur="rouge")
B = symetrie(A, centre=O, couleur="vert")
L = lieu(B, A, couleur="violet")`
	).figure;

	// ==========================================================================
	// 5. lieu(A, A) identite → retrace le cercle
	// ==========================================================================
	const identityFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
L = lieu(A, A, couleur="violet")`
	).figure;

	// ==========================================================================
	// 6. Driver sur arc → lieu partiel
	// ==========================================================================
	const arcFig = runDsl(
		`O = point(0, 0, couleur="bleu")
P = point(4, 0, couleur="bleu")
Q = point(0, 4, couleur="bleu")
a = arc(P, O, Q, couleur="bleu")
A = point_sur(a, 0.5, couleur="rouge")
B = symetrie(A, centre=O, couleur="vert")
L = lieu(B, A, couleur="violet")`
	).figure;
</script>

<svelte:head>
	<title>Geometry Demo — Lieu geometrique</title>
</svelte:head>

<div class="container mx-auto max-w-4xl space-y-8 p-4">
	<h1 class="text-2xl font-bold">Lieu geometrique (Locus)</h1>
	<p class="text-muted-foreground">
		Le lieu geometrique trace la trajectoire d'un point B quand un point A se deplace le long de son
		chemin. Deplacez les points rouges pour voir le lieu se mettre a jour.
	</p>

	<section class="space-y-2">
		<h2 class="text-lg font-semibold">1. Symetrie centrale sur cercle</h2>
		<p class="text-sm text-muted-foreground">
			A (rouge) sur le cercle, B = symetrie(A, centre=O). Le lieu de B est le meme cercle.
		</p>
		<GeometryCanvas figure={circleFig} width={500} height={400} />
	</section>

	<section class="space-y-2">
		<h2 class="text-lg font-semibold">2. Milieu avec point fixe → ellipse</h2>
		<p class="text-sm text-muted-foreground">
			A sur le cercle de rayon 4, P fixe a (3,0). M = milieu(A, P). Le lieu de M est une ellipse.
		</p>
		<GeometryCanvas figure={ellipseFig} width={500} height={400} />
	</section>

	<section class="space-y-2">
		<h2 class="text-lg font-semibold">3. Driver sur segment</h2>
		<p class="text-sm text-muted-foreground">
			D glisse sur le segment [AB], P fixe. M = milieu(D, P). Le lieu de M est un segment.
		</p>
		<GeometryCanvas figure={segmentFig} width={500} height={400} />
	</section>

	<section class="space-y-2">
		<h2 class="text-lg font-semibold">4. Symetrie de y=x²</h2>
		<p class="text-sm text-muted-foreground">
			A sur la parabole y=x², B = symetrie(A, centre=O). Le lieu de B est y=-x².
		</p>
		<GeometryCanvas figure={parabolaFig} width={500} height={400} />
	</section>

	<section class="space-y-2">
		<h2 class="text-lg font-semibold">5. Identite : lieu(A, A)</h2>
		<p class="text-sm text-muted-foreground">Le lieu de A lui-meme retrace le chemin (cercle).</p>
		<GeometryCanvas figure={identityFig} width={500} height={400} />
	</section>

	<section class="space-y-2">
		<h2 class="text-lg font-semibold">6. Driver sur arc</h2>
		<p class="text-sm text-muted-foreground">
			A sur l'arc PQ, B = symetrie(A, centre=O). Le lieu est un arc symetrique.
		</p>
		<GeometryCanvas figure={arcFig} width={500} height={400} />
	</section>
</div>
