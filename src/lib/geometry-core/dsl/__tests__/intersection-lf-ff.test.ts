/**
 * Tests for intersection of lines with functions (LF) and functions with functions (FF)
 * via the DSL builtin intersection().
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { serializeDsl } from '../index';
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

// =============================================================================
// Intersection droite-fonction (LF)
// =============================================================================

describe('intersection droite-fonction (LF)', () => {
	it('droite y=0 intersects y=x^2-1 at 2 points', () => {
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
		expect(geoToNumber(pPos!.x)).toBeCloseTo(-1, 4);
		expect(geoToNumber(pPos!.y)).toBeCloseTo(0, 4);
		expect(geoToNumber(qPos!.x)).toBeCloseTo(1, 4);
		expect(geoToNumber(qPos!.y)).toBeCloseTo(0, 4);
	});

	it('swap auto: intersection(courbe, droite, n) works', () => {
		const { figure, symbols } = run(
			[
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'f = courbe("y = x^2 - 1")',
				'P = intersection(f, d, 1)'
			].join('\n')
		);
		const pPos = getPos(figure, symbols, 'P');
		expect(pPos).not.toBeNull();
		expect(geoToNumber(pPos!.x)).toBeCloseTo(-1, 4);
	});

	it('index beyond number of intersection points -> position null', () => {
		const { figure, symbols } = run(
			[
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'f = courbe("y = x^2 - 1")',
				'P = intersection(d, f, 5)'
			].join('\n')
		);
		const pPos = getPos(figure, symbols, 'P');
		expect(pPos).toBeNull();
	});

	it('reactivity: moving line updates LF intersections', () => {
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

		// Initial: y=0 intersects y=x^2-1 at x=-1 and x=1
		const p1 = getPos(figure, symbols, 'P');
		expect(p1).not.toBeNull();
		expect(geoToNumber(p1!.x)).toBeCloseTo(-1, 4);

		// Move line up to y=3: now y=3 intersects y=x^2-1 at x=-2 and x=2
		const aId = symbols.get('A')!.figureId!;
		const bId = symbols.get('B')!.figureId!;
		figure.movePoint(aId, numeric(-5), numeric(3));
		figure.movePoint(bId, numeric(5), numeric(3));
		figure.recompute();

		const p2 = getPos(figure, symbols, 'P');
		const q2 = getPos(figure, symbols, 'Q');
		expect(p2).not.toBeNull();
		expect(q2).not.toBeNull();
		expect(geoToNumber(p2!.x)).toBeCloseTo(-2, 4);
		expect(geoToNumber(q2!.x)).toBeCloseTo(2, 4);
	});

	it('serialization roundtrip preserves LF intersection', () => {
		const script = [
			'A = point(-5, 0)',
			'B = point(5, 0)',
			'd = droite(A, B)',
			'f = courbe("y = x^2 - 1")',
			'P = intersection(d, f, 1)'
		].join('\n');

		const { figure } = run(script);
		const serialized = serializeDsl(figure);
		// Re-run the serialized output
		const { figure: fig2, symbols: sym2 } = run(serialized);
		const pPos = getPos(fig2, sym2, 'P');
		expect(pPos).not.toBeNull();
		expect(geoToNumber(pPos!.x)).toBeCloseTo(-1, 4);
	});
});

// =============================================================================
// Intersection fonction-fonction (FF)
// =============================================================================

describe('intersection fonction-fonction (FF)', () => {
	it('y=x^2 intersects y=sin(x) at multiple points', () => {
		const { figure, symbols } = run(
			['f = courbe("y = x^2")', 'g = courbe("y = sin(x) + 1")', 'P = intersection(f, g, 1)'].join(
				'\n'
			)
		);
		const pPos = getPos(figure, symbols, 'P');
		// At least one intersection exists
		expect(pPos).not.toBeNull();
	});

	it('y=x^2 intersects y=x^3 at 2 points (0,0) and (1,1)', () => {
		const { figure, symbols } = run(
			[
				'f = courbe("y = x^2")',
				'g = courbe("y = x^3")',
				'P = intersection(f, g, 1)',
				'Q = intersection(f, g, 2)'
			].join('\n')
		);
		const pPos = getPos(figure, symbols, 'P');
		const qPos = getPos(figure, symbols, 'Q');
		expect(pPos).not.toBeNull();
		expect(qPos).not.toBeNull();
		expect(geoToNumber(pPos!.x)).toBeCloseTo(0, 4);
		expect(geoToNumber(qPos!.x)).toBeCloseTo(1, 4);
	});

	it('no intersection returns null position', () => {
		const { figure, symbols } = run(
			['f = courbe("y = x^2")', 'g = courbe("y = x^2 + 1")', 'P = intersection(f, g, 1)'].join('\n')
		);
		const pPos = getPos(figure, symbols, 'P');
		expect(pPos).toBeNull();
	});

	it('serialization roundtrip preserves FF intersection', () => {
		const script = [
			'f = courbe("y = x^2")',
			'g = courbe("y = x^3")',
			'P = intersection(f, g, 1)'
		].join('\n');

		const { figure } = run(script);
		const serialized = serializeDsl(figure);
		const { figure: fig2, symbols: sym2 } = run(serialized);
		const pPos = getPos(fig2, sym2, 'P');
		expect(pPos).not.toBeNull();
		expect(geoToNumber(pPos!.x)).toBeCloseTo(0, 4);
	});
});

// =============================================================================
// Error cases
// =============================================================================

describe('intersection error cases', () => {
	it('intersection(courbe_implicite, droite) throws error', () => {
		expect(() =>
			run(
				[
					'A = point(-5, 0)',
					'B = point(5, 0)',
					'd = droite(A, B)',
					'c = courbe("x^3 + y^3 - 1 = 0")',
					'P = intersection(d, c, 1)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('intersection index must be >= 1', () => {
		expect(() =>
			run(
				[
					'A = point(-5, 0)',
					'B = point(5, 0)',
					'd = droite(A, B)',
					'f = courbe("y = x^2")',
					'P = intersection(d, f, 0)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});
});
