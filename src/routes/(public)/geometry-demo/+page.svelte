<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { Figure } from '$lib/geometry-core/graph/figure';
	import { exact } from '$lib/geometry-core/types/geo-value';
	import { number, sqrt } from '$lib/mathAST';

	function pt(x: number, y: number) {
		return { x: exact(number(x)), y: exact(number(y)) };
	}

	const figure = new Figure();

	// --- Triangle with midpoints and medians ---
	const a = figure.createFreePoint(pt(-4, -3), { label: 'A', color: '#1e40af' });
	const b = figure.createFreePoint(pt(4, -3), { label: 'B', color: '#1e40af' });
	const c = figure.createFreePoint(
		{ x: exact(number(0)), y: exact(sqrt(number(48))) },
		{ label: 'C', color: '#1e40af' }
	);

	figure.createSegment(a, b, { color: '#1e40af' });
	figure.createSegment(b, c, { color: '#1e40af' });
	figure.createSegment(c, a, { color: '#1e40af' });

	const mAB = figure.createMidpoint(a, b, { label: 'M', color: '#dc2626' });
	const mBC = figure.createMidpoint(b, c, { label: 'N', color: '#dc2626' });
	const mCA = figure.createMidpoint(c, a, { label: 'P', color: '#dc2626' });

	figure.createSegment(a, mBC, { color: '#dc2626' });
	figure.createSegment(b, mCA, { color: '#dc2626' });
	figure.createSegment(c, mAB, { color: '#dc2626' });

	// --- Droite passant par A et B (etendue aux bords du viewport) ---
	figure.createLine(a, b, { color: '#6366f1' });

	// --- Demi-droite de C vers M (milieu AB) ---
	figure.createRay(c, mAB, { color: '#6366f1' });

	// --- Cercle par point : centre O, passe par un point draggable ---
	const o = figure.createFreePoint(pt(0, 1), { label: 'O', color: '#059669' });
	const edgePt = figure.createFreePoint(pt(5, 1), { label: 'R', color: '#059669' });
	figure.createCircleByPoint(o, edgePt, { color: '#059669' });
</script>

<div class="p-4">
	<h1 class="mb-4 text-2xl font-bold">Geometry Demo</h1>
	<p class="mb-4 text-muted-foreground">
		Deplacez les points bleus (A, B, C) pour explorer le triangle. Les milieux (rouges) et medianes
		suivent automatiquement. La droite violette (AB) et la demi-droite (C vers M) s'etendent.
		Deplacez R (vert) pour changer le rayon du cercle.
	</p>

	<GeometryCanvas
		{figure}
		viewport={{ xMin: -10, xMax: 10, yMin: -8, yMax: 10 }}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{figure.size} elements | geometry-core demo
	</p>
</div>
