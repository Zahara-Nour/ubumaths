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

			it('parses "nonone" constraint', () => {
				const constraint = parseConstraintExpr('nonone');
				expect(constraint).toEqual(P.isNonone());
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

		describe('comparison constraints gt, lt, gte, lte, eq, ne', () => {
			it('parses gt(5) - greater than', () => {
				const constraint = parseConstraintExpr('gt(5)');
				expect(constraint).toEqual(P.gt(5));
			});

			it('parses lt(10) - less than', () => {
				const constraint = parseConstraintExpr('lt(10)');
				expect(constraint).toEqual(P.lt(10));
			});

			it('parses gte(0) - greater or equal', () => {
				const constraint = parseConstraintExpr('gte(0)');
				expect(constraint).toEqual(P.gte(0));
			});

			it('parses lte(100) - less or equal', () => {
				const constraint = parseConstraintExpr('lte(100)');
				expect(constraint).toEqual(P.lte(100));
			});

			it('parses eq(2) - equal to', () => {
				const constraint = parseConstraintExpr('eq(2)');
				expect(constraint).toEqual(P.eq(2));
			});

			it('parses ne(0) - not equal', () => {
				const constraint = parseConstraintExpr('ne(0)');
				expect(constraint).toEqual(P.ne(0));
			});

			it('parses negative numbers: gt(-5)', () => {
				const constraint = parseConstraintExpr('gt(-5)');
				expect(constraint).toEqual(P.gt(-5));
			});

			it('parses decimal numbers: lt(3.14)', () => {
				const constraint = parseConstraintExpr('lt(3.14)');
				expect(constraint).toEqual(P.lt(3.14));
			});

			it('parses negative decimals: gte(-0.5)', () => {
				const constraint = parseConstraintExpr('gte(-0.5)');
				expect(constraint).toEqual(P.gte(-0.5));
			});

			it('throws error for empty gt()', () => {
				expect(() => parseConstraintExpr('gt()')).toThrow('Expected number');
			});

			it('throws error for non-number argument', () => {
				expect(() => parseConstraintExpr('gt(x)')).toThrow('Expected number');
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

		describe('in]...[  - interval constraints (French notation)', () => {
			it('parses in]0,+inf[ - positive reals (x > 0)', () => {
				const constraint = parseConstraintExpr('in]0,+inf[');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in[0,10] - closed interval 0 <= x <= 10', () => {
				const constraint = parseConstraintExpr('in[0,10]');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in[0,10[ - half-open interval 0 <= x < 10', () => {
				const constraint = parseConstraintExpr('in[0,10[');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in]0,10] - half-open interval 0 < x <= 10', () => {
				const constraint = parseConstraintExpr('in]0,10]');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in]-inf,0[ - negative reals (x < 0)', () => {
				const constraint = parseConstraintExpr('in]-inf,0[');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in[0,+inf[ - non-negative reals (x >= 0)', () => {
				const constraint = parseConstraintExpr('in[0,+inf[');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in]-inf,+inf[ - all reals', () => {
				const constraint = parseConstraintExpr('in]-inf,+inf[');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in[-1,1] - unit interval', () => {
				const constraint = parseConstraintExpr('in[-1,1]');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in[0,\\pi] - interval with pi constant', () => {
				// Note: Use \pi for π (not 'pi' which parses as p*i)
				const constraint = parseConstraintExpr('in[0,\\pi]');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in]0,e] - interval with e constant', () => {
				// e is recognized as Euler's number constant
				const constraint = parseConstraintExpr('in]0,e]');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in[0,sqrt(2)] - interval with sqrt(2) expression', () => {
				const constraint = parseConstraintExpr('in[0,sqrt(2)]');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in]0,sqrt(3)[ - interval with sqrt(3) expression', () => {
				const constraint = parseConstraintExpr('in]0,sqrt(3)[');
				expect(constraint.kind).toBe('interval');
			});

			it('parses negative number bounds: in[-5,5]', () => {
				const constraint = parseConstraintExpr('in[-5,5]');
				expect(constraint.kind).toBe('interval');
			});

			it('parses decimal number bounds: in[0.5,1.5]', () => {
				const constraint = parseConstraintExpr('in[0.5,1.5]');
				expect(constraint.kind).toBe('interval');
			});

			it('parses with whitespace: in[ 0 , 10 ]', () => {
				const constraint = parseConstraintExpr('in[ 0 , 10 ]');
				expect(constraint.kind).toBe('interval');
			});

			it('throws error for missing opening bracket', () => {
				// 'in0' is parsed as unknown constraint because identifier continues
				expect(() => parseConstraintExpr('in0,10]')).toThrow("Unknown constraint 'in0'");
			});

			it('throws error for missing comma', () => {
				// Without comma, the parser can't find interval bounds
				expect(() => parseConstraintExpr('in[0 10]')).toThrow('missing comma or closing bracket');
			});

			it('parses variable as bound (detected at evaluation time, not parse time)', () => {
				// With full math expression support, "unknown" parses as a variable
				// The constraint system will fail at evaluation time if used with non-numeric value
				const constraint = parseConstraintExpr('in[0,x]');
				expect(constraint.kind).toBe('interval');
			});
		});

		describe('in]...[ with complex math expressions', () => {
			it('parses in]0,2*\\pi[ - expression with multiplication', () => {
				// Note: Use \pi for π
				const constraint = parseConstraintExpr('in]0,2*\\pi[');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in[-1/2,1/2] - fractions as bounds', () => {
				const constraint = parseConstraintExpr('in[-1/2,1/2]');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in[sqrt(2)/2,1] - expression with division and function', () => {
				const constraint = parseConstraintExpr('in[sqrt(2)/2,1]');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in]0,sqrt(2)+1[ - expression with addition', () => {
				const constraint = parseConstraintExpr('in]0,sqrt(2)+1[');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in[\\pi/4,\\pi/2] - multiple expressions with pi', () => {
				const constraint = parseConstraintExpr('in[\\pi/4,\\pi/2]');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in]0,ln(2)[ - natural logarithm', () => {
				const constraint = parseConstraintExpr('in]0,ln(2)[');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in[sin(\\pi/6),cos(\\pi/3)] - trig functions', () => {
				const constraint = parseConstraintExpr('in[sin(\\pi/6),cos(\\pi/3)]');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in]0,e^2[ - exponential', () => {
				const constraint = parseConstraintExpr('in]0,e^2[');
				expect(constraint.kind).toBe('interval');
			});

			it('parses in[(1+sqrt(5))/2,2] - golden ratio as bound', () => {
				const constraint = parseConstraintExpr('in[(1+sqrt(5))/2,2]');
				expect(constraint.kind).toBe('interval');
			});
		});

		describe('mathematical domain shortcuts', () => {
			it('parses inR - all reals', () => {
				const constraint = parseConstraintExpr('inR');
				expect(constraint.kind).toBe('interval');
			});

			it('parses inR+ - non-negative reals (x >= 0)', () => {
				const constraint = parseConstraintExpr('inR+');
				expect(constraint.kind).toBe('interval');
			});

			it('parses inR+* - positive reals (x > 0)', () => {
				const constraint = parseConstraintExpr('inR+*');
				expect(constraint.kind).toBe('interval');
			});

			it('parses inR* - non-zero reals (x != 0)', () => {
				const constraint = parseConstraintExpr('inR*');
				expect(constraint.kind).toBe('interval');
			});

			it('parses inR- - non-positive reals (x <= 0)', () => {
				const constraint = parseConstraintExpr('inR-');
				expect(constraint.kind).toBe('interval');
			});

			it('parses inR-* - negative reals (x < 0)', () => {
				const constraint = parseConstraintExpr('inR-*');
				expect(constraint.kind).toBe('interval');
			});

			it('parses inN - natural numbers (integers >= 0)', () => {
				const constraint = parseConstraintExpr('inN');
				expect(constraint.kind).toBe('and');
			});

			it('parses inN* - positive integers (integers > 0)', () => {
				const constraint = parseConstraintExpr('inN*');
				expect(constraint.kind).toBe('and');
			});

			it('parses inZ - all integers', () => {
				const constraint = parseConstraintExpr('inZ');
				expect(constraint.kind).toBe('integer');
			});

			it('parses inZ* - non-zero integers', () => {
				const constraint = parseConstraintExpr('inZ*');
				expect(constraint.kind).toBe('and');
			});

			it('parses inN & positive - combined constraints', () => {
				const constraint = parseConstraintExpr('inN & positive');
				expect(constraint.kind).toBe('and');
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

		it('parses n:gt(0) for comparison constraint', () => {
			const pattern = parsePattern('n:gt(0)');
			expect(pattern).toEqual(P._('n', P.gt(0)));
		});

		it('parses exp:gte(2) & integer for combined comparison', () => {
			const pattern = parsePattern('base ^ exp:gte(2) & integer');
			expect(pattern).toEqual(P.pow(P._('base'), P._('exp', P.and(P.gte(2), P.isInteger()))));
		});

		it('parses n:gt(0) & lt(10) for range constraint', () => {
			const pattern = parsePattern('n:gt(0) & lt(10)');
			expect(pattern).toEqual(P._('n', P.and(P.gt(0), P.lt(10))));
		});

		it('parses n:in]0,+inf[ for positive interval constraint', () => {
			const pattern = parsePattern('n:in]0,+inf[');
			expect(pattern.type).toBe('wildcard');
			expect((pattern as { constraint?: { kind: string } }).constraint?.kind).toBe('interval');
		});

		it('parses n:in[0,10] & integer for interval with integer constraint', () => {
			const pattern = parsePattern('n:in[0,10] & integer');
			expect(pattern.type).toBe('wildcard');
			const constraint = (pattern as { constraint?: { kind: string } }).constraint;
			expect(constraint?.kind).toBe('and');
		});

		it('parses n:inR+ for non-negative reals', () => {
			const pattern = parsePattern('n:inR+');
			expect(pattern.type).toBe('wildcard');
			const constraint = (pattern as { constraint?: { kind: string } }).constraint;
			expect(constraint?.kind).toBe('interval');
		});

		it('parses n:inN* for positive integers', () => {
			const pattern = parsePattern('n:inN*');
			expect(pattern.type).toBe('wildcard');
			const constraint = (pattern as { constraint?: { kind: string } }).constraint;
			expect(constraint?.kind).toBe('and');
		});

		it('parses n:inZ* for non-zero integers', () => {
			const pattern = parsePattern('n:inZ*');
			expect(pattern.type).toBe('wildcard');
			const constraint = (pattern as { constraint?: { kind: string } }).constraint;
			expect(constraint?.kind).toBe('and');
		});

		it('parses a:inR+* + b:inR-* for operations with domain constraints', () => {
			const pattern = parsePattern('a:inR+* + b:inR-*');
			expect(pattern.type).toBe('addition-pattern');
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
