<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	// ── Cas simples ──────────────────────────────────────────────

	const circleDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
B = symetrie(A, centre=O, couleur="vert")
L = lieu(B, A, couleur="violet")`;

	const ellipseSimpleDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=4, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(3, 0, couleur="vert")
M = milieu(A, P, couleur="orange")
L = lieu(M, A, couleur="violet")`;

	const segmentDsl = `A = point(0, 0, couleur="bleu")
B = point(8, 0, couleur="bleu")
s = segment(A, B, couleur="bleu")
P = point(0, 6, couleur="vert")
D = point_sur(s, 0.5, couleur="rouge")
M = milieu(D, P, couleur="orange")
L = lieu(M, D, couleur="violet")`;

	const parabolaDsl = `O = point(0, 0, couleur="bleu")
f = courbe("y = x^2", couleur="bleu")
A = point_sur(f, 1, couleur="rouge")
B = symetrie(A, centre=O, couleur="vert")
L = lieu(B, A, couleur="violet")`;

	const identityDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
L = lieu(A, A, couleur="violet")`;

	const arcDsl = `O = point(0, 0, couleur="bleu")
P = point(4, 0, couleur="bleu")
Q = point(0, 4, couleur="bleu")
a = arc(P, O, Q, couleur="bleu")
A = point_sur(a, 0.5, couleur="rouge")
B = symetrie(A, centre=O, couleur="vert")
L = lieu(B, A, couleur="violet")`;

	// ── Constructions classiques ─────────────────────────────────

	const ellipseMedDsl = `F1 = point(-3, 0, couleur="bleu")
F2 = point(3, 0, couleur="bleu")
c = cercle(F1, rayon=8, couleur="gris")
A = point_sur(c, 0, couleur="rouge")
(M, med) = mediatrice(A, F2)
style(med, couleur="gris")
d = droite(F1, A, couleur="gris")
P = intersection(med, d, couleur="vert")
L = lieu(P, A, couleur="violet")`;

	const rosaceDsl = `O = point(0, 0, couleur="bleu")
c1 = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c1, 0, couleur="rouge")
c2 = cercle(A, rayon=2, couleur="gris")
P = intersection(c1, c2, choix=1, couleur="vert")
L = lieu(P, A, couleur="violet")`;

	const cissoidDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=2, couleur="bleu")
T1 = point(4, -8, couleur="gris")
T2 = point(4, 8, couleur="gris")
d = droite(T1, T2, couleur="gris")
A = point_sur(c, 0, couleur="rouge")
l = droite(O, A, couleur="gris")
M = intersection(l, d, couleur="orange")
B = symetrie(M, centre=A, couleur="vert")
L = lieu(B, A, couleur="violet")`;

	const conchoidDsl = `O = point(0, 3, couleur="bleu")
A = point(-10, 0, couleur="gris")
B = point(10, 0, couleur="gris")
d = droite(A, B, couleur="gris")
D = point_sur(d, 0.5, couleur="rouge")
l = droite(O, D, couleur="gris")
c = cercle(D, rayon=4, couleur="gris")
P1 = intersection(l, c, choix=1, couleur="vert")
P2 = intersection(l, c, choix=2, couleur="orange")
L1 = lieu(P1, D, couleur="violet")
L2 = lieu(P2, D, couleur="cyan")`;

	// ── Transformations ──────────────────────────────────────────

	const epicycloidDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 0, couleur="vert")
B = rotation(P, centre=A, angle=120, couleur="orange")
L = lieu(B, A, couleur="violet")`;

	const homothethieDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 3, couleur="vert")
B = homothetie(P, centre=A, rapport=0.5, couleur="orange")
L = lieu(B, A, couleur="violet")`;

	// ── Scalars + Sliders ───────────────────────────────────────

	const limaconDsl = `K = point(0, 0, couleur="bleu")
c = cercle(K, rayon=2, couleur="bleu")
O = point(2, 0, couleur="vert")
A = point_sur(c, 90, couleur="rouge")
n = distance(O, A)
d = slider(min=0, max=8, valeur=3, pas=0.1)
r = 1 + d/n
P = homothetie(A, centre=O, rapport=r, couleur="orange")
L = lieu(P, A, couleur="violet")`;

	const epicycloidSliderDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 0, couleur="vert")
a = slider(min=30, max=300, valeur=120, pas=10)
B = rotation(P, centre=A, angle=a, couleur="orange")
L = lieu(B, A, couleur="violet")`;

	// ── Cas speciaux ─────────────────────────────────────────────

	const asymptoteDsl = `O = point(0, 0, couleur="bleu")
f = courbe("y = 1/x", couleur="bleu")
A = point_sur(f, 1, couleur="rouge")
B = symetrie(A, centre=O, couleur="vert")
L = lieu(B, A, couleur="violet")`;

	const deepChainDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
B = rotation(A, centre=O, angle=60, couleur="gris")
C = symetrie(B, centre=point(2, 0), couleur="vert")
L = lieu(C, A, couleur="violet")`;
</script>

<svelte:head>
	<title>Geometry Demo — Lieu geometrique</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-8 p-4">
	<h1 class="text-2xl font-bold">Lieu geometrique (Locus)</h1>
	<p class="text-muted-foreground">
		Le lieu geometrique trace la trajectoire d'un point B quand un point A (rouge) se deplace le
		long de son chemin. Deplacez les points pour voir les lieux se mettre a jour.
	</p>

	<h2 class="mt-6 text-xl font-bold">Cas simples</h2>

	<DslDemo
		dsl={circleDsl}
		title="1. Symetrie centrale sur cercle"
		description="A sur le cercle, B = symetrie(A, centre=O). Le lieu de B est le meme cercle."
		width={500}
		height={400}
	/>

	<DslDemo
		dsl={ellipseSimpleDsl}
		title="2. Milieu avec point fixe"
		description="A sur le cercle de rayon 4, P fixe. M = milieu(A, P). Deplacez P pour deformer l'ellipse."
		width={500}
		height={400}
	/>

	<DslDemo
		dsl={segmentDsl}
		title="3. Driver sur segment"
		description="D glisse sur [AB], P fixe. M = milieu(D, P). Le lieu de M est un segment."
		width={500}
		height={400}
	/>

	<DslDemo
		dsl={parabolaDsl}
		title="4. Symetrie de y=x²"
		description="A sur y=x², B = symetrie(A, centre=O). Le lieu de B est y=-x²."
		width={500}
		height={400}
	/>

	<DslDemo
		dsl={identityDsl}
		title="5. Identite : lieu(A, A)"
		description="Le lieu de A lui-meme retrace le chemin du driver (cercle)."
		width={500}
		height={400}
	/>

	<DslDemo
		dsl={arcDsl}
		title="6. Driver sur arc"
		description="A sur l'arc PQ, B = symetrie(A, centre=O). Le lieu est un arc symetrique."
		width={500}
		height={400}
	/>

	<h2 class="mt-8 text-xl font-bold">Constructions classiques</h2>

	<DslDemo
		dsl={ellipseMedDsl}
		title="7. Ellipse via mediatrice"
		description="F1, F2 foyers. A sur le cercle de rayon 2a centre sur F1. La mediatrice de [AF2] coupe la droite (F1A) en P. Le lieu de P est l'ellipse de foyers F1, F2."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={rosaceDsl}
		title="8. Intersection de deux cercles"
		description="A sur C1 (rayon 3). C2 centre en A, rayon 2. Le lieu de l'intersection C1/C2 est une rosace."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={cissoidDsl}
		title="9. Cissoide de Diocles"
		description="Cercle C, droite d tangente. A sur C, (OA) coupe d en M. B = symetrie(M, centre=A). Le lieu de B est la cissoide."
		width={600}
		height={500}
	/>

	<DslDemo
		dsl={conchoidDsl}
		title="10. Conchoide de Nicomede"
		description="Point fixe O, droite d. D glisse sur d. Deux points a distance fixe de D sur (OD). Deux branches : violette et cyan."
		width={600}
		height={400}
	/>

	<h2 class="mt-8 text-xl font-bold">Transformations</h2>

	<DslDemo
		dsl={epicycloidDsl}
		title="11. Rotation autour du driver"
		description="A sur le cercle, P fixe. B = rotation(P, centre=A, angle=120). Courbe epicycloide. Deplacez P."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={homothethieDsl}
		title="12. Homothetie variable"
		description="A sur le cercle, P fixe. B = homothetie(P, centre=A, rapport=0.5). Deplacez P pour explorer."
		width={600}
		height={400}
	/>

	<h2 class="mt-8 text-xl font-bold">Scalars + Sliders</h2>

	<DslDemo
		dsl={limaconDsl}
		title="13. Limacon de Pascal"
		description="Slider d controle la distance fixe. d=0 : point, d=4 (=2a) : cardioide, d>4 : convexe."
		width={600}
		height={400}
		interactive={true}
	/>

	<DslDemo
		dsl={epicycloidSliderDsl}
		title="14. Epicycloide parametrique"
		description="Slider a controle l'angle de rotation. 120=deltoide, 90=asteroide, 72=5 boucles. Deplacez aussi P (vert)."
		width={600}
		height={400}
		interactive={true}
	/>

	<h2 class="mt-8 text-xl font-bold">Cas speciaux</h2>

	<DslDemo
		dsl={asymptoteDsl}
		title="16. Discontinuites (y=1/x)"
		description="A sur y=1/x, B = symetrie(A, centre=O). Discontinuite a l'asymptote x=0."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={deepChainDsl}
		title="17. Chaine profonde"
		description="A sur le cercle, B = rotation(A, 60), C = symetrie(B, centre=(2,0)). Le lieu de C est un cercle translate."
		width={600}
		height={400}
	/>
</div>
