import { describe, it, expect } from 'vitest';
import {
	geoAdd,
	geoSub,
	geoMul,
	geoDiv,
	geoSqrt,
	geoOpposite,
	geoFromNumber,
	geoFromFraction
} from '../geo-arithmetic';
import { exact, numeric, isExact, isNumeric } from '../../types/geo-value';
import { geoToNumber } from '../to-number';
import { geoEqual } from '../compare';
import { number, sqrt, fraction } from '$lib/mathAST';

// =============================================================================
// Exact propagation rule: exact op exact = exact
// =============================================================================

describe('exact + exact = exact', () => {
	it('geoAdd(3, 4) -> 7', () => {
		const result = geoAdd(exact(number('3')), exact(number('4')));
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(7);
	});

	it('geoSub(5, 3) -> 2', () => {
		const result = geoSub(exact(number('5')), exact(number('3')));
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(2);
	});

	it('geoMul(2, 3) -> 6', () => {
		const result = geoMul(exact(number('2')), exact(number('3')));
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(6);
	});

	it('geoDiv(1, 3) -> 1/3', () => {
		const result = geoDiv(exact(number('1')), exact(number('3')));
		expect(result).not.toBeNull();
		expect(isExact(result!)).toBe(true);
		expect(geoToNumber(result!)).toBeCloseTo(1 / 3, 10);
	});

	it('geoAdd(sqrt(2), sqrt(2)) -> 2*sqrt(2)', () => {
		const s2 = exact(sqrt(number('2')));
		const result = geoAdd(s2, s2);
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBeCloseTo(2 * Math.SQRT2, 10);
	});

	it('geoMul(sqrt(2), sqrt(2)) -> 2 (exact)', () => {
		const s2 = exact(sqrt(number('2')));
		const result = geoMul(s2, s2);
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(2);
	});

	it('geoSub(a, a) -> 0 for any exact value', () => {
		const a = exact(sqrt(number('7')));
		const result = geoSub(a, a);
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(0);
	});
});

// =============================================================================
// Propagation: exact + numeric = numeric
// =============================================================================

describe('exact + numeric = numeric', () => {
	it('geoAdd(exact(3), numeric(4)) -> numeric(7)', () => {
		const result = geoAdd(exact(number('3')), numeric(4));
		expect(isNumeric(result)).toBe(true);
		expect(geoToNumber(result)).toBe(7);
	});

	it('geoMul(numeric(2), exact(3)) -> numeric(6)', () => {
		const result = geoMul(numeric(2), exact(number('3')));
		expect(isNumeric(result)).toBe(true);
		expect(geoToNumber(result)).toBe(6);
	});

	it('geoSub(exact(10), numeric(3)) -> numeric(7)', () => {
		const result = geoSub(exact(number('10')), numeric(3));
		expect(isNumeric(result)).toBe(true);
		expect(geoToNumber(result)).toBe(7);
	});

	it('geoDiv(numeric(6), exact(2)) -> numeric(3)', () => {
		const result = geoDiv(numeric(6), exact(number('2')));
		expect(result).not.toBeNull();
		expect(isNumeric(result!)).toBe(true);
		expect(geoToNumber(result!)).toBe(3);
	});
});

// =============================================================================
// Numeric + numeric = numeric
// =============================================================================

describe('numeric + numeric = numeric', () => {
	it('geoAdd(3, 4) -> 7', () => {
		const result = geoAdd(numeric(3), numeric(4));
		expect(isNumeric(result)).toBe(true);
		expect(geoToNumber(result)).toBe(7);
	});

	it('geoSub(10, 3) -> 7', () => {
		expect(geoToNumber(geoSub(numeric(10), numeric(3)))).toBe(7);
	});

	it('geoMul(2.5, 4) -> 10', () => {
		expect(geoToNumber(geoMul(numeric(2.5), numeric(4)))).toBe(10);
	});

	it('geoDiv(10, 4) -> 2.5', () => {
		const result = geoDiv(numeric(10), numeric(4));
		expect(geoToNumber(result!)).toBe(2.5);
	});
});

// =============================================================================
// Identity / zero operations
// =============================================================================

describe('identity and zero operations', () => {
	it('geoAdd(x, 0) = x', () => {
		const x = exact(number('7'));
		expect(geoToNumber(geoAdd(x, exact(number('0'))))).toBe(7);
	});

	it('geoSub(x, 0) = x', () => {
		const x = exact(number('7'));
		expect(geoToNumber(geoSub(x, exact(number('0'))))).toBe(7);
	});

	it('geoMul(x, 1) = x', () => {
		const x = exact(number('7'));
		expect(geoToNumber(geoMul(x, exact(number('1'))))).toBe(7);
	});

	it('geoMul(x, 0) = 0', () => {
		const x = exact(number('7'));
		expect(geoToNumber(geoMul(x, exact(number('0'))))).toBe(0);
	});

	it('geoDiv(0, x) = 0', () => {
		const result = geoDiv(exact(number('0')), exact(number('5')));
		expect(result).not.toBeNull();
		expect(geoToNumber(result!)).toBe(0);
	});

	it('geoDiv(x, 1) = x', () => {
		const x = exact(number('7'));
		const result = geoDiv(x, exact(number('1')));
		expect(geoToNumber(result!)).toBe(7);
	});

	it('geoOpposite(geoOpposite(x)) = x', () => {
		const x = exact(number('13'));
		expect(geoToNumber(geoOpposite(geoOpposite(x)))).toBe(13);
	});
});

// =============================================================================
// Division edge cases
// =============================================================================

describe('geoDiv edge cases', () => {
	it('geoDiv by exact(0) returns null', () => {
		expect(geoDiv(exact(number('1')), exact(number('0')))).toBeNull();
	});

	it('geoDiv by numeric(0) returns null', () => {
		expect(geoDiv(numeric(1), numeric(0))).toBeNull();
	});

	it('geoDiv 0/0 returns null', () => {
		expect(geoDiv(exact(number('0')), exact(number('0')))).toBeNull();
	});

	it('geoDiv exact / numeric -> numeric', () => {
		const result = geoDiv(exact(number('6')), numeric(2));
		expect(result).not.toBeNull();
		expect(isNumeric(result!)).toBe(true);
		expect(geoToNumber(result!)).toBe(3);
	});

	it('geoDiv by very small numeric does not return null', () => {
		const result = geoDiv(numeric(1), numeric(1e-10));
		expect(result).not.toBeNull();
		expect(geoToNumber(result!)).toBeCloseTo(1e10, 0);
	});
});

// =============================================================================
// Square root edge cases
// =============================================================================

describe('geoSqrt', () => {
	it('geoSqrt(exact(0)) -> 0', () => {
		expect(geoToNumber(geoSqrt(exact(number('0'))))).toBe(0);
	});

	it('geoSqrt(exact(1)) -> 1', () => {
		expect(geoToNumber(geoSqrt(exact(number('1'))))).toBe(1);
	});

	it('geoSqrt(exact(4)) -> exact(2)', () => {
		const result = geoSqrt(exact(number('4')));
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(2);
	});

	it('geoSqrt(exact(9)) -> exact(3)', () => {
		expect(geoToNumber(geoSqrt(exact(number('9'))))).toBe(3);
	});

	it('geoSqrt(exact(2)) -> exact (symbolic sqrt)', () => {
		const result = geoSqrt(exact(number('2')));
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBeCloseTo(Math.SQRT2, 10);
	});

	it('geoSqrt(exact(1/4)) -> exact(1/2)', () => {
		const result = geoSqrt(exact(fraction(number('1'), number('4'))));
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(0.5);
	});

	it('geoSqrt(numeric(2)) -> numeric', () => {
		const result = geoSqrt(numeric(2));
		expect(isNumeric(result)).toBe(true);
		expect(geoToNumber(result)).toBeCloseTo(Math.SQRT2, 10);
	});

	it('geoSqrt(numeric(0)) -> numeric(0)', () => {
		expect(geoToNumber(geoSqrt(numeric(0)))).toBe(0);
	});

	it('geoSqrt(numeric(-1)) throws (NaN not finite)', () => {
		expect(() => geoSqrt(numeric(-1))).toThrow();
	});

	it('sqrt(a)*sqrt(a) = a (exact round-trip)', () => {
		const a = exact(number('7'));
		const sa = geoSqrt(a);
		const result = geoMul(sa, sa);
		expect(geoToNumber(result)).toBe(7);
	});
});

// =============================================================================
// Opposite
// =============================================================================

describe('geoOpposite', () => {
	it('exact(3) -> exact(-3)', () => {
		const result = geoOpposite(exact(number('3')));
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(-3);
	});

	it('numeric(5) -> numeric(-5)', () => {
		const result = geoOpposite(numeric(5));
		expect(isNumeric(result)).toBe(true);
		expect(geoToNumber(result)).toBe(-5);
	});

	it('exact(0) -> exact(0)', () => {
		expect(geoToNumber(geoOpposite(exact(number('0'))))).toBe(0);
	});

	it('numeric(0) -> numeric(-0)', () => {
		// JavaScript: -(0) = -0
		expect(geoToNumber(geoOpposite(numeric(0)))).toBe(-0);
	});

	it('opposite of negative -> positive', () => {
		expect(geoToNumber(geoOpposite(numeric(-3)))).toBe(3);
	});
});

// =============================================================================
// Convenience constructors
// =============================================================================

describe('geoFromNumber', () => {
	it('geoFromNumber(5) -> exact', () => {
		const result = geoFromNumber(5);
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBe(5);
	});

	it('geoFromNumber(0) -> exact', () => {
		expect(geoToNumber(geoFromNumber(0))).toBe(0);
	});

	it('geoFromNumber(-3) -> exact', () => {
		expect(geoToNumber(geoFromNumber(-3))).toBe(-3);
	});

	it('geoFromNumber(1.5) -> exact', () => {
		expect(geoToNumber(geoFromNumber(1.5))).toBe(1.5);
	});
});

describe('geoFromFraction', () => {
	it('geoFromFraction(1, 3) -> exact 1/3', () => {
		const result = geoFromFraction(1, 3);
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBeCloseTo(1 / 3, 10);
	});

	it('geoFromFraction(1, 2) -> exact 0.5', () => {
		expect(geoToNumber(geoFromFraction(1, 2))).toBe(0.5);
	});

	it('geoFromFraction(2, 4) simplifies to 1/2', () => {
		expect(geoEqual(geoFromFraction(2, 4), geoFromFraction(1, 2))).toBe(true);
	});

	it('geoFromFraction(-1, 3) -> exact negative', () => {
		expect(geoToNumber(geoFromFraction(-1, 3))).toBeCloseTo(-1 / 3, 10);
	});

	it('geoFromFraction(0, 5) -> exact 0', () => {
		expect(geoToNumber(geoFromFraction(0, 5))).toBe(0);
	});

	it('geoFromFraction accepts non-integer arguments', () => {
		const result = geoFromFraction(1.5, 2.5);
		expect(isExact(result)).toBe(true);
		expect(geoToNumber(result)).toBeCloseTo(0.6, 10);
	});
});

// =============================================================================
// Chained operations (test exact preservation through multiple steps)
// =============================================================================

describe('chained operations preserve exactness', () => {
	it('(1/3 + 1/6) = 1/2 exactly', () => {
		const a = geoFromFraction(1, 3);
		const b = geoFromFraction(1, 6);
		const result = geoAdd(a, b);
		expect(isExact(result)).toBe(true);
		expect(geoEqual(result, geoFromFraction(1, 2))).toBe(true);
	});

	it('(a + b) - b = a exactly', () => {
		const a = geoFromFraction(1, 7);
		const b = geoFromFraction(3, 11);
		const result = geoSub(geoAdd(a, b), b);
		expect(isExact(result)).toBe(true);
		expect(geoEqual(result, a)).toBe(true);
	});

	it('a * (1/a) = 1 exactly', () => {
		const a = geoFromFraction(3, 7);
		const inv = geoDiv(geoFromNumber(1), a)!;
		const result = geoMul(a, inv);
		expect(isExact(result)).toBe(true);
		expect(geoEqual(result, geoFromNumber(1))).toBe(true);
	});

	it('midpoint formula: (a + b) / 2 stays exact', () => {
		const a = geoFromFraction(1, 3);
		const b = geoFromFraction(2, 3);
		const mid = geoDiv(geoAdd(a, b), geoFromNumber(2))!;
		expect(isExact(mid)).toBe(true);
		expect(geoEqual(mid, geoFromFraction(1, 2))).toBe(true);
	});

	it('distance squared: dx*dx + dy*dy stays exact', () => {
		const dx = geoFromFraction(3, 1);
		const dy = geoFromFraction(4, 1);
		const dist2 = geoAdd(geoMul(dx, dx), geoMul(dy, dy));
		expect(isExact(dist2)).toBe(true);
		expect(geoEqual(dist2, geoFromNumber(25))).toBe(true);
	});
});
