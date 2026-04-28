<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import DslDemo from '../DslDemo.svelte';
	import { Figure } from '$lib/geometry-core/graph/figure';
	import { exact, numeric } from '$lib/geometry-core/types/geo-value';
	import { number } from '$lib/mathAST';
	import { runDsl } from '$lib/geometry-core/dsl';

	function pt(x: number, y: number) {
		return { x: exact(number(x)), y: exact(number(y)) };
	}

	function npt(x: number, y: number) {
		return { x: numeric(x), y: numeric(y) };
	}

	// ==========================================================================
	// Vectors — bound and free (Figure API, kept as-is)
	// ==========================================================================
	const vectorFig = new Figure();

	// Bound vectors (tied to points)
	const vA = vectorFig.createFreePoint(pt(-5, -2), { label: 'A', color: '#1e40af' });
	const vB = vectorFig.createFreePoint(pt(-1, 1), { label: 'B', color: '#1e40af' });
	const vC = vectorFig.createFreePoint(pt(-5, 2), { label: 'C', color: '#1e40af' });
	const vD = vectorFig.createFreePoint(pt(-2, 4), { label: 'D', color: '#1e40af' });

	vectorFig.createVectorByPoints(vA, vB, { label: 'u', color: '#dc2626' });
	vectorFig.createVectorByPoints(vC, vD, { label: 'v', color: '#059669' });

	// Free vectors (by components, draggable as a unit)
	vectorFig.createFreeVector(numeric(3), numeric(0), npt(1, -3), {
		label: 'i',
		color: '#6366f1'
	});
	vectorFig.createFreeVector(numeric(0), numeric(2), npt(1, -3), {
		label: 'j',
		color: '#9333ea'
	});

	// Translation by vector: P' = P + vec(AB)
	const vP = vectorFig.createFreePoint(pt(3, 1), { label: 'P', color: '#ea580c' });
	const vec = vectorFig.createVectorByPoints(vA, vB, {
		color: '#dc2626',
		style: { dash: 'dashed' }
	});
	const elVec = vectorFig.getElementById(vec)!;
	if (elVec.type === 'vectorByPoints') {
		vectorFig.createTranslatedPoint(vP, elVec.startId, elVec.endId, {
			label: "P'",
			color: '#ea580c'
		});
	}

	// ==========================================================================
	// DSL strings for DslDemo sections
	// ==========================================================================
	const vectorDsl = `A = point(-4, -2)
B = point(0, 1)
u = vecteur(A, B, couleur="rouge")
v = vecteur(2, 3, couleur="vert")
P = point(2, -1, couleur="orange")
P2 = translation(P, vecteur=u)
style(P2, couleur="orange")`;

	const vectorOpsDsl = `u = vecteur(3, 1, couleur="rouge")
v = vecteur(1, 3, couleur="bleu")
w = u + v
style(w, couleur="violet")
d = u - v
style(d, couleur="orange")
s = 2 * u
style(s, couleur="cyan")
n = -v
style(n, couleur="gris")`;

	const vectorScalarDsl = `A = point(-3, 0)
B = point(0, 2)
u = vecteur(A, B, couleur="rouge")
n = norme(u)
v = vecteur(1, 0, couleur="bleu")
p = produit_scalaire(u, v)
a = angle_vecteurs(u, v)`;

	// Run scalar DSL separately to display computed values in the description
	const vectorScalarFig = runDsl(vectorScalarDsl);
</script>

<div class="container mx-auto max-w-6xl p-8">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>← Retour aux demos</a
	>

	<h1 class="mt-4 mb-8 text-3xl font-bold">Vecteurs</h1>

	<!-- API-based section: kept with GeometryCanvas -->
	<section class="space-y-3">
		<h2 class="text-xl font-bold">Vecteurs — vecteur()</h2>
		<p class="text-muted-foreground">
			Vecteurs lies (attaches a deux points) et libres (composantes fixes, deplacables en bloc).
			<br />
			<strong>Rouge</strong> : vecteur u = AB |
			<strong>Vert</strong> : vecteur v = CD |
			<strong>Indigo</strong> : vecteur libre i = (3, 0) |
			<strong>Violet</strong> : vecteur libre j = (0, 2) |
			<strong>Orange</strong> : P et sa translation P' par le vecteur AB.
			<br />
			Deplacez A ou B pour voir les vecteurs lies et la translation se mettre a jour.
		</p>

		<GeometryCanvas
			figure={vectorFig}
			center={{ x: 0, y: 0 }}
			pixelsPerUnit={40}
			width={800}
			height={600}
		/>

		<p class="text-sm text-muted-foreground">
			{vectorFig.size} elements | vecteurs lies + libres + translation
		</p>
	</section>

	<hr class="my-8" />

	<!-- DSL section: vecteur(A, B) and translation -->
	<DslDemo
		dsl={vectorDsl}
		title="Vecteurs via DSL"
		description="Vecteurs crees via le DSL : vecteur(A, B) (lie) et vecteur(2, 3) (libre). Translation par vecteur : translation(P, vecteur=u)."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<hr class="my-8" />

	<!-- DSL section: vector operations -->
	<DslDemo
		dsl={vectorOpsDsl}
		title="Operations vectorielles — u + v, 3 * u, -v"
		description="Toutes les operations creent des vecteurs reactifs dans le graphe de dependances. Rouge : u = (3, 1) | Bleu : v = (1, 3) | Violet : w = u + v | Orange : d = u - v | Cyan : s = 2 * u | Gris : n = -v"
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<hr class="my-8" />

	<!-- DSL section: scalar builtins -->
	<DslDemo
		dsl={vectorScalarDsl}
		title="Builtins scalaires — norme(), produit_scalaire(), angle_vecteurs()"
		description="Rouge : u = AB | Bleu : v = (1, 0). norme(u), produit_scalaire(u, v) et angle_vecteurs(u, v) retournent des scalaires reactifs."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<!-- Display computed scalar values below the DSL demo -->
	<p class="mt-2 text-sm text-muted-foreground">
		norme(u) = {vectorScalarFig.symbols.get('n')?.value?.toFixed(2) ?? '?'} | produit_scalaire(u, v)
		= {vectorScalarFig.symbols.get('p')?.value?.toFixed(2) ?? '?'} | angle_vecteurs(u, v) = {vectorScalarFig.symbols
			.get('a')
			?.value?.toFixed(1) ?? '?'}°
	</p>
</div>
