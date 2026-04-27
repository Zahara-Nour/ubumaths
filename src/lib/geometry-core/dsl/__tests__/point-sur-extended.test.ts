/**
 * Tests for point_sur() extended to segments, lines, rays, circles, and arcs.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { runDsl, serializeDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';
import { numeric } from '../../types/geo-value';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

function getPos(
	figure: ReturnType<typeof run>['figure'],
	pointName: string,
	symbols: Map<string, { figureId?: string }>
) {
	const sym = symbols.get(pointName);
	if (!sym?.figureId) throw new Error(`Symbol "${pointName}" not found`);
	return figure.getPosition(sym.figureId);
}

function assertRoundTrip(script: string, pointName: string) {
	const { figure: fig1, symbols: sym1 } = runDsl(script);
	const serialized = serializeDsl(fig1, sym1);
	const { figure: fig2, symbols: sym2 } = runDsl(serialized);

	expect(fig2.getAllElements().length).toBe(fig1.getAllElements().length);

	const pos1 = fig1.getPosition(sym1.get(pointName)!.figureId!);
	const pos2 = fig2.getPosition(sym2.get(pointName)!.figureId!);
	expect(pos1).toBeDefined();
	expect(pos2).toBeDefined();
	expect(geoToNumber(pos2!.x)).toBeCloseTo(geoToNumber(pos1!.x), 3);
	expect(geoToNumber(pos2!.y)).toBeCloseTo(geoToNumber(pos1!.y), 3);
}

// =============================================================================
// point_sur(segment)
// =============================================================================

describe('point_sur(segment)', () => {
	it('default t=0.5 → midpoint', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 6)\ns = segment(A, B)\nP = point_sur(s)'
		);
		const pos = getPos(figure, 'P', symbols);
		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(2);
		expect(geoToNumber(pos!.y)).toBeCloseTo(3);
	});

	it('t=0 → start point', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 6)\ns = segment(A, B)\nP = point_sur(s, 0)'
		);
		const pos = getPos(figure, 'P', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('t=1 → end point', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 6)\ns = segment(A, B)\nP = point_sur(s, 1)'
		);
		const pos = getPos(figure, 'P', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(4);
		expect(geoToNumber(pos!.y)).toBeCloseTo(6);
	});

	it('t=0.25 → quarter point', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(8, 0)\ns = segment(A, B)\nP = point_sur(s, 0.25)'
		);
		const pos = getPos(figure, 'P', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(2);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('is draggable by default', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\ns = segment(A, B)\nP = point_sur(s)'
		);
		const el = figure.getElementById(symbols.get('P')!.figureId!);
		expect(el).toBeDefined();
		expect(el!.type).toBe('pointOnSegment');
		expect('draggable' in el! && el!.draggable).toBe(true);
	});

	it('movePointOnSegment clamps to [0,1]', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\ns = segment(A, B)\nP = point_sur(s, 0.5)'
		);
		const ptId = symbols.get('P')!.figureId!;
		figure.movePointOnSegment(ptId, 1.5);
		figure.recompute();
		const pos = figure.getPosition(ptId);
		expect(geoToNumber(pos!.x)).toBeCloseTo(4); // clamped to t=1
	});

	it('reactive: moving endpoints updates P', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\ns = segment(A, B)\nP = point_sur(s, 0.5)'
		);
		const ptId = symbols.get('P')!.figureId!;
		figure.movePoint(symbols.get('B')!.figureId!, numeric(8), numeric(0));
		figure.recompute();
		const pos = figure.getPosition(ptId);
		expect(geoToNumber(pos!.x)).toBeCloseTo(4); // midpoint of (0,0)-(8,0)
	});

	it('round-trip serialization', () => {
		assertRoundTrip(
			'A = point(0, 0)\nB = point(4, 6)\ns = segment(A, B)\nP = point_sur(s, 0.25)',
			'P'
		);
	});
});

describe('point_sur(segment) — edge cases', () => {
	it('t clamped below 0 at creation', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\ns = segment(A, B)\nP = point_sur(s, -0.5)'
		);
		const pos = getPos(figure, 'P', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0); // clamped to t=0
	});

	it('t clamped above 1 at creation', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\ns = segment(A, B)\nP = point_sur(s, 2)'
		);
		const pos = getPos(figure, 'P', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(4); // clamped to t=1
	});

	it('movePointOnSegment clamps below 0', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\ns = segment(A, B)\nP = point_sur(s, 0.5)'
		);
		const ptId = symbols.get('P')!.figureId!;
		figure.movePointOnSegment(ptId, -10);
		figure.recompute();
		const pos = figure.getPosition(ptId);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0); // clamped to t=0
	});

	it('oblique segment', () => {
		const { figure, symbols } = run(
			'A = point(1, 2)\nB = point(5, 8)\ns = segment(A, B)\nP = point_sur(s, 0.5)'
		);
		const pos = getPos(figure, 'P', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(3); // (1+5)/2
		expect(geoToNumber(pos!.y)).toBeCloseTo(5); // (2+8)/2
	});

	it('multiple points on same segment', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(10, 0)\ns = segment(A, B)\nP1 = point_sur(s, 0.2)\nP2 = point_sur(s, 0.8)'
		);
		const pos1 = getPos(figure, 'P1', symbols);
		const pos2 = getPos(figure, 'P2', symbols);
		expect(geoToNumber(pos1!.x)).toBeCloseTo(2);
		expect(geoToNumber(pos2!.x)).toBeCloseTo(8);
	});
});

// =============================================================================
// point_sur(droite)
// =============================================================================

describe('point_sur(droite)', () => {
	it('default t=0 → on point1', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\nd = droite(A, B)\nQ = point_sur(d)'
		);
		const pos = getPos(figure, 'Q', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('t=1 → on point2', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\nd = droite(A, B)\nQ = point_sur(d, 1)'
		);
		const pos = getPos(figure, 'Q', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(4);
	});

	it('t=-1 → on the other side', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\nd = droite(A, B)\nQ = point_sur(d, -1)'
		);
		const pos = getPos(figure, 'Q', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(-4);
	});

	it('t=0.5 → midpoint of A-B', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\nd = droite(A, B)\nQ = point_sur(d, 0.5)'
		);
		const pos = getPos(figure, 'Q', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(2);
	});

	it('movePointOnLine has no clamping for line', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\nd = droite(A, B)\nQ = point_sur(d, 0)'
		);
		const ptId = symbols.get('Q')!.figureId!;
		figure.movePointOnLine(ptId, -100);
		figure.recompute();
		const pos = figure.getPosition(ptId);
		expect(geoToNumber(pos!.x)).toBeCloseTo(-400);
	});

	it('reactive: moving defining points updates Q', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\nd = droite(A, B)\nQ = point_sur(d, 0.5)'
		);
		const ptId = symbols.get('Q')!.figureId!;
		figure.movePoint(symbols.get('B')!.figureId!, numeric(8), numeric(0));
		figure.recompute();
		const pos = figure.getPosition(ptId);
		expect(geoToNumber(pos!.x)).toBeCloseTo(4); // 0 + 0.5*(8-0)
	});

	it('round-trip serialization', () => {
		assertRoundTrip(
			'A = point(0, 0)\nB = point(4, 6)\nd = droite(A, B)\nQ = point_sur(d, 0.75)',
			'Q'
		);
	});
});

describe('point_sur(droite) — edge cases', () => {
	it('large negative t', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(1, 0)\nd = droite(A, B)\nQ = point_sur(d, -50)'
		);
		const pos = getPos(figure, 'Q', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(-50);
	});

	it('large positive t', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(1, 0)\nd = droite(A, B)\nQ = point_sur(d, 100)'
		);
		const pos = getPos(figure, 'Q', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(100);
	});

	it('oblique line preserves direction', () => {
		const { figure, symbols } = run(
			'A = point(1, 1)\nB = point(3, 5)\nd = droite(A, B)\nQ = point_sur(d, 0.5)'
		);
		const pos = getPos(figure, 'Q', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(2);
		expect(geoToNumber(pos!.y)).toBeCloseTo(3);
	});
});

// =============================================================================
// point_sur(demidroite)
// =============================================================================

describe('point_sur(demidroite)', () => {
	it('default t=0 → on origin', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\nr = demidroite(A, B)\nR = point_sur(r)'
		);
		const pos = getPos(figure, 'R', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
	});

	it('t=1 → on through point', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\nr = demidroite(A, B)\nR = point_sur(r, 1)'
		);
		const pos = getPos(figure, 'R', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(4);
	});

	it('t=2 → beyond through point', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\nr = demidroite(A, B)\nR = point_sur(r, 2)'
		);
		const pos = getPos(figure, 'R', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(8);
	});

	it('movePointOnLine clamps t >= 0 for ray', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\nr = demidroite(A, B)\nR = point_sur(r, 1)'
		);
		const ptId = symbols.get('R')!.figureId!;
		figure.movePointOnLine(ptId, -5);
		figure.recompute();
		const pos = figure.getPosition(ptId);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0); // clamped to t=0 → origin
	});

	it('round-trip serialization', () => {
		assertRoundTrip(
			'A = point(0, 0)\nB = point(3, 4)\nr = demidroite(A, B)\nR = point_sur(r, 1.5)',
			'R'
		);
	});
});

describe('point_sur(demidroite) — edge cases', () => {
	it('negative t clamped to 0 at creation', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\nr = demidroite(A, B)\nR = point_sur(r, -3)'
		);
		const pos = getPos(figure, 'R', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0); // clamped to origin
	});

	it('oblique ray', () => {
		const { figure, symbols } = run(
			'A = point(1, 1)\nB = point(3, 5)\nr = demidroite(A, B)\nR = point_sur(r, 0.5)'
		);
		const pos = getPos(figure, 'R', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(2);
		expect(geoToNumber(pos!.y)).toBeCloseTo(3);
	});
});

// =============================================================================
// point_sur(cercle)
// =============================================================================

describe('point_sur(cercle)', () => {
	it('default angle=0 → right side (3h)', () => {
		const { figure, symbols } = run('O = point(0, 0)\nc = cercle(O, rayon=3)\nS = point_sur(c)');
		const pos = getPos(figure, 'S', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('angle=90 → top (12h)', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\nc = cercle(O, rayon=3)\nS = point_sur(c, 90)'
		);
		const pos = getPos(figure, 'S', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(3);
	});

	it('angle=360 → same as 0', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\nc = cercle(O, rayon=3)\nS = point_sur(c, 360)'
		);
		const pos = getPos(figure, 'S', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('movePointOnCircle normalizes mod 2π', () => {
		const { figure, symbols } = run('O = point(0, 0)\nc = cercle(O, rayon=3)\nS = point_sur(c, 0)');
		const ptId = symbols.get('S')!.figureId!;
		figure.movePointOnCircle(ptId, 3 * Math.PI);
		figure.recompute();
		const pos = figure.getPosition(ptId);
		expect(geoToNumber(pos!.x)).toBeCloseTo(-3); // cos(π)*3
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('works with circleByPoint', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\nA = point(3, 0)\nc = cercle(O, passant=A)\nS = point_sur(c, 90)'
		);
		const pos = getPos(figure, 'S', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(3);
	});

	it('reactive: moving center updates S', () => {
		const { figure, symbols } = run('O = point(0, 0)\nc = cercle(O, rayon=3)\nS = point_sur(c, 0)');
		const ptId = symbols.get('S')!.figureId!;
		figure.movePoint(symbols.get('O')!.figureId!, numeric(2), numeric(0));
		figure.recompute();
		const pos = figure.getPosition(ptId);
		expect(geoToNumber(pos!.x)).toBeCloseTo(5); // center(2,0) + r*cos(0) = 2+3
	});

	it('round-trip serialization', () => {
		assertRoundTrip('O = point(0, 0)\nc = cercle(O, rayon=3)\nS = point_sur(c, 45)', 'S');
	});
});

describe('point_sur(cercle) — edge cases', () => {
	it('negative angle', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\nc = cercle(O, rayon=3)\nS = point_sur(c, -90)'
		);
		const pos = getPos(figure, 'S', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(-3); // -90° = bottom
	});

	it('angle=180 → left side (9h)', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\nc = cercle(O, rayon=2)\nS = point_sur(c, 180)'
		);
		const pos = getPos(figure, 'S', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(-2);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('angle=720 → same as 0 (multiple revolutions)', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\nc = cercle(O, rayon=3)\nS = point_sur(c, 720)'
		);
		const pos = getPos(figure, 'S', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('off-center circle', () => {
		const { figure, symbols } = run('O = point(2, 3)\nc = cercle(O, rayon=1)\nS = point_sur(c, 0)');
		const pos = getPos(figure, 'S', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(3); // 2 + 1*cos(0)
		expect(geoToNumber(pos!.y)).toBeCloseTo(3); // 3 + 1*sin(0)
	});

	it('reactive: moving edge point of circleByPoint updates S', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\nA = point(3, 0)\nc = cercle(O, passant=A)\nS = point_sur(c, 90)'
		);
		const ptId = symbols.get('S')!.figureId!;
		// Move edge point from (3,0) to (5,0) → radius becomes 5
		figure.movePoint(symbols.get('A')!.figureId!, numeric(5), numeric(0));
		figure.recompute();
		const pos = figure.getPosition(ptId);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(5); // new radius = 5
	});

	it('movePointOnCircle with negative angle normalizes', () => {
		const { figure, symbols } = run('O = point(0, 0)\nc = cercle(O, rayon=3)\nS = point_sur(c, 0)');
		const ptId = symbols.get('S')!.figureId!;
		figure.movePointOnCircle(ptId, -Math.PI / 2);
		figure.recompute();
		const pos = figure.getPosition(ptId);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(-3); // -π/2 normalized to 3π/2
	});
});

// =============================================================================
// point_sur(arc)
// =============================================================================

describe('point_sur(arc)', () => {
	it('default t=0.5 → midpoint of arc (arcByAngles)', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\na = arc(O, rayon=3, debut=0, fin=90)\nT = point_sur(a)'
		);
		const pos = getPos(figure, 'T', symbols);
		// Arc from 0° to 90°, midpoint at 45°
		expect(geoToNumber(pos!.x)).toBeCloseTo(3 * Math.cos(Math.PI / 4));
		expect(geoToNumber(pos!.y)).toBeCloseTo(3 * Math.sin(Math.PI / 4));
	});

	it('t=0 → start of arc', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\na = arc(O, rayon=3, debut=0, fin=90)\nT = point_sur(a, 0)'
		);
		const pos = getPos(figure, 'T', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('t=1 → end of arc', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\na = arc(O, rayon=3, debut=0, fin=90)\nT = point_sur(a, 1)'
		);
		const pos = getPos(figure, 'T', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(3);
	});

	it('movePointOnArc clamps t to [0,1]', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\na = arc(O, rayon=3, debut=0, fin=90)\nT = point_sur(a, 0.5)'
		);
		const ptId = symbols.get('T')!.figureId!;
		figure.movePointOnArc(ptId, 1.5);
		figure.recompute();
		const pos = figure.getPosition(ptId);
		// Clamped to t=1 → end of arc at (0, 3)
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(3);
	});

	it('works with arcByPoints', () => {
		const { figure, symbols } = run(
			'A = point(3, 0)\nO = point(0, 0)\nB = point(0, 3)\na = arc(A, O, B)\nT = point_sur(a, 0.5)'
		);
		const pos = getPos(figure, 'T', symbols);
		// Arc from A(3,0) to B(0,3) around O(0,0), midpoint at 45°
		expect(geoToNumber(pos!.x)).toBeCloseTo(3 * Math.cos(Math.PI / 4));
		expect(geoToNumber(pos!.y)).toBeCloseTo(3 * Math.sin(Math.PI / 4));
	});

	it('round-trip serialization (arcByAngles)', () => {
		assertRoundTrip(
			'O = point(0, 0)\na = arc(O, rayon=3, debut=0, fin=90)\nT = point_sur(a, 0.25)',
			'T'
		);
	});

	it('round-trip serialization (arcByPoints)', () => {
		assertRoundTrip(
			'A = point(3, 0)\nO = point(0, 0)\nB = point(0, 3)\na = arc(A, O, B)\nT = point_sur(a, 0.75)',
			'T'
		);
	});
});

describe('point_sur(arc) — edge cases', () => {
	it('movePointOnArc clamps below 0', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\na = arc(O, rayon=3, debut=0, fin=90)\nT = point_sur(a, 0.5)'
		);
		const ptId = symbols.get('T')!.figureId!;
		figure.movePointOnArc(ptId, -0.5);
		figure.recompute();
		const pos = figure.getPosition(ptId);
		// Clamped to t=0 → start of arc at (3, 0)
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('arc spanning 270° (large sweep)', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\na = arc(O, rayon=2, debut=0, fin=270)\nT = point_sur(a, 0.5)'
		);
		const pos = getPos(figure, 'T', symbols);
		// Midpoint of 0°→270° arc is at 135°
		const angle = (135 * Math.PI) / 180;
		expect(geoToNumber(pos!.x)).toBeCloseTo(2 * Math.cos(angle));
		expect(geoToNumber(pos!.y)).toBeCloseTo(2 * Math.sin(angle));
	});

	it('full circle arc (debut=0, fin=360) t=0.25 → top', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\na = arc(O, rayon=3, debut=0, fin=360)\nT = point_sur(a, 0.25)'
		);
		const pos = getPos(figure, 'T', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(3);
	});

	it('wrap-around arc: debut=270, fin=90 (crosses 0°)', () => {
		const { figure, symbols } = run(
			'O = point(0, 0)\na = arc(O, rayon=3, debut=270, fin=90)\nT = point_sur(a, 0.5)'
		);
		const pos = getPos(figure, 'T', symbols);
		// 270° → 90° CCW crosses 0°. Midpoint is at 0° (east)
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('arcByPoints with non-unit radius', () => {
		const { figure, symbols } = run(
			'A = point(5, 0)\nO = point(0, 0)\nB = point(0, 5)\na = arc(A, O, B)\nT = point_sur(a, 0)'
		);
		const pos = getPos(figure, 'T', symbols);
		expect(geoToNumber(pos!.x)).toBeCloseTo(5);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});
});

// =============================================================================
// Error handling
// =============================================================================

describe('point_sur — error handling', () => {
	it('throws on non-existent object', () => {
		expect(() => run('A = point(0, 0)\nP = point_sur(A)')).toThrow();
	});

	it('throws with too many arguments', () => {
		expect(() =>
			run('A = point(0, 0)\nB = point(1, 0)\ns = segment(A, B)\nP = point_sur(s, 0.5, 0.5)')
		).toThrow();
	});
});
