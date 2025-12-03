/**
 * Unit tests for monomial operations module
 */

import { describe, it, expect } from 'vitest';
import {
	// Constants
	EMPTY_MONOMIAL,
	// Constructors
	symbolicFactor,
	variableMonomial,
	// Node operations
	hashNode,
	compareNodes,
	nodesEqual,
	// Factor operations
	compareSymbolicFactors,
	sameBase,
	// Monomial operations
	mulMonomials,
	compareMonomials,
	hashMonomial,
	monomialDegree,
	monomialsEqual,
	// GCD operations
	gcdMonomials,
	divMonomials,
	// Sorting
	sortSymbolicFactors,
	// Conversion
	monomialToString
} from '../monomial';
import type { SymbolicFactor, Rational } from '../types';
import type { MathNode, VariableNode, GreekLetterNode, FunctionNode } from '../../types';

// =============================================================================
// Test Helpers
// =============================================================================

// Helper to create rationals
const r = (n: bigint, d: bigint = 1n): Rational => ({ n, d });

// Helper to create variable nodes
const varNode = (name: string): VariableNode => ({ type: 'variable', name });

// Helper to create greek letter nodes
const greekNode = (letter: 'pi' | 'alpha' | 'beta' | 'gamma' | 'theta'): GreekLetterNode => ({
	type: 'greek',
	letter
});

// Helper to create function nodes
const fnNode = (name: string, ...args: MathNode[]): FunctionNode => ({
	type: 'function',
	name,
	args
});

// Common variables
const x = varNode('x');
const y = varNode('y');
const z = varNode('z');
const pi = greekNode('pi');

// Helper to create symbolic factors
const factor = (base: MathNode, exp: Rational = r(1n)): SymbolicFactor => symbolicFactor(base, exp);

describe('monomial', () => {
	// ===========================================================================
	// Constants
	// ===========================================================================

	describe('constants', () => {
		it('EMPTY_MONOMIAL is empty array', () => {
			expect(EMPTY_MONOMIAL.length).toBe(0);
		});
	});

	// ===========================================================================
	// Node Hashing
	// ===========================================================================

	describe('hashNode', () => {
		it('hashes variable nodes', () => {
			expect(hashNode(x)).toBe('V:x');
			expect(hashNode(y)).toBe('V:y');
		});

		it('hashes greek letter nodes', () => {
			expect(hashNode(pi)).toBe('G:pi');
		});

		it('hashes number nodes', () => {
			const num: MathNode = { type: 'number', value: '42' };
			expect(hashNode(num)).toBe('N:42');
		});

		it('hashes function nodes', () => {
			const sinX = fnNode('sin', x);
			const hash = hashNode(sinX);
			expect(hash).toContain('sin');
			expect(hash).toContain('V:x');
		});

		it('produces consistent hashes', () => {
			expect(hashNode(x)).toBe(hashNode(varNode('x')));
			expect(hashNode(fnNode('sin', x))).toBe(hashNode(fnNode('sin', varNode('x'))));
		});

		it('produces different hashes for different nodes', () => {
			expect(hashNode(x)).not.toBe(hashNode(y));
			expect(hashNode(x)).not.toBe(hashNode(pi));
		});
	});

	// ===========================================================================
	// Node Comparison
	// ===========================================================================

	describe('compareNodes', () => {
		describe('type priority', () => {
			it('greek letters come before variables', () => {
				expect(compareNodes(pi, x)).toBe(-1);
				expect(compareNodes(x, pi)).toBe(1);
			});

			it('variables come before functions', () => {
				const sinX = fnNode('sin', x);
				expect(compareNodes(x, sinX)).toBe(-1);
				expect(compareNodes(sinX, x)).toBe(1);
			});
		});

		describe('same type ordering', () => {
			it('orders variables alphabetically', () => {
				expect(compareNodes(x, y)).toBe(-1);
				expect(compareNodes(y, x)).toBe(1);
				expect(compareNodes(x, z)).toBe(-1);
			});

			it('equal nodes return 0', () => {
				expect(compareNodes(x, varNode('x'))).toBe(0);
				expect(compareNodes(pi, greekNode('pi'))).toBe(0);
			});

			it('orders functions by name then arguments', () => {
				const sinX = fnNode('sin', x);
				const cosX = fnNode('cos', x);
				const sinY = fnNode('sin', y);

				expect(compareNodes(cosX, sinX)).toBe(-1); // cos < sin
				expect(compareNodes(sinX, sinY)).toBe(-1); // sin(x) < sin(y)
			});
		});
	});

	describe('nodesEqual', () => {
		it('returns true for equal nodes', () => {
			expect(nodesEqual(x, varNode('x'))).toBe(true);
			expect(nodesEqual(fnNode('sin', x), fnNode('sin', varNode('x')))).toBe(true);
		});

		it('returns false for different nodes', () => {
			expect(nodesEqual(x, y)).toBe(false);
			expect(nodesEqual(fnNode('sin', x), fnNode('cos', x))).toBe(false);
		});
	});

	// ===========================================================================
	// Constructors
	// ===========================================================================

	describe('symbolicFactor', () => {
		it('creates factor with base and exponent', () => {
			const f = symbolicFactor(x, r(2n));
			expect(nodesEqual(f.base, x)).toBe(true);
			expect(f.exponent.n).toBe(2n);
			expect(f.exponent.d).toBe(1n);
		});
	});

	describe('variableMonomial', () => {
		it('creates monomial from variable name', () => {
			const m = variableMonomial('x');
			expect(m.length).toBe(1);
			expect((m[0].base as VariableNode).name).toBe('x');
			expect(m[0].exponent.n).toBe(1n);
		});
	});

	// ===========================================================================
	// Symbolic Factor Comparison
	// ===========================================================================

	describe('compareSymbolicFactors', () => {
		it('compares by base first', () => {
			const fx = factor(x, r(2n));
			const fy = factor(y, r(1n));
			expect(compareSymbolicFactors(fx, fy)).toBe(-1); // x < y
		});

		it('compares by exponent for same base', () => {
			const x1 = factor(x, r(1n));
			const x2 = factor(x, r(2n));
			expect(compareSymbolicFactors(x1, x2)).toBe(-1); // x^1 < x^2
		});

		it('returns 0 for equal factors', () => {
			const f1 = factor(x, r(2n));
			const f2 = factor(varNode('x'), r(2n));
			expect(compareSymbolicFactors(f1, f2)).toBe(0);
		});
	});

	describe('sameBase', () => {
		it('returns true for same base', () => {
			const f1 = factor(x, r(1n));
			const f2 = factor(x, r(2n));
			expect(sameBase(f1, f2)).toBe(true);
		});

		it('returns false for different bases', () => {
			const f1 = factor(x, r(1n));
			const f2 = factor(y, r(1n));
			expect(sameBase(f1, f2)).toBe(false);
		});
	});

	// ===========================================================================
	// Monomial Operations
	// ===========================================================================

	describe('mulMonomials', () => {
		it('multiplying by empty monomial returns other', () => {
			const m = [factor(x, r(2n))];
			expect(mulMonomials(m, [])).toEqual(m);
			expect(mulMonomials([], m)).toEqual(m);
		});

		it('x^2 * x^3 = x^5', () => {
			const a = [factor(x, r(2n))];
			const b = [factor(x, r(3n))];
			const result = mulMonomials(a, b);
			expect(result.length).toBe(1);
			expect(result[0].exponent.n).toBe(5n);
		});

		it('x^2 * y = x^2 * y', () => {
			const a = [factor(x, r(2n))];
			const b = [factor(y, r(1n))];
			const result = mulMonomials(a, b);
			expect(result.length).toBe(2);
		});

		it('x * y * x = x^2 * y', () => {
			const a = [factor(x, r(1n)), factor(y, r(1n))];
			const b = [factor(x, r(1n))];
			const result = mulMonomials(a, b);
			// Should have x^2 and y
			const xFactor = result.find((f) => (f.base as VariableNode).name === 'x');
			expect(xFactor?.exponent.n).toBe(2n);
		});

		it('x * x^(-1) = 1 (empty monomial)', () => {
			const a = [factor(x, r(1n))];
			const b = [factor(x, r(-1n))];
			const result = mulMonomials(a, b);
			expect(result.length).toBe(0);
		});

		it('sorts result canonically', () => {
			const a = [factor(y, r(1n))];
			const b = [factor(x, r(1n))];
			const result = mulMonomials(a, b);
			// pi < x < y in canonical order
			expect((result[0].base as VariableNode).name).toBe('x');
			expect((result[1].base as VariableNode).name).toBe('y');
		});

		it('handles fractional exponents', () => {
			const a = [factor(x, r(1n, 2n))]; // x^(1/2)
			const b = [factor(x, r(1n, 2n))]; // x^(1/2)
			const result = mulMonomials(a, b);
			expect(result.length).toBe(1);
			expect(result[0].exponent.n).toBe(1n);
			expect(result[0].exponent.d).toBe(1n);
		});
	});

	describe('compareMonomials', () => {
		it('higher degree comes first', () => {
			const deg2 = [factor(x, r(2n))]; // x^2, degree 2
			const deg1 = [factor(x, r(1n))]; // x, degree 1
			expect(compareMonomials(deg2, deg1)).toBe(-1);
			expect(compareMonomials(deg1, deg2)).toBe(1);
		});

		it('same degree: lexicographic order', () => {
			const xSquared = [factor(x, r(2n))]; // x^2
			const ySquared = [factor(y, r(2n))]; // y^2
			expect(compareMonomials(xSquared, ySquared)).toBe(-1); // x < y
		});

		it('empty monomials are equal', () => {
			expect(compareMonomials([], [])).toBe(0);
		});

		it('constant (empty) has degree 0, comes after higher degree', () => {
			const x1 = [factor(x, r(1n))];
			expect(compareMonomials(x1, [])).toBe(-1); // x (deg 1) before constant (deg 0)
		});
	});

	describe('hashMonomial', () => {
		it('empty monomial hashes to empty string', () => {
			expect(hashMonomial([])).toBe('');
		});

		it('produces consistent hashes', () => {
			const m = [factor(x, r(2n))];
			expect(hashMonomial(m)).toBe(hashMonomial([factor(varNode('x'), r(2n))]));
		});

		it('different monomials have different hashes', () => {
			const mx = [factor(x, r(1n))];
			const my = [factor(y, r(1n))];
			expect(hashMonomial(mx)).not.toBe(hashMonomial(my));
		});
	});

	describe('monomialDegree', () => {
		it('empty monomial has degree 0', () => {
			const deg = monomialDegree([]);
			expect(deg.n).toBe(0n);
		});

		it('x^2 has degree 2', () => {
			const deg = monomialDegree([factor(x, r(2n))]);
			expect(deg.n).toBe(2n);
			expect(deg.d).toBe(1n);
		});

		it('x^2 * y^3 has degree 5', () => {
			const deg = monomialDegree([factor(x, r(2n)), factor(y, r(3n))]);
			expect(deg.n).toBe(5n);
		});

		it('x^(1/2) * y^(1/2) has degree 1', () => {
			const deg = monomialDegree([factor(x, r(1n, 2n)), factor(y, r(1n, 2n))]);
			expect(deg.n).toBe(1n);
			expect(deg.d).toBe(1n);
		});
	});

	describe('monomialsEqual', () => {
		it('equal monomials are equal', () => {
			const a = [factor(x, r(2n)), factor(y, r(1n))];
			const b = [factor(varNode('x'), r(2n)), factor(varNode('y'), r(1n))];
			expect(monomialsEqual(a, b)).toBe(true);
		});

		it('different monomials are not equal', () => {
			const a = [factor(x, r(2n))];
			const b = [factor(x, r(3n))];
			expect(monomialsEqual(a, b)).toBe(false);
		});

		it('empty monomials are equal', () => {
			expect(monomialsEqual([], [])).toBe(true);
		});
	});

	// ===========================================================================
	// Sorting
	// ===========================================================================

	describe('sortSymbolicFactors', () => {
		it('sorts factors in canonical order', () => {
			const factors = [factor(y, r(1n)), factor(x, r(1n)), factor(pi, r(1n))];
			const sorted = sortSymbolicFactors(factors);
			expect((sorted[0].base as GreekLetterNode).letter).toBe('pi');
			expect((sorted[1].base as VariableNode).name).toBe('x');
			expect((sorted[2].base as VariableNode).name).toBe('y');
		});

		it('does not modify original array', () => {
			const original = [factor(y, r(1n)), factor(x, r(1n))];
			sortSymbolicFactors(original);
			expect((original[0].base as VariableNode).name).toBe('y');
		});
	});

	// ===========================================================================
	// Conversion
	// ===========================================================================

	describe('monomialToString', () => {
		it('converts empty monomial to "1"', () => {
			expect(monomialToString([])).toBe('1');
		});

		it('converts single variable', () => {
			const str = monomialToString([factor(x, r(1n))]);
			expect(str).toBe('x');
		});

		it('converts variable with power', () => {
			const str = monomialToString([factor(x, r(2n))]);
			expect(str).toBe('x^2');
		});

		it('converts multiple factors', () => {
			const str = monomialToString([factor(x, r(2n)), factor(y, r(3n))]);
			expect(str).toBe('x^2*y^3');
		});

		it('handles fractional exponents', () => {
			const str = monomialToString([factor(x, r(1n, 2n))]);
			expect(str).toContain('1/2');
		});
	});

	// ===========================================================================
	// Integration Tests
	// ===========================================================================

	describe('integration', () => {
		it('verifies (x*y)^2 = x^2 * y^2 pattern', () => {
			const xy = [factor(x, r(1n)), factor(y, r(1n))];
			const result = mulMonomials(xy, xy);
			// Should have x^2 and y^2
			const xFactor = result.find((f) => (f.base as VariableNode).name === 'x');
			const yFactor = result.find((f) => (f.base as VariableNode).name === 'y');
			expect(xFactor?.exponent.n).toBe(2n);
			expect(yFactor?.exponent.n).toBe(2n);
		});

		it('verifies graded ordering: higher degree comes first, then lex within same degree', () => {
			// Degree 3 monomials
			const x3 = [factor(x, r(3n))];
			const x2y = [factor(x, r(2n)), factor(y, r(1n))];
			const xy2 = [factor(x, r(1n)), factor(y, r(2n))];
			const y3 = [factor(y, r(3n))];

			// Degree 2 monomials
			const x2 = [factor(x, r(2n))];
			const _xy = [factor(x, r(1n)), factor(y, r(1n))];
			const _y2 = [factor(y, r(2n))];

			// Degree 1 monomials
			const x1 = [factor(x, r(1n))];
			const y1 = [factor(y, r(1n))];

			// Constant
			const one: SymbolicFactor[] = [];

			// Degree 3 before degree 2
			expect(compareMonomials(x3, x2)).toBe(-1);

			// Within same degree, lexicographic by factor comparison
			// x2y has factors [x^2, y], x3 has [x^3]
			// Comparing first factors: x^2 vs x^3 - same base, exp 2 < 3
			// So x2y comes before x3 in lex order (smaller exponent first)
			expect(compareMonomials(x2y, x3)).toBe(-1);
			expect(compareMonomials(xy2, x2y)).toBe(-1); // x^1 < x^2

			// y3 vs xy2: y^3 has first factor y, xy2 has first factor x
			// x < y alphabetically, so xy2 comes before y3
			expect(compareMonomials(xy2, y3)).toBe(-1);

			// Degree 2 before degree 1
			expect(compareMonomials(x2, x1)).toBe(-1);

			// Degree 1 before constant
			expect(compareMonomials(x1, one)).toBe(-1);

			// Within degree 1: x < y
			expect(compareMonomials(x1, y1)).toBe(-1);
		});
	});

	// ===========================================================================
	// GCD and Division Operations
	// ===========================================================================

	describe('gcdMonomials', () => {
		it('returns empty for empty monomials', () => {
			expect(gcdMonomials([], [factor(x, r(1n))])).toEqual([]);
			expect(gcdMonomials([factor(x, r(1n))], [])).toEqual([]);
			expect(gcdMonomials([], [])).toEqual([]);
		});

		it('gcd of x^2 and x is x', () => {
			const a = [factor(x, r(2n))];
			const b = [factor(x, r(1n))];
			const gcd = gcdMonomials(a, b);
			expect(gcd.length).toBe(1);
			expect((gcd[0].base as VariableNode).name).toBe('x');
			expect(gcd[0].exponent.n).toBe(1n);
		});

		it('gcd of x^2*y and x*y^2 is x*y', () => {
			const a = [factor(x, r(2n)), factor(y, r(1n))];
			const b = [factor(x, r(1n)), factor(y, r(2n))];
			const gcd = gcdMonomials(a, b);
			expect(gcd.length).toBe(2);
			// GCD should have x^1 and y^1
			const xFactor = gcd.find((f) => (f.base as VariableNode).name === 'x');
			const yFactor = gcd.find((f) => (f.base as VariableNode).name === 'y');
			expect(xFactor?.exponent.n).toBe(1n);
			expect(yFactor?.exponent.n).toBe(1n);
		});

		it('gcd of x^2 and y^2 is 1 (empty monomial)', () => {
			const a = [factor(x, r(2n))];
			const b = [factor(y, r(2n))];
			const gcd = gcdMonomials(a, b);
			expect(gcd.length).toBe(0);
		});

		it('gcd of x^3*y^2 and x^2*y^3 is x^2*y^2', () => {
			const a = [factor(x, r(3n)), factor(y, r(2n))];
			const b = [factor(x, r(2n)), factor(y, r(3n))];
			const gcd = gcdMonomials(a, b);
			expect(gcd.length).toBe(2);
			const xFactor = gcd.find((f) => (f.base as VariableNode).name === 'x');
			const yFactor = gcd.find((f) => (f.base as VariableNode).name === 'y');
			expect(xFactor?.exponent.n).toBe(2n);
			expect(yFactor?.exponent.n).toBe(2n);
		});

		it('gcd of x and x is x', () => {
			const a = [factor(x, r(1n))];
			const b = [factor(x, r(1n))];
			const gcd = gcdMonomials(a, b);
			expect(gcd.length).toBe(1);
			expect(gcd[0].exponent.n).toBe(1n);
		});
	});

	describe('divMonomials', () => {
		it('x^2 / x = x', () => {
			const a = [factor(x, r(2n))];
			const b = [factor(x, r(1n))];
			const result = divMonomials(a, b);
			expect(result.length).toBe(1);
			expect((result[0].base as VariableNode).name).toBe('x');
			expect(result[0].exponent.n).toBe(1n);
		});

		it('x^3*y^2 / x*y = x^2*y', () => {
			const a = [factor(x, r(3n)), factor(y, r(2n))];
			const b = [factor(x, r(1n)), factor(y, r(1n))];
			const result = divMonomials(a, b);
			expect(result.length).toBe(2);
			const xFactor = result.find((f) => (f.base as VariableNode).name === 'x');
			const yFactor = result.find((f) => (f.base as VariableNode).name === 'y');
			expect(xFactor?.exponent.n).toBe(2n);
			expect(yFactor?.exponent.n).toBe(1n);
		});

		it('x / x = 1 (empty monomial)', () => {
			const a = [factor(x, r(1n))];
			const b = [factor(x, r(1n))];
			const result = divMonomials(a, b);
			expect(result.length).toBe(0);
		});

		it('division by empty monomial returns original', () => {
			const a = [factor(x, r(2n))];
			const result = divMonomials(a, []);
			expect(result.length).toBe(1);
			expect(result[0].exponent.n).toBe(2n);
		});

		it('division of empty monomial returns inverse', () => {
			const result = divMonomials([], [factor(x, r(2n))]);
			expect(result.length).toBe(1);
			expect(result[0].exponent.n).toBe(-2n);
		});
	});
});
