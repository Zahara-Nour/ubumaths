/**
 * Integration tests for conic property builtins:
 * asymptotes(), axes(), directrice(), foyers(), excentricite(), polaire()
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { geoToNumber } from '../../compute/to-number';
import { DslRuntimeError } from '../errors';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

// =============================================================================
// asymptotes()
// =============================================================================

describe('asymptotes()', () => {
	it('returns 2 lines for a hyperbola', () => {
		const { figure } = run(`c = courbe("x^2 - y^2 - 1 = 0")
A = asymptotes(c)`);
		// A is a tuple of 2 lines
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines.length).toBeGreaterThanOrEqual(2);
	});

	it('asymptotes of x^2 - y^2 = 1 pass through origin with slopes ±1', () => {
		const { figure, symbols } = run(`c = courbe("x^2 - y^2 - 1 = 0")
(a1, a2) = asymptotes(c)`);

		const a1Entry = symbols.get('a1');
		const a2Entry = symbols.get('a2');
		expect(a1Entry).toBeDefined();
		expect(a2Entry).toBeDefined();

		const a1El = figure.getElementById(a1Entry!.figureId!) as {
			type: 'line';
			point1Id: string;
			point2Id: string;
		};
		const a2El = figure.getElementById(a2Entry!.figureId!) as {
			type: 'line';
			point1Id: string;
			point2Id: string;
		};

		const a1p1 = figure.getPosition(a1El.point1Id)!;
		const a1p2 = figure.getPosition(a1El.point2Id)!;
		const a2p1 = figure.getPosition(a2El.point1Id)!;
		const a2p2 = figure.getPosition(a2El.point2Id)!;

		// Both pass through (0,0)
		expect(geoToNumber(a1p1.x)).toBeCloseTo(0, 5);
		expect(geoToNumber(a1p1.y)).toBeCloseTo(0, 5);

		// Slopes ±1 (a=1, b=1)
		const dx1 = geoToNumber(a1p2.x) - geoToNumber(a1p1.x);
		const dy1 = geoToNumber(a1p2.y) - geoToNumber(a1p1.y);
		const slope1 = dy1 / dx1;

		const dx2 = geoToNumber(a2p2.x) - geoToNumber(a2p1.x);
		const dy2 = geoToNumber(a2p2.y) - geoToNumber(a2p1.y);
		const slope2 = dy2 / dx2;

		expect(Math.abs(slope1)).toBeCloseTo(1, 5);
		expect(Math.abs(slope2)).toBeCloseTo(1, 5);
		expect(slope1 * slope2).toBeCloseTo(-1, 5);
	});

	it('throws for non-hyperbola (ellipse)', () => {
		expect(() =>
			run(`c = courbe("4*x^2 + 9*y^2 - 36 = 0")
A = asymptotes(c)`)
		).toThrow(DslRuntimeError);
	});

	it('throws for non-conic argument', () => {
		expect(() =>
			run(`f = courbe("y = x^2")
A = asymptotes(f)`)
		).toThrow(DslRuntimeError);
	});
});

// =============================================================================
// axes()
// =============================================================================

describe('axes()', () => {
	it('returns 2 axes for an ellipse', () => {
		const { symbols } = run(`c = courbe("4*x^2 + 9*y^2 - 36 = 0")
(a1, a2) = axes(c)`);
		expect(symbols.get('a1')).toBeDefined();
		expect(symbols.get('a2')).toBeDefined();
	});

	it('returns 1 axis for a parabola', () => {
		const { figure } = run(`c = courbe("y^2 - x = 0")
a = axes(c)`);
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines.length).toBeGreaterThanOrEqual(1);
	});

	it('ellipse axes are perpendicular', () => {
		const { figure, symbols } = run(`c = courbe("4*x^2 + 9*y^2 - 36 = 0")
(a1, a2) = axes(c)`);

		const a1El = figure.getElementById(symbols.get('a1')!.figureId!) as {
			type: 'line';
			point1Id: string;
			point2Id: string;
		};
		const a2El = figure.getElementById(symbols.get('a2')!.figureId!) as {
			type: 'line';
			point1Id: string;
			point2Id: string;
		};

		const a1p1 = figure.getPosition(a1El.point1Id)!;
		const a1p2 = figure.getPosition(a1El.point2Id)!;
		const a2p1 = figure.getPosition(a2El.point1Id)!;
		const a2p2 = figure.getPosition(a2El.point2Id)!;

		const dx1 = geoToNumber(a1p2.x) - geoToNumber(a1p1.x);
		const dy1 = geoToNumber(a1p2.y) - geoToNumber(a1p1.y);
		const dx2 = geoToNumber(a2p2.x) - geoToNumber(a2p1.x);
		const dy2 = geoToNumber(a2p2.y) - geoToNumber(a2p1.y);

		const dot = dx1 * dx2 + dy1 * dy2;
		expect(dot).toBeCloseTo(0, 8);
	});

	it('throws for circle', () => {
		expect(() =>
			run(`c = courbe("x^2 + y^2 - 9 = 0")
a = axes(c)`)
		).toThrow(DslRuntimeError);
	});
});

// =============================================================================
// directrice()
// =============================================================================

describe('directrice()', () => {
	it('returns a line for a parabola', () => {
		const { figure } = run(`c = courbe("y^2 - x = 0")
d = directrice(c)`);
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines.length).toBeGreaterThanOrEqual(1);
	});

	it('throws for non-parabola', () => {
		expect(() =>
			run(`c = courbe("4*x^2 + 9*y^2 - 36 = 0")
d = directrice(c)`)
		).toThrow(DslRuntimeError);
	});
});

// =============================================================================
// foyers()
// =============================================================================

describe('foyers()', () => {
	it('returns 2 foci for an ellipse', () => {
		const { symbols } = run(`c = courbe("4*x^2 + 9*y^2 - 36 = 0")
(F1, F2) = foyers(c)`);
		expect(symbols.get('F1')).toBeDefined();
		expect(symbols.get('F2')).toBeDefined();
	});

	it('ellipse 9x^2 + 25y^2 - 225 = 0 (a=5, b=3): foci at (±4, 0)', () => {
		// 9x^2 + 25y^2 = 225 => x^2/25 + y^2/9 = 1, a=5, b=3, c=4
		const { figure, symbols } = run(`c = courbe("9*x^2 + 25*y^2 - 225 = 0")
(F1, F2) = foyers(c)`);

		const f1Pos = figure.getPosition(symbols.get('F1')!.figureId!)!;
		const f2Pos = figure.getPosition(symbols.get('F2')!.figureId!)!;

		const f1x = geoToNumber(f1Pos.x);
		const f1y = geoToNumber(f1Pos.y);
		const f2x = geoToNumber(f2Pos.x);
		const f2y = geoToNumber(f2Pos.y);

		expect(f1y).toBeCloseTo(0, 5);
		expect(f2y).toBeCloseTo(0, 5);
		// One at 4, one at -4
		expect(Math.abs(f1x) + Math.abs(f2x)).toBeCloseTo(8, 1);
	});

	it('returns 1 focus for a parabola', () => {
		const { figure } = run(`c = courbe("y^2 - x = 0")
F = foyers(c)`);
		const points = figure.getAllElements().filter((e) => e.type === 'freePoint' && e.visible);
		expect(points.length).toBeGreaterThanOrEqual(1);
	});

	it('returns 1 focus for a circle (at center)', () => {
		const { figure } = run(`c = courbe("x^2 + y^2 - 25 = 0")
F = foyers(c)`);
		// F is a tuple with 1 element, access the freePoint elements
		const visiblePoints = figure
			.getAllElements()
			.filter((e) => e.type === 'freePoint' && e.visible && !e.draggable);
		expect(visiblePoints.length).toBeGreaterThanOrEqual(1);
		const pos = figure.getPosition(visiblePoints[0].id)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(0, 5);
		expect(geoToNumber(pos.y)).toBeCloseTo(0, 5);
	});
});

// =============================================================================
// excentricite()
// =============================================================================

describe('excentricite()', () => {
	it('circle: e = 0', () => {
		const { symbols } = run(`c = courbe("x^2 + y^2 - 9 = 0")
e = excentricite(c)`);
		expect(symbols.get('e')!.value).toBe(0);
	});

	it('ellipse: 0 < e < 1', () => {
		// 9x^2 + 25y^2 = 225 => a=5, b=3, e=4/5=0.8
		const { symbols } = run(`c = courbe("9*x^2 + 25*y^2 - 225 = 0")
e = excentricite(c)`);
		expect(symbols.get('e')!.value).toBeCloseTo(0.8, 1);
	});

	it('hyperbola: e > 1', () => {
		const { symbols } = run(`c = courbe("x^2 - y^2 - 1 = 0")
e = excentricite(c)`);
		const ecc = symbols.get('e')!.value!;
		expect(ecc).toBeGreaterThan(1);
	});
});

// =============================================================================
// polaire()
// =============================================================================

describe('polaire()', () => {
	it('creates a conicPolar element', () => {
		const { figure } = run(`c = courbe("x^2 + y^2 - 25 = 0")
P = point(10, 0)
p = polaire(P, c)`);
		const polars = figure.getAllElements().filter((e) => e.type === 'conicPolar');
		expect(polars).toHaveLength(1);
	});

	it('throws if first arg is not a point', () => {
		expect(() =>
			run(`c = courbe("x^2 + y^2 - 25 = 0")
d = courbe("x^2 - y^2 - 1 = 0")
p = polaire(d, c)`)
		).toThrow(DslRuntimeError);
	});

	it('throws if second arg is not a conic', () => {
		expect(() =>
			run(`P = point(1, 0)
f = courbe("y = x^2")
p = polaire(P, f)`)
		).toThrow(DslRuntimeError);
	});
});
