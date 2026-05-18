<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	const centreGraviteDsl = `A = point(-4, -2, couleur="bleu")
B = point(4, -2, couleur="bleu")
C = point(1, 4, couleur="bleu")
triangle(A, B, C)
(Ma, sa) = mediane(A, B, C)
(Mb, sb) = mediane(B, C, A)
(Mc, sc) = mediane(C, A, B)
style(sa, couleur="gris", trait="tirets")
style(sb, couleur="gris", trait="tirets")
style(sc, couleur="gris", trait="tirets")
G = centre_gravite(A, B, C)
style(G, couleur="orange")`;

	const orthocentreDsl = `A = point(-3, -2, couleur="bleu")
B = point(4, -2, couleur="bleu")
C = point(1, 4, couleur="bleu")
triangle(A, B, C)
(FA, hA) = hauteur(A, B, C)
(FB, hB) = hauteur(B, C, A)
(FC, hC) = hauteur(C, A, B)
style(hA, couleur="gris", trait="tirets")
style(hB, couleur="gris", trait="tirets")
style(hC, couleur="gris", trait="tirets")
angle_droit(A, FA, B)
angle_droit(B, FB, A)
angle_droit(C, FC, A)
H = orthocentre(A, B, C)
style(H, couleur="rouge")`;

	const cercleInscritDsl = `A = point(-4, -2, couleur="bleu")
B = point(4, -2, couleur="bleu")
C = point(0, 4, couleur="bleu")
triangle(A, B, C)
b1 = bissectrice(A, B, C)
b2 = bissectrice(B, C, A)
b3 = bissectrice(C, A, B)
style(b1, couleur="gris", trait="tirets")
style(b2, couleur="gris", trait="tirets")
style(b3, couleur="gris", trait="tirets")
(I, ci) = cercle_inscrit(A, B, C)
style(I, couleur="vert")
style(ci, couleur="vert")`;

	const cercleCirconscritDsl = `A = point(-4, -2, couleur="bleu")
B = point(4, -2, couleur="bleu")
C = point(0, 4, couleur="bleu")
triangle(A, B, C)
(M1, d1) = mediatrice(A, B)
(M2, d2) = mediatrice(B, C)
(M3, d3) = mediatrice(A, C)
style(d1, couleur="gris", trait="tirets")
style(d2, couleur="gris", trait="tirets")
style(d3, couleur="gris", trait="tirets")
(O, cc) = cercle_circonscrit(A, B, C)
style(O, couleur="violet")
style(cc, couleur="violet")`;

	const droiteEulerDsl = `A = point(-4, -2, couleur="bleu")
B = point(4, -2, couleur="bleu")
C = point(1, 4, couleur="bleu")
triangle(A, B, C)
G = centre_gravite(A, B, C)
style(G, couleur="orange")
H = orthocentre(A, B, C)
style(H, couleur="rouge")
(O, cc) = cercle_circonscrit(A, B, C)
style(O, couleur="violet")
style(cc, couleur="violet", trait="tirets")
de = droite_euler(A, B, C)
style(de, couleur="cyan")`;

	const cercleEulerDsl = `A = point(-4, -2, couleur="bleu")
B = point(4, -2, couleur="bleu")
C = point(1, 4, couleur="bleu")
triangle(A, B, C)
cc = cercle_circonscrit(A, B, C)
O = centre(cc)
montre(O, couleur="violet")
style(cc, couleur="violet", trait="tirets")
ce = cercle_euler(A, B, C)
Oe = centre(ce)
montre(Oe, couleur="cyan")
style(ce, couleur="cyan")
M1 = milieu(A, B)
M2 = milieu(B, C)
M3 = milieu(A, C)
style(M1, couleur="cyan")
style(M2, couleur="cyan")
style(M3, couleur="cyan")`;

	const tousPointsDsl = `A = point(-4, -2, couleur="bleu")
B = point(4, -2, couleur="bleu")
C = point(1, 4, couleur="bleu")
triangle(A, B, C)
G = centre_gravite(A, B, C)
style(G, couleur="orange")
H = orthocentre(A, B, C)
style(H, couleur="rouge")
cc = cercle_circonscrit(A, B, C)
O = centre(cc)
montre(O, couleur="violet")
style(cc, couleur="violet", trait="tirets")
ci = cercle_inscrit(A, B, C)
I = centre(ci)
montre(I, couleur="vert")
style(ci, couleur="vert")
ce = cercle_euler(A, B, C)
Oe = centre(ce)
montre(Oe, couleur="cyan")
style(ce, couleur="cyan")
de = droite_euler(A, B, C)
style(de, couleur="cyan", trait="tirets")`;
</script>

<div class="container mx-auto max-w-6xl space-y-10 p-4">
	<div>
		<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline">
			&larr; Geometry Demos
		</a>
		<h1 class="mt-2 text-2xl font-bold">Points remarquables du triangle</h1>
		<p class="text-muted-foreground">
			Exploration des proprietes geometriques remarquables d'un triangle. Deplacez les sommets A, B,
			C pour observer le comportement.
		</p>
	</div>

	<DslDemo
		dsl={centreGraviteDsl}
		title="Centre de gravite (G)"
		description="Intersection des trois medianes. G divise chaque mediane en ratio 2:1 depuis le sommet."
		width={600}
		height={500}
	/>

	<DslDemo
		dsl={orthocentreDsl}
		title="Orthocentre (H)"
		description="Intersection des trois hauteurs. Pour un triangle rectangle, H est au sommet de l'angle droit."
		width={600}
		height={500}
	/>

	<DslDemo
		dsl={cercleInscritDsl}
		title="Cercle inscrit"
		description="Cercle tangent aux trois cotes. Son centre I (incentre) est l'intersection des trois bissectrices."
		width={600}
		height={500}
	/>

	<DslDemo
		dsl={cercleCirconscritDsl}
		title="Cercle circonscrit"
		description="Cercle passant par les trois sommets. Son centre O est l'intersection des trois mediatrices."
		width={600}
		height={500}
	/>

	<DslDemo
		dsl={droiteEulerDsl}
		title="Droite d'Euler"
		description="G (orange), H (rouge) et O (violet) sont toujours alignes sur la droite d'Euler (cyan). Pour un triangle equilateral, les trois points sont confondus."
		width={600}
		height={500}
	/>

	<DslDemo
		dsl={cercleEulerDsl}
		title="Cercle d'Euler (9 points)"
		description="Cercle passant par les milieux des trois cotes. Son rayon est la moitie du rayon du cercle circonscrit."
		width={600}
		height={500}
	/>

	<DslDemo
		dsl={tousPointsDsl}
		title="Vue d'ensemble"
		description="Tous les elements remarquables reunis : G (orange), H (rouge), O (violet), I (vert), cercle d'Euler (cyan)."
		width={700}
		height={550}
	/>
</div>
