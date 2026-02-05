/**
 * Tests for Interval Arithmetic Operations
 *
 * Comprehensive edge case coverage for:
 * - add (Minkowski sum)
 * - subtract (Minkowski difference)
 * - multiply
 * - divide
 * - negate
 * - scale
 * - getBoundsFromDomain / domainFromBounds
 */

import { describe, it, expect } from 'vitest';
import {
	add,
	subtract,
	multiply,
	divide,
	negate,
	scale,
	getBoundsFromDomain,
	domainFromBounds,
	containsValue,
	intervalSet,
	closedInterval,
	openInterval,
	leftClosedInterval,
	rightClosedInterval,
	fromNumber,
	positiveReals,
	nonNegativeReals,
	unitInterval,
	emptySet,
	universalSet,
	lessThan,
	lessThanOrEqual
} from '../index';
import { number } from '$lib/mathAST/factory';

// Helper to create a number MathNode for containsValue
const n = (value: number) => number(String(value));

// Helper to create a closed interval [a, b]
function closed(a: number, b: number) {
	return intervalSet([closedInterval(fromNumber(a), fromNumber(b))]);
}

// Helper to create an open interval ]a, b[
function open(a: number, b: number) {
	return intervalSet([openInterval(fromNumber(a), fromNumber(b))]);
}

// Helper to create [a, b[
function leftClosed(a: number, b: number) {
	return intervalSet([leftClosedInterval(fromNumber(a), fromNumber(b))]);
}

// Helper to create ]a, b]
function rightClosed(a: number, b: number) {
	return intervalSet([rightClosedInterval(fromNumber(a), fromNumber(b))]);
}

describe('Interval Arithmetic', () => {
	// =========================================================================
	// getBoundsFromDomain
	// =========================================================================
	describe('getBoundsFromDomain', () => {
		it('returns null for empty set', () => {
			expect(getBoundsFromDomain(emptySet())).toBeNull();
		});

		it('returns unbounded for universal set', () => {
			const bounds = getBoundsFromDomain(universalSet());
			expect(bounds).toEqual({
				lower: null,
				upper: null,
				lowerInclusive: false,
				upperInclusive: false
			});
		});

		it('extracts bounds from closed interval [2, 5]', () => {
			const bounds = getBoundsFromDomain(closed(2, 5));
			expect(bounds).toEqual({
				lower: 2,
				upper: 5,
				lowerInclusive: true,
				upperInclusive: true
			});
		});

		it('extracts bounds from open interval ]2, 5[', () => {
			const bounds = getBoundsFromDomain(open(2, 5));
			expect(bounds).toEqual({
				lower: 2,
				upper: 5,
				lowerInclusive: false,
				upperInclusive: false
			});
		});

		it('extracts bounds from half-open interval [2, 5[', () => {
			const bounds = getBoundsFromDomain(leftClosed(2, 5));
			expect(bounds).toEqual({
				lower: 2,
				upper: 5,
				lowerInclusive: true,
				upperInclusive: false
			});
		});

		it('extracts bounds from half-open interval ]2, 5]', () => {
			const bounds = getBoundsFromDomain(rightClosed(2, 5));
			expect(bounds).toEqual({
				lower: 2,
				upper: 5,
				lowerInclusive: false,
				upperInclusive: true
			});
		});

		it('handles ]0, +∞[', () => {
			const bounds = getBoundsFromDomain(positiveReals());
			expect(bounds?.lower).toBe(0);
			expect(bounds?.lowerInclusive).toBe(false);
			expect(bounds?.upper).toBeNull();
		});

		it('handles [0, +∞[', () => {
			const bounds = getBoundsFromDomain(nonNegativeReals());
			expect(bounds?.lower).toBe(0);
			expect(bounds?.lowerInclusive).toBe(true);
			expect(bounds?.upper).toBeNull();
		});

		it('handles ]-∞, 5]', () => {
			const domain = intervalSet([lessThanOrEqual(fromNumber(5))]);
			const bounds = getBoundsFromDomain(domain);
			expect(bounds?.lower).toBeNull();
			expect(bounds?.upper).toBe(5);
			expect(bounds?.upperInclusive).toBe(true);
		});

		it('handles ]-∞, 5[', () => {
			const domain = intervalSet([lessThan(fromNumber(5))]);
			const bounds = getBoundsFromDomain(domain);
			expect(bounds?.lower).toBeNull();
			expect(bounds?.upper).toBe(5);
			expect(bounds?.upperInclusive).toBe(false);
		});

		it('handles disjoint intervals (returns convex hull)', () => {
			const domain = intervalSet([
				closedInterval(fromNumber(1), fromNumber(2)),
				closedInterval(fromNumber(5), fromNumber(7))
			]);
			const bounds = getBoundsFromDomain(domain);
			expect(bounds?.lower).toBe(1);
			expect(bounds?.upper).toBe(7);
		});
	});

	// =========================================================================
	// domainFromBounds
	// =========================================================================
	describe('domainFromBounds', () => {
		it('creates universal from unbounded', () => {
			const domain = domainFromBounds({
				lower: null,
				upper: null,
				lowerInclusive: false,
				upperInclusive: false
			});
			expect(domain.kind).toBe('universal');
		});

		it('creates empty from inverted bounds', () => {
			const domain = domainFromBounds({
				lower: 5,
				upper: 2,
				lowerInclusive: true,
				upperInclusive: true
			});
			expect(domain.kind).toBe('empty');
		});

		it('creates closed interval [2, 5]', () => {
			const domain = domainFromBounds({
				lower: 2,
				upper: 5,
				lowerInclusive: true,
				upperInclusive: true
			});
			expect(containsValue(domain, n(2))).toBe(true);
			expect(containsValue(domain, n(5))).toBe(true);
			expect(containsValue(domain, n(3))).toBe(true);
			expect(containsValue(domain, n(1))).toBe(false);
		});

		it('creates open interval ]2, 5[', () => {
			const domain = domainFromBounds({
				lower: 2,
				upper: 5,
				lowerInclusive: false,
				upperInclusive: false
			});
			expect(containsValue(domain, n(2))).toBe(false);
			expect(containsValue(domain, n(5))).toBe(false);
			expect(containsValue(domain, n(3))).toBe(true);
		});

		it('creates [2, +∞[', () => {
			const domain = domainFromBounds({
				lower: 2,
				upper: null,
				lowerInclusive: true,
				upperInclusive: false
			});
			expect(containsValue(domain, n(2))).toBe(true);
			expect(containsValue(domain, n(100))).toBe(true);
			expect(containsValue(domain, n(1))).toBe(false);
		});

		it('creates ]-∞, 5]', () => {
			const domain = domainFromBounds({
				lower: null,
				upper: 5,
				lowerInclusive: false,
				upperInclusive: true
			});
			expect(containsValue(domain, n(5))).toBe(true);
			expect(containsValue(domain, n(-100))).toBe(true);
			expect(containsValue(domain, n(6))).toBe(false);
		});

		it('creates single point {3} from [3, 3]', () => {
			const domain = domainFromBounds({
				lower: 3,
				upper: 3,
				lowerInclusive: true,
				upperInclusive: true
			});
			expect(containsValue(domain, n(3))).toBe(true);
			expect(containsValue(domain, n(2.9))).toBe(false);
			expect(containsValue(domain, n(3.1))).toBe(false);
		});
	});

	// =========================================================================
	// add (Minkowski sum)
	// =========================================================================
	describe('add (Minkowski sum)', () => {
		it('[-1, 1] + [-1, 1] = [-2, 2]', () => {
			const result = add(unitInterval(), unitInterval());
			expect(containsValue(result, n(-2))).toBe(true);
			expect(containsValue(result, n(2))).toBe(true);
			expect(containsValue(result, n(0))).toBe(true);
			expect(containsValue(result, n(-3))).toBe(false);
			expect(containsValue(result, n(3))).toBe(false);
		});

		it('[1, 3] + [2, 4] = [3, 7]', () => {
			const result = add(closed(1, 3), closed(2, 4));
			expect(containsValue(result, n(3))).toBe(true);
			expect(containsValue(result, n(7))).toBe(true);
			expect(containsValue(result, n(5))).toBe(true);
			expect(containsValue(result, n(2))).toBe(false);
			expect(containsValue(result, n(8))).toBe(false);
		});

		it(']0, 1] + [1, 2[ = ]1, 3[', () => {
			const result = add(rightClosed(0, 1), leftClosed(1, 2));
			expect(containsValue(result, n(1))).toBe(false); // open at 1
			expect(containsValue(result, n(3))).toBe(false); // open at 3
			expect(containsValue(result, n(2))).toBe(true);
		});

		it('[0, 1] + ]1, 2[ = ]1, 3[ (open wins over closed)', () => {
			const result = add(closed(0, 1), open(1, 2));
			expect(containsValue(result, n(1))).toBe(false); // open (0+1 uses closed+open = open)
			expect(containsValue(result, n(3))).toBe(false); // open
			expect(containsValue(result, n(2))).toBe(true);
		});

		it('empty + anything = empty', () => {
			expect(add(emptySet(), closed(1, 2)).kind).toBe('empty');
			expect(add(closed(1, 2), emptySet()).kind).toBe('empty');
		});

		it('universal + bounded = universal', () => {
			expect(add(universalSet(), closed(1, 2)).kind).toBe('universal');
			expect(add(closed(1, 2), universalSet()).kind).toBe('universal');
		});

		it('[1, 2] + [0, +∞[ = [1, +∞[', () => {
			const result = add(closed(1, 2), nonNegativeReals());
			expect(containsValue(result, n(1))).toBe(true);
			expect(containsValue(result, n(100))).toBe(true);
			expect(containsValue(result, n(0))).toBe(false);
		});

		it('[-5, -2] + [1, 3] = [-4, 1]', () => {
			const result = add(closed(-5, -2), closed(1, 3));
			expect(containsValue(result, n(-4))).toBe(true);
			expect(containsValue(result, n(1))).toBe(true);
			expect(containsValue(result, n(0))).toBe(true);
		});

		it('{0} + [1, 2] = [1, 2] (adding zero)', () => {
			const zero = closed(0, 0);
			const result = add(zero, closed(1, 2));
			expect(containsValue(result, n(1))).toBe(true);
			expect(containsValue(result, n(2))).toBe(true);
			expect(containsValue(result, n(0))).toBe(false);
		});
	});

	// =========================================================================
	// subtract (Minkowski difference)
	// =========================================================================
	describe('subtract (Minkowski difference)', () => {
		it('[3, 5] - [1, 2] = [1, 4]', () => {
			const result = subtract(closed(3, 5), closed(1, 2));
			expect(containsValue(result, n(1))).toBe(true);
			expect(containsValue(result, n(4))).toBe(true);
			expect(containsValue(result, n(2))).toBe(true);
			expect(containsValue(result, n(0))).toBe(false);
			expect(containsValue(result, n(5))).toBe(false);
		});

		it('[0, 10] - [0, 10] = [-10, 10]', () => {
			const result = subtract(closed(0, 10), closed(0, 10));
			expect(containsValue(result, n(-10))).toBe(true);
			expect(containsValue(result, n(10))).toBe(true);
			expect(containsValue(result, n(0))).toBe(true);
		});

		it('[5, 7] - [1, 2] with open endpoints', () => {
			const result = subtract(leftClosed(5, 7), rightClosed(1, 2));
			// [5, 7[ - ]1, 2] = [5-2, 7-1[ = [3, 6[
			expect(containsValue(result, n(3))).toBe(true); // closed
			expect(containsValue(result, n(6))).toBe(false); // open
		});

		it('empty - anything = empty', () => {
			expect(subtract(emptySet(), closed(1, 2)).kind).toBe('empty');
		});

		it('[1, 2] - universal = universal', () => {
			expect(subtract(closed(1, 2), universalSet()).kind).toBe('universal');
		});

		it('[0, 5] - {3} = [-3, 5]', () => {
			const result = subtract(closed(0, 5), closed(3, 3));
			expect(containsValue(result, n(-3))).toBe(true);
			expect(containsValue(result, n(5))).toBe(false); // 5-3=2, not 5
			expect(containsValue(result, n(2))).toBe(true);
		});
	});

	// =========================================================================
	// negate
	// =========================================================================
	describe('negate', () => {
		it('-[1, 3] = [-3, -1]', () => {
			const result = negate(closed(1, 3));
			expect(containsValue(result, n(-3))).toBe(true);
			expect(containsValue(result, n(-1))).toBe(true);
			expect(containsValue(result, n(-2))).toBe(true);
			expect(containsValue(result, n(0))).toBe(false);
			expect(containsValue(result, n(1))).toBe(false);
		});

		it('-[-5, -2] = [2, 5]', () => {
			const result = negate(closed(-5, -2));
			expect(containsValue(result, n(2))).toBe(true);
			expect(containsValue(result, n(5))).toBe(true);
			expect(containsValue(result, n(-1))).toBe(false);
		});

		it('-[-3, 3] = [-3, 3] (symmetric)', () => {
			const result = negate(closed(-3, 3));
			expect(containsValue(result, n(-3))).toBe(true);
			expect(containsValue(result, n(3))).toBe(true);
			expect(containsValue(result, n(0))).toBe(true);
		});

		it('-]0, +∞[ = ]-∞, 0[', () => {
			const result = negate(positiveReals());
			expect(containsValue(result, n(0))).toBe(false);
			expect(containsValue(result, n(-1))).toBe(true);
			expect(containsValue(result, n(-100))).toBe(true);
			expect(containsValue(result, n(1))).toBe(false);
		});

		it('-]a, b] = [-b, -a[', () => {
			const result = negate(rightClosed(1, 3));
			// -]1, 3] = [-3, -1[
			expect(containsValue(result, n(-3))).toBe(true); // closed
			expect(containsValue(result, n(-1))).toBe(false); // open
		});

		it('-empty = empty', () => {
			expect(negate(emptySet()).kind).toBe('empty');
		});

		it('-universal = universal', () => {
			expect(negate(universalSet()).kind).toBe('universal');
		});
	});

	// =========================================================================
	// scale
	// =========================================================================
	describe('scale', () => {
		it('2 * [1, 3] = [2, 6]', () => {
			const result = scale(closed(1, 3), 2);
			expect(containsValue(result, n(2))).toBe(true);
			expect(containsValue(result, n(6))).toBe(true);
			expect(containsValue(result, n(4))).toBe(true);
			expect(containsValue(result, n(1))).toBe(false);
			expect(containsValue(result, n(7))).toBe(false);
		});

		it('(-2) * [1, 3] = [-6, -2]', () => {
			const result = scale(closed(1, 3), -2);
			expect(containsValue(result, n(-6))).toBe(true);
			expect(containsValue(result, n(-2))).toBe(true);
			expect(containsValue(result, n(-4))).toBe(true);
			expect(containsValue(result, n(0))).toBe(false);
		});

		it('0 * [1, 3] = {0}', () => {
			const result = scale(closed(1, 3), 0);
			expect(containsValue(result, n(0))).toBe(true);
			expect(containsValue(result, n(1))).toBe(false);
			expect(containsValue(result, n(-1))).toBe(false);
		});

		it('1 * [1, 3] = [1, 3]', () => {
			const result = scale(closed(1, 3), 1);
			expect(containsValue(result, n(1))).toBe(true);
			expect(containsValue(result, n(3))).toBe(true);
		});

		it('0.5 * [2, 6] = [1, 3]', () => {
			const result = scale(closed(2, 6), 0.5);
			expect(containsValue(result, n(1))).toBe(true);
			expect(containsValue(result, n(3))).toBe(true);
			expect(containsValue(result, n(2))).toBe(true);
		});

		it('(-1) * ]a, b] = [-b, -a[', () => {
			const result = scale(rightClosed(1, 3), -1);
			expect(containsValue(result, n(-3))).toBe(true); // closed
			expect(containsValue(result, n(-1))).toBe(false); // open
		});

		it('scale empty = empty', () => {
			expect(scale(emptySet(), 5).kind).toBe('empty');
		});

		it('scale universal = universal', () => {
			expect(scale(universalSet(), 5).kind).toBe('universal');
		});

		it('0 * universal = {0}', () => {
			const result = scale(universalSet(), 0);
			expect(containsValue(result, n(0))).toBe(true);
			expect(containsValue(result, n(1))).toBe(false);
		});
	});

	// =========================================================================
	// multiply
	// =========================================================================
	describe('multiply', () => {
		it('[1, 2] * [3, 4] = [3, 8]', () => {
			const result = multiply(closed(1, 2), closed(3, 4));
			expect(containsValue(result, n(3))).toBe(true);
			expect(containsValue(result, n(8))).toBe(true);
			expect(containsValue(result, n(5))).toBe(true);
			expect(containsValue(result, n(2))).toBe(false);
			expect(containsValue(result, n(9))).toBe(false);
		});

		it('[-2, 3] * [1, 4] = [-8, 12]', () => {
			const result = multiply(closed(-2, 3), closed(1, 4));
			// Products: -2*1=-2, -2*4=-8, 3*1=3, 3*4=12
			expect(containsValue(result, n(-8))).toBe(true);
			expect(containsValue(result, n(12))).toBe(true);
			expect(containsValue(result, n(0))).toBe(true);
		});

		it('[-3, -1] * [-4, -2] = [2, 12]', () => {
			const result = multiply(closed(-3, -1), closed(-4, -2));
			// Products: (-3)*(-4)=12, (-3)*(-2)=6, (-1)*(-4)=4, (-1)*(-2)=2
			expect(containsValue(result, n(2))).toBe(true);
			expect(containsValue(result, n(12))).toBe(true);
			expect(containsValue(result, n(6))).toBe(true);
			expect(containsValue(result, n(0))).toBe(false);
		});

		it('[0, 2] * [3, 4] = [0, 8]', () => {
			const result = multiply(closed(0, 2), closed(3, 4));
			expect(containsValue(result, n(0))).toBe(true);
			expect(containsValue(result, n(8))).toBe(true);
			expect(containsValue(result, n(-1))).toBe(false);
		});

		it('{0} * [1, 2] = {0}', () => {
			const result = multiply(closed(0, 0), closed(1, 2));
			expect(containsValue(result, n(0))).toBe(true);
			expect(containsValue(result, n(1))).toBe(false);
		});

		it('empty * anything = empty', () => {
			expect(multiply(emptySet(), closed(1, 2)).kind).toBe('empty');
		});

		it('unbounded * bounded = universal', () => {
			expect(multiply(nonNegativeReals(), closed(1, 2)).kind).toBe('universal');
		});

		it('endpoint types preserved in multiplication', () => {
			const result = multiply(open(1, 2), closed(2, 3));
			// ]1, 2[ * [2, 3] = products at corners with mixed types
			// Min: 1*2=2 (open*closed = open)
			// Max: 2*3=6 (open*closed = open)
			expect(containsValue(result, n(2))).toBe(false); // open
			expect(containsValue(result, n(6))).toBe(false); // open
			expect(containsValue(result, n(4))).toBe(true);
		});
	});

	// =========================================================================
	// divide
	// =========================================================================
	describe('divide', () => {
		it('[6, 12] / [2, 3] = [2, 6]', () => {
			const result = divide(closed(6, 12), closed(2, 3));
			expect(containsValue(result, n(2))).toBe(true);
			expect(containsValue(result, n(6))).toBe(true);
			expect(containsValue(result, n(4))).toBe(true);
			expect(containsValue(result, n(1))).toBe(false);
			expect(containsValue(result, n(7))).toBe(false);
		});

		it('[1, 10] / [2, 5] = [0.2, 5]', () => {
			const result = divide(closed(1, 10), closed(2, 5));
			expect(containsValue(result, n(0.2))).toBe(true);
			expect(containsValue(result, n(5))).toBe(true);
			expect(containsValue(result, n(1))).toBe(true);
		});

		it('division by interval containing 0 returns universal', () => {
			const result = divide(closed(1, 2), closed(-1, 1));
			expect(result.kind).toBe('universal');
		});

		it('division by [0, 1] returns universal', () => {
			const result = divide(closed(1, 2), closed(0, 1));
			expect(result.kind).toBe('universal');
		});

		it('division by [-1, 0] returns universal', () => {
			const result = divide(closed(1, 2), closed(-1, 0));
			expect(result.kind).toBe('universal');
		});

		it('[0, 6] / [2, 3] = [0, 3]', () => {
			const result = divide(closed(0, 6), closed(2, 3));
			expect(containsValue(result, n(0))).toBe(true);
			expect(containsValue(result, n(3))).toBe(true);
			expect(containsValue(result, n(-1))).toBe(false);
		});

		it('empty / anything = empty', () => {
			expect(divide(emptySet(), closed(1, 2)).kind).toBe('empty');
		});

		it('[1, 2] / empty = empty', () => {
			expect(divide(closed(1, 2), emptySet()).kind).toBe('empty');
		});

		it('[-6, -2] / [1, 2] = [-6, -1]', () => {
			const result = divide(closed(-6, -2), closed(1, 2));
			expect(containsValue(result, n(-6))).toBe(true);
			expect(containsValue(result, n(-1))).toBe(true);
			expect(containsValue(result, n(-3))).toBe(true);
			expect(containsValue(result, n(0))).toBe(false);
		});
	});

	// =========================================================================
	// Composition and Chaining
	// =========================================================================
	describe('composition and chaining', () => {
		it('(a + b) - b = a', () => {
			const a = closed(1, 3);
			const b = closed(2, 4);
			const result = subtract(add(a, b), b);
			// [1,3] + [2,4] = [3,7]
			// [3,7] - [2,4] = [3-4, 7-2] = [-1, 5]
			// Not exactly a, but contains a
			expect(containsValue(result, n(1))).toBe(true);
			expect(containsValue(result, n(3))).toBe(true);
		});

		it('-(-a) = a', () => {
			const a = closed(-5, 3);
			const result = negate(negate(a));
			expect(containsValue(result, n(-5))).toBe(true);
			expect(containsValue(result, n(3))).toBe(true);
			expect(containsValue(result, n(0))).toBe(true);
		});

		it('2 * (3 * a) = 6 * a', () => {
			const a = closed(1, 2);
			const result1 = scale(scale(a, 3), 2);
			const result2 = scale(a, 6);
			// Both should be [6, 12]
			expect(containsValue(result1, n(6))).toBe(true);
			expect(containsValue(result1, n(12))).toBe(true);
			expect(containsValue(result2, n(6))).toBe(true);
			expect(containsValue(result2, n(12))).toBe(true);
		});

		it('a * b = b * a (commutativity)', () => {
			const a = closed(1, 3);
			const b = closed(2, 4);
			const result1 = multiply(a, b);
			const result2 = multiply(b, a);
			// Both should be [2, 12]
			expect(containsValue(result1, n(2))).toBe(true);
			expect(containsValue(result1, n(12))).toBe(true);
			expect(containsValue(result2, n(2))).toBe(true);
			expect(containsValue(result2, n(12))).toBe(true);
		});

		it('a + b = b + a (commutativity)', () => {
			const a = closed(1, 3);
			const b = closed(2, 4);
			const result1 = add(a, b);
			const result2 = add(b, a);
			// Both should be [3, 7]
			expect(containsValue(result1, n(3))).toBe(true);
			expect(containsValue(result1, n(7))).toBe(true);
			expect(containsValue(result2, n(3))).toBe(true);
			expect(containsValue(result2, n(7))).toBe(true);
		});

		it('(a + b) + c = a + (b + c) (associativity)', () => {
			const a = closed(1, 2);
			const b = closed(3, 4);
			const c = closed(5, 6);
			const result1 = add(add(a, b), c);
			const result2 = add(a, add(b, c));
			// Both should be [9, 12]
			expect(containsValue(result1, n(9))).toBe(true);
			expect(containsValue(result1, n(12))).toBe(true);
			expect(containsValue(result2, n(9))).toBe(true);
			expect(containsValue(result2, n(12))).toBe(true);
		});
	});

	// =========================================================================
	// Edge Cases with Boundaries
	// =========================================================================
	describe('edge cases with boundaries', () => {
		it('single point + single point = single point', () => {
			const result = add(closed(3, 3), closed(5, 5));
			expect(containsValue(result, n(8))).toBe(true);
			expect(containsValue(result, n(7))).toBe(false);
			expect(containsValue(result, n(9))).toBe(false);
		});

		it('single point * single point = single point', () => {
			const result = multiply(closed(3, 3), closed(4, 4));
			expect(containsValue(result, n(12))).toBe(true);
			expect(containsValue(result, n(11))).toBe(false);
		});

		it('very small interval', () => {
			const result = add(closed(0.001, 0.002), closed(0.003, 0.004));
			expect(containsValue(result, n(0.004))).toBe(true);
			expect(containsValue(result, n(0.006))).toBe(true);
		});

		it('very large interval', () => {
			const result = add(closed(1e10, 2e10), closed(3e10, 4e10));
			expect(containsValue(result, n(4e10))).toBe(true);
			expect(containsValue(result, n(6e10))).toBe(true);
		});

		it('interval crossing zero', () => {
			const a = closed(-1, 1);
			const b = closed(-2, 2);
			const result = multiply(a, b);
			// Products: 2, -2, 2, -2 => min=-2, max=2
			expect(containsValue(result, n(-2))).toBe(true);
			expect(containsValue(result, n(2))).toBe(true);
			expect(containsValue(result, n(0))).toBe(true);
		});
	});
});
