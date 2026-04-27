import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { runDsl, serializeDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';
import { numeric } from '../../types/geo-value';
import { DslRuntimeError } from '../errors';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

function getPos(
	figure: ReturnType<typeof run>['figure'],
	symbols: ReturnType<typeof run>['symbols'],
	name: string
) {
	const entry = symbols.get(name);
	if (!entry?.figureId) return null;
	return figure.getPosition(entry.figureId);
}

// ─── Intersection droite-conique (LQ) ──────────────────────────────────────

describe('intersection droite-conique (LQ)', () => {
	it('line through ellipse -> 2 points', () => {
		const { figure, symbols } = run(
			[
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'q = courbe("4*x^2 + 9*y^2 - 36 = 0")',
				'P = intersection(d, q, 1)',
				'Q = intersection(d, q, 2)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		const posQ = getPos(figure, symbols, 'Q');
		expect(posP).not.toBeNull();
		expect(posQ).not.toBeNull();
		// Horizontal line y=0 through ellipse x²/9+y²/4=1 -> x=±3
		const xs = [geoToNumber(posP!.x), geoToNumber(posQ!.x)].sort((a, b) => a - b);
		expect(xs[0]).toBeCloseTo(-3, 5);
		expect(xs[1]).toBeCloseTo(3, 5);
	});

	it('swap auto: intersection(conique, droite, 1) works', () => {
		const { figure, symbols } = run(
			[
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'q = courbe("4*x^2 + 9*y^2 - 36 = 0")',
				'P = intersection(q, d, 1)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
		expect(Math.abs(geoToNumber(posP!.x))).toBeCloseTo(3, 5);
	});

	it('tangent line -> index 1 works, index 2 null', () => {
		const { figure, symbols } = run(
			[
				'A = point(-5, 2)',
				'B = point(5, 2)',
				'd = droite(A, B)',
				'q = courbe("4*x^2 + 9*y^2 - 36 = 0")',
				'P = intersection(d, q, 1)',
				'Q = intersection(d, q, 2)'
			].join('\n')
		);

		expect(getPos(figure, symbols, 'P')).not.toBeNull();
		expect(getPos(figure, symbols, 'Q')).toBeNull();
	});

	it('default index (no 3rd arg) returns first intersection', () => {
		const { figure, symbols } = run(
			[
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'q = courbe("4*x^2 + 9*y^2 - 36 = 0")',
				'P = intersection(d, q)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
	});

	it('index 3 for LQ throws error', () => {
		expect(() =>
			run(
				[
					'A = point(-5, 0)',
					'B = point(5, 0)',
					'd = droite(A, B)',
					'q = courbe("4*x^2 + 9*y^2 - 36 = 0")',
					'P = intersection(d, q, 3)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('intersection with function courbe works (LF)', () => {
		// intersection(droite, function) is now supported
		const { figure, symbols } = run(
			[
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'f = courbe("y = x^2 - 1")',
				'P = intersection(d, f, 1)',
				'Q = intersection(d, f, 2)'
			].join('\n')
		);
		const pPos = getPos(figure, symbols, 'P');
		const qPos = getPos(figure, symbols, 'Q');
		expect(pPos).not.toBeNull();
		expect(qPos).not.toBeNull();
		// y=0 intersects y=x^2-1 at x=-1 and x=1
		expect(geoToNumber(pPos!.x)).toBeCloseTo(-1, 4);
		expect(geoToNumber(qPos!.x)).toBeCloseTo(1, 4);
	});

	it('reactivity: moving line points updates intersection', () => {
		const { figure, symbols } = run(
			[
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'q = courbe("4*x^2 + 9*y^2 - 36 = 0")',
				'P = intersection(d, q, 1)'
			].join('\n')
		);

		const pos1 = getPos(figure, symbols, 'P');
		expect(pos1).not.toBeNull();
		const y1 = geoToNumber(pos1!.y);

		// Move point A to change line to non-horizontal
		const aId = symbols.get('A')!.figureId!;
		figure.movePoint(aId, numeric(-5), numeric(1));
		figure.recompute();

		const pos2 = getPos(figure, symbols, 'P');
		expect(pos2).not.toBeNull();
		// Y should now be different
		expect(geoToNumber(pos2!.y)).not.toBeCloseTo(y1);
	});

	it('serialization roundtrip preserves LQ intersection', () => {
		const script = [
			'A = point(-5, 0)',
			'B = point(5, 0)',
			'd = droite(A, B)',
			'q = courbe("4*x^2 + 9*y^2 - 36 = 0")',
			'P = intersection(d, q, 1)',
			'Q = intersection(d, q, 2)'
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serializeDsl(fig1, sym1);
		const { figure: fig2, symbols: sym2 } = runDsl(serialized);

		expect(fig2.getAllElements().length).toBe(fig1.getAllElements().length);

		const posP1 = fig1.getPosition(sym1.get('P')!.figureId!);
		const posP2 = fig2.getPosition(sym2.get('P')!.figureId!);
		expect(posP1).not.toBeNull();
		expect(posP2).not.toBeNull();
		expect(geoToNumber(posP2!.x)).toBeCloseTo(geoToNumber(posP1!.x), 5);
	});

	it('line through hyperbola via DSL', () => {
		const { figure, symbols } = run(
			[
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'q = courbe("x^2 - y^2 - 4 = 0")',
				'P = intersection(d, q, 1)',
				'Q = intersection(d, q, 2)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		const posQ = getPos(figure, symbols, 'Q');
		expect(posP).not.toBeNull();
		expect(posQ).not.toBeNull();
		// x² = 4 → x = ±2
		const xs = [geoToNumber(posP!.x), geoToNumber(posQ!.x)].sort((a, b) => a - b);
		expect(xs[0]).toBeCloseTo(-2, 5);
		expect(xs[1]).toBeCloseTo(2, 5);
	});

	it('line exterior to ellipse -> both indices null', () => {
		const { figure, symbols } = run(
			[
				'A = point(-5, 10)',
				'B = point(5, 10)',
				'd = droite(A, B)',
				'q = courbe("4*x^2 + 9*y^2 - 36 = 0")',
				'P = intersection(d, q, 1)',
				'Q = intersection(d, q, 2)'
			].join('\n')
		);

		expect(getPos(figure, symbols, 'P')).toBeNull();
		expect(getPos(figure, symbols, 'Q')).toBeNull();
	});

	it('segment-conic intersection works', () => {
		const { figure, symbols } = run(
			[
				'A = point(-5, 0)',
				'B = point(5, 0)',
				's = segment(A, B)',
				'q = courbe("4*x^2 + 9*y^2 - 36 = 0")',
				'P = intersection(s, q, 1)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
	});

	it('rotated conic (B != 0) via DSL', () => {
		const { figure, symbols } = run(
			[
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'q = courbe("x^2 + x*y + y^2 - 1 = 0")',
				'P = intersection(d, q, 1)',
				'Q = intersection(d, q, 2)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		const posQ = getPos(figure, symbols, 'Q');
		expect(posP).not.toBeNull();
		expect(posQ).not.toBeNull();
		// y=0 → x² = 1 → x = ±1
		const xs = [geoToNumber(posP!.x), geoToNumber(posQ!.x)].sort((a, b) => a - b);
		expect(xs[0]).toBeCloseTo(-1, 5);
		expect(xs[1]).toBeCloseTo(1, 5);
	});
});

// ─── Intersection conique-conique (QQ) ─────────────────────────────────────

describe('intersection conique-conique (QQ)', () => {
	it('two conics -> up to 4 intersection points', () => {
		const { figure, symbols } = run(
			[
				'q1 = courbe("x^2 + 4*y^2 - 4 = 0")',
				'q2 = courbe("4*x^2 + y^2 - 4 = 0")',
				'P1 = intersection(q1, q2, 1)',
				'P2 = intersection(q1, q2, 2)',
				'P3 = intersection(q1, q2, 3)',
				'P4 = intersection(q1, q2, 4)'
			].join('\n')
		);

		const positions = [1, 2, 3, 4].map((i) => getPos(figure, symbols, `P${i}`));
		const validPositions = positions.filter((p) => p !== null);
		expect(validPositions.length).toBe(4);
	});

	it('circle + conique via QQ', () => {
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'c = cercle(O, rayon=2)',
				'q = courbe("4*x^2 + 9*y^2 - 36 = 0")',
				'P = intersection(c, q, 1)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
	});

	it('conique + circle (swapped) also works', () => {
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'c = cercle(O, rayon=2)',
				'q = courbe("4*x^2 + 9*y^2 - 36 = 0")',
				'P = intersection(q, c, 1)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
	});

	it('default index (no 3rd arg) returns first point', () => {
		const { figure, symbols } = run(
			[
				'q1 = courbe("x^2 + 4*y^2 - 4 = 0")',
				'q2 = courbe("4*x^2 + y^2 - 4 = 0")',
				'P = intersection(q1, q2)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
	});

	it('index 5 for QQ throws error', () => {
		expect(() =>
			run(
				[
					'q1 = courbe("x^2 + 4*y^2 - 4 = 0")',
					'q2 = courbe("4*x^2 + y^2 - 4 = 0")',
					'P = intersection(q1, q2, 5)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('two rotated ellipses (B != 0)', () => {
		const { figure, symbols } = run(
			[
				'q1 = courbe("x^2 + x*y + y^2 - 1 = 0")',
				'q2 = courbe("x^2 + y^2 - 1 = 0")',
				'P1 = intersection(q1, q2, 1)',
				'P2 = intersection(q1, q2, 2)',
				'P3 = intersection(q1, q2, 3)',
				'P4 = intersection(q1, q2, 4)'
			].join('\n')
		);

		const positions = [1, 2, 3, 4].map((i) => getPos(figure, symbols, `P${i}`));
		const validPositions = positions.filter((p) => p !== null);
		// x*y = 0 gives 4 points: (±1,0) and (0,±1)
		expect(validPositions.length).toBe(4);
	});

	it('hyperbola and circle', () => {
		const { figure, symbols } = run(
			[
				'q = courbe("x^2 - y^2 - 1 = 0")',
				'O = point(0, 0)',
				'c = cercle(O, rayon=2)',
				'P1 = intersection(q, c, 1)',
				'P2 = intersection(q, c, 2)'
			].join('\n')
		);

		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');
		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();
	});

	it('disjoint conics -> all indices null position', () => {
		const { figure, symbols } = run(
			[
				'q1 = courbe("x^2 + y^2 - 1 = 0")',
				'q2 = courbe("x^2 + y^2 - 20*x + 99 = 0")',
				'P1 = intersection(q1, q2, 1)'
			].join('\n')
		);

		expect(getPos(figure, symbols, 'P1')).toBeNull();
	});

	it('serialization roundtrip preserves QQ intersection', () => {
		const script = [
			'q1 = courbe("x^2 + 4*y^2 - 4 = 0")',
			'q2 = courbe("4*x^2 + y^2 - 4 = 0")',
			'P1 = intersection(q1, q2, 1)',
			'P2 = intersection(q1, q2, 2)'
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serializeDsl(fig1, sym1);
		const { figure: fig2, symbols: sym2 } = runDsl(serialized);

		expect(fig2.getAllElements().length).toBe(fig1.getAllElements().length);

		const posP1 = fig1.getPosition(sym1.get('P1')!.figureId!);
		const posP2 = fig2.getPosition(sym2.get('P1')!.figureId!);
		expect(posP1).not.toBeNull();
		expect(posP2).not.toBeNull();
		expect(geoToNumber(posP2!.x)).toBeCloseTo(geoToNumber(posP1!.x), 5);
	});
});
