/**
 * Quartic Solver Tests
 *
 * Tests for solving quartic equations ax⁴ + bx³ + cx² + dx + e = 0.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import type { RelationNode } from '../../types';

// Helper to parse an equation
function parseEquation(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') {
		throw new Error(`Expected relation, got ${node.type}`);
	}
	return node;
}

// Helper to check if solutions contain expected values (by approximation)
function solutionsContainApprox(
	solutions: readonly { approximate?: number }[],
	expected: number,
	tolerance = 0.001
): boolean {
	return solutions.some(
		(s) => s.approximate !== undefined && Math.abs(s.approximate - expected) < tolerance
	);
}

describe('Quartic Solver', () => {
	describe('Biquadratic (ax⁴ + cx² + e = 0)', () => {
		it('should solve x⁴ - 5x² + 4 = 0 -> x = ±1, ±2', () => {
			const eq = parseEquation('x^4 - 5x^2 + 4 = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.equationType).toBe('polynomial');
			expect(result.solutions).toHaveLength(4);
			expect(solutionsContainApprox(result.solutions, -2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
		});

		it('should solve x⁴ - 13x² + 36 = 0 -> x = ±2, ±3', () => {
			const eq = parseEquation('x^4 - 13x^2 + 36 = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(4);
			expect(solutionsContainApprox(result.solutions, -3)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 3)).toBe(true);
		});

		it('should solve x⁴ - x² = 0 -> x = 0, ±1', () => {
			const eq = parseEquation('x^4 - x^2 = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(3);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
		});

		it('should solve x⁴ - 2x² + 1 = 0 -> x = ±1 (double roots)', () => {
			const eq = parseEquation('x^4 - 2x^2 + 1 = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(2);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
		});

		it('should detect no real solution for x⁴ + x² + 1 = 0', () => {
			const eq = parseEquation('x^4 + x^2 + 1 = 0');
			const result = solve(eq);

			expect(result.status).toBe('no-real-solution');
			expect(result.solutions).toHaveLength(0);
		});

		it('should solve non-monic 2x⁴ - 10x² + 8 = 0 -> x = ±1, ±2', () => {
			const eq = parseEquation('2x^4 - 10x^2 + 8 = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(4);
			expect(solutionsContainApprox(result.solutions, -2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
		});
	});

	describe('Common factor (e = 0): x(ax³ + bx² + cx + d) = 0', () => {
		it('should solve x⁴ - 6x³ + 11x² - 6x = 0 -> x = 0, 1, 2, 3', () => {
			const eq = parseEquation('x^4 - 6x^3 + 11x^2 - 6x = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(4);
			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 3)).toBe(true);
		});

		it('should solve x⁴ - x = 0 -> x = 0, 1', () => {
			const eq = parseEquation('x^4 - x = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(2);
			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
		});

		it('should solve x⁴ + x³ = 0 -> x = 0, -1', () => {
			const eq = parseEquation('x^4 + x^3 = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(2);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
		});
	});

	describe('General quartic (Ferrari)', () => {
		it('should solve x⁴ + 2x³ - 7x² - 8x + 12 = 0 -> x = 1, -3, 2, -2', () => {
			const eq = parseEquation('x^4 + 2x^3 - 7x^2 - 8x + 12 = 0');
			const result = solve(eq);

			expect(result.solutions).toHaveLength(4);
			expect(solutionsContainApprox(result.solutions, -3)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
		});

		it('should solve x⁴ - 4x³ + 6x² - 4x + 1 = 0 -> x = 1 (quadruple root)', () => {
			const eq = parseEquation('x^4 - 4x^3 + 6x^2 - 4x + 1 = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(1);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
		});

		// Les trois cas ci-dessus ont B = 0 une fois la quartique dépréciée (racines
		// symétriques autour de −b/4a) : ils passaient par le chemin bicarré et
		// cachaient une factorisation de Ferrari fausse dès que B ≠ 0.
		it('x⁴ + x³ − 7x² − x + 6 = 0 → x = −3, −1, 1, 2 (B ≠ 0)', () => {
			const result = solve(parseEquation('x^4+x^3-7x^2-x+6=0'));
			expect(result.solutions.map((s) => s.approximate)).toEqual([-3, -1, 1, 2]);
		});

		it('5x⁴ + 16x³ + 3x² − 20x − 4 = 0 → x = −2 (double), −1/5, 1', () => {
			const result = solve(parseEquation('5x^4+16x^3+3x^2-20x-4=0'));
			expect(result.solutions.map((s) => toLatex(s.value))).toEqual(['-2', '-\\dfrac{1}{5}', '1']);
		});

		it('3x⁴ − 11x³ − 2x² + 44x − 40 = 0 → x = −2, 5/3, 2 (2 double)', () => {
			const result = solve(parseEquation('3x^4-11x^3-2x^2+44x-40=0'));
			expect(result.solutions.map((s) => toLatex(s.value))).toEqual(['-2', '\\dfrac{5}{3}', '2']);
		});

		it('200 quartiques tirées (graine fixe) : solve rend leurs racines réelles', () => {
			const wrong: string[] = [];
			for (const { coefficients, roots } of quarticsWithKnownRoots(200)) {
				const [a, b, c, d, e] = coefficients;
				const latex = `${a}x^4+${b}x^3+${c}x^2+${d}x+${e}=0`.replace(/\+-/g, '-');
				const found = solve(parseEquation(latex))
					.solutions.map((s) => Math.round((s.approximate ?? Number.NaN) * 1e5) / 1e5)
					.sort((p, q) => p - q);
				if (JSON.stringify(found) !== JSON.stringify(roots)) {
					wrong.push(`${latex} : ${found.join(' ; ')} au lieu de ${roots.join(' ; ')}`);
				}
			}
			expect(wrong).toEqual([]);
		});

		it('should solve x⁴ - 10x² + 9 = 0 -> x = ±1, ±3 (also biquadratic)', () => {
			const eq = parseEquation('x^4 - 10x^2 + 9 = 0');
			const result = solve(eq);

			expect(result.solutions).toHaveLength(4);
			expect(solutionsContainApprox(result.solutions, -3)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 3)).toBe(true);
		});
	});

	describe('Pure power (x⁴ = k)', () => {
		it('should still solve x⁴ = 16 -> x = ±2', () => {
			const eq = parseEquation('x^4 = 16');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);
			const values = result.solutions.map((s) => toLatex(s.value)).sort();
			expect(values).toContain('-2');
			expect(values).toContain('2');
		});

		it('should still solve x⁴ = 0 -> x = 0', () => {
			const eq = parseEquation('x^4 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('0');
		});
	});

	describe('Variable auto-detection', () => {
		it('should auto-detect variable y', () => {
			const eq = parseEquation('y^4 - 5y^2 + 4 = 0');
			const result = solve(eq);

			expect(result.variable).toBe('y');
			expect(result.solutions).toHaveLength(4);
		});

		it('should auto-detect variable t', () => {
			const eq = parseEquation('t^4 - t = 0');
			const result = solve(eq);

			expect(result.variable).toBe('t');
			expect(result.solutions.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('Negative leading coefficient', () => {
		it('should solve -x⁴ + 5x² - 4 = 0 -> x = ±1, ±2', () => {
			const eq = parseEquation('-x^4 + 5x^2 - 4 = 0');
			const result = solve(eq);

			expect(result.solutions).toHaveLength(4);
			expect(solutionsContainApprox(result.solutions, -2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
		});
	});

	describe('Pedagogical steps', () => {
		it('should include identification step in detailed mode', () => {
			const eq = parseEquation('x^4 - 5x^2 + 4 = 0');
			const result = solve(eq, { verbosity: 'detailed' });

			expect(result.steps.length).toBeGreaterThan(0);
			const hasQuarticStep = result.steps.some(
				(s) => s.rule === 'identify-quartic' || s.rule === 'identify-biquadratic'
			);
			expect(hasQuarticStep).toBe(true);
		});

		it('should have fewer steps in summarized mode', () => {
			const eq = parseEquation('x^4 - 5x^2 + 4 = 0');
			const detailed = solve(eq, { verbosity: 'detailed' });
			const summarized = solve(eq, { verbosity: 'summarized' });

			expect(summarized.steps.length).toBeLessThanOrEqual(detailed.steps.length);
		});
	});
});

/** Générateur pseudo-aléatoire à graine fixe (LCG de Numerical Recipes). */
function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

/**
 * Quartiques à racines connues (entiers et demis de [−5 ; 5]) : quatre
 * simples, une double et deux simples, deux doubles, une double et un facteur
 * x² + 1 sans racine réelle. Coefficients développés, coefficient dominant ≠ 1.
 */
function quarticsWithKnownRoots(count: number): { coefficients: number[]; roots: number[] }[] {
	const random = seededRandom(20261019);
	const pick = () => Math.round(random() * 20 - 10) / 2;
	const cases: { coefficients: number[]; roots: number[] }[] = [];
	while (cases.length < count) {
		const shape = cases.length % 4;
		const [r1, r2, r3, r4] = [pick(), pick(), pick(), pick()];
		const factors: number[][] =
			shape === 0
				? [
						[1, -r1],
						[1, -r2],
						[1, -r3],
						[1, -r4]
					]
				: shape === 1
					? [
							[1, -r1],
							[1, -r1],
							[1, -r2],
							[1, -r3]
						]
					: shape === 2
						? [
								[1, -r1],
								[1, -r1],
								[1, -r2],
								[1, -r2]
							]
						: [
								[1, -r1],
								[1, -r1],
								[1, 0, 1]
							];
		const lead = [2, 3, -2, 4][Math.floor(cases.length / 4) % 4];
		const coefficients = factors.reduce(
			(acc, f) => {
				const out: number[] = Array.from({ length: acc.length + f.length - 1 }, () => 0);
				acc.forEach((a, i) => f.forEach((b, j) => (out[i + j] += a * b)));
				return out;
			},
			[lead]
		);
		const real =
			shape === 3 ? [r1] : shape === 2 ? [r1, r2] : shape === 1 ? [r1, r2, r3] : [r1, r2, r3, r4];
		cases.push({ coefficients, roots: [...new Set(real)].sort((a, b) => a - b) });
	}
	return cases;
}
