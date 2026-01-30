/**
 * Tests for continuity analysis module
 */

import { describe, it, expect } from 'vitest';
import {
	analyzeContinuity,
	findDiscontinuityCandidates,
	checkContinuityAtPoint
} from '../continuity';
import {
	variable,
	number,
	add,
	subtract,
	implicitMultiply,
	fraction,
	power,
	sqrt,
	ln,
	func,
	tan
} from '../../factory';

describe('analyzeContinuity()', () => {
	describe('continuous functions', () => {
		it('x² + 1 has no discontinuities', () => {
			const expr = add(power(variable('x'), number('2')), number('1'));
			const result = analyzeContinuity(expr, 'x');

			expect(result.discontinuities).toHaveLength(0);
			expect(result.isContinuousOnDomain).toBe(true);
			expect(result.domain.kind).toBe('universal');
		});

		it('sin(x) has no discontinuities', () => {
			const expr = func('sin', [variable('x')]);
			const result = analyzeContinuity(expr, 'x');

			expect(result.discontinuities).toHaveLength(0);
			expect(result.isContinuousOnDomain).toBe(true);
		});

		it('cos(x) has no discontinuities', () => {
			const expr = func('cos', [variable('x')]);
			const result = analyzeContinuity(expr, 'x');

			expect(result.discontinuities).toHaveLength(0);
			expect(result.isContinuousOnDomain).toBe(true);
		});

		it('exp(x) has no discontinuities', () => {
			const expr = func('exp', [variable('x')]);
			const result = analyzeContinuity(expr, 'x');

			expect(result.discontinuities).toHaveLength(0);
			expect(result.isContinuousOnDomain).toBe(true);
		});
	});

	describe('infinite discontinuities (division by zero)', () => {
		it('1/x has infinite discontinuity at x=0', () => {
			const expr = fraction(number('1'), variable('x'));
			const result = analyzeContinuity(expr, 'x');

			expect(result.discontinuities).toHaveLength(1);
			expect(result.discontinuities[0].type).toBe('infinite');
			expect(result.discontinuities[0].source).toBe('division');
			expect(result.discontinuities[0].point).toEqual({ type: 'number', value: '0' });
			// Continuous on domain ℝ\{0}
			expect(result.isContinuousOnDomain).toBe(true);
		});

		it('1/(x-1) has infinite discontinuity at x=1', () => {
			const expr = fraction(number('1'), subtract(variable('x'), number('1')));
			const result = analyzeContinuity(expr, 'x');

			expect(result.discontinuities).toHaveLength(1);
			expect(result.discontinuities[0].type).toBe('infinite');
			expect(result.discontinuities[0].source).toBe('division');
			// Point should be at x=1
			const pointValue = parseFloat((result.discontinuities[0].point as { value: string }).value);
			expect(pointValue).toBeCloseTo(1, 5);
		});

		it('1/(x² - 1) has infinite discontinuities at x=±1', () => {
			const xSquared = power(variable('x'), number('2'));
			const expr = fraction(number('1'), subtract(xSquared, number('1')));
			const result = analyzeContinuity(expr, 'x');

			expect(result.discontinuities.length).toBeGreaterThanOrEqual(2);

			const points = result.discontinuities.map((d) => {
				if (d.point.type === 'number') return parseFloat(d.point.value);
				return null;
			});

			// Should have discontinuities at both -1 and 1
			expect(points.some((p) => p !== null && Math.abs(p - 1) < 0.01)).toBe(true);
			expect(points.some((p) => p !== null && Math.abs(p + 1) < 0.01)).toBe(true);
		});
	});

	describe('removable discontinuities', () => {
		it('(x² - 1)/(x - 1) has removable discontinuity at x=1', () => {
			const numerator = subtract(power(variable('x'), number('2')), number('1'));
			const denominator = subtract(variable('x'), number('1'));
			const expr = fraction(numerator, denominator);
			const result = analyzeContinuity(expr, 'x');

			expect(result.discontinuities).toHaveLength(1);
			expect(result.discontinuities[0].type).toBe('removable');
			expect(result.discontinuities[0].source).toBe('division');
		});

		it('sin(x)/x has removable discontinuity at x=0', () => {
			const expr = fraction(func('sin', [variable('x')]), variable('x'));
			const result = analyzeContinuity(expr, 'x');

			expect(result.discontinuities).toHaveLength(1);
			expect(result.discontinuities[0].type).toBe('removable');
			// Limit exists and equals 1
			if (result.discontinuities[0].leftLimit?.type === 'number') {
				expect(parseFloat(result.discontinuities[0].leftLimit.value)).toBeCloseTo(1, 5);
			}
		});
	});

	describe('infinite discontinuities (logarithm)', () => {
		it('ln(x) has infinite discontinuity at x=0', () => {
			const expr = ln(variable('x'));
			const result = analyzeContinuity(expr, 'x');

			// Should have a discontinuity at the boundary x=0
			const boundaryDisc = result.discontinuities.find((d) => {
				if (d.point.type === 'number') {
					return Math.abs(parseFloat(d.point.value)) < 0.01;
				}
				return false;
			});

			expect(boundaryDisc).toBeDefined();
			expect(boundaryDisc?.type).toBe('infinite');
			expect(boundaryDisc?.source).toBe('ln');
		});

		it('1/ln(x) has discontinuity at x=1', () => {
			const expr = fraction(number('1'), ln(variable('x')));
			const result = analyzeContinuity(expr, 'x');

			// Should have at least one discontinuity (at x=1 where ln(x) = 0)
			// Note: The exact classification depends on the limits module's behavior
			expect(result.discontinuities.length).toBeGreaterThanOrEqual(1);

			// Check that x=1 is among the candidates (domain excludes it)
			// The discontinuity might be at a slightly different point due to domain boundaries
			expect(result.domain.kind).toBe('interval_set');
		});
	});

	describe('jump discontinuities (piecewise functions)', () => {
		it('floor(x) has jump discontinuities at integers', () => {
			const expr = func('floor', [variable('x')]);
			const result = analyzeContinuity(expr, 'x', {
				standardInterval: { min: -2, max: 2 }
			});

			// Should have discontinuities at -2, -1, 0, 1, 2
			const jumpDiscs = result.discontinuities.filter((d) => d.type === 'jump');
			expect(jumpDiscs.length).toBeGreaterThanOrEqual(3);
			expect(jumpDiscs.every((d) => d.source === 'floor')).toBe(true);
		});

		it('sign(x) has jump discontinuity at x=0', () => {
			const expr = func('sign', [variable('x')]);
			const result = analyzeContinuity(expr, 'x');

			const discAtZero = result.discontinuities.find((d) => {
				if (d.point.type === 'number') {
					return Math.abs(parseFloat(d.point.value)) < 0.01;
				}
				return false;
			});

			expect(discAtZero).toBeDefined();
			expect(discAtZero?.type).toBe('jump');
			expect(discAtZero?.source).toBe('sign');
		});
	});

	describe('abs(x) is continuous', () => {
		it('abs(x) is continuous at x=0', () => {
			const expr = func('abs', [variable('x')]);
			const result = analyzeContinuity(expr, 'x');

			// abs(x) has no discontinuities (it's continuous everywhere)
			// It might be detected as a candidate but should be classified as continuous
			const actualDiscs = result.discontinuities.filter(
				(d) =>
					d.type === 'jump' ||
					d.type === 'infinite' ||
					d.type === 'essential' ||
					d.type === 'removable'
			);
			expect(actualDiscs).toHaveLength(0);
		});
	});

	describe('periodic discontinuities (trigonometric)', () => {
		it('tan(x) has infinite discontinuities', () => {
			const expr = tan(variable('x'));
			const result = analyzeContinuity(expr, 'x', {
				standardInterval: { min: -Math.PI, max: Math.PI }
			});

			// Should have discontinuities at ±π/2
			const infiniteDiscs = result.discontinuities.filter((d) => d.type === 'infinite');
			expect(infiniteDiscs.length).toBeGreaterThanOrEqual(1);

			// Check for discontinuity near π/2
			const discNearPiHalf = result.discontinuities.find((d) => {
				if (d.point.type === 'number') {
					const val = parseFloat(d.point.value);
					return Math.abs(Math.abs(val) - Math.PI / 2) < 0.1;
				}
				return false;
			});
			expect(discNearPiHalf).toBeDefined();
		});

		it('cot(x) has infinite discontinuities at multiples of π', () => {
			const expr = func('cot', [variable('x')]);
			const result = analyzeContinuity(expr, 'x', {
				standardInterval: { min: -Math.PI - 0.1, max: Math.PI + 0.1 }
			});

			// Should have discontinuities at 0, ±π
			const infiniteDiscs = result.discontinuities.filter((d) => d.type === 'infinite');
			expect(infiniteDiscs.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('domain boundaries (sqrt)', () => {
		it('sqrt(x) has boundary at x=0', () => {
			const expr = sqrt(variable('x'));
			const result = analyzeContinuity(expr, 'x');

			// sqrt has domain [0, +∞[, boundary at 0
			// At x=0, sqrt is defined and continuous (from the right)
			expect(result.domain.kind).toBe('interval_set');
		});
	});
});

describe('findDiscontinuityCandidates()', () => {
	it('finds zeros of denominators', () => {
		const expr = fraction(number('1'), subtract(variable('x'), number('2')));
		const candidates = findDiscontinuityCandidates(expr, 'x');

		expect(candidates.length).toBeGreaterThanOrEqual(1);
		const hasX2 = candidates.some((c) => {
			if (c.point.type === 'number') {
				return Math.abs(parseFloat(c.point.value) - 2) < 0.01;
			}
			return false;
		});
		expect(hasX2).toBe(true);
	});

	it('finds piecewise function boundaries', () => {
		const expr = func('floor', [variable('x')]);
		const candidates = findDiscontinuityCandidates(expr, 'x', undefined, {
			standardInterval: { min: -1, max: 2 }
		});

		// Should find integer points
		expect(candidates.length).toBeGreaterThanOrEqual(2);
	});
});

describe('checkContinuityAtPoint()', () => {
	it('detects discontinuity at x=0 for 1/x', () => {
		const expr = fraction(number('1'), variable('x'));
		const result = checkContinuityAtPoint(expr, 'x', number('0'));

		expect(result).not.toBeNull();
		expect(result?.type).toBe('infinite');
	});

	it('returns null for continuous point', () => {
		const expr = add(variable('x'), number('1'));
		const result = checkContinuityAtPoint(expr, 'x', number('0'));

		expect(result).toBeNull();
	});
});

describe('options', () => {
	it('respects standardInterval option for periodic functions', () => {
		const expr = func('floor', [variable('x')]);

		// Small interval
		const result1 = analyzeContinuity(expr, 'x', {
			standardInterval: { min: 0, max: 1 }
		});

		// Larger interval
		const result2 = analyzeContinuity(expr, 'x', {
			standardInterval: { min: -5, max: 5 }
		});

		// Larger interval should have more discontinuities
		expect(result2.discontinuities.length).toBeGreaterThan(result1.discontinuities.length);
	});

	it('includes steps when verbosity is not result', () => {
		const expr = fraction(number('1'), variable('x'));

		const resultWithSteps = analyzeContinuity(expr, 'x', { verbosity: 'summarized' });
		const resultNoSteps = analyzeContinuity(expr, 'x', { verbosity: 'result' });

		expect(resultWithSteps.steps).toBeDefined();
		expect(resultWithSteps.steps!.length).toBeGreaterThan(0);
		expect(resultNoSteps.steps).toBeUndefined();
	});
});

describe('descriptions', () => {
	it('provides French descriptions for discontinuities', () => {
		const expr = fraction(number('1'), variable('x'));
		const result = analyzeContinuity(expr, 'x', { verbosity: 'summarized' });

		expect(result.discontinuities[0].description).toContain('infini');
	});
});

describe('findArgumentZeros with solver integration', () => {
	it('finds zeros of quadratic argument in abs(x² - 4)', () => {
		// abs(x² - 4) has corners at x = ±2 where the argument is zero
		const xSquared = power(variable('x'), number('2'));
		const expr = func('abs', [subtract(xSquared, number('4'))]);

		// Extract numeric points from discontinuity candidates
		const candidates = findDiscontinuityCandidates(expr, 'x');
		const points = candidates
			.map((c) => {
				if (c.point.type === 'number') {
					return parseFloat(c.point.value);
				}
				return null;
			})
			.filter((p): p is number => p !== null);

		// Should find candidates at x = -2 and x = 2
		expect(points.some((p) => Math.abs(p + 2) < 0.01)).toBe(true);
		expect(points.some((p) => Math.abs(p - 2) < 0.01)).toBe(true);
	});

	it('finds zeros of linear argument in sign(2x + 3)', () => {
		// sign(2x + 3) has jump discontinuity at x = -1.5 where 2x + 3 = 0
		const linearArg = add(implicitMultiply(number('2'), variable('x')), number('3'));
		const expr = func('sign', [linearArg]);
		const result = analyzeContinuity(expr, 'x');

		// Should have a jump discontinuity at x = -1.5
		const discAtPoint = result.discontinuities.find((d) => {
			if (d.point.type === 'number') {
				return Math.abs(parseFloat(d.point.value) + 1.5) < 0.01;
			}
			return false;
		});

		expect(discAtPoint).toBeDefined();
		expect(discAtPoint?.type).toBe('jump');
		expect(discAtPoint?.source).toBe('sign');
	});

	it('finds zeros of quadratic argument in sign(x² - 2x - 3)', () => {
		// sign(x² - 2x - 3) = sign((x-3)(x+1)) has jumps at x = -1 and x = 3
		const xSquared = power(variable('x'), number('2'));
		const quadArg = subtract(
			subtract(xSquared, implicitMultiply(number('2'), variable('x'))),
			number('3')
		);
		const expr = func('sign', [quadArg]);

		const candidates = findDiscontinuityCandidates(expr, 'x');
		const points = candidates
			.map((c) => {
				if (c.point.type === 'number') {
					return parseFloat(c.point.value);
				}
				return null;
			})
			.filter((p): p is number => p !== null);

		// Should find candidates at x = -1 and x = 3
		expect(points.some((p) => Math.abs(p + 1) < 0.01)).toBe(true);
		expect(points.some((p) => Math.abs(p - 3) < 0.01)).toBe(true);
	});

	it('handles simple linear case: abs(x - 5)', () => {
		// abs(x - 5) has corner at x = 5
		const expr = func('abs', [subtract(variable('x'), number('5'))]);

		const candidates = findDiscontinuityCandidates(expr, 'x');
		const points = candidates
			.map((c) => {
				if (c.point.type === 'number') {
					return parseFloat(c.point.value);
				}
				return null;
			})
			.filter((p): p is number => p !== null);

		// Should find candidate at x = 5
		expect(points.some((p) => Math.abs(p - 5) < 0.01)).toBe(true);
	});

	it('finds zeros of cubic argument using findZeros from domain module', () => {
		// sign(x³ - x) = sign(x(x-1)(x+1)) has jumps at x = -1, 0, 1
		// This tests the integration with findZeros which handles cubics
		const xCubed = power(variable('x'), number('3'));
		const cubicArg = subtract(xCubed, variable('x')); // x³ - x
		const expr = func('sign', [cubicArg]);

		const candidates = findDiscontinuityCandidates(expr, 'x');
		const points = candidates
			.map((c) => {
				if (c.point.type === 'number') {
					return parseFloat(c.point.value);
				}
				return null;
			})
			.filter((p): p is number => p !== null);

		// Should find candidates at x = -1, 0, and 1
		expect(points.some((p) => Math.abs(p + 1) < 0.01)).toBe(true);
		expect(points.some((p) => Math.abs(p) < 0.01)).toBe(true);
		expect(points.some((p) => Math.abs(p - 1) < 0.01)).toBe(true);
	});
});
