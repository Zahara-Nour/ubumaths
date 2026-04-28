<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { runDsl } from '$lib/geometry-core/dsl';

	// ==========================================================================
	// 1. Ellipse via mediatrice (construction classique)
	// ==========================================================================
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

	// ==========================================================================
	// 2. Limacon de Pascal (intersection de deux cercles)
	// ==========================================================================
	const limaconFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c1 = cercle(O, rayon=2, couleur="bleu")
A = point_sur(c1, 0, couleur="rouge")
c2 = cercle(A, rayon=3, couleur="gris")
P = intersection(c1, c2, choix=1, couleur="vert")
L = lieu(P, A, couleur="violet")`
	).figure;

	// ==========================================================================
	// 3. Cissoide de Diocles
	// ==========================================================================
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

	// ==========================================================================
	// 4. Conchoide de Nicomede
	// ==========================================================================
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

	// ==========================================================================
	// 5. Epicycloide approchee (rotation autour du driver)
	// ==========================================================================
	const epicycloidFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 0, couleur="vert")
B = rotation(P, centre=A, angle=120, couleur="orange")
L = lieu(B, A, couleur="violet")`
	).figure;

	// ==========================================================================
	// 6. Milieu + cercle → ellipse (simple)
	// ==========================================================================
	const ellipseSimpleFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=4, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(3, 0, couleur="vert")
M = milieu(A, P, couleur="orange")
L = lieu(M, A, couleur="violet")`
	).figure;

	// ==========================================================================
	// 7. Homothetie variable depuis un point fixe
	// ==========================================================================
	const homothetieFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 3, couleur="vert")
B = homothetie(P, centre=A, rapport=0.5, couleur="orange")
L = lieu(B, A, couleur="violet")`
	).figure;

	// ==========================================================================
	// 8. Symetrie de y=1/x (avec discontinuites)
	// ==========================================================================
	const asymptoteFig = runDsl(
		`O = point(0, 0, couleur="bleu")
f = courbe("y = 1/x", couleur="bleu")
A = point_sur(f, 1, couleur="rouge")
B = symetrie(A, centre=O, couleur="vert")
L = lieu(B, A, couleur="violet")`
	).figure;

	// ==========================================================================
	// 9. Construction a chaine profonde (rotation + symetrie)
	// ==========================================================================
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

	<h2 class="mt-8 text-xl font-bold">Constructions classiques</h2>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">1. Ellipse via mediatrice</h3>
		<p class="text-sm text-muted-foreground">
			F1, F2 foyers. A sur le cercle de rayon 2a centre sur F1. La mediatrice de [AF2] coupe la
			droite (F1A) en un point P. Le lieu de P est l'ellipse de foyers F1, F2.
		</p>
		<GeometryCanvas figure={ellipseMedFig} width={600} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">2. Limacon de Pascal</h3>
		<p class="text-sm text-muted-foreground">
			A sur le cercle C1 (rayon 2). C2 centre en A, rayon 3. Le lieu de l'intersection de C1 et C2
			est un limacon. Deplacez O pour modifier la courbe.
		</p>
		<GeometryCanvas figure={limaconFig} width={600} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">3. Cissoide de Diocles</h3>
		<p class="text-sm text-muted-foreground">
			Cercle C centre en O, droite d tangente. A sur C, la droite (OA) coupe d en M. B = symetrie de
			M par rapport a A. Le lieu de B est la cissoide (avec discontinuites aux tangentes
			verticales).
		</p>
		<GeometryCanvas figure={cissoidFig} width={600} height={500} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">4. Conchoide de Nicomede</h3>
		<p class="text-sm text-muted-foreground">
			Point fixe O, droite d. D glisse sur d. On place deux points sur la droite (OD) a distance
			fixe de D (intersection avec un cercle). Deux branches : violette et cyan.
		</p>
		<GeometryCanvas figure={conchoidFig} width={600} height={400} />
	</section>

	<h2 class="mt-8 text-xl font-bold">Transformations</h2>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">5. Rotation autour du driver</h3>
		<p class="text-sm text-muted-foreground">
			A sur le cercle, P fixe. B = rotation(P, centre=A, angle=120). Le lieu de B est une courbe
			fermee complexe (proche d'une epicycloide).
		</p>
		<GeometryCanvas figure={epicycloidFig} width={600} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">6. Milieu → ellipse</h3>
		<p class="text-sm text-muted-foreground">
			A sur le cercle de rayon 4, P fixe a (3,0). M = milieu(A, P). Deplacez P pour deformer
			l'ellipse.
		</p>
		<GeometryCanvas figure={ellipseSimpleFig} width={600} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">7. Homothetie variable</h3>
		<p class="text-sm text-muted-foreground">
			A sur le cercle, P fixe. B = homothetie(P, centre=A, rapport=0.5). Le lieu de B est une courbe
			fermee. Deplacez P pour explorer.
		</p>
		<GeometryCanvas figure={homothetieFig} width={600} height={400} />
	</section>

	<h2 class="mt-8 text-xl font-bold">Cas speciaux</h2>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">8. Discontinuites (y=1/x)</h3>
		<p class="text-sm text-muted-foreground">
			A sur y=1/x, B = symetrie(A, centre=O). Le lieu de B est y=-1/x, avec une discontinuite a
			l'asymptote (x=0).
		</p>
		<GeometryCanvas figure={asymptoteFig} width={600} height={400} />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">9. Chaine profonde (rotation + symetrie)</h3>
		<p class="text-sm text-muted-foreground">
			A sur le cercle, B = rotation(A, 60), C = symetrie(B, centre=(2,0)). Le lieu de C est un
			cercle translate.
		</p>
		<GeometryCanvas figure={deepChainFig} width={600} height={400} />
	</section>
</div>
