<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { Figure } from '$lib/geometry-core/graph/figure';
	import { exact } from '$lib/geometry-core/types/geo-value';
	import { number, numericNode, sqrt } from '$lib/mathAST';

	function pt(x: number, y: number) {
		return { x: exact(numericNode(x)), y: exact(numericNode(y)) };
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
	figure.createAngle(b, a, c, { color: '#1e40af' });
	figure.createAngle(c, b, a, { color: '#1e40af', marque: 'arcs2' });
	figure.createAngle(a, c, b, { color: '#1e40af', marque: 'arcs3' });
	// Right angle mark at midpoint M (angle AMC ~ 90° in equilateral triangle median)
	figure.createAngle(a, mAB, c, { color: '#dc2626', marque: 'carre' });

	// --- Segment marks (equal sides of equilateral triangle) ---
	figure.createSegmentMark(a, b, { color: '#dc2626', markCount: 1 });
	figure.createSegmentMark(b, c, { color: '#dc2626', markCount: 2 });
	figure.createSegmentMark(c, a, { color: '#dc2626', markCount: 3 });

	// --- Arcs ---
	// Arc by angles (compass-style)
	const arcCenter = figure.createFreePoint(pt(6, 4), { label: 'K', color: '#0891b2' });
	figure.createArcByAngles(
		arcCenter,
		exact(number(2)),
		exact(number(Math.PI / 6)),
		exact(number((5 * Math.PI) / 6)),
		{ color: '#0891b2' }
	);

	// Arc by 3 points (angle trace)
	const arcP = figure.createFreePoint(pt(6, -2), { label: 'P', color: '#ea580c' });
	const arcQ = figure.createFreePoint(pt(3, -4), { label: 'Q', color: '#ea580c' });
	const arcR = figure.createFreePoint(pt(6, -5), { label: 'R2', color: '#ea580c' });
	figure.createSegment(arcQ, arcP, { color: '#ea580c' });
	figure.createSegment(arcQ, arcR, { color: '#ea580c' });
	figure.createArcByPoints(arcP, arcQ, arcR, { color: '#ea580c' });

	// --- Measures (createMeasure supprimé en faveur de createScalar* + createText) ---
	const distAB = figure.createScalarDistance(a, b);
	figure.createText(
		`{${distAB}:.2f}`,
		[distAB],
		{ autoPosition: 'midpoint', autoTargetIds: [a, b] },
		{ color: '#6366f1' }
	);
	const angBAC = figure.createScalarAngleMeasure(b, a, c, { unite: 'deg' });
	figure.createText(
		`{${angBAC}:.0f}°`,
		[angBAC],
		{ autoPosition: 'bisector', autoTargetIds: [b, a, c] },
		{ color: '#1e40af' }
	);

	// ==========================================================================
	// Rough mode demo — same geometric constructions, hand-drawn style
	// ==========================================================================
	const roughFig = new Figure({ defaultRoughness: 1.2 });

	const rA = roughFig.createFreePoint(pt(-3, -2), { label: 'A', color: '#1e40af' });
	const rB = roughFig.createFreePoint(pt(3, -2), { label: 'B', color: '#1e40af' });
	const rC = roughFig.createFreePoint(pt(0, 4), { label: 'C', color: '#1e40af' });

	roughFig.createSegment(rA, rB, { color: '#1e40af' });
	roughFig.createSegment(rB, rC, { color: '#1e40af' });
	roughFig.createSegment(rC, rA, { color: '#1e40af' });

	const rMab = roughFig.createMidpoint(rA, rB, { label: 'M', color: '#dc2626' });
	const rMbc = roughFig.createMidpoint(rB, rC, { label: 'N', color: '#dc2626' });
	const rMca = roughFig.createMidpoint(rC, rA, { label: 'P', color: '#dc2626' });

	roughFig.createSegment(rA, rMbc, { color: '#dc2626', style: { dash: 'dashed' } });
	roughFig.createSegment(rB, rMca, { color: '#dc2626', style: { dash: 'dashed' } });
	roughFig.createSegment(rC, rMab, { color: '#dc2626', style: { dash: 'dashed' } });

	const rO = roughFig.createFreePoint(pt(0, 0), { label: 'O', color: '#059669' });
	const rEdge = roughFig.createFreePoint(pt(2, 0), { label: 'R', color: '#059669' });
	roughFig.createCircleByPoint(rO, rEdge, { color: '#059669' });

	roughFig.createAngle(rB, rA, rC, { color: '#1e40af' });
	roughFig.createAngle(rC, rB, rA, { color: '#1e40af', marque: 'arcs2' });
	roughFig.createSegmentMark(rA, rB, { color: '#dc2626', markCount: 1 });
	roughFig.createSegmentMark(rB, rC, { color: '#dc2626', markCount: 1 });
	roughFig.createSegmentMark(rC, rA, { color: '#dc2626', markCount: 1 });

	const rK = roughFig.createFreePoint(pt(-4, 3), { label: 'K', color: '#0891b2' });
	roughFig.createArcByAngles(
		rK,
		exact(number('2')),
		exact(number('0')),
		exact(numericNode(Math.PI * 0.8)),
		{
			color: '#0891b2'
		}
	);

	// ==========================================================================
	// Mixed mode demo — some elements rough, some normal
	// ==========================================================================
	const mixedFig = new Figure();

	const mA = mixedFig.createFreePoint(pt(-3, -2), { label: 'A', color: '#1e40af' });
	const mB = mixedFig.createFreePoint(pt(4, -1), { label: 'B', color: '#1e40af' });
	const mC = mixedFig.createFreePoint(pt(1, 4), { label: 'C', color: '#1e40af' });
	const mD = mixedFig.createFreePoint(pt(-2, 3), { label: 'D', color: '#9333ea' });

	// Normal segments (clean)
	mixedFig.createSegment(mA, mB, { color: '#1e40af' });
	mixedFig.createSegment(mB, mC, { color: '#1e40af' });

	// Rough segments (hand-drawn)
	mixedFig.createSegment(mC, mD, { color: '#dc2626', style: { render: 'rough', roughness: 1.5 } });
	mixedFig.createSegment(mD, mA, { color: '#dc2626', style: { render: 'rough', roughness: 1.5 } });

	// Normal circle
	const mO1 = mixedFig.createFreePoint(pt(-4, 0), { label: 'O1', color: '#059669' });
	const mE1 = mixedFig.createFreePoint(pt(-2.5, 0), { label: 'E1', color: '#059669' });
	mixedFig.createCircleByPoint(mO1, mE1, { color: '#059669' });

	// Rough circle
	const mO2 = mixedFig.createFreePoint(pt(5, 2), { label: 'O2', color: '#ea580c' });
	const mE2 = mixedFig.createFreePoint(pt(7, 2), { label: 'E2', color: '#ea580c' });
	mixedFig.createCircleByPoint(mO2, mE2, {
		color: '#ea580c',
		style: { render: 'rough', roughness: 2 }
	});

	// Rough arc
	const mArcK = mixedFig.createFreePoint(pt(5, -3), { label: 'K', color: '#0891b2' });
	mixedFig.createArcByAngles(
		mArcK,
		exact(number('2')),
		exact(numericNode(Math.PI / 4)),
		exact(numericNode(Math.PI)),
		{
			color: '#0891b2',
			style: { render: 'rough' }
		}
	);

	// ==========================================================================
	// Parameters showcase — bowing, fillStyle, preserveVertices
	// ==========================================================================
	const paramsFig = new Figure();

	// Row 1: bowing comparison (left=0, middle=1, right=5)
	const bA1 = paramsFig.createFreePoint(pt(-7, 3), { label: 'bowing=0', color: '#6366f1' });
	const bB1 = paramsFig.createFreePoint(pt(-4, 3), { color: '#6366f1' });
	paramsFig.createSegment(bA1, bB1, {
		color: '#6366f1',
		style: { render: 'rough', roughBowing: 0 }
	});

	const bA2 = paramsFig.createFreePoint(pt(-2, 3), { label: 'bowing=1', color: '#6366f1' });
	const bB2 = paramsFig.createFreePoint(pt(1, 3), { color: '#6366f1' });
	paramsFig.createSegment(bA2, bB2, {
		color: '#6366f1',
		style: { render: 'rough', roughBowing: 1 }
	});

	const bA3 = paramsFig.createFreePoint(pt(3, 3), { label: 'bowing=8', color: '#6366f1' });
	const bB3 = paramsFig.createFreePoint(pt(6, 3), { color: '#6366f1' });
	paramsFig.createSegment(bA3, bB3, {
		color: '#6366f1',
		style: { render: 'rough', roughBowing: 8 }
	});

	// Row 2: fillStyle variants (polygons with fill)
	// Hachure
	const fA1 = paramsFig.createFreePoint(pt(-7, -1), { color: '#059669' });
	const fB1 = paramsFig.createFreePoint(pt(-5, -1), { color: '#059669' });
	const fC1 = paramsFig.createFreePoint(pt(-6, 1), { color: '#059669' });
	paramsFig.createPolygon([fA1, fB1, fC1], {
		color: '#059669',
		style: { render: 'rough', fillColor: '#bbf7d0', roughFillStyle: 'hachure' }
	});

	// Cross-hatch
	const fA2 = paramsFig.createFreePoint(pt(-3.5, -1), { color: '#dc2626' });
	const fB2 = paramsFig.createFreePoint(pt(-1.5, -1), { color: '#dc2626' });
	const fC2 = paramsFig.createFreePoint(pt(-2.5, 1), { color: '#dc2626' });
	paramsFig.createPolygon([fA2, fB2, fC2], {
		color: '#dc2626',
		style: { render: 'rough', fillColor: '#fecaca', roughFillStyle: 'cross-hatch' }
	});

	// Zigzag
	const fA3 = paramsFig.createFreePoint(pt(0, -1), { color: '#ea580c' });
	const fB3 = paramsFig.createFreePoint(pt(2, -1), { color: '#ea580c' });
	const fC3 = paramsFig.createFreePoint(pt(1, 1), { color: '#ea580c' });
	paramsFig.createPolygon([fA3, fB3, fC3], {
		color: '#ea580c',
		style: { render: 'rough', fillColor: '#fed7aa', roughFillStyle: 'zigzag' }
	});

	// Dots
	const fA4 = paramsFig.createFreePoint(pt(3.5, -1), { color: '#9333ea' });
	const fB4 = paramsFig.createFreePoint(pt(5.5, -1), { color: '#9333ea' });
	const fC4 = paramsFig.createFreePoint(pt(4.5, 1), { color: '#9333ea' });
	paramsFig.createPolygon([fA4, fB4, fC4], {
		color: '#9333ea',
		style: { render: 'rough', fillColor: '#e9d5ff', roughFillStyle: 'dots' }
	});

	// Row 3: dash styles in rough mode (solid / dashed / dotted)
	const dA1 = paramsFig.createFreePoint(pt(-7, -3), { label: 'solid', color: '#dc2626' });
	const dB1 = paramsFig.createFreePoint(pt(-4, -3), { color: '#dc2626' });
	paramsFig.createSegment(dA1, dB1, {
		color: '#dc2626',
		style: { render: 'rough' }
	});

	const dA2 = paramsFig.createFreePoint(pt(-2, -3), { label: 'tirets', color: '#dc2626' });
	const dB2 = paramsFig.createFreePoint(pt(1, -3), { color: '#dc2626' });
	paramsFig.createSegment(dA2, dB2, {
		color: '#dc2626',
		style: { render: 'rough', dash: 'dashed' }
	});

	const dA3 = paramsFig.createFreePoint(pt(3, -3), { label: 'pointilles', color: '#dc2626' });
	const dB3 = paramsFig.createFreePoint(pt(6, -3), { color: '#dc2626' });
	paramsFig.createSegment(dA3, dB3, {
		color: '#dc2626',
		style: { render: 'rough', dash: 'dotted' }
	});

	// Row 4: strokeWidth comparison (1, 3, 6)
	const sA1 = paramsFig.createFreePoint(pt(-7, -5), { label: 'epaisseur=1', color: '#f59e0b' });
	const sB1 = paramsFig.createFreePoint(pt(-4, -5), { color: '#f59e0b' });
	paramsFig.createSegment(sA1, sB1, {
		color: '#f59e0b',
		style: { render: 'rough', strokeWidth: 1 }
	});

	const sA2 = paramsFig.createFreePoint(pt(-2, -5), { label: 'epaisseur=3', color: '#f59e0b' });
	const sB2 = paramsFig.createFreePoint(pt(1, -5), { color: '#f59e0b' });
	paramsFig.createSegment(sA2, sB2, {
		color: '#f59e0b',
		style: { render: 'rough', strokeWidth: 3 }
	});

	const sA3 = paramsFig.createFreePoint(pt(3, -5), { label: 'epaisseur=6', color: '#f59e0b' });
	const sB3 = paramsFig.createFreePoint(pt(6, -5), { color: '#f59e0b' });
	paramsFig.createSegment(sA3, sB3, {
		color: '#f59e0b',
		style: { render: 'rough', strokeWidth: 6 }
	});

	// Row 5: dashed + thick strokeWidth (3, 5)
	const tA1 = paramsFig.createFreePoint(pt(-7, -7), { label: 'tirets ep=3', color: '#16a34a' });
	const tB1 = paramsFig.createFreePoint(pt(-4, -7), { color: '#16a34a' });
	paramsFig.createSegment(tA1, tB1, {
		color: '#16a34a',
		style: { render: 'rough', dash: 'dashed', strokeWidth: 3 }
	});

	const tA2 = paramsFig.createFreePoint(pt(-2, -7), { label: 'tirets ep=5', color: '#16a34a' });
	const tB2 = paramsFig.createFreePoint(pt(1, -7), { color: '#16a34a' });
	paramsFig.createSegment(tA2, tB2, {
		color: '#16a34a',
		style: { render: 'rough', dash: 'dashed', strokeWidth: 5 }
	});

	const tA3 = paramsFig.createFreePoint(pt(3, -7), { label: 'pointilles ep=5', color: '#16a34a' });
	const tB3 = paramsFig.createFreePoint(pt(6, -7), { color: '#16a34a' });
	paramsFig.createSegment(tA3, tB3, {
		color: '#16a34a',
		style: { render: 'rough', dash: 'dotted', strokeWidth: 5 }
	});

	// Row 6: preserveVertices comparison
	const pA1 = paramsFig.createFreePoint(pt(-7, -10), {
		label: 'preserveVertices=false',
		color: '#0891b2'
	});
	const pB1 = paramsFig.createFreePoint(pt(-4, -10), { color: '#0891b2' });
	const pC1 = paramsFig.createFreePoint(pt(-5.5, -8.5), { color: '#0891b2' });
	paramsFig.createPolygon([pA1, pB1, pC1], {
		color: '#0891b2',
		style: { render: 'rough', roughPreserveVertices: false, roughness: 2 }
	});

	const pA2 = paramsFig.createFreePoint(pt(1, -10), {
		label: 'preserveVertices=true',
		color: '#0891b2'
	});
	const pB2 = paramsFig.createFreePoint(pt(4, -10), { color: '#0891b2' });
	const pC2 = paramsFig.createFreePoint(pt(2.5, -8.5), { color: '#0891b2' });
	paramsFig.createPolygon([pA2, pB2, pC2], {
		color: '#0891b2',
		style: { render: 'rough', roughPreserveVertices: true, roughness: 2 }
	});

	// Filled circle with solid fill
	const pO = paramsFig.createFreePoint(pt(7, 0), { label: 'solid fill', color: '#1e40af' });
	const pE = paramsFig.createFreePoint(pt(8.5, 0), { color: '#1e40af' });
	paramsFig.createCircleByPoint(pO, pE, {
		color: '#1e40af',
		style: { render: 'rough', fillColor: '#bfdbfe', roughFillStyle: 'solid' }
	});
</script>

<div class="p-4">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>← Retour aux demos</a
	>

	<h1 class="mt-4 mb-4 text-2xl font-bold">Geometry Demo</h1>
	<p class="mb-4 text-muted-foreground">
		Deplacez les points pour explorer la figure. Les elements dependants suivent en temps reel :
		milieux (rouge), centre de gravite G (jaune, intersection des medianes), symetriques A' B' C'
		(violet, par rapport au centre S). Deplacez R pour changer le rayon du cercle, S pour deplacer
		le centre de symetrie. Arcs : K (cyan, arc par angles), P/Q/R2 (orange, arc par 3 points —
		deplacez P ou R2 pour changer l'angle).
	</p>

	<GeometryCanvas {figure} center={{ x: 0, y: 0 }} pixelsPerUnit={40} width={800} height={600} />

	<p class="mt-4 text-sm text-muted-foreground">
		{figure.size} elements | geometry-core demo | renderMode="normal"
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Rough mode (renderMode="rough")</h2>
	<p class="mb-4 text-muted-foreground">
		Toute la figure est rendue en style "fait main" via rough.js. Les points et labels restent nets.
		Deplacez les points — le rendu reste stable grace aux seeds deterministes.
	</p>

	<GeometryCanvas
		figure={roughFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
		renderMode="rough"
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{roughFig.size} elements | rough mode | defaultRoughness=1.2
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Mixed mode (renderMode="mixed")</h2>
	<p class="mb-4 text-muted-foreground">
		Segments bleus = normaux, segments/cercle/arc rouges et orange = rough (style: render="rough").
		Chaque element choisit individuellement son style de rendu.
	</p>

	<GeometryCanvas
		figure={mixedFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
		renderMode="mixed"
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{mixedFig.size} elements | mixed mode
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Parametres rough.js</h2>
	<p class="mb-4 text-muted-foreground">
		<strong>Ligne 1</strong> : bowing (courbure des traits) — 0 = droit, 1 = defaut, 8 = tres
		courbe.
		<br />
		<strong>Ligne 2</strong> : fillStyle (motif de remplissage) — hachure, cross-hatch, zigzag,
		dots. Cercle bleu : solid fill.
		<br />
		<strong>Ligne 3</strong> : styles de trait — solid, tirets (dashed), pointilles (dotted) en mode
		rough.
		<br />
		<strong>Ligne 4</strong> : epaisseur de trait — 1, 3, 6 en mode rough.
		<br />
		<strong>Ligne 5</strong> : tirets/pointilles epais — dashed ep=3, dashed ep=5, dotted ep=5.
		<br />
		<strong>Ligne 6</strong> : preserveVertices — false (sommets decales aleatoirement) vs true (sommets
		precis).
	</p>

	<GeometryCanvas
		figure={paramsFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
		renderMode="rough"
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{paramsFig.size} elements | parametres rough
	</p>
</div>
