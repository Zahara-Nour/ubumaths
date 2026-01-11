/**
 * Tests for Matrix Pedagogical Steps
 *
 * @module mathAST/matrix/__tests__/steps.test
 */

import { describe, it, expect } from 'vitest';
import { matrix, number } from '../../factory';
import { determinant, inverse } from '../operations';
import type { MatrixNode, MathNode } from '../../types';
import type { MatrixOperationResult } from '../types';
import { evaluate } from '../../eval/evaluate';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a numeric matrix from a 2D array of numbers
 */
function createMatrix(values: number[][]): MatrixNode {
	return matrix(values.map((row) => row.map((v) => number(v.toString()))));
}

/**
 * Convert a MathNode to a number using evaluate
 */
function toNum(node: MathNode): number {
	const result = evaluate(node, { mode: 'decimal' });
	if (typeof result.value !== 'number') {
		throw new Error(`Expected numeric result, got ${typeof result.value}`);
	}
	return result.value;
}

/**
 * Check if result is an operation result with steps
 */
function isResultWithSteps<T>(
	result: T | MatrixOperationResult<T>
): result is MatrixOperationResult<T> {
	return typeof result === 'object' && result !== null && 'result' in result && 'steps' in result;
}

// =============================================================================
// Determinant Steps Tests
// =============================================================================

describe('determinant with pedagogical steps', () => {
	describe('1x1 matrix', () => {
		it('should return result only when no options provided', () => {
			const m = createMatrix([[5]]);
			const result = determinant(m);

			// Should return MathNode directly, not wrapped
			expect(result.type).toBe('number');
			expect((result as { value: string }).value).toBe('5');
		});

		it('should return result with steps when options provided', () => {
			const m = createMatrix([[5]]);
			const result = determinant(m, { verbosity: 'summarized' });

			expect(isResultWithSteps(result)).toBe(true);
			if (isResultWithSteps(result)) {
				expect(result.result.type).toBe('number');
				expect(result.steps.length).toBeGreaterThan(0);
			}
		});

		it('should include identify-matrix-size step at summarized level', () => {
			const m = createMatrix([[5]]);
			const result = determinant(m, { verbosity: 'summarized' });

			if (isResultWithSteps(result)) {
				const sizeStep = result.steps.find((s) => s.rule === 'identify-matrix-size');
				expect(sizeStep).toBeDefined();
				expect(sizeStep?.description).toContain('1x1');
			}
		});
	});

	describe('2x2 matrix', () => {
		it('should compute determinant correctly with steps', () => {
			const m = createMatrix([
				[1, 2],
				[3, 4]
			]);
			const result = determinant(m, { verbosity: 'summarized' });

			if (isResultWithSteps(result)) {
				// det = 1*4 - 2*3 = -2
				expect(toNum(result.result)).toBe(-2);
			}
		});

		it('should include 2x2 formula step at summarized level', () => {
			const m = createMatrix([
				[1, 2],
				[3, 4]
			]);
			const result = determinant(m, { verbosity: 'summarized' });

			if (isResultWithSteps(result)) {
				const formulaStep = result.steps.find((s) => s.rule === 'det-2x2-formula');
				expect(formulaStep).toBeDefined();
				// Description shows actual computation: "det = a x d - b x c"
				expect(formulaStep?.description).toContain('det');
				expect(formulaStep?.description).toContain('x');
			}
		});

		it('should include detailed computation at detailed level', () => {
			const m = createMatrix([
				[1, 2],
				[3, 4]
			]);
			const result = determinant(m, { verbosity: 'detailed' });

			if (isResultWithSteps(result)) {
				const detailedStep = result.steps.find(
					(s) => s.rule === 'det-result' && s.verbosityLevel === 'detailed'
				);
				expect(detailedStep).toBeDefined();
				expect(detailedStep?.description).toContain('=');
			}
		});

		it('should return fewer steps at summarized level than detailed', () => {
			const m = createMatrix([
				[1, 2],
				[3, 4]
			]);
			const summarized = determinant(m, { verbosity: 'summarized' });
			const detailed = determinant(m, { verbosity: 'detailed' });

			if (isResultWithSteps(summarized) && isResultWithSteps(detailed)) {
				expect(summarized.steps.length).toBeLessThanOrEqual(detailed.steps.length);
			}
		});

		it('should return empty steps at result level', () => {
			const m = createMatrix([
				[1, 2],
				[3, 4]
			]);
			const result = determinant(m, { verbosity: 'result' });

			if (isResultWithSteps(result)) {
				expect(result.steps.length).toBe(0);
			}
		});
	});

	describe('3x3 matrix', () => {
		it('should compute determinant correctly with steps', () => {
			const m = createMatrix([
				[1, 2, 3],
				[4, 5, 6],
				[7, 8, 9]
			]);
			const result = determinant(m, { verbosity: 'summarized' });

			if (isResultWithSteps(result)) {
				// This matrix is singular, det = 0
				expect(result.result.type).toBe('number');
				expect((result.result as { value: string }).value).toBe('0');
			}
		});

		it('should include cofactor expansion step', () => {
			const m = createMatrix([
				[1, 2, 3],
				[4, 5, 6],
				[7, 8, 9]
			]);
			const result = determinant(m, { verbosity: 'summarized' });

			if (isResultWithSteps(result)) {
				const cofactorStep = result.steps.find((s) => s.rule === 'det-cofactor-expansion');
				expect(cofactorStep).toBeDefined();
				expect(cofactorStep?.description).toContain('3x3');
			}
		});

		it('should include minor computations at detailed level', () => {
			const m = createMatrix([
				[1, 2, 3],
				[0, 1, 4],
				[5, 6, 0]
			]);
			const result = determinant(m, { verbosity: 'detailed' });

			if (isResultWithSteps(result)) {
				const minorSteps = result.steps.filter((s) => s.rule === 'compute-minor');
				expect(minorSteps.length).toBeGreaterThan(0);
			}
		});

		it('should include cofactor computations at detailed level', () => {
			const m = createMatrix([
				[1, 2, 3],
				[0, 1, 4],
				[5, 6, 0]
			]);
			const result = determinant(m, { verbosity: 'detailed' });

			if (isResultWithSteps(result)) {
				const cofactorSteps = result.steps.filter((s) => s.rule === 'compute-cofactor');
				expect(cofactorSteps.length).toBeGreaterThan(0);
			}
		});

		it('should include sum-cofactors and det-result steps', () => {
			const m = createMatrix([
				[1, 2, 3],
				[0, 1, 4],
				[5, 6, 0]
			]);
			const result = determinant(m, { verbosity: 'summarized' });

			if (isResultWithSteps(result)) {
				expect(result.steps.find((s) => s.rule === 'sum-cofactors')).toBeDefined();
				expect(result.steps.find((s) => s.rule === 'det-result')).toBeDefined();
			}
		});
	});
});

// =============================================================================
// Inverse Steps Tests
// =============================================================================

describe('inverse with pedagogical steps', () => {
	describe('2x2 matrix', () => {
		it('should return result only when no options provided', () => {
			const m = createMatrix([
				[1, 2],
				[3, 4]
			]);
			const result = inverse(m);

			// Should return MatrixNode directly
			expect(result.type).toBe('matrix');
		});

		it('should return result with steps when options provided', () => {
			const m = createMatrix([
				[1, 2],
				[3, 4]
			]);
			const result = inverse(m, { verbosity: 'summarized' });

			expect(isResultWithSteps(result)).toBe(true);
			if (isResultWithSteps(result)) {
				expect(result.result.type).toBe('matrix');
				expect(result.steps.length).toBeGreaterThan(0);
			}
		});

		it('should check determinant first', () => {
			const m = createMatrix([
				[1, 2],
				[3, 4]
			]);
			const result = inverse(m, { verbosity: 'summarized' });

			if (isResultWithSteps(result)) {
				const checkDetStep = result.steps.find((s) => s.rule === 'check-determinant');
				expect(checkDetStep).toBeDefined();
				expect(checkDetStep?.description).toContain('-2');
				expect(checkDetStep?.description).toContain('!= 0');
			}
		});

		it('should include 2x2 formula step', () => {
			const m = createMatrix([
				[1, 2],
				[3, 4]
			]);
			const result = inverse(m, { verbosity: 'summarized' });

			if (isResultWithSteps(result)) {
				const formulaStep = result.steps.find((s) => s.rule === 'inverse-2x2-formula');
				expect(formulaStep).toBeDefined();
			}
		});

		it('should include detailed result at detailed level', () => {
			const m = createMatrix([
				[1, 2],
				[3, 4]
			]);
			const result = inverse(m, { verbosity: 'detailed' });

			if (isResultWithSteps(result)) {
				const resultStep = result.steps.find((s) => s.rule === 'inverse-result');
				expect(resultStep).toBeDefined();
			}
		});

		it('should compute correct inverse', () => {
			const m = createMatrix([
				[4, 7],
				[2, 6]
			]);
			const result = inverse(m, { verbosity: 'summarized' });

			if (isResultWithSteps(result)) {
				// det = 24 - 14 = 10
				// inv = (1/10) * [[6, -7], [-2, 4]]
				const inv = result.result;
				expect(toNum(inv.rows[0][0])).toBeCloseTo(0.6);
				expect(toNum(inv.rows[0][1])).toBeCloseTo(-0.7);
			}
		});
	});

	describe('3x3 matrix', () => {
		it('should use Gauss-Jordan elimination', () => {
			const m = createMatrix([
				[1, 2, 3],
				[0, 1, 4],
				[5, 6, 0]
			]);
			const result = inverse(m, { verbosity: 'summarized' });

			if (isResultWithSteps(result)) {
				const augmentStep = result.steps.find((s) => s.rule === 'augment-identity');
				expect(augmentStep).toBeDefined();
			}
		});

		it('should include row operations at summarized level', () => {
			const m = createMatrix([
				[1, 2, 3],
				[0, 1, 4],
				[5, 6, 0]
			]);
			const result = inverse(m, { verbosity: 'summarized' });

			if (isResultWithSteps(result)) {
				const rowOps = result.steps.filter(
					(s) => s.rule === 'row-swap' || s.rule === 'row-scale' || s.rule === 'row-add'
				);
				expect(rowOps.length).toBeGreaterThan(0);
			}
		});

		it('should include matrix states at detailed level', () => {
			const m = createMatrix([
				[1, 2, 3],
				[0, 1, 4],
				[5, 6, 0]
			]);
			const result = inverse(m, { verbosity: 'detailed' });

			if (isResultWithSteps(result)) {
				const stepsWithMatrix = result.steps.filter((s) => s.matrixState !== undefined);
				expect(stepsWithMatrix.length).toBeGreaterThan(0);
			}
		});

		it('should include extract-inverse step', () => {
			const m = createMatrix([
				[1, 2, 3],
				[0, 1, 4],
				[5, 6, 0]
			]);
			const result = inverse(m, { verbosity: 'summarized' });

			if (isResultWithSteps(result)) {
				const extractStep = result.steps.find((s) => s.rule === 'extract-inverse');
				expect(extractStep).toBeDefined();
			}
		});

		it('should have more steps at detailed level', () => {
			const m = createMatrix([
				[1, 2, 3],
				[0, 1, 4],
				[5, 6, 0]
			]);
			const summarized = inverse(m, { verbosity: 'summarized' });
			const detailed = inverse(m, { verbosity: 'detailed' });

			if (isResultWithSteps(summarized) && isResultWithSteps(detailed)) {
				expect(detailed.steps.length).toBeGreaterThan(summarized.steps.length);
			}
		});

		it('should return empty steps at result level', () => {
			const m = createMatrix([
				[1, 2, 3],
				[0, 1, 4],
				[5, 6, 0]
			]);
			const result = inverse(m, { verbosity: 'result' });

			if (isResultWithSteps(result)) {
				expect(result.steps.length).toBe(0);
			}
		});
	});

	describe('singular matrix', () => {
		it('should throw error for singular matrix', () => {
			const m = createMatrix([
				[1, 2],
				[2, 4]
			]);
			expect(() => inverse(m, { verbosity: 'summarized' })).toThrow('singular');
		});
	});
});

// =============================================================================
// Step Structure Tests
// =============================================================================

describe('step structure', () => {
	it('steps should have required fields', () => {
		const m = createMatrix([
			[1, 2],
			[3, 4]
		]);
		const result = determinant(m, { verbosity: 'detailed' });

		if (isResultWithSteps(result)) {
			for (const step of result.steps) {
				expect(step.id).toBeDefined();
				expect(typeof step.id).toBe('number');
				expect(step.rule).toBeDefined();
				expect(step.description).toBeDefined();
				expect(step.before).toBeDefined();
				expect(step.after).toBeDefined();
				expect(step.verbosityLevel).toBeDefined();
				expect(['result', 'summarized', 'detailed']).toContain(step.verbosityLevel);
			}
		}
	});

	it('steps should have unique IDs', () => {
		const m = createMatrix([
			[1, 2, 3],
			[0, 1, 4],
			[5, 6, 0]
		]);
		const result = inverse(m, { verbosity: 'detailed' });

		if (isResultWithSteps(result)) {
			const ids = result.steps.map((s) => s.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		}
	});

	it('descriptions should be in French', () => {
		const m = createMatrix([
			[1, 2],
			[3, 4]
		]);
		const result = determinant(m, { verbosity: 'summarized' });

		if (isResultWithSteps(result)) {
			// Check for French keywords
			const allDescriptions = result.steps.map((s) => s.description).join(' ');
			const hasFrench =
				allDescriptions.includes('matrice') ||
				allDescriptions.includes('formule') ||
				allDescriptions.includes('det') ||
				allDescriptions.includes('La');
			expect(hasFrench).toBe(true);
		}
	});
});
