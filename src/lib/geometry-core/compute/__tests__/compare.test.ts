import { describe, it, expect } from 'vitest';
import { geoEqual, geoIsZero, geoLessThan, geoApproxEqual } from '../compare';
import { geoFromNumber, geoFromFraction, geoSub, geoMul, geoAdd } from '../geo-arithmetic';
import { exact, numeric } from '../../types/geo-value';
import { number, add, subtract, sqrt, multiply, fraction, opposite } from '$lib/mathAST';

// =============================================================================
// geoEqual - exact values (algebraic equivalence via normalize)
// =============================================================================

describe('geoEqual - exact values', () => {
	it('same literal -> true', () => {
		expect(geoEqual(exact(number('5')), exact(number('5')))).toBe(true);
	});

	it('2 + 3 = 5 (simplification)', () => {
		expect(geoEqual(exact(add(number('2'), number('3'))), exact(number('5')))).toBe(true);
	});

	it('sqrt(2) = sqrt(2)', () => {
		expect(geoEqual(exact(sqrt(number('2'))), exact(sqrt(number('2'))))).toBe(true);
	});

	it('sqrt(8) = 2*sqrt(2) (radical normalization)', () => {
		expect(
			geoEqual(exact(sqrt(number('8'))), exact(multiply(number('2'), sqrt(number('2')), 'dot')))
		).toBe(true);
	});

	it('sqrt(18) = 3*sqrt(2)', () => {
		expect(
			geoEqual(exact(sqrt(number('18'))), exact(multiply(number('3'), sqrt(number('2')), 'dot')))
		).toBe(true);
	});

	it('1/3 + 1/6 = 1/2', () => {
		const a = exact(fraction(number('1'), number('3')));
		const b = exact(fraction(number('1'), number('6')));
		const sum = exact(add(a.node, b.node));
		expect(geoEqual(sum, exact(fraction(number('1'), number('2'))))).toBe(true);
	});

	it('a - a = 0 for any algebraic expression', () => {
		const a = exact(sqrt(number('7')));
		expect(geoEqual(exact(subtract(a.node, a.node)), exact(number('0')))).toBe(true);
	});

	it('different values -> false', () => {
		expect(geoEqual(exact(number('3')), exact(number('4')))).toBe(false);
	});

	it('sqrt(2) != sqrt(3)', () => {
		expect(geoEqual(exact(sqrt(number('2'))), exact(sqrt(number('3'))))).toBe(false);
	});

	it('0 = 0', () => {
		expect(geoEqual(exact(number('0')), exact(number('0')))).toBe(true);
	});

	it('-5 = -5 (opposite of 5 equals itself)', () => {
		// Note: this previously tested dual-representation (number('-5') ≡ opposite(number('5')))
		// but number('-5') is now rejected by the factory. The canonical form is
		// opposite(number('5')) — see migrate-negative-numbers-progress.md.
		expect(geoEqual(exact(opposite(number('5'))), exact(opposite(number('5'))))).toBe(true);
	});

	it('2/4 = 1/2 (fraction simplification)', () => {
		expect(geoEqual(geoFromFraction(2, 4), geoFromFraction(1, 2))).toBe(true);
	});
});

// =============================================================================
// geoEqual - numeric values (float tolerance)
// =============================================================================

describe('geoEqual - numeric values', () => {
	it('0.1 + 0.2 = 0.3 (classic float issue)', () => {
		expect(geoEqual(numeric(0.1 + 0.2), numeric(0.3))).toBe(true);
	});

	it('values within relative tolerance -> true', () => {
		expect(geoEqual(numeric(1), numeric(1.0000000000001))).toBe(true);
	});

	it('clearly different values -> false', () => {
		expect(geoEqual(numeric(1), numeric(2))).toBe(false);
	});

	it('both zero -> true', () => {
		expect(geoEqual(numeric(0), numeric(0))).toBe(true);
	});

	it('geoEqual near zero uses relative tolerance (not absolute)', () => {
		// geoEqual delegates to geoApproxEqual which is relative
		// For absolute zero checks, use geoIsZero instead
		expect(geoEqual(numeric(0), numeric(1e-16))).toBe(false);
		expect(geoEqual(numeric(0), numeric(0))).toBe(true);
	});

	it('zero and not-so-small -> false', () => {
		expect(geoEqual(numeric(0), numeric(0.001))).toBe(false);
	});

	it('large numbers with small relative diff -> true', () => {
		expect(geoEqual(numeric(1e10), numeric(1e10 + 1e-4))).toBe(true);
	});

	it('large numbers with large absolute diff -> false', () => {
		expect(geoEqual(numeric(1e10), numeric(1e10 + 1e10))).toBe(false);
	});

	it('negative numbers', () => {
		expect(geoEqual(numeric(-5), numeric(-5))).toBe(true);
		expect(geoEqual(numeric(-5), numeric(-6))).toBe(false);
	});
});

// =============================================================================
// geoEqual - mixed exact/numeric
// =============================================================================

describe('geoEqual - mixed exact/numeric', () => {
	it('exact(5) = numeric(5)', () => {
		expect(geoEqual(exact(number('5')), numeric(5))).toBe(true);
	});

	it('exact(5) != numeric(6)', () => {
		expect(geoEqual(exact(number('5')), numeric(6))).toBe(false);
	});

	it('exact(1/3) ≈ numeric(0.333...)', () => {
		expect(geoEqual(exact(fraction(number('1'), number('3'))), numeric(1 / 3))).toBe(true);
	});
});

// =============================================================================
// geoIsZero
// =============================================================================

describe('geoIsZero', () => {
	it('exact(0) -> true', () => {
		expect(geoIsZero(exact(number('0')))).toBe(true);
	});

	it('exact(3-3) -> true (normalizes to 0)', () => {
		expect(geoIsZero(exact(subtract(number('3'), number('3'))))).toBe(true);
	});

	it('exact(sqrt(2) - sqrt(2)) -> true', () => {
		expect(geoIsZero(exact(subtract(sqrt(number('2')), sqrt(number('2')))))).toBe(true);
	});

	it('exact(0 * anything) -> true', () => {
		expect(geoIsZero(exact(multiply(number('0'), sqrt(number('7')), 'dot')))).toBe(true);
	});

	it('exact(1) -> false', () => {
		expect(geoIsZero(exact(number('1')))).toBe(false);
	});

	it('exact(sqrt(2)) -> false', () => {
		expect(geoIsZero(exact(sqrt(number('2'))))).toBe(false);
	});

	it('exact(1/1000000) -> false (small but not zero)', () => {
		expect(geoIsZero(exact(fraction(number('1'), number('1000000'))))).toBe(false);
	});

	it('numeric(0) -> true', () => {
		expect(geoIsZero(numeric(0))).toBe(true);
	});

	it('numeric very close to 0 -> true', () => {
		expect(geoIsZero(numeric(1e-16))).toBe(true);
		expect(geoIsZero(numeric(-1e-16))).toBe(true);
	});

	it('numeric not close to 0 -> false', () => {
		expect(geoIsZero(numeric(0.001))).toBe(false);
		expect(geoIsZero(numeric(-0.001))).toBe(false);
	});
});

// =============================================================================
// geoLessThan
// =============================================================================

describe('geoLessThan', () => {
	it('1 < 2 -> true', () => {
		expect(geoLessThan(numeric(1), numeric(2))).toBe(true);
	});

	it('2 < 1 -> false', () => {
		expect(geoLessThan(numeric(2), numeric(1))).toBe(false);
	});

	it('equal values -> false (strict)', () => {
		expect(geoLessThan(numeric(5), numeric(5))).toBe(false);
	});

	it('exact 1 < exact 2 -> true', () => {
		expect(geoLessThan(exact(number('1')), exact(number('2')))).toBe(true);
	});

	it('exact 2 < exact 1 -> false', () => {
		expect(geoLessThan(exact(number('2')), exact(number('1')))).toBe(false);
	});

	it('negative < positive -> true', () => {
		expect(geoLessThan(numeric(-5), numeric(5))).toBe(true);
	});

	it('0 < positive -> true', () => {
		expect(geoLessThan(numeric(0), numeric(1))).toBe(true);
	});

	it('negative < 0 -> true', () => {
		expect(geoLessThan(numeric(-1), numeric(0))).toBe(true);
	});

	it('works with mixed exact/numeric', () => {
		expect(geoLessThan(exact(number('1')), numeric(2))).toBe(true);
		expect(geoLessThan(numeric(1), exact(number('2')))).toBe(true);
	});

	it('sqrt(2) < 2 -> true', () => {
		expect(geoLessThan(exact(sqrt(number('2'))), exact(number('2')))).toBe(true);
	});

	it('2 < sqrt(2) -> false', () => {
		expect(geoLessThan(exact(number('2')), exact(sqrt(number('2'))))).toBe(false);
	});
});

// =============================================================================
// geoApproxEqual
// =============================================================================

describe('geoApproxEqual', () => {
	it('exactly equal -> true', () => {
		expect(geoApproxEqual(5, 5)).toBe(true);
	});

	it('0.1 + 0.2 vs 0.3 -> true', () => {
		expect(geoApproxEqual(0.1 + 0.2, 0.3)).toBe(true);
	});

	it('clearly different -> false', () => {
		expect(geoApproxEqual(1, 2)).toBe(false);
	});

	it('both zero -> true', () => {
		expect(geoApproxEqual(0, 0)).toBe(true);
	});

	it('custom tolerance', () => {
		expect(geoApproxEqual(1, 1.05, 0.1)).toBe(true);
		expect(geoApproxEqual(1, 1.2, 0.1)).toBe(false);
	});

	it('symmetric: approxEqual(a, b) = approxEqual(b, a)', () => {
		expect(geoApproxEqual(1, 1.0000000000001)).toBe(true);
		expect(geoApproxEqual(1.0000000000001, 1)).toBe(true);
	});

	it('geoApproxEqual is relative, not absolute near zero', () => {
		// geoApproxEqual uses relative tolerance: diff/magnitude < 1e-12
		// Near zero, magnitude floor is 1e-15, so 1e-16/1e-15 = 0.1 > 1e-12 -> false
		// This is by design: use geoIsZero for absolute zero checks
		expect(geoApproxEqual(1e-16, 0)).toBe(false);
		expect(geoApproxEqual(0, 1e-10)).toBe(false);
	});
});

// =============================================================================
// Geometric predicates simulation (what the geometry module will use)
// =============================================================================

describe('geometric predicate patterns', () => {
	it('cross product = 0 detects parallel (exact)', () => {
		// Vectors (2, 4) and (1, 2) are parallel: 2*2 - 4*1 = 0
		const cross = geoSub(
			geoMul(geoFromNumber(2), geoFromNumber(2)),
			geoMul(geoFromNumber(4), geoFromNumber(1))
		);
		expect(geoIsZero(cross)).toBe(true);
	});

	it('cross product != 0 detects non-parallel (exact)', () => {
		// Vectors (2, 3) and (1, 2): 2*2 - 3*1 = 1
		const cross = geoSub(
			geoMul(geoFromNumber(2), geoFromNumber(2)),
			geoMul(geoFromNumber(3), geoFromNumber(1))
		);
		expect(geoIsZero(cross)).toBe(false);
	});

	it('dot product = 0 detects perpendicular (exact)', () => {
		// Vectors (2, 3) and (-3, 2): 2*(-3) + 3*2 = 0
		const dot = geoAdd(
			geoMul(geoFromNumber(2), geoFromNumber(-3)),
			geoMul(geoFromNumber(3), geoFromNumber(2))
		);
		expect(geoIsZero(dot)).toBe(true);
	});

	it('distance^2 comparison avoids sqrt (exact)', () => {
		// Distance from (0,0) to (3,4) = 5, so distance^2 = 25
		const dist2 = geoAdd(
			geoMul(geoFromNumber(3), geoFromNumber(3)),
			geoMul(geoFromNumber(4), geoFromNumber(4))
		);
		expect(geoEqual(dist2, geoFromNumber(25))).toBe(true);
	});
});
