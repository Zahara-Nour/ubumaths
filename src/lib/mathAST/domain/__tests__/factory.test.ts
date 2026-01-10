/**
 * Tests for domain factory functions
 *
 * Updated for MathNode-based endpoint values:
 * - EndpointValue is now MathNode (numbers via NumberNode, infinity via InfinityNode)
 * - IntervalSet has kind: 'interval_set' (not 'interval_domain')
 */

import { describe, it, expect } from 'vitest';
import {
	// Endpoint factories
	endpoint,
	openEndpoint,
	closedEndpoint,
	negInfinity,
	posInfinity,
	// Interval factories
	interval,
	openInterval,
	closedInterval,
	leftClosedInterval,
	rightClosedInterval,
	greaterThan,
	greaterThanOrEqual,
	lessThan,
	lessThanOrEqual,
	realLine,
	// Domain factories
	emptyDomain,
	universalDomain,
	intervalDomain,
	conditionDomain,
	// Condition factories
	comparison,
	excludedPoint,
	// Common domain shortcuts
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval,
	// Value constructors
	fromNumber,
	// Constants
	EMPTY_DOMAIN,
	UNIVERSAL_DOMAIN
} from '../factory';
import { isNumber, isNegativeInfinity, isPositiveInfinity } from '$lib/mathAST/guards';

describe('Endpoint factories', () => {
	describe('endpoint()', () => {
		it('creates an endpoint with value and type', () => {
			const e = endpoint(fromNumber(5), 'open');
			expect(isNumber(e.value)).toBe(true);
			if (isNumber(e.value)) {
				expect(e.value.value).toBe('5');
			}
			expect(e.type).toBe('open');
		});
	});

	describe('openEndpoint()', () => {
		it('creates an open endpoint', () => {
			const e = openEndpoint(fromNumber(3));
			expect(isNumber(e.value)).toBe(true);
			if (isNumber(e.value)) {
				expect(e.value.value).toBe('3');
			}
			expect(e.type).toBe('open');
		});
	});

	describe('closedEndpoint()', () => {
		it('creates a closed endpoint', () => {
			const e = closedEndpoint(fromNumber(3));
			expect(isNumber(e.value)).toBe(true);
			if (isNumber(e.value)) {
				expect(e.value.value).toBe('3');
			}
			expect(e.type).toBe('closed');
		});
	});

	describe('negInfinity()', () => {
		it('creates negative infinity endpoint (always open)', () => {
			const e = negInfinity();
			expect(isNegativeInfinity(e.value)).toBe(true);
			expect(e.type).toBe('open');
		});
	});

	describe('posInfinity()', () => {
		it('creates positive infinity endpoint (always open)', () => {
			const e = posInfinity();
			expect(isPositiveInfinity(e.value)).toBe(true);
			expect(e.type).toBe('open');
		});
	});
});

describe('Interval factories', () => {
	describe('interval()', () => {
		it('creates an interval with given endpoints', () => {
			const i = interval(openEndpoint(fromNumber(0)), closedEndpoint(fromNumber(1)));
			expect(i.kind).toBe('interval');
			expect(isNumber(i.lower.value)).toBe(true);
			expect(i.lower.type).toBe('open');
			expect(isNumber(i.upper.value)).toBe(true);
			expect(i.upper.type).toBe('closed');
		});
	});

	describe('openInterval()', () => {
		it('creates ]a, b[', () => {
			const i = openInterval(fromNumber(0), fromNumber(1));
			expect(isNumber(i.lower.value)).toBe(true);
			expect(i.lower.type).toBe('open');
			expect(isNumber(i.upper.value)).toBe(true);
			expect(i.upper.type).toBe('open');
		});
	});

	describe('closedInterval()', () => {
		it('creates [a, b]', () => {
			const i = closedInterval(fromNumber(-1), fromNumber(1));
			expect(i.lower.type).toBe('closed');
			expect(i.upper.type).toBe('closed');
		});
	});

	describe('leftClosedInterval()', () => {
		it('creates [a, b[', () => {
			const i = leftClosedInterval(fromNumber(0), fromNumber(1));
			expect(i.lower.type).toBe('closed');
			expect(i.upper.type).toBe('open');
		});
	});

	describe('rightClosedInterval()', () => {
		it('creates ]a, b]', () => {
			const i = rightClosedInterval(fromNumber(0), fromNumber(1));
			expect(i.lower.type).toBe('open');
			expect(i.upper.type).toBe('closed');
		});
	});

	describe('greaterThan()', () => {
		it('creates ]a, +infinity[', () => {
			const i = greaterThan(fromNumber(0));
			expect(isNumber(i.lower.value)).toBe(true);
			expect(i.lower.type).toBe('open');
			expect(isPositiveInfinity(i.upper.value)).toBe(true);
			expect(i.upper.type).toBe('open');
		});
	});

	describe('greaterThanOrEqual()', () => {
		it('creates [a, +infinity[', () => {
			const i = greaterThanOrEqual(fromNumber(0));
			expect(isNumber(i.lower.value)).toBe(true);
			expect(i.lower.type).toBe('closed');
			expect(isPositiveInfinity(i.upper.value)).toBe(true);
		});
	});

	describe('lessThan()', () => {
		it('creates ]-infinity, a[', () => {
			const i = lessThan(fromNumber(0));
			expect(isNegativeInfinity(i.lower.value)).toBe(true);
			expect(isNumber(i.upper.value)).toBe(true);
			expect(i.upper.type).toBe('open');
		});
	});

	describe('lessThanOrEqual()', () => {
		it('creates ]-infinity, a]', () => {
			const i = lessThanOrEqual(fromNumber(0));
			expect(isNegativeInfinity(i.lower.value)).toBe(true);
			expect(isNumber(i.upper.value)).toBe(true);
			expect(i.upper.type).toBe('closed');
		});
	});

	describe('realLine()', () => {
		it('creates ]-infinity, +infinity[', () => {
			const i = realLine();
			expect(isNegativeInfinity(i.lower.value)).toBe(true);
			expect(isPositiveInfinity(i.upper.value)).toBe(true);
		});
	});
});

describe('Domain factories', () => {
	describe('emptyDomain()', () => {
		it('creates an empty domain', () => {
			const d = emptyDomain();
			expect(d.kind).toBe('empty');
		});

		it('returns the same constant', () => {
			expect(emptyDomain()).toBe(EMPTY_DOMAIN);
		});
	});

	describe('universalDomain()', () => {
		it('creates the universal domain', () => {
			const d = universalDomain();
			expect(d.kind).toBe('universal');
		});

		it('returns the same constant', () => {
			expect(universalDomain()).toBe(UNIVERSAL_DOMAIN);
		});
	});

	describe('intervalDomain()', () => {
		it('creates a domain with intervals', () => {
			const d = intervalDomain([greaterThan(fromNumber(0))]);
			expect(d.kind).toBe('interval_set');
			expect(d.intervals).toHaveLength(1);
			expect(d.excludedPoints).toHaveLength(0);
		});

		it('creates a domain with excluded points', () => {
			const d = intervalDomain([realLine()], [excludedPoint(fromNumber(0))]);
			expect(d.excludedPoints).toHaveLength(1);
		});
	});

	describe('conditionDomain()', () => {
		it('creates a domain with conditions (AND by default)', () => {
			const d = conditionDomain([comparison('x', '>', fromNumber(0))]);
			expect(d.kind).toBe('condition_domain');
			expect(d.combinator).toBe('and');
		});

		it('creates a domain with OR combinator', () => {
			const d = conditionDomain(
				[comparison('x', '<', fromNumber(0)), comparison('x', '>', fromNumber(1))],
				'or'
			);
			expect(d.combinator).toBe('or');
		});
	});
});

describe('Condition factories', () => {
	describe('comparison()', () => {
		it('creates a comparison condition', () => {
			const c = comparison('x', '>', fromNumber(0));
			expect(c.kind).toBe('comparison');
			expect(c.variable).toBe('x');
			expect(c.op).toBe('>');
			expect(isNumber(c.bound)).toBe(true);
		});

		it('supports all comparison operators', () => {
			const ops = ['<', '<=', '>', '>=', '=', '!='] as const;
			for (const op of ops) {
				const c = comparison('x', op, fromNumber(0));
				expect(c.op).toBe(op);
			}
		});
	});

	describe('excludedPoint()', () => {
		it('creates an excluded point', () => {
			const e = excludedPoint(fromNumber(0));
			expect(e.kind).toBe('excluded_point');
			expect(isNumber(e.value)).toBe(true);
		});
	});
});

describe('Common domain shortcuts', () => {
	describe('positiveReals()', () => {
		it('creates ]0, +infinity[', () => {
			const d = positiveReals();
			expect(d.kind).toBe('interval_set');
			expect(d.intervals).toHaveLength(1);
			expect(isNumber(d.intervals[0].lower.value)).toBe(true);
			expect(d.intervals[0].lower.type).toBe('open');
			expect(isPositiveInfinity(d.intervals[0].upper.value)).toBe(true);
		});
	});

	describe('nonNegativeReals()', () => {
		it('creates [0, +infinity[', () => {
			const d = nonNegativeReals();
			expect(d.kind).toBe('interval_set');
			expect(isNumber(d.intervals[0].lower.value)).toBe(true);
			expect(d.intervals[0].lower.type).toBe('closed');
		});
	});

	describe('nonZeroReals()', () => {
		it('creates R \\ {0}', () => {
			const d = nonZeroReals();
			expect(d.kind).toBe('interval_set');
			expect(d.intervals).toHaveLength(1);
			expect(d.excludedPoints).toHaveLength(1);
			expect(isNumber(d.excludedPoints[0].value)).toBe(true);
		});
	});

	describe('unitInterval()', () => {
		it('creates [-1, 1]', () => {
			const d = unitInterval();
			expect(d.kind).toBe('interval_set');
			expect(isNumber(d.intervals[0].lower.value)).toBe(true);
			expect(d.intervals[0].lower.type).toBe('closed');
			expect(isNumber(d.intervals[0].upper.value)).toBe(true);
			expect(d.intervals[0].upper.type).toBe('closed');
		});
	});
});
