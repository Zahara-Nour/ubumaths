<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { Construction } from '$lib/geometry-core/graph/construction';
	import { exact } from '$lib/geometry-core/types/geo-value';
	import { geoFromNumber } from '$lib/geometry-core/compute/geo-arithmetic';
	import { number, sqrt } from '$lib/mathAST';

	function pt(x: number, y: number) {
		return { x: exact(number(x)), y: exact(number(y)) };
	}

	// Build a demo construction
	const construction = new Construction();

	// Triangle equilateral
	const a = construction.createFreePoint(pt(-4, -3), { label: 'A', color: '#1e40af' });
	const b = construction.createFreePoint(pt(4, -3), { label: 'B', color: '#1e40af' });
	const c = construction.createFreePoint(
		{ x: exact(number(0)), y: exact(sqrt(number(48))) }, // ~6.93, adjust for equilateral look
		{ label: 'C', color: '#1e40af' }
	);

	construction.createSegment(a, b, { color: '#1e40af' });
	construction.createSegment(b, c, { color: '#1e40af' });
	construction.createSegment(c, a, { color: '#1e40af' });

	// Midpoints
	const mAB = construction.createMidpoint(a, b, { label: 'M', color: '#dc2626' });
	const mBC = construction.createMidpoint(b, c, { label: 'N', color: '#dc2626' });
	const mCA = construction.createMidpoint(c, a, { label: 'P', color: '#dc2626' });

	// Medians
	construction.createSegment(a, mBC, { color: '#dc2626' });
	construction.createSegment(b, mCA, { color: '#dc2626' });
	construction.createSegment(c, mAB, { color: '#dc2626' });

	// Circumscribed circle
	construction.createCircleByRadius(
		construction.createFreePoint(pt(0, 0.9), { label: 'O', color: '#059669' }),
		geoFromNumber(5.5),
		{ color: '#059669' }
	);
</script>

<div class="p-4">
	<h1 class="mb-4 text-2xl font-bold">Geometry Demo</h1>
	<p class="mb-4 text-muted-foreground">
		Deplacez les points bleus (A, B, C) pour explorer le triangle. Les milieux (rouges) et medianes
		suivent automatiquement. Au relachement, les points s'accrochent a la grille.
	</p>

	<GeometryCanvas
		{construction}
		viewport={{ xMin: -10, xMax: 10, yMin: -8, yMax: 10 }}
		width={800}
		height={600}
		interactive={true}
		showGrid={true}
		gridStep={1}
		snapOnRelease={false}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{construction.size} elements | Phase 2 geometry-core demo
	</p>
</div>
