<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { runDsl } from '$lib/geometry-core/dsl';

	// ==========================================================================
	// Intersection droite-cercle — intersection(d, c, index)
	// ==========================================================================
	const intersectionLCFig = runDsl(
		`O = point(0, 0, couleur="noir")
A = point(-8, 0)
B = point(8, 0)
d = droite(A, B, couleur="bleu", trait="tirets")
c = cercle(O, rayon=3, couleur="vert")
P = intersection(d, c, 1)
Q = intersection(d, c, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")
segment(O, P, couleur="gris", trait="tirets")
segment(O, Q, couleur="gris", trait="tirets")`
	).figure;

	// ==========================================================================
	// Intersection cercle-cercle — triangle equilateral au compas
	// ==========================================================================
	const intersectionCCFig = runDsl(
		`A = point(-2, 0, couleur="bleu")
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
segment(B, Q, couleur="violet")`
	).figure;

	// ==========================================================================
	// Intersection — mediatrice a la regle et au compas
	// ==========================================================================
	const compassBisectorFig = runDsl(
		`A = point(-3, 0, couleur="bleu")
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
angle_droit(A, M, P)`
	).figure;

	// ==========================================================================
	// Intersection mixte — droite + cercle + cercle combinee
	// ==========================================================================
	const intersectionMixedFig = runDsl(
		`O1 = point(-2, 0, couleur="noir")
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
style(U, couleur="cyan")`
	).figure;

	// ==========================================================================
	// Intersection droite-conique (LQ)
	// ==========================================================================
	const intersectionLQFig = runDsl(
		`A = point(-6, -1)
B = point(6, 1)
d = droite(A, B, couleur="bleu", trait="tirets")
q = courbe("4*x^2 + 9*y^2 - 36 = 0", couleur="vert")
P = intersection(d, q, 1)
Q = intersection(d, q, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")`
	).figure;

	// ==========================================================================
	// Intersection droite-hyperbole (LQ)
	// ==========================================================================
	const intersectionLQHyperbolaFig = runDsl(
		`A = point(-6, -2)
B = point(6, 2)
d = droite(A, B, couleur="bleu", trait="tirets")
q = courbe("x^2 - y^2 - 4 = 0", couleur="orange")
P = intersection(d, q, 1)
Q = intersection(d, q, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")`
	).figure;

	// ==========================================================================
	// Intersection droite-parabole (LQ)
	// ==========================================================================
	const intersectionLQParabolaFig = runDsl(
		`A = point(3, -4)
B = point(3, 4)
d = droite(A, B, couleur="bleu", trait="tirets")
q = courbe("y^2 - x = 0", couleur="violet")
P = intersection(d, q, 1)
Q = intersection(d, q, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")`
	).figure;

	// ==========================================================================
	// Intersection conique-conique (QQ) — cercle + ellipse
	// ==========================================================================
	const intersectionQQFig = runDsl(
		`O = point(0, 0, couleur="noir")
c = cercle(O, rayon=2, couleur="bleu")
q = courbe("4*x^2 + 9*y^2 - 36 = 0", couleur="vert")
P1 = intersection(c, q, 1)
P2 = intersection(c, q, 2)
P3 = intersection(c, q, 3)
P4 = intersection(c, q, 4)
style(P1, couleur="rouge")
style(P2, couleur="rouge")
style(P3, couleur="rouge")
style(P4, couleur="rouge")`
	).figure;

	// ==========================================================================
	// Intersection conique-conique (QQ) — deux ellipses
	// ==========================================================================
	const intersectionQQEllipsesFig = runDsl(
		`q1 = courbe("x^2 + 4*y^2 - 4 = 0", couleur="bleu")
q2 = courbe("4*x^2 + y^2 - 4 = 0", couleur="vert")
P1 = intersection(q1, q2, 1)
P2 = intersection(q1, q2, 2)
P3 = intersection(q1, q2, 3)
P4 = intersection(q1, q2, 4)
style(P1, couleur="rouge")
style(P2, couleur="rouge")
style(P3, couleur="rouge")
style(P4, couleur="rouge")`
	).figure;

	// ==========================================================================
	// Intersection droite-fonction (LF)
	// ==========================================================================
	const intersectionLFFig = runDsl(
		`A = point(-3, -1)
B = point(3, 1)
d = droite(A, B, couleur="bleu", trait="tirets")
f = courbe("y = x^2 - 2", couleur="vert")
P = intersection(d, f, 1)
Q = intersection(d, f, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")`
	).figure;

	// ==========================================================================
	// Intersection fonction-fonction (FF)
	// ==========================================================================
	const intersectionFFFig = runDsl(
		`f = courbe("y = sin(x)", couleur="bleu")
g = courbe("y = x/3", couleur="vert")
P = intersection(f, g, 1)
Q = intersection(f, g, 2)
R = intersection(f, g, 3)
style(P, couleur="rouge")
style(Q, couleur="rouge")
style(R, couleur="rouge")`
	).figure;

	// ==========================================================================
	// LF: droite oblique et cubique
	// ==========================================================================
	const intersectionLFCubicFig = runDsl(
		`A = point(-4, -2)
B = point(4, 2)
d = droite(A, B, couleur="bleu", trait="tirets")
f = courbe("y = x^3 - 3*x", couleur="vert")
P = intersection(d, f, 1)
Q = intersection(d, f, 2)
R = intersection(d, f, 3)
style(P, couleur="rouge")
style(Q, couleur="rouge")
style(R, couleur="rouge")`
	).figure;

	// ==========================================================================
	// LF: droite et exponentielle
	// ==========================================================================
	const intersectionLFExpFig = runDsl(
		`A = point(-5, 2)
B = point(5, 4)
d = droite(A, B, couleur="bleu", trait="tirets")
f = courbe("y = exp(x)", couleur="vert")
P = intersection(d, f, 1)
Q = intersection(d, f, 2)
style(P, couleur="rouge")
style(Q, couleur="rouge")`
	).figure;

	// ==========================================================================
	// FF: deux transcendantes sin(x) et cos(x)
	// ==========================================================================
	const intersectionFFTrigFig = runDsl(
		`f = courbe("y = sin(x)", couleur="bleu")
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
style(U, couleur="rouge")`
	).figure;
</script>

<div class="p-4">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>← Retour aux demos</a
	>

	<h1 class="mt-4 mb-4 text-2xl font-bold">Intersections — geometry-core</h1>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Intersection droite-cercle — intersection(d, c, index)</h2>
	<p class="mb-4 text-muted-foreground">
		<code>intersection(d, c, 1)</code> et <code>intersection(d, c, 2)</code> retournent les 2 points
		d'intersection d'une droite et d'un cercle. Deplacez la droite (A, B) ou le centre du cercle
		(O).
		<br />
		<strong>Bleu tirets</strong> : droite |
		<strong>Vert</strong> : cercle |
		<strong>Rouge</strong> : points d'intersection P et Q
	</p>

	<GeometryCanvas
		figure={intersectionLCFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{intersectionLCFig.size} elements | intersection droite-cercle
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">
		Intersection cercle-cercle — triangle equilateral au compas
	</h2>
	<p class="mb-4 text-muted-foreground">
		Construction classique a la regle et au compas : deux cercles de meme rayon centres en A et B
		s'intersectent en deux points P et Q formant deux triangles equilateraux.
		<br />
		<strong>Bleu</strong> : segment AB |
		<strong>Vert/Orange tirets</strong> : cercles |
		<strong>Rouge</strong> : triangle ABP |
		<strong>Violet</strong> : triangle ABQ
	</p>

	<GeometryCanvas
		figure={intersectionCCFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={50}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{intersectionCCFig.size} elements | intersection cercle-cercle — triangles equilateraux
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Mediatrice a la regle et au compas</h2>
	<p class="mb-4 text-muted-foreground">
		Construction de la mediatrice de AB par intersection de deux cercles : les points P et Q
		definissent la mediatrice, et M est le milieu. Deplacez A ou B pour voir la construction
		s'adapter.
		<br />
		<strong>Bleu</strong> : segment AB |
		<strong>Vert/Orange tirets</strong> : cercles |
		<strong>Rouge</strong> : mediatrice PQ |
		<strong>Violet</strong> : milieu M + angle droit
	</p>

	<GeometryCanvas
		figure={compassBisectorFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{compassBisectorFig.size} elements | mediatrice — construction au compas
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Intersections combinees — droite + cercle + cercle</h2>
	<p class="mb-4 text-muted-foreground">
		Deux cercles secants (bleu et vert) avec leur axe radical (droite rouge tirets passant par P et
		Q). Une droite oblique (violet) coupe les deux cercles en 4 points supplementaires.
		<br />
		<strong>Bleu/Vert</strong> : cercles |
		<strong>Rouge</strong> : intersections CC (P, Q) + axe radical |
		<strong>Orange</strong> : intersections droite-cercle bleu |
		<strong>Cyan</strong> : intersections droite-cercle vert
	</p>

	<GeometryCanvas
		figure={intersectionMixedFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{intersectionMixedFig.size} elements | intersections combinees LC + CC
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Intersection droite-conique (LQ)</h2>
	<p class="mb-4 text-muted-foreground">
		Droite coupant une ellipse (4x² + 9y² = 36). Deplacez les points A et B pour modifier la droite.
		Les 2 points d'intersection (rouges) suivent en temps reel.
	</p>

	<GeometryCanvas
		figure={intersectionLQFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{intersectionLQFig.size} elements | intersection droite-ellipse (LQ)
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Intersection droite-hyperbole (LQ)</h2>
	<p class="mb-4 text-muted-foreground">
		Droite coupant une hyperbole (x² - y² = 4). Deplacez A et B. Selon l'angle, la droite peut
		couper les deux branches, une seule, ou etre parallele a une asymptote (1 seul point).
	</p>

	<GeometryCanvas
		figure={intersectionLQHyperbolaFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{intersectionLQHyperbolaFig.size} elements | intersection droite-hyperbole (LQ)
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Intersection droite-parabole (LQ)</h2>
	<p class="mb-4 text-muted-foreground">
		Droite coupant une parabole laterale (y² = x). Deplacez A et B pour varier le nombre
		d'intersections : 2 points (secante), 1 point (tangente), ou 0 (exterieure).
	</p>

	<GeometryCanvas
		figure={intersectionLQParabolaFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{intersectionLQParabolaFig.size} elements | intersection droite-parabole (LQ)
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Intersection cercle-ellipse (QQ)</h2>
	<p class="mb-4 text-muted-foreground">
		Cercle (bleu, rayon 2) et ellipse (verte, 4x² + 9y² = 36). Deplacez le centre O du cercle pour
		voir les 4 points d'intersection (rouges) se deplacer.
	</p>

	<GeometryCanvas
		figure={intersectionQQFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{intersectionQQFig.size} elements | intersection cercle-ellipse (QQ)
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Intersection deux ellipses (QQ)</h2>
	<p class="mb-4 text-muted-foreground">
		Deux ellipses perpendiculaires : x² + 4y² = 4 (bleue, horizontale) et 4x² + y² = 4 (verte,
		verticale). 4 points d'intersection symetriques.
	</p>

	<GeometryCanvas
		figure={intersectionQQEllipsesFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={60}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{intersectionQQEllipsesFig.size} elements | intersection ellipse-ellipse (QQ)
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Intersection droite-fonction (LF)</h2>
	<p class="mb-4 text-muted-foreground">
		Droite coupant une parabole y = x² - 2. Deplacez les points A et B pour modifier la droite. Les
		2 points d'intersection (rouges) suivent en temps reel.
	</p>

	<GeometryCanvas
		figure={intersectionLFFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{intersectionLFFig.size} elements | intersection droite-fonction (LF)
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Intersection fonction-fonction (FF)</h2>
	<p class="mb-4 text-muted-foreground">
		y = sin(x) et y = x/3. Multiples points d'intersection (rouges) detectes par resolution hybride
		(symbolique + numerique).
	</p>

	<GeometryCanvas
		figure={intersectionFFFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{intersectionFFFig.size} elements | intersection fonction-fonction (FF)
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Intersection droite-cubique (LF)</h2>
	<p class="mb-4 text-muted-foreground">
		Droite oblique coupant y = x³ - 3x. Deplacez A et B pour explorer les differentes configurations
		: 1, 2, ou 3 points d'intersection selon la pente de la droite.
	</p>

	<GeometryCanvas
		figure={intersectionLFCubicFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{intersectionLFCubicFig.size} elements | intersection droite-cubique
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Intersection droite-exponentielle (LF)</h2>
	<p class="mb-4 text-muted-foreground">
		Droite coupant y = eˣ. Selon la position de la droite, il peut y avoir 0, 1 (tangente), ou 2
		points d'intersection. Deplacez A et B pour explorer.
	</p>

	<GeometryCanvas
		figure={intersectionLFExpFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{intersectionLFExpFig.size} elements | intersection droite-exponentielle
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Intersection sin(x) et cos(x) (FF)</h2>
	<p class="mb-4 text-muted-foreground">
		y = sin(x) et y = cos(x) se croisent aux points ou tan(x) = 1, soit x = π/4 + kπ. 6 points
		d'intersection detectes dans [-10, 10].
	</p>

	<GeometryCanvas
		figure={intersectionFFTrigFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{intersectionFFTrigFig.size} elements | intersection sin/cos (FF)
	</p>
</div>
