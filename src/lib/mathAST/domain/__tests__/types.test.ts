/**
 * Tests for domain types
 *
 * Updated for MathNode-based endpoint values.
 */

import { describe, it, expect } from 'vitest';
import type {
	Endpoint,
	Interval,
	EmptySet,
	UniversalSet,
	IntervalSet,
	ConditionDomain,
	ExcludedPoint,
	ComparisonCondition,
	Domain
} from '../types';
import { fromNumber, positiveInfinity, negativeInfinity } from '../factory';
import { isNumber, isPositiveInfinity, isNegativeInfinity } from '$lib/mathAST/guards';

describe('Domain Types', () => {
	describe('Endpoint', () => {
		it('can represent an open endpoint with numeric value', () => {
			const endpoint: Endpoint = { value: fromNumber(0), type: 'open' };
			expect(isNumber(endpoint.value)).toBe(true);
			expect(endpoint.type).toBe('open');
		});

		it('can represent a closed endpoint with numeric value', () => {
			const endpoint: Endpoint = { value: fromNumber(1), type: 'closed' };
			expect(isNumber(endpoint.value)).toBe(true);
			expect(endpoint.type).toBe('closed');
		});

		it('can represent positive infinity', () => {
			const endpoint: Endpoint = { value: positiveInfinity(), type: 'open' };
			expect(isPositiveInfinity(endpoint.value)).toBe(true);
			expect(endpoint.type).toBe('open');
		});

		it('can represent negative infinity', () => {
			const endpoint: Endpoint = { value: negativeInfinity(), type: 'open' };
			expect(isNegativeInfinity(endpoint.value)).toBe(true);
			expect(endpoint.type).toBe('open');
		});
	});

	describe('Interval', () => {
		it('can represent an open interval ]0, 1[', () => {
			const interval: Interval = {
				kind: 'interval',
				lower: { value: fromNumber(0), type: 'open' },
				upper: { value: fromNumber(1), type: 'open' }
			};
			expect(interval.kind).toBe('interval');
			expect(isNumber(interval.lower.value)).toBe(true);
			expect(interval.lower.type).toBe('open');
			expect(isNumber(interval.upper.value)).toBe(true);
			expect(interval.upper.type).toBe('open');
		});

		it('can represent a closed interval [-1, 1]', () => {
			const interval: Interval = {
				kind: 'interval',
				lower: { value: fromNumber(-1), type: 'closed' },
				upper: { value: fromNumber(1), type: 'closed' }
			};
			expect(interval.lower.type).toBe('closed');
			expect(interval.upper.type).toBe('closed');
		});

		it('can represent ]0, +infinity[', () => {
			const interval: Interval = {
				kind: 'interval',
				lower: { value: fromNumber(0), type: 'open' },
				upper: { value: positiveInfinity(), type: 'open' }
			};
			expect(isPositiveInfinity(interval.upper.value)).toBe(true);
		});

		it('can represent ]-infinity, 0]', () => {
			const interval: Interval = {
				kind: 'interval',
				lower: { value: negativeInfinity(), type: 'open' },
				upper: { value: fromNumber(0), type: 'closed' }
			};
			expect(isNegativeInfinity(interval.lower.value)).toBe(true);
			expect(interval.upper.type).toBe('closed');
		});
	});

	describe('ExcludedPoint', () => {
		it('can represent an excluded point', () => {
			const excluded: ExcludedPoint = { kind: 'excluded_point', value: fromNumber(0) };
			expect(excluded.kind).toBe('excluded_point');
			expect(isNumber(excluded.value)).toBe(true);
		});
	});

	describe('Domain types', () => {
		it('can represent an empty domain', () => {
			const domain: EmptySet = { kind: 'empty' };
			expect(domain.kind).toBe('empty');
		});

		it('can represent the universal domain (R)', () => {
			const domain: UniversalSet = { kind: 'universal' };
			expect(domain.kind).toBe('universal');
		});

		it('can represent an interval domain', () => {
			const domain: IntervalSet = {
				kind: 'interval_set',
				intervals: [
					{
						kind: 'interval',
						lower: { value: fromNumber(0), type: 'open' },
						upper: { value: positiveInfinity(), type: 'open' }
					}
				],
				excludedPoints: []
			};
			expect(domain.kind).toBe('interval_set');
			expect(domain.intervals).toHaveLength(1);
		});

		it('can represent R \\ {0} with excluded points', () => {
			const domain: IntervalSet = {
				kind: 'interval_set',
				intervals: [
					{
						kind: 'interval',
						lower: { value: negativeInfinity(), type: 'open' },
						upper: { value: positiveInfinity(), type: 'open' }
					}
				],
				excludedPoints: [{ kind: 'excluded_point', value: fromNumber(0) }]
			};
			expect(domain.excludedPoints).toHaveLength(1);
			expect(isNumber(domain.excludedPoints[0].value)).toBe(true);
		});

		it('can represent a condition domain', () => {
			const condition: ComparisonCondition = {
				kind: 'comparison',
				variable: 'x',
				op: '>',
				bound: fromNumber(0)
			};
			const domain: ConditionDomain = {
				kind: 'condition_domain',
				conditions: [condition],
				combinator: 'and'
			};
			expect(domain.kind).toBe('condition_domain');
			expect(domain.conditions).toHaveLength(1);
			expect(domain.combinator).toBe('and');
		});
	});

	describe('Domain union type', () => {
		it('accepts all domain kinds', () => {
			const domains: Domain[] = [
				{ kind: 'empty' },
				{ kind: 'universal' },
				{
					kind: 'interval_set',
					intervals: [],
					excludedPoints: []
				},
				{
					kind: 'condition_domain',
					conditions: [],
					combinator: 'and'
				}
			];
			expect(domains).toHaveLength(4);
		});
	});
});
