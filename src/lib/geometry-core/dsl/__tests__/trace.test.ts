/**
 * Tests for trace() — progressive locus that accumulates positions.
 *
 * Covers: creation, accumulation, duplicate filtering, max points,
 * clearTrace, error cases, indirect movement, SVG rendering.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { serializeDsl } from '../index';
import { numeric } from '../../types/geo-value';
import { traceToSVG } from '../../rendering/svg-primitives';
import type { CoordinateTransformer } from '../../viewport/types';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

function getId(symbols: Map<string, { figureId?: string }>, name: string): string {
	const sym = symbols.get(name);
	if (!sym?.figureId) throw new Error(`Symbol "${name}" not found`);
	return sym.figureId;
}

/** Minimal transformer for SVG rendering tests. */
function makeTransformer(): CoordinateTransformer {
	return {
		mathToSvg: (x: number, y: number) => ({ x: x * 40 + 200, y: -y * 40 + 200 }),
		svgToMath: (x: number, y: number) => ({ x: (x - 200) / 40, y: -(y - 200) / 40 })
	};
}

// =============================================================================
// Creation
// =============================================================================

describe('trace() — creation', () => {
	const script = ['A = point(3, 4)', 'T = trace(A)'].join('\n');

	it('creates a GeoTrace element depending on A', () => {
		const { figure, symbols } = run(script);
		const trId = getId(symbols, 'T');
		const el = figure.getElementById(trId);
		expect(el).toBeDefined();
		expect(el!.type).toBe('trace');
		if (el!.type === 'trace') {
			expect(el.trackedPointId).toBeDefined();
		}
		expect(el!.dependsOn).toContain(getId(symbols, 'A'));
	});

	it('seeds with the initial position of the tracked point', () => {
		const { figure, symbols } = run(script);
		const trId = getId(symbols, 'T');
		const points = figure.getTracePoints(trId);
		expect(points.length).toBe(1);
		expect(points[0].x).toBeCloseTo(3);
		expect(points[0].y).toBeCloseTo(4);
	});
});

// =============================================================================
// Accumulation
// =============================================================================

describe('trace() — accumulation', () => {
	it('accumulates a new point when the tracked point moves', () => {
		const script = ['A = point(0, 0)', 'T = trace(A)'].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const trId = getId(symbols, 'T');

		// Move A and recompute
		figure.movePoint(aId, numeric(1), numeric(2));
		figure.recompute();

		const points = figure.getTracePoints(trId);
		expect(points.length).toBe(2);
		expect(points[1].x).toBeCloseTo(1);
		expect(points[1].y).toBeCloseTo(2);
	});

	it('accumulates multiple moves', () => {
		const script = ['A = point(0, 0)', 'T = trace(A)'].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const trId = getId(symbols, 'T');

		for (let i = 1; i <= 10; i++) {
			figure.movePoint(aId, numeric(i), numeric(i));
			figure.recompute();
		}

		const points = figure.getTracePoints(trId);
		expect(points.length).toBe(11); // 1 seed + 10 moves
	});
});

// =============================================================================
// Duplicate filtering
// =============================================================================

describe('trace() — duplicate filtering', () => {
	it('does not add a point if position is nearly identical', () => {
		const script = ['A = point(5, 5)', 'T = trace(A)'].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const trId = getId(symbols, 'T');

		// Move by a tiny amount (below epsilon)
		figure.movePoint(aId, numeric(5 + 1e-12), numeric(5 + 1e-12));
		figure.recompute();

		const points = figure.getTracePoints(trId);
		expect(points.length).toBe(1); // No new point
	});

	it('adds a point if position changes beyond epsilon', () => {
		const script = ['A = point(5, 5)', 'T = trace(A)'].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const trId = getId(symbols, 'T');

		figure.movePoint(aId, numeric(5.001), numeric(5));
		figure.recompute();

		const points = figure.getTracePoints(trId);
		expect(points.length).toBe(2);
	});
});

// =============================================================================
// Max points cap
// =============================================================================

describe('trace() — max points', () => {
	it('drops oldest points when exceeding 500', () => {
		const script = ['A = point(0, 0)', 'T = trace(A)'].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const trId = getId(symbols, 'T');

		// Generate 510 distinct positions (1 seed + 509 moves = 510)
		for (let i = 1; i <= 509; i++) {
			figure.movePoint(aId, numeric(i * 0.1), numeric(0));
			figure.recompute();
		}

		const points = figure.getTracePoints(trId);
		expect(points.length).toBe(500);
		// First point should NOT be (0,0) — it was dropped
		expect(points[0].x).not.toBeCloseTo(0);
	});
});

// =============================================================================
// clearTrace
// =============================================================================

describe('trace() — clearTrace', () => {
	it('resets accumulated points to empty', () => {
		const script = ['A = point(1, 2)', 'T = trace(A)'].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const trId = getId(symbols, 'T');

		figure.movePoint(aId, numeric(3), numeric(4));
		figure.recompute();
		expect(figure.getTracePoints(trId).length).toBe(2);

		figure.clearTrace(trId);
		expect(figure.getTracePoints(trId).length).toBe(0);
	});
});

// =============================================================================
// Error cases
// =============================================================================

describe('trace() — errors', () => {
	it('throws if argument is not a point', () => {
		const script = ['A = point(0,0)', 'B = point(1,1)', 's = segment(A,B)', 'T = trace(s)'].join(
			'\n'
		);
		expect(() => run(script)).toThrow();
	});

	it('throws if no arguments', () => {
		const script = ['T = trace()'].join('\n');
		expect(() => run(script)).toThrow();
	});

	it('throws if too many arguments', () => {
		const script = ['A = point(0,0)', 'B = point(1,1)', 'T = trace(A, B)'].join('\n');
		expect(() => run(script)).toThrow();
	});
});

// =============================================================================
// Indirect movement via slider
// =============================================================================

describe('trace() — indirect movement', () => {
	it('accumulates when tracked point moves via point_sur dependency', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=3)',
			'A = point_sur(c, 0)',
			'B = symetrie(A, centre=O)',
			'T = trace(B)'
		].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const trId = getId(symbols, 'T');

		// Move A on the circle — B depends on A
		figure.movePointOnCircle(aId, Math.PI / 4);
		figure.recompute();

		const points = figure.getTracePoints(trId);
		expect(points.length).toBe(2);
	});

	it('accumulates when tracked point moves via slider', () => {
		const script = [
			'O = point(0, 0)',
			'r = slider(min=1, max=5, valeur=3)',
			'c = cercle(O, rayon=r)',
			'A = point_sur(c, 0)',
			'T = trace(A)'
		].join('\n');
		const { figure, symbols } = run(script);
		const rId = getId(symbols, 'r');
		const trId = getId(symbols, 'T');

		// Change slider — A's position depends on r via the circle radius
		figure.moveSlider(rId, 4);
		figure.recompute();

		const points = figure.getTracePoints(trId);
		expect(points.length).toBe(2);
	});
});

// =============================================================================
// SVG rendering
// =============================================================================

describe('trace() — SVG rendering', () => {
	it('returns null with fewer than 2 points', () => {
		const script = ['A = point(1, 1)', 'T = trace(A)'].join('\n');
		const { figure, symbols } = run(script);
		const trId = getId(symbols, 'T');
		const transformer = makeTransformer();

		const svg = traceToSVG(trId, figure, transformer);
		expect(svg).toBeNull(); // Only 1 point (seed)
	});

	it('produces a valid SVG path with multiple points', () => {
		const script = ['A = point(0, 0)', 'T = trace(A)'].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const trId = getId(symbols, 'T');
		const transformer = makeTransformer();

		// Accumulate several points
		for (let i = 1; i <= 5; i++) {
			figure.movePoint(aId, numeric(i), numeric(i));
			figure.recompute();
		}

		const svg = traceToSVG(trId, figure, transformer);
		expect(svg).not.toBeNull();
		expect(svg!.path).toContain('M');
	});
});

// =============================================================================
// Edge cases
// =============================================================================

describe('trace() — edge cases', () => {
	it('trace on midpoint accumulates correctly', () => {
		const script = ['A = point(0, 0)', 'B = point(4, 0)', 'M = milieu(A, B)', 'T = trace(M)'].join(
			'\n'
		);
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const trId = getId(symbols, 'T');

		// Initial seed at midpoint (2, 0)
		expect(figure.getTracePoints(trId).length).toBe(1);
		expect(figure.getTracePoints(trId)[0].x).toBeCloseTo(2);

		// Move A → midpoint shifts
		figure.movePoint(aId, numeric(2), numeric(0));
		figure.recompute();

		const points = figure.getTracePoints(trId);
		expect(points.length).toBe(2);
		expect(points[1].x).toBeCloseTo(3); // midpoint of (2,0) and (4,0)
	});

	it('trace survives recompute with no movement', () => {
		const script = ['A = point(1, 1)', 'T = trace(A)'].join('\n');
		const { figure, symbols } = run(script);
		const trId = getId(symbols, 'T');

		// Recompute without moving anything — should not add duplicate
		figure.recompute();
		figure.recompute();
		figure.recompute();

		expect(figure.getTracePoints(trId).length).toBe(1);
	});

	it('trace on intersection point', () => {
		// `e` is reserved (Euler) — use `e2` for the second line.
		const script = [
			'A = point(-5, 0)',
			'B = point(5, 0)',
			'd = droite(A, B)',
			'C = point(0, -5)',
			'D = point(0, 5)',
			'e2 = droite(C, D)',
			'P = intersection(d, e2)',
			'T = trace(P)'
		].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const trId = getId(symbols, 'T');

		// Initial: intersection at (0, 0)
		expect(figure.getTracePoints(trId)[0].x).toBeCloseTo(0);

		// Move A → intersection shifts
		figure.movePoint(aId, numeric(-5), numeric(2));
		figure.recompute();

		const points = figure.getTracePoints(trId);
		expect(points.length).toBe(2);
	});

	it('trace after clearTrace can accumulate again', () => {
		const script = ['A = point(0, 0)', 'T = trace(A)'].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const trId = getId(symbols, 'T');

		figure.movePoint(aId, numeric(1), numeric(1));
		figure.recompute();
		expect(figure.getTracePoints(trId).length).toBe(2);

		figure.clearTrace(trId);
		expect(figure.getTracePoints(trId).length).toBe(0);

		// Accumulate again after clear
		figure.movePoint(aId, numeric(2), numeric(2));
		figure.recompute();
		expect(figure.getTracePoints(trId).length).toBe(1);
		expect(figure.getTracePoints(trId)[0].x).toBeCloseTo(2);
	});

	it('multiple traces on same point are independent', () => {
		const script = ['A = point(0, 0)', 'T1 = trace(A)', 'T2 = trace(A)'].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const t1Id = getId(symbols, 'T1');
		const t2Id = getId(symbols, 'T2');

		figure.movePoint(aId, numeric(1), numeric(1));
		figure.recompute();

		expect(figure.getTracePoints(t1Id).length).toBe(2);
		expect(figure.getTracePoints(t2Id).length).toBe(2);

		// Clear one, other unaffected
		figure.clearTrace(t1Id);
		expect(figure.getTracePoints(t1Id).length).toBe(0);
		expect(figure.getTracePoints(t2Id).length).toBe(2);
	});

	it('trace on rotated point with deep dependency chain', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=3)',
			'A = point_sur(c, 0)',
			'B = rotation(A, centre=O, angle=60)',
			'C = symetrie(B, centre=point(2, 0))',
			'T = trace(C)'
		].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const trId = getId(symbols, 'T');

		figure.movePointOnCircle(aId, Math.PI / 3);
		figure.recompute();

		expect(figure.getTracePoints(trId).length).toBe(2);
	});

	it('getTracePoints returns empty array for non-trace element', () => {
		const script = ['A = point(0, 0)'].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');

		const points = figure.getTracePoints(aId);
		expect(points.length).toBe(0);
	});

	it('clearTrace throws for non-trace element', () => {
		const script = ['A = point(0, 0)'].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');

		expect(() => figure.clearTrace(aId)).toThrow();
	});

	it('traceToSVG returns null for non-trace element', () => {
		const script = ['A = point(0, 0)'].join('\n');
		const { figure, symbols } = run(script);
		const aId = getId(symbols, 'A');
		const transformer = makeTransformer();

		const svg = traceToSVG(aId, figure, transformer);
		expect(svg).toBeNull();
	});

	it('serialization round-trip preserves trace', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=3)',
			'A = point_sur(c, 0)',
			'T = trace(A)'
		].join('\n');
		const { figure } = run(script);

		const serialized = serializeDsl(figure);
		expect(serialized).toContain('trace(');

		// Round-trip: parse serialized output
		const { figure: fig2 } = run(serialized);
		const traceEls = fig2.getElementsByType('trace');
		expect(traceEls.length).toBe(1);
	});
});
