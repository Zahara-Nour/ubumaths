<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { Figure } from '$lib/geometry-core/graph/figure';
	import { exact, numeric } from '$lib/geometry-core/types/geo-value';
	import { number, sqrt } from '$lib/mathAST';
	import { runDsl } from '$lib/geometry-core/dsl';

	function pt(x: number, y: number) {
		return { x: exact(number(x)), y: exact(number(y)) };
	}

	function npt(x: number, y: number) {
		return { x: numeric(x), y: numeric(y) };
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

	// --- Measures ---
	figure.createMeasure('distance', [a, b], { color: '#6366f1' });
	figure.createMeasure('angle', [b, a, c], { color: '#1e40af' });

	// ==========================================================================
	// Rough mode demo — same geometric constructions, hand-drawn style
	// ==========================================================================
	const roughFig = new Figure({ defaultRoughness: 1.2 });

	const rA = roughFig.createFreePoint(npt(-3, -2), { label: 'A', color: '#1e40af' });
	const rB = roughFig.createFreePoint(npt(3, -2), { label: 'B', color: '#1e40af' });
	const rC = roughFig.createFreePoint(npt(0, 4), { label: 'C', color: '#1e40af' });

	roughFig.createSegment(rA, rB, { color: '#1e40af' });
	roughFig.createSegment(rB, rC, { color: '#1e40af' });
	roughFig.createSegment(rC, rA, { color: '#1e40af' });

	const rMab = roughFig.createMidpoint(rA, rB, { label: 'M', color: '#dc2626' });
	const rMbc = roughFig.createMidpoint(rB, rC, { label: 'N', color: '#dc2626' });
	const rMca = roughFig.createMidpoint(rC, rA, { label: 'P', color: '#dc2626' });

	roughFig.createSegment(rA, rMbc, { color: '#dc2626', style: { dash: 'dashed' } });
	roughFig.createSegment(rB, rMca, { color: '#dc2626', style: { dash: 'dashed' } });
	roughFig.createSegment(rC, rMab, { color: '#dc2626', style: { dash: 'dashed' } });

	const rO = roughFig.createFreePoint(npt(0, 0), { label: 'O', color: '#059669' });
	const rEdge = roughFig.createFreePoint(npt(2, 0), { label: 'R', color: '#059669' });
	roughFig.createCircleByPoint(rO, rEdge, { color: '#059669' });

	roughFig.createAngleMark(rB, rA, rC, { color: '#1e40af' });
	roughFig.createAngleMark(rC, rB, rA, { color: '#1e40af', arcCount: 2 });
	roughFig.createSegmentMark(rA, rB, { color: '#dc2626', markCount: 1 });
	roughFig.createSegmentMark(rB, rC, { color: '#dc2626', markCount: 1 });
	roughFig.createSegmentMark(rC, rA, { color: '#dc2626', markCount: 1 });

	const rK = roughFig.createFreePoint(npt(-4, 3), { label: 'K', color: '#0891b2' });
	roughFig.createArcByAngles(rK, numeric(2), numeric(0), numeric(Math.PI * 0.8), {
		color: '#0891b2'
	});

	// ==========================================================================
	// Mixed mode demo — some elements rough, some normal
	// ==========================================================================
	const mixedFig = new Figure();

	const mA = mixedFig.createFreePoint(npt(-3, -2), { label: 'A', color: '#1e40af' });
	const mB = mixedFig.createFreePoint(npt(4, -1), { label: 'B', color: '#1e40af' });
	const mC = mixedFig.createFreePoint(npt(1, 4), { label: 'C', color: '#1e40af' });
	const mD = mixedFig.createFreePoint(npt(-2, 3), { label: 'D', color: '#9333ea' });

	// Normal segments (clean)
	mixedFig.createSegment(mA, mB, { color: '#1e40af' });
	mixedFig.createSegment(mB, mC, { color: '#1e40af' });

	// Rough segments (hand-drawn)
	mixedFig.createSegment(mC, mD, { color: '#dc2626', style: { render: 'rough', roughness: 1.5 } });
	mixedFig.createSegment(mD, mA, { color: '#dc2626', style: { render: 'rough', roughness: 1.5 } });

	// Normal circle
	const mO1 = mixedFig.createFreePoint(npt(-4, 0), { label: 'O1', color: '#059669' });
	const mE1 = mixedFig.createFreePoint(npt(-2.5, 0), { label: 'E1', color: '#059669' });
	mixedFig.createCircleByPoint(mO1, mE1, { color: '#059669' });

	// Rough circle
	const mO2 = mixedFig.createFreePoint(npt(5, 2), { label: 'O2', color: '#ea580c' });
	const mE2 = mixedFig.createFreePoint(npt(7, 2), { label: 'E2', color: '#ea580c' });
	mixedFig.createCircleByPoint(mO2, mE2, {
		color: '#ea580c',
		style: { render: 'rough', roughness: 2 }
	});

	// Rough arc
	const mArcK = mixedFig.createFreePoint(npt(5, -3), { label: 'K', color: '#0891b2' });
	mixedFig.createArcByAngles(mArcK, numeric(2), numeric(Math.PI / 4), numeric(Math.PI), {
		color: '#0891b2',
		style: { render: 'rough' }
	});

	// ==========================================================================
	// Parameters showcase — bowing, fillStyle, preserveVertices
	// ==========================================================================
	const paramsFig = new Figure();

	// Row 1: bowing comparison (left=0, middle=1, right=5)
	const bA1 = paramsFig.createFreePoint(npt(-7, 3), { label: 'bowing=0', color: '#6366f1' });
	const bB1 = paramsFig.createFreePoint(npt(-4, 3), { color: '#6366f1' });
	paramsFig.createSegment(bA1, bB1, {
		color: '#6366f1',
		style: { render: 'rough', roughBowing: 0 }
	});

	const bA2 = paramsFig.createFreePoint(npt(-2, 3), { label: 'bowing=1', color: '#6366f1' });
	const bB2 = paramsFig.createFreePoint(npt(1, 3), { color: '#6366f1' });
	paramsFig.createSegment(bA2, bB2, {
		color: '#6366f1',
		style: { render: 'rough', roughBowing: 1 }
	});

	const bA3 = paramsFig.createFreePoint(npt(3, 3), { label: 'bowing=8', color: '#6366f1' });
	const bB3 = paramsFig.createFreePoint(npt(6, 3), { color: '#6366f1' });
	paramsFig.createSegment(bA3, bB3, {
		color: '#6366f1',
		style: { render: 'rough', roughBowing: 8 }
	});

	// Row 2: fillStyle variants (polygons with fill)
	// Hachure
	const fA1 = paramsFig.createFreePoint(npt(-7, -1), { color: '#059669' });
	const fB1 = paramsFig.createFreePoint(npt(-5, -1), { color: '#059669' });
	const fC1 = paramsFig.createFreePoint(npt(-6, 1), { color: '#059669' });
	paramsFig.createPolygon([fA1, fB1, fC1], {
		color: '#059669',
		style: { render: 'rough', fillColor: '#bbf7d0', roughFillStyle: 'hachure' }
	});

	// Cross-hatch
	const fA2 = paramsFig.createFreePoint(npt(-3.5, -1), { color: '#dc2626' });
	const fB2 = paramsFig.createFreePoint(npt(-1.5, -1), { color: '#dc2626' });
	const fC2 = paramsFig.createFreePoint(npt(-2.5, 1), { color: '#dc2626' });
	paramsFig.createPolygon([fA2, fB2, fC2], {
		color: '#dc2626',
		style: { render: 'rough', fillColor: '#fecaca', roughFillStyle: 'cross-hatch' }
	});

	// Zigzag
	const fA3 = paramsFig.createFreePoint(npt(0, -1), { color: '#ea580c' });
	const fB3 = paramsFig.createFreePoint(npt(2, -1), { color: '#ea580c' });
	const fC3 = paramsFig.createFreePoint(npt(1, 1), { color: '#ea580c' });
	paramsFig.createPolygon([fA3, fB3, fC3], {
		color: '#ea580c',
		style: { render: 'rough', fillColor: '#fed7aa', roughFillStyle: 'zigzag' }
	});

	// Dots
	const fA4 = paramsFig.createFreePoint(npt(3.5, -1), { color: '#9333ea' });
	const fB4 = paramsFig.createFreePoint(npt(5.5, -1), { color: '#9333ea' });
	const fC4 = paramsFig.createFreePoint(npt(4.5, 1), { color: '#9333ea' });
	paramsFig.createPolygon([fA4, fB4, fC4], {
		color: '#9333ea',
		style: { render: 'rough', fillColor: '#e9d5ff', roughFillStyle: 'dots' }
	});

	// Row 3: dash styles in rough mode (solid / dashed / dotted)
	const dA1 = paramsFig.createFreePoint(npt(-7, -3), { label: 'solid', color: '#dc2626' });
	const dB1 = paramsFig.createFreePoint(npt(-4, -3), { color: '#dc2626' });
	paramsFig.createSegment(dA1, dB1, {
		color: '#dc2626',
		style: { render: 'rough' }
	});

	const dA2 = paramsFig.createFreePoint(npt(-2, -3), { label: 'tirets', color: '#dc2626' });
	const dB2 = paramsFig.createFreePoint(npt(1, -3), { color: '#dc2626' });
	paramsFig.createSegment(dA2, dB2, {
		color: '#dc2626',
		style: { render: 'rough', dash: 'dashed' }
	});

	const dA3 = paramsFig.createFreePoint(npt(3, -3), { label: 'pointilles', color: '#dc2626' });
	const dB3 = paramsFig.createFreePoint(npt(6, -3), { color: '#dc2626' });
	paramsFig.createSegment(dA3, dB3, {
		color: '#dc2626',
		style: { render: 'rough', dash: 'dotted' }
	});

	// Row 4: strokeWidth comparison (1, 3, 6)
	const sA1 = paramsFig.createFreePoint(npt(-7, -5), { label: 'epaisseur=1', color: '#f59e0b' });
	const sB1 = paramsFig.createFreePoint(npt(-4, -5), { color: '#f59e0b' });
	paramsFig.createSegment(sA1, sB1, {
		color: '#f59e0b',
		style: { render: 'rough', strokeWidth: 1 }
	});

	const sA2 = paramsFig.createFreePoint(npt(-2, -5), { label: 'epaisseur=3', color: '#f59e0b' });
	const sB2 = paramsFig.createFreePoint(npt(1, -5), { color: '#f59e0b' });
	paramsFig.createSegment(sA2, sB2, {
		color: '#f59e0b',
		style: { render: 'rough', strokeWidth: 3 }
	});

	const sA3 = paramsFig.createFreePoint(npt(3, -5), { label: 'epaisseur=6', color: '#f59e0b' });
	const sB3 = paramsFig.createFreePoint(npt(6, -5), { color: '#f59e0b' });
	paramsFig.createSegment(sA3, sB3, {
		color: '#f59e0b',
		style: { render: 'rough', strokeWidth: 6 }
	});

	// Row 5: dashed + thick strokeWidth (3, 5)
	const tA1 = paramsFig.createFreePoint(npt(-7, -7), { label: 'tirets ep=3', color: '#16a34a' });
	const tB1 = paramsFig.createFreePoint(npt(-4, -7), { color: '#16a34a' });
	paramsFig.createSegment(tA1, tB1, {
		color: '#16a34a',
		style: { render: 'rough', dash: 'dashed', strokeWidth: 3 }
	});

	const tA2 = paramsFig.createFreePoint(npt(-2, -7), { label: 'tirets ep=5', color: '#16a34a' });
	const tB2 = paramsFig.createFreePoint(npt(1, -7), { color: '#16a34a' });
	paramsFig.createSegment(tA2, tB2, {
		color: '#16a34a',
		style: { render: 'rough', dash: 'dashed', strokeWidth: 5 }
	});

	const tA3 = paramsFig.createFreePoint(npt(3, -7), { label: 'pointilles ep=5', color: '#16a34a' });
	const tB3 = paramsFig.createFreePoint(npt(6, -7), { color: '#16a34a' });
	paramsFig.createSegment(tA3, tB3, {
		color: '#16a34a',
		style: { render: 'rough', dash: 'dotted', strokeWidth: 5 }
	});

	// Row 6: preserveVertices comparison
	const pA1 = paramsFig.createFreePoint(npt(-7, -10), {
		label: 'preserveVertices=false',
		color: '#0891b2'
	});
	const pB1 = paramsFig.createFreePoint(npt(-4, -10), { color: '#0891b2' });
	const pC1 = paramsFig.createFreePoint(npt(-5.5, -8.5), { color: '#0891b2' });
	paramsFig.createPolygon([pA1, pB1, pC1], {
		color: '#0891b2',
		style: { render: 'rough', roughPreserveVertices: false, roughness: 2 }
	});

	const pA2 = paramsFig.createFreePoint(npt(1, -10), {
		label: 'preserveVertices=true',
		color: '#0891b2'
	});
	const pB2 = paramsFig.createFreePoint(npt(4, -10), { color: '#0891b2' });
	const pC2 = paramsFig.createFreePoint(npt(2.5, -8.5), { color: '#0891b2' });
	paramsFig.createPolygon([pA2, pB2, pC2], {
		color: '#0891b2',
		style: { render: 'rough', roughPreserveVertices: true, roughness: 2 }
	});

	// Filled circle with solid fill
	const pO = paramsFig.createFreePoint(npt(7, 0), { label: 'solid fill', color: '#1e40af' });
	const pE = paramsFig.createFreePoint(npt(8.5, 0), { color: '#1e40af' });
	paramsFig.createCircleByPoint(pO, pE, {
		color: '#1e40af',
		style: { render: 'rough', fillColor: '#bfdbfe', roughFillStyle: 'solid' }
	});

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
	// Vectors — bound and free
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
	// Vectors via DSL
	// ==========================================================================
	const vectorDslFig = runDsl(
		`A = point(-4, -2)
B = point(0, 1)
u = vecteur(A, B, couleur="rouge")
v = vecteur(2, 3, couleur="vert")
P = point(2, -1, couleur="orange")
P2 = translation(P, vecteur=u)
style(P2, couleur="orange")`
	).figure;

	// ==========================================================================
	// Vector operations via DSL
	// ==========================================================================
	const vectorOpsFig = runDsl(
		`u = vecteur(3, 1, couleur="rouge")
v = vecteur(1, 3, couleur="bleu")
w = u + v
style(w, couleur="violet")
d = u - v
style(d, couleur="orange")
s = 2 * u
style(s, couleur="cyan")
n = -v
style(n, couleur="gris")`
	).figure;

	const vectorScalarFig = runDsl(
		`A = point(-3, 0)
B = point(0, 2)
u = vecteur(A, B, couleur="rouge")
n = norme(u)
v = vecteur(1, 0, couleur="bleu")
p = produit_scalaire(u, v)
a = angle_vecteurs(u, v)`
	);

	// ==========================================================================
	// courbe() — implicit curves F(x,y) = 0 (marching squares)
	// ==========================================================================
	const implicitFig = runDsl(
		`c1 = courbe("x^3 + y^3 - 3*x*y = 0", couleur="bleu")
c2 = courbe("x^4 + y^4 - 1 = 0", couleur="rouge")
c3 = courbe("sin(x) + cos(y) - 1 = 0", couleur="vert")
c4 = courbe("x^2*y - y^3 - x^2 + y = 0", couleur="violet")`
	).figure;

	// ==========================================================================
	// Transformation objects — reusable rotation applied to a triangle
	// ==========================================================================
	const transformTriangleFig = runDsl(
		`O = point(0, 0, couleur="noir")
A = point(3, 0, couleur="bleu")
B = point(5, 0, couleur="bleu")
C = point(4, 2, couleur="bleu")
segment(A, B, couleur="bleu")
segment(B, C, couleur="bleu")
segment(C, A, couleur="bleu")

r = rotation(angle=60, centre=O)

A2 = transforme(r, A)
B2 = transforme(r, B)
C2 = transforme(r, C)
style(A2, couleur="rouge")
style(B2, couleur="rouge")
style(C2, couleur="rouge")
segment(A2, B2, couleur="rouge")
segment(B2, C2, couleur="rouge")
segment(C2, A2, couleur="rouge")

s1 = transforme(r, segment(A, B))
s2 = transforme(r, segment(B, C))
s3 = transforme(r, segment(C, A))
style(s1, couleur="vert", trait="tirets")
style(s2, couleur="vert", trait="tirets")
style(s3, couleur="vert", trait="tirets")`
	).figure;

	// ==========================================================================
	// Transformation objects — all types demo
	// ==========================================================================
	const transformAllTypesFig = runDsl(
		`A = point(3, 2, couleur="bleu")
B = point(5, 2, couleur="bleu")
s = segment(A, B, couleur="bleu")
c = cercle(A, rayon=1, couleur="bleu")

O = point(0, 0, couleur="noir")

rot = rotation(angle=90, centre=O)
s_rot = transforme(rot, s)
c_rot = transforme(rot, c)
style(s_rot, couleur="rouge")
style(c_rot, couleur="rouge")

sym = symetrie(centre=O)
s_sym = transforme(sym, s)
c_sym = transforme(sym, c)
style(s_sym, couleur="vert")
style(c_sym, couleur="vert")

P1 = point(-6, 0, couleur="gris")
P2 = point(6, 0, couleur="gris")
axe = droite(P1, P2, couleur="gris", trait="tirets")
refl = symetrie(axe=axe)
s_refl = transforme(refl, s)
c_refl = transforme(refl, c)
style(s_refl, couleur="violet")
style(c_refl, couleur="violet")`
	).figure;

	// ==========================================================================
	// Composition of transformations
	// ==========================================================================
	const composeFig = runDsl(
		`O = point(0, 0, couleur="noir")
A = point(2, 0, couleur="bleu")
B = point(4, 0, couleur="bleu")
C = point(3, 1.5, couleur="bleu")
segment(A, B, couleur="bleu")
segment(B, C, couleur="bleu")
segment(C, A, couleur="bleu")

r = rotation(angle=45, centre=O)
h = homothetie(rapport=1.5, centre=O)
f = compose(h, r)

A2 = transforme(r, A)
B2 = transforme(r, B)
C2 = transforme(r, C)
style(A2, couleur="orange")
style(B2, couleur="orange")
style(C2, couleur="orange")
segment(A2, B2, couleur="orange", trait="tirets")
segment(B2, C2, couleur="orange", trait="tirets")
segment(C2, A2, couleur="orange", trait="tirets")

A3 = transforme(f, A)
B3 = transforme(f, B)
C3 = transforme(f, C)
style(A3, couleur="rouge")
style(B3, couleur="rouge")
style(C3, couleur="rouge")
segment(A3, B3, couleur="rouge")
segment(B3, C3, couleur="rouge")
segment(C3, A3, couleur="rouge")`
	).figure;

	// ==========================================================================
	// Direct application syntax on various objects
	// ==========================================================================
	const directSyntaxFig = runDsl(
		`O = point(0, 0, couleur="noir")
A = point(2, 1, couleur="bleu")
B = point(4, 1, couleur="bleu")
s = segment(A, B, couleur="bleu")
d = droite(A, B, couleur="bleu", trait="tirets")
c = cercle(point(3, 3, couleur="bleu"), rayon=1, couleur="bleu")

s2 = rotation(s, centre=O, angle=90)
style(s2, couleur="rouge")

d2 = rotation(d, centre=O, angle=90)
style(d2, couleur="rouge", trait="tirets")

c2 = rotation(c, centre=O, angle=90)
style(c2, couleur="rouge")

u = vecteur(2, 1, couleur="bleu")
r = rotation(angle=90, centre=O)
u2 = transforme(r, u)
style(u2, couleur="rouge")

c3 = homothetie(c, centre=O, rapport=2)
style(c3, couleur="vert")`
	).figure;

	// ==========================================================================
	// Polygone builtin — polygone(A, B, C, ...) + transformation
	// ==========================================================================
	const polygoneFig = runDsl(
		`A = point(2, 0, couleur="bleu")
B = point(4, 0, couleur="bleu")
C = point(5, 2, couleur="bleu")
D = point(3, 3, couleur="bleu")
E = point(1, 2, couleur="bleu")
p = polygone(A, B, C, D, E)
style(p, couleur="bleu")

O = point(0, 0, couleur="noir")
r = rotation(angle=72, centre=O)
p2 = transforme(r, p)
style(p2, couleur="rouge")

s = symetrie(centre=O)
p3 = transforme(s, p)
style(p3, couleur="vert")`
	).figure;

	// ==========================================================================
	// Curve transformations — function, conic, implicit
	// ==========================================================================
	const transformCurveFig = runDsl(
		`O = point(0, 0, couleur="noir")
f = courbe("y = x^2", couleur="bleu")
r = rotation(angle=45, centre=O)
f2 = transforme(r, f)
style(f2, couleur="rouge")`
	).figure;

	const transformConicFig = runDsl(
		`O = point(0, 0, couleur="noir")
c = courbe("{x^2}/4 + {y^2}/9 - 1 = 0", couleur="bleu")

r = rotation(angle=30, centre=O)
c2 = transforme(r, c)
style(c2, couleur="rouge")

A = point(0, 0)
B = point(3, 1)
t = translation(vecteur=(A, B))
c3 = transforme(t, c)
style(c3, couleur="vert")

h = homothetie(rapport=0.5, centre=O)
c4 = transforme(h, c)
style(c4, couleur="violet")`
	).figure;

	// ==========================================================================
	// Similitude — spiral of triangles
	// ==========================================================================
	const similitudeFig = runDsl(
		`O = point(0, 0, couleur="noir")
A = point(3, 0, couleur="bleu")
B = point(4, 0, couleur="bleu")
C = point(3.5, 1, couleur="bleu")
segment(A, B, couleur="bleu")
segment(B, C, couleur="bleu")
segment(C, A, couleur="bleu")

sim = similitude(centre=O, angle=40, rapport=0.85)

A2 = transforme(sim, A)
B2 = transforme(sim, B)
C2 = transforme(sim, C)
segment(A2, B2, couleur="rouge")
segment(B2, C2, couleur="rouge")
segment(C2, A2, couleur="rouge")

A3 = transforme(sim, A2)
B3 = transforme(sim, B2)
C3 = transforme(sim, C2)
segment(A3, B3, couleur="vert")
segment(B3, C3, couleur="vert")
segment(C3, A3, couleur="vert")

A4 = transforme(sim, A3)
B4 = transforme(sim, B3)
C4 = transforme(sim, C3)
segment(A4, B4, couleur="violet")
segment(B4, C4, couleur="violet")
segment(C4, A4, couleur="violet")

A5 = transforme(sim, A4)
B5 = transforme(sim, B4)
C5 = transforme(sim, C4)
segment(A5, B5, couleur="orange")
segment(B5, C5, couleur="orange")
segment(C5, A5, couleur="orange")`
	).figure;

	// ==========================================================================
	// Projection — polygon projected onto a line
	// ==========================================================================
	const projectionFig = runDsl(
		`A = point(-3, 0, couleur="noir")
B = point(5, 0, couleur="noir")
d = droite(A, B)
style(d, couleur="noir", trait="tirets")

C = point(0, 3, couleur="bleu")
D = point(2, 4, couleur="bleu")
E = point(4, 3, couleur="bleu")
F = point(3, 1.5, couleur="bleu")
G = point(1, 1.5, couleur="bleu")
p = polygone(C, D, E, F, G)
style(p, couleur="bleu")

proj = projection(axe=d)
p2 = transforme(proj, p)
style(p2, couleur="rouge")`
	).figure;

	// ==========================================================================
	// Affinite — circle to ellipse
	// ==========================================================================
	const affiniteFig = runDsl(
		`A = point(-5, 0, couleur="noir")
B = point(5, 0, couleur="noir")
d = droite(A, B)
style(d, couleur="noir", trait="tirets")

O = point(0, 2, couleur="bleu")
c = cercle(O, rayon=2, couleur="bleu")

aff = affinite(axe=(A, B), rapport=0.5)
c2 = transforme(aff, c)
style(c2, couleur="rouge")

aff2 = affinite(axe=(A, B), rapport=2)
c3 = transforme(aff2, c)
style(c3, couleur="vert")`
	).figure;

	// ==========================================================================
	// Inversion — circles and lines
	// ==========================================================================
	const inversionFig = runDsl(
		`O = point(0, 0, couleur="noir")
inv = inversion(centre=O, rayon=3)

A = point(2, 0, couleur="bleu")
B = point(2, 4, couleur="bleu")
d = droite(A, B, couleur="bleu")
d2 = transforme(inv, d)
style(d2, couleur="rouge")

C = point(-3, 2, couleur="vert")
c = cercle(C, rayon=1, couleur="vert")
c2 = transforme(inv, c)
style(c2, couleur="orange")

D = point(1.5, 0, couleur="violet")
c3 = cercle(D, rayon=1.5, couleur="violet")
c4 = transforme(inv, c3)
style(c4, couleur="cyan")`
	).figure;

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

	const transformImplicitFig = runDsl(
		`O = point(0, 0, couleur="noir")
c = courbe("x^3 + y^3 - 3*x*y = 0", couleur="bleu")

A = point(0, 0)
B = point(2, 2)
t = translation(vecteur=(A, B))
c2 = transforme(t, c)
style(c2, couleur="rouge")

r = rotation(angle=90, centre=O)
c3 = transforme(r, c)
style(c3, couleur="vert")`
	).figure;
</script>

<div class="p-4">
	<h1 class="mb-4 text-2xl font-bold">Geometry Demo</h1>
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

	<h2 class="mb-4 text-xl font-bold">Vecteurs — vecteur()</h2>
	<p class="mb-4 text-muted-foreground">
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

	<p class="mt-4 text-sm text-muted-foreground">
		{vectorFig.size} elements | vecteurs lies + libres + translation
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Vecteurs via DSL</h2>
	<p class="mb-4 text-muted-foreground">
		Vecteurs crees via le DSL : <code>vecteur(A, B)</code> (lie) et <code>vecteur(2, 3)</code>
		(libre).
		<br />
		Translation par vecteur : <code>translation(P, vecteur=u)</code>.
	</p>

	<GeometryCanvas
		figure={vectorDslFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{vectorDslFig.size} elements | vecteurs via DSL
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Operations vectorielles — u + v, 3 * u, -v</h2>
	<p class="mb-4 text-muted-foreground">
		Toutes les operations creent des vecteurs reactifs dans le graphe de dependances.
		<br />
		<strong>Rouge</strong> : u = (3, 1) |
		<strong>Bleu</strong> : v = (1, 3) |
		<strong>Violet</strong> : w = u + v |
		<strong>Orange</strong> : d = u - v |
		<strong>Cyan</strong> : s = 2 * u |
		<strong>Gris</strong> : n = -v
	</p>

	<GeometryCanvas
		figure={vectorOpsFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{vectorOpsFig.size} elements | operations vectorielles reactives
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">
		Builtins scalaires — norme(), produit_scalaire(), angle_vecteurs()
	</h2>
	<p class="mb-4 text-muted-foreground">
		<strong>Rouge</strong> : u = AB |
		<strong>Bleu</strong> : v = (1, 0)
		<br />
		norme(u) = {vectorScalarFig.symbols.get('n')?.value?.toFixed(2) ?? '?'} | produit_scalaire(u, v)
		= {vectorScalarFig.symbols.get('p')?.value?.toFixed(2) ?? '?'} | angle_vecteurs(u, v) = {vectorScalarFig.symbols
			.get('a')
			?.value?.toFixed(1) ?? '?'}°
	</p>

	<GeometryCanvas
		figure={vectorScalarFig.figure}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{vectorScalarFig.figure.size} elements | norme, produit scalaire, angle
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

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Objets transformation — rotation reutilisable</h2>
	<p class="mb-4 text-muted-foreground">
		Un objet rotation <code>r = rotation(angle=60, centre=O)</code> applique a chaque sommet du
		triangle via <code>transforme(r, A)</code>. Deplacez O pour deplacer le centre de rotation,
		deplacez A/B/C pour voir les images suivre.
		<br />
		<strong>Bleu</strong> : triangle original |
		<strong>Rouge</strong> : sommets images (transforme point par point) |
		<strong>Vert tirets</strong> : segments images (transforme(r, segment))
	</p>

	<GeometryCanvas
		figure={transformTriangleFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{transformTriangleFig.size} elements | transformation objects + transforme()
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">
		Transformations — rotation, symetrie centrale, symetrie axiale
	</h2>
	<p class="mb-4 text-muted-foreground">
		Un segment et un cercle transformes par 3 types de transformation differents. Deplacez les
		points pour voir les images reagir.
		<br />
		<strong>Bleu</strong> : originaux |
		<strong>Rouge</strong> : rotation 90° autour de O |
		<strong>Vert</strong> : symetrie centrale (O) |
		<strong>Violet</strong> : symetrie axiale (axe x, tirets gris)
	</p>

	<GeometryCanvas
		figure={transformAllTypesFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={35}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{transformAllTypesFig.size} elements | rotation + symetrie centrale + axiale
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Composition — compose(homothetie, rotation)</h2>
	<p class="mb-4 text-muted-foreground">
		<code>f = compose(h, r)</code> : applique rotation 45° puis homothetie rapport 1.5. Le triangle
		bleu est transforme en deux etapes visibles.
		<br />
		<strong>Bleu</strong> : triangle original |
		<strong>Orange tirets</strong> : apres rotation seule (45°) |
		<strong>Rouge</strong> : apres composition rotation + homothetie
	</p>

	<GeometryCanvas
		figure={composeFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={35}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{composeFig.size} elements | compose(homothetie, rotation)
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Syntaxe directe — rotation(segment, centre=O, angle=90)</h2>
	<p class="mb-4 text-muted-foreground">
		Application directe sans objet transformation nomme : <code
			>rotation(segment, centre=O, angle=90)</code
		>. Fonctionne pour segments, droites, cercles, vecteurs.
		<br />
		<strong>Bleu</strong> : originaux (segment, droite tirets, cercle, vecteur) |
		<strong>Rouge</strong> : rotation 90° |
		<strong>Vert</strong> : homothetie rapport 2 (cercle uniquement)
	</p>

	<GeometryCanvas
		figure={directSyntaxFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={35}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{directSyntaxFig.size} elements | syntaxe directe sur objets varies
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Polygone — polygone(A, B, C, D, E) + transforme()</h2>
	<p class="mb-4 text-muted-foreground">
		Builtin <code>polygone(A, B, C, ...)</code> pour creer des polygones a N sommets. Ici un
		pentagone transforme par rotation 72° et symetrie centrale. Deplacez les sommets ou le centre O.
		<br />
		<strong>Bleu</strong> : pentagone original |
		<strong>Rouge</strong> : rotation 72° autour de O |
		<strong>Vert</strong> : symetrie centrale (O)
	</p>

	<GeometryCanvas
		figure={polygoneFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{polygoneFig.size} elements | polygone() + transforme()
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Transformation de courbe — y = x² tourne de 45°</h2>
	<p class="mb-4 text-muted-foreground">
		<code>transforme(r, courbe("y = x^2"))</code> cree une courbe implicite F(T⁻¹(x,y)) = 0. Le
		resultat n'est plus une fonction y=g(x) mais est rendu correctement.
		<br />
		<strong>Bleu</strong> : parabole y = x² |
		<strong>Rouge</strong> : rotation 45° autour de O
	</p>

	<GeometryCanvas
		figure={transformCurveFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{transformCurveFig.size} elements | courbe y=f(x) transformee
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">
		Transformation de coniques — ellipse rotation + translation + homothetie
	</h2>
	<p class="mb-4 text-muted-foreground">
		Les coniques restent des coniques apres transformation affine : les coefficients sont recalcules
		via la matrice inverse. <code>tangente()</code>, <code>point_sur()</code> et
		<code>zeros()</code> restent utilisables sur l'image.
		<br />
		<strong>Bleu</strong> : ellipse x²/4 + y²/9 = 1 |
		<strong>Rouge</strong> : rotation 30° |
		<strong>Vert</strong> : translation (3, 1) |
		<strong>Violet</strong> : homothetie rapport 0.5
	</p>

	<GeometryCanvas
		figure={transformConicFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={35}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{transformConicFig.size} elements | coniques transformees (restent GeoQuadraticCurve)
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Similitude — spirale de triangles</h2>
	<p class="mb-4 text-muted-foreground">
		<code>similitude(centre=O, angle=40, rapport=0.85)</code> appliquee 4 fois successivement a un triangle.
		Chaque iteration tourne de 40° et reduit de 15%. Deplacez O pour changer le centre.
	</p>

	<GeometryCanvas
		figure={similitudeFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={50}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{similitudeFig.size} elements | similitude() — spirale de triangles
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Projection orthogonale — polygone sur une droite</h2>
	<p class="mb-4 text-muted-foreground">
		<code>projection(axe=d)</code> projette un pentagone sur l'axe Ox. Le resultat est un polygone
		aplati. Deplacez les sommets pour observer la projection.
		<br />
		<strong>Bleu</strong> : pentagone original |
		<strong>Rouge</strong> : projection sur la droite
	</p>

	<GeometryCanvas
		figure={projectionFig}
		center={{ x: 1, y: 2 }}
		pixelsPerUnit={60}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{projectionFig.size} elements | projection() — polygone sur droite
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Affinite orthogonale — cercle vers ellipse</h2>
	<p class="mb-4 text-muted-foreground">
		<code>affinite(axe=(A,B), rapport=k)</code> etire perpendiculairement a l'axe. Un cercle devient
		une ellipse. Deplacez O pour observer la deformation.
		<br />
		<strong>Bleu</strong> : cercle original |
		<strong>Rouge</strong> : rapport=0.5 (compression) |
		<strong>Vert</strong> : rapport=2 (etirement)
	</p>

	<GeometryCanvas
		figure={affiniteFig}
		center={{ x: 0, y: 2 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{affiniteFig.size} elements | affinite() — cercle vers ellipse
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Inversion circulaire — droites et cercles</h2>
	<p class="mb-4 text-muted-foreground">
		<code>inversion(centre=O, rayon=3)</code> : transformation non-affine. Une droite ne passant pas
		par O devient un cercle passant par O. Un cercle passant par O devient une droite.
		<br />
		<strong>Bleu</strong> : droite verticale → <strong>Rouge</strong> : cercle image |
		<strong>Vert</strong> : cercle (ne passe pas par O) → <strong>Orange</strong> : cercle image |
		<strong>Violet</strong> : cercle (passe par O) → <strong>Cyan</strong> : droite image
	</p>

	<GeometryCanvas
		figure={inversionFig}
		center={{ x: 0, y: 1 }}
		pixelsPerUnit={35}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{inversionFig.size} elements | inversion() — droites et cercles
	</p>

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

	<h2 class="mb-4 text-xl font-bold">Transformation de courbe implicite — folium de Descartes</h2>
	<p class="mb-4 text-muted-foreground">
		Courbe implicite F(x,y) = 0 transformee par translation et rotation. Le rendu utilise
		l'algorithme marching squares sur la courbe composee F(T⁻¹(x,y)) = 0.
		<br />
		<strong>Bleu</strong> : folium x³+y³-3xy = 0 |
		<strong>Rouge</strong> : translation (2, 2) |
		<strong>Vert</strong> : rotation 90°
	</p>

	<GeometryCanvas
		figure={transformImplicitFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={35}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{transformImplicitFig.size} elements | courbe implicite transformee
	</p>
</div>
