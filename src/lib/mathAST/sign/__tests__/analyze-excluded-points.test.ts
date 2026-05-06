/**
 * Sign Analysis — splitting at excludedPoints (regression for the V1
 * inequality wrapper's `expandExcludedPoints` workaround).
 *
 * Before the fix, `analyzeSign(1/x)` returned a single signedInterval over
 * `]-∞, +∞[` with sign='unknown', because `splitDomainAtZeros` only iterated
 * `domain.intervals` and ignored `excludedPoints`. The fix treats excluded
 * points as additional partition points (without emitting them as
 * `isZeroPoint: true`).
 *
 * @module mathAST/sign/__tests__/analyze-excluded-points.test
 */

import { describe, it, expect } from 'vitest';
import { analyzeSign } from '../analyze';
import { parseLatex } from '../../parser';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import type { Interval } from '$lib/math/intervals/types';

function getEndpointNumeric(end: { value: unknown }): number {
	return endpointToNumber(end.value as never);
}

function describeInterval(int: Interval): string {
	const lo = int.lower.type === 'closed' ? '[' : ']';
	const hi = int.upper.type === 'closed' ? ']' : '[';
	return `${lo}${getEndpointNumeric(int.lower)}, ${getEndpointNumeric(int.upper)}${hi}`;
}

describe('analyzeSign — split at excludedPoints (rational/log discontinuities)', () => {
	it('1/x → 2 signed intervals: ]-∞, 0[ negative and ]0, +∞[ positive', () => {
		const expr = parseLatex('\\frac{1}{x}');
		const result = analyzeSign(expr, { variable: 'x' });

		// Should NOT be one big 'unknown' interval anymore.
		const nonZeroIntervals = result.signedIntervals.filter((si) => si.sign !== 'zero');
		expect(nonZeroIntervals.length).toBeGreaterThanOrEqual(2);

		// Find the two pieces around the discontinuity at x=0.
		const negPart = nonZeroIntervals.find((si) => {
			const lo = getEndpointNumeric(si.interval.lower);
			const hi = getEndpointNumeric(si.interval.upper);
			return lo === -Infinity && hi === 0;
		});
		const posPart = nonZeroIntervals.find((si) => {
			const lo = getEndpointNumeric(si.interval.lower);
			const hi = getEndpointNumeric(si.interval.upper);
			return lo === 0 && hi === Infinity;
		});

		expect(
			negPart,
			`expected ]-∞, 0[; got ${nonZeroIntervals.map((si) => describeInterval(si.interval)).join(', ')}`
		).toBeDefined();
		expect(posPart).toBeDefined();
		expect(negPart!.sign).toBe('negative');
		expect(posPart!.sign).toBe('positive');

		// 0 must be excluded (open endpoints both sides).
		expect(negPart!.interval.upper.type).toBe('open');
		expect(posPart!.interval.lower.type).toBe('open');
	});

	it('1/(x − 2) → split at 2 (open endpoints)', () => {
		const expr = parseLatex('\\frac{1}{x - 2}');
		const result = analyzeSign(expr, { variable: 'x' });

		const nonZeroIntervals = result.signedIntervals.filter((si) => si.sign !== 'zero');
		// Find the part ending at 2 (negative) and starting at 2 (positive).
		const beforeTwo = nonZeroIntervals.find((si) => {
			const lo = getEndpointNumeric(si.interval.lower);
			const hi = getEndpointNumeric(si.interval.upper);
			return lo === -Infinity && hi === 2;
		});
		const afterTwo = nonZeroIntervals.find((si) => {
			const lo = getEndpointNumeric(si.interval.lower);
			const hi = getEndpointNumeric(si.interval.upper);
			return lo === 2 && hi === Infinity;
		});

		expect(beforeTwo).toBeDefined();
		expect(afterTwo).toBeDefined();
		expect(beforeTwo!.interval.upper.type).toBe('open');
		expect(afterTwo!.interval.lower.type).toBe('open');
		expect(beforeTwo!.sign).toBe('negative');
		expect(afterTwo!.sign).toBe('positive');
	});

	it('1 / (x · (x − 1)) → partitioning at 0 and 1 (signs may be approximate)', () => {
		// This test verifies the PARTITIONING (3 sub-intervals around the
		// 2 excluded points). Sign determination on extreme x values
		// (1/(very·very) ≈ 0 < tolerance) is a known sampling weakness
		// upstream — signs may come out 'zero' for the unbounded tails. We
		// only assert the partition shape here.
		const expr = parseLatex('\\frac{1}{x(x - 1)}');
		const result = analyzeSign(expr, { variable: 'x' });

		const bounds = result.signedIntervals.map((si) => [
			getEndpointNumeric(si.interval.lower),
			getEndpointNumeric(si.interval.upper)
		]);

		const expectedPairs: Array<[number, number]> = [
			[-Infinity, 0],
			[0, 1],
			[1, Infinity]
		];
		for (const [lo, hi] of expectedPairs) {
			const found = bounds.find(([l, h]) => l === lo && h === hi);
			expect(found, `expected interval [${lo}, ${hi}] in ${JSON.stringify(bounds)}`).toBeDefined();
		}
	});

	it('REGRESSION — x² − 4 (no exclusion) keeps 2 zeros and 3 sub-intervals', () => {
		const expr = parseLatex('x^2 - 4');
		const result = analyzeSign(expr, { variable: 'x' });

		// 2 zero points at -2 and 2
		expect(result.zeros.length).toBe(2);
		// 5 entries total (3 open intervals + 2 zero points), unchanged from before
		expect(result.signedIntervals.length).toBe(5);
	});

	it('REGRESSION — ln(x) (Df = ]0, +∞[, no exclusion) keeps current shape', () => {
		const expr = parseLatex('\\ln(x)');
		const result = analyzeSign(expr, { variable: 'x' });

		// Df = ]0, +∞[, zero at x=1.
		expect(result.zeros.length).toBe(1);
		expect(result.zeros[0].approximate).toBeCloseTo(1, 5);

		// Should produce ]0, 1[, {1}, ]1, +∞[
		expect(result.signedIntervals.length).toBe(3);
	});

	it('REGRESSION — x − 2 (linear, no exclusion) unchanged', () => {
		const expr = parseLatex('x - 2');
		const result = analyzeSign(expr, { variable: 'x' });

		// 1 zero at 2; 3 entries (left open, point, right open).
		expect(result.zeros.length).toBe(1);
		expect(result.signedIntervals.length).toBe(3);
	});

	it('1/x − 1 → split at 0 (excluded); zero at x=1 not detected by upstream solve', () => {
		// `solve(1/x − 1 = 0)` doesn't find x=1 (transcendental classifier
		// gap, separate from this fix). So this test only verifies the
		// EXCLUDED-POINT split at x=0 is performed.
		const expr = parseLatex('\\frac{1}{x} - 1');
		const result = analyzeSign(expr, { variable: 'x' });

		// 0 must appear as an open boundary in the partition.
		const allBoundaries = new Set<number>();
		for (const si of result.signedIntervals) {
			allBoundaries.add(getEndpointNumeric(si.interval.lower));
			allBoundaries.add(getEndpointNumeric(si.interval.upper));
		}
		expect(allBoundaries.has(0)).toBe(true);

		// At least 2 partitions (one each side of 0).
		expect(result.signedIntervals.length).toBeGreaterThanOrEqual(2);
	});
});
