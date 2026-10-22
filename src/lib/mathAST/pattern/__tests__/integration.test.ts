/**
 * Integration Tests for Pattern Matching System
 *
 * Tests the integration between:
 * - Pattern matching primitives (match, applyRules) used as matches / extract / simplifyWith
 * - Pre-built rule sets (arithmeticRules, powerRules, allPatternRules)
 * - Pattern builder (P namespace)
 */

import { describe, it, expect } from 'vitest';
import { P } from '../builder';
import {
	arithmeticRules,
	powerRules,
	absRules,
	logExpRules,
	sqrtRules,
	trigRules,
	functionParityRules,
	allPatternRules
} from '../rule-sets';
import { applyRules } from '../rule';
import { match, nodesEqual } from '../match';
import { getBindingNode } from '../types';
import type { BindingValue, Pattern, Rule } from '../types';
import {
	number,
	variable,
	add,
	multiply,
	divide,
	fraction,
	implicitMultiply,
	superscript,
	opposite,
	abs,
	func,
	euler,
	piConstant
} from '../../factory';
import type { TypeContext } from '../../numtype/types';
import type { MathNode } from '../../types';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';

/** Vrai si le motif filtre le nœud. */
function matches(node: MathNode, pattern: Pattern): boolean {
	return match(pattern, node).success;
}

/** Captures du filtrage, ou `null` si le motif ne filtre pas le nœud. */
function extract(node: MathNode, pattern: Pattern): Map<string, BindingValue> | null {
	const result = match(pattern, node);
	return result.success ? new Map(result.bindings) : null;
}

/** Règles appliquées jusqu'au point fixe (par priorité décroissante). */
function simplifyWith(node: MathNode, rules: readonly Rule[], maxIterations?: number): MathNode {
	return applyRules([...rules], node, maxIterations);
}

/** Affirme que l'extraction a réussi, puis rétrécit les captures. */
function expectBindings(bindings: Map<string, BindingValue> | null): Map<string, BindingValue> {
	expect(bindings).not.toBeNull();
	if (bindings === null) throw new Error('attendu une extraction réussie');
	return bindings;
}

describe('Pattern Matching Integration', () => {
	// ===========================================================================
	// matches() (helper local)
	// ===========================================================================

	describe('matches()', () => {
		it('matches addition with zero on right', () => {
			const expr = parseLatex('x + 0');
			expect(matches(expr, P.add(P._('a'), P.num(0)))).toBe(true);
		});

		it('matches addition with zero on left', () => {
			const expr = parseLatex('0 + x');
			expect(matches(expr, P.add(P.num(0), P._('a')))).toBe(true);
		});

		it('does not match when pattern differs', () => {
			const expr = parseLatex('x + 0');
			expect(matches(expr, P.mul(P._('a'), P.num(0)))).toBe(false);
		});

		it('matches multiplication pattern', () => {
			const expr = parseLatex('x \\cdot 1');
			expect(matches(expr, P.mul(P._('a'), P.num(1)))).toBe(true);
		});

		it('matches power pattern', () => {
			const expr = parseLatex('x^2');
			expect(matches(expr, P.pow(P._('base'), P._('exp')))).toBe(true);
		});

		it('matches division pattern', () => {
			const expr = parseLatex('\\frac{a}{b}');
			expect(matches(expr, P.div(P._('num'), P._('den')))).toBe(true);
		});

		it('matches nested patterns', () => {
			// Note: (x + y) is parsed as a delimiter containing addition
			// So we need to match the delimiter wrapping the addition
			const expr = parseLatex('(x + y) \\cdot z');
			expect(matches(expr, P.mul(P.paren(P.add(P._('a'), P._('b'))), P._('c')))).toBe(true);
		});

		it('matches negation pattern', () => {
			const expr = parseLatex('-x');
			expect(matches(expr, P.neg(P._('x')))).toBe(true);
		});

		it('matches double negation pattern', () => {
			const expr = parseLatex('--x');
			expect(matches(expr, P.neg(P.neg(P._('x'))))).toBe(true);
		});

		it('matches pattern with constraint', () => {
			const expr = parseLatex('5 + 0');
			expect(matches(expr, P.add(P._('n', P.isNumber()), P.num(0)))).toBe(true);
		});

		it('does not match when constraint fails', () => {
			const expr = parseLatex('x + 0');
			// Variable x does not satisfy isNumber constraint
			expect(matches(expr, P.add(P._('n', P.isNumber()), P.num(0)))).toBe(false);
		});
	});

	// ===========================================================================
	// extract() (helper local)
	// ===========================================================================

	describe('extract()', () => {
		it('extracts bindings from addition', () => {
			const expr = parseLatex('x + 5');
			const bindings = extract(expr, P.add(P._('left'), P._('right')));

			expect(bindings).not.toBeNull();
			expect(getBindingNode(expectBindings(bindings), 'left')?.type).toBe('variable');
			expect(getBindingNode(expectBindings(bindings), 'right')?.type).toBe('number');
		});

		it('extracts single binding', () => {
			const expr = parseLatex('x + 0');
			const bindings = extract(expr, P.add(P._('x'), P.num(0)));

			const node = getBindingNode(expectBindings(bindings), 'x');
			expect(node?.type).toBe('variable');
			if (node?.type === 'variable') {
				expect(node.name).toBe('x');
			}
		});

		it('returns null for non-matching pattern', () => {
			const expr = parseLatex('x + 5');
			const bindings = extract(expr, P.mul(P._('a'), P._('b')));

			expect(bindings).toBeNull();
		});

		it('extracts bindings from power expression', () => {
			const expr = parseLatex('x^2');
			const bindings = extract(expr, P.pow(P._('base'), P._('exp')));

			expect(bindings).not.toBeNull();
			expect(getBindingNode(expectBindings(bindings), 'base')?.type).toBe('variable');
			expect(getBindingNode(expectBindings(bindings), 'exp')?.type).toBe('number');
		});

		it('extracts bindings from fraction', () => {
			const expr = parseLatex('\\frac{a+b}{c}');
			const bindings = extract(expr, P.div(P._('num'), P._('den')));

			expect(bindings).not.toBeNull();
			expect(getBindingNode(expectBindings(bindings), 'num')?.type).toBe('addition');
			expect(getBindingNode(expectBindings(bindings), 'den')?.type).toBe('variable');
		});

		it('binds same wildcard twice only if values match', () => {
			const expr1 = parseLatex('\\frac{x}{x}');
			const bindings1 = extract(expr1, P.div(P._('a'), P._('a')));
			expect(bindings1).not.toBeNull();

			const expr2 = parseLatex('\\frac{x}{y}');
			const bindings2 = extract(expr2, P.div(P._('a'), P._('a')));
			expect(bindings2).toBeNull();
		});
	});

	// ===========================================================================
	// simplifyWith() (helper local)
	// ===========================================================================

	describe('simplifyWith()', () => {
		describe('with arithmeticRules', () => {
			it('simplifies x + 0 to x', () => {
				const expr = parseLatex('x + 0');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('x');
			});

			it('simplifies 0 + x to x', () => {
				const expr = parseLatex('0 + x');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('x');
			});

			it('simplifies x - 0 to x', () => {
				const expr = parseLatex('x - 0');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('x');
			});

			it('simplifies 0 - x to -x', () => {
				const expr = parseLatex('0 - x');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('-x');
			});

			it('simplifies x * 1 to x', () => {
				const expr = parseLatex('x \\cdot 1');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('x');
			});

			it('simplifies 1 * x to x', () => {
				const expr = parseLatex('1 \\cdot x');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('x');
			});

			it('simplifies x * 0 to 0', () => {
				const expr = parseLatex('x \\cdot 0');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('0');
			});

			it('simplifies 0 * x to 0', () => {
				const expr = parseLatex('0 \\cdot x');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('0');
			});

			it('simplifies x / 1 to x', () => {
				const expr = parseLatex('\\frac{x}{1}');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('x');
			});

			it('simplifies 0 / x to 0 (x nonzero)', () => {
				const expr = parseLatex('\\frac{0}{5}');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('0');
			});

			it('simplifies x / x to 1', () => {
				const expr = parseLatex('\\frac{a}{a}');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('1');
			});

			it('does not simplify 0 / 0', () => {
				const expr = parseLatex('\\frac{0}{0}');
				const simplified = simplifyWith(expr, arithmeticRules);

				// Should remain unchanged because condition fails
				expect(toLatex(simplified)).toBe('\\dfrac{0}{0}');
			});

			it('simplifies --x to x', () => {
				const expr = parseLatex('--x');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('x');
			});

			it('simplifies x - x to 0', () => {
				const expr = parseLatex('x - x');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('0');
			});

			it('simplifies +x to x', () => {
				const expr = parseLatex('+x');
				const simplified = simplifyWith(expr, arithmeticRules);

				expect(toLatex(simplified)).toBe('x');
			});

			it('simplifies nested expression: (x + 0) * 1', () => {
				const expr = parseLatex('(x + 0) \\cdot 1');
				const simplified = simplifyWith(expr, arithmeticRules);

				// Parentheses are preserved as structural elements
				// Inner expression simplifies: x + 0 -> x
				// Outer expression: (x) * 1 -> (x)
				expect(toLatex(simplified)).toBe('\\left( x \\right)');
			});

			it('simplifies deeply nested expression', () => {
				// ((a + 0) - 0) * 1
				const expr = parseLatex('((a + 0) - 0) \\cdot 1');
				const simplified = simplifyWith(expr, arithmeticRules);

				// Parentheses are preserved, inner expressions simplify
				expect(toLatex(simplified)).toBe('\\left( \\left( a \\right) \\right)');
			});
		});

		describe('with powerRules', () => {
			it('simplifies x^1 to x', () => {
				const expr = parseLatex('x^1');
				const simplified = simplifyWith(expr, powerRules);

				expect(toLatex(simplified)).toBe('x');
			});

			it('simplifies x^0 to 1 (x nonzero)', () => {
				const expr = parseLatex('5^0');
				const simplified = simplifyWith(expr, powerRules);

				expect(toLatex(simplified)).toBe('1');
			});

			it('simplifies a^0 to 1 (variable)', () => {
				const expr = parseLatex('a^0');
				const simplified = simplifyWith(expr, powerRules);

				expect(toLatex(simplified)).toBe('1');
			});

			it('does not simplify 0^0', () => {
				const expr = parseLatex('0^0');
				const simplified = simplifyWith(expr, powerRules);

				// Should remain unchanged because condition fails
				// Note: Single digit exponent doesn't need braces
				expect(toLatex(simplified)).toBe('0^0');
			});

			it('simplifies 1^x to 1', () => {
				const expr = parseLatex('1^x');
				const simplified = simplifyWith(expr, powerRules);

				expect(toLatex(simplified)).toBe('1');
			});

			it('simplifies 1^100 to 1', () => {
				const expr = parseLatex('1^{100}');
				const simplified = simplifyWith(expr, powerRules);

				expect(toLatex(simplified)).toBe('1');
			});

			it('simplifies (x+y)^1 to (x+y)', () => {
				const expr = parseLatex('(x + y)^1');
				const simplified = simplifyWith(expr, powerRules);

				// The parentheses are preserved as they are structural
				expect(toLatex(simplified)).toBe('\\left( x + y \\right)');
			});

			it('simplifies (-1)^2 to 1 (literal even exponent)', () => {
				const node = superscript(opposite(number('1')), number('2'));
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, number('1'))).toBe(true);
			});

			it('simplifies (-1)^4 to 1 (literal even exponent)', () => {
				const node = superscript(opposite(number('1')), number('4'));
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, number('1'))).toBe(true);
			});

			it('simplifies (-1)^3 to -1 (literal odd exponent)', () => {
				const node = superscript(opposite(number('1')), number('3'));
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, opposite(number('1')))).toBe(true);
			});

			it('simplifies (-1)^n to 1 when n declared even', () => {
				const ctx: TypeContext = {
					variables: new Map([['n', 'integer']]),
					assumptions: new Map([['n', { parity: 'even' }]])
				};
				const node = superscript(opposite(number('1')), variable('n'));
				const result = applyRules([...powerRules], node, 100, ctx);
				expect(nodesEqual(result, number('1'))).toBe(true);
			});

			it('simplifies (-1)^n to -1 when n declared odd', () => {
				const ctx: TypeContext = {
					variables: new Map([['n', 'integer']]),
					assumptions: new Map([['n', { parity: 'odd' }]])
				};
				const node = superscript(opposite(number('1')), variable('n'));
				const result = applyRules([...powerRules], node, 100, ctx);
				expect(nodesEqual(result, opposite(number('1')))).toBe(true);
			});

			it('does not simplify (-1)^n without parity assumption', () => {
				const node = superscript(opposite(number('1')), variable('n'));
				const result = applyRules([...powerRules], node);
				// Should remain unchanged
				expect(nodesEqual(result, node)).toBe(true);
			});

			it('simplifies (-a)^2 to a^2 (even exponent removes sign)', () => {
				const node = superscript(opposite(variable('a')), number('2'));
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, superscript(variable('a'), number('2')))).toBe(true);
			});

			it('simplifies (-x)^4 to x^4', () => {
				const node = superscript(opposite(variable('x')), number('4'));
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, superscript(variable('x'), number('4')))).toBe(true);
			});

			it('simplifies (-a)^3 to -(a^3) (odd exponent)', () => {
				const node = superscript(opposite(variable('a')), number('3'));
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, opposite(superscript(variable('a'), number('3'))))).toBe(true);
			});

			it('simplifies (-a)^n to a^n when n declared even', () => {
				const ctx: TypeContext = {
					variables: new Map([['n', 'integer']]),
					assumptions: new Map([['n', { parity: 'even' }]])
				};
				const node = superscript(opposite(variable('a')), variable('n'));
				const result = applyRules([...powerRules], node, 100, ctx);
				expect(nodesEqual(result, superscript(variable('a'), variable('n')))).toBe(true);
			});

			it('simplifies |x|^2 to x^2 (even exponent)', () => {
				const node = superscript(abs(variable('x')), number('2'));
				const result = applyRules([...absRules], node);
				expect(nodesEqual(result, superscript(variable('x'), number('2')))).toBe(true);
			});

			it('simplifies |x|^4 to x^4', () => {
				const node = superscript(abs(variable('x')), number('4'));
				const result = applyRules([...absRules], node);
				expect(nodesEqual(result, superscript(variable('x'), number('4')))).toBe(true);
			});

			it('does not simplify |x|^3 (odd exponent)', () => {
				const node = superscript(abs(variable('x')), number('3'));
				const result = applyRules([...absRules], node);
				expect(nodesEqual(result, node)).toBe(true);
			});

			it('simplifies |x|^n to x^n when n declared even', () => {
				const ctx: TypeContext = {
					variables: new Map([['n', 'integer']]),
					assumptions: new Map([['n', { parity: 'even' }]])
				};
				const node = superscript(abs(variable('x')), variable('n'));
				const result = applyRules([...absRules], node, 100, ctx);
				expect(nodesEqual(result, superscript(variable('x'), variable('n')))).toBe(true);
			});

			it('simplifies (-a)^3 to -(a^3) (odd exponent)', () => {
				const node = superscript(opposite(variable('a')), number('3'));
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, opposite(superscript(variable('a'), number('3'))))).toBe(true);
			});

			it('simplifies (-a)^n to -(a^n) when n declared odd', () => {
				const ctx: TypeContext = {
					variables: new Map([['n', 'integer']]),
					assumptions: new Map([['n', { parity: 'odd' }]])
				};
				const node = superscript(opposite(variable('a')), variable('n'));
				const result = applyRules([...powerRules], node, 100, ctx);
				expect(nodesEqual(result, opposite(superscript(variable('a'), variable('n'))))).toBe(true);
			});

			it('simplifies sqrt(x^2) to |x|', () => {
				const node = func('sqrt', [superscript(variable('x'), number('2'))]);
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, abs(variable('x')))).toBe(true);
			});

			it('simplifies sqrt(a^2) to |a|', () => {
				const node = func('sqrt', [superscript(variable('a'), number('2'))]);
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, abs(variable('a')))).toBe(true);
			});

			it('simplifies (sqrt(x))^2 to x', () => {
				const node = superscript(func('sqrt', [variable('x')]), number('2'));
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, variable('x'))).toBe(true);
			});

			it('simplifies (sqrt(3))^2 to 3', () => {
				const node = superscript(func('sqrt', [number('3')]), number('2'));
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, number('3'))).toBe(true);
			});

			// ⚠️ Ce test attendait `x^(2*3)`, l'exposant NON réduit. Il enregistrait
			// une limitation : la règle construisait le produit des exposants et
			// personne ne le réduisait ensuite, l'exposant vivant à l'intérieur
			// d'une base que la forme normale traite comme opaque. Mesuré,
			// `(e^x)^3` rendait `e^x^3`, qui ne se relit même pas.
			it('simplifies (x^2)^3 to x^6 (power of power)', () => {
				const node = superscript(superscript(variable('x'), number('2')), number('3'));
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, superscript(variable('x'), number('6')))).toBe(true);
			});

			it('simplifies (a^m)^n to a^(m*n) with symbolic exponents', () => {
				const node = superscript(superscript(variable('a'), variable('m')), variable('n'));
				const result = applyRules([...powerRules], node);
				expect(
					nodesEqual(
						result,
						superscript(variable('a'), multiply(variable('m'), variable('n'), 'implicit'))
					)
				).toBe(true);
			});

			// Même raison que le bloc ci-dessus : `x^(2+3)` enregistrait la somme
			// non réduite.
			it('simplifies x^2 * x^3 to x^5 (same base product)', () => {
				const node = multiply(
					superscript(variable('x'), number('2')),
					superscript(variable('x'), number('3')),
					'implicit'
				);
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, superscript(variable('x'), number('5')))).toBe(true);
			});

			it('simplifies a^m * a^n to a^(m+n) with symbolic exponents', () => {
				const node = multiply(
					superscript(variable('a'), variable('m')),
					superscript(variable('a'), variable('n')),
					'implicit'
				);
				const result = applyRules([...powerRules], node);
				expect(
					nodesEqual(result, superscript(variable('a'), add(variable('m'), variable('n'))))
				).toBe(true);
			});

			it('does not simplify x^2 * y^3 (different bases)', () => {
				const node = multiply(
					superscript(variable('x'), number('2')),
					superscript(variable('y'), number('3')),
					'implicit'
				);
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, node)).toBe(true);
			});

			it('simplifies (a/b)^n to a^n / b^n', () => {
				const node = superscript(divide(variable('a'), variable('b'), 'fraction'), variable('n'));
				const result = applyRules([...powerRules], node);
				expect(
					nodesEqual(
						result,
						divide(
							superscript(variable('a'), variable('n')),
							superscript(variable('b'), variable('n')),
							'fraction'
						)
					)
				).toBe(true);
			});

			it('simplifies (x/2)^3 to x^3 / 2^3', () => {
				const node = superscript(divide(variable('x'), number('2'), 'fraction'), number('3'));
				const result = applyRules([...powerRules], node);
				expect(
					nodesEqual(
						result,
						divide(
							superscript(variable('x'), number('3')),
							superscript(number('2'), number('3')),
							'fraction'
						)
					)
				).toBe(true);
			});

			it('simplifies x^(-1) to 1/x', () => {
				const node = superscript(variable('x'), opposite(number('1')));
				const result = applyRules([...powerRules], node);
				expect(nodesEqual(result, divide(number('1'), variable('x'), 'fraction'))).toBe(true);
			});
		});

		describe('with logExpRules', () => {
			it('simplifies ln(e^x) to x', () => {
				const node = func('ln', [superscript(euler(), variable('x'))]);
				const result = applyRules([...logExpRules], node);
				expect(nodesEqual(result, variable('x'))).toBe(true);
			});

			it('simplifies ln(e^2) to 2', () => {
				const node = func('ln', [superscript(euler(), number('2'))]);
				const result = applyRules([...logExpRules], node);
				expect(nodesEqual(result, number('2'))).toBe(true);
			});

			it('simplifies e^(ln(x)) to x', () => {
				const node = superscript(euler(), func('ln', [variable('x')]));
				const result = applyRules([...logExpRules], node);
				expect(nodesEqual(result, variable('x'))).toBe(true);
			});

			it('simplifies e^(ln(5)) to 5', () => {
				const node = superscript(euler(), func('ln', [number('5')]));
				const result = applyRules([...logExpRules], node);
				expect(nodesEqual(result, number('5'))).toBe(true);
			});

			it('simplifies ln(2^x) to x*ln(2) via ln-pow rule', () => {
				const node = func('ln', [superscript(number('2'), variable('x'))]);
				const result = applyRules([...logExpRules], node);
				expect(
					nodesEqual(result, multiply(variable('x'), func('ln', [number('2')]), 'implicit'))
				).toBe(true);
			});

			it('does not simplify 2^(ln(x)) (base is not e)', () => {
				const node = superscript(number('2'), func('ln', [variable('x')]));
				const result = applyRules([...logExpRules], node);
				expect(nodesEqual(result, node)).toBe(true);
			});

			it('simplifies ln(1) to 0', () => {
				const node = func('ln', [number('1')]);
				const result = applyRules([...logExpRules], node);
				expect(nodesEqual(result, number('0'))).toBe(true);
			});

			it('simplifies ln(e) to 1', () => {
				const node = func('ln', [euler()]);
				const result = applyRules([...logExpRules], node);
				expect(nodesEqual(result, number('1'))).toBe(true);
			});

			it('simplifies ln(x^n) to n*ln(x)', () => {
				const node = func('ln', [superscript(variable('x'), variable('n'))]);
				const result = applyRules([...logExpRules], node);
				expect(
					nodesEqual(result, multiply(variable('n'), func('ln', [variable('x')]), 'implicit'))
				).toBe(true);
			});

			it('simplifies ln(x*y) to ln(x)+ln(y)', () => {
				const node = func('ln', [multiply(variable('x'), variable('y'), 'implicit')]);
				const result = applyRules([...logExpRules], node);
				expect(
					nodesEqual(result, add(func('ln', [variable('x')]), func('ln', [variable('y')])))
				).toBe(true);
			});

			it('simplifies ln(x/y) to ln(x)-ln(y)', () => {
				const node = func('ln', [divide(variable('x'), variable('y'), 'fraction')]);
				const result = applyRules([...logExpRules], node);
				const expected = {
					type: 'subtraction' as const,
					left: func('ln', [variable('x')]),
					right: func('ln', [variable('y')])
				};
				expect(result.type).toBe('subtraction');
				if (result.type === 'subtraction') {
					expect(nodesEqual(result.left, expected.left)).toBe(true);
					expect(nodesEqual(result.right, expected.right)).toBe(true);
				}
			});
		});

		describe('with sqrtRules', () => {
			it('simplifies sqrt(0) to 0', () => {
				const node = func('sqrt', [number('0')]);
				const result = applyRules([...sqrtRules], node);
				expect(nodesEqual(result, number('0'))).toBe(true);
			});

			it('simplifies sqrt(1) to 1', () => {
				const node = func('sqrt', [number('1')]);
				const result = applyRules([...sqrtRules], node);
				expect(nodesEqual(result, number('1'))).toBe(true);
			});

			it('simplifies sqrt(x)*sqrt(y) to sqrt(x*y)', () => {
				const node = multiply(
					func('sqrt', [variable('x')]),
					func('sqrt', [variable('y')]),
					'implicit'
				);
				const result = applyRules([...sqrtRules], node);
				expect(
					nodesEqual(result, func('sqrt', [multiply(variable('x'), variable('y'), 'implicit')]))
				).toBe(true);
			});

			it('simplifies sqrt(x/y) to sqrt(x)/sqrt(y)', () => {
				const node = func('sqrt', [divide(variable('x'), variable('y'), 'fraction')]);
				const result = applyRules([...sqrtRules], node);
				expect(
					nodesEqual(
						result,
						divide(func('sqrt', [variable('x')]), func('sqrt', [variable('y')]), 'fraction')
					)
				).toBe(true);
			});

			it('does not simplify sqrt(x) alone', () => {
				const node = func('sqrt', [variable('x')]);
				const result = applyRules([...sqrtRules], node);
				expect(nodesEqual(result, node)).toBe(true);
			});
		});

		describe('with trigRules', () => {
			// Helper to build angle nodes
			const piOver = (d: number) => fraction(piConstant(), number(String(d)));
			const kPiOver = (k: number, d: number) =>
				fraction(implicitMultiply(number(String(k)), piConstant()), number(String(d)));
			const kPi = (k: number) => implicitMultiply(number(String(k)), piConstant());

			// Helper for expected values
			const half = () => fraction(number('1'), number('2'));
			const sqrt2Over2 = () => fraction(func('sqrt', [number('2')]), number('2'));
			const sqrt3Over2 = () => fraction(func('sqrt', [number('3')]), number('2'));
			const sqrt3 = () => func('sqrt', [number('3')]);
			const sqrt3Over3 = () => fraction(func('sqrt', [number('3')]), number('3'));

			// --- sin ---
			it('simplifies sin(0) to 0', () => {
				const result = applyRules([...trigRules], func('sin', [number('0')]));
				expect(nodesEqual(result, number('0'))).toBe(true);
			});

			it('simplifies sin(π/6) to 1/2', () => {
				const result = applyRules([...trigRules], func('sin', [piOver(6)]));
				expect(nodesEqual(result, half())).toBe(true);
			});

			it('simplifies sin(π/4) to √2/2', () => {
				const result = applyRules([...trigRules], func('sin', [piOver(4)]));
				expect(nodesEqual(result, sqrt2Over2())).toBe(true);
			});

			it('simplifies sin(π/3) to √3/2', () => {
				const result = applyRules([...trigRules], func('sin', [piOver(3)]));
				expect(nodesEqual(result, sqrt3Over2())).toBe(true);
			});

			it('simplifies sin(π/2) to 1', () => {
				const result = applyRules([...trigRules], func('sin', [piOver(2)]));
				expect(nodesEqual(result, number('1'))).toBe(true);
			});

			it('simplifies sin(2π/3) to √3/2', () => {
				const result = applyRules([...trigRules], func('sin', [kPiOver(2, 3)]));
				expect(nodesEqual(result, sqrt3Over2())).toBe(true);
			});

			it('simplifies sin(π) to 0', () => {
				const result = applyRules([...trigRules], func('sin', [piConstant()]));
				expect(nodesEqual(result, number('0'))).toBe(true);
			});

			it('simplifies sin(3π/2) to -1', () => {
				const result = applyRules([...trigRules], func('sin', [kPiOver(3, 2)]));
				expect(nodesEqual(result, opposite(number('1')))).toBe(true);
			});

			it('simplifies sin(11π/6) to -1/2', () => {
				const result = applyRules([...trigRules], func('sin', [kPiOver(11, 6)]));
				expect(nodesEqual(result, opposite(half()))).toBe(true);
			});

			// --- cos ---
			it('simplifies cos(0) to 1', () => {
				const result = applyRules([...trigRules], func('cos', [number('0')]));
				expect(nodesEqual(result, number('1'))).toBe(true);
			});

			it('simplifies cos(π/6) to √3/2', () => {
				const result = applyRules([...trigRules], func('cos', [piOver(6)]));
				expect(nodesEqual(result, sqrt3Over2())).toBe(true);
			});

			it('simplifies cos(π/3) to 1/2', () => {
				const result = applyRules([...trigRules], func('cos', [piOver(3)]));
				expect(nodesEqual(result, half())).toBe(true);
			});

			it('simplifies cos(π/2) to 0', () => {
				const result = applyRules([...trigRules], func('cos', [piOver(2)]));
				expect(nodesEqual(result, number('0'))).toBe(true);
			});

			it('simplifies cos(π) to -1', () => {
				const result = applyRules([...trigRules], func('cos', [piConstant()]));
				expect(nodesEqual(result, opposite(number('1')))).toBe(true);
			});

			it('simplifies cos(3π/2) to 0', () => {
				const result = applyRules([...trigRules], func('cos', [kPiOver(3, 2)]));
				expect(nodesEqual(result, number('0'))).toBe(true);
			});

			it('simplifies cos(5π/3) to 1/2', () => {
				const result = applyRules([...trigRules], func('cos', [kPiOver(5, 3)]));
				expect(nodesEqual(result, half())).toBe(true);
			});

			// --- tan ---
			it('simplifies tan(0) to 0', () => {
				const result = applyRules([...trigRules], func('tan', [number('0')]));
				expect(nodesEqual(result, number('0'))).toBe(true);
			});

			it('simplifies tan(π/6) to √3/3', () => {
				const result = applyRules([...trigRules], func('tan', [piOver(6)]));
				expect(nodesEqual(result, sqrt3Over3())).toBe(true);
			});

			it('simplifies tan(π/4) to 1', () => {
				const result = applyRules([...trigRules], func('tan', [piOver(4)]));
				expect(nodesEqual(result, number('1'))).toBe(true);
			});

			it('simplifies tan(π/3) to √3', () => {
				const result = applyRules([...trigRules], func('tan', [piOver(3)]));
				expect(nodesEqual(result, sqrt3())).toBe(true);
			});

			it('simplifies tan(π) to 0', () => {
				const result = applyRules([...trigRules], func('tan', [piConstant()]));
				expect(nodesEqual(result, number('0'))).toBe(true);
			});

			it('simplifies tan(3π/4) to -1', () => {
				const result = applyRules([...trigRules], func('tan', [kPiOver(3, 4)]));
				expect(nodesEqual(result, opposite(number('1')))).toBe(true);
			});

			// --- Angle reduction ---
			it('simplifies sin(2π) to 0 (angle reduction)', () => {
				const result = applyRules([...trigRules], func('sin', [kPi(2)]));
				expect(nodesEqual(result, number('0'))).toBe(true);
			});

			it('simplifies cos(2π) to 1 (angle reduction)', () => {
				const result = applyRules([...trigRules], func('cos', [kPi(2)]));
				expect(nodesEqual(result, number('1'))).toBe(true);
			});

			// --- Negative angles ---
			it('simplifies sin(-π/6) to -1/2 (via angle reduction)', () => {
				const result = applyRules([...trigRules], func('sin', [opposite(piOver(6))]));
				expect(nodesEqual(result, opposite(half()))).toBe(true);
			});

			it('simplifies cos(-π/3) to 1/2 (via angle reduction)', () => {
				const result = applyRules([...trigRules], func('cos', [opposite(piOver(3))]));
				expect(nodesEqual(result, half())).toBe(true);
			});

			// --- Does not simplify non-remarkable ---
			it('does not simplify sin(x)', () => {
				const node = func('sin', [variable('x')]);
				const result = applyRules([...trigRules], node);
				expect(nodesEqual(result, node)).toBe(true);
			});

			it('does not simplify tan(π/2) (undefined)', () => {
				const node = func('tan', [piOver(2)]);
				const result = applyRules([...trigRules], node);
				expect(nodesEqual(result, node)).toBe(true);
			});
		});

		describe('with absRules', () => {
			it('simplifies |x^2| to x^2 (even exponent)', () => {
				const node = abs(superscript(variable('x'), number('2')));
				const result = applyRules([...absRules], node);
				expect(nodesEqual(result, superscript(variable('x'), number('2')))).toBe(true);
			});

			it('simplifies |a^4| to a^4', () => {
				const node = abs(superscript(variable('a'), number('4')));
				const result = applyRules([...absRules], node);
				expect(nodesEqual(result, superscript(variable('a'), number('4')))).toBe(true);
			});

			it('does not simplify |x^3| (odd exponent)', () => {
				const node = abs(superscript(variable('x'), number('3')));
				const result = applyRules([...absRules], node);
				expect(nodesEqual(result, node)).toBe(true);
			});

			it('simplifies |x^n| to x^n when n declared even', () => {
				const ctx: TypeContext = {
					variables: new Map([['n', 'integer']]),
					assumptions: new Map([['n', { parity: 'even' }]])
				};
				const node = abs(superscript(variable('x'), variable('n')));
				const result = applyRules([...absRules], node, 100, ctx);
				expect(nodesEqual(result, superscript(variable('x'), variable('n')))).toBe(true);
			});
		});

		describe('with functionParityRules', () => {
			it('simplifies sin(-x) to -sin(x) (odd)', () => {
				const node = func('sin', [opposite(variable('x'))]);
				const result = applyRules([...functionParityRules], node);
				expect(nodesEqual(result, opposite(func('sin', [variable('x')])))).toBe(true);
			});

			it('simplifies cos(-x) to cos(x) (even)', () => {
				const node = func('cos', [opposite(variable('x'))]);
				const result = applyRules([...functionParityRules], node);
				expect(nodesEqual(result, func('cos', [variable('x')]))).toBe(true);
			});

			it('simplifies tan(-x) to -tan(x) (odd)', () => {
				const node = func('tan', [opposite(variable('x'))]);
				const result = applyRules([...functionParityRules], node);
				expect(nodesEqual(result, opposite(func('tan', [variable('x')])))).toBe(true);
			});

			it('simplifies cosh(-x) to cosh(x) (even)', () => {
				const node = func('cosh', [opposite(variable('x'))]);
				const result = applyRules([...functionParityRules], node);
				expect(nodesEqual(result, func('cosh', [variable('x')]))).toBe(true);
			});

			it('simplifies arcsin(-x) to -arcsin(x) (odd)', () => {
				const node = func('arcsin', [opposite(variable('x'))]);
				const result = applyRules([...functionParityRules], node);
				expect(nodesEqual(result, opposite(func('arcsin', [variable('x')])))).toBe(true);
			});

			it('does not simplify sin(x) (no negation)', () => {
				const node = func('sin', [variable('x')]);
				const result = applyRules([...functionParityRules], node);
				expect(nodesEqual(result, node)).toBe(true);
			});

			it('has one rule per even/odd function', () => {
				// 5 even + 12 odd = 17 rules
				expect(functionParityRules.length).toBe(17);
			});

			it('all rules have names', () => {
				for (const rule of functionParityRules) {
					expect(rule.name).not.toBe('unnamed-rule');
				}
			});
		});

		describe('with allPatternRules', () => {
			it('simplifies x^1 + 0 to x', () => {
				const expr = parseLatex('x^1 + 0');
				const simplified = simplifyWith(expr, allPatternRules);

				expect(toLatex(simplified)).toBe('x');
			});

			it('simplifies (x * 1)^0 to 1', () => {
				const expr = parseLatex('(x \\cdot 1)^0');
				const simplified = simplifyWith(expr, allPatternRules);

				expect(toLatex(simplified)).toBe('1');
			});

			it('simplifies complex expression', () => {
				// ((a + 0) * 1)^1 / 1
				const expr = parseLatex('\\frac{((a + 0) \\cdot 1)^1}{1}');
				const simplified = simplifyWith(expr, allPatternRules);

				// Parentheses are preserved, inner expressions simplify
				expect(toLatex(simplified)).toBe('\\left( \\left( a \\right) \\right)');
			});

			it('simplifies expression with zero multiplication', () => {
				// (complex expr) * 0 should become 0
				const expr = parseLatex('(x^2 + 3x - 5) \\cdot 0');
				const simplified = simplifyWith(expr, allPatternRules);

				expect(toLatex(simplified)).toBe('0');
			});

			it('simplifies double negation in nested expression', () => {
				// (--a) + 0 -> (a)
				const expr = parseLatex('(--a) + 0');
				const simplified = simplifyWith(expr, allPatternRules);

				// Parentheses are preserved
				expect(toLatex(simplified)).toBe('\\left( a \\right)');
			});
		});

		describe('with maxIterations', () => {
			it('respects maxIterations limit', () => {
				// Use expression without parentheses to avoid preserved delimiters
				const expr = parseLatex('x + 0 + 0 + 0 + 0 + 0');

				// With very few iterations, might not fully simplify
				const _partialSimplified = simplifyWith(expr, arithmeticRules, 2);

				// With enough iterations, should fully simplify
				const fullySimplified = simplifyWith(expr, arithmeticRules, 100);

				expect(toLatex(fullySimplified)).toBe('x');
			});
		});
	});

	// ===========================================================================
	// Rule Sets Direct Usage
	// ===========================================================================

	describe('Rule Sets Direct Usage', () => {
		describe('arithmeticRules', () => {
			it('contains expected number of rules', () => {
				// Should have rules for +, -, *, / identities and special cases
				expect(arithmeticRules.length).toBeGreaterThanOrEqual(14);
			});

			it('all rules have names', () => {
				for (const rule of arithmeticRules) {
					expect(rule.name).toBeDefined();
					expect(rule.name).not.toBe('unnamed-rule');
				}
			});

			it('rules can be applied via applyRules directly', () => {
				const node = add(variable('x'), number('0'));
				const result = applyRules([...arithmeticRules], node);

				expect(nodesEqual(result, variable('x'))).toBe(true);
			});
		});

		describe('powerRules', () => {
			it('contains expected number of rules', () => {
				// Should have at least 4 power rules
				expect(powerRules.length).toBeGreaterThanOrEqual(4);
			});

			it('all rules have names', () => {
				for (const rule of powerRules) {
					expect(rule.name).toBeDefined();
					expect(rule.name).not.toBe('unnamed-rule');
				}
			});

			it('rules can be applied via applyRules directly', () => {
				const node = superscript(variable('x'), number('1'));
				const result = applyRules([...powerRules], node);

				expect(nodesEqual(result, variable('x'))).toBe(true);
			});
		});

		describe('allPatternRules', () => {
			it('combines all rule sets', () => {
				expect(allPatternRules.length).toBe(
					arithmeticRules.length +
						powerRules.length +
						absRules.length +
						logExpRules.length +
						sqrtRules.length +
						trigRules.length +
						functionParityRules.length
				);
			});

			it('includes all arithmetic rules', () => {
				for (const rule of arithmeticRules) {
					expect(allPatternRules).toContain(rule);
				}
			});

			it('includes all power rules', () => {
				for (const rule of powerRules) {
					expect(allPatternRules).toContain(rule);
				}
			});
		});
	});

	// ===========================================================================
	// Edge Cases
	// ===========================================================================

	describe('Edge Cases', () => {
		it('handles empty expression correctly', () => {
			const expr = number('0');
			const simplified = simplifyWith(expr, allPatternRules);

			expect(toLatex(simplified)).toBe('0');
		});

		it('handles variables only', () => {
			const expr = variable('x');
			const simplified = simplifyWith(expr, allPatternRules);

			expect(toLatex(simplified)).toBe('x');
		});

		it('handles deeply nested parentheses', () => {
			const expr = parseLatex('(((x + 0)))');
			const simplified = simplifyWith(expr, arithmeticRules);

			// Parentheses are preserved but inner expression simplified
			expect(simplified.type).toBe('delimiter');
		});

		it('handles expression with no applicable rules', () => {
			const expr = parseLatex('x + y + z');
			const simplified = simplifyWith(expr, allPatternRules);

			// Should remain unchanged
			expect(toLatex(simplified)).toBe('x + y + z');
		});

		it('immutability: original expression unchanged', () => {
			const original = parseLatex('x + 0');
			const simplified = simplifyWith(original, arithmeticRules);

			expect(toLatex(original)).toBe('x + 0');
			expect(toLatex(simplified)).toBe('x');
		});
	});

	// ===========================================================================
	// Real-World Scenarios
	// ===========================================================================

	describe('Real-World Scenarios', () => {
		it('simplifies polynomial with identity terms', () => {
			// x^2 + 0 should simplify to x^2
			const expr = parseLatex('x^2 + 0');
			const simplified = simplifyWith(expr, allPatternRules);

			// Single digit exponent doesn't need braces
			expect(toLatex(simplified)).toBe('x^2');
		});

		it('simplifies fraction that equals 1', () => {
			const expr = parseLatex('\\frac{2x + 1}{2x + 1}');
			const simplified = simplifyWith(expr, arithmeticRules);

			expect(toLatex(simplified)).toBe('1');
		});

		it('simplifies power of product', () => {
			// (ab)^1 -> (ab)
			const expr = parseLatex('(a b)^1');
			const simplified = simplifyWith(expr, powerRules);

			// Parentheses are preserved
			expect(toLatex(simplified)).toBe('\\left( a b \\right)');
		});

		it('handles subtraction that results in zero', () => {
			const expr = parseLatex('(a + b) - (a + b)');
			const simplified = simplifyWith(expr, arithmeticRules);

			expect(toLatex(simplified)).toBe('0');
		});
	});
});
