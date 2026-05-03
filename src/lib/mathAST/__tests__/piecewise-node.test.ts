/**
 * Tests for the PiecewiseNode (functions defined by cases) — type, factory,
 * guard, transforms, and compilation.
 */

import { describe, it, expect } from 'vitest';
import {
	piecewise,
	piecewisePiece,
	relation,
	logical,
	number,
	variable,
	opposite,
	multiply,
	add
} from '../factory';
import { isPiecewise } from '../guards';
import { mapNode, getChildren, cloneNode } from '../transforms';
import { compile } from '../eval/compile';

describe('PiecewiseNode — factory + guard', () => {
	it('builds a node with pieces and no otherwise', () => {
		const node = piecewise([
			piecewisePiece(relation('<', variable('x'), number('0')), opposite(variable('x'))),
			piecewisePiece(relation('>=', variable('x'), number('0')), variable('x'))
		]);
		expect(node.type).toBe('piecewise');
		expect(node.pieces).toHaveLength(2);
		expect(node.otherwise).toBeUndefined();
	});

	it('builds a node with otherwise fallback', () => {
		const node = piecewise(
			[piecewisePiece(relation('<', variable('x'), number('0')), opposite(variable('x')))],
			variable('x') // otherwise: x
		);
		expect(node.otherwise).toBeDefined();
	});

	it('isPiecewise type guard works', () => {
		const node = piecewise([
			piecewisePiece(relation('<', variable('x'), number('0')), number('0'))
		]);
		expect(isPiecewise(node)).toBe(true);
		expect(isPiecewise(variable('x'))).toBe(false);
	});
});

describe('PiecewiseNode — transforms', () => {
	const absX = piecewise(
		[piecewisePiece(relation('<', variable('x'), number('0')), opposite(variable('x')))],
		variable('x')
	);

	it('getChildren returns conditions, values, and otherwise', () => {
		const children = getChildren(absX);
		// 1 piece × 2 (cond + val) + 1 otherwise = 3
		expect(children).toHaveLength(3);
	});

	it('mapNode applies transformation to all branches', () => {
		const transformed = mapNode(absX, (n) => {
			if (n.type === 'number' && n.value === '0') return number('1');
			return n;
		});
		// The condition `x < 0` becomes `x < 1`
		const piecewise_t = transformed as typeof absX;
		expect(piecewise_t.pieces[0].condition.type).toBe('relation');
	});

	it('cloneNode produces a structurally equal but distinct piecewise', () => {
		const cloned = cloneNode(absX);
		expect(cloned).not.toBe(absX);
		expect(cloned.type).toBe('piecewise');
		expect(isPiecewise(cloned) && cloned.pieces).toHaveLength(1);
	});
});

describe('PiecewiseNode — compilation (first match wins)', () => {
	const absX = piecewise(
		[piecewisePiece(relation('<', variable('x'), number('0')), opposite(variable('x')))],
		variable('x')
	);

	it('compiles |x| correctly', () => {
		const f = compile(absX);
		expect(f({ x: -3 })).toBe(3);
		expect(f({ x: 0 })).toBe(0);
		expect(f({ x: 5 })).toBe(5);
	});

	it('compiles a 3-branch sign function', () => {
		const sgn = piecewise(
			[
				piecewisePiece(relation('<', variable('x'), number('0')), opposite(number('1'))),
				piecewisePiece(relation('=', variable('x'), number('0')), number('0'))
			],
			number('1') // otherwise: x > 0
		);
		const f = compile(sgn);
		expect(f({ x: -2 })).toBe(-1);
		expect(f({ x: 0 })).toBe(0);
		expect(f({ x: 5 })).toBe(1);
	});

	it('returns NaN when no condition matches and there is no otherwise', () => {
		const partial = piecewise([
			piecewisePiece(relation('<', variable('x'), number('0')), number('1'))
		]);
		const f = compile(partial);
		expect(f({ x: -1 })).toBe(1);
		expect(Number.isNaN(f({ x: 5 }))).toBe(true);
	});

	it('respects ORDER (first matching branch wins)', () => {
		// Both branches match for x = 0; first match wins.
		const ambiguous = piecewise([
			piecewisePiece(relation('>=', variable('x'), opposite(number('1'))), number('1')),
			piecewisePiece(relation('>=', variable('x'), number('0')), number('2'))
		]);
		const f = compile(ambiguous);
		expect(f({ x: 0 })).toBe(1); // First branch, not second
		expect(f({ x: -2 })).toBeNaN();
	});

	it('compiles compound conditions (logical and)', () => {
		// f(x) = 5 if 0 < x and x < 10
		const node = piecewise([
			piecewisePiece(
				logical(
					'and',
					relation('<', number('0'), variable('x')),
					relation('<', variable('x'), number('10'))
				),
				number('5')
			)
		]);
		const f = compile(node);
		expect(f({ x: 5 })).toBe(5);
		expect(Number.isNaN(f({ x: 0 }))).toBe(true);
		expect(Number.isNaN(f({ x: 15 }))).toBe(true);
	});

	it('compiles compound conditions (logical or)', () => {
		const node = piecewise([
			piecewisePiece(
				logical(
					'or',
					relation('<', variable('x'), opposite(number('1'))),
					relation('>', variable('x'), number('1'))
				),
				number('1')
			)
		]);
		const f = compile(node);
		expect(f({ x: -2 })).toBe(1);
		expect(f({ x: 2 })).toBe(1);
		expect(Number.isNaN(f({ x: 0 }))).toBe(true);
	});

	it('compiles relation chains a < x <= b directly', () => {
		// `0 < x <= 10` is nested as relation('<=', relation('<', 0, x), 10)
		const chain = relation('<=', relation('<', number('0'), variable('x')), number('10'));
		const node = piecewise([piecewisePiece(chain, variable('x'))]);
		const f = compile(node);
		expect(f({ x: 5 })).toBe(5);
		expect(f({ x: 10 })).toBe(10);
		expect(Number.isNaN(f({ x: 0 }))).toBe(true);
		expect(Number.isNaN(f({ x: 11 }))).toBe(true);
	});

	it('compiles complex piecewise with mixed expressions', () => {
		// f(x) = -x if x < 0 ; x^2 if 0 <= x <= 1 ; 2*x - 1 if x > 1
		const node = piecewise([
			piecewisePiece(relation('<', variable('x'), number('0')), opposite(variable('x'))),
			piecewisePiece(
				relation('<=', relation('<=', number('0'), variable('x')), number('1')),
				multiply(variable('x'), variable('x'))
			),
			piecewisePiece(
				relation('>', variable('x'), number('1')),
				add(multiply(number('2'), variable('x')), opposite(number('1')))
			)
		]);
		const f = compile(node);
		expect(f({ x: -2 })).toBe(2);
		expect(f({ x: 0 })).toBe(0);
		expect(f({ x: 0.5 })).toBeCloseTo(0.25);
		expect(f({ x: 1 })).toBe(1);
		expect(f({ x: 3 })).toBe(5);
	});
});
