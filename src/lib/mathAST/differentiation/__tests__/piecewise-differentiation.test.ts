/**
 * Tests for symbolic differentiation of PiecewiseNode.
 *
 * Mathematical model: if f(x) = { v_i(x) si c_i, ..., otherwise v_o(x) }
 * then f'(x) = { v_i'(x) si c_i, ..., otherwise v_o'(x) }.
 * Conditions are predicates and remain unchanged.
 */

import { describe, it, expect } from 'vitest';
import { differentiate } from '../differentiate';
import {
	piecewise,
	piecewisePiece,
	relation,
	variable,
	number,
	opposite,
	multiply,
	subtract,
	power
} from '../../factory';
import type { PiecewiseNode } from '../../types';
import { isPiecewise } from '../../guards';
import { compile } from '../../eval';

describe('differentiate — PiecewiseNode', () => {
	const x = variable('x');
	const zero = number('0');
	const one = number('1');

	it('differentiates |x| = { -x si x<0, x si x>=0 } into { -1 si x<0, 1 si x>=0 }', () => {
		const absX = piecewise([
			piecewisePiece(relation('<', x, zero), opposite(x)),
			piecewisePiece(relation('>=', x, zero), x)
		]);

		const result = differentiate(absX);

		expect(isPiecewise(result)).toBe(true);
		const pw = result as PiecewiseNode;
		expect(pw.pieces).toHaveLength(2);
		expect(pw.otherwise).toBeUndefined();

		const evalFn = compile(pw);
		expect(evalFn({ x: -2 })).toBe(-1);
		expect(evalFn({ x: 3 })).toBe(1);
	});

	it('differentiates a polynomial piecewise { x^2 si x<1, 2x-1 si x>=1 } into { 2x si x<1, 2 si x>=1 }', () => {
		const poly = piecewise([
			piecewisePiece(relation('<', x, one), power(x, number('2'))),
			piecewisePiece(relation('>=', x, one), subtract(multiply(number('2'), x), one))
		]);

		const result = differentiate(poly);

		expect(isPiecewise(result)).toBe(true);
		const pw = result as PiecewiseNode;
		expect(pw.pieces).toHaveLength(2);

		const evalFn = compile(pw);
		expect(evalFn({ x: -2 })).toBe(-4); // 2 * (-2)
		expect(evalFn({ x: 0 })).toBe(0); // 2 * 0
		expect(evalFn({ x: 3 })).toBe(2); // constant 2
	});

	it('differentiates sign(x) (three constant branches) into all-zero piecewise', () => {
		const sign = piecewise([
			piecewisePiece(relation('<', x, zero), number('-1')),
			piecewisePiece(relation('=', x, zero), zero),
			piecewisePiece(relation('>', x, zero), one)
		]);

		const result = differentiate(sign);

		expect(isPiecewise(result)).toBe(true);
		const pw = result as PiecewiseNode;
		expect(pw.pieces).toHaveLength(3);

		const evalFn = compile(pw);
		expect(evalFn({ x: -2 })).toBe(0);
		expect(evalFn({ x: 0 })).toBe(0);
		expect(evalFn({ x: 5 })).toBe(0);
	});

	it('differentiates the otherwise branch as well', () => {
		// { x^3 si x<0, otherwise x^2 } → { 3x^2 si x<0, otherwise 2x }
		const pw = piecewise(
			[piecewisePiece(relation('<', x, zero), power(x, number('3')))],
			power(x, number('2'))
		);

		const result = differentiate(pw);

		expect(isPiecewise(result)).toBe(true);
		const dpw = result as PiecewiseNode;
		expect(dpw.pieces).toHaveLength(1);
		expect(dpw.otherwise).toBeDefined();

		const evalFn = compile(dpw);
		expect(evalFn({ x: -2 })).toBeCloseTo(12); // 3 * (-2)^2
		expect(evalFn({ x: 3 })).toBeCloseTo(6); // 2 * 3
	});

	it('preserves condition nodes by structural identity', () => {
		const cond1 = relation('<', x, zero);
		const cond2 = relation('>=', x, zero);
		const pw = piecewise([piecewisePiece(cond1, opposite(x)), piecewisePiece(cond2, x)]);

		const result = differentiate(pw) as PiecewiseNode;

		expect(result.pieces[0].condition).toBe(cond1);
		expect(result.pieces[1].condition).toBe(cond2);
	});

	it('preserves the source PiecewiseNode metadata', () => {
		const meta = { line: 42 };
		const pw = piecewise([piecewisePiece(relation('<', x, zero), opposite(x))], x, meta);

		const result = differentiate(pw) as PiecewiseNode;
		expect(result.metadata).toBe(meta);
	});
});
