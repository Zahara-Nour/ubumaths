/**
 * Tests for Figure.getLineEquation() — exact equation computation for lines.
 */

import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { exact, numeric } from '../../types/geo-value';
import { number } from '$lib/mathAST';
import { evaluate } from '$lib/mathAST/eval';
import { isZeroExpression } from '$lib/mathAST/normal';

function pt(x: number, y: number) {
	return { x: exact(number(x)), y: exact(number(y)) };
}

function npt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

/** Evaluate a MathNode to a number. */
function evalNode(node: import('$lib/mathAST/types').MathNode): number {
	const result = evaluate(node, { mode: 'decimal' });
	if (result.status !== 'value') throw new Error(`eval failed: ${result.status}`);
	return typeof result.value === 'number'
		? result.value
		: Number((result.value as { value: string }).value);
}

describe('Figure.getLineEquation', () => {
	describe('basic computation from two points', () => {
		it('computes equation for horizontal line y = 3', () => {
			const fig = new Figure();
			const p1 = fig.createFreePoint(pt(0, 3));
			const p2 = fig.createFreePoint(pt(5, 3));
			const lineId = fig.createLine(p1, p2);

			const eq = fig.getLineEquation(lineId);
			expect(eq).not.toBeNull();

			// a=0 (horizontal), b≠0, verify a point lies on the line: a*x + b*y + c = 0
			expect(isZeroExpression(eq!.a)).toBe(true);
			expect(isZeroExpression(eq!.b)).toBe(false);

			// Verify (0,3) satisfies the equation
			const bVal = evalNode(eq!.b);
			const cVal = evalNode(eq!.c);
			expect(bVal * 3 + cVal).toBeCloseTo(0);
		});

		it('computes equation for vertical line x = 2', () => {
			const fig = new Figure();
			const p1 = fig.createFreePoint(pt(2, 0));
			const p2 = fig.createFreePoint(pt(2, 5));
			const lineId = fig.createLine(p1, p2);

			const eq = fig.getLineEquation(lineId);
			expect(eq).not.toBeNull();

			// b=0 (vertical), a≠0
			expect(isZeroExpression(eq!.b)).toBe(true);
			expect(isZeroExpression(eq!.a)).toBe(false);

			// Verify (2,0) satisfies: a*2 + c = 0
			const aVal = evalNode(eq!.a);
			const cVal = evalNode(eq!.c);
			expect(aVal * 2 + cVal).toBeCloseTo(0);
		});

		it('computes equation for line y = 2x + 1 through (0,1) and (1,3)', () => {
			const fig = new Figure();
			const p1 = fig.createFreePoint(pt(0, 1));
			const p2 = fig.createFreePoint(pt(1, 3));
			const lineId = fig.createLine(p1, p2);

			const eq = fig.getLineEquation(lineId);
			expect(eq).not.toBeNull();

			const aVal = evalNode(eq!.a);
			const bVal = evalNode(eq!.b);
			const cVal = evalNode(eq!.c);

			// Both points satisfy a*x + b*y + c = 0
			expect(aVal * 0 + bVal * 1 + cVal).toBeCloseTo(0);
			expect(aVal * 1 + bVal * 3 + cVal).toBeCloseTo(0);
		});

		it('computes equation for diagonal y = x through origin', () => {
			const fig = new Figure();
			const p1 = fig.createFreePoint(pt(0, 0));
			const p2 = fig.createFreePoint(pt(1, 1));
			const lineId = fig.createLine(p1, p2);

			const eq = fig.getLineEquation(lineId);
			expect(eq).not.toBeNull();

			const aVal = evalNode(eq!.a);
			const bVal = evalNode(eq!.b);
			const cVal = evalNode(eq!.c);

			// c should be 0 (passes through origin)
			expect(cVal).toBeCloseTo(0);
			// a and b should have opposite signs (a*x + b*y = 0 with y=x → a = -b)
			expect(aVal + bVal).toBeCloseTo(0);
		});
	});

	describe('expression string', () => {
		it('generates a valid expression string', () => {
			const fig = new Figure();
			const p1 = fig.createFreePoint(pt(0, 1));
			const p2 = fig.createFreePoint(pt(1, 3));
			const lineId = fig.createLine(p1, p2);

			const eq = fig.getLineEquation(lineId);
			expect(eq).not.toBeNull();
			expect(eq!.expression).toContain('=');
			expect(eq!.expression).toContain('0');
		});

		it('omits zero terms in expression', () => {
			const fig = new Figure();
			// Horizontal line y = 3 → a=0, expression should not contain x
			const p1 = fig.createFreePoint(pt(0, 3));
			const p2 = fig.createFreePoint(pt(1, 3));
			const lineId = fig.createLine(p1, p2);

			const eq = fig.getLineEquation(lineId);
			expect(eq).not.toBeNull();
			expect(eq!.expression).not.toContain('x');
			expect(eq!.expression).toContain('y');
		});
	});

	describe('stored equation from courbe()', () => {
		it('returns stored equation when present', () => {
			const fig = new Figure();
			const p1 = fig.createFreePoint(pt(0, 3));
			const p2 = fig.createFreePoint(pt(1, 5));
			const storedEq = {
				a: number('2'),
				b: number('-1'),
				c: number('3'),
				expression: 'y = 2*x + 3'
			};
			const lineId = fig.createLine(p1, p2, { equation: storedEq });

			const eq = fig.getLineEquation(lineId);
			expect(eq).toBe(storedEq);
		});
	});

	describe('dynamic recomputation after point move', () => {
		it('returns updated equation after moving a point', () => {
			const fig = new Figure();
			const p1 = fig.createFreePoint(pt(0, 0));
			const p2 = fig.createFreePoint(pt(1, 1));
			const lineId = fig.createLine(p1, p2);

			const eq1 = fig.getLineEquation(lineId);
			const a1 = evalNode(eq1!.a);
			const b1 = evalNode(eq1!.b);

			// Move p2 to (1, 2) — line changes from y=x to y=2x
			fig.beginTransaction();
			fig.movePoint(p2, numeric(1), numeric(2));
			fig.recompute();
			fig.commit();

			const eq2 = fig.getLineEquation(lineId);
			const a2 = evalNode(eq2!.a);
			const b2 = evalNode(eq2!.b);
			const c2 = evalNode(eq2!.c);

			// New line passes through (0,0) and (1,2)
			expect(a2 * 0 + b2 * 0 + c2).toBeCloseTo(0);
			expect(a2 * 1 + b2 * 2 + c2).toBeCloseTo(0);

			// Coefficients should have changed
			expect(a2 / b2).not.toBeCloseTo(a1 / b1);
		});
	});

	describe('edge cases', () => {
		it('returns null for non-line element', () => {
			const fig = new Figure();
			const p1 = fig.createFreePoint(pt(0, 0));
			expect(fig.getLineEquation(p1)).toBeNull();
		});

		it('returns null for unknown id', () => {
			const fig = new Figure();
			expect(fig.getLineEquation('nonexistent')).toBeNull();
		});

		it('works with numeric (non-exact) point coordinates', () => {
			const fig = new Figure();
			const p1 = fig.createFreePoint(npt(0, 1));
			const p2 = fig.createFreePoint(npt(2, 5));
			const lineId = fig.createLine(p1, p2);

			const eq = fig.getLineEquation(lineId);
			expect(eq).not.toBeNull();

			const aVal = evalNode(eq!.a);
			const bVal = evalNode(eq!.b);
			const cVal = evalNode(eq!.c);

			// Both points satisfy the equation
			expect(aVal * 0 + bVal * 1 + cVal).toBeCloseTo(0);
			expect(aVal * 2 + bVal * 5 + cVal).toBeCloseTo(0);
		});
	});
});
