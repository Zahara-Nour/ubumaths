/**
 * Tests for format.ts
 *
 * Tests interval and domain formatting functions.
 * Uses MathNode-based endpoints from mathAST.
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
	pi,
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
import { infinity, func, number, implicitMultiply } from '$lib/mathAST/factory';

describe('formatEndpointValue', () => {
	it('formats positive infinity', () => {
		const inf = infinity('positive');
		expect(formatEndpointValue(inf)).toBe('+∞');
	});

	it('formats negative infinity', () => {
		const inf = infinity('negative');
		expect(formatEndpointValue(inf)).toBe('-∞');
	});

	it('formats integer values', () => {
		expect(formatEndpointValue(fromNumber(0))).toBe('0');
		expect(formatEndpointValue(fromNumber(1))).toBe('1');
		expect(formatEndpointValue(fromNumber(-5))).toBe('-5');
		expect(formatEndpointValue(fromNumber(42))).toBe('42');
	});

	it('formats rational values', () => {
		expect(formatEndpointValue(rationalBound(3n, 2n))).toBe('3/2');
		expect(formatEndpointValue(rationalBound(-1n, 3n))).toBe('-1/3');
	});

	it('formats simple square roots', () => {
		expect(formatEndpointValue(radicalBound(2n))).toBe('√2');
		expect(formatEndpointValue(radicalBound(3n))).toBe('√3');
	});

	it('formats negative square roots', () => {
		const negSqrt2 = implicitMultiply(number('-1'), func('sqrt', [number('2')]));
		expect(formatEndpointValue(negSqrt2)).toBe('-1*√2');
	});

	it('formats coefficients with square roots', () => {
		const twoSqrt2 = radicalBound(2n, 2n);
		expect(formatEndpointValue(twoSqrt2)).toBe('2*√2');
	});

	it('formats rational coefficients with square roots', () => {
		const halfSqrt2 = radicalBound(2n, 1n, 2n);
		expect(formatEndpointValue(halfSqrt2)).toBe('1/2*√2');
	});

	it('formats pi', () => {
		expect(formatEndpointValue(pi())).toBe('π');
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

	it('formats interval with symbolic bounds', () => {
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

	it('formats with symbolic bounds', () => {
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

	it('handles symbolic bounds', () => {
		const sqrt2 = radicalBound(2n);
		const domain = intervalSet([closedInterval(fromNumber(0), sqrt2)]);
		const result = formatDomainFull(domain);
		expect(result.interval).toBe('[0, √2]');
		expect(result.condition).toBe('0 ≤ x ≤ √2');
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

import { variable, greek } from '$lib/mathAST/factory';
import { excludedPoint } from '../factory';

describe('formatEndpointValue edge cases', () => {
	it('formats integer zero', () => {
		expect(formatEndpointValue(fromNumber(0))).toBe('0');
	});

	it('formats negative integers', () => {
		expect(formatEndpointValue(fromNumber(-10))).toBe('-10');
		expect(formatEndpointValue(fromNumber(-1))).toBe('-1');
	});

	it('formats decimal numbers', () => {
		expect(formatEndpointValue(fromNumber(1.5))).toBe('1.5');
		expect(formatEndpointValue(fromNumber(0.001))).toBe('0.001');
	});

	it('formats negative rational values', () => {
		expect(formatEndpointValue(rationalBound(-3n, 4n))).toBe('-3/4');
	});

	it('formats large denominators', () => {
		expect(formatEndpointValue(rationalBound(1n, 1000n))).toBe('1/1000');
	});

	it('formats sqrt of large numbers', () => {
		expect(formatEndpointValue(radicalBound(1000n))).toBe('√1000');
	});

	it('formats negative coefficients with sqrt', () => {
		const negTwoSqrt3 = radicalBound(3n, -2n, 1n);
		expect(formatEndpointValue(negTwoSqrt3)).toBe('-2*√3');
	});

	it('formats sqrt with parentheses for complex radicand', () => {
		// sqrt(a+b) should format as √(a+b) but we only have numeric radicands
		// This tests the branch with non-number arguments
		const sqrtPi = func('sqrt', [greek('pi')]);
		expect(formatEndpointValue(sqrtPi)).toBe('√(π)');
	});

	it('formats other Greek letters', () => {
		expect(formatEndpointValue(greek('alpha'))).toBe('α');
		expect(formatEndpointValue(greek('beta'))).toBe('β');
		expect(formatEndpointValue(greek('theta'))).toBe('θ');
		expect(formatEndpointValue(greek('omega'))).toBe('ω');
	});

	it('formats unknown Greek letters as-is', () => {
		expect(formatEndpointValue(greek('unknown'))).toBe('unknown');
	});

	it('formats other function calls', () => {
		const ln2 = func('ln', [number('2')]);
		expect(formatEndpointValue(ln2)).toBe('ln(2)');

		const sin0 = func('sin', [number('0')]);
		expect(formatEndpointValue(sin0)).toBe('sin(0)');

		const exp1 = func('exp', [number('1')]);
		expect(formatEndpointValue(exp1)).toBe('exp(1)');
	});

	it('formats functions with multiple arguments', () => {
		const log = func('log', [number('10'), number('100')]);
		expect(formatEndpointValue(log)).toBe('log(10, 100)');
	});

	it('formats multiplication without sqrt', () => {
		const twoTimesThree = implicitMultiply(number('2'), number('3'));
		expect(formatEndpointValue(twoTimesThree)).toBe('2*3');
	});

	it('formats variable e', () => {
		expect(() => formatEndpointValue(variable('e'))).not.toThrow();
	});

	it('formats nested expressions', () => {
		// 2 * sqrt(sqrt(2))
		const nestedSqrt = implicitMultiply(number('2'), func('sqrt', [func('sqrt', [number('2')])]));
		expect(formatEndpointValue(nestedSqrt)).toBe('2*√(√2)');
	});
});

describe('formatDomainInterval edge cases', () => {
	it('formats multiple excluded points', () => {
		const domain = intervalSet(
			[realLine()],
			[excludedPoint(fromNumber(0)), excludedPoint(fromNumber(1)), excludedPoint(fromNumber(2))]
		);
		expect(formatDomainInterval(domain)).toBe('ℝ \\ {0, 1, 2}');
	});

	it('formats excluded symbolic points', () => {
		const sqrt2 = radicalBound(2n);
		const domain = intervalSet([realLine()], [excludedPoint(sqrt2)]);
		expect(formatDomainInterval(domain)).toBe('ℝ \\ {√2}');
	});

	it('formats mixed open/closed bounds', () => {
		// ]0, 1]
		const domain = intervalSet([rightClosedInterval(fromNumber(0), fromNumber(1))]);
		expect(formatDomainInterval(domain)).toBe(']0, 1]');
	});

	it('formats left-closed interval [a, b[', () => {
		const domain = intervalSet([leftClosedInterval(fromNumber(0), fromNumber(1))]);
		expect(formatDomainInterval(domain)).toBe('[0, 1[');
	});

	it('formats single point [a, a]', () => {
		const domain = intervalSet([closedInterval(fromNumber(5), fromNumber(5))]);
		expect(formatDomainInterval(domain)).toBe('[5, 5]');
	});

	it('formats three disjoint intervals', () => {
		const domain = intervalSet([
			closedInterval(fromNumber(0), fromNumber(1)),
			closedInterval(fromNumber(3), fromNumber(4)),
			closedInterval(fromNumber(6), fromNumber(7))
		]);
		expect(formatDomainInterval(domain)).toBe('[0, 1] ∪ [3, 4] ∪ [6, 7]');
	});

	it('formats interval with excluded point inside', () => {
		const domain = intervalSet(
			[closedInterval(fromNumber(0), fromNumber(10))],
			[excludedPoint(fromNumber(5))]
		);
		expect(formatDomainInterval(domain)).toBe('[0, 10] \\ {5}');
	});

	it('formats negative bounds', () => {
		const domain = intervalSet([closedInterval(fromNumber(-10), fromNumber(-5))]);
		expect(formatDomainInterval(domain)).toBe('[-10, -5]');
	});

	it('formats bounds spanning zero', () => {
		const domain = intervalSet([closedInterval(fromNumber(-5), fromNumber(5))]);
		expect(formatDomainInterval(domain)).toBe('[-5, 5]');
	});
});

describe('formatDomainCondition edge cases', () => {
	it('formats mixed interval as double inequality', () => {
		// ]0, 1]
		const domain = intervalSet([rightClosedInterval(fromNumber(0), fromNumber(1))]);
		expect(formatDomainCondition(domain)).toBe('0 < x ≤ 1');
	});

	it('formats left-closed interval as double inequality', () => {
		// [0, 1[
		const domain = intervalSet([leftClosedInterval(fromNumber(0), fromNumber(1))]);
		expect(formatDomainCondition(domain)).toBe('0 ≤ x < 1');
	});

	it('formats with Greek variable name', () => {
		const domain = positiveReals();
		expect(formatDomainCondition(domain, 'θ')).toBe('θ > 0');
	});

	it('formats with numeric variable name', () => {
		const domain = positiveReals();
		expect(formatDomainCondition(domain, 'x₁')).toBe('x₁ > 0');
	});

	it('formats three disjoint intervals with ou', () => {
		const domain = intervalSet([
			closedInterval(fromNumber(0), fromNumber(1)),
			closedInterval(fromNumber(3), fromNumber(4)),
			closedInterval(fromNumber(6), fromNumber(7))
		]);
		expect(formatDomainCondition(domain)).toBe('0 ≤ x ≤ 1 ou 3 ≤ x ≤ 4 ou 6 ≤ x ≤ 7');
	});

	it('formats multiple excluded points with et', () => {
		const domain = intervalSet(
			[realLine()],
			[excludedPoint(fromNumber(0)), excludedPoint(fromNumber(1))]
		);
		expect(formatDomainCondition(domain)).toBe('x ∈ ℝ et x ≠ 0 et x ≠ 1');
	});

	it('formats symbolic bound in condition', () => {
		const sqrt3 = radicalBound(3n);
		const domain = intervalSet([greaterThanOrEqual(sqrt3)]);
		expect(formatDomainCondition(domain)).toBe('x ≥ √3');
	});

	it('formats pi in condition', () => {
		const piVal = pi();
		const domain = intervalSet([lessThan(piVal)]);
		expect(formatDomainCondition(domain)).toBe('x < π');
	});

	it('formats negative bounds in condition', () => {
		const domain = intervalSet([closedInterval(fromNumber(-5), fromNumber(-1))]);
		expect(formatDomainCondition(domain)).toBe('-5 ≤ x ≤ -1');
	});
});

describe('formatDomainFull edge cases', () => {
	it('returns both formats for complex domain', () => {
		const sqrt2 = radicalBound(2n);
		const domain = intervalSet([greaterThan(sqrt2)]);
		const result = formatDomainFull(domain, 'y');
		expect(result.interval).toBe(']√2, +∞[');
		expect(result.condition).toBe('y > √2');
	});

	it('handles empty set in both formats', () => {
		const result = formatDomainFull(emptySet());
		expect(result.interval).toBe('∅');
		expect(result.condition).toBe('aucune valeur');
	});

	it('handles universal set in both formats', () => {
		const result = formatDomainFull(universalSet(), 'z');
		expect(result.interval).toBe('ℝ');
		expect(result.condition).toBe('z ∈ ℝ');
	});

	it('handles excluded points in both formats', () => {
		const domain = nonZeroReals();
		const result = formatDomainFull(domain);
		expect(result.interval).toBe('ℝ \\ {0}');
		expect(result.condition).toBe('x ∈ ℝ et x ≠ 0');
	});
});

// Additional imports for edge cases
import { rightClosedInterval, leftClosedInterval, greaterThanOrEqual } from '../factory';
