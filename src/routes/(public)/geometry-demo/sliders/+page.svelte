<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { runDsl } from '$lib/geometry-core/dsl';

	// ── 1. Limacon de Pascal ────────────────────────────────────
	const limaconFig = runDsl(
		`K = point(0, 0, couleur="bleu")
c = cercle(K, rayon=2, couleur="bleu")
O = point(2, 0, couleur="vert")
A = point_sur(c, 90, couleur="rouge")
n = distance(O, A)
d = slider(min=0, max=8, valeur=3, pas=0.1)
r = 1 + d/n
P = homothetie(A, centre=O, rapport=r, couleur="orange")
L = lieu(P, A, couleur="violet")`
	).figure;

	// ── 2. Epicycloide parametrique ─────────────────────────────
	const epicycloidFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 0, couleur="vert")
a = slider(min=30, max=300, valeur=120, pas=10)
B = rotation(P, centre=A, angle=a, couleur="orange")
L = lieu(B, A, couleur="violet")`
	).figure;

	// ── 3. Conchoide de Nicomede ────────────────────────────────
	const conchoidFig = runDsl(
		`O = point(0, 3, couleur="bleu")
A = point(-10, 0, couleur="gris")
B = point(10, 0, couleur="gris")
d = droite(A, B, couleur="gris")
D = point_sur(d, 0.5, couleur="rouge")
l = droite(O, D, couleur="gris")
r = slider(min=1, max=8, valeur=4, pas=0.1)
c = cercle(D, rayon=r, couleur="gris")
P1 = intersection(l, c, choix=1, couleur="vert")
P2 = intersection(l, c, choix=2, couleur="orange")
L1 = lieu(P1, D, couleur="violet")
L2 = lieu(P2, D, couleur="cyan")`
	).figure;

	// ── 4. Spirographe ──────────────────────────────────────────
	const spirographFig = runDsl(
		`O = point(0, 0, couleur="bleu")
R = slider(min=1, max=6, valeur=3, pas=0.5)
c = cercle(O, rayon=R, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
a1 = slider(min=30, max=330, valeur=72, pas=6)
B = rotation(A, centre=O, angle=a1, couleur="gris")
M = milieu(A, B, couleur="orange")
L = lieu(M, A, couleur="violet")`
	).figure;

	// ── 5. Rosace dynamique ─────────────────────────────────────
	const rosaceFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c1 = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c1, 0, couleur="rouge")
r = slider(min=0.5, max=5, valeur=2, pas=0.1)
c2 = cercle(A, rayon=r, couleur="gris")
P = intersection(c1, c2, choix=1, couleur="vert")
L = lieu(P, A, couleur="violet")`
	).figure;

	// ── 6. Cercle dynamique ─────────────────────────────────────
	const circleFig = runDsl(
		`O = point(0, 0, couleur="bleu")
r = slider(min=0.5, max=5, valeur=2, pas=0.1)
c = cercle(O, rayon=r, couleur="violet")
A = point_sur(c, 45, couleur="rouge")
B = point_sur(c, 135, couleur="vert")
C = point_sur(c, 225, couleur="orange")
D = point_sur(c, 315, couleur="cyan")
segment(A, B, couleur="gris")
segment(B, C, couleur="gris")
segment(C, D, couleur="gris")
segment(D, A, couleur="gris")`
	).figure;

	// ── 7. Homothetie slider ────────────────────────────────────
	const homothetieFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 3, couleur="vert")
k = slider(min=-2, max=3, valeur=0.5, pas=0.1)
B = homothetie(P, centre=A, rapport=k, couleur="orange")
L = lieu(B, A, couleur="violet")`
	).figure;

	// ── 8. Similitude slider ────────────────────────────────────
	const similitudeFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(4, 0, couleur="vert")
a = slider(min=0, max=360, valeur=45, pas=5)
k = slider(min=0.2, max=2, valeur=0.7, pas=0.1)
B = similitude(P, centre=A, angle=a, rapport=k, couleur="orange")
L = lieu(B, A, couleur="violet")`
	).figure;
</script>

<svelte:head>
	<title>Geometry Demo — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-4xl space-y-8 p-4">
	<h1 class="text-2xl font-bold">Sliders interactifs</h1>
	<p class="text-muted-foreground">
		Les sliders permettent de controler dynamiquement les parametres geometriques (rayon, angle,
		rapport). Deplacez les curseurs sous chaque figure pour explorer les courbes.
	</p>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">1. Limacon de Pascal</h3>
		<p class="text-sm text-muted-foreground">
			Slider d controle la distance fixe. d=0 : point, d=4 (=2a) : cardioide, d&gt;4 : limacon
			convexe.
		</p>
		<GeometryCanvas figure={limaconFig} width={600} height={400} interactive />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">2. Epicycloide parametrique</h3>
		<p class="text-sm text-muted-foreground">
			Slider a controle l'angle de rotation autour du driver. 120=deltoide, 90=asteroide, 72=5
			boucles, 60=hexagone. Deplacez aussi P (vert) pour changer la taille.
		</p>
		<GeometryCanvas figure={epicycloidFig} width={600} height={400} interactive />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">3. Conchoide de Nicomede</h3>
		<p class="text-sm text-muted-foreground">
			Slider r controle la distance fixe sur la droite (OD). Quand r &gt; distance(O, droite), la
			boucle interieure (cyan) apparait. Deux branches : violette et cyan.
		</p>
		<GeometryCanvas figure={conchoidFig} width={600} height={500} interactive />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">4. Spirographe</h3>
		<p class="text-sm text-muted-foreground">
			Deux sliders : R (rayon du cercle) et a1 (angle de rotation). M = milieu(A, B) ou B =
			rotation(A, angle=a1). Essayez a1=72 (pentagone), a1=60 (hexagone), a1=144 (etoile).
		</p>
		<GeometryCanvas figure={spirographFig} width={600} height={400} interactive />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">5. Rosace dynamique</h3>
		<p class="text-sm text-muted-foreground">
			Slider r controle le rayon du second cercle. r=3 : cercle, r&lt;3 : rosace interne (petales
			pointus), r&gt;3 : rosace externe (grandes boucles).
		</p>
		<GeometryCanvas figure={rosaceFig} width={600} height={400} interactive />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">6. Cercle dynamique</h3>
		<p class="text-sm text-muted-foreground">
			Slider r controle le rayon. Les 4 points sur le cercle et le carre inscrit suivent
			dynamiquement.
		</p>
		<GeometryCanvas figure={circleFig} width={500} height={400} interactive />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">7. Homothetie variable</h3>
		<p class="text-sm text-muted-foreground">
			Slider k controle le rapport d'homothetie. k&gt;0 : meme cote, k&lt;0 : cote oppose. Deplacez
			P (vert) pour changer la courbe.
		</p>
		<GeometryCanvas figure={homothetieFig} width={600} height={400} interactive />
	</section>

	<section class="space-y-2">
		<h3 class="text-lg font-semibold">8. Similitude (rotation + homothetie)</h3>
		<p class="text-sm text-muted-foreground">
			Deux sliders : a (angle de rotation) et k (rapport d'homothetie). La similitude combine les
			deux transformations. Deplacez P (vert) pour changer la courbe.
		</p>
		<GeometryCanvas figure={similitudeFig} width={600} height={400} interactive />
	</section>
</div>
