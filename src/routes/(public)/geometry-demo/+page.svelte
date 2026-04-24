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

	// Medians
	const medA = figure.createSegment(a, mBC, { color: '#dc2626' });
	const medB = figure.createSegment(b, mCA, { color: '#dc2626' });
	figure.createSegment(c, mAB, { color: '#dc2626' });

	// --- Intersection of two medians = centroid ---
	figure.createIntersectionLL(medA, medB, { label: 'G', color: '#f59e0b' });

	// --- Droite and demi-droite ---
	figure.createLine(a, b, { color: '#6366f1' });
	figure.createRay(c, mAB, { color: '#6366f1' });

	// --- Circle by point ---
	const o = figure.createFreePoint(pt(-6, 5), { label: 'O', color: '#059669' });
	const edgePt = figure.createFreePoint(pt(-3, 5), { label: 'R', color: '#059669' });
	figure.createCircleByPoint(o, edgePt, { color: '#059669' });

	// --- Central symmetry: A' = symmetric of A through centroid G area ---
	const symCenter = figure.createFreePoint(pt(0, 0), { label: 'S', color: '#9333ea' });
	figure.createReflectedPoint(a, symCenter, { label: "A'", color: '#9333ea' });
	figure.createReflectedPoint(b, symCenter, { label: "B'", color: '#9333ea' });
	figure.createReflectedPoint(c, symCenter, { label: "C'", color: '#9333ea' });

	// --- Angle marks ---
	figure.createAngleMark(b, a, c, { color: '#1e40af' });
	figure.createAngleMark(c, b, a, { color: '#1e40af', arcCount: 2 });
	figure.createAngleMark(a, c, b, { color: '#1e40af', arcCount: 3 });
	// Right angle mark at midpoint M (angle AMC ~ 90° in equilateral triangle median)
	figure.createAngleMark(a, mAB, c, { color: '#dc2626', rightAngle: true });

	// --- Segment marks (equal sides of equilateral triangle) ---
	figure.createSegmentMark(a, b, { color: '#dc2626', markCount: 1 });
	figure.createSegmentMark(b, c, { color: '#dc2626', markCount: 2 });
	figure.createSegmentMark(c, a, { color: '#dc2626', markCount: 3 });

	// --- Measures ---
	figure.createMeasure('distance', [a, b], { color: '#6366f1' });
	figure.createMeasure('angle', [b, a, c], { color: '#1e40af' });
</script>

<div class="p-4">
	<h1 class="mb-4 text-2xl font-bold">Geometry Demo</h1>
	<p class="mb-4 text-muted-foreground">
		Deplacez les points pour explorer la figure. Les elements dependants suivent en temps reel :
		milieux (rouge), centre de gravite G (jaune, intersection des medianes), symetriques A' B' C'
		(violet, par rapport au centre S). Deplacez R pour changer le rayon du cercle, S pour deplacer
		le centre de symetrie.
	</p>

	<GeometryCanvas {figure} center={{ x: 0, y: 0 }} pixelsPerUnit={40} width={800} height={600} />

	<p class="mt-4 text-sm text-muted-foreground">
		{figure.size} elements | geometry-core demo
	</p>
</div>
