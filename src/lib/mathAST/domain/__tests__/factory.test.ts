/**
 * Tests for domain factory functions
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
	// Constants
	EMPTY_DOMAIN,
	UNIVERSAL_DOMAIN
} from '../factory';

describe('Endpoint factories', () => {
	describe('endpoint()', () => {
		it('creates an endpoint with value and type', () => {
			const e = endpoint(5, 'open');
			expect(e.value).toBe(5);
			expect(e.type).toBe('open');
		});
	});

	describe('openEndpoint()', () => {
		it('creates an open endpoint', () => {
			const e = openEndpoint(3);
			expect(e.value).toBe(3);
			expect(e.type).toBe('open');
		});
	});

	describe('closedEndpoint()', () => {
		it('creates a closed endpoint', () => {
			const e = closedEndpoint(3);
			expect(e.value).toBe(3);
			expect(e.type).toBe('closed');
		});
	});

	describe('negInfinity()', () => {
		it('creates negative infinity endpoint (always open)', () => {
			const e = negInfinity();
			expect(e.value).toBe('negative_infinity');
			expect(e.type).toBe('open');
		});
	});

	describe('posInfinity()', () => {
		it('creates positive infinity endpoint (always open)', () => {
			const e = posInfinity();
			expect(e.value).toBe('positive_infinity');
			expect(e.type).toBe('open');
		});
	});
});

describe('Interval factories', () => {
	describe('interval()', () => {
		it('creates an interval with given endpoints', () => {
			const i = interval(openEndpoint(0), closedEndpoint(1));
			expect(i.kind).toBe('interval');
			expect(i.lower.value).toBe(0);
			expect(i.lower.type).toBe('open');
			expect(i.upper.value).toBe(1);
			expect(i.upper.type).toBe('closed');
		});
	});

	describe('openInterval()', () => {
		it('creates ]a, b[', () => {
			const i = openInterval(0, 1);
			expect(i.lower.value).toBe(0);
			expect(i.lower.type).toBe('open');
			expect(i.upper.value).toBe(1);
			expect(i.upper.type).toBe('open');
		});
	});

	describe('closedInterval()', () => {
		it('creates [a, b]', () => {
			const i = closedInterval(-1, 1);
			expect(i.lower.value).toBe(-1);
			expect(i.lower.type).toBe('closed');
			expect(i.upper.value).toBe(1);
			expect(i.upper.type).toBe('closed');
		});
	});

	describe('leftClosedInterval()', () => {
		it('creates [a, b[', () => {
			const i = leftClosedInterval(0, 1);
			expect(i.lower.type).toBe('closed');
			expect(i.upper.type).toBe('open');
		});
	});

	describe('rightClosedInterval()', () => {
		it('creates ]a, b]', () => {
			const i = rightClosedInterval(0, 1);
			expect(i.lower.type).toBe('open');
			expect(i.upper.type).toBe('closed');
		});
	});

	describe('greaterThan()', () => {
		it('creates ]a, +infinity[', () => {
			const i = greaterThan(0);
			expect(i.lower.value).toBe(0);
			expect(i.lower.type).toBe('open');
			expect(i.upper.value).toBe('positive_infinity');
			expect(i.upper.type).toBe('open');
		});
	});

	describe('greaterThanOrEqual()', () => {
		it('creates [a, +infinity[', () => {
			const i = greaterThanOrEqual(0);
			expect(i.lower.value).toBe(0);
			expect(i.lower.type).toBe('closed');
			expect(i.upper.value).toBe('positive_infinity');
		});
	});

	describe('lessThan()', () => {
		it('creates ]-infinity, a[', () => {
			const i = lessThan(0);
			expect(i.lower.value).toBe('negative_infinity');
			expect(i.upper.value).toBe(0);
			expect(i.upper.type).toBe('open');
		});
	});

	describe('lessThanOrEqual()', () => {
		it('creates ]-infinity, a]', () => {
			const i = lessThanOrEqual(0);
			expect(i.lower.value).toBe('negative_infinity');
			expect(i.upper.value).toBe(0);
			expect(i.upper.type).toBe('closed');
		});
	});

	describe('realLine()', () => {
		it('creates ]-infinity, +infinity[', () => {
			const i = realLine();
			expect(i.lower.value).toBe('negative_infinity');
			expect(i.upper.value).toBe('positive_infinity');
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
			const d = intervalDomain([greaterThan(0)]);
			expect(d.kind).toBe('interval_domain');
			expect(d.intervals).toHaveLength(1);
			expect(d.excludedPoints).toHaveLength(0);
		});

		it('creates a domain with excluded points', () => {
			const d = intervalDomain([realLine()], [excludedPoint(0)]);
			expect(d.excludedPoints).toHaveLength(1);
		});
	});

	describe('conditionDomain()', () => {
		it('creates a domain with conditions (AND by default)', () => {
			const d = conditionDomain([comparison('x', '>', 0)]);
			expect(d.kind).toBe('condition_domain');
			expect(d.combinator).toBe('and');
		});

		it('creates a domain with OR combinator', () => {
			const d = conditionDomain([comparison('x', '<', 0), comparison('x', '>', 1)], 'or');
			expect(d.combinator).toBe('or');
		});
	});
});

describe('Condition factories', () => {
	describe('comparison()', () => {
		it('creates a comparison condition', () => {
			const c = comparison('x', '>', 0);
			expect(c.kind).toBe('comparison');
			expect(c.variable).toBe('x');
			expect(c.op).toBe('>');
			expect(c.bound).toBe(0);
		});

		it('supports all comparison operators', () => {
			const ops = ['<', '<=', '>', '>=', '=', '!='] as const;
			for (const op of ops) {
				const c = comparison('x', op, 0);
				expect(c.op).toBe(op);
			}
		});
	});

	describe('excludedPoint()', () => {
		it('creates an excluded point', () => {
			const e = excludedPoint(0);
			expect(e.kind).toBe('excluded_point');
			expect(e.value).toBe(0);
		});
	});
});

describe('Common domain shortcuts', () => {
	describe('positiveReals()', () => {
		it('creates ]0, +infinity[', () => {
			const d = positiveReals();
			expect(d.kind).toBe('interval_domain');
			expect(d.intervals).toHaveLength(1);
			expect(d.intervals[0].lower.value).toBe(0);
			expect(d.intervals[0].lower.type).toBe('open');
			expect(d.intervals[0].upper.value).toBe('positive_infinity');
		});
	});

	describe('nonNegativeReals()', () => {
		it('creates [0, +infinity[', () => {
			const d = nonNegativeReals();
			expect(d.kind).toBe('interval_domain');
			expect(d.intervals[0].lower.value).toBe(0);
			expect(d.intervals[0].lower.type).toBe('closed');
		});
	});

	describe('nonZeroReals()', () => {
		it('creates R \\ {0}', () => {
			const d = nonZeroReals();
			expect(d.kind).toBe('interval_domain');
			expect(d.intervals).toHaveLength(1);
			expect(d.excludedPoints).toHaveLength(1);
			expect(d.excludedPoints[0].value).toBe(0);
		});
	});

	describe('unitInterval()', () => {
		it('creates [-1, 1]', () => {
			const d = unitInterval();
			expect(d.kind).toBe('interval_domain');
			expect(d.intervals[0].lower.value).toBe(-1);
			expect(d.intervals[0].lower.type).toBe('closed');
			expect(d.intervals[0].upper.value).toBe(1);
			expect(d.intervals[0].upper.type).toBe('closed');
		});
	});
});
