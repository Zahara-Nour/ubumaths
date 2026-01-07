/**
 * Tests for domain types
 */

import { describe, it, expect } from 'vitest';
import type {
	Endpoint,
	Interval,
	EmptyDomain,
	UniversalDomain,
	IntervalDomain,
	ConditionDomain,
	ExcludedPoint,
	ComparisonCondition,
	Domain
} from '../types';

describe('Domain Types', () => {
	describe('Endpoint', () => {
		it('can represent an open endpoint with numeric value', () => {
			const endpoint: Endpoint = { value: 0, type: 'open' };
			expect(endpoint.value).toBe(0);
			expect(endpoint.type).toBe('open');
		});

		it('can represent a closed endpoint with numeric value', () => {
			const endpoint: Endpoint = { value: 1, type: 'closed' };
			expect(endpoint.value).toBe(1);
			expect(endpoint.type).toBe('closed');
		});

		it('can represent positive infinity', () => {
			const endpoint: Endpoint = { value: 'positive_infinity', type: 'open' };
			expect(endpoint.value).toBe('positive_infinity');
			expect(endpoint.type).toBe('open');
		});

		it('can represent negative infinity', () => {
			const endpoint: Endpoint = { value: 'negative_infinity', type: 'open' };
			expect(endpoint.value).toBe('negative_infinity');
			expect(endpoint.type).toBe('open');
		});
	});

	describe('Interval', () => {
		it('can represent an open interval ]0, 1[', () => {
			const interval: Interval = {
				kind: 'interval',
				lower: { value: 0, type: 'open' },
				upper: { value: 1, type: 'open' }
			};
			expect(interval.kind).toBe('interval');
			expect(interval.lower.value).toBe(0);
			expect(interval.lower.type).toBe('open');
			expect(interval.upper.value).toBe(1);
			expect(interval.upper.type).toBe('open');
		});

		it('can represent a closed interval [-1, 1]', () => {
			const interval: Interval = {
				kind: 'interval',
				lower: { value: -1, type: 'closed' },
				upper: { value: 1, type: 'closed' }
			};
			expect(interval.lower.type).toBe('closed');
			expect(interval.upper.type).toBe('closed');
		});

		it('can represent ]0, +infinity[', () => {
			const interval: Interval = {
				kind: 'interval',
				lower: { value: 0, type: 'open' },
				upper: { value: 'positive_infinity', type: 'open' }
			};
			expect(interval.upper.value).toBe('positive_infinity');
		});

		it('can represent ]-infinity, 0]', () => {
			const interval: Interval = {
				kind: 'interval',
				lower: { value: 'negative_infinity', type: 'open' },
				upper: { value: 0, type: 'closed' }
			};
			expect(interval.lower.value).toBe('negative_infinity');
			expect(interval.upper.type).toBe('closed');
		});
	});

	describe('ExcludedPoint', () => {
		it('can represent an excluded point', () => {
			const excluded: ExcludedPoint = { kind: 'excluded_point', value: 0 };
			expect(excluded.kind).toBe('excluded_point');
			expect(excluded.value).toBe(0);
		});
	});

	describe('Domain types', () => {
		it('can represent an empty domain', () => {
			const domain: EmptyDomain = { kind: 'empty' };
			expect(domain.kind).toBe('empty');
		});

		it('can represent the universal domain (R)', () => {
			const domain: UniversalDomain = { kind: 'universal' };
			expect(domain.kind).toBe('universal');
		});

		it('can represent an interval domain', () => {
			const domain: IntervalDomain = {
				kind: 'interval_domain',
				intervals: [
					{
						kind: 'interval',
						lower: { value: 0, type: 'open' },
						upper: { value: 'positive_infinity', type: 'open' }
					}
				],
				excludedPoints: []
			};
			expect(domain.kind).toBe('interval_domain');
			expect(domain.intervals).toHaveLength(1);
		});

		it('can represent R \\ {0} with excluded points', () => {
			const domain: IntervalDomain = {
				kind: 'interval_domain',
				intervals: [
					{
						kind: 'interval',
						lower: { value: 'negative_infinity', type: 'open' },
						upper: { value: 'positive_infinity', type: 'open' }
					}
				],
				excludedPoints: [{ kind: 'excluded_point', value: 0 }]
			};
			expect(domain.excludedPoints).toHaveLength(1);
			expect(domain.excludedPoints[0].value).toBe(0);
		});

		it('can represent a condition domain', () => {
			const condition: ComparisonCondition = {
				kind: 'comparison',
				variable: 'x',
				op: '>',
				bound: 0
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
					kind: 'interval_domain',
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
