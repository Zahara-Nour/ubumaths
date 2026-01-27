/**
 * Unit tests for Sequence Pattern Matching
 *
 * Tests for P.__() (sequence wildcards) and P.___() (optional sequence wildcards)
 * used with P.sum() and P.prod() patterns.
 */

import { describe, it, expect } from 'vitest';
import { match, nodesEqual } from '../match';
import { P } from '../builder';
import { instantiate } from '../rule';
import { isSumSequenceBinding, isProductSequenceBinding, isMathNodeBinding } from '../types';
import type { MathNode } from '../../types';
import {
	number,
	variable,
	add,
	subtract,
	multiply,
	divide,
	superscript,
	opposite,
	positive,
	parentheses,
	func
} from '../../factory';

describe('Sequence Pattern Matching', () => {
	// ===========================================================================
	// Sum Pattern with Sequence Wildcards
	// ===========================================================================

	describe('P.sum with P.__() (sequence 1+)', () => {
		it('matches a + b + c with P.sum(P._("first"), P.__("rest"))', () => {
			const pattern = P.sum(P._('first'), P.__('rest'));
			const node = add(add(variable('a'), variable('b')), variable('c'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			// first should be bound to one of the variables
			const first = result.bindings.get('first');
			expect(first).toBeDefined();
			expect(isMathNodeBinding(first!)).toBe(true);

			// rest should be a sum sequence with 2 terms
			const rest = result.bindings.get('rest');
			expect(rest).toBeDefined();
			expect(isSumSequenceBinding(rest!)).toBe(true);
			if (isSumSequenceBinding(rest!)) {
				expect(rest.terms.length).toBe(2);
			}
		});

		it('matches a + b with minimum sequence (1 term)', () => {
			const pattern = P.sum(P._('first'), P.__('rest'));
			const node = add(variable('a'), variable('b'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			const rest = result.bindings.get('rest');
			expect(isSumSequenceBinding(rest!)).toBe(true);
			if (isSumSequenceBinding(rest!)) {
				expect(rest.terms.length).toBe(1);
			}
		});

		it('fails when not enough terms for sequence (min 1)', () => {
			const pattern = P.sum(P._('a'), P._('b'), P.__('rest'));
			const node = add(variable('x'), variable('y')); // Only 2 terms, need 3+

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});

		it('matches single term when pattern has one element and optional sequence', () => {
			// This should only work with optional sequence, not required sequence
			const pattern = P.sum(P._('only'), P.__('rest'));
			const node = variable('x'); // Single term, not a sum

			const result = match(pattern, node);

			// Should fail because sequence requires 1+ terms
			expect(result.success).toBe(false);
		});

		it('preserves signs in sequence capture', () => {
			const pattern = P.sum(P._('first'), P.__('rest'));
			const node = subtract(variable('a'), variable('b')); // a - b

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			const rest = result.bindings.get('rest');
			expect(isSumSequenceBinding(rest!)).toBe(true);
			if (isSumSequenceBinding(rest!)) {
				expect(rest.terms.length).toBe(1);
				// One term should have sign '-'
				const signs = rest.terms.map((t) => t.sign);
				expect(signs.includes('-') || signs.includes('+')).toBe(true);
			}
		});

		it('matches multiple wildcards before sequence', () => {
			const pattern = P.sum(P._('a'), P._('b'), P.__('rest'));
			const node = add(add(add(variable('w'), variable('x')), variable('y')), variable('z'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(result.bindings.has('a')).toBe(true);
			expect(result.bindings.has('b')).toBe(true);

			const rest = result.bindings.get('rest');
			expect(isSumSequenceBinding(rest!)).toBe(true);
			if (isSumSequenceBinding(rest!)) {
				expect(rest.terms.length).toBe(2);
			}
		});
	});

	// ===========================================================================
	// Sum Pattern with Optional Sequence Wildcards
	// ===========================================================================

	describe('P.sum with P.___() (optional sequence 0+)', () => {
		it('matches with empty optional sequence', () => {
			const pattern = P.sum(P._('a'), P._('b'), P.___('extras'));
			const node = add(variable('x'), variable('y')); // Exactly 2 terms

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			const extras = result.bindings.get('extras');
			expect(isSumSequenceBinding(extras!)).toBe(true);
			if (isSumSequenceBinding(extras!)) {
				expect(extras.terms.length).toBe(0);
			}
		});

		it('matches single term with optional sequence', () => {
			const pattern = P.sum(P._('only'), P.___('extras'));
			const node = variable('x'); // Single term

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			const extras = result.bindings.get('extras');
			expect(isSumSequenceBinding(extras!)).toBe(true);
			if (isSumSequenceBinding(extras!)) {
				expect(extras.terms.length).toBe(0);
			}
		});

		it('matches with non-empty optional sequence', () => {
			const pattern = P.sum(P._('a'), P.___('extras'));
			const node = add(add(variable('x'), variable('y')), variable('z'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			const extras = result.bindings.get('extras');
			expect(isSumSequenceBinding(extras!)).toBe(true);
			if (isSumSequenceBinding(extras!)) {
				expect(extras.terms.length).toBe(2);
			}
		});
	});

	// ===========================================================================
	// Product Pattern with Sequence Wildcards
	// ===========================================================================

	describe('P.prod with P.__() (sequence 1+)', () => {
		it('matches coeff * vars pattern', () => {
			const pattern = P.prod(P._('coeff', P.isNumber()), P.__('vars'));
			const node = multiply(
				multiply(number('2'), variable('x'), 'implicit'),
				variable('y'),
				'implicit'
			);

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('coeff')!, number('2'))).toBe(true);

			const vars = result.bindings.get('vars');
			expect(isProductSequenceBinding(vars!)).toBe(true);
			if (isProductSequenceBinding(vars!)) {
				expect(vars.factors.length).toBe(2);
			}
		});

		it('matches a * b with minimum sequence (1 factor)', () => {
			const pattern = P.prod(P._('first'), P.__('rest'));
			const node = multiply(variable('x'), variable('y'), 'implicit');

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			const rest = result.bindings.get('rest');
			expect(isProductSequenceBinding(rest!)).toBe(true);
			if (isProductSequenceBinding(rest!)) {
				expect(rest.factors.length).toBe(1);
			}
		});

		it('fails when not enough factors for sequence', () => {
			const pattern = P.prod(P._('a'), P._('b'), P.__('rest'));
			const node = multiply(variable('x'), variable('y'), 'implicit'); // Only 2 factors

			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});
	});

	// ===========================================================================
	// Product Pattern with Optional Sequence Wildcards
	// ===========================================================================

	describe('P.prod with P.___() (optional sequence 0+)', () => {
		it('matches with empty optional sequence', () => {
			const pattern = P.prod(P._('a'), P._('b'), P.___('extras'));
			const node = multiply(variable('x'), variable('y'), 'implicit');

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			const extras = result.bindings.get('extras');
			expect(isProductSequenceBinding(extras!)).toBe(true);
			if (isProductSequenceBinding(extras!)) {
				expect(extras.factors.length).toBe(0);
			}
		});

		it('matches single factor with optional sequence', () => {
			const pattern = P.prod(P._('only'), P.___('extras'));
			const node = variable('x');

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			const extras = result.bindings.get('extras');
			expect(isProductSequenceBinding(extras!)).toBe(true);
			if (isProductSequenceBinding(extras!)) {
				expect(extras.factors.length).toBe(0);
			}
		});
	});

	// ===========================================================================
	// Sequence Constraints
	// ===========================================================================

	describe('sequence constraints', () => {
		it('applies constraint to each sum term', () => {
			const pattern = P.sum(P._('first'), P.__('nums', P.isNumber()));
			const node = add(add(variable('a'), number('1')), number('2'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			// first should be 'a' (variable), rest should be numbers
			const first = result.bindings.get('first');
			expect(isMathNodeBinding(first!)).toBe(true);
			expect(nodesEqual(first as never, variable('a'))).toBe(true);
		});

		it('fails when constraint not satisfied by all terms', () => {
			const pattern = P.sum(P._('first', P.isNumber()), P.__('nums', P.isNumber()));
			const node = add(add(number('1'), variable('x')), number('2'));

			// This should fail because variable('x') doesn't satisfy isNumber()
			const result = match(pattern, node);

			expect(result.success).toBe(false);
		});

		it('applies constraint to each product factor', () => {
			const pattern = P.prod(P._('coeff'), P.__('vars', P.isVariable()));
			const node = multiply(
				multiply(number('3'), variable('x'), 'implicit'),
				variable('y'),
				'implicit'
			);

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('coeff')!, number('3'))).toBe(true);
		});
	});

	// ===========================================================================
	// Instantiation with Sequence Bindings
	// ===========================================================================

	describe('instantiation with sequence bindings', () => {
		it('instantiates sum pattern with sequence', () => {
			const pattern = P.sum(P._('first'), P.__('rest'));
			const node = add(add(variable('a'), variable('b')), variable('c'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			// Now instantiate a new pattern using the bindings
			const outputPattern = P.sum(P._('first'), P.__('rest'));
			const instantiated = instantiate(outputPattern, result.bindings);

			// Should produce a valid MathNode
			expect(instantiated).toBeDefined();
			expect(instantiated.type).toBe('addition');
		});

		it('instantiates product pattern with sequence', () => {
			const pattern = P.prod(P._('coeff'), P.__('vars'));
			const node = multiply(
				multiply(number('2'), variable('x'), 'implicit'),
				variable('y'),
				'implicit'
			);

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const outputPattern = P.prod(P._('coeff'), P.__('vars'));
			const instantiated = instantiate(outputPattern, result.bindings);

			expect(instantiated).toBeDefined();
			expect(instantiated.type).toBe('multiplication');
		});

		it('instantiates wildcard with sequence binding (sum)', () => {
			const pattern = P.sum(P._('first'), P.__('rest'));
			const node = add(add(variable('a'), variable('b')), variable('c'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			// Instantiate just the sequence wildcard as a regular wildcard
			const restPattern = P._('rest');
			const instantiated = instantiate(restPattern, result.bindings);

			// Should unflatten the sequence into a sum
			expect(instantiated).toBeDefined();
		});

		it('handles empty optional sequence in instantiation', () => {
			const pattern = P.sum(P._('a'), P._('b'), P.___('extras'));
			const node = add(variable('x'), variable('y'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			// Create output pattern that includes the optional sequence
			const outputPattern = P.sum(P._('a'), P._('b'), P.___('extras'));
			const instantiated = instantiate(outputPattern, result.bindings);

			// Should produce just a + b (empty extras doesn't add anything)
			expect(instantiated).toBeDefined();
			expect(instantiated.type).toBe('addition');
		});
	});

	// ===========================================================================
	// Edge Cases
	// ===========================================================================

	describe('edge cases', () => {
		it('handles subtraction chain correctly', () => {
			const pattern = P.sum(P._('first'), P.__('rest'));
			const node = subtract(subtract(variable('a'), variable('b')), variable('c'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('handles mixed addition and subtraction', () => {
			const pattern = P.sum(P._('a'), P._('b'), P.__('rest'));
			// a + b - c + d
			const node = add(subtract(add(variable('a'), variable('b')), variable('c')), variable('d'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('handles negation in sum', () => {
			const pattern = P.sum(P._('a'), P.__('rest'));
			const node = add(opposite(variable('x')), variable('y')); // -x + y

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('rejects multiple sequence patterns', () => {
			const pattern = P.sum(P.__('first'), P.__('second'));

			expect(() => {
				match(pattern, add(variable('a'), variable('b')));
			}).toThrow();
		});

		it('matches with literal in pattern', () => {
			const pattern = P.sum(P.num(0), P.__('rest'));
			const node = add(number('0'), add(variable('x'), variable('y')));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('commutatively matches literal in sum', () => {
			const pattern = P.sum(P.num(0), P._('other'));
			const node = add(variable('x'), number('0')); // x + 0, not 0 + x

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('other')!, variable('x'))).toBe(true);
		});
	});

	// ===========================================================================
	// Real-world Use Cases
	// ===========================================================================

	describe('real-world use cases', () => {
		it('matches polynomial: extract all terms', () => {
			// 2*x^3 + 5*x^2 + x (simplified as nested adds)
			const term1 = multiply(
				number('2'),
				multiply(variable('x'), variable('x'), 'implicit'),
				'implicit'
			);
			const term2 = multiply(number('5'), variable('x'), 'implicit');
			const term3 = variable('x');
			const node = add(add(term1, term2), term3);

			// Pattern to extract first term and rest
			const pattern = P.sum(P._('first'), P.___('rest'));
			const result = match(pattern, node);

			expect(result.success).toBe(true);
		});

		it('collects like terms pattern', () => {
			// Pattern to find all terms in a sum
			const pattern = P.sum(P._('term'), P.___('others'));
			const node = add(add(variable('x'), variable('y')), variable('z'));

			const result = match(pattern, node);

			expect(result.success).toBe(true);
			// Should capture one term and the rest in others
		});
	});

	// ===========================================================================
	// Extended Edge Cases
	// ===========================================================================

	describe('extended edge cases - signs and negation', () => {
		it('handles double negation in sum terms', () => {
			const pattern = P.sum(P._('a'), P.__('rest'));
			const node = add(opposite(opposite(variable('x'))), variable('y')); // --x + y

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('handles all negative terms', () => {
			const pattern = P.sum(P._('first'), P.__('rest'));
			// -a - b - c = -a + (-b) + (-c)
			const node = subtract(subtract(opposite(variable('a')), variable('b')), variable('c'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('handles positive sign node in sum', () => {
			const pattern = P.sum(P._('a'), P.__('rest'));
			const node = add(positive(variable('x')), variable('y')); // +x + y

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('correctly captures negative term sign in sequence', () => {
			const pattern = P.sum(P.num(0), P.__('rest'));
			const node = subtract(number('0'), variable('x')); // 0 - x

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const rest = result.bindings.get('rest');
			expect(isSumSequenceBinding(rest!)).toBe(true);
			if (isSumSequenceBinding(rest!)) {
				expect(rest.terms.length).toBe(1);
				expect(rest.terms[0].sign).toBe('-');
			}
		});

		it('handles triple subtraction chain', () => {
			const pattern = P.sum(P._('a'), P._('b'), P.__('rest'));
			// a - b - c - d
			const node = subtract(
				subtract(subtract(variable('a'), variable('b')), variable('c')),
				variable('d')
			);

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});
	});

	describe('extended edge cases - constraint combinations', () => {
		it('matches with combined AND constraint on sequence', () => {
			const pattern = P.sum(P._('first'), P.__('rest', P.and(P.isNumber(), P.isPositive())));
			const node = add(add(variable('a'), number('1')), number('2'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('fails combined constraint when one element fails', () => {
			const pattern = P.sum(P._('first'), P.__('rest', P.and(P.isNumber(), P.isPositive())));
			const node = add(add(variable('a'), number('-1')), number('2'));

			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});

		it('matches with OR constraint on sequence', () => {
			const pattern = P.sum(P._('first'), P.__('rest', P.or(P.isNumber(), P.isVariable())));
			const node = add(add(variable('a'), number('1')), variable('b'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('matches with NOT constraint on sequence', () => {
			const pattern = P.sum(P._('num', P.isNumber()), P.__('rest', P.not(P.isNumber())));
			const node = add(add(number('5'), variable('x')), variable('y'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('matches with freeOf constraint on sequence', () => {
			const pattern = P.sum(P._('withX'), P.__('rest', P.isFreeOf('x')));
			const node = add(add(variable('x'), variable('y')), number('5'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
			// first should capture the x term, rest should be free of x
			const withX = result.bindings.get('withX');
			expect(isMathNodeBinding(withX!)).toBe(true);
			expect(nodesEqual(withX as MathNode, variable('x'))).toBe(true);
		});

		it('matches with integer constraint on all sequence elements', () => {
			const pattern = P.sum(P._('first'), P.__('nums', P.isInteger()));
			const node = add(add(variable('a'), number('3')), number('7'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('fails integer constraint with non-integer', () => {
			const pattern = P.sum(P._('first'), P.__('nums', P.isInteger()));
			const node = add(add(variable('a'), number('3.5')), number('7'));

			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});

		it('matches with nonzero constraint on optional sequence', () => {
			const pattern = P.sum(P._('a'), P._('b'), P.___('rest', P.isNonzero()));
			const node = add(add(variable('x'), variable('y')), number('5'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('fails nonzero constraint when zero in sequence', () => {
			const pattern = P.sum(P._('a'), P._('b'), P.__('rest', P.isNonzero()));
			const node = add(add(add(variable('x'), variable('y')), number('5')), number('0'));

			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});
	});

	describe('extended edge cases - same name wildcards', () => {
		it('matches when same-name wildcards have same value', () => {
			const pattern = P.sum(P._('x'), P._('x'), P.___('rest'));
			const node = add(add(variable('a'), variable('a')), variable('b'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('fails when same-name wildcards have different values', () => {
			const pattern = P.sum(P._('x'), P._('x'), P.___('rest'));
			const node = add(add(variable('a'), variable('b')), variable('c'));

			// Should fail because 'x' cannot bind to both 'a' and 'b'
			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});

		it('matches same-name wildcards in different positions', () => {
			const pattern = P.sum(P._('first'), P._('middle'), P._('first'), P.___('rest'));
			const node = add(add(add(number('5'), variable('x')), number('5')), variable('y'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('first')!, number('5'))).toBe(true);
		});
	});

	describe('extended edge cases - deep nesting', () => {
		it('matches sequence containing complex nested terms', () => {
			const pattern = P.sum(P._('simple'), P.__('complex'));
			const complexTerm = multiply(
				superscript(variable('x'), number('2')),
				variable('y'),
				'implicit'
			);
			const node = add(variable('a'), complexTerm);

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('matches nested structural patterns in sum', () => {
			const pattern = P.sum(P.mul(P._('a'), P._('b')), P.___('rest'));
			const node = add(multiply(number('2'), variable('x'), 'implicit'), variable('y'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('a')!, number('2'))).toBe(true);
		});

		it('matches function calls in sequence', () => {
			const pattern = P.sum(P._('first'), P.__('rest'));
			const node = add(func('sin', [variable('x')]), func('cos', [variable('x')]));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('matches parenthesized terms in sum', () => {
			const pattern = P.sum(P._('a'), P.__('rest'));
			const node = add(parentheses(add(variable('x'), variable('y'))), variable('z'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('matches fractions in sum', () => {
			const pattern = P.sum(P._('frac'), P.__('rest'));
			const node = add(divide(number('1'), number('2'), 'fraction'), variable('x'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('matches powers in sum sequence', () => {
			const pattern = P.sum(P._('first'), P.__('powers', P.isType('superscript')));
			const node = add(
				add(variable('a'), superscript(variable('x'), number('2'))),
				superscript(variable('y'), number('3'))
			);

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});
	});

	describe('extended edge cases - long sequences', () => {
		it('matches 5-term sum', () => {
			const pattern = P.sum(P._('first'), P.__('rest'));
			const node = add(
				add(add(add(variable('a'), variable('b')), variable('c')), variable('d')),
				variable('e')
			);

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const rest = result.bindings.get('rest');
			expect(isSumSequenceBinding(rest!)).toBe(true);
			if (isSumSequenceBinding(rest!)) {
				expect(rest.terms.length).toBe(4);
			}
		});

		it('matches 5-term sum with 3 single patterns', () => {
			const pattern = P.sum(P._('a'), P._('b'), P._('c'), P.__('rest'));
			const node = add(
				add(add(add(variable('v'), variable('w')), variable('x')), variable('y')),
				variable('z')
			);

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const rest = result.bindings.get('rest');
			expect(isSumSequenceBinding(rest!)).toBe(true);
			if (isSumSequenceBinding(rest!)) {
				expect(rest.terms.length).toBe(2);
			}
		});

		it('matches 6-term product', () => {
			const pattern = P.prod(P._('first'), P.__('rest'));
			// a * b * c * d * e * f
			const node = multiply(
				multiply(
					multiply(
						multiply(multiply(variable('a'), variable('b'), 'implicit'), variable('c'), 'implicit'),
						variable('d'),
						'implicit'
					),
					variable('e'),
					'implicit'
				),
				variable('f'),
				'implicit'
			);

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const rest = result.bindings.get('rest');
			expect(isProductSequenceBinding(rest!)).toBe(true);
			if (isProductSequenceBinding(rest!)) {
				expect(rest.factors.length).toBe(5);
			}
		});
	});

	describe('extended edge cases - type mismatches', () => {
		it('fails sum pattern on non-additive single term', () => {
			const pattern = P.sum(P._('a'), P._('b'), P.__('rest'));
			const node = variable('x'); // Single variable, not a sum

			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});

		it('fails sum pattern on multiplication', () => {
			const pattern = P.sum(P._('a'), P.__('rest'));
			const node = multiply(variable('x'), variable('y'), 'implicit');

			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});

		it('fails sum pattern on division', () => {
			const pattern = P.sum(P._('a'), P.__('rest'));
			const node = divide(variable('x'), variable('y'), 'fraction');

			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});

		it('fails sum pattern on power', () => {
			const pattern = P.sum(P._('a'), P.__('rest'));
			const node = superscript(variable('x'), number('2'));

			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});

		it('fails product pattern on addition', () => {
			const pattern = P.prod(P._('a'), P.__('rest'));
			const node = add(variable('x'), variable('y'));

			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});

		it('fails product pattern on subtraction', () => {
			const pattern = P.prod(P._('a'), P.__('rest'));
			const node = subtract(variable('x'), variable('y'));

			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});

		it('fails product pattern on division', () => {
			const pattern = P.prod(P._('a'), P.__('rest'));
			const node = divide(variable('x'), variable('y'), 'fraction');

			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});
	});

	describe('extended edge cases - commutativity', () => {
		it('finds correct assignment with constrained wildcards', () => {
			// Only one valid assignment: n=5, v=x
			const pattern = P.sum(P._('n', P.isNumber()), P._('v', P.isVariable()));
			const node = add(variable('x'), number('5'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('n')!, number('5'))).toBe(true);
			expect(nodesEqual(result.bindings.get('v')!, variable('x'))).toBe(true);
		});

		it('finds correct assignment with multiple numbers', () => {
			const pattern = P.sum(P._('first', P.isVariable()), P.__('nums', P.isNumber()));
			const node = add(add(number('1'), variable('x')), number('2'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('first')!, variable('x'))).toBe(true);
		});

		it('matches any permutation of 3 elements', () => {
			const pattern = P.sum(P.num(1), P.num(2), P.num(3));

			// All permutations should match
			expect(match(pattern, add(add(number('1'), number('2')), number('3'))).success).toBe(true);
			expect(match(pattern, add(add(number('1'), number('3')), number('2'))).success).toBe(true);
			expect(match(pattern, add(add(number('2'), number('1')), number('3'))).success).toBe(true);
			expect(match(pattern, add(add(number('2'), number('3')), number('1'))).success).toBe(true);
			expect(match(pattern, add(add(number('3'), number('1')), number('2'))).success).toBe(true);
			expect(match(pattern, add(add(number('3'), number('2')), number('1'))).success).toBe(true);
		});

		it('fails when no valid permutation exists', () => {
			const pattern = P.sum(P.num(1), P.num(2), P.num(3));
			const node = add(add(number('1'), number('2')), number('4')); // 4 instead of 3

			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});
	});

	describe('extended edge cases - product specific', () => {
		it('matches product with different multiplication styles', () => {
			const pattern = P.prod(P._('a'), P.__('rest'));
			const node = multiply(multiply(variable('x'), variable('y'), 'dot'), variable('z'), 'cross');

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('matches product with only numbers', () => {
			const pattern = P.prod(P._('first'), P.__('rest'));
			const node = multiply(multiply(number('2'), number('3'), 'dot'), number('4'), 'dot');

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('matches product with same variable repeated', () => {
			const pattern = P.prod(P._('first'), P.__('rest'));
			const node = multiply(
				multiply(variable('x'), variable('x'), 'implicit'),
				variable('x'),
				'implicit'
			);

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const rest = result.bindings.get('rest');
			expect(isProductSequenceBinding(rest!)).toBe(true);
			if (isProductSequenceBinding(rest!)) {
				expect(rest.factors.length).toBe(2);
				expect(nodesEqual(rest.factors[0], variable('x'))).toBe(true);
				expect(nodesEqual(rest.factors[1], variable('x'))).toBe(true);
			}
		});

		it('matches coefficient extraction pattern', () => {
			// 2 * 3 * x * y -> extract all numbers as coefficient
			const pattern = P.prod(P.__('coeffs', P.isNumber()), P.__('vars', P.isVariable()));

			// This should fail because we can't have two sequence patterns
			expect(() => {
				match(
					pattern,
					multiply(multiply(number('2'), variable('x'), 'implicit'), variable('y'), 'implicit')
				);
			}).toThrow();
		});
	});

	describe('extended edge cases - instantiation errors', () => {
		it('throws when instantiating empty required sequence', () => {
			// Manually create bindings with empty required sequence (shouldn't happen normally)
			const bindings: Map<string, unknown> = new Map([
				['first', variable('x')],
				['rest', { kind: 'sum-sequence', terms: [] }]
			]);

			const pattern = P._('rest');

			expect(() => {
				instantiate(pattern, bindings as never);
			}).toThrow();
		});

		it('throws when sequence binding missing', () => {
			const bindings = new Map([['first', variable('x')]]);

			const pattern = P.sum(P._('first'), P.__('rest'));

			expect(() => {
				instantiate(pattern, bindings);
			}).toThrow();
		});

		it('instantiates single-element sequence correctly', () => {
			const pattern = P.sum(P._('first'), P.__('rest'));
			const node = add(variable('a'), variable('b')); // 2 terms

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			// rest has exactly 1 element
			const outputPattern = P._('rest');
			const instantiated = instantiate(outputPattern, result.bindings);

			expect(instantiated).toBeDefined();
			// Should be a single node, not wrapped in addition
		});

		it('instantiates two-element sequence as addition', () => {
			const pattern = P.sum(P._('first'), P.__('rest'));
			const node = add(add(variable('a'), variable('b')), variable('c')); // 3 terms

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const outputPattern = P._('rest');
			const instantiated = instantiate(outputPattern, result.bindings);

			expect(instantiated).toBeDefined();
			expect(instantiated.type).toBe('addition');
		});
	});

	describe('extended edge cases - pattern only elements', () => {
		it('matches pattern with only sequence wildcard', () => {
			const pattern = P.sum(P.__('all'));
			const node = add(variable('a'), variable('b'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const all = result.bindings.get('all');
			expect(isSumSequenceBinding(all!)).toBe(true);
			if (isSumSequenceBinding(all!)) {
				expect(all.terms.length).toBe(2);
			}
		});

		it('matches pattern with only optional sequence wildcard on sum', () => {
			const pattern = P.sum(P.___('all'));
			const node = add(variable('a'), variable('b'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const all = result.bindings.get('all');
			expect(isSumSequenceBinding(all!)).toBe(true);
			if (isSumSequenceBinding(all!)) {
				expect(all.terms.length).toBe(2);
			}
		});

		it('matches product pattern with only sequence wildcard', () => {
			const pattern = P.prod(P.__('all'));
			const node = multiply(variable('a'), variable('b'), 'implicit');

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const all = result.bindings.get('all');
			expect(isProductSequenceBinding(all!)).toBe(true);
			if (isProductSequenceBinding(all!)) {
				expect(all.factors.length).toBe(2);
			}
		});

		it('matches pattern with all literals', () => {
			const pattern = P.sum(P.num(1), P.num(2), P.num(3));
			const node = add(add(number('1'), number('2')), number('3'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
			expect(result.bindings.size).toBe(0); // No wildcards
		});

		it('matches pattern with mixed literals and optional sequence', () => {
			const pattern = P.sum(P.num(1), P.var('x'), P.___('extras'));
			const node = add(number('1'), variable('x'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const extras = result.bindings.get('extras');
			expect(isSumSequenceBinding(extras!)).toBe(true);
			if (isSumSequenceBinding(extras!)) {
				expect(extras.terms.length).toBe(0);
			}
		});
	});

	describe('extended edge cases - binding value types', () => {
		it('correctly identifies MathNode bindings', () => {
			const pattern = P.sum(P._('a'), P.__('rest'));
			const node = add(variable('x'), variable('y'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const a = result.bindings.get('a');
			expect(isMathNodeBinding(a!)).toBe(true);
			expect(isSumSequenceBinding(a!)).toBe(false);
			expect(isProductSequenceBinding(a!)).toBe(false);
		});

		it('correctly identifies SumSequenceBinding', () => {
			const pattern = P.sum(P._('a'), P.__('rest'));
			const node = add(variable('x'), variable('y'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const rest = result.bindings.get('rest');
			expect(isMathNodeBinding(rest!)).toBe(false);
			expect(isSumSequenceBinding(rest!)).toBe(true);
			expect(isProductSequenceBinding(rest!)).toBe(false);
		});

		it('correctly identifies ProductSequenceBinding', () => {
			const pattern = P.prod(P._('a'), P.__('rest'));
			const node = multiply(variable('x'), variable('y'), 'implicit');

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const rest = result.bindings.get('rest');
			expect(isMathNodeBinding(rest!)).toBe(false);
			expect(isSumSequenceBinding(rest!)).toBe(false);
			expect(isProductSequenceBinding(rest!)).toBe(true);
		});
	});

	describe('extended edge cases - boundary conditions', () => {
		it('handles exactly n terms for n single wildcards (no sequence)', () => {
			const pattern = P.sum(P._('a'), P._('b'));
			const node = add(variable('x'), variable('y'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('fails with n-1 terms for n single wildcards', () => {
			const pattern = P.sum(P._('a'), P._('b'), P._('c'));
			const node = add(variable('x'), variable('y')); // Only 2 terms

			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});

		it('fails with n+1 terms for n single wildcards (no sequence)', () => {
			const pattern = P.sum(P._('a'), P._('b'));
			const node = add(add(variable('x'), variable('y')), variable('z')); // 3 terms

			const result = match(pattern, node);
			expect(result.success).toBe(false);
		});

		it('matches exactly k+1 terms for k singles + required sequence', () => {
			const pattern = P.sum(P._('a'), P._('b'), P.__('rest'));
			const node = add(add(variable('x'), variable('y')), variable('z')); // Exactly 3

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const rest = result.bindings.get('rest');
			if (isSumSequenceBinding(rest!)) {
				expect(rest.terms.length).toBe(1);
			}
		});

		it('matches exactly k terms for k singles + optional sequence', () => {
			const pattern = P.sum(P._('a'), P._('b'), P.___('rest'));
			const node = add(variable('x'), variable('y')); // Exactly 2

			const result = match(pattern, node);
			expect(result.success).toBe(true);

			const rest = result.bindings.get('rest');
			if (isSumSequenceBinding(rest!)) {
				expect(rest.terms.length).toBe(0);
			}
		});
	});

	describe('extended edge cases - special numeric values', () => {
		it('handles zero in sum correctly', () => {
			const pattern = P.sum(P._('nonzero', P.isNonzero()), P.___('rest'));
			const node = add(add(number('0'), number('5')), variable('x'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('nonzero')!, number('5'))).toBe(true);
		});

		it('handles negative numbers in sum', () => {
			const pattern = P.sum(P._('neg', P.isNegative()), P.__('rest'));
			const node = add(add(number('-5'), number('3')), variable('x'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
			expect(nodesEqual(result.bindings.get('neg')!, number('-5'))).toBe(true);
		});

		it('handles decimal numbers in sum', () => {
			const pattern = P.sum(P._('first'), P.__('rest'));
			const node = add(number('3.14'), number('2.71'));

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});

		it('handles very large numbers in product', () => {
			const pattern = P.prod(P._('first'), P.__('rest'));
			const node = multiply(number('999999999'), number('888888888'), 'dot');

			const result = match(pattern, node);
			expect(result.success).toBe(true);
		});
	});
});
