/**
 * Tests for domain formatting functions
 */

import { describe, it, expect } from 'vitest';
import { formatDomainInterval, formatDomainCondition, formatDomainFull } from '../format';
import {
	emptyDomain,
	universalDomain,
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval,
	intervalDomain,
	greaterThan,
	greaterThanOrEqual,
	lessThan,
	lessThanOrEqual,
	excludedPoint,
	fromNumber
} from '../factory';

describe('formatDomainInterval()', () => {
	describe('special domains', () => {
		it('formats empty domain as ∅', () => {
			expect(formatDomainInterval(emptyDomain())).toBe('∅');
		});

		it('formats universal domain as ℝ', () => {
			expect(formatDomainInterval(universalDomain())).toBe('ℝ');
		});
	});

	describe('French interval notation', () => {
		it('formats ]0, +∞[ (positiveReals)', () => {
			expect(formatDomainInterval(positiveReals())).toBe(']0, +∞[');
		});

		it('formats [0, +∞[ (nonNegativeReals)', () => {
			expect(formatDomainInterval(nonNegativeReals())).toBe('[0, +∞[');
		});

		it('formats [-1, 1] (unitInterval)', () => {
			expect(formatDomainInterval(unitInterval())).toBe('[-1, 1]');
		});

		it('formats ℝ \\ {0} (nonZeroReals)', () => {
			expect(formatDomainInterval(nonZeroReals())).toBe('ℝ \\ {0}');
		});

		it('formats ]-∞, 0[', () => {
			const d = intervalDomain([lessThan(fromNumber(0))]);
			expect(formatDomainInterval(d)).toBe(']-∞, 0[');
		});

		it('formats ]-∞, 0]', () => {
			const d = intervalDomain([lessThanOrEqual(fromNumber(0))]);
			expect(formatDomainInterval(d)).toBe(']-∞, 0]');
		});

		it('formats ]1, +∞[', () => {
			const d = intervalDomain([greaterThan(fromNumber(1))]);
			expect(formatDomainInterval(d)).toBe(']1, +∞[');
		});

		it('formats [1, +∞[', () => {
			const d = intervalDomain([greaterThanOrEqual(fromNumber(1))]);
			expect(formatDomainInterval(d)).toBe('[1, +∞[');
		});
	});

	describe('union of intervals', () => {
		it('formats ]-∞, -2] ∪ [2, +∞[', () => {
			const d = intervalDomain([
				lessThanOrEqual(fromNumber(-2)),
				greaterThanOrEqual(fromNumber(2))
			]);
			expect(formatDomainInterval(d)).toBe(']-∞, -2] ∪ [2, +∞[');
		});
	});

	describe('excluded points', () => {
		it('formats interval with excluded point', () => {
			const d = intervalDomain([greaterThan(fromNumber(0))], [excludedPoint(fromNumber(1))]);
			expect(formatDomainInterval(d)).toBe(']0, +∞[ \\ {1}');
		});

		it('formats interval with multiple excluded points', () => {
			const d = intervalDomain(
				[greaterThan(fromNumber(0))],
				[excludedPoint(fromNumber(1)), excludedPoint(fromNumber(2))]
			);
			expect(formatDomainInterval(d)).toBe(']0, +∞[ \\ {1, 2}');
		});
	});
});

describe('formatDomainCondition()', () => {
	describe('special domains', () => {
		it('formats empty domain', () => {
			expect(formatDomainCondition(emptyDomain())).toBe('aucune valeur');
		});

		it('formats universal domain', () => {
			expect(formatDomainCondition(universalDomain())).toBe('x ∈ ℝ');
		});

		it('formats universal domain with custom variable', () => {
			expect(formatDomainCondition(universalDomain(), 't')).toBe('t ∈ ℝ');
		});
	});

	describe('inequality notation', () => {
		it('formats x > 0 (positiveReals)', () => {
			expect(formatDomainCondition(positiveReals())).toBe('x > 0');
		});

		it('formats x ≥ 0 (nonNegativeReals)', () => {
			expect(formatDomainCondition(nonNegativeReals())).toBe('x ≥ 0');
		});

		it('formats -1 ≤ x ≤ 1 (unitInterval)', () => {
			expect(formatDomainCondition(unitInterval())).toBe('-1 ≤ x ≤ 1');
		});

		it('formats x ≠ 0 (nonZeroReals)', () => {
			// nonZeroReals is ℝ \ {0}, formatted as "x ∈ ℝ et x ≠ 0" or just "x ≠ 0"
			const result = formatDomainCondition(nonZeroReals());
			expect(result).toContain('x ≠ 0');
		});

		it('formats x < 0', () => {
			const d = intervalDomain([lessThan(fromNumber(0))]);
			expect(formatDomainCondition(d)).toBe('x < 0');
		});

		it('formats x ≤ 0', () => {
			const d = intervalDomain([lessThanOrEqual(fromNumber(0))]);
			expect(formatDomainCondition(d)).toBe('x ≤ 0');
		});
	});

	describe('custom variable', () => {
		it('uses custom variable name', () => {
			expect(formatDomainCondition(positiveReals(), 'y')).toBe('y > 0');
		});
	});

	describe('union conditions', () => {
		it('formats x ≤ -2 ou x ≥ 2', () => {
			const d = intervalDomain([
				lessThanOrEqual(fromNumber(-2)),
				greaterThanOrEqual(fromNumber(2))
			]);
			expect(formatDomainCondition(d)).toBe('x ≤ -2 ou x ≥ 2');
		});
	});
});

describe('formatDomainFull()', () => {
	it('returns both interval and condition format', () => {
		const result = formatDomainFull(positiveReals());
		expect(result.interval).toBe(']0, +∞[');
		expect(result.condition).toBe('x > 0');
	});

	it('uses custom variable for condition', () => {
		const result = formatDomainFull(unitInterval(), 't');
		expect(result.interval).toBe('[-1, 1]');
		expect(result.condition).toBe('-1 ≤ t ≤ 1');
	});
});
