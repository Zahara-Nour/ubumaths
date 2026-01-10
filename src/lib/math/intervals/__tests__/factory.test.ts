/**
 * Tests for factory.ts
 *
 * Tests interval and endpoint factory functions.
 * Uses MathNode-based endpoints from mathAST.
 */

import { describe, it, expect } from 'vitest';
import {
	fromNumber,
	rationalBound,
	radicalBound,
	positiveInfinity,
	negativeInfinity,
	pi,
	e,
	sqrt2,
	sqrt3,
	openEndpoint,
	closedEndpoint,
	negInfinity,
	posInfinity,
	openInterval,
	closedInterval,
	leftClosedInterval,
	rightClosedInterval,
	lessThan,
	lessThanOrEqual,
	greaterThan,
	greaterThanOrEqual,
	realLine,
	emptySet,
	universalSet,
	intervalSet,
	excludedPoint,
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval
} from '../factory';
import { endpointToNumber } from '../endpoint';
import {
	isNumber,
	isInfinity,
	isGreek,
	isVariable,
	isFunction,
	isDivision
} from '$lib/mathAST/guards';

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

	describe('rationalBound', () => {
		it('creates exact 3/2 as DivisionNode', () => {
			const threeHalves = rationalBound(3n, 2n);
			expect(isDivision(threeHalves)).toBe(true);
			expect(endpointToNumber(threeHalves)).toBe(1.5);
		});

		it('creates exact integer as NumberNode', () => {
			const five = rationalBound(5n);
			expect(isNumber(five)).toBe(true);
			expect(endpointToNumber(five)).toBe(5);
		});
	});

	describe('radicalBound', () => {
		it('creates sqrt(2) as FunctionNode', () => {
			const sqrt2Val = radicalBound(2n);
			expect(isFunction(sqrt2Val)).toBe(true);
			if (isFunction(sqrt2Val)) {
				expect(sqrt2Val.name).toBe('sqrt');
			}
			expect(endpointToNumber(sqrt2Val)).toBeCloseTo(Math.sqrt(2));
		});

		it('creates 2*sqrt(3) as MultiplyNode', () => {
			const twoSqrt3 = radicalBound(3n, 2n);
			expect(endpointToNumber(twoSqrt3)).toBeCloseTo(2 * Math.sqrt(3));
		});

		it('creates (1/2)*sqrt(2)', () => {
			const halfSqrt2 = radicalBound(2n, 1n, 2n);
			expect(endpointToNumber(halfSqrt2)).toBeCloseTo(Math.sqrt(2) / 2);
		});

		it('handles sqrt(1) = 1', () => {
			const sqrt1 = radicalBound(1n);
			// sqrt(1) simplifies to the coefficient
			expect(endpointToNumber(sqrt1)).toBe(1);
		});
	});

	describe('infinity constructors', () => {
		it('creates positive infinity', () => {
			const inf = positiveInfinity();
			expect(isInfinity(inf)).toBe(true);
			if (isInfinity(inf)) {
				expect(inf.sign).toBe('positive');
			}
		});

		it('creates negative infinity', () => {
			const inf = negativeInfinity();
			expect(isInfinity(inf)).toBe(true);
			if (isInfinity(inf)) {
				expect(inf.sign).toBe('negative');
			}
		});
	});

	describe('symbolic constant constructors', () => {
		it('creates pi as GreekNode', () => {
			const piVal = pi();
			expect(isGreek(piVal)).toBe(true);
			if (isGreek(piVal)) {
				expect(piVal.letter).toBe('pi');
			}
			expect(endpointToNumber(piVal)).toBeCloseTo(Math.PI);
		});

		it('creates e as VariableNode', () => {
			const eVal = e();
			expect(isVariable(eVal)).toBe(true);
			if (isVariable(eVal)) {
				expect(eVal.name).toBe('e');
			}
			expect(endpointToNumber(eVal)).toBeCloseTo(Math.E);
		});

		it('creates sqrt(2) as FunctionNode', () => {
			const sqrt2Val = sqrt2();
			expect(isFunction(sqrt2Val)).toBe(true);
			expect(endpointToNumber(sqrt2Val)).toBeCloseTo(Math.sqrt(2));
		});

		it('creates sqrt(3) as FunctionNode', () => {
			const sqrt3Val = sqrt3();
			expect(isFunction(sqrt3Val)).toBe(true);
			expect(endpointToNumber(sqrt3Val)).toBeCloseTo(Math.sqrt(3));
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
		const ep = negInfinity();
		expect(ep.type).toBe('open');
		expect(endpointToNumber(ep.value)).toBe(-Infinity);
	});

	it('creates positive infinity endpoint', () => {
		const ep = posInfinity();
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

	it('creates lessThan ]-infinity, a[', () => {
		const int = lessThan(fromNumber(5));
		expect(endpointToNumber(int.lower.value)).toBe(-Infinity);
		expect(int.lower.type).toBe('open');
		expect(endpointToNumber(int.upper.value)).toBe(5);
		expect(int.upper.type).toBe('open');
	});

	it('creates lessThanOrEqual ]-infinity, a]', () => {
		const int = lessThanOrEqual(fromNumber(5));
		expect(endpointToNumber(int.lower.value)).toBe(-Infinity);
		expect(int.upper.type).toBe('closed');
	});

	it('creates greaterThan ]a, +infinity[', () => {
		const int = greaterThan(fromNumber(0));
		expect(endpointToNumber(int.lower.value)).toBe(0);
		expect(int.lower.type).toBe('open');
		expect(endpointToNumber(int.upper.value)).toBe(Infinity);
	});

	it('creates greaterThanOrEqual [a, +infinity[', () => {
		const int = greaterThanOrEqual(fromNumber(0));
		expect(int.lower.type).toBe('closed');
		expect(endpointToNumber(int.upper.value)).toBe(Infinity);
	});

	it('creates realLine ]-infinity, +infinity[', () => {
		const int = realLine();
		expect(endpointToNumber(int.lower.value)).toBe(-Infinity);
		expect(endpointToNumber(int.upper.value)).toBe(Infinity);
	});

	it('creates interval with symbolic bounds', () => {
		const s2 = radicalBound(2n);
		const s3 = radicalBound(3n);
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
		expect(domain.excludedPoints.length).toBe(0);
	});

	it('creates interval set with excluded points', () => {
		const domain = intervalSet([realLine()], [excludedPoint(fromNumber(0))]);
		expect(domain.kind).toBe('interval_set');
		expect(domain.excludedPoints.length).toBe(1);
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

	it('creates non-zero reals R \\ {0}', () => {
		const domain = nonZeroReals();
		expect(domain.kind).toBe('interval_set');
		expect(domain.excludedPoints.length).toBe(1);
		expect(endpointToNumber(domain.excludedPoints[0].value)).toBe(0);
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

describe('rationalBound edge cases', () => {
	it('handles negative numerator', () => {
		const negThird = rationalBound(-1n, 3n);
		expect(isDivision(negThird)).toBe(true);
		expect(endpointToNumber(negThird)).toBeCloseTo(-1 / 3);
	});

	it('handles large numerator and denominator', () => {
		const bigRational = rationalBound(1000000n, 999999n);
		expect(isDivision(bigRational)).toBe(true);
		expect(endpointToNumber(bigRational)).toBeCloseTo(1000000 / 999999);
	});

	it('handles zero numerator', () => {
		const zero = rationalBound(0n, 5n);
		expect(isDivision(zero)).toBe(true);
		expect(endpointToNumber(zero)).toBe(0);
	});

	it('handles denominator of 1 returns NumberNode', () => {
		const seven = rationalBound(7n, 1n);
		expect(isNumber(seven)).toBe(true);
		expect(endpointToNumber(seven)).toBe(7);
	});
});

describe('radicalBound edge cases', () => {
	it('handles large radicand', () => {
		const sqrtLarge = radicalBound(10000n);
		expect(isFunction(sqrtLarge)).toBe(true);
		expect(endpointToNumber(sqrtLarge)).toBe(100);
	});

	it('handles coefficient of 1', () => {
		const oneSqrt2 = radicalBound(2n, 1n, 1n);
		expect(endpointToNumber(oneSqrt2)).toBeCloseTo(Math.sqrt(2));
	});

	it('handles negative coefficient', () => {
		const negSqrt2 = radicalBound(2n, -1n, 1n);
		expect(endpointToNumber(negSqrt2)).toBeCloseTo(-Math.sqrt(2));
	});

	it('handles fractional coefficient', () => {
		const thirdSqrt5 = radicalBound(5n, 1n, 3n);
		expect(endpointToNumber(thirdSqrt5)).toBeCloseTo(Math.sqrt(5) / 3);
	});

	it('sqrt(1) with coefficient is just the coefficient', () => {
		const threeSqrt1 = radicalBound(1n, 3n, 1n);
		expect(endpointToNumber(threeSqrt1)).toBe(3);
	});

	it('sqrt(4) = 2', () => {
		const sqrt4 = radicalBound(4n);
		expect(endpointToNumber(sqrt4)).toBe(2);
	});

	it('handles perfect squares with coefficient', () => {
		const twoSqrt9 = radicalBound(9n, 2n, 1n);
		expect(endpointToNumber(twoSqrt9)).toBe(6); // 2 * 3
	});
});

describe('interval with special bounds', () => {
	it('creates interval with pi bounds', () => {
		const int = closedInterval(fromNumber(0), pi());
		expect(endpointToNumber(int.lower.value)).toBe(0);
		expect(endpointToNumber(int.upper.value)).toBeCloseTo(Math.PI);
	});

	it('creates interval with e bounds', () => {
		const int = closedInterval(fromNumber(1), e());
		expect(endpointToNumber(int.lower.value)).toBe(1);
		expect(endpointToNumber(int.upper.value)).toBeCloseTo(Math.E);
	});

	it('creates interval from sqrt(2) to sqrt(3)', () => {
		const int = closedInterval(sqrt2(), sqrt3());
		expect(endpointToNumber(int.lower.value)).toBeCloseTo(Math.sqrt(2));
		expect(endpointToNumber(int.upper.value)).toBeCloseTo(Math.sqrt(3));
	});

	it('creates interval with mixed symbolic and numeric bounds', () => {
		const int = closedInterval(fromNumber(1), sqrt2());
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
		const int = closedInterval(pi(), pi());
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
		const int = closedInterval(sqrt3(), sqrt2()); // sqrt(3) > sqrt(2)
		expect(int.kind).toBe('interval');
	});
});

describe('multiple excluded points', () => {
	it('creates interval set with multiple excluded points', () => {
		const domain = intervalSet(
			[realLine()],
			[excludedPoint(fromNumber(0)), excludedPoint(fromNumber(1)), excludedPoint(fromNumber(2))]
		);
		expect(domain.excludedPoints.length).toBe(3);
	});

	it('creates interval set with symbolic excluded points', () => {
		const domain = intervalSet([realLine()], [excludedPoint(pi()), excludedPoint(sqrt2())]);
		expect(domain.excludedPoints.length).toBe(2);
		expect(endpointToNumber(domain.excludedPoints[0].value)).toBeCloseTo(Math.PI);
		expect(endpointToNumber(domain.excludedPoints[1].value)).toBeCloseTo(Math.sqrt(2));
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
