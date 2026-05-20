<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	// ==========================================================================
	// Intersection droite-cercle — intersection(d, c, index)
	// ==========================================================================
	const intersectionLCDsl = `O = point(0, 0, couleur="noir")
A = point(-8, 0)
B = point(8, 0)
d = droite(A, B, couleur="bleu", trait="tirets")
c = cercle(O, rayon=3, couleur="vert")
P = intersection(d, c, 1)
Q = intersection(d, c, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")
segment(O, P, couleur="gris", trait="tirets")
segment(O, Q, couleur="gris", trait="tirets")`;

	// ==========================================================================
	// Intersection cercle-cercle — triangle equilateral au compas
	// ==========================================================================
	const intersectionCCDsl = `A = point(-2, 0, couleur="bleu")
B = point(2, 0, couleur="bleu")
segment(A, B, couleur="bleu")
c1 = cercle(A, passant=B, couleur="vert", trait="tirets")
c2 = cercle(B, passant=A, couleur="orange", trait="tirets")
P = intersection(c1, c2, 1)
Q = intersection(c1, c2, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")
segment(A, P, couleur="rouge")
segment(B, P, couleur="rouge")
segment(A, Q, couleur="violet")
segment(B, Q, couleur="violet")`;

	// ==========================================================================
	// Intersection — mediatrice a la regle et au compas
	// ==========================================================================
	const compassBisectorDsl = `A = point(-3, 0, couleur="bleu")
B = point(3, 0, couleur="bleu")
segment(A, B, couleur="bleu")
c1 = cercle(A, passant=B, couleur="vert", trait="tirets")
c2 = cercle(B, passant=A, couleur="orange", trait="tirets")
P = intersection(c1, c2, 1)
Q = intersection(c1, c2, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")
med = droite(P, Q, couleur="rouge")
M = milieu(A, B)
style(M, couleur="violet")
angle(A, M, P, marque="carre")`;

	// ==========================================================================
	// Intersection mixte — droite + cercle + cercle combinee
	// ==========================================================================
	const intersectionMixedDsl = `O1 = point(-2, 0, couleur="noir")
O2 = point(2, 0, couleur="noir")
c1 = cercle(O1, rayon=3, couleur="bleu")
c2 = cercle(O2, rayon=3, couleur="vert")

P = intersection(c1, c2, 1)
Q = intersection(c1, c2, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")

d = droite(P, Q, couleur="rouge", trait="tirets")

A = point(-5, -2)
B = point(5, 2)
d2 = droite(A, B, couleur="violet", trait="tirets")
R = intersection(d2, c1, 1)
S = intersection(d2, c1, 2)
style(R, couleur="orange")
style(S, couleur="orange")
T = intersection(d2, c2, 1)
U = intersection(d2, c2, 2)
style(T, couleur="cyan")
style(U, couleur="cyan")`;

	// ==========================================================================
	// Intersection droite-conique (LQ)
	// ==========================================================================
	const intersectionLQDsl = `A = point(-6, -1)
B = point(6, 1)
d = droite(A, B, couleur="bleu", trait="tirets")
q = courbe("4*x^2 + 9*y^2 - 36 = 0", couleur="vert")
P = intersection(d, q, 1)
Q = intersection(d, q, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")`;

	// ==========================================================================
	// Intersection droite-hyperbole (LQ)
	// ==========================================================================
	const intersectionLQHyperbolaDsl = `A = point(-6, -2)
B = point(6, 2)
d = droite(A, B, couleur="bleu", trait="tirets")
q = courbe("x^2 - y^2 - 4 = 0", couleur="orange")
P = intersection(d, q, 1)
Q = intersection(d, q, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")`;

	// ==========================================================================
	// Intersection droite-parabole (LQ)
	// ==========================================================================
	const intersectionLQParabolaDsl = `A = point(3, -4)
B = point(3, 4)
d = droite(A, B, couleur="bleu", trait="tirets")
q = courbe("y^2 - x = 0", couleur="violet")
P = intersection(d, q, 1)
Q = intersection(d, q, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")`;

	// ==========================================================================
	// Intersection conique-conique (QQ) — cercle + ellipse
	// ==========================================================================
	const intersectionQQDsl = `O = point(0, 0, couleur="noir")
c = cercle(O, rayon=2, couleur="bleu")
q = courbe("4*x^2 + 9*y^2 - 36 = 0", couleur="vert")
P1 = intersection(c, q, 1)
P2 = intersection(c, q, 2)
P3 = intersection(c, q, 3)
P4 = intersection(c, q, 4)
style(P1, couleur="rouge")
style(P2, couleur="rouge")
style(P3, couleur="rouge")
style(P4, couleur="rouge")`;

	// ==========================================================================
	// Intersection conique-conique (QQ) — deux ellipses
	// ==========================================================================
	const intersectionQQEllipsesDsl = `q1 = courbe("x^2 + 4*y^2 - 4 = 0", couleur="bleu")
q2 = courbe("4*x^2 + y^2 - 4 = 0", couleur="vert")
P1 = intersection(q1, q2, 1)
P2 = intersection(q1, q2, 2)
P3 = intersection(q1, q2, 3)
P4 = intersection(q1, q2, 4)
style(P1, couleur="rouge")
style(P2, couleur="rouge")
style(P3, couleur="rouge")
style(P4, couleur="rouge")`;

	// ==========================================================================
	// Intersection droite-fonction (LF)
	// ==========================================================================
	const intersectionLFDsl = `A = point(-3, -1)
B = point(3, 1)
d = droite(A, B, couleur="bleu", trait="tirets")
f = courbe("y = x^2 - 2", couleur="vert")
P = intersection(d, f, 1)
Q = intersection(d, f, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")`;

	// ==========================================================================
	// Intersection fonction-fonction (FF)
	// ==========================================================================
	const intersectionFFDsl = `unite_angle("radians")
f = courbe("y = sin(x)", couleur="bleu")
g = courbe("y = x/3", couleur="vert")
P = intersection(f, g, 1)
Q = intersection(f, g, 2)
R = intersection(f, g, 3)
style(P, couleur="rouge")
style(Q, couleur="rouge")
style(R, couleur="rouge")`;

	// ==========================================================================
	// LF: droite oblique et cubique
	// ==========================================================================
	const intersectionLFCubicDsl = `A = point(-4, -2)
B = point(4, 2)
d = droite(A, B, couleur="bleu", trait="tirets")
f = courbe("y = x^3 - 3*x", couleur="vert")
P = intersection(d, f, 1)
Q = intersection(d, f, 2)
R = intersection(d, f, 3)
style(P, couleur="rouge")
style(Q, couleur="rouge")
style(R, couleur="rouge")`;

	// ==========================================================================
	// LF: droite et exponentielle
	// ==========================================================================
	const intersectionLFExpDsl = `A = point(-5, 2)
B = point(5, 4)
d = droite(A, B, couleur="bleu", trait="tirets")
f = courbe("y = exp(x)", couleur="vert")
P = intersection(d, f, 1)
Q = intersection(d, f, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")`;

	// ==========================================================================
	// FF: deux transcendantes sin(x) et cos(x)
	// ==========================================================================
	const intersectionFFTrigDsl = `unite_angle("radians")
f = courbe("y = sin(x)", couleur="bleu")
g = courbe("y = cos(x)", couleur="vert")
P = intersection(f, g, 1)
Q = intersection(f, g, 2)
R = intersection(f, g, 3)
S = intersection(f, g, 4)
T = intersection(f, g, 5)
U = intersection(f, g, 6)
style(P, couleur="rouge")
style(Q, couleur="rouge")
style(R, couleur="rouge")
style(S, couleur="rouge")
style(T, couleur="rouge")
style(U, couleur="rouge")`;
</script>

<div class="mx-auto max-w-6xl space-y-10 p-4">
	<div>
		<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
			>← Retour aux demos</a
		>
		<h1 class="mt-4 text-2xl font-bold">Intersections — geometry-core</h1>
	</div>

	<hr />

	<DslDemo
		dsl={intersectionLCDsl}
		title="Intersection droite-cercle — intersection(d, c, index)"
		description="intersection(d, c, 1) et intersection(d, c, 2) retournent les 2 points d'intersection d'une droite et d'un cercle. Deplacez la droite (A, B) ou le centre du cercle (O)."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr />

	<DslDemo
		dsl={intersectionCCDsl}
		title="Intersection cercle-cercle — triangle equilateral au compas"
		description="Construction classique a la regle et au compas : deux cercles de meme rayon centres en A et B s'intersectent en deux points P et Q formant deux triangles equilateraux."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={50}
		width={700}
		height={500}
	/>

	<hr />

	<DslDemo
		dsl={compassBisectorDsl}
		title="Mediatrice a la regle et au compas"
		description="Construction de la mediatrice de AB par intersection de deux cercles : les points P et Q definissent la mediatrice, et M est le milieu. Deplacez A ou B pour voir la construction s'adapter."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr />

	<DslDemo
		dsl={intersectionMixedDsl}
		title="Intersections combinees — droite + cercle + cercle"
		description="Deux cercles secants avec leur axe radical (droite rouge tirets passant par P et Q). Une droite oblique coupe les deux cercles en 4 points supplementaires."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr />

	<DslDemo
		dsl={intersectionLQDsl}
		title="Intersection droite-conique (LQ)"
		description="Droite coupant une ellipse (4x² + 9y² = 36). Deplacez les points A et B pour modifier la droite. Les 2 points d'intersection rouges suivent en temps reel."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr />

	<DslDemo
		dsl={intersectionLQHyperbolaDsl}
		title="Intersection droite-hyperbole (LQ)"
		description="Droite coupant une hyperbole (x² - y² = 4). Deplacez A et B. Selon l'angle, la droite peut couper les deux branches, une seule, ou etre parallele a une asymptote."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr />

	<DslDemo
		dsl={intersectionLQParabolaDsl}
		title="Intersection droite-parabole (LQ)"
		description="Droite coupant une parabole laterale (y² = x). Deplacez A et B pour varier le nombre d'intersections : 2 points (secante), 1 point (tangente), ou 0 (exterieure)."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr />

	<DslDemo
		dsl={intersectionQQDsl}
		title="Intersection cercle-ellipse (QQ)"
		description="Cercle (rayon 2) et ellipse (4x² + 9y² = 36). Deplacez le centre O du cercle pour voir les 4 points d'intersection rouges se deplacer."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr />

	<DslDemo
		dsl={intersectionQQEllipsesDsl}
		title="Intersection deux ellipses (QQ)"
		description="Deux ellipses perpendiculaires : x² + 4y² = 4 (horizontale) et 4x² + y² = 4 (verticale). 4 points d'intersection symetriques."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={60}
		width={700}
		height={500}
	/>

	<hr />

	<DslDemo
		dsl={intersectionLFDsl}
		title="Intersection droite-fonction (LF)"
		description="Droite coupant une parabole y = x² - 2. Deplacez les points A et B pour modifier la droite. Les 2 points d'intersection rouges suivent en temps reel."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr />

	<DslDemo
		dsl={intersectionFFDsl}
		title="Intersection fonction-fonction (FF)"
		description="y = sin(x) et y = x/3. Multiples points d'intersection detectes par resolution hybride (symbolique + numerique)."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr />

	<DslDemo
		dsl={intersectionLFCubicDsl}
		title="Intersection droite-cubique (LF)"
		description="Droite oblique coupant y = x³ - 3x. Deplacez A et B pour explorer les differentes configurations : 1, 2, ou 3 points d'intersection selon la pente de la droite."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr />

	<DslDemo
		dsl={intersectionLFExpDsl}
		title="Intersection droite-exponentielle (LF)"
		description="Droite coupant y = eˣ. Selon la position de la droite, il peut y avoir 0, 1 (tangente), ou 2 points d'intersection. Deplacez A et B pour explorer."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr />

	<DslDemo
		dsl={intersectionFFTrigDsl}
		title="Intersection sin(x) et cos(x) (FF)"
		description="y = sin(x) et y = cos(x) se croisent aux points ou tan(x) = 1, soit x = π/4 + kπ. 6 points d'intersection detectes dans [-10, 10]."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>
</div>
