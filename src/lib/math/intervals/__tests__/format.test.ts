/**
 * Tests for format.ts
 *
 * Tests interval and domain formatting functions.
 */

import { describe, it, expect } from 'vitest';
import {
	formatDomainInterval,
	formatDomainCondition,
	formatDomainFull,
	formatEndpointValue
} from '../format';
import {
	fromNumber,
	rationalBound,
	radicalBound,
	closedInterval,
	openInterval,
	greaterThan,
	greaterThanOrEqual,
	lessThan,
	lessThanOrEqual,
	realLine,
	emptySet,
	universalSet,
	intervalSet,
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval
} from '../factory';

describe('formatEndpointValue', () => {
	it('formats positive infinity', () => {
		const inf = { kind: 'infinity' as const, value: 'positive_infinity' as const };
		expect(formatEndpointValue(inf)).toBe('+∞');
	});

	it('formats negative infinity', () => {
		const inf = { kind: 'infinity' as const, value: 'negative_infinity' as const };
		expect(formatEndpointValue(inf)).toBe('-∞');
	});

	it('formats integer algebraic values', () => {
		expect(formatEndpointValue(fromNumber(0))).toBe('0');
		expect(formatEndpointValue(fromNumber(1))).toBe('1');
		expect(formatEndpointValue(fromNumber(-5))).toBe('-5');
		expect(formatEndpointValue(fromNumber(42))).toBe('42');
	});

	it('formats rational algebraic values', () => {
		expect(formatEndpointValue(rationalBound(3n, 2n))).toBe('3/2');
		expect(formatEndpointValue(rationalBound(-1n, 3n))).toBe('-1/3');
	});

	it('formats simple square roots', () => {
		expect(formatEndpointValue(radicalBound(2n))).toBe('√2');
		expect(formatEndpointValue(radicalBound(3n))).toBe('√3');
	});

	it('formats negative square roots', () => {
		expect(formatEndpointValue(radicalBound(2n, -1n))).toBe('-√2');
	});

	it('formats coefficients with square roots', () => {
		expect(formatEndpointValue(radicalBound(2n, 2n))).toBe('2√2');
		expect(formatEndpointValue(radicalBound(3n, 3n))).toBe('3√3');
	});

	it('formats rational coefficients with square roots', () => {
		expect(formatEndpointValue(radicalBound(2n, 1n, 2n))).toBe('(1/2)√2');
	});
});

describe('formatDomainInterval', () => {
	it('formats empty set', () => {
		expect(formatDomainInterval(emptySet())).toBe('∅');
	});

	it('formats universal set', () => {
		expect(formatDomainInterval(universalSet())).toBe('ℝ');
	});

	it('formats real line as ℝ', () => {
		expect(formatDomainInterval(intervalSet([realLine()]))).toBe('ℝ');
	});

	it('formats closed interval', () => {
		const domain = intervalSet([closedInterval(fromNumber(0), fromNumber(1))]);
		expect(formatDomainInterval(domain)).toBe('[0, 1]');
	});

	it('formats open interval', () => {
		const domain = intervalSet([openInterval(fromNumber(0), fromNumber(1))]);
		expect(formatDomainInterval(domain)).toBe(']0, 1[');
	});

	it('formats greaterThan', () => {
		const domain = intervalSet([greaterThan(fromNumber(0))]);
		expect(formatDomainInterval(domain)).toBe(']0, +∞[');
	});

	it('formats greaterThanOrEqual', () => {
		const domain = intervalSet([greaterThanOrEqual(fromNumber(0))]);
		expect(formatDomainInterval(domain)).toBe('[0, +∞[');
	});

	it('formats lessThan', () => {
		const domain = intervalSet([lessThan(fromNumber(0))]);
		expect(formatDomainInterval(domain)).toBe(']-∞, 0[');
	});

	it('formats lessThanOrEqual', () => {
		const domain = intervalSet([lessThanOrEqual(fromNumber(0))]);
		expect(formatDomainInterval(domain)).toBe(']-∞, 0]');
	});

	it('formats union of intervals', () => {
		const domain = intervalSet([
			closedInterval(fromNumber(0), fromNumber(1)),
			closedInterval(fromNumber(2), fromNumber(3))
		]);
		expect(formatDomainInterval(domain)).toBe('[0, 1] ∪ [2, 3]');
	});

	it('formats excluded points', () => {
		expect(formatDomainInterval(nonZeroReals())).toBe('ℝ \\ {0}');
	});

	it('formats interval with algebraic bounds', () => {
		const sqrt2 = radicalBound(2n);
		const sqrt3 = radicalBound(3n);
		const domain = intervalSet([closedInterval(sqrt2, sqrt3)]);
		expect(formatDomainInterval(domain)).toBe('[√2, √3]');
	});

	it('formats positive reals', () => {
		expect(formatDomainInterval(positiveReals())).toBe(']0, +∞[');
	});

	it('formats non-negative reals', () => {
		expect(formatDomainInterval(nonNegativeReals())).toBe('[0, +∞[');
	});

	it('formats unit interval', () => {
		expect(formatDomainInterval(unitInterval())).toBe('[-1, 1]');
	});
});

describe('formatDomainCondition', () => {
	it('formats empty set', () => {
		expect(formatDomainCondition(emptySet())).toBe('aucune valeur');
	});

	it('formats universal set', () => {
		expect(formatDomainCondition(universalSet())).toBe('x ∈ ℝ');
	});

	it('formats with custom variable', () => {
		expect(formatDomainCondition(universalSet(), 't')).toBe('t ∈ ℝ');
	});

	it('formats greaterThan as condition', () => {
		const domain = positiveReals();
		expect(formatDomainCondition(domain)).toBe('x > 0');
	});

	it('formats greaterThanOrEqual as condition', () => {
		const domain = nonNegativeReals();
		expect(formatDomainCondition(domain)).toBe('x ≥ 0');
	});

	it('formats lessThan as condition', () => {
		const domain = intervalSet([lessThan(fromNumber(5))]);
		expect(formatDomainCondition(domain)).toBe('x < 5');
	});

	it('formats lessThanOrEqual as condition', () => {
		const domain = intervalSet([lessThanOrEqual(fromNumber(5))]);
		expect(formatDomainCondition(domain)).toBe('x ≤ 5');
	});

	it('formats bounded interval as condition', () => {
		const domain = unitInterval();
		expect(formatDomainCondition(domain)).toBe('-1 ≤ x ≤ 1');
	});

	it('formats open bounded interval as condition', () => {
		const domain = intervalSet([openInterval(fromNumber(0), fromNumber(1))]);
		expect(formatDomainCondition(domain)).toBe('0 < x < 1');
	});

	it('formats excluded points as condition', () => {
		const domain = nonZeroReals();
		expect(formatDomainCondition(domain)).toBe('x ∈ ℝ et x ≠ 0');
	});

	it('formats multiple intervals with ou', () => {
		const domain = intervalSet([
			closedInterval(fromNumber(0), fromNumber(1)),
			closedInterval(fromNumber(2), fromNumber(3))
		]);
		expect(formatDomainCondition(domain)).toBe('0 ≤ x ≤ 1 ou 2 ≤ x ≤ 3');
	});

	it('formats with algebraic bounds', () => {
		const sqrt2 = radicalBound(2n);
		const domain = intervalSet([greaterThan(sqrt2)]);
		expect(formatDomainCondition(domain)).toBe('x > √2');
	});
});

describe('formatDomainFull', () => {
	it('returns both interval and condition format', () => {
		const domain = positiveReals();
		const result = formatDomainFull(domain);
		expect(result.interval).toBe(']0, +∞[');
		expect(result.condition).toBe('x > 0');
	});

	it('uses custom variable in condition', () => {
		const domain = positiveReals();
		const result = formatDomainFull(domain, 't');
		expect(result.condition).toBe('t > 0');
	});

	it('handles algebraic bounds', () => {
		const sqrt2 = radicalBound(2n);
		const domain = intervalSet([closedInterval(fromNumber(0), sqrt2)]);
		const result = formatDomainFull(domain);
		expect(result.interval).toBe('[0, √2]');
		expect(result.condition).toBe('0 ≤ x ≤ √2');
	});
});
