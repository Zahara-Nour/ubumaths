<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { runDsl } from '$lib/geometry-core/dsl';

	// ==========================================================================
	// point_sur(segment) — points glissants sur segments
	// ==========================================================================
	const segmentFig = runDsl(
		`A = point(0, 0, couleur="bleu")
B = point(6, 4, couleur="bleu")
s = segment(A, B, couleur="bleu")
P1 = point_sur(s, 0, couleur="rouge")
P2 = point_sur(s, 0.25, couleur="vert")
P3 = point_sur(s, 0.5, couleur="violet")
P4 = point_sur(s, 0.75, couleur="orange")
P5 = point_sur(s, 1, couleur="cyan")`
	).figure;

	// ==========================================================================
	// point_sur(droite) — points glissants sur droite
	// ==========================================================================
	const lineFig = runDsl(
		`A = point(-2, -1, couleur="bleu")
B = point(3, 2, couleur="bleu")
d = droite(A, B, couleur="bleu")
Q1 = point_sur(d, -0.5, couleur="rouge")
Q2 = point_sur(d, 0, couleur="vert")
Q3 = point_sur(d, 0.5, couleur="violet")
Q4 = point_sur(d, 1, couleur="orange")
Q5 = point_sur(d, 1.5, couleur="cyan")`
	).figure;

	// ==========================================================================
	// point_sur(demidroite) — points glissants sur demi-droite
	// ==========================================================================
	const rayFig = runDsl(
		`A = point(-1, 0, couleur="bleu")
B = point(3, 2, couleur="bleu")
r = demidroite(A, B, couleur="bleu")
R1 = point_sur(r, 0, couleur="rouge")
R2 = point_sur(r, 0.5, couleur="vert")
R3 = point_sur(r, 1, couleur="violet")
R4 = point_sur(r, 2, couleur="orange")`
	).figure;

	// ==========================================================================
	// point_sur(cercle) — points glissants sur cercle
	// ==========================================================================
	const circleFig = runDsl(
		`O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
S1 = point_sur(c, 0, couleur="rouge")
S2 = point_sur(c, 45, couleur="vert")
S3 = point_sur(c, 90, couleur="violet")
S4 = point_sur(c, 180, couleur="orange")
S5 = point_sur(c, 270, couleur="cyan")`
	).figure;

	// ==========================================================================
	// point_sur(cercle passant) — cercle defini par point
	// ==========================================================================
	const circleByPtFig = runDsl(
		`O = point(0, 0, couleur="bleu")
A = point(4, 0, couleur="bleu")
c = cercle(O, passant=A, couleur="bleu")
S1 = point_sur(c, 60, couleur="rouge")
S2 = point_sur(c, 150, couleur="vert")
S3 = point_sur(c, 240, couleur="violet")`
	).figure;

	// ==========================================================================
	// point_sur(arc) — points glissants sur arc (arcByAngles)
	// ==========================================================================
	const arcAnglesFig = runDsl(
		`O = point(0, 0, couleur="bleu")
a = arc(O, rayon=3, debut=0, fin=120, couleur="bleu")
T1 = point_sur(a, 0, couleur="rouge")
T2 = point_sur(a, 0.25, couleur="vert")
T3 = point_sur(a, 0.5, couleur="violet")
T4 = point_sur(a, 0.75, couleur="orange")
T5 = point_sur(a, 1, couleur="cyan")`
	).figure;

	// ==========================================================================
	// point_sur(arc) — arc par points (arcByPoints)
	// ==========================================================================
	const arcPointsFig = runDsl(
		`A = point(4, 0, couleur="bleu")
O = point(0, 0, couleur="bleu")
B = point(0, 4, couleur="bleu")
a = arc(A, O, B, couleur="bleu")
T1 = point_sur(a, 0, couleur="rouge")
T2 = point_sur(a, 0.33, couleur="vert")
T3 = point_sur(a, 0.66, couleur="violet")
T4 = point_sur(a, 1, couleur="orange")`
	).figure;

	// ==========================================================================
	// Tous ensemble — scene combinee
	// ==========================================================================
	const combinedFig = runDsl(
		`A = point(-6, -2, couleur="bleu")
B = point(-2, 2, couleur="bleu")
s = segment(A, B, couleur="bleu")
P = point_sur(s, couleur="rouge")
C = point(0, -2, couleur="vert")
D = point(4, 1, couleur="vert")
d = droite(C, D, couleur="vert")
Q = point_sur(d, 0.5, couleur="rouge")
O = point(5, 2, couleur="violet")
c = cercle(O, rayon=2, couleur="violet")
S = point_sur(c, 45, couleur="rouge")
E = point(-5, 3, couleur="orange")
F = point(-3, 3, couleur="orange")
r = demidroite(E, F, couleur="orange")
R = point_sur(r, 1.5, couleur="rouge")`
	).figure;
</script>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>&larr; Retour aux demos</a
	>

	<h1 class="mt-4 mb-8 text-2xl font-bold">Points contraints — point_sur()</h1>

	<p class="mb-6 text-muted-foreground">
		Le builtin <code>point_sur(objet, param)</code> cree un point contraint a glisser le long d'un objet
		geometrique. Deplacez les points rouges/verts/violets pour les voir glisser sur leur objet parent.
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">point_sur(segment) — t &isin; [0, 1]</h2>
	<p class="mb-4 text-muted-foreground">
		5 points repartis sur le segment AB : t=0 (A), 0.25, 0.5 (milieu), 0.75, 1 (B). Deplacez-les —
		ils restent contraints au segment. Deplacez A ou B — tous les points suivent.
	</p>
	<GeometryCanvas
		figure={segmentFig}
		center={{ x: 3, y: 2 }}
		pixelsPerUnit={50}
		width={800}
		height={400}
	/>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">point_sur(droite) — t &isin; ]-&infin;, +&infin;[</h2>
	<p class="mb-4 text-muted-foreground">
		Points sur une droite avec t = -0.5, 0, 0.5, 1, 1.5. Pas de clamping — les points peuvent aller
		au-dela des points definissants.
	</p>
	<GeometryCanvas
		figure={lineFig}
		center={{ x: 1, y: 1 }}
		pixelsPerUnit={40}
		width={800}
		height={400}
	/>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">point_sur(demidroite) — t &isin; [0, +&infin;[</h2>
	<p class="mb-4 text-muted-foreground">
		Points sur une demi-droite. t=0 est l'origine, t=1 est le point directeur, t=2 est au-dela. Le
		clamping empeche d'aller en arriere de l'origine.
	</p>
	<GeometryCanvas
		figure={rayFig}
		center={{ x: 2, y: 1 }}
		pixelsPerUnit={40}
		width={800}
		height={400}
	/>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">point_sur(cercle) — angle en degres</h2>
	<p class="mb-4 text-muted-foreground">
		5 points sur un cercle de rayon 3 : 0&deg; (droite), 45&deg;, 90&deg; (haut), 180&deg; (gauche),
		270&deg; (bas). Deplacez-les — ils glissent le long du cercle. Deplacez le centre O — tous les
		points suivent.
	</p>
	<GeometryCanvas
		figure={circleFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={50}
		width={800}
		height={500}
	/>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">point_sur(cercle passant) — cercle par point</h2>
	<p class="mb-4 text-muted-foreground">
		Cercle defini par centre O et point passant A (rayon = OA). Deplacez A pour changer le rayon —
		les points contraints suivent.
	</p>
	<GeometryCanvas
		figure={circleByPtFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={500}
	/>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">point_sur(arc par angles) — t &isin; [0, 1]</h2>
	<p class="mb-4 text-muted-foreground">
		Arc de 0&deg; a 120&deg;, rayon 3. Points a t=0, 0.25, 0.5, 0.75, 1. t interpole lineairement
		l'angle entre debut et fin de l'arc.
	</p>
	<GeometryCanvas
		figure={arcAnglesFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={50}
		width={800}
		height={500}
	/>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">point_sur(arc par points) — arc(A, O, B)</h2>
	<p class="mb-4 text-muted-foreground">
		Arc defini par 3 points : debut A(4,0), centre O(0,0), fin B(0,4). Deplacez A ou B — l'arc et
		les points contraints se mettent a jour.
	</p>
	<GeometryCanvas
		figure={arcPointsFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={50}
		width={800}
		height={500}
	/>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Scene combinee</h2>
	<p class="mb-4 text-muted-foreground">
		Segment, droite, demi-droite et cercle ensemble. Tous les points rouges sont draggable et
		contraints a leur objet parent.
	</p>
	<GeometryCanvas
		figure={combinedFig}
		center={{ x: 0, y: 1 }}
		pixelsPerUnit={35}
		width={800}
		height={600}
	/>
</div>
