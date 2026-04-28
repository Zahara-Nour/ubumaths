<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { runDsl } from '$lib/geometry-core/dsl';

	// ── Cas simples ──────────────────────────────────────────────

	const circleFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
B = symetrie(A, centre=O, couleur="vert")
L = lieu(B, A, couleur="violet")`
	).figure;

	const ellipseSimpleFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=4, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(3, 0, couleur="vert")
M = milieu(A, P, couleur="orange")
L = lieu(M, A, couleur="violet")`
	).figure;

	const segmentFig = runDsl(
		`A = point(0, 0, couleur="bleu")
B = point(8, 0, couleur="bleu")
s = segment(A, B, couleur="bleu")
P = point(0, 6, couleur="vert")
D = point_sur(s, 0.5, couleur="rouge")
M = milieu(D, P, couleur="orange")
L = lieu(M, D, couleur="violet")`
	).figure;

	const parabolaFig = runDsl(
		`O = point(0, 0, couleur="bleu")
f = courbe("y = x^2", couleur="bleu")
A = point_sur(f, 1, couleur="rouge")
B = symetrie(A, centre=O, couleur="vert")
L = lieu(B, A, couleur="violet")`
	).figure;

	const identityFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
L = lieu(A, A, couleur="violet")`
	).figure;

	const arcFig = runDsl(
		`O = point(0, 0, couleur="bleu")
P = point(4, 0, couleur="bleu")
Q = point(0, 4, couleur="bleu")
a = arc(P, O, Q, couleur="bleu")
A = point_sur(a, 0.5, couleur="rouge")
B = symetrie(A, centre=O, couleur="vert")
L = lieu(B, A, couleur="violet")`
	).figure;

	// ── Constructions classiques ─────────────────────────────────

	const ellipseMedFig = runDsl(
		`F1 = point(-3, 0, couleur="bleu")
F2 = point(3, 0, couleur="bleu")
c = cercle(F1, rayon=8, couleur="gris")
A = point_sur(c, 0, couleur="rouge")
(M, med) = mediatrice(A, F2)
style(med, couleur="gris")
d = droite(F1, A, couleur="gris")
P = intersection(med, d, couleur="vert")
L = lieu(P, A, couleur="violet")`
	).figure;

	const limaconFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c1 = cercle(O, rayon=2, couleur="bleu")
A = point_sur(c1, 0, couleur="rouge")
c2 = cercle(A, rayon=3, couleur="gris")
P = intersection(c1, c2, choix=1, couleur="vert")
L = lieu(P, A, couleur="violet")`
	).figure;

	const cissoidFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=2, couleur="bleu")
T1 = point(4, -8, couleur="gris")
T2 = point(4, 8, couleur="gris")
d = droite(T1, T2, couleur="gris")
A = point_sur(c, 0, couleur="rouge")
l = droite(O, A, couleur="gris")
M = intersection(l, d, couleur="orange")
B = symetrie(M, centre=A, couleur="vert")
L = lieu(B, A, couleur="violet")`
	).figure;

	const conchoidFig = runDsl(
		`O = point(0, 3, couleur="bleu")
A = point(-10, 0, couleur="gris")
B = point(10, 0, couleur="gris")
d = droite(A, B, couleur="gris")
D = point_sur(d, 0.5, couleur="rouge")
l = droite(O, D, couleur="gris")
c = cercle(D, rayon=4, couleur="gris")
P1 = intersection(l, c, choix=1, couleur="vert")
P2 = intersection(l, c, choix=2, couleur="orange")
L1 = lieu(P1, D, couleur="violet")
L2 = lieu(P2, D, couleur="cyan")`
	).figure;

	// ── Transformations ──────────────────────────────────────────

	const epicycloidFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 0, couleur="vert")
B = rotation(P, centre=A, angle=120, couleur="orange")
L = lieu(B, A, couleur="violet")`
	).figure;

	const homothetieFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 3, couleur="vert")
B = homothetie(P, centre=A, rapport=0.5, couleur="orange")
L = lieu(B, A, couleur="violet")`
	).figure;

	// ── Cas speciaux ─────────────────────────────────────────────

	const asymptoteFig = runDsl(
		`O = point(0, 0, couleur="bleu")
f = courbe("y = 1/x", couleur="bleu")
A = point_sur(f, 1, couleur="rouge")
B = symetrie(A, centre=O, couleur="vert")
L = lieu(B, A, couleur="violet")`
	).figure;

	const deepChainFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
B = rotation(A, centre=O, angle=60, couleur="gris")
C = symetrie(B, centre=point(2, 0), couleur="vert")
L = lieu(C, A, couleur="violet")`
	).figure;
</script>

<svelte:head>
	<title>Geometry Demo — Lieu geometrique</title>
</svelte:head>

<div class="container mx-auto max-w-4xl space-y-8 p-4">
	<h1 class="text-2xl font-bold">Lieu geometrique (Locus)</h1>
	<p class="text-muted-foreground">
		Le lieu geometrique trace la trajectoire d'un point B quand un point A (rouge) se deplace le
		long de son chemin. Deplacez les points pour voir les lieux se mettre a jour.
	</p>

	<h2 class="mt-6 text-xl font-bold">Cas simples</h2>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">1. Symetrie centrale sur cercle</h3>
		<p class="text-sm text-muted-foreground">
			A sur le cercle, B = symetrie(A, centre=O). Le lieu de B est le meme cercle.
		</p>
		<GeometryCanvas figure={circleFig} width={500} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">2. Milieu avec point fixe</h3>
		<p class="text-sm text-muted-foreground">
			A sur le cercle de rayon 4, P fixe. M = milieu(A, P). Deplacez P pour deformer l'ellipse.
		</p>
		<GeometryCanvas figure={ellipseSimpleFig} width={500} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">3. Driver sur segment</h3>
		<p class="text-sm text-muted-foreground">
			D glisse sur [AB], P fixe. M = milieu(D, P). Le lieu de M est un segment.
		</p>
		<GeometryCanvas figure={segmentFig} width={500} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">4. Symetrie de y=x&#178;</h3>
		<p class="text-sm text-muted-foreground">
			A sur y=x&#178;, B = symetrie(A, centre=O). Le lieu de B est y=-x&#178;.
		</p>
		<GeometryCanvas figure={parabolaFig} width={500} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">5. Identite : lieu(A, A)</h3>
		<p class="text-sm text-muted-foreground">
			Le lieu de A lui-meme retrace le chemin du driver (cercle).
		</p>
		<GeometryCanvas figure={identityFig} width={500} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">6. Driver sur arc</h3>
		<p class="text-sm text-muted-foreground">
			A sur l'arc PQ, B = symetrie(A, centre=O). Le lieu est un arc symetrique.
		</p>
		<GeometryCanvas figure={arcFig} width={500} height={400} />
	</section>

	<h2 class="mt-8 text-xl font-bold">Constructions classiques</h2>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">7. Ellipse via mediatrice</h3>
		<p class="text-sm text-muted-foreground">
			F1, F2 foyers. A sur le cercle de rayon 2a centre sur F1. La mediatrice de [AF2] coupe la
			droite (F1A) en P. Le lieu de P est l'ellipse de foyers F1, F2.
		</p>
		<GeometryCanvas figure={ellipseMedFig} width={600} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">8. Limacon de Pascal</h3>
		<p class="text-sm text-muted-foreground">
			A sur C1 (rayon 2). C2 centre en A, rayon 3. Le lieu de l'intersection C1/C2 est un limacon.
		</p>
		<GeometryCanvas figure={limaconFig} width={600} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">9. Cissoide de Diocles</h3>
		<p class="text-sm text-muted-foreground">
			Cercle C, droite d tangente. A sur C, (OA) coupe d en M. B = symetrie(M, centre=A). Le lieu de
			B est la cissoide.
		</p>
		<GeometryCanvas figure={cissoidFig} width={600} height={500} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">10. Conchoide de Nicomede</h3>
		<p class="text-sm text-muted-foreground">
			Point fixe O, droite d. D glisse sur d. Deux points a distance fixe de D sur (OD). Deux
			branches : violette et cyan.
		</p>
		<GeometryCanvas figure={conchoidFig} width={600} height={400} />
	</section>

	<h2 class="mt-8 text-xl font-bold">Transformations</h2>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">11. Rotation autour du driver</h3>
		<p class="text-sm text-muted-foreground">
			A sur le cercle, P fixe. B = rotation(P, centre=A, angle=120). Courbe epicycloide. Deplacez P.
		</p>
		<GeometryCanvas figure={epicycloidFig} width={600} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">12. Homothetie variable</h3>
		<p class="text-sm text-muted-foreground">
			A sur le cercle, P fixe. B = homothetie(P, centre=A, rapport=0.5). Deplacez P pour explorer.
		</p>
		<GeometryCanvas figure={homothetieFig} width={600} height={400} />
	</section>

	<h2 class="mt-8 text-xl font-bold">Cas speciaux</h2>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">13. Discontinuites (y=1/x)</h3>
		<p class="text-sm text-muted-foreground">
			A sur y=1/x, B = symetrie(A, centre=O). Discontinuite a l'asymptote x=0.
		</p>
		<GeometryCanvas figure={asymptoteFig} width={600} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">14. Chaine profonde</h3>
		<p class="text-sm text-muted-foreground">
			A sur le cercle, B = rotation(A, 60), C = symetrie(B, centre=(2,0)). Le lieu de C est un
			cercle translate.
		</p>
		<GeometryCanvas figure={deepChainFig} width={600} height={400} />
	</section>
</div>
