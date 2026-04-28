<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	const courbeDsl = `d1 = courbe("y = 2*x + 1", couleur="bleu")
d2 = courbe("x - 2*y + 4 = 0", couleur="rouge")
d3 = courbe("y = -2", couleur="vert")
d4 = courbe("x = 3", couleur="violet")
d5 = courbe("3*x + y - 6", couleur="orange")
d6 = courbe("y = -x", couleur="cyan")`;

	const functionDsl = `f1 = courbe("y = x^2", couleur="bleu")
f2 = courbe("y = sin(x)", couleur="rouge")
f3 = courbe("y = 1/x", couleur="vert")
f4 = courbe("y = sqrt(x)", couleur="violet")
f5 = courbe("y = exp(-x^2)", couleur="orange")`;

	const tangentDsl = `f = courbe("y = x^2", couleur="bleu")
P = point_sur(f, 1.5, couleur="rouge")
t = tangente(f, P, couleur="rouge")
t2 = tangente(f, -1, couleur="vert", trait="tirets")`;

	const analysisDsl = `f = courbe("y = x^3 - 3*x", couleur="bleu")
Z = zeros(f, couleur="rouge")
E = extrema(f, couleur="vert")
I = inflections(f, couleur="violet")`;

	const conicDsl = `c1 = courbe("x^2 + y^2 - 9 = 0", couleur="bleu")
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
Z5 = zeros(c5, couleur="orange")`;

	const implicitDsl = `c1 = courbe("x^3 + y^3 - 3*x*y = 0", couleur="bleu")
c2 = courbe("x^4 + y^4 - 1 = 0", couleur="rouge")
c3 = courbe("sin(x) + cos(y) - 1 = 0", couleur="vert")
c4 = courbe("x^2*y - y^3 - x^2 + y = 0", couleur="violet")`;
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>← Retour aux demos</a
	>

	<h1 class="mt-4 mb-8 text-2xl font-bold">Courbes — geometry-core</h1>

	<hr class="my-8" />

	<DslDemo
		dsl={courbeDsl}
		title="Droites par equation — courbe()"
		description="Droites creees via le builtin courbe() du DSL."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={functionDsl}
		title="Courbes y=f(x) — courbe()"
		description="Courbes avec echantillonnage adaptatif et lissage Catmull-Rom."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={tangentDsl}
		title="Tangentes — tangente() + point_sur()"
		description="Deplacez le point P sur la courbe pour voir la tangente suivre."
		center={{ x: 0, y: 2 }}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={analysisDsl}
		title="Analyse — zeros(), extrema(), inflections()"
		description="Courbe y = x^3 - 3x avec points critiques automatiques."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={conicDsl}
		title="Coniques — courbe() quadratique"
		description="Courbes implicites de degre 2, classifiees et tracees parametriquement."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={implicitDsl}
		title="Courbes implicites generales — courbe() marching squares"
		description="Courbes implicites F(x,y) = 0 de degre > 2 ou transcendantes (grille 200x200)."
		width={700}
		height={500}
	/>
</div>
