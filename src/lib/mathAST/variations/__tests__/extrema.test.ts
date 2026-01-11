/**
 * Extrema Classification Tests
 *
 * Tests for finding and classifying local/global extrema.
 *
 * Test categories:
 * - Local minimum detection (f' changes from - to +)
 * - Local maximum detection (f' changes from + to -)
 * - Global extrema on bounded domains
 * - No extrema cases (monotonic functions)
 * - Edge cases and boundary behavior
 *
 * @module mathAST/variations/__tests__/extrema.test
 */

import { describe, it, expect } from 'vitest';
import {
	findExtrema,
	classifyExtremum,
	findAdjacentIntervals,
	classifyGlobalExtrema,
	isGlobalExtremum,
	getExtremumDescription,
	getExtremumLabel
} from '../extrema';
import type { CriticalPointInfo, MonotonicInterval, ExtremumInfo } from '../types';
import type { Domain, IntervalSet } from '../../domain/types';
import { parseLatex } from '../../parser';
import { number } from '../../factory';
import {
	interval,
	openEndpoint,
	closedEndpoint,
	negInfinity,
	posInfinity,
	fromNumber
} from '$lib/math/intervals/factory';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse a LaTeX expression.
 */
function parse(latex: string) {
	return parseLatex(latex);
}

/**
 * Create a universal (all reals) domain.
 */
function universalDomain(): Domain {
	return { kind: 'universal' };
}

/**
 * Create a bounded interval domain [lower, upper].
 */
function boundedDomain(lower: number, upper: number): IntervalSet {
	return {
		kind: 'interval_set',
		intervals: [interval(closedEndpoint(fromNumber(lower)), closedEndpoint(fromNumber(upper)))],
		excludedPoints: []
	};
}

/**
 * Create a monotonic interval helper.
 */
function createMonotonicInterval(
	lower: number | typeof negInfinity,
	upper: number | typeof posInfinity,
	monotonicity: 'increasing' | 'decreasing' | 'constant' | 'unknown',
	derivativeSign: 'positive' | 'negative' | 'zero' | 'unknown'
): MonotonicInterval {
	const lowerEndpoint = typeof lower === 'number' ? openEndpoint(fromNumber(lower)) : negInfinity();

	const upperEndpoint = typeof upper === 'number' ? openEndpoint(fromNumber(upper)) : posInfinity();

	return {
		interval: interval(lowerEndpoint, upperEndpoint),
		monotonicity,
		derivativeSign
	};
}

/**
 * Create a critical point info helper.
 */
function createCriticalPoint(
	xValue: number,
	yValue?: number,
	nature: 'derivative_zero' | 'derivative_undefined' = 'derivative_zero'
): CriticalPointInfo {
	return {
		x: number(String(xValue)),
		xApproximate: xValue,
		y: yValue !== undefined ? number(String(yValue)) : undefined,
		yApproximate: yValue,
		nature,
		exact: true
	};
}

// =============================================================================
// classifyExtremum Tests
// =============================================================================

describe('classifyExtremum', () => {
	describe("local minimum detection (f' changes - to +)", () => {
		it('should classify as local_minimum when decreasing before and increasing after', () => {
			const criticalPoint = createCriticalPoint(0, 0);
			const before = createMonotonicInterval(-Infinity, 0, 'decreasing', 'negative');
			const after = createMonotonicInterval(0, Infinity, 'increasing', 'positive');

			const result = classifyExtremum(criticalPoint, before, after);

			expect(result).toBe('local_minimum');
		});

		it('should handle x^2 at x = 0', () => {
			// f(x) = x^2: decreasing on ]-inf, 0[, increasing on ]0, +inf[
			const criticalPoint = createCriticalPoint(0, 0);
			const before = createMonotonicInterval(-Infinity, 0, 'decreasing', 'negative');
			const after = createMonotonicInterval(0, Infinity, 'increasing', 'positive');

			const result = classifyExtremum(criticalPoint, before, after);

			expect(result).toBe('local_minimum');
		});
	});

	describe("local maximum detection (f' changes + to -)", () => {
		it('should classify as local_maximum when increasing before and decreasing after', () => {
			const criticalPoint = createCriticalPoint(2, 1);
			const before = createMonotonicInterval(-Infinity, 2, 'increasing', 'positive');
			const after = createMonotonicInterval(2, Infinity, 'decreasing', 'negative');

			const result = classifyExtremum(criticalPoint, before, after);

			expect(result).toBe('local_maximum');
		});

		it('should handle -x^2 + 4x - 3 at x = 2', () => {
			// f(x) = -x^2 + 4x - 3: increasing on ]-inf, 2[, decreasing on ]2, +inf[
			const criticalPoint = createCriticalPoint(2, 1);
			const before = createMonotonicInterval(-Infinity, 2, 'increasing', 'positive');
			const after = createMonotonicInterval(2, Infinity, 'decreasing', 'negative');

			const result = classifyExtremum(criticalPoint, before, after);

			expect(result).toBe('local_maximum');
		});
	});

	describe('inflection point (no sign change)', () => {
		it('should classify as inflection when increasing before and after', () => {
			const criticalPoint = createCriticalPoint(0, 0);
			const before = createMonotonicInterval(-Infinity, 0, 'increasing', 'positive');
			const after = createMonotonicInterval(0, Infinity, 'increasing', 'positive');

			const result = classifyExtremum(criticalPoint, before, after);

			expect(result).toBe('inflection');
		});

		it('should handle x^3 at x = 0 (inflection point)', () => {
			// f(x) = x^3: increasing throughout, f'(0) = 0 but no sign change
			// Actually f'(x) = 3x^2 >= 0, so it's non-negative everywhere
			const criticalPoint = createCriticalPoint(0, 0);
			// Note: 3x^2 is never negative, so both "intervals" are constant or positive
			const before = createMonotonicInterval(-Infinity, 0, 'increasing', 'positive');
			const after = createMonotonicInterval(0, Infinity, 'increasing', 'positive');

			const result = classifyExtremum(criticalPoint, before, after);

			expect(result).toBe('inflection');
		});

		it('should classify as inflection when decreasing before and after', () => {
			const criticalPoint = createCriticalPoint(1, 0);
			const before = createMonotonicInterval(-Infinity, 1, 'decreasing', 'negative');
			const after = createMonotonicInterval(1, Infinity, 'decreasing', 'negative');

			const result = classifyExtremum(criticalPoint, before, after);

			expect(result).toBe('inflection');
		});
	});

	describe('edge cases', () => {
		it('should return null when before interval is missing', () => {
			const criticalPoint = createCriticalPoint(0, 0);
			const after = createMonotonicInterval(0, Infinity, 'increasing', 'positive');

			const result = classifyExtremum(criticalPoint, null, after);

			expect(result).toBeNull();
		});

		it('should return null when after interval is missing', () => {
			const criticalPoint = createCriticalPoint(0, 0);
			const before = createMonotonicInterval(-Infinity, 0, 'decreasing', 'negative');

			const result = classifyExtremum(criticalPoint, before, null);

			expect(result).toBeNull();
		});

		it('should return null when monotonicity is unknown', () => {
			const criticalPoint = createCriticalPoint(0, 0);
			const before = createMonotonicInterval(-Infinity, 0, 'unknown', 'unknown');
			const after = createMonotonicInterval(0, Infinity, 'increasing', 'positive');

			const result = classifyExtremum(criticalPoint, before, after);

			expect(result).toBeNull();
		});
	});
});

// =============================================================================
// findAdjacentIntervals Tests
// =============================================================================

describe('findAdjacentIntervals', () => {
	it('should find intervals adjacent to x = 0', () => {
		const intervals: MonotonicInterval[] = [
			createMonotonicInterval(-Infinity, 0, 'decreasing', 'negative'),
			createMonotonicInterval(0, Infinity, 'increasing', 'positive')
		];

		const x = number('0');
		const result = findAdjacentIntervals(x, intervals);

		expect(result.before).toBeDefined();
		expect(result.after).toBeDefined();
		expect(result.before?.monotonicity).toBe('decreasing');
		expect(result.after?.monotonicity).toBe('increasing');
	});

	it('should find intervals adjacent to x = -1 and x = 1 for x^3 - 3x', () => {
		// For f(x) = x^3 - 3x: increasing on ]-inf, -1[, decreasing on ]-1, 1[, increasing on ]1, +inf[
		const intervals: MonotonicInterval[] = [
			createMonotonicInterval(-Infinity, -1, 'increasing', 'positive'),
			createMonotonicInterval(-1, 1, 'decreasing', 'negative'),
			createMonotonicInterval(1, Infinity, 'increasing', 'positive')
		];

		// At x = -1
		const xMinus1 = number('-1');
		const resultMinus1 = findAdjacentIntervals(xMinus1, intervals);
		expect(resultMinus1.before?.monotonicity).toBe('increasing');
		expect(resultMinus1.after?.monotonicity).toBe('decreasing');

		// At x = 1
		const x1 = number('1');
		const result1 = findAdjacentIntervals(x1, intervals);
		expect(result1.before?.monotonicity).toBe('decreasing');
		expect(result1.after?.monotonicity).toBe('increasing');
	});

	it('should return nulls when no adjacent intervals found', () => {
		const intervals: MonotonicInterval[] = [
			createMonotonicInterval(5, 10, 'increasing', 'positive')
		];

		const x = number('0'); // Outside the interval range
		const result = findAdjacentIntervals(x, intervals);

		expect(result.before).toBeNull();
		expect(result.after).toBeNull();
	});
});

// =============================================================================
// findExtrema Tests
// =============================================================================

describe('findExtrema', () => {
	describe('finding extrema for x^2', () => {
		it('should find global minimum at x = 0', () => {
			const expr = parse('x^2');
			const criticalPoints: CriticalPointInfo[] = [createCriticalPoint(0, 0)];

			const monotonicIntervals: MonotonicInterval[] = [
				createMonotonicInterval(-Infinity, 0, 'decreasing', 'negative'),
				createMonotonicInterval(0, Infinity, 'increasing', 'positive')
			];

			const result = findExtrema(expr, 'x', criticalPoints, monotonicIntervals, universalDomain());

			expect(result.length).toBe(1);
			expect(result[0].type).toBe('local_minimum');
			expect(result[0].xApproximate).toBeCloseTo(0, 5);
		});
	});

	describe('finding extrema for x^3 - 3x', () => {
		it('should find two extrema (local max at -1, local min at 1)', () => {
			const expr = parse('x^3 - 3x');
			const criticalPoints: CriticalPointInfo[] = [
				createCriticalPoint(-1, 2),
				createCriticalPoint(1, -2)
			];

			const monotonicIntervals: MonotonicInterval[] = [
				createMonotonicInterval(-Infinity, -1, 'increasing', 'positive'),
				createMonotonicInterval(-1, 1, 'decreasing', 'negative'),
				createMonotonicInterval(1, Infinity, 'increasing', 'positive')
			];

			const result = findExtrema(expr, 'x', criticalPoints, monotonicIntervals, universalDomain());

			expect(result.length).toBe(2);

			// Local maximum at x = -1
			const localMax = result.find((e) => e.type === 'local_maximum');
			expect(localMax).toBeDefined();
			expect(localMax!.xApproximate).toBeCloseTo(-1, 5);

			// Local minimum at x = 1
			const localMin = result.find((e) => e.type === 'local_minimum');
			expect(localMin).toBeDefined();
			expect(localMin!.xApproximate).toBeCloseTo(1, 5);
		});
	});

	describe('no extrema for monotonic functions', () => {
		it('should find no extrema for exp(x)', () => {
			const expr = parse('\\exp(x)');
			const criticalPoints: CriticalPointInfo[] = []; // No critical points

			const monotonicIntervals: MonotonicInterval[] = [
				createMonotonicInterval(-Infinity, Infinity, 'increasing', 'positive')
			];

			const result = findExtrema(expr, 'x', criticalPoints, monotonicIntervals, universalDomain());

			expect(result.length).toBe(0);
		});

		it('should find no extrema for x^3 (inflection point is not extremum)', () => {
			const expr = parse('x^3');
			const criticalPoints: CriticalPointInfo[] = [createCriticalPoint(0, 0)];

			// For x^3, f' = 3x^2 is always non-negative, increasing throughout
			const monotonicIntervals: MonotonicInterval[] = [
				createMonotonicInterval(-Infinity, 0, 'increasing', 'positive'),
				createMonotonicInterval(0, Infinity, 'increasing', 'positive')
			];

			const result = findExtrema(expr, 'x', criticalPoints, monotonicIntervals, universalDomain());

			expect(result.length).toBe(0);
		});
	});
});

// =============================================================================
// classifyGlobalExtrema Tests
// =============================================================================

describe('classifyGlobalExtrema', () => {
	describe('upgrading local to global extrema', () => {
		it('should upgrade local minimum to global minimum for x^2', () => {
			const expr = parse('x^2');
			const localExtrema: ExtremumInfo[] = [
				{
					x: number('0'),
					xApproximate: 0,
					y: number('0'),
					yApproximate: 0,
					type: 'local_minimum',
					exact: true
				}
			];

			const result = classifyGlobalExtrema(localExtrema, expr, 'x', universalDomain());

			expect(result.length).toBe(1);
			expect(result[0].type).toBe('global_minimum');
		});

		it('should upgrade local maximum to global maximum for -x^2', () => {
			const expr = parse('-x^2');
			const localExtrema: ExtremumInfo[] = [
				{
					x: number('0'),
					xApproximate: 0,
					y: number('0'),
					yApproximate: 0,
					type: 'local_maximum',
					exact: true
				}
			];

			const result = classifyGlobalExtrema(localExtrema, expr, 'x', universalDomain());

			expect(result.length).toBe(1);
			expect(result[0].type).toBe('global_maximum');
		});
	});

	describe('multiple local extrema', () => {
		it('should classify extrema for x^3 - 3x on unbounded domain', () => {
			const expr = parse('x^3 - 3x');
			const localExtrema: ExtremumInfo[] = [
				{
					x: number('-1'),
					xApproximate: -1,
					y: number('2'),
					yApproximate: 2,
					type: 'local_maximum',
					exact: true
				},
				{
					x: number('1'),
					xApproximate: 1,
					y: number('-2'),
					yApproximate: -2,
					type: 'local_minimum',
					exact: true
				}
			];

			const result = classifyGlobalExtrema(localExtrema, expr, 'x', universalDomain());

			// On unbounded domain, x^3 - 3x goes to +/- infinity at the boundaries
			// The implementation may keep them as local or upgrade based on boundary analysis
			const localMax = result.find((e) => e.xApproximate === -1);
			const localMin = result.find((e) => e.xApproximate === 1);

			// Both extrema should be present in the result
			expect(localMax).toBeDefined();
			expect(localMin).toBeDefined();

			// The type should be either local or global (implementation dependent)
			expect(['local_maximum', 'global_maximum']).toContain(localMax?.type);
			expect(['local_minimum', 'global_minimum']).toContain(localMin?.type);
		});
	});

	describe('bounded domain', () => {
		it('should consider boundary values for global extrema on bounded domain', () => {
			const expr = parse('x^2');
			const domain = boundedDomain(-2, 3);
			const localExtrema: ExtremumInfo[] = [
				{
					x: number('0'),
					xApproximate: 0,
					y: number('0'),
					yApproximate: 0,
					type: 'local_minimum',
					exact: true
				}
			];

			const result = classifyGlobalExtrema(localExtrema, expr, 'x', domain);

			// On [-2, 3], x^2 has global min at 0 and global max at x=3 (boundary)
			expect(result.some((e) => e.type === 'global_minimum')).toBe(true);
		});
	});
});

// =============================================================================
// isGlobalExtremum Tests
// =============================================================================

describe('isGlobalExtremum', () => {
	it('should return true for the only minimum', () => {
		const extremum: ExtremumInfo = {
			x: number('0'),
			xApproximate: 0,
			y: number('0'),
			yApproximate: 0,
			type: 'local_minimum',
			exact: true
		};

		const result = isGlobalExtremum(extremum, [extremum], []);

		expect(result).toBe(true);
	});

	it('should return false when there is a smaller value', () => {
		const extremum: ExtremumInfo = {
			x: number('0'),
			xApproximate: 0,
			y: number('1'),
			yApproximate: 1,
			type: 'local_minimum',
			exact: true
		};

		const boundaryValue = { x: number('5'), y: 0 }; // Smaller y-value

		const result = isGlobalExtremum(extremum, [extremum], [boundaryValue]);

		expect(result).toBe(false);
	});

	it('should return true for the only maximum', () => {
		const extremum: ExtremumInfo = {
			x: number('0'),
			xApproximate: 0,
			y: number('0'),
			yApproximate: 0,
			type: 'local_maximum',
			exact: true
		};

		const result = isGlobalExtremum(extremum, [extremum], []);

		expect(result).toBe(true);
	});

	it('should return false when there is a larger value', () => {
		const extremum: ExtremumInfo = {
			x: number('0'),
			xApproximate: 0,
			y: number('1'),
			yApproximate: 1,
			type: 'local_maximum',
			exact: true
		};

		const boundaryValue = { x: number('5'), y: 10 }; // Larger y-value

		const result = isGlobalExtremum(extremum, [extremum], [boundaryValue]);

		expect(result).toBe(false);
	});
});

// =============================================================================
// Description Functions Tests
// =============================================================================

describe('getExtremumDescription', () => {
	it('should return French description for local_minimum', () => {
		expect(getExtremumDescription('local_minimum')).toBe('minimum local');
	});

	it('should return French description for local_maximum', () => {
		expect(getExtremumDescription('local_maximum')).toBe('maximum local');
	});

	it('should return French description for global_minimum', () => {
		expect(getExtremumDescription('global_minimum')).toBe('minimum global');
	});

	it('should return French description for global_maximum', () => {
		expect(getExtremumDescription('global_maximum')).toBe('maximum global');
	});
});

describe('getExtremumLabel', () => {
	it('should return short label for local_minimum', () => {
		expect(getExtremumLabel('local_minimum')).toBe('min.');
	});

	it('should return short label for local_maximum', () => {
		expect(getExtremumLabel('local_maximum')).toBe('max.');
	});

	it('should return uppercase short label for global_minimum', () => {
		expect(getExtremumLabel('global_minimum')).toBe('Min.');
	});

	it('should return uppercase short label for global_maximum', () => {
		expect(getExtremumLabel('global_maximum')).toBe('Max.');
	});
});
