/**
 * Tests for factory.ts
 *
 * Tests interval and endpoint factory functions.
 * Uses MathNode-based endpoints from mathAST.
 */

import { describe, it, expect } from 'vitest';
import {
	fromNumber,
	bound,
	openEndpoint,
	closedEndpoint,
	negInfinityEndpoint,
	posInfinityEndpoint,
	openInterval,
	closedInterval,
	leftClosedInterval,
	rightClosedInterval,
	lessThanInterval,
	lessThanOrEqualInterval,
	greaterThanInterval,
	greaterThanOrEqualInterval,
	realLine,
	emptySet,
	universalSet,
	intervalSet,
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval
} from '../factory';
import { endpointToNumber } from '../endpoint';
import { isNumber, isInfinity, isMathConstant, isFunction, isDivision } from '$lib/mathAST/guards';

describe('bound value constructors', () => {
	describe('fromNumber', () => {
		it('creates NumberNode for 0', () => {
			const zero = fromNumber(0);
			expect(isNumber(zero)).toBe(true);
			if (isNumber(zero)) {
				expect(zero.value).toBe('0');
			}
		});

		it('creates NumberNode for 1', () => {
			const one = fromNumber(1);
			expect(isNumber(one)).toBe(true);
			if (isNumber(one)) {
				expect(one.value).toBe('1');
			}
		});

		it('creates NumberNode for -1', () => {
			const minusOne = fromNumber(-1);
			expect(isNumber(minusOne)).toBe(true);
			if (isNumber(minusOne)) {
				expect(minusOne.value).toBe('-1');
			}
		});

		it('creates NumberNode from integer', () => {
			const five = fromNumber(5);
			expect(isNumber(five)).toBe(true);
			if (isNumber(five)) {
				expect(five.value).toBe('5');
			}
		});

		it('creates NumberNode from decimal', () => {
			const oneAndHalf = fromNumber(1.5);
			expect(isNumber(oneAndHalf)).toBe(true);
			if (isNumber(oneAndHalf)) {
				expect(oneAndHalf.value).toBe('1.5');
			}
		});
	});

	describe('bound', () => {
		it('creates positive infinity', () => {
			const inf = bound('+inf');
			expect(isInfinity(inf)).toBe(true);
			if (isInfinity(inf)) {
				expect(inf.sign).toBe('positive');
			}
		});

		it('creates negative infinity', () => {
			const inf = bound('-inf');
			expect(isInfinity(inf)).toBe(true);
			if (isInfinity(inf)) {
				expect(inf.sign).toBe('negative');
			}
		});

		it('creates exact 3/2 as DivisionNode', () => {
			const threeHalves = bound('3/2');
			expect(isDivision(threeHalves)).toBe(true);
			expect(endpointToNumber(threeHalves)).toBe(1.5);
		});

		it('creates sqrt(2) as FunctionNode', () => {
			const sqrt2Val = bound('sqrt(2)');
			expect(isFunction(sqrt2Val)).toBe(true);
			if (isFunction(sqrt2Val)) {
				expect(sqrt2Val.name).toBe('sqrt');
			}
			expect(endpointToNumber(sqrt2Val)).toBeCloseTo(Math.sqrt(2));
		});

		it('creates sqrt(3) as FunctionNode', () => {
			const sqrt3Val = bound('sqrt(3)');
			expect(isFunction(sqrt3Val)).toBe(true);
			expect(endpointToNumber(sqrt3Val)).toBeCloseTo(Math.sqrt(3));
		});

		it('creates pi as MathConstantNode', () => {
			const piVal = bound('\\pi');
			expect(isMathConstant(piVal)).toBe(true);
			if (isMathConstant(piVal)) {
				expect(piVal.constant).toBe('pi');
			}
			expect(endpointToNumber(piVal)).toBeCloseTo(Math.PI);
		});

		it('creates e as MathConstantNode', () => {
			const eVal = bound('e');
			expect(isMathConstant(eVal)).toBe(true);
			if (isMathConstant(eVal)) {
				expect(eVal.constant).toBe('euler');
			}
			expect(endpointToNumber(eVal)).toBeCloseTo(Math.E);
		});

		it('creates 2*sqrt(3)', () => {
			const twoSqrt3 = bound('2*sqrt(3)');
			expect(endpointToNumber(twoSqrt3)).toBeCloseTo(2 * Math.sqrt(3));
		});
	});
});

describe('endpoint factories', () => {
	it('creates open endpoint', () => {
		const ep = openEndpoint(fromNumber(5));
		expect(ep.type).toBe('open');
		expect(endpointToNumber(ep.value)).toBe(5);
	});

	it('creates closed endpoint', () => {
		const ep = closedEndpoint(fromNumber(5));
		expect(ep.type).toBe('closed');
		expect(endpointToNumber(ep.value)).toBe(5);
	});

	it('creates negative infinity endpoint', () => {
		const ep = negInfinityEndpoint();
		expect(ep.type).toBe('open');
		expect(endpointToNumber(ep.value)).toBe(-Infinity);
	});

	it('creates positive infinity endpoint', () => {
		const ep = posInfinityEndpoint();
		expect(ep.type).toBe('open');
		expect(endpointToNumber(ep.value)).toBe(Infinity);
	});
});

describe('interval factories', () => {
	it('creates open interval ]a, b[', () => {
		const int = openInterval(fromNumber(1), fromNumber(5));
		expect(int.kind).toBe('interval');
		expect(int.lower.type).toBe('open');
		expect(int.upper.type).toBe('open');
		expect(endpointToNumber(int.lower.value)).toBe(1);
		expect(endpointToNumber(int.upper.value)).toBe(5);
	});

	it('creates closed interval [a, b]', () => {
		const int = closedInterval(fromNumber(1), fromNumber(5));
		expect(int.kind).toBe('interval');
		expect(int.lower.type).toBe('closed');
		expect(int.upper.type).toBe('closed');
	});

	it('creates left-closed interval [a, b[', () => {
		const int = leftClosedInterval(fromNumber(1), fromNumber(5));
		expect(int.lower.type).toBe('closed');
		expect(int.upper.type).toBe('open');
	});

	it('creates right-closed interval ]a, b]', () => {
		const int = rightClosedInterval(fromNumber(1), fromNumber(5));
		expect(int.lower.type).toBe('open');
		expect(int.upper.type).toBe('closed');
	});

	it('creates lessThanInterval ]-infinity, a[', () => {
		const int = lessThanInterval(fromNumber(5));
		expect(endpointToNumber(int.lower.value)).toBe(-Infinity);
		expect(int.lower.type).toBe('open');
		expect(endpointToNumber(int.upper.value)).toBe(5);
		expect(int.upper.type).toBe('open');
	});

	it('creates lessThanOrEqualInterval ]-infinity, a]', () => {
		const int = lessThanOrEqualInterval(fromNumber(5));
		expect(endpointToNumber(int.lower.value)).toBe(-Infinity);
		expect(int.upper.type).toBe('closed');
	});

	it('creates greaterThanInterval ]a, +infinity[', () => {
		const int = greaterThanInterval(fromNumber(0));
		expect(endpointToNumber(int.lower.value)).toBe(0);
		expect(int.lower.type).toBe('open');
		expect(endpointToNumber(int.upper.value)).toBe(Infinity);
	});

	it('creates greaterThanOrEqualInterval [a, +infinity[', () => {
		const int = greaterThanOrEqualInterval(fromNumber(0));
		expect(int.lower.type).toBe('closed');
		expect(endpointToNumber(int.upper.value)).toBe(Infinity);
	});

	it('creates realLine ]-infinity, +infinity[', () => {
		const int = realLine();
		expect(endpointToNumber(int.lower.value)).toBe(-Infinity);
		expect(endpointToNumber(int.upper.value)).toBe(Infinity);
	});

	it('creates interval with symbolic bounds', () => {
		const s2 = bound('sqrt(2)');
		const s3 = bound('sqrt(3)');
		const int = closedInterval(s2, s3);
		expect(int.kind).toBe('interval');
		expect(endpointToNumber(int.lower.value)).toBeCloseTo(Math.sqrt(2));
		expect(endpointToNumber(int.upper.value)).toBeCloseTo(Math.sqrt(3));
	});
});

describe('domain factories', () => {
	it('creates empty set', () => {
		const empty = emptySet();
		expect(empty.kind).toBe('empty');
	});

	it('creates universal set', () => {
		const universal = universalSet();
		expect(universal.kind).toBe('universal');
	});

	it('creates interval set', () => {
		const domain = intervalSet([
			closedInterval(fromNumber(0), fromNumber(1)),
			closedInterval(fromNumber(2), fromNumber(3))
		]);
		expect(domain.kind).toBe('interval_set');
		expect(domain.intervals.length).toBe(2);
	});
});

describe('common domain shortcuts', () => {
	it('creates positive reals ]0, +infinity[', () => {
		const domain = positiveReals();
		expect(domain.kind).toBe('interval_set');
		expect(domain.intervals.length).toBe(1);
		const int = domain.intervals[0];
		expect(endpointToNumber(int.lower.value)).toBe(0);
		expect(int.lower.type).toBe('open');
		expect(endpointToNumber(int.upper.value)).toBe(Infinity);
	});

	it('creates non-negative reals [0, +infinity[', () => {
		const domain = nonNegativeReals();
		expect(domain.kind).toBe('interval_set');
		const int = domain.intervals[0];
		expect(int.lower.type).toBe('closed');
	});

	it('creates non-zero reals ]-inf, 0[ ∪ ]0, +inf[', () => {
		const domain = nonZeroReals();
		expect(domain.kind).toBe('interval_set');
		expect(domain.intervals.length).toBe(2);
		// First interval: ]-inf, 0[
		expect(endpointToNumber(domain.intervals[0].upper.value)).toBe(0);
		expect(domain.intervals[0].upper.type).toBe('open');
		// Second interval: ]0, +inf[
		expect(endpointToNumber(domain.intervals[1].lower.value)).toBe(0);
		expect(domain.intervals[1].lower.type).toBe('open');
	});

	it('creates unit interval [-1, 1]', () => {
		const domain = unitInterval();
		expect(domain.kind).toBe('interval_set');
		const int = domain.intervals[0];
		expect(endpointToNumber(int.lower.value)).toBe(-1);
		expect(endpointToNumber(int.upper.value)).toBe(1);
		expect(int.lower.type).toBe('closed');
		expect(int.upper.type).toBe('closed');
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('fromNumber edge cases', () => {
	it('handles very large numbers', () => {
		const large = fromNumber(1e15);
		expect(isNumber(large)).toBe(true);
		expect(endpointToNumber(large)).toBe(1e15);
	});

	it('handles very small positive numbers', () => {
		const small = fromNumber(1e-10);
		expect(isNumber(small)).toBe(true);
		expect(endpointToNumber(small)).toBeCloseTo(1e-10);
	});

	it('handles negative zero', () => {
		const negZero = fromNumber(-0);
		expect(isNumber(negZero)).toBe(true);
		// -0 should be stored as "0"
		expect(endpointToNumber(negZero)).toBe(0);
	});

	it('handles very negative numbers', () => {
		const negLarge = fromNumber(-1e15);
		expect(isNumber(negLarge)).toBe(true);
		expect(endpointToNumber(negLarge)).toBe(-1e15);
	});
});

describe('bound edge cases', () => {
	it('handles negative fraction', () => {
		const negThird = bound('-1/3');
		expect(endpointToNumber(negThird)).toBeCloseTo(-1 / 3);
	});

	it('handles sqrt of large numbers', () => {
		const sqrtLarge = bound('sqrt(10000)');
		expect(isFunction(sqrtLarge)).toBe(true);
		expect(endpointToNumber(sqrtLarge)).toBe(100);
	});

	it('handles negative sqrt', () => {
		const negSqrt2 = bound('-sqrt(2)');
		expect(endpointToNumber(negSqrt2)).toBeCloseTo(-Math.sqrt(2));
	});

	it('handles fraction times sqrt', () => {
		const thirdSqrt5 = bound('sqrt(5)/3');
		expect(endpointToNumber(thirdSqrt5)).toBeCloseTo(Math.sqrt(5) / 3);
	});
});

describe('interval with special bounds', () => {
	it('creates interval with pi bounds', () => {
		const int = closedInterval(fromNumber(0), bound('\\pi'));
		expect(endpointToNumber(int.lower.value)).toBe(0);
		expect(endpointToNumber(int.upper.value)).toBeCloseTo(Math.PI);
	});

	it('creates interval with e bounds', () => {
		const int = closedInterval(fromNumber(1), bound('e'));
		expect(endpointToNumber(int.lower.value)).toBe(1);
		expect(endpointToNumber(int.upper.value)).toBeCloseTo(Math.E);
	});

	it('creates interval from sqrt(2) to sqrt(3)', () => {
		const int = closedInterval(bound('sqrt(2)'), bound('sqrt(3)'));
		expect(endpointToNumber(int.lower.value)).toBeCloseTo(Math.sqrt(2));
		expect(endpointToNumber(int.upper.value)).toBeCloseTo(Math.sqrt(3));
	});

	it('creates interval with mixed symbolic and numeric bounds', () => {
		const int = closedInterval(fromNumber(1), bound('sqrt(2)'));
		expect(endpointToNumber(int.lower.value)).toBe(1);
		expect(endpointToNumber(int.upper.value)).toBeCloseTo(Math.sqrt(2));
	});
});

describe('single point intervals', () => {
	it('creates degenerate closed interval [a, a]', () => {
		const int = closedInterval(fromNumber(5), fromNumber(5));
		expect(int.lower.type).toBe('closed');
		expect(int.upper.type).toBe('closed');
		expect(endpointToNumber(int.lower.value)).toBe(5);
		expect(endpointToNumber(int.upper.value)).toBe(5);
	});

	it('creates open interval at single point (empty)', () => {
		const int = openInterval(fromNumber(5), fromNumber(5));
		expect(int.lower.type).toBe('open');
		expect(int.upper.type).toBe('open');
		// This interval is empty (open at both ends with same value)
	});

	it('creates single point at symbolic value', () => {
		const int = closedInterval(bound('\\pi'), bound('\\pi'));
		expect(endpointToNumber(int.lower.value)).toBeCloseTo(Math.PI);
		expect(endpointToNumber(int.upper.value)).toBeCloseTo(Math.PI);
	});
});

describe('inverted intervals', () => {
	it('creates inverted interval [5, 1] (semantically empty)', () => {
		const int = closedInterval(fromNumber(5), fromNumber(1));
		expect(int.kind).toBe('interval');
		// The interval factory doesn't validate order, but isEmpty will catch it
		expect(endpointToNumber(int.lower.value)).toBe(5);
		expect(endpointToNumber(int.upper.value)).toBe(1);
	});

	it('creates inverted interval with symbolic bounds', () => {
		const int = closedInterval(bound('sqrt(3)'), bound('sqrt(2)')); // sqrt(3) > sqrt(2)
		expect(int.kind).toBe('interval');
	});
});

describe('multiple disjoint intervals (replacing excluded points)', () => {
	it('creates interval set with three disjoint intervals', () => {
		const domain = intervalSet([
			closedInterval(fromNumber(0), fromNumber(1)),
			closedInterval(fromNumber(2), fromNumber(3)),
			closedInterval(fromNumber(4), fromNumber(5))
		]);
		expect(domain.intervals.length).toBe(3);
	});
});

describe('complex interval sets', () => {
	it('creates interval set with three intervals', () => {
		const domain = intervalSet([
			closedInterval(fromNumber(0), fromNumber(1)),
			closedInterval(fromNumber(2), fromNumber(3)),
			closedInterval(fromNumber(4), fromNumber(5))
		]);
		expect(domain.intervals.length).toBe(3);
	});

	it('creates interval set mixing open and closed intervals', () => {
		const domain = intervalSet([
			openInterval(fromNumber(0), fromNumber(1)),
			closedInterval(fromNumber(2), fromNumber(3)),
			leftClosedInterval(fromNumber(4), fromNumber(5))
		]);
		expect(domain.intervals.length).toBe(3);
		expect(domain.intervals[0].lower.type).toBe('open');
		expect(domain.intervals[1].lower.type).toBe('closed');
		expect(domain.intervals[2].lower.type).toBe('closed');
		expect(domain.intervals[2].upper.type).toBe('open');
	});

	it('creates empty interval set', () => {
		const domain = intervalSet([]);
		expect(domain.intervals.length).toBe(0);
	});
});
