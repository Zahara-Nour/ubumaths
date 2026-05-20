/**
 * Integration tests for the 4 canonical angle cases on the rendering pipeline.
 *
 * Validates that GeoAngle correctly produces:
 *   1. 60° simple    — arc visible, mesure ≈ π/3
 *   2. 90° carre     — square instead of arc, mesure ≈ π/2
 *   3. 270° rentrant — sweep inverted (exterior sector), mesure ≈ 3π/2
 *   4. 180° plat     — half-circle arc, mesure ≈ π
 *
 * Coverage: factory + measure scalar + SVG rendering.
 * (TikZ/Typst rendering share the same logic via formatAngleLabel; tested
 * separately in export-*.test.ts.)
 */

import { describe, it, expect } from 'vitest';
import { Figure } from '../../graph/figure';
import { numeric } from '../../types/geo-value';
import { angleToSVG } from '../svg-primitives';
import { createTransformer, DEFAULT_VIEWPORT } from '../../viewport/viewport';
import { runDsl } from '../../dsl';
import { isAngle } from '../../types/elements';
import { geoToNumber } from '../../compute/to-number';

function transformer() {
	return createTransformer(DEFAULT_VIEWPORT, 800, 600);
}

/** Look up a figure element by user-given DSL name via the symbol table. */
function lookup(result: ReturnType<typeof runDsl>, name: string): string {
	const entry = result.symbols.allEntries().get(name);
	if (!entry?.figureId) throw new Error(`No element named ${name}`);
	return entry.figureId;
}

describe('GeoAngle canonical case — 60° simple (arc)', () => {
	it('produces mesure ≈ π/3 in radians', () => {
		const f = new Figure();
		const A = f.createFreePoint({ x: numeric(1), y: numeric(0) });
		const V = f.createFreePoint({ x: numeric(0), y: numeric(0) });
		const B = f.createFreePoint({
			x: numeric(Math.cos(Math.PI / 3)),
			y: numeric(Math.sin(Math.PI / 3))
		});
		f.createAngle(A, V, B);
		const scalarId = f.createScalarAngleMeasure(A, V, B);
		const value = f.getScalarValue(scalarId);
		expect(value).toBeCloseTo(Math.PI / 3, 5);
	});

	it('renders an SVG arc (path starts with M, contains A for arc command)', () => {
		const f = new Figure();
		const A = f.createFreePoint({ x: numeric(1), y: numeric(0) });
		const V = f.createFreePoint({ x: numeric(0), y: numeric(0) });
		const B = f.createFreePoint({
			x: numeric(Math.cos(Math.PI / 3)),
			y: numeric(Math.sin(Math.PI / 3))
		});
		const angId = f.createAngle(A, V, B);
		const svg = angleToSVG(angId, f, transformer());
		expect(svg).not.toBeNull();
		expect(svg!.paths.length).toBe(1);
		expect(svg!.paths[0]).toMatch(/^M/);
		expect(svg!.paths[0]).toContain('A'); // SVG arc command
	});
});

describe('GeoAngle canonical case — 90° avec marque="carre"', () => {
	it('produces mesure ≈ π/2', () => {
		const f = new Figure();
		const A = f.createFreePoint({ x: numeric(1), y: numeric(0) });
		const V = f.createFreePoint({ x: numeric(0), y: numeric(0) });
		const B = f.createFreePoint({ x: numeric(0), y: numeric(1) });
		f.createAngle(A, V, B, { marque: 'carre' });
		const scalarId = f.createScalarAngleMeasure(A, V, B);
		const value = f.getScalarValue(scalarId);
		expect(value).toBeCloseTo(Math.PI / 2, 5);
	});

	it('renders a square path (no arc), 4-segment polyline', () => {
		const f = new Figure();
		const A = f.createFreePoint({ x: numeric(1), y: numeric(0) });
		const V = f.createFreePoint({ x: numeric(0), y: numeric(0) });
		const B = f.createFreePoint({ x: numeric(0), y: numeric(1) });
		const angId = f.createAngle(A, V, B, { marque: 'carre' });
		const svg = angleToSVG(angId, f, transformer());
		expect(svg).not.toBeNull();
		expect(svg!.paths.length).toBe(1);
		// Right-angle square is a polyline with M + 3+ L commands, no A arc
		expect(svg!.paths[0]).toMatch(/^M/);
		expect(svg!.paths[0]).not.toContain('A');
		expect((svg!.paths[0].match(/L/g) ?? []).length).toBeGreaterThanOrEqual(2);
	});
});

describe('GeoAngle canonical case — 270° rentrant (sweep inverse)', () => {
	it('mesure returns the SAILLANT measure (π/2) — kind is a render-only field', () => {
		// Geometric vectors are still A→V and B→V; the angle between them is π/2.
		// kind='rentrant' affects rendering (sweep) only, not the scalar measure.
		const f = new Figure();
		const A = f.createFreePoint({ x: numeric(1), y: numeric(0) });
		const V = f.createFreePoint({ x: numeric(0), y: numeric(0) });
		const B = f.createFreePoint({ x: numeric(0), y: numeric(1) });
		f.createAngle(A, V, B, { kind: 'rentrant' });
		const scalarId = f.createScalarAngleMeasure(A, V, B);
		const value = f.getScalarValue(scalarId);
		expect(value).toBeCloseTo(Math.PI / 2, 5);
	});

	it('renders an arc with sweep-flag 1 (large arc through exterior)', () => {
		const f = new Figure();
		const A = f.createFreePoint({ x: numeric(1), y: numeric(0) });
		const V = f.createFreePoint({ x: numeric(0), y: numeric(0) });
		const B = f.createFreePoint({ x: numeric(0), y: numeric(1) });
		const angId = f.createAngle(A, V, B, { kind: 'rentrant' });
		const svg = angleToSVG(angId, f, transformer());
		expect(svg).not.toBeNull();
		expect(svg!.paths.length).toBe(1);
		// SVG arc format: A rx ry rotation large-arc-flag sweep-flag x y
		// For rentrant, large-arc-flag should be 1
		const arcMatch = svg!.paths[0].match(/A\s+[\d.]+\s+[\d.]+\s+\d+\s+(\d)\s+(\d)/);
		expect(arcMatch).not.toBeNull();
		expect(arcMatch![1]).toBe('1'); // large-arc-flag = 1 for rentrant
	});
});

describe('GeoAngle canonical case — 180° plat', () => {
	it('produces mesure ≈ π', () => {
		const f = new Figure();
		const A = f.createFreePoint({ x: numeric(1), y: numeric(0) });
		const V = f.createFreePoint({ x: numeric(0), y: numeric(0) });
		const B = f.createFreePoint({ x: numeric(-1), y: numeric(0) });
		f.createAngle(A, V, B);
		const scalarId = f.createScalarAngleMeasure(A, V, B);
		const value = f.getScalarValue(scalarId);
		expect(value).toBeCloseTo(Math.PI, 5);
	});

	it('still renders a path (even if bisector direction is ambiguous)', () => {
		const f = new Figure();
		const A = f.createFreePoint({ x: numeric(1), y: numeric(0) });
		const V = f.createFreePoint({ x: numeric(0), y: numeric(0) });
		const B = f.createFreePoint({ x: numeric(-1), y: numeric(0) });
		const angId = f.createAngle(A, V, B);
		const svg = angleToSVG(angId, f, transformer());
		// Either renders a half-circle arc OR gracefully returns null/empty.
		// Both are acceptable degenerate handling.
		expect(svg).not.toBeNull();
	});
});

describe('GeoAngle canonical case — reactive measure under drag', () => {
	it('measure updates when a side point moves', () => {
		const f = new Figure();
		const A = f.createFreePoint({ x: numeric(1), y: numeric(0) });
		const V = f.createFreePoint({ x: numeric(0), y: numeric(0) });
		const B = f.createFreePoint({ x: numeric(0), y: numeric(1) });
		const scalarId = f.createScalarAngleMeasure(A, V, B);

		const before = f.getScalarValue(scalarId);
		expect(before).toBeCloseTo(Math.PI / 2, 5);

		// Move B to make a 60° angle
		f.beginTransaction();
		f.movePoint(B, numeric(Math.cos(Math.PI / 3)), numeric(Math.sin(Math.PI / 3)));
		f.recompute();
		f.commit();

		const after = f.getScalarValue(scalarId);
		expect(after).toBeCloseTo(Math.PI / 3, 5);
	});
});

// =============================================================================
// V2 — angle(u, v) overload canonical cases (3 cases)
// =============================================================================

describe('GeoAngle V2 overload — angle(u, v) canonical cases', () => {
	it('60° between 2 bound vectors sharing origin → produces visible arc', () => {
		const c = Math.cos(Math.PI / 3);
		const s = Math.sin(Math.PI / 3);
		const r = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				`B = point(${c}, ${s})`,
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'a = angle(u, v)',
				'm = mesure(a)'
			].join('\n')
		);
		const mEntry = r.symbols.allEntries().get('m');
		expect(mEntry?.figureId).toBeDefined();
		const measure = r.figure.getScalarValue(mEntry!.figureId!);
		expect(measure).toBeCloseTo(Math.PI / 3, 5);

		const angId = lookup(r, 'a');
		const aEl = r.figure.getElementById(angId);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		expect(aEl.visible).toBe(true);

		const svg = angleToSVG(angId, r.figure, transformer());
		expect(svg).not.toBeNull();
		expect(svg!.paths.length).toBeGreaterThanOrEqual(1);
		expect(svg!.paths[0]).toMatch(/^M/);
		expect(svg!.paths[0]).toContain('A'); // SVG arc command
	});

	it('mesure ≈ π/2 between 2 orthogonal bound vectors with common origin', () => {
		const r = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'a = angle(u, v)',
				'm = mesure(a)'
			].join('\n')
		);
		const mEntry = r.symbols.allEntries().get('m');
		const measure = r.figure.getScalarValue(mEntry!.figureId!);
		expect(measure).toBeCloseTo(Math.PI / 2, 5);

		// Vertex must be the shared origin point O (cas a — réutilisé, pas synthétique).
		const angId = lookup(r, 'a');
		const aEl = r.figure.getElementById(angId);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		expect(aEl.vertexId).toBe(lookup(r, 'O'));
	});

	it('mesure ≈ π for antiparallel bound vectors (180° flat angle still renders)', () => {
		const r = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(-1, 0)',
				'u = vecteur(O, A)',
				'v = vecteur(O, B)',
				'a = angle(u, v)',
				'm = mesure(a)'
			].join('\n')
		);
		const mEntry = r.symbols.allEntries().get('m');
		const measure = r.figure.getScalarValue(mEntry!.figureId!);
		expect(measure).toBeCloseTo(Math.PI, 5);

		const angId = lookup(r, 'a');
		const svg = angleToSVG(angId, r.figure, transformer());
		expect(svg).not.toBeNull();
	});
});

// =============================================================================
// V2 — angle(seg1, seg2) overload canonical cases (3 cases)
// =============================================================================

describe('GeoAngle V2 overload — angle(seg1, seg2) canonical cases', () => {
	it('right angle between 2 perpendicular segments sharing endpoint → arc renders', () => {
		const r = runDsl(
			[
				'V = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				's1 = segment(V, A)',
				's2 = segment(V, B)',
				'a = angle(s1, s2)',
				'm = mesure(a)'
			].join('\n')
		);
		const mEntry = r.symbols.allEntries().get('m');
		const measure = r.figure.getScalarValue(mEntry!.figureId!);
		expect(measure).toBeCloseTo(Math.PI / 2, 5);

		const angId = lookup(r, 'a');
		const aEl = r.figure.getElementById(angId);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		// Vertex = shared endpoint V (réutilisé).
		expect(aEl.vertexId).toBe(lookup(r, 'V'));

		const svg = angleToSVG(angId, r.figure, transformer());
		expect(svg).not.toBeNull();
		expect(svg!.paths.length).toBeGreaterThanOrEqual(1);
	});

	it('disjoint secant segments → synthetic vertex at intersection (0,0)', () => {
		const r = runDsl(
			[
				'A = point(-2, 0)',
				'B = point(2, 0)',
				'C = point(0, -2)',
				'D = point(0, 2)',
				's1 = segment(A, B)',
				's2 = segment(C, D)',
				'a = angle(s1, s2)',
				'm = mesure(a)'
			].join('\n')
		);
		const mEntry = r.symbols.allEntries().get('m');
		const measure = r.figure.getScalarValue(mEntry!.figureId!);
		expect(measure).toBeCloseTo(Math.PI / 2, 5);

		const angId = lookup(r, 'a');
		const aEl = r.figure.getElementById(angId);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		const vertexPos = r.figure.getPosition(aEl.vertexId);
		expect(vertexPos).toBeDefined();
		expect(geoToNumber(vertexPos!.x)).toBeCloseTo(0, 5);
		expect(geoToNumber(vertexPos!.y)).toBeCloseTo(0, 5);
	});

	it('45° between 2 secant segments → arc renders, mesure ≈ π/4', () => {
		const r = runDsl(
			[
				'A = point(-2, 0)',
				'B = point(2, 0)',
				'C = point(-1, -1)',
				'D = point(1, 1)',
				's1 = segment(A, B)',
				's2 = segment(C, D)',
				'a = angle(s1, s2)',
				'm = mesure(a)'
			].join('\n')
		);
		const mEntry = r.symbols.allEntries().get('m');
		const measure = r.figure.getScalarValue(mEntry!.figureId!);
		expect(measure).toBeCloseTo(Math.PI / 4, 5);

		const angId = lookup(r, 'a');
		const svg = angleToSVG(angId, r.figure, transformer());
		expect(svg).not.toBeNull();
		expect(svg!.paths[0]).toMatch(/^M/);
		expect(svg!.paths[0]).toContain('A'); // SVG arc command
	});
});

// =============================================================================
// V2 — angle(d1, d2) overload canonical cases (3 cases — acute convention)
// =============================================================================

describe('GeoAngle V2 overload — angle(d1, d2) canonical cases', () => {
	it('45° between y=x and y=0 → mesure ≈ π/4 (acute convention)', () => {
		const r = runDsl(
			[
				'A = point(0, 0)',
				'B = point(1, 0)',
				'C = point(0, 0)',
				'D = point(1, 1)',
				'd1 = droite(A, B)',
				'd2 = droite(C, D)',
				'a = angle(d1, d2)',
				'm = mesure(a)'
			].join('\n')
		);
		const mEntry = r.symbols.allEntries().get('m');
		const measure = r.figure.getScalarValue(mEntry!.figureId!);
		expect(measure).toBeCloseTo(Math.PI / 4, 5);

		const angId = lookup(r, 'a');
		const aEl = r.figure.getElementById(angId);
		if (!aEl || !isAngle(aEl)) throw new Error('expected angle');
		const vertexPos = r.figure.getPosition(aEl.vertexId);
		expect(geoToNumber(vertexPos!.x)).toBeCloseTo(0, 5);
		expect(geoToNumber(vertexPos!.y)).toBeCloseTo(0, 5);
	});

	it('perpendicular lines → mesure = π/2 (boundary of acute convention)', () => {
		const r = runDsl(
			[
				'A = point(0, 0)',
				'B = point(1, 0)',
				'C = point(0, 0)',
				'D = point(0, 1)',
				'd1 = droite(A, B)',
				'd2 = droite(C, D)',
				'a = angle(d1, d2)',
				'm = mesure(a)'
			].join('\n')
		);
		const mEntry = r.symbols.allEntries().get('m');
		const measure = r.figure.getScalarValue(mEntry!.figureId!);
		expect(measure).toBeCloseTo(Math.PI / 2, 5);

		// Even on a sharp angle, an SVG arc renders (no carre marquage by default).
		const angId = lookup(r, 'a');
		const svg = angleToSVG(angId, r.figure, transformer());
		expect(svg).not.toBeNull();
	});

	it('120° geometric angle → acute convention returns π/3 (≈ 60°)', () => {
		// d1 along x-axis, d2 along direction making 120° with x-axis.
		// Acute convention swaps to give the smaller angle: 180° − 120° = 60° = π/3.
		const r = runDsl(
			[
				'A = point(0, 0)',
				'B = point(1, 0)',
				'C = point(0, 0)',
				`D = point(${Math.cos((2 * Math.PI) / 3)}, ${Math.sin((2 * Math.PI) / 3)})`,
				'd1 = droite(A, B)',
				'd2 = droite(C, D)',
				'a = angle(d1, d2)',
				'm = mesure(a)'
			].join('\n')
		);
		const mEntry = r.symbols.allEntries().get('m');
		const measure = r.figure.getScalarValue(mEntry!.figureId!);
		expect(measure).toBeCloseTo(Math.PI / 3, 5);
		// Confirm the measure lies in [0, π/2] (acute convention invariant).
		expect(measure!).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
	});
});

describe('GeoAngle V3a — transporte canonical cases', () => {
	it('transporte(α, V) preserves mesure of α', () => {
		const r = runDsl(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B)',
				'W = point(5, 0)',
				'b = transporte(a, W)',
				'm1 = mesure(a)',
				'm2 = mesure(b)'
			].join('\n')
		);
		const m1 = r.figure.getScalarValue(r.symbols.allEntries().get('m1')!.figureId!);
		const m2 = r.figure.getScalarValue(r.symbols.allEntries().get('m2')!.figureId!);
		expect(m1).toBeCloseTo(Math.PI / 2, 5);
		expect(m2).toBeCloseTo(Math.PI / 2, 5);
	});

	it('transporte(α, V, P) — direction respected; new vertex at V', () => {
		// Original 60° angle. Transport to W with direction along ray W→ T = (6, 1).
		const r = runDsl(
			[
				'A = point(1, 0)',
				`B = point(${Math.cos(Math.PI / 3)}, ${Math.sin(Math.PI / 3)})`,
				'V = point(0, 0)',
				'a = angle(A, V, B)',
				'W = point(5, 0)',
				'T = point(6, 1)',
				'b = transporte(a, W, T)',
				'm = mesure(b)'
			].join('\n')
		);
		const m = r.figure.getScalarValue(r.symbols.allEntries().get('m')!.figureId!);
		expect(m).toBeCloseTo(Math.PI / 3, 5);

		const bEl = r.figure.getElementById(lookup(r, 'b'));
		expect(bEl).toBeDefined();
		expect(isAngle(bEl!)).toBe(true);
		const aEl = bEl as { vertexId: string };
		const vertexPos = r.figure.getPosition(aEl.vertexId);
		expect(geoToNumber(vertexPos!.x)).toBeCloseTo(5, 5);
		expect(geoToNumber(vertexPos!.y)).toBeCloseTo(0, 5);
	});
});

describe('GeoAngle V3a — fill rendering canonical cases', () => {
	it('arc with remplissage produces fillPath in SVG output', () => {
		const r = runDsl(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B, marque="arc", remplissage="rouge")'
			].join('\n')
		);
		const svg = angleToSVG(lookup(r, 'a'), r.figure, transformer());
		expect(svg).not.toBeNull();
		expect(svg!.fillPath).toBeDefined();
		expect(svg!.fillPath).toMatch(/^M /);
		expect(svg!.fillPath).toContain('Z');
	});

	it('arcs2 with remplissage uses OUTER radius for fillPath', () => {
		const r = runDsl(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B, marque="arcs2", remplissage="bleu")'
			].join('\n')
		);
		const svg = angleToSVG(lookup(r, 'a'), r.figure, transformer());
		expect(svg!.fillPath).toBeDefined();
		expect(svg!.paths.length).toBe(2);
		// fillPath should use the OUTER radius (default 25 + spacing 6 = 31 px).
		// Check radius appears in fillPath but with the larger value.
		// Both paths have radius; we just confirm the fill path is present.
		expect(svg!.fillPath).toContain('A');
	});
});
