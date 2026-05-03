/**
 * RED tests for `analyzeRangeContinuity` — Phase 1.2 of the V2 singularity study.
 *
 * These tests are intentionally RED: `analyzeRangeContinuity` and
 * `RangeDiscontinuity` do not exist yet in `singularity-warn.ts`.
 * Implementation comes in Phase 1.3.
 *
 * Reference: docs/wip/geometry/singularity-rigorous-study.md §3, Q2, Q7.
 *
 * NOTE: If `analyzeRangeContinuity` throws on an invalid/unparseable
 * expression, that is acceptable — the caller is responsible for catching.
 * No test is required for that case beyond the comment here.
 */

import { describe, it, expect } from 'vitest';
import { parseCustom } from '$lib/mathAST';
import { getNumericValue } from '$lib/mathAST/common/numeric';
import { analyzeRangeContinuity, type RangeDiscontinuity } from '../singularity-warn';

// =============================================================================
// Helper — extract the numeric value of a discontinuity point.
// =============================================================================

function pointValue(rd: RangeDiscontinuity): number {
	const v = getNumericValue(rd.disc.point);
	if (v !== null) return v;
	throw new Error(`Unexpected point type: ${rd.disc.point.type}`);
}

// =============================================================================
// A. Clean cases — returns an empty array
// =============================================================================

describe('analyzeRangeContinuity — clean cases', () => {
	it('returns [] for polynomial x^2+1 on [-10, 10]', () => {
		const expr = parseCustom('x^2+1');
		const result = analyzeRangeContinuity(expr, 'x', -10, 10);
		expect(result).toEqual([]);
	});

	it('returns [] for cos(x) on [0, 10]', () => {
		const expr = parseCustom('cos(x)');
		const result = analyzeRangeContinuity(expr, 'x', 0, 10);
		expect(result).toEqual([]);
	});

	it('returns [] for 1/x when singularity is outside range [1, 5]', () => {
		const expr = parseCustom('1/x');
		const result = analyzeRangeContinuity(expr, 'x', 1, 5);
		expect(result).toEqual([]);
	});
});

// =============================================================================
// B. Removable discontinuities
// =============================================================================

describe('analyzeRangeContinuity — removable discontinuities', () => {
	it('detects (x^2-1)/(x-1) on [0, 2]: 1 removable interior entry', () => {
		const expr = parseCustom('(x^2-1)/(x-1)');
		const result = analyzeRangeContinuity(expr, 'x', 0, 2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(1);

		const rd = result![0];
		expect(rd.disc.type).toBe('removable');
		expect(rd.disc.source).toBe('division');
		expect(rd.atBoundary).toBe('interior');
		expect(rd.causesDivergence).toBe(false);
		expect(pointValue(rd)).toBeCloseTo(1, 5);
	});

	it('detects sin(x)/x on [-1, 1]: 1 removable interior entry, causesDivergence false', () => {
		const expr = parseCustom('sin(x)/x');
		const result = analyzeRangeContinuity(expr, 'x', -1, 1);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(1);

		const rd = result![0];
		expect(rd.disc.type).toBe('removable');
		expect(rd.atBoundary).toBe('interior');
		expect(rd.causesDivergence).toBe(false);
		expect(pointValue(rd)).toBeCloseTo(0, 5);
	});
});

// =============================================================================
// C. Jump discontinuities — floor(x)
// =============================================================================

describe('analyzeRangeContinuity — jump discontinuities', () => {
	it('detects floor(x) on [0, 3]: 4 jump entries at 0, 1, 2, 3', () => {
		const expr = parseCustom('floor(x)');
		const result = analyzeRangeContinuity(expr, 'x', 0, 3);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(4);

		// All entries are jump discontinuities from floor, non-diverging.
		for (const rd of result!) {
			expect(rd.disc.type).toBe('jump');
			expect(rd.disc.source).toBe('floor');
			expect(rd.causesDivergence).toBe(false);
		}

		// Identify entries by point value.
		const sorted = [...result!].sort((a, b) => pointValue(a) - pointValue(b));
		const points = sorted.map(pointValue);

		expect(points[0]).toBeCloseTo(0, 5);
		expect(points[1]).toBeCloseTo(1, 5);
		expect(points[2]).toBeCloseTo(2, 5);
		expect(points[3]).toBeCloseTo(3, 5);

		// Boundary classification.
		expect(sorted[0].atBoundary).toBe('lower'); // x=0 = lower bound
		expect(sorted[3].atBoundary).toBe('upper'); // x=3 = upper bound
		expect(sorted[1].atBoundary).toBe('interior'); // x=1 interior
		expect(sorted[2].atBoundary).toBe('interior'); // x=2 interior
	});
});

// =============================================================================
// D. Infinite discontinuities
// =============================================================================

describe('analyzeRangeContinuity — infinite discontinuities', () => {
	it('detects 1/x on [-1, 1]: 1 infinite interior entry, causesDivergence true', () => {
		const expr = parseCustom('1/x');
		const result = analyzeRangeContinuity(expr, 'x', -1, 1);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(1);

		const rd = result![0];
		expect(rd.disc.type).toBe('infinite');
		expect(rd.disc.source).toBe('division');
		expect(rd.atBoundary).toBe('interior');
		expect(rd.causesDivergence).toBe(true);
		expect(pointValue(rd)).toBeCloseTo(0, 5);
	});

	it('detects tan(x) on [0, 2*pi]: 2 infinite interior entries, both causesDivergence true', () => {
		const expr = parseCustom('tan(x)');
		const result = analyzeRangeContinuity(expr, 'x', 0, 2 * Math.PI);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		for (const rd of result!) {
			expect(rd.disc.type).toBe('infinite');
			expect(rd.disc.source).toBe('tan');
			expect(rd.atBoundary).toBe('interior');
			expect(rd.causesDivergence).toBe(true);
		}
	});

	it('detects 1/(x^2-1) on [-2, 2]: 2 infinite interior entries, both causesDivergence true', () => {
		const expr = parseCustom('1/(x^2-1)');
		const result = analyzeRangeContinuity(expr, 'x', -2, 2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);

		for (const rd of result!) {
			expect(rd.disc.type).toBe('infinite');
			expect(rd.atBoundary).toBe('interior');
			expect(rd.causesDivergence).toBe(true);
		}

		const pts = result!.map(pointValue).sort((a, b) => a - b);
		expect(pts[0]).toBeCloseTo(-1, 5);
		expect(pts[1]).toBeCloseTo(1, 5);
	});
});

// =============================================================================
// E. Essential discontinuities
// =============================================================================

describe('analyzeRangeContinuity — essential discontinuities', () => {
	it('detects sin(1/x) on [-1, 1]: 1 essential interior entry, causesDivergence true', () => {
		const expr = parseCustom('sin(1/x)');
		const result = analyzeRangeContinuity(expr, 'x', -1, 1);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(1);

		const rd = result![0];
		expect(rd.disc.type).toBe('essential');
		expect(rd.atBoundary).toBe('interior');
		expect(rd.causesDivergence).toBe(true);
		expect(pointValue(rd)).toBeCloseTo(0, 5);
	});
});

// =============================================================================
// F. Boundary cases (Q2 of study)
// =============================================================================

describe('analyzeRangeContinuity — boundary cases', () => {
	it('sqrt(x) on [0, 4]: 1 entry at lower boundary, causesDivergence false (finite right-limit)', () => {
		// analyzeContinuity classifies this as 'essential' (leftLimit null),
		// but the right-limit at 0 is 0 (finite). The function analyzeRangeContinuity
		// must detect that the one-sided limit from inside [0, 4] is finite
		// and therefore the integral converges — causesDivergence: false.
		const expr = parseCustom('sqrt(x)');
		const result = analyzeRangeContinuity(expr, 'x', 0, 4);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(1);

		const rd = result![0];
		expect(rd.atBoundary).toBe('lower');
		expect(rd.causesDivergence).toBe(false);
		expect(pointValue(rd)).toBeCloseTo(0, 5);
	});

	it('1/x on [0, 1]: 1 entry at lower boundary, causesDivergence true (infinite limit from inside)', () => {
		const expr = parseCustom('1/x');
		const result = analyzeRangeContinuity(expr, 'x', 0, 1);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(1);

		const rd = result![0];
		expect(rd.atBoundary).toBe('lower');
		expect(rd.causesDivergence).toBe(true);
		expect(pointValue(rd)).toBeCloseTo(0, 5);
	});

	it('(x^2-1)/(x-1) on [1, 3]: 1 removable entry at lower boundary, causesDivergence false', () => {
		const expr = parseCustom('(x^2-1)/(x-1)');
		const result = analyzeRangeContinuity(expr, 'x', 1, 3);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(1);

		const rd = result![0];
		expect(rd.disc.type).toBe('removable');
		expect(rd.atBoundary).toBe('lower');
		expect(rd.causesDivergence).toBe(false);
		expect(pointValue(rd)).toBeCloseTo(1, 5);
	});
});

// =============================================================================
// G. Edge cases — degenerate bounds → null
// =============================================================================

describe('analyzeRangeContinuity — edge cases (degenerate bounds → null)', () => {
	it('returns null when a is NaN', () => {
		const expr = parseCustom('1/x');
		expect(analyzeRangeContinuity(expr, 'x', NaN, 1)).toBeNull();
	});

	it('returns null when b is NaN', () => {
		const expr = parseCustom('1/x');
		expect(analyzeRangeContinuity(expr, 'x', -1, NaN)).toBeNull();
	});

	it('returns null when a is Infinity', () => {
		const expr = parseCustom('1/x');
		expect(analyzeRangeContinuity(expr, 'x', Infinity, 1)).toBeNull();
	});

	it('returns null when a is -Infinity', () => {
		const expr = parseCustom('1/x');
		expect(analyzeRangeContinuity(expr, 'x', -Infinity, 1)).toBeNull();
	});

	it('returns null when a === b (degenerate interval)', () => {
		const expr = parseCustom('1/x');
		expect(analyzeRangeContinuity(expr, 'x', 0.5, 0.5)).toBeNull();
	});

	it('treats inverted bounds a > b as [b, a] — same result as [-1, 1] for 1/x', () => {
		const expr = parseCustom('1/x');
		const normal = analyzeRangeContinuity(expr, 'x', -1, 1);
		const inverted = analyzeRangeContinuity(expr, 'x', 1, -1);

		// Both should be non-null and have the same number of entries.
		expect(normal).not.toBeNull();
		expect(inverted).not.toBeNull();
		expect(inverted!.length).toBe(normal!.length);

		// The single entry should be at x=0, interior, diverging — same as normal.
		expect(inverted![0].disc.type).toBe('infinite');
		expect(inverted![0].atBoundary).toBe('interior');
		expect(inverted![0].causesDivergence).toBe(true);
	});
});
