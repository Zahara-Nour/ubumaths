<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { runDsl } from '$lib/geometry-core/dsl';

	// ==========================================================================
	// courbe() — lines from equations
	// ==========================================================================
	const courbeFig = runDsl(
		`d1 = courbe("y = 2*x + 1", couleur="bleu")
d2 = courbe("x - 2*y + 4 = 0", couleur="rouge")
d3 = courbe("y = -2", couleur="vert")
d4 = courbe("x = 3", couleur="violet")
d5 = courbe("3*x + y - 6", couleur="orange")
d6 = courbe("y = -x", couleur="cyan")`
	).figure;

	// ==========================================================================
	// courbe() — function curves y=f(x)
	// ==========================================================================
	const functionFig = runDsl(
		`f1 = courbe("y = x^2", couleur="bleu")
f2 = courbe("y = sin(x)", couleur="rouge")
f3 = courbe("y = 1/x", couleur="vert")
f4 = courbe("y = sqrt(x)", couleur="violet")
f5 = courbe("y = exp(-x^2)", couleur="orange")`
	).figure;

	// ==========================================================================
	// tangente() — tangent lines + draggable points on curves
	// ==========================================================================
	const tangentFig = runDsl(
		`f = courbe("y = x^2", couleur="bleu")
P = point_sur(f, 1.5, couleur="rouge")
t = tangente(f, P, couleur="rouge")
t2 = tangente(f, -1, couleur="vert", trait="tirets")`
	).figure;

	// ==========================================================================
	// zeros / extrema / inflections
	// ==========================================================================
	const analysisFig = runDsl(
		`f = courbe("y = x^3 - 3*x", couleur="bleu")
Z = zeros(f, couleur="rouge")
E = extrema(f, couleur="vert")
I = inflections(f, couleur="violet")`
	).figure;

	// ==========================================================================
	// courbe() — quadratic curves (conics)
	// ==========================================================================
	const conicFig = runDsl(
		`c1 = courbe("x^2 + y^2 - 9 = 0", couleur="bleu")
c2 = courbe("{x^2}/4 + {y^2}/9 - 1 = 0", couleur="rouge")
c3 = courbe("x^2 - y^2 - 1 = 0", couleur="vert")
c4 = courbe("x^2 + x*y + y^2 - 1 = 0", couleur="violet")
c5 = courbe("y^2 - 4*x = 0", couleur="orange")
P1 = point_sur(c1, 45, couleur="bleu")
t1 = tangente(c1, P1, couleur="bleu", trait="tirets")
P2 = point_sur(c2, 60, couleur="rouge")
t2 = tangente(c2, P2, couleur="rouge", trait="tirets")
P3 = point_sur(c3, 0.5, couleur="vert")
t3 = tangente(c3, P3, couleur="vert", trait="tirets")
P4 = point_sur(c4, 30, couleur="violet")
t4 = tangente(c4, P4, couleur="violet", trait="tirets")
P5 = point_sur(c5, 3, couleur="orange")
t5 = tangente(c5, P5, couleur="orange", trait="tirets")
Z1 = zeros(c1, couleur="bleu")
Z2 = zeros(c2, couleur="rouge")
Z3 = zeros(c3, couleur="vert")
Z4 = zeros(c4, couleur="violet")
Z5 = zeros(c5, couleur="orange")`
	).figure;

	// ==========================================================================
	// courbe() — implicit curves F(x,y) = 0 (marching squares)
	// ==========================================================================
	const implicitFig = runDsl(
		`c1 = courbe("x^3 + y^3 - 3*x*y = 0", couleur="bleu")
c2 = courbe("x^4 + y^4 - 1 = 0", couleur="rouge")
c3 = courbe("sin(x) + cos(y) - 1 = 0", couleur="vert")
c4 = courbe("x^2*y - y^3 - x^2 + y = 0", couleur="violet")`
	).figure;
</script>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>← Retour aux demos</a
	>

	<h1 class="mt-4 mb-8 text-2xl font-bold">Courbes — geometry-core</h1>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Droites par equation — courbe()</h2>
	<p class="mb-4 text-muted-foreground">
		Droites creees via le builtin <code>courbe("equation")</code> du DSL. Les points de support sont
		caches — seules les droites sont visibles.
		<br />
		<strong>Bleu</strong> : y = 2x + 1 |
		<strong>Rouge</strong> : x - 2y + 4 = 0 |
		<strong>Vert</strong> : y = -2 (horizontale) |
		<strong>Violet</strong> : x = 3 (verticale) |
		<strong>Orange</strong> : 3x + y - 6 (implicite) |
		<strong>Cyan</strong> : y = -x (par l'origine)
	</p>

	<GeometryCanvas
		figure={courbeFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{courbeFig.size} elements | courbe() — droites par equation
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Courbes y=f(x) — courbe()</h2>
	<p class="mb-4 text-muted-foreground">
		Courbes tracees via <code>courbe("equation")</code> avec echantillonnage adaptatif base sur la
		derivee et lissage Catmull-Rom.
		<br />
		<strong>Bleu</strong> : y = x^2 |
		<strong>Rouge</strong> : y = sin(x) |
		<strong>Vert</strong> : y = 1/x (asymptote) |
		<strong>Violet</strong> : y = sqrt(x) (domaine restreint) |
		<strong>Orange</strong> : y = exp(-x^2) (gaussienne)
	</p>

	<GeometryCanvas
		figure={functionFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{functionFig.size} elements | courbe() — fonctions y=f(x)
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Tangentes — tangente() + point_sur()</h2>
	<p class="mb-4 text-muted-foreground">
		Courbe y = x^2 avec deux tangentes.
		<strong>Rouge</strong> : tangente dynamique — deplacez le point P sur la courbe pour voir la
		tangente suivre.
		<strong>Vert tirets</strong> : tangente fixe a x = -1.
	</p>

	<GeometryCanvas
		figure={tangentFig}
		center={{ x: 0, y: 2 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{tangentFig.size} elements | tangente() + point_sur()
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Analyse — zeros(), extrema(), inflections()</h2>
	<p class="mb-4 text-muted-foreground">
		Courbe y = x^3 - 3x avec points critiques automatiques.
		<strong>Rouge</strong> : zeros (x = -sqrt(3), 0, sqrt(3)).
		<strong>Vert</strong> : extrema (max a x=-1, min a x=1).
		<strong>Violet</strong> : inflexion a x=0.
	</p>

	<GeometryCanvas
		figure={analysisFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{analysisFig.size} elements | zeros + extrema + inflections
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Coniques — courbe() quadratique</h2>
	<p class="mb-4 text-muted-foreground">
		Courbes implicites de degre 2 : Ax² + Bxy + Cy² + Dx + Ey + F = 0, classifiees et tracees
		parametriquement.
		<br />
		<strong>Bleu</strong> : cercle x²+y²=9 |
		<strong>Rouge</strong> : ellipse x²/4+y²/9=1 |
		<strong>Vert</strong> : hyperbole x²-y²=1 |
		<strong>Violet</strong> : conique generale x²+xy+y²=1 |
		<strong>Orange</strong> : parabole y²=4x
	</p>

	<GeometryCanvas
		figure={conicFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{conicFig.size} elements | courbe() — coniques
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Courbes implicites generales — courbe() marching squares</h2>
	<p class="mb-4 text-muted-foreground">
		Courbes implicites F(x,y) = 0 de degre &gt; 2 ou transcendantes, tracees par l'algorithme
		marching squares (grille 200x200).
		<br />
		<strong>Bleu</strong> : folium de Descartes x³+y³-3xy=0 |
		<strong>Rouge</strong> : x⁴+y⁴-1=0 |
		<strong>Vert</strong> : sin(x)+cos(y)=1 |
		<strong>Violet</strong> : x²y-y³-x²+y=0
	</p>

	<GeometryCanvas
		figure={implicitFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{implicitFig.size} elements | courbe() — courbes implicites generales
	</p>
</div>
