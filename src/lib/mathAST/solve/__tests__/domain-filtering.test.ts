/**
 * Domain Filtering Tests
 *
 * Tests that solve() computes the domain of definition and filters
 * solutions that fall outside the domain.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import type { RelationNode } from '../../types';
import { isUniversal } from '../../domain/algebra';
import {
	intervalDomain,
	greaterThanOrEqual,
	greaterThan,
	lessThan,
	lessThanOrEqual,
	closedInterval,
	openInterval,
	fromNumber,
	universalDomain
} from '../../domain/factory';
import type { Domain } from '../../domain/types';

function parseEquation(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') {
		throw new Error(`Expected relation, got ${node.type}`);
	}
	return node;
}

describe('Domain filtering in solve()', () => {
	describe('Domain attached to result', () => {
		it('should attach domain ]0, +∞[ for ln(x) = 3', () => {
			const result = solve(parseEquation('\\ln(x) = 3'));

			expect(result.domain).toBeDefined();
			expect(result.domain!.kind).not.toBe('universal');
			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			// e^3 ≈ 20.09, which is in ]0, +∞[
			expect(result.solutions[0].approximate).toBeCloseTo(Math.E ** 3, 3);
		});

		it('should attach universal domain for x^2 + 1 = 0', () => {
			const result = solve(parseEquation('x^2 + 1 = 0'));

			expect(result.domain).toBeDefined();
			expect(isUniversal(result.domain!)).toBe(true);
		});

		it('should attach universal domain for polynomial x^2 - 4 = 0', () => {
			const result = solve(parseEquation('x^2 - 4 = 0'));

			expect(result.domain).toBeDefined();
			expect(isUniversal(result.domain!)).toBe(true);
			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);
		});

		it('should attach domain for ln(x) = 0', () => {
			const result = solve(parseEquation('\\ln(x) = 0'));

			expect(result.domain).toBeDefined();
			expect(result.domain!.kind).not.toBe('universal');
			// x = 1 is in ]0, +∞[, so it should be kept
			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(1, 5);
		});
	});

	describe('Step recording', () => {
		it('should record a domain computation step for ln(x) = 3', () => {
			const result = solve(parseEquation('\\ln(x) = 3'), { verbosity: 'summarized' });

			const domainStep = result.steps.find((s) => s.rule === 'domain-computation');
			expect(domainStep).toBeDefined();
			expect(domainStep!.description).toContain('Ensemble de définition');
		});

		it('should NOT record a domain step for polynomial equations', () => {
			const result = solve(parseEquation('x^2 - 4 = 0'), { verbosity: 'detailed' });

			const domainStep = result.steps.find((s) => s.rule === 'domain-computation');
			expect(domainStep).toBeUndefined();
		});
	});

	describe('Domain preserves valid solutions', () => {
		it('should keep ln(x) = 0 solution x = 1 (in domain ]0, +∞[)', () => {
			const result = solve(parseEquation('\\ln(x) = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(1, 5);
		});

		it('should keep all polynomial solutions (universal domain)', () => {
			const result = solve(parseEquation('x^2 - 5x + 6 = 0'));

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);
			const approxValues = result.solutions.map((s) => s.approximate).sort();
			expect(approxValues[0]).toBeCloseTo(2, 5);
			expect(approxValues[1]).toBeCloseTo(3, 5);
		});
	});

	// =========================================================================
	// User-provided search domain
	// =========================================================================
	describe('User-provided search domain', () => {
		// -----------------------------------------------------------------
		// Basic filtering
		// -----------------------------------------------------------------
		describe('Basic filtering', () => {
			it('should filter x² - 4 = 0 to only positive solution on [0, +∞[', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([greaterThanOrEqual(fromNumber(0))])
				});

				expect(result.status).toBe('unique');
				expect(result.solutions).toHaveLength(1);
				expect(result.solutions[0].approximate).toBeCloseTo(2, 5);
			});

			it('should filter x² - 4 = 0 to only negative solution on ]-∞, 0]', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([lessThanOrEqual(fromNumber(0))])
				});

				expect(result.status).toBe('unique');
				expect(result.solutions).toHaveLength(1);
				expect(result.solutions[0].approximate).toBeCloseTo(-2, 5);
			});

			it('should keep both solutions of x² - 4 = 0 on [-3, 3]', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([closedInterval(fromNumber(-3), fromNumber(3))])
				});

				expect(result.status).toBe('multiple');
				expect(result.solutions).toHaveLength(2);
			});

			it('should return no-solution when all solutions are outside the domain', () => {
				// x² - 4 = 0 → x = ±2, both outside ]5, 10[
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([openInterval(fromNumber(5), fromNumber(10))])
				});

				expect(result.status).toBe('no-solution');
				expect(result.solutions).toHaveLength(0);
			});

			it('should not change behavior when no domain is provided', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'));

				expect(result.status).toBe('multiple');
				expect(result.solutions).toHaveLength(2);
			});
		});

		// -----------------------------------------------------------------
		// Open vs closed boundary (solution exactly on boundary)
		// -----------------------------------------------------------------
		describe('Open vs closed boundary', () => {
			it('should KEEP solution x = 2 on [2, +∞[ (closed includes boundary)', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([greaterThanOrEqual(fromNumber(2))])
				});

				expect(result.solutions).toHaveLength(1);
				expect(result.solutions[0].approximate).toBeCloseTo(2, 5);
			});

			it('should EXCLUDE solution x = 2 on ]2, +∞[ (open excludes boundary)', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([greaterThan(fromNumber(2))])
				});

				expect(result.solutions).toHaveLength(0);
				expect(result.status).toBe('no-solution');
			});

			it('should KEEP solution x = -2 on ]-∞, -2] (closed includes boundary)', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([lessThanOrEqual(fromNumber(-2))])
				});

				expect(result.solutions).toHaveLength(1);
				expect(result.solutions[0].approximate).toBeCloseTo(-2, 5);
			});

			it('should EXCLUDE solution x = -2 on ]-∞, -2[ (open excludes boundary)', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([lessThan(fromNumber(-2))])
				});

				expect(result.solutions).toHaveLength(0);
				expect(result.status).toBe('no-solution');
			});

			it('should keep x = 3 in [0, 3] but not in [0, 3[', () => {
				// x² - 9 = 0 → x = ±3
				const closed = solve(parseEquation('x^2 - 9 = 0'), {
					domain: intervalDomain([closedInterval(fromNumber(0), fromNumber(3))])
				});
				const open = solve(parseEquation('x^2 - 9 = 0'), {
					domain: intervalDomain([
						{
							lower: { type: 'closed', value: fromNumber(0) },
							upper: { type: 'open', value: fromNumber(3) }
						}
					])
				});

				expect(closed.solutions).toHaveLength(1);
				expect(closed.solutions[0].approximate).toBeCloseTo(3, 5);
				expect(open.solutions).toHaveLength(0);
			});
		});

		// -----------------------------------------------------------------
		// Intersection with computed domain
		// -----------------------------------------------------------------
		describe('Intersection with computed domain', () => {
			it('should intersect user domain ]-∞, 5[ with computed ]0, +∞[', () => {
				// ln(x) = 0 → x = 1, which is in ]0, 5[
				const result = solve(parseEquation('\\ln(x) = 0'), {
					domain: intervalDomain([lessThan(fromNumber(5))])
				});

				expect(result.domain).toBeDefined();
				expect(result.domain!.kind).not.toBe('universal');
				expect(result.status).toBe('unique');
				expect(result.solutions[0].approximate).toBeCloseTo(1, 5);
			});

			it('should return no-solution for ln(x) = 3 when domain is ]0, 10[', () => {
				// e³ ≈ 20.09, outside ]0, 10[
				const result = solve(parseEquation('\\ln(x) = 3'), {
					domain: intervalDomain([openInterval(fromNumber(0), fromNumber(10))])
				});

				expect(result.status).toBe('no-solution');
				expect(result.solutions).toHaveLength(0);
			});

			it('should produce empty domain when search ]-∞, 0] contradicts computed ]0, +∞[', () => {
				// ln(x) needs x > 0, user restricts to x ≤ 0 → empty intersection
				const result = solve(parseEquation('\\ln(x) = 0'), {
					domain: intervalDomain([lessThanOrEqual(fromNumber(0))])
				});

				expect(result.status).toBe('no-solution');
			});

			it('should keep solution when search domain is superset of computed domain', () => {
				// ln(x) = 0 → x = 1, computed domain ]0, +∞[
				// User provides ]-10, +∞[ → superset → no effect
				const result = solve(parseEquation('\\ln(x) = 0'), {
					domain: intervalDomain([greaterThan(fromNumber(-10))])
				});

				expect(result.status).toBe('unique');
				expect(result.solutions[0].approximate).toBeCloseTo(1, 5);
			});
		});

		// -----------------------------------------------------------------
		// Universal/trivial search domain
		// -----------------------------------------------------------------
		describe('Universal/trivial search domain', () => {
			it('should not change behavior with universal search domain', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: universalDomain()
				});

				expect(result.status).toBe('multiple');
				expect(result.solutions).toHaveLength(2);
			});

			it('should return no-solution with empty search domain', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: { kind: 'empty' } as Domain
				});

				expect(result.status).toBe('no-solution');
			});
		});

		// -----------------------------------------------------------------
		// Narrow domains (single-point or very small)
		// -----------------------------------------------------------------
		describe('Narrow domains', () => {
			it('should find solution in tight interval around it: x = 2 in [1.5, 2.5]', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([closedInterval(fromNumber(1.5), fromNumber(2.5))])
				});

				expect(result.solutions).toHaveLength(1);
				expect(result.solutions[0].approximate).toBeCloseTo(2, 5);
			});

			it('should find nothing in interval between solutions: x² - 4 = 0 on [-1, 1]', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([closedInterval(fromNumber(-1), fromNumber(1))])
				});

				expect(result.status).toBe('no-solution');
				expect(result.solutions).toHaveLength(0);
			});
		});

		// -----------------------------------------------------------------
		// Multi-interval search domain
		// -----------------------------------------------------------------
		describe('Multi-interval search domain', () => {
			it('should filter on ]-∞, -1[ ∪ ]1, +∞[ keeping both solutions of x² - 4 = 0', () => {
				// Solutions ±2 are both in the union
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([lessThan(fromNumber(-1)), greaterThan(fromNumber(1))])
				});

				expect(result.solutions).toHaveLength(2);
			});

			it('should filter on ]-∞, -3[ ∪ ]3, +∞[ excluding both solutions of x² - 4 = 0', () => {
				// Solutions ±2 are NOT in the union
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([lessThan(fromNumber(-3)), greaterThan(fromNumber(3))])
				});

				expect(result.status).toBe('no-solution');
			});

			it('should keep only one solution in ]-∞, 0[ ∪ ]5, +∞[', () => {
				// x² - 4 = 0 → x = -2 (in ]-∞, 0[) and x = 2 (not in either interval)
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([lessThan(fromNumber(0)), greaterThan(fromNumber(5))])
				});

				expect(result.solutions).toHaveLength(1);
				expect(result.solutions[0].approximate).toBeCloseTo(-2, 5);
			});
		});

		// -----------------------------------------------------------------
		// Different equation types with search domain
		// -----------------------------------------------------------------
		describe('Different equation types', () => {
			it('should restrict linear equation 2x - 6 = 0 to [0, 2]', () => {
				// x = 3, which is outside [0, 2]
				const result = solve(parseEquation('2x - 6 = 0'), {
					domain: intervalDomain([closedInterval(fromNumber(0), fromNumber(2))])
				});

				expect(result.status).toBe('no-solution');
			});

			it('should restrict linear equation 2x - 6 = 0 to [0, 5]', () => {
				// x = 3, which is in [0, 5]
				const result = solve(parseEquation('2x - 6 = 0'), {
					domain: intervalDomain([closedInterval(fromNumber(0), fromNumber(5))])
				});

				expect(result.status).toBe('unique');
				expect(result.solutions[0].approximate).toBeCloseTo(3, 5);
			});

			it('should restrict cubic x³ - 8 = 0 to [0, +∞[', () => {
				// x = 2 (only real root), in [0, +∞[
				const result = solve(parseEquation('x^3 - 8 = 0'), {
					domain: intervalDomain([greaterThanOrEqual(fromNumber(0))])
				});

				expect(result.status).toBe('unique');
				expect(result.solutions[0].approximate).toBeCloseTo(2, 5);
			});

			it('should restrict quadratic with 3 solutions (x³ - x = 0) to ]0, +∞[', () => {
				// x(x²-1) = 0 → x = -1, 0, 1. Only x = 1 is in ]0, +∞[
				const result = solve(parseEquation('x^3 - x = 0'), {
					domain: intervalDomain([greaterThan(fromNumber(0))])
				});

				expect(result.solutions).toHaveLength(1);
				expect(result.solutions[0].approximate).toBeCloseTo(1, 5);
			});

			it('should restrict ln(x) = 0 to [0.5, 2]', () => {
				// x = 1 is in [0.5, 2]
				const result = solve(parseEquation('\\ln(x) = 0'), {
					domain: intervalDomain([closedInterval(fromNumber(0.5), fromNumber(2))])
				});

				expect(result.status).toBe('unique');
				expect(result.solutions[0].approximate).toBeCloseTo(1, 5);
			});

			it('should restrict √x - 2 = 0 to [0, 3]', () => {
				// x = 4, which is outside [0, 3]
				const result = solve(parseEquation('\\sqrt{x} - 2 = 0'), {
					domain: intervalDomain([closedInterval(fromNumber(0), fromNumber(3))])
				});

				expect(result.status).toBe('no-solution');
			});

			it('should restrict √x - 2 = 0 to [0, 5]', () => {
				// x = 4, which is in [0, 5]
				const result = solve(parseEquation('\\sqrt{x} - 2 = 0'), {
					domain: intervalDomain([closedInterval(fromNumber(0), fromNumber(5))])
				});

				expect(result.status).toBe('unique');
				expect(result.solutions[0].approximate).toBeCloseTo(4, 5);
			});
		});

		// -----------------------------------------------------------------
		// Step recording
		// -----------------------------------------------------------------
		describe('Step recording', () => {
			it('should record a search-domain step when domain is provided', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([greaterThanOrEqual(fromNumber(0))]),
					verbosity: 'summarized'
				});

				const searchStep = result.steps.find((s) => s.rule === 'search-domain');
				expect(searchStep).toBeDefined();
				expect(searchStep!.description).toContain('Recherche des solutions sur');
			});

			it('should NOT record search-domain step when no domain is provided', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					verbosity: 'summarized'
				});

				const searchStep = result.steps.find((s) => s.rule === 'search-domain');
				expect(searchStep).toBeUndefined();
			});

			it('should record search-domain step instead of domain-computation when both apply', () => {
				// ln(x) has non-universal computed domain, + user provides search domain
				const result = solve(parseEquation('\\ln(x) = 0'), {
					domain: intervalDomain([closedInterval(fromNumber(0.5), fromNumber(2))]),
					verbosity: 'summarized'
				});

				const searchStep = result.steps.find((s) => s.rule === 'search-domain');
				const domainStep = result.steps.find((s) => s.rule === 'domain-computation');
				expect(searchStep).toBeDefined();
				expect(domainStep).toBeUndefined();
			});

			it('should record search-domain step even for polynomial (universal computed domain)', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([greaterThan(fromNumber(0))]),
					verbosity: 'summarized'
				});

				const searchStep = result.steps.find((s) => s.rule === 'search-domain');
				expect(searchStep).toBeDefined();
			});
		});

		// -----------------------------------------------------------------
		// Result domain reflects intersection
		// -----------------------------------------------------------------
		describe('Result domain', () => {
			it('should set result.domain to the intersected domain', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: intervalDomain([greaterThanOrEqual(fromNumber(0))])
				});

				expect(result.domain).toBeDefined();
				expect(result.domain!.kind).not.toBe('universal');
			});

			it('should keep result.domain universal when search domain is universal', () => {
				const result = solve(parseEquation('x^2 - 4 = 0'), {
					domain: universalDomain()
				});

				expect(result.domain).toBeDefined();
				expect(isUniversal(result.domain!)).toBe(true);
			});

			it('should set result.domain to intersected for ln(x) with search domain', () => {
				// computed: ]0, +∞[, search: [0.5, 2] → intersection: [0.5, 2]
				const result = solve(parseEquation('\\ln(x) = 0'), {
					domain: intervalDomain([closedInterval(fromNumber(0.5), fromNumber(2))])
				});

				expect(result.domain).toBeDefined();
				expect(result.domain!.kind).toBe('interval_set');
			});
		});
	});
});
