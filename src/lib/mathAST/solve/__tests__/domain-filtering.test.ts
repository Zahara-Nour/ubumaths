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
import { intervalDomain, greaterThanOrEqual, fromNumber } from '../../domain/factory';
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

	describe('User-provided search domain', () => {
		it('should filter x² - 4 = 0 to only positive solution when domain is [0, +∞[', () => {
			const searchDomain: Domain = intervalDomain([greaterThanOrEqual(fromNumber(0))]);
			const result = solve(parseEquation('x^2 - 4 = 0'), { domain: searchDomain });

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(2, 5);
		});

		it('should return no-solution for ln(x) = 3 when domain is ]0, 10[', () => {
			// e³ ≈ 20.09 is outside ]0, 10[
			const searchDomain: Domain = intervalDomain([
				{
					lower: { type: 'open', value: fromNumber(0) },
					upper: { type: 'open', value: fromNumber(10) }
				}
			]);
			const result = solve(parseEquation('\\ln(x) = 3'), { domain: searchDomain });

			expect(result.status).toBe('no-solution');
			expect(result.solutions).toHaveLength(0);
		});

		it('should not change behavior when no domain is provided', () => {
			const result = solve(parseEquation('x^2 - 4 = 0'));

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);
		});

		it('should intersect user domain with computed domain', () => {
			// ln(x) has computed domain ]0, +∞[
			// User provides ]-∞, 5[ → intersection is ]0, 5[
			// ln(x) = 0 → x = 1, which is in ]0, 5[
			const searchDomain: Domain = intervalDomain([
				{
					lower: { type: 'open', value: fromNumber(-Infinity) },
					upper: { type: 'open', value: fromNumber(5) }
				}
			]);
			const result = solve(parseEquation('\\ln(x) = 0'), { domain: searchDomain });

			expect(result.domain).toBeDefined();
			expect(result.domain!.kind).not.toBe('universal');
			expect(result.status).toBe('unique');
			expect(result.solutions[0].approximate).toBeCloseTo(1, 5);
		});

		it('should record a search-domain step when domain is provided', () => {
			const searchDomain: Domain = intervalDomain([greaterThanOrEqual(fromNumber(0))]);
			const result = solve(parseEquation('x^2 - 4 = 0'), {
				domain: searchDomain,
				verbosity: 'summarized'
			});

			const searchStep = result.steps.find((s) => s.rule === 'search-domain');
			expect(searchStep).toBeDefined();
			expect(searchStep!.description).toContain('Recherche des solutions sur');
		});

		it('should return no-solution when user domain is empty after intersection', () => {
			// x² - 4 = 0 has universal computed domain
			// User provides ]-∞, -5[ → solutions are -2 and 2, neither in ]-∞, -5[
			const searchDomain: Domain = intervalDomain([
				{
					lower: { type: 'open', value: fromNumber(-Infinity) },
					upper: { type: 'open', value: fromNumber(-5) }
				}
			]);
			const result = solve(parseEquation('x^2 - 4 = 0'), { domain: searchDomain });

			expect(result.status).toBe('no-solution');
			expect(result.solutions).toHaveLength(0);
		});
	});
});
