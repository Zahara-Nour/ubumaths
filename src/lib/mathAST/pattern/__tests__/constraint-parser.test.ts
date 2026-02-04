/**
 * Unit tests for Constraint Expression Parser
 *
 * Tests the constraint parser that converts constraint expression strings
 * into PatternConstraint objects.
 */

import { describe, it, expect } from 'vitest';
import {
	parseConstraintExpr,
	isValidAtomicConstraint,
	getAtomicConstraintNames
} from '../../parser/custom/constraint-parser';
import { P } from '../builder';
import { parsePattern } from '../../parser/custom/pattern-parser';

// =============================================================================
// Atomic Constraint Tests
// =============================================================================

describe('Constraint Expression Parser', () => {
	describe('atomic constraints', () => {
		describe('basic constraints', () => {
			it('parses "number" constraint', () => {
				const constraint = parseConstraintExpr('number');
				expect(constraint).toEqual(P.isNumber());
			});

			it('parses "integer" constraint', () => {
				const constraint = parseConstraintExpr('integer');
				expect(constraint).toEqual(P.isInteger());
			});

			it('parses "positive" constraint', () => {
				const constraint = parseConstraintExpr('positive');
				expect(constraint).toEqual(P.isPositive());
			});

			it('parses "negative" constraint', () => {
				const constraint = parseConstraintExpr('negative');
				expect(constraint).toEqual(P.isNegative());
			});

			it('parses "nonzero" constraint', () => {
				const constraint = parseConstraintExpr('nonzero');
				expect(constraint).toEqual(P.isNonzero());
			});

			it('parses "variable" constraint', () => {
				const constraint = parseConstraintExpr('variable');
				expect(constraint).toEqual(P.isVariable());
			});
		});

		describe('numeric type constraints', () => {
			it('parses "integerType" constraint', () => {
				const constraint = parseConstraintExpr('integerType');
				expect(constraint).toEqual(P.isIntegerType());
			});

			it('parses "rationalType" constraint', () => {
				const constraint = parseConstraintExpr('rationalType');
				expect(constraint).toEqual(P.isRationalType());
			});

			it('parses "algebraicType" constraint', () => {
				const constraint = parseConstraintExpr('algebraicType');
				expect(constraint).toEqual(P.isAlgebraicType());
			});

			it('parses "realType" constraint', () => {
				const constraint = parseConstraintExpr('realType');
				expect(constraint).toEqual(P.isRealType());
			});

			it('parses "transcendentalType" constraint', () => {
				const constraint = parseConstraintExpr('transcendentalType');
				expect(constraint).toEqual(P.isTranscendentalType());
			});

			it('parses "complexType" constraint', () => {
				const constraint = parseConstraintExpr('complexType');
				expect(constraint).toEqual(P.isComplexType());
			});
		});

		describe('constraint validation', () => {
			it('throws error for unknown atomic constraint', () => {
				expect(() => parseConstraintExpr('unknown')).toThrow("Unknown constraint 'unknown'");
			});

			it('throws error for empty expression', () => {
				expect(() => parseConstraintExpr('')).toThrow('Empty constraint expression');
			});

			it('throws error for only whitespace', () => {
				expect(() => parseConstraintExpr('   ')).toThrow('Empty constraint expression');
			});
		});
	});

	// =============================================================================
	// Functional Constraint Tests
	// =============================================================================

	describe('functional constraints', () => {
		describe('type(...)', () => {
			it('parses type(addition) - single type', () => {
				const constraint = parseConstraintExpr('type(addition)');
				expect(constraint).toEqual(P.isType('addition'));
			});

			it('parses type(addition|multiplication) - multiple types with pipe', () => {
				const constraint = parseConstraintExpr('type(addition|multiplication)');
				expect(constraint).toEqual(P.isType('addition', 'multiplication'));
			});

			it('parses type(number|variable|function) - three types', () => {
				const constraint = parseConstraintExpr('type(number|variable|function)');
				expect(constraint).toEqual(P.isType('number', 'variable', 'function'));
			});

			it('throws error for empty type()', () => {
				expect(() => parseConstraintExpr('type()')).toThrow('Expected type name');
			});

			it('throws error for unclosed type(', () => {
				expect(() => parseConstraintExpr('type(addition')).toThrow("Expected ')'");
			});
		});

		describe('freeOf(...)', () => {
			it('parses freeOf(x) - single variable', () => {
				const constraint = parseConstraintExpr('freeOf(x)');
				expect(constraint).toEqual(P.isFreeOf('x'));
			});

			it('parses freeOf(x,y) - multiple variables', () => {
				const constraint = parseConstraintExpr('freeOf(x,y)');
				expect(constraint).toEqual(P.isFreeOf('x', 'y'));
			});

			it('parses freeOf(a,b,c) - three variables', () => {
				const constraint = parseConstraintExpr('freeOf(a,b,c)');
				expect(constraint).toEqual(P.isFreeOf('a', 'b', 'c'));
			});

			it('throws error for empty freeOf()', () => {
				expect(() => parseConstraintExpr('freeOf()')).toThrow('Expected variable name');
			});

			it('throws error for unclosed freeOf(', () => {
				expect(() => parseConstraintExpr('freeOf(x')).toThrow("Expected ')'");
			});
		});
	});

	// =============================================================================
	// Logical Operator Tests
	// =============================================================================

	describe('logical operators', () => {
		describe('NOT operator (!)', () => {
			it('parses !negative', () => {
				const constraint = parseConstraintExpr('!negative');
				expect(constraint).toEqual(P.not(P.isNegative()));
			});

			it('parses !number', () => {
				const constraint = parseConstraintExpr('!number');
				expect(constraint).toEqual(P.not(P.isNumber()));
			});

			it('parses double negation !!positive', () => {
				const constraint = parseConstraintExpr('!!positive');
				expect(constraint).toEqual(P.not(P.not(P.isPositive())));
			});
		});

		describe('AND operator (&)', () => {
			it('parses positive & nonzero', () => {
				const constraint = parseConstraintExpr('positive & nonzero');
				expect(constraint).toEqual(P.and(P.isPositive(), P.isNonzero()));
			});

			it('parses integer & positive & nonzero - chained ANDs are flattened', () => {
				const constraint = parseConstraintExpr('integer & positive & nonzero');
				expect(constraint).toEqual(P.and(P.isInteger(), P.isPositive(), P.isNonzero()));
			});

			it('parses number & variable - without spaces', () => {
				const constraint = parseConstraintExpr('number&variable');
				expect(constraint).toEqual(P.and(P.isNumber(), P.isVariable()));
			});
		});

		describe('OR operator (|)', () => {
			it('parses number | variable', () => {
				const constraint = parseConstraintExpr('number | variable');
				expect(constraint).toEqual(P.or(P.isNumber(), P.isVariable()));
			});

			it('parses positive | negative | nonzero - chained ORs are flattened', () => {
				const constraint = parseConstraintExpr('positive | negative | nonzero');
				expect(constraint).toEqual(P.or(P.isPositive(), P.isNegative(), P.isNonzero()));
			});

			it('parses integer|number - without spaces', () => {
				const constraint = parseConstraintExpr('integer|number');
				expect(constraint).toEqual(P.or(P.isInteger(), P.isNumber()));
			});
		});
	});

	// =============================================================================
	// Operator Precedence Tests
	// =============================================================================

	describe('operator precedence', () => {
		it('NOT has higher precedence than AND: !positive & nonzero = (!positive) & nonzero', () => {
			const constraint = parseConstraintExpr('!positive & nonzero');
			expect(constraint).toEqual(P.and(P.not(P.isPositive()), P.isNonzero()));
		});

		it('AND has higher precedence than OR: a | b & c = a | (b & c)', () => {
			const constraint = parseConstraintExpr('positive | integer & nonzero');
			expect(constraint).toEqual(P.or(P.isPositive(), P.and(P.isInteger(), P.isNonzero())));
		});

		it('combined: !a | b & c = (!a) | (b & c)', () => {
			const constraint = parseConstraintExpr('!negative | positive & nonzero');
			expect(constraint).toEqual(P.or(P.not(P.isNegative()), P.and(P.isPositive(), P.isNonzero())));
		});

		it('a & b | c & d = (a & b) | (c & d)', () => {
			const constraint = parseConstraintExpr('positive & integer | negative & nonzero');
			expect(constraint).toEqual(
				P.or(P.and(P.isPositive(), P.isInteger()), P.and(P.isNegative(), P.isNonzero()))
			);
		});
	});

	// =============================================================================
	// Grouping Tests
	// =============================================================================

	describe('grouping with parentheses', () => {
		it('parses (positive) - simple grouping', () => {
			const constraint = parseConstraintExpr('(positive)');
			expect(constraint).toEqual(P.isPositive());
		});

		it('parses !(positive & nonzero) - negation of grouped AND', () => {
			const constraint = parseConstraintExpr('!(positive & nonzero)');
			expect(constraint).toEqual(P.not(P.and(P.isPositive(), P.isNonzero())));
		});

		it('parses (number | variable) & positive - grouping changes precedence', () => {
			const constraint = parseConstraintExpr('(number | variable) & positive');
			expect(constraint).toEqual(P.and(P.or(P.isNumber(), P.isVariable()), P.isPositive()));
		});

		it('parses ((positive)) - nested grouping', () => {
			const constraint = parseConstraintExpr('((positive))');
			expect(constraint).toEqual(P.isPositive());
		});

		it('throws error for unclosed parenthesis', () => {
			expect(() => parseConstraintExpr('(positive')).toThrow("Expected ')'");
		});

		it('throws error for unmatched closing parenthesis', () => {
			expect(() => parseConstraintExpr('positive)')).toThrow('Unexpected token');
		});
	});

	// =============================================================================
	// Complex Expression Tests
	// =============================================================================

	describe('complex expressions', () => {
		it('parses freeOf(n) & type(addition)', () => {
			const constraint = parseConstraintExpr('freeOf(n) & type(addition)');
			expect(constraint).toEqual(P.and(P.isFreeOf('n'), P.isType('addition')));
		});

		it('parses !freeOf(x)', () => {
			const constraint = parseConstraintExpr('!freeOf(x)');
			expect(constraint).toEqual(P.not(P.isFreeOf('x')));
		});

		it('parses type(addition|multiplication) | freeOf(x,y)', () => {
			const constraint = parseConstraintExpr('type(addition|multiplication) | freeOf(x,y)');
			expect(constraint).toEqual(
				P.or(P.isType('addition', 'multiplication'), P.isFreeOf('x', 'y'))
			);
		});

		it('parses freeOf(x,y) & integerType & positive', () => {
			const constraint = parseConstraintExpr('freeOf(x,y) & integerType & positive');
			expect(constraint).toEqual(P.and(P.isFreeOf('x', 'y'), P.isIntegerType(), P.isPositive()));
		});

		it('parses (number | variable) & !negative & freeOf(z)', () => {
			const constraint = parseConstraintExpr('(number | variable) & !negative & freeOf(z)');
			expect(constraint).toEqual(
				P.and(P.or(P.isNumber(), P.isVariable()), P.not(P.isNegative()), P.isFreeOf('z'))
			);
		});
	});

	// =============================================================================
	// Integration with Pattern Parser Tests
	// =============================================================================

	describe('integration with pattern parser', () => {
		it('parses n:positive & nonzero', () => {
			const pattern = parsePattern('n:positive & nonzero');
			expect(pattern).toEqual(P._('n', P.and(P.isPositive(), P.isNonzero())));
		});

		it('parses x:number | variable', () => {
			const pattern = parsePattern('x:number | variable');
			expect(pattern).toEqual(P._('x', P.or(P.isNumber(), P.isVariable())));
		});

		it('parses n:!negative', () => {
			const pattern = parsePattern('n:!negative');
			expect(pattern).toEqual(P._('n', P.not(P.isNegative())));
		});

		it('parses n:!(positive & zero)', () => {
			// Note: 'zero' is not a valid constraint, but this tests structure
			// Using number instead
			const pattern = parsePattern('n:!(positive & number)');
			expect(pattern).toEqual(P._('n', P.not(P.and(P.isPositive(), P.isNumber()))));
		});

		it('parses base:freeOf(x,y) in pattern with power', () => {
			const pattern = parsePattern('base:freeOf(x,y) ^ n:integerType');
			expect(pattern).toEqual(
				P.pow(P._('base', P.isFreeOf('x', 'y')), P._('n', P.isIntegerType()))
			);
		});

		it('parses coeff:number & positive * x', () => {
			const pattern = parsePattern('coeff:number & positive * x');
			expect(pattern).toEqual(P.mul(P._('coeff', P.and(P.isNumber(), P.isPositive())), P._('x')));
		});

		it('parses a + b:type(addition|multiplication)', () => {
			const pattern = parsePattern('a + b:type(addition|multiplication)');
			expect(pattern).toEqual(P.add(P._('a'), P._('b', P.isType('addition', 'multiplication'))));
		});

		it('parses __rest:integerType for sequence wildcard with constraint', () => {
			const pattern = parsePattern('a + __rest:integerType');
			expect(pattern).toEqual(P.add(P._('a'), P.__('rest', P.isIntegerType())));
		});
	});

	// =============================================================================
	// Utility Function Tests
	// =============================================================================

	describe('utility functions', () => {
		describe('isValidAtomicConstraint', () => {
			it('returns true for valid atomic constraints', () => {
				const validNames = [
					'number',
					'integer',
					'positive',
					'negative',
					'nonzero',
					'variable',
					'integerType',
					'rationalType',
					'algebraicType',
					'realType',
					'transcendentalType',
					'complexType'
				];

				for (const name of validNames) {
					expect(isValidAtomicConstraint(name)).toBe(true);
				}
			});

			it('returns false for invalid names', () => {
				expect(isValidAtomicConstraint('type')).toBe(false); // functional, not atomic
				expect(isValidAtomicConstraint('freeOf')).toBe(false); // functional, not atomic
				expect(isValidAtomicConstraint('unknown')).toBe(false);
				expect(isValidAtomicConstraint('')).toBe(false);
			});
		});

		describe('getAtomicConstraintNames', () => {
			it('returns all atomic constraint names', () => {
				const names = getAtomicConstraintNames();

				expect(names).toContain('number');
				expect(names).toContain('integer');
				expect(names).toContain('positive');
				expect(names).toContain('negative');
				expect(names).toContain('nonzero');
				expect(names).toContain('variable');
				expect(names).toContain('integerType');
				expect(names).toContain('rationalType');
			});

			it('does not contain functional constraint names', () => {
				const names = getAtomicConstraintNames();

				expect(names).not.toContain('type');
				expect(names).not.toContain('freeOf');
			});
		});
	});

	// =============================================================================
	// Whitespace Handling Tests
	// =============================================================================

	describe('whitespace handling', () => {
		it('ignores leading whitespace', () => {
			const constraint = parseConstraintExpr('  number');
			expect(constraint).toEqual(P.isNumber());
		});

		it('ignores trailing whitespace', () => {
			const constraint = parseConstraintExpr('number  ');
			expect(constraint).toEqual(P.isNumber());
		});

		it('handles whitespace around operators', () => {
			const constraint = parseConstraintExpr('positive  &  nonzero');
			expect(constraint).toEqual(P.and(P.isPositive(), P.isNonzero()));
		});

		it('handles whitespace inside functional constraints', () => {
			const constraint = parseConstraintExpr('type( addition | multiplication )');
			expect(constraint).toEqual(P.isType('addition', 'multiplication'));
		});

		it('handles whitespace inside freeOf', () => {
			const constraint = parseConstraintExpr('freeOf( x , y )');
			expect(constraint).toEqual(P.isFreeOf('x', 'y'));
		});
	});
});
