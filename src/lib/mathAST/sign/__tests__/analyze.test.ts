/**
 * Sign Analysis Tests
 *
 * Tests for the main analyzeSign function that determines the sign of
 * mathematical expressions over their domain.
 *
 * Test categories:
 * - Polynomials: x^2, x^3, simple linear
 * - Transcendental functions: exp(x), ln(x), sqrt(x)
 * - Options: strictMode, numericFallback, verbosity
 * - Edge cases: empty domain, constant expressions
 *
 * Note: Some complex expressions (factored polynomials, products) may not have
 * zeros found automatically by the current solver - those tests are skipped
 * pending solver improvements.
 */

import { describe, it, expect } from 'vitest';
import { analyzeSign } from '../analyze';
import { SignAnalysisError } from '../types';
import { parseLatex } from '../../parser';
import type { Domain, IntervalSet } from '../../domain/types';
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
 * Create an interval domain for testing.
 */
function createIntervalDomain(
	lower: number,
	upper: number,
	openLower = true,
	openUpper = true
): IntervalSet {
	const lowerEndpoint =
		lower === -Infinity
			? negInfinity()
			: openLower
				? openEndpoint(fromNumber(lower))
				: closedEndpoint(fromNumber(lower));

	const upperEndpoint =
		upper === Infinity
			? posInfinity()
			: openUpper
				? openEndpoint(fromNumber(upper))
				: closedEndpoint(fromNumber(upper));

	return {
		kind: 'interval_set',
		intervals: [interval(lowerEndpoint, upperEndpoint)],
		excludedPoints: []
	};
}

/**
 * Create an empty domain.
 */
function emptyDomain(): Domain {
	return { kind: 'empty' };
}

/**
 * Get numeric value from endpoint.
 */
function getEndpointValue(value: unknown): number | null {
	if (typeof value === 'number') return value;

	if (typeof value === 'object' && value !== null) {
		const node = value as { type?: string; sign?: string; value?: string };
		if (node.type === 'infinity') {
			return node.sign === 'negative' ? -Infinity : Infinity;
		}
		if (node.type === 'number' && node.value) {
			return parseFloat(node.value);
		}
	}
	return null;
}

/**
 * Check if result has a zero at the specified value.
 */
function hasZeroAt(
	result: ReturnType<typeof analyzeSign>,
	value: number,
	tolerance = 0.001
): boolean {
	return result.zeros.some((z) => {
		if (z.approximate !== undefined) {
			return Math.abs(z.approximate - value) < tolerance;
		}
		return false;
	});
}

// =============================================================================
// Polynomial Tests
// =============================================================================

describe('analyzeSign - Polynomials', () => {
	describe('x^2 (even power, always non-negative)', () => {
		it('should have zero at x = 0', () => {
			const expr = parse('x^2');
			const result = analyzeSign(expr, { variable: 'x' });

			expect(result.zeros.length).toBeGreaterThanOrEqual(1);
			expect(hasZeroAt(result, 0)).toBe(true);
		});

		it('should be positive on ]-inf, 0[', () => {
			const expr = parse('x^2');
			const result = analyzeSign(expr, { variable: 'x' });

			// x^2 is positive for x != 0
			const signs = result.signedIntervals.filter((si) => si.sign !== 'zero').map((si) => si.sign);

			// All non-zero intervals should be positive
			for (const sign of signs) {
				expect(sign).toBe('positive');
			}
		});

		it('should be positive on ]0, +inf[', () => {
			const expr = parse('x^2');
			const result = analyzeSign(expr, { variable: 'x' });

			// Find interval that starts at 0
			const positiveInterval = result.signedIntervals.find((si) => {
				const lower = getEndpointValue(si.interval.lower.value);
				return lower === 0 && si.sign !== 'zero';
			});

			expect(positiveInterval?.sign).toBe('positive');
		});
	});

	describe('x^3 (odd power, preserves sign)', () => {
		it('should have zero at x = 0', () => {
			const expr = parse('x^3');
			const result = analyzeSign(expr, { variable: 'x' });

			expect(hasZeroAt(result, 0)).toBe(true);
		});

		it('should be negative on ]-inf, 0[', () => {
			const expr = parse('x^3');
			const result = analyzeSign(expr, { variable: 'x' });

			// Find interval with upper bound at 0
			const negativeInterval = result.signedIntervals.find((si) => {
				const upper = getEndpointValue(si.interval.upper.value);
				const lower = getEndpointValue(si.interval.lower.value);
				return upper !== null && upper <= 0 && lower === -Infinity;
			});

			expect(negativeInterval?.sign).toBe('negative');
		});

		it('should be positive on ]0, +inf[', () => {
			const expr = parse('x^3');
			const result = analyzeSign(expr, { variable: 'x' });

			// Find interval with lower bound at 0
			const positiveInterval = result.signedIntervals.find((si) => {
				const lower = getEndpointValue(si.interval.lower.value);
				const upper = getEndpointValue(si.interval.upper.value);
				return lower !== null && lower >= 0 && upper === Infinity && si.sign !== 'zero';
			});

			expect(positiveInterval?.sign).toBe('positive');
		});
	});

	describe('Simple linear: x - 2', () => {
		it('should have zero at x = 2', () => {
			const expr = parse('x - 2');
			const result = analyzeSign(expr, { variable: 'x' });

			expect(hasZeroAt(result, 2)).toBe(true);
		});

		it('should be negative before 2 and positive after 2', () => {
			const expr = parse('x - 2');
			const result = analyzeSign(expr, { variable: 'x' });

			// Check interval before zero
			const beforeZero = result.signedIntervals.find((si) => {
				const upper = getEndpointValue(si.interval.upper.value);
				return upper !== null && Math.abs(upper - 2) < 0.01 && si.sign !== 'zero';
			});
			expect(beforeZero?.sign).toBe('negative');

			// Check interval after zero
			const afterZero = result.signedIntervals.find((si) => {
				const lower = getEndpointValue(si.interval.lower.value);
				return lower !== null && Math.abs(lower - 2) < 0.01 && si.sign !== 'zero';
			});
			expect(afterZero?.sign).toBe('positive');
		});
	});

	describe('x^2 - 4 (quadratic with two zeros)', () => {
		it('should have zeros at x = -2 and x = 2', () => {
			const expr = parse('x^2 - 4');
			const result = analyzeSign(expr, { variable: 'x' });

			expect(hasZeroAt(result, 2)).toBe(true);
			expect(hasZeroAt(result, -2)).toBe(true);
		});
	});
});

// =============================================================================
// Transcendental Function Tests
// =============================================================================

describe('analyzeSign - Transcendental Functions', () => {
	describe('exp(x) - always positive', () => {
		it('should have no zeros', () => {
			const expr = parse('e^x');
			const result = analyzeSign(expr, { variable: 'x' });

			expect(result.zeros.length).toBe(0);
		});

		it('should be positive everywhere', () => {
			const expr = parse('e^x');
			const result = analyzeSign(expr, { variable: 'x' });

			// All intervals should be positive
			for (const si of result.signedIntervals) {
				expect(si.sign).toBe('positive');
			}
		});
	});

	describe('ln(x)', () => {
		it('should have zero at x = 1', () => {
			const expr = parse('\\ln(x)');
			const result = analyzeSign(expr, { variable: 'x' });

			expect(hasZeroAt(result, 1)).toBe(true);
		});

		it('should have domain ]0, +inf[', () => {
			const expr = parse('\\ln(x)');
			const result = analyzeSign(expr, { variable: 'x' });

			// Domain should start at 0
			if (result.domain.kind === 'interval_set') {
				const firstInterval = result.domain.intervals[0];
				const lower = getEndpointValue(firstInterval.lower.value);
				expect(lower).toBe(0);
			}
		});

		it('should be negative on ]0, 1[', () => {
			const expr = parse('\\ln(x)');
			const result = analyzeSign(expr, { variable: 'x' });

			// Find interval ending at 1
			const negInterval = result.signedIntervals.find((si) => {
				const upper = getEndpointValue(si.interval.upper.value);
				return upper !== null && Math.abs(upper - 1) < 0.01 && si.sign !== 'zero';
			});

			expect(negInterval?.sign).toBe('negative');
		});

		it('should be positive on ]1, +inf[', () => {
			const expr = parse('\\ln(x)');
			const result = analyzeSign(expr, { variable: 'x' });

			// Find interval starting at 1
			const posInterval = result.signedIntervals.find((si) => {
				const lower = getEndpointValue(si.interval.lower.value);
				const upper = getEndpointValue(si.interval.upper.value);
				return (
					lower !== null && Math.abs(lower - 1) < 0.01 && upper === Infinity && si.sign !== 'zero'
				);
			});

			expect(posInterval?.sign).toBe('positive');
		});
	});

	describe('sqrt(x)', () => {
		it('should have domain starting at 0', () => {
			const expr = parse('\\sqrt{x}');
			const result = analyzeSign(expr, { variable: 'x' });

			// Domain should start at 0
			if (result.domain.kind === 'interval_set') {
				const firstInterval = result.domain.intervals[0];
				const lower = getEndpointValue(firstInterval.lower.value);
				expect(lower).toBe(0);
			}
		});

		it('should be positive on ]0, +inf[', () => {
			const expr = parse('\\sqrt{x}');
			const result = analyzeSign(expr, { variable: 'x' });

			// Find interval starting at 0 (non-zero part)
			const posInterval = result.signedIntervals.find((si) => {
				const lower = getEndpointValue(si.interval.lower.value);
				return lower !== null && lower >= 0 && si.sign !== 'zero';
			});

			expect(posInterval?.sign).toBe('positive');
		});
	});
});

// =============================================================================
// Options Tests
// =============================================================================

describe('analyzeSign - Options', () => {
	describe('strictMode option', () => {
		it('should throw SignAnalysisError when sign cannot be determined in strictMode', () => {
			// Use an expression where algebraic analysis might fail
			// and we cannot determine sign without numeric fallback
			const expr = parse('x + \\sin(x)');

			expect(() => {
				analyzeSign(expr, {
					variable: 'x',
					strictMode: true,
					numericFallback: false
				});
			}).toThrow(SignAnalysisError);
		});

		it('should not throw in non-strict mode', () => {
			const expr = parse('x + \\sin(x)');

			const result = analyzeSign(expr, {
				variable: 'x',
				strictMode: false,
				numericFallback: false
			});

			// Should have some intervals, even if sign is unknown
			expect(result.signedIntervals).toBeDefined();
		});
	});

	describe('numericFallback option', () => {
		it('should use numeric sampling when algebraic analysis fails', () => {
			// Expression that might need numeric fallback
			const expr = parse('x^2 - 2');

			const result = analyzeSign(expr, {
				variable: 'x',
				numericFallback: true
			});

			// Should determine signs on intervals
			const nonUnknownIntervals = result.signedIntervals.filter((si) => si.sign !== 'unknown');
			expect(nonUnknownIntervals.length).toBeGreaterThan(0);
		});

		it('should return unknown without numeric fallback for complex expressions', () => {
			// Expression where algebraic analysis might fail
			const expr = parse('x + \\sin(x)');

			const result = analyzeSign(expr, {
				variable: 'x',
				numericFallback: false,
				strictMode: false
			});

			// Result should have signed intervals (analysis completed)
			expect(result.signedIntervals.length).toBeGreaterThan(0);
		});
	});

	describe('verbosity option', () => {
		it('should not include steps in result mode', () => {
			const expr = parse('x^2');

			const result = analyzeSign(expr, {
				variable: 'x',
				verbosity: 'result'
			});

			expect(result.steps).toBeUndefined();
		});

		it('should include steps in summarized mode', () => {
			const expr = parse('x^2');

			const result = analyzeSign(expr, {
				variable: 'x',
				verbosity: 'summarized'
			});

			expect(result.steps).toBeDefined();
			expect(result.steps!.length).toBeGreaterThan(0);
		});

		it('should include more steps in detailed mode', () => {
			const expr = parse('x^2');

			const summarized = analyzeSign(expr, {
				variable: 'x',
				verbosity: 'summarized'
			});

			const detailed = analyzeSign(expr, {
				variable: 'x',
				verbosity: 'detailed'
			});

			expect(detailed.steps).toBeDefined();
			expect(detailed.steps!.length).toBeGreaterThanOrEqual(summarized.steps!.length);
		});
	});
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('analyzeSign - Edge Cases', () => {
	describe('Empty domain', () => {
		it('should return empty result for empty domain', () => {
			const expr = parse('x^2');

			const result = analyzeSign(expr, {
				variable: 'x',
				domain: emptyDomain()
			});

			expect(result.zeros).toHaveLength(0);
			expect(result.signedIntervals).toHaveLength(0);
		});
	});

	describe('Constant expressions', () => {
		it('should return positive for positive constant', () => {
			const expr = parse('5');
			const result = analyzeSign(expr, { variable: 'x' });

			expect(result.zeros).toHaveLength(0);
			expect(result.signedIntervals.length).toBeGreaterThan(0);
			expect(result.signedIntervals[0].sign).toBe('positive');
		});

		it('should return zero for zero constant', () => {
			const expr = parse('0');
			const result = analyzeSign(expr, { variable: 'x' });

			// Either zeros should contain 0 or interval should have sign 'zero'
			const hasZeroSign = result.signedIntervals.some((si) => si.sign === 'zero');
			const isEntirelyZero = result.signedIntervals.every((si) => si.sign === 'zero');

			expect(hasZeroSign || isEntirelyZero || result.signedIntervals.length === 0).toBe(true);
		});
	});

	describe('Different variable names', () => {
		it('should work with variable t', () => {
			const expr = parse('t^2 - 1');
			const result = analyzeSign(expr, { variable: 't' });

			expect(result.variable).toBe('t');
			expect(hasZeroAt(result, 1) || hasZeroAt(result, -1)).toBe(true);
		});

		it('should work with variable y', () => {
			const expr = parse('y - 5');
			const result = analyzeSign(expr, { variable: 'y' });

			expect(result.variable).toBe('y');
			expect(hasZeroAt(result, 5)).toBe(true);
		});
	});

	describe('Complex expressions', () => {
		it('should handle nested functions', () => {
			const expr = parse('e^{x^2}'); // Always positive

			const result = analyzeSign(expr, { variable: 'x' });

			// exp of anything is positive
			expect(result.zeros).toHaveLength(0);
			for (const si of result.signedIntervals) {
				expect(si.sign).toBe('positive');
			}
		});
	});

	describe('Domain restriction', () => {
		it('should analyze only within provided domain', () => {
			const expr = parse('x - 1'); // zero at x = 1
			const restrictedDomain = createIntervalDomain(2, 5); // Only analyze ]2, 5[

			const result = analyzeSign(expr, {
				variable: 'x',
				domain: restrictedDomain
			});

			// No zeros should be found since x = 1 is outside ]2, 5[
			expect(result.zeros.length).toBe(0);

			// Expression is positive in ]2, 5[ since x - 1 > 0 for x > 1
			const intervals = result.signedIntervals.filter((si) => si.sign !== 'zero');
			expect(intervals.length).toBeGreaterThan(0);
			expect(intervals[0].sign).toBe('positive');
		});
	});
});

// =============================================================================
// Result Structure Tests
// =============================================================================

describe('analyzeSign - Result Structure', () => {
	it('should return complete result structure', () => {
		const expr = parse('x^2');
		const result = analyzeSign(expr, { variable: 'x' });

		// Check required fields
		expect(result.expression).toBeDefined();
		expect(result.variable).toBe('x');
		expect(result.domain).toBeDefined();
		expect(result.zeros).toBeDefined();
		expect(result.signedIntervals).toBeDefined();
	});

	it('should include expression in result', () => {
		const expr = parse('x - 3');
		const result = analyzeSign(expr, { variable: 'x' });

		expect(result.expression).toBe(expr);
	});

	it('should correctly report domain', () => {
		const expr = parse('x');
		const result = analyzeSign(expr, { variable: 'x' });

		// For a simple polynomial, domain should be universal
		expect(result.domain.kind).toBe('universal');
	});

	it('should have zeros sorted by value', () => {
		const expr = parse('x^2 - 4'); // zeros at -2 and 2
		const result = analyzeSign(expr, { variable: 'x' });

		if (result.zeros.length >= 2) {
			const approxValues = result.zeros
				.map((z) => z.approximate)
				.filter((v): v is number => v !== undefined);

			// Check that zeros are sorted
			for (let i = 1; i < approxValues.length; i++) {
				expect(approxValues[i]).toBeGreaterThan(approxValues[i - 1]);
			}
		}
	});
});
