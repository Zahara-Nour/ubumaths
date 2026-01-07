/**
 * TDD Tests for Matrix Type Guards
 *
 * Phase 1: Types and Factory - Test-Driven Development
 */

import { describe, it, expect } from 'vitest';
import {
	number,
	variable,
	add,
	matrix,
	rowVector,
	columnVector,
	identityMatrix
} from '../../factory';
import { isMatrix, isRowVector, isColumnVector, isSquareMatrix } from '../../guards';

describe('Matrix Guards', () => {
	// =============================================================================
	// isMatrix
	// =============================================================================

	describe('isMatrix', () => {
		it('returns true for matrix node', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const n4 = number('4');
			const node = matrix([
				[n1, n2],
				[n3, n4]
			]);

			expect(isMatrix(node)).toBe(true);
		});

		it('returns true for 1x1 matrix', () => {
			const n1 = number('1');
			const node = matrix([[n1]]);

			expect(isMatrix(node)).toBe(true);
		});

		it('returns true for row vector', () => {
			const n1 = number('1');
			const n2 = number('2');
			const node = rowVector([n1, n2]);

			expect(isMatrix(node)).toBe(true);
		});

		it('returns true for column vector', () => {
			const n1 = number('1');
			const n2 = number('2');
			const node = columnVector([n1, n2]);

			expect(isMatrix(node)).toBe(true);
		});

		it('returns true for identity matrix', () => {
			const node = identityMatrix(3);

			expect(isMatrix(node)).toBe(true);
		});

		it('returns false for number node', () => {
			const node = number('42');
			expect(isMatrix(node)).toBe(false);
		});

		it('returns false for variable node', () => {
			const node = variable('x');
			expect(isMatrix(node)).toBe(false);
		});

		it('returns false for addition node', () => {
			const node = add(number('1'), number('2'));
			expect(isMatrix(node)).toBe(false);
		});
	});

	// =============================================================================
	// isRowVector
	// =============================================================================

	describe('isRowVector', () => {
		it('returns true for 1xN matrix', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const node = rowVector([n1, n2, n3]);

			expect(isRowVector(node)).toBe(true);
		});

		it('returns true for 1x1 matrix', () => {
			const n1 = number('1');
			const node = matrix([[n1]]);

			expect(isRowVector(node)).toBe(true);
		});

		it('returns false for column vector', () => {
			const n1 = number('1');
			const n2 = number('2');
			const node = columnVector([n1, n2]);

			expect(isRowVector(node)).toBe(false);
		});

		it('returns false for 2x2 matrix', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const n4 = number('4');
			const node = matrix([
				[n1, n2],
				[n3, n4]
			]);

			expect(isRowVector(node)).toBe(false);
		});

		it('returns false for non-matrix nodes', () => {
			const node = number('42');
			expect(isRowVector(node)).toBe(false);
		});
	});

	// =============================================================================
	// isColumnVector
	// =============================================================================

	describe('isColumnVector', () => {
		it('returns true for Nx1 matrix', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const node = columnVector([n1, n2, n3]);

			expect(isColumnVector(node)).toBe(true);
		});

		it('returns true for 1x1 matrix', () => {
			const n1 = number('1');
			const node = matrix([[n1]]);

			expect(isColumnVector(node)).toBe(true);
		});

		it('returns false for row vector', () => {
			const n1 = number('1');
			const n2 = number('2');
			const node = rowVector([n1, n2]);

			expect(isColumnVector(node)).toBe(false);
		});

		it('returns false for 2x2 matrix', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const n4 = number('4');
			const node = matrix([
				[n1, n2],
				[n3, n4]
			]);

			expect(isColumnVector(node)).toBe(false);
		});

		it('returns false for non-matrix nodes', () => {
			const node = number('42');
			expect(isColumnVector(node)).toBe(false);
		});
	});

	// =============================================================================
	// isSquareMatrix
	// =============================================================================

	describe('isSquareMatrix', () => {
		it('returns true for 2x2 matrix', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const n4 = number('4');
			const node = matrix([
				[n1, n2],
				[n3, n4]
			]);

			expect(isSquareMatrix(node)).toBe(true);
		});

		it('returns true for 3x3 matrix', () => {
			const node = identityMatrix(3);

			expect(isSquareMatrix(node)).toBe(true);
		});

		it('returns true for 1x1 matrix', () => {
			const n1 = number('1');
			const node = matrix([[n1]]);

			expect(isSquareMatrix(node)).toBe(true);
		});

		it('returns false for 2x3 matrix', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const n4 = number('4');
			const n5 = number('5');
			const n6 = number('6');
			const node = matrix([
				[n1, n2, n3],
				[n4, n5, n6]
			]);

			expect(isSquareMatrix(node)).toBe(false);
		});

		it('returns false for row vector (1xN where N > 1)', () => {
			const n1 = number('1');
			const n2 = number('2');
			const node = rowVector([n1, n2]);

			expect(isSquareMatrix(node)).toBe(false);
		});

		it('returns false for column vector (Nx1 where N > 1)', () => {
			const n1 = number('1');
			const n2 = number('2');
			const node = columnVector([n1, n2]);

			expect(isSquareMatrix(node)).toBe(false);
		});

		it('returns false for non-matrix nodes', () => {
			const node = number('42');
			expect(isSquareMatrix(node)).toBe(false);
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('guards work with different matrixTypes', () => {
			const n1 = number('1');
			const pmatrixNode = matrix([[n1]], { matrixType: 'pmatrix' });
			const bmatrixNode = matrix([[n1]], { matrixType: 'bmatrix' });
			const vmatrixNode = matrix([[n1]], { matrixType: 'vmatrix' });

			expect(isMatrix(pmatrixNode)).toBe(true);
			expect(isMatrix(bmatrixNode)).toBe(true);
			expect(isMatrix(vmatrixNode)).toBe(true);
		});

		it('guards work with metadata', () => {
			const n1 = number('1');
			const node = matrix([[n1]], { metadata: { color: 'red' } });

			expect(isMatrix(node)).toBe(true);
		});

		it('1x1 is both row vector and column vector', () => {
			const n1 = number('1');
			const node = matrix([[n1]]);

			expect(isRowVector(node)).toBe(true);
			expect(isColumnVector(node)).toBe(true);
			expect(isSquareMatrix(node)).toBe(true);
		});
	});
});
