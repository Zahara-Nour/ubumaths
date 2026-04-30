<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	const circle3PointsDsl = `A = point(3, 0, couleur="bleu")
B = point(0, 3, couleur="bleu")
C = point(-3, 0, couleur="bleu")
c = cercle(A, B, C)
style(c, couleur="violet")

# Rayon reactif
r = rayon(c)
rtexte(-5, -4, "r = {r:.2f}")`;

	const circle3PointsIntersectionDsl = `A = point(3, 0, couleur="bleu")
B = point(0, 3, couleur="bleu")
C = point(-2, -1, couleur="bleu")
c = cercle(A, B, C)
style(c, couleur="violet")

# Intersection avec une droite
d = droite(point(-5, -1), point(5, 2))
style(d, couleur="gris", trait="tirets")
P1 = intersection(c, d, 1)
P2 = intersection(c, d, 2)
style(P1, couleur="rouge")
style(P2, couleur="rouge")`;

	const sectorByPointsDsl = `O = point(0, 0, couleur="noir")
A = point(4, 0, couleur="bleu")
B = point(0, 4, couleur="bleu")
s = secteur(O, A, B)
style(s, remplissage="bleu", opacite_fond=0.3)

# Arc de reference
segment(O, A, couleur="gris", trait="tirets")
segment(O, B, couleur="gris", trait="tirets")`;

	const sectorByAnglesDsl = `O = point(0, 0, couleur="noir")

# Trois secteurs colores
s1 = secteur(O, rayon=4, debut=0, fin=120)
style(s1, remplissage="rouge", opacite_fond=0.3)

s2 = secteur(O, rayon=4, debut=120, fin=240)
style(s2, remplissage="vert", opacite_fond=0.3)

s3 = secteur(O, rayon=4, debut=240, fin=360)
style(s3, remplissage="bleu", opacite_fond=0.3)`;

	const annulusDsl = `O = point(0, 0, couleur="noir")
a = couronne(O, r1=2, r2=4)
style(a, remplissage="violet", opacite_fond=0.3)`;

	const annulusSliderDsl = `O = point(0, 0, couleur="noir")
r1 = slider(min=0.5, max=3, valeur=1.5, pas=0.1)
r2 = slider(min=2, max=6, valeur=4, pas=0.1)
a = couronne(O, r1=r1, r2=r2)
style(a, remplissage="cyan", opacite_fond=0.3)

rtexte(-5, -5, "r1 = {r1:.1f}, r2 = {r2:.1f}")`;

	const chordDsl = `O = point(0, 0, couleur="noir")
c = cercle(O, rayon=5)
style(c, couleur="gris")

# Corde horizontale
d1 = droite(point(-6, 2), point(6, 2))
style(d1, couleur="gris", trait="tirets")
(P1, P2, s1) = corde(c, d1)
style(s1, couleur="rouge", epaisseur=2)

# Corde oblique
d2 = droite(point(-6, -3), point(6, 1))
style(d2, couleur="gris", trait="tirets")
(P3, P4, s2) = corde(c, d2)
style(s2, couleur="bleu", epaisseur=2)`;

	const powerDsl = `O = point(0, 0, couleur="noir")
c = cercle(O, rayon=3)
style(c, couleur="gris")

P = point(5, 0, couleur="rouge")
p = puissance(P, c)
rtexte(3, -3, "puissance = {p:.1f}")

# Visualisation : segment OP
segment(O, P, couleur="gris", trait="tirets")`;

	const fillDemoDsl = `# Polygone rempli
A = point(-5, -2)
B = point(-1, -2)
C = point(-3, 2)
p = polygone(A, B, C)
style(p, remplissage="rouge", opacite_fond=0.4)

# Cercle rempli
O = point(3, 0, couleur="noir")
c = cercle(O, rayon=2)
style(c, remplissage="bleu", opacite_fond=0.3)`;
</script>

<svelte:head>
	<title>Cercles — Geometry Demo</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-10 p-4">
	<div>
		<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
			>← Geometry Demos</a
		>
		<h1 class="mt-2 text-2xl font-bold">Constructions sur les cercles</h1>
		<p class="text-muted-foreground">
			Cercle par 3 points, secteur circulaire, couronne, corde, puissance d'un point, remplissage.
		</p>
	</div>

	<DslDemo
		dsl={circle3PointsDsl}
		title="Cercle par 3 points"
		description="cercle(A, B, C) cree le cercle passant par les 3 points. Deplacez les points pour voir le cercle reagir."
		width={600}
		height={450}
	/>

	<hr />

	<DslDemo
		dsl={circle3PointsIntersectionDsl}
		title="Intersection avec cercle par 3 points"
		description="Le cercle par 3 points supporte les intersections avec des droites, tout comme les autres cercles."
		width={600}
		height={450}
	/>

	<hr />

	<DslDemo
		dsl={sectorByPointsDsl}
		title="Secteur circulaire (par points)"
		description="secteur(O, A, B) cree un secteur du centre O, de la direction OA a OB (sens trigonometrique). Rempli par defaut."
		width={600}
		height={450}
	/>

	<hr />

	<DslDemo
		dsl={sectorByAnglesDsl}
		title="Secteur circulaire (par angles)"
		description="secteur(O, rayon=r, debut=a, fin=b) cree un secteur par angles en degres. Ici trois secteurs de 120 degres chacun."
		width={600}
		height={450}
	/>

	<hr />

	<DslDemo
		dsl={annulusDsl}
		title="Couronne (anneau)"
		description="couronne(O, r1=2, r2=4) cree une couronne de centre O entre les rayons r1 et r2."
		width={600}
		height={450}
	/>

	<hr />

	<DslDemo
		dsl={annulusSliderDsl}
		title="Couronne avec sliders"
		description="Les rayons de la couronne peuvent etre controles par des sliders pour une exploration interactive."
		width={600}
		height={450}
	/>

	<hr />

	<DslDemo
		dsl={chordDsl}
		title="Corde"
		description="corde(c, d) cree le segment d'intersection entre un cercle et une droite. Retourne (P1, P2, segment)."
		width={700}
		height={500}
		pixelsPerUnit={35}
	/>

	<hr />

	<DslDemo
		dsl={powerDsl}
		title="Puissance d'un point"
		description="puissance(P, c) calcule d(P, centre)^2 - r^2. Positif a l'exterieur, negatif a l'interieur, nul sur le cercle."
		width={600}
		height={450}
	/>

	<hr />

	<DslDemo
		dsl={fillDemoDsl}
		title="Remplissage (style)"
		description="style(element, remplissage='couleur', opacite_fond=0.5) permet de remplir polygones, cercles, secteurs et couronnes."
		width={600}
		height={450}
	/>
</div>
