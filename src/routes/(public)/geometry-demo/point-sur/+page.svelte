<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	// ==========================================================================
	// point_sur(segment) — points glissants sur segments
	// ==========================================================================
	const segmentDsl = `A = point(0, 0, couleur="bleu")
B = point(6, 4, couleur="bleu")
s = segment(A, B, couleur="bleu")
P1 = point_sur(s, 0, couleur="rouge")
P2 = point_sur(s, 0.25, couleur="vert")
P3 = point_sur(s, 0.5, couleur="violet")
P4 = point_sur(s, 0.75, couleur="orange")
P5 = point_sur(s, 1, couleur="cyan")`;

	// ==========================================================================
	// point_sur(droite) — points glissants sur droite
	// ==========================================================================
	const lineDsl = `A = point(-2, -1, couleur="bleu")
B = point(3, 2, couleur="bleu")
d = droite(A, B, couleur="bleu")
Q1 = point_sur(d, -0.5, couleur="rouge")
Q2 = point_sur(d, 0, couleur="vert")
Q3 = point_sur(d, 0.5, couleur="violet")
Q4 = point_sur(d, 1, couleur="orange")
Q5 = point_sur(d, 1.5, couleur="cyan")`;

	// ==========================================================================
	// point_sur(demidroite) — points glissants sur demi-droite
	// ==========================================================================
	const rayDsl = `A = point(-1, 0, couleur="bleu")
B = point(3, 2, couleur="bleu")
r = demidroite(A, B, couleur="bleu")
R1 = point_sur(r, 0, couleur="rouge")
R2 = point_sur(r, 0.5, couleur="vert")
R3 = point_sur(r, 1, couleur="violet")
R4 = point_sur(r, 2, couleur="orange")`;

	// ==========================================================================
	// point_sur(cercle) — points glissants sur cercle
	// ==========================================================================
	const circleDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
S1 = point_sur(c, 0, couleur="rouge")
S2 = point_sur(c, 45, couleur="vert")
S3 = point_sur(c, 90, couleur="violet")
S4 = point_sur(c, 180, couleur="orange")
S5 = point_sur(c, 270, couleur="cyan")`;

	// ==========================================================================
	// point_sur(cercle passant) — cercle defini par point
	// ==========================================================================
	const circleByPtDsl = `O = point(0, 0, couleur="bleu")
A = point(4, 0, couleur="bleu")
c = cercle(O, passant=A, couleur="bleu")
S1 = point_sur(c, 60, couleur="rouge")
S2 = point_sur(c, 150, couleur="vert")
S3 = point_sur(c, 240, couleur="violet")`;

	// ==========================================================================
	// point_sur(arc) — points glissants sur arc (arcByAngles)
	// ==========================================================================
	const arcAnglesDsl = `O = point(0, 0, couleur="bleu")
a = arc(O, rayon=3, debut=0, fin=120, couleur="bleu")
T1 = point_sur(a, 0, couleur="rouge")
T2 = point_sur(a, 0.25, couleur="vert")
T3 = point_sur(a, 0.5, couleur="violet")
T4 = point_sur(a, 0.75, couleur="orange")
T5 = point_sur(a, 1, couleur="cyan")`;

	// ==========================================================================
	// point_sur(arc) — arc par points (arcByPoints)
	// ==========================================================================
	const arcPointsDsl = `A = point(4, 0, couleur="bleu")
O = point(0, 0, couleur="bleu")
B = point(0, 4, couleur="bleu")
a = arc(A, O, B, couleur="bleu")
T1 = point_sur(a, 0, couleur="rouge")
T2 = point_sur(a, 0.33, couleur="vert")
T3 = point_sur(a, 0.66, couleur="violet")
T4 = point_sur(a, 1, couleur="orange")`;

	// ==========================================================================
	// point_sur(courbe) — point glissant sur fonction y=f(x)
	// ==========================================================================
	const curveDsl = `f = courbe("y = x^2 - 2", couleur="bleu")
P = point_sur(f, -1.5, couleur="rouge")
g = courbe("y = sin(x)", couleur="vert")
Q = point_sur(g, 1, couleur="rouge")
h = courbe("y = 1/x", couleur="violet")
R = point_sur(h, 0.5, couleur="rouge")`;

	// ==========================================================================
	// point_sur(conique) — point glissant sur conique
	// ==========================================================================
	const conicDsl = `c1 = courbe("x^2 + y^2 - 9 = 0", couleur="bleu")
P1 = point_sur(c1, 30, couleur="rouge")
P2 = point_sur(c1, 150, couleur="rouge")
c2 = courbe("{x^2}/4 + {y^2}/9 - 1 = 0", couleur="vert")
P3 = point_sur(c2, 45, couleur="rouge")
P4 = point_sur(c2, 200, couleur="rouge")
c3 = courbe("y^2 - 4*x = 0", couleur="violet")
P5 = point_sur(c3, 2, couleur="rouge")
P6 = point_sur(c3, -2, couleur="rouge")`;

	// ==========================================================================
	// Tous ensemble — scene combinee
	// ==========================================================================
	const combinedDsl = `A = point(-6, -2, couleur="bleu")
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
R = point_sur(r, 1.5, couleur="rouge")`;
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>&larr; Retour aux demos</a
	>

	<h1 class="mt-4 mb-8 text-2xl font-bold">Points contraints — point_sur()</h1>

	<p class="mb-6 text-muted-foreground">
		Le builtin <code>point_sur(objet, param)</code> cree un point contraint a glisser le long d'un objet
		geometrique. Deplacez les points rouges/verts/violets pour les voir glisser sur leur objet parent.
	</p>

	<hr class="my-8" />

	<DslDemo
		dsl={segmentDsl}
		title="point_sur(segment) — t ∈ [0, 1]"
		description="5 points repartis sur le segment AB : t=0 (A), 0.25, 0.5 (milieu), 0.75, 1 (B). Deplacez-les — ils restent contraints au segment. Deplacez A ou B — tous les points suivent."
		center={{ x: 3, y: 2 }}
		pixelsPerUnit={50}
		width={700}
		height={400}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={lineDsl}
		title="point_sur(droite) — t ∈ ]-∞, +∞["
		description="Points sur une droite avec t = -0.5, 0, 0.5, 1, 1.5. Pas de clamping — les points peuvent aller au-dela des points definissants."
		center={{ x: 1, y: 1 }}
		pixelsPerUnit={40}
		width={700}
		height={400}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={rayDsl}
		title="point_sur(demidroite) — t ∈ [0, +∞["
		description="Points sur une demi-droite. t=0 est l'origine, t=1 est le point directeur, t=2 est au-dela. Le clamping empeche d'aller en arriere de l'origine."
		center={{ x: 2, y: 1 }}
		pixelsPerUnit={40}
		width={700}
		height={400}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={circleDsl}
		title="point_sur(cercle) — angle en degres"
		description="5 points sur un cercle de rayon 3 : 0° (droite), 45°, 90° (haut), 180° (gauche), 270° (bas). Deplacez-les — ils glissent le long du cercle. Deplacez le centre O — tous les points suivent."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={50}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={circleByPtDsl}
		title="point_sur(cercle passant) — cercle par point"
		description="Cercle defini par centre O et point passant A (rayon = OA). Deplacez A pour changer le rayon — les points contraints suivent."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={arcAnglesDsl}
		title="point_sur(arc par angles) — t ∈ [0, 1]"
		description="Arc de 0° a 120°, rayon 3. Points a t=0, 0.25, 0.5, 0.75, 1. t interpole lineairement l'angle entre debut et fin de l'arc."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={50}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={arcPointsDsl}
		title="point_sur(arc par points) — arc(A, O, B)"
		description="Arc defini par 3 points : debut A(4,0), centre O(0,0), fin B(0,4). Deplacez A ou B — l'arc et les points contraints se mettent a jour."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={50}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={curveDsl}
		title="point_sur(courbe) — fonctions y=f(x)"
		description="Points glissants sur des courbes de fonctions. Le parametre est la coordonnee x. Bleu : y = x² - 2 | Vert : y = sin(x) | Violet : y = 1/x. Deplacez les points rouges — ils glissent le long de leur courbe."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={conicDsl}
		title="point_sur(conique) — cercle, ellipse, parabole"
		description="Points glissants sur des coniques. Pour cercle/ellipse le parametre est en degres. Pour la parabole c'est un parametre brut t. Bleu : cercle x²+y²=9 | Vert : ellipse x²/4+y²/9=1 | Violet : parabole y²=4x."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={combinedDsl}
		title="Scene combinee"
		description="Segment, droite, demi-droite et cercle ensemble. Tous les points rouges sont draggable et contraints a leur objet parent."
		center={{ x: 0, y: 1 }}
		pixelsPerUnit={35}
		width={700}
		height={600}
	/>
</div>
