/**
 * TDD Tests for Matrix Factory Functions
 *
 * Phase 1: Types and Factory - Test-Driven Development
 */

import { describe, it, expect } from 'vitest';
import {
	number,
	variable,
	matrix,
	rowVector,
	columnVector,
	identityMatrix,
	zeroMatrix
} from '../../factory';

describe('Matrix Factory', () => {
	// =============================================================================
	// Matrix Creation
	// =============================================================================

	describe('matrix', () => {
		it('creates a 2x2 matrix with correct type and rows', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const n4 = number('4');
			const node = matrix([
				[n1, n2],
				[n3, n4]
			]);

			expect(node.type).toBe('matrix');
			expect(node.rows).toHaveLength(2);
			expect(node.rows[0]).toHaveLength(2);
			expect(node.rows[1]).toHaveLength(2);
			expect(node.rows[0][0]).toBe(n1);
			expect(node.rows[0][1]).toBe(n2);
			expect(node.rows[1][0]).toBe(n3);
			expect(node.rows[1][1]).toBe(n4);
		});

		it('creates a 1x1 matrix', () => {
			const n1 = number('5');
			const node = matrix([[n1]]);

			expect(node.type).toBe('matrix');
			expect(node.rows).toHaveLength(1);
			expect(node.rows[0]).toHaveLength(1);
			expect(node.rows[0][0]).toBe(n1);
		});

		it('creates a 3x2 matrix (3 rows, 2 columns)', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const n4 = number('4');
			const n5 = number('5');
			const n6 = number('6');
			const node = matrix([
				[n1, n2],
				[n3, n4],
				[n5, n6]
			]);

			expect(node.rows).toHaveLength(3);
			expect(node.rows[0]).toHaveLength(2);
			expect(node.rows[1]).toHaveLength(2);
			expect(node.rows[2]).toHaveLength(2);
		});

		it('defaults to pmatrix type', () => {
			const n1 = number('1');
			const node = matrix([[n1]]);

			expect(node.matrixType).toBe('pmatrix');
		});

		it('accepts matrixType option', () => {
			const n1 = number('1');
			const node = matrix([[n1]], { matrixType: 'bmatrix' });

			expect(node.matrixType).toBe('bmatrix');
		});

		it('accepts all matrixType variants', () => {
			const n1 = number('1');
			expect(matrix([[n1]], { matrixType: 'plain' }).matrixType).toBe('plain');
			expect(matrix([[n1]], { matrixType: 'pmatrix' }).matrixType).toBe('pmatrix');
			expect(matrix([[n1]], { matrixType: 'bmatrix' }).matrixType).toBe('bmatrix');
			expect(matrix([[n1]], { matrixType: 'Bmatrix' }).matrixType).toBe('Bmatrix');
			expect(matrix([[n1]], { matrixType: 'vmatrix' }).matrixType).toBe('vmatrix');
			expect(matrix([[n1]], { matrixType: 'Vmatrix' }).matrixType).toBe('Vmatrix');
			expect(matrix([[n1]], { matrixType: 'smallmatrix' }).matrixType).toBe('smallmatrix');
		});

		it('includes metadata when provided', () => {
			const n1 = number('1');
			const node = matrix([[n1]], { metadata: { color: 'red' } });

			expect(node.metadata?.color).toBe('red');
		});

		it('throws error for empty matrix (0 rows)', () => {
			expect(() => matrix([])).toThrow();
		});

		it('throws error for empty row', () => {
			expect(() => matrix([[]])).toThrow();
		});

		it('throws error for rows with different lengths', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			expect(() => matrix([[n1, n2], [n3]])).toThrow();
		});

		it('supports matrix with variable elements', () => {
			const a = variable('a');
			const b = variable('b');
			const c = variable('c');
			const d = variable('d');
			const node = matrix([
				[a, b],
				[c, d]
			]);

			expect(node.type).toBe('matrix');
			expect(node.rows[0][0]).toBe(a);
		});
	});

	// =============================================================================
	// Row Vector
	// =============================================================================

	describe('rowVector', () => {
		it('creates a 1xN matrix (row vector)', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const node = rowVector([n1, n2, n3]);

			expect(node.type).toBe('matrix');
			expect(node.rows).toHaveLength(1);
			expect(node.rows[0]).toHaveLength(3);
			expect(node.rows[0][0]).toBe(n1);
			expect(node.rows[0][1]).toBe(n2);
			expect(node.rows[0][2]).toBe(n3);
		});

		it('defaults to pmatrix type', () => {
			const n1 = number('1');
			const node = rowVector([n1]);

			expect(node.matrixType).toBe('pmatrix');
		});

		it('accepts matrixType option', () => {
			const n1 = number('1');
			const node = rowVector([n1], { matrixType: 'bmatrix' });

			expect(node.matrixType).toBe('bmatrix');
		});

		it('throws error for empty elements', () => {
			expect(() => rowVector([])).toThrow();
		});
	});

	// =============================================================================
	// Column Vector
	// =============================================================================

	describe('columnVector', () => {
		it('creates an Nx1 matrix (column vector)', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const node = columnVector([n1, n2, n3]);

			expect(node.type).toBe('matrix');
			expect(node.rows).toHaveLength(3);
			expect(node.rows[0]).toHaveLength(1);
			expect(node.rows[1]).toHaveLength(1);
			expect(node.rows[2]).toHaveLength(1);
			expect(node.rows[0][0]).toBe(n1);
			expect(node.rows[1][0]).toBe(n2);
			expect(node.rows[2][0]).toBe(n3);
		});

		it('defaults to pmatrix type', () => {
			const n1 = number('1');
			const node = columnVector([n1]);

			expect(node.matrixType).toBe('pmatrix');
		});

		it('accepts matrixType option', () => {
			const n1 = number('1');
			const node = columnVector([n1], { matrixType: 'bmatrix' });

			expect(node.matrixType).toBe('bmatrix');
		});

		it('throws error for empty elements', () => {
			expect(() => columnVector([])).toThrow();
		});
	});

	// =============================================================================
	// Identity Matrix
	// =============================================================================

	describe('identityMatrix', () => {
		it('creates a 3x3 identity matrix', () => {
			const node = identityMatrix(3);

			expect(node.type).toBe('matrix');
			expect(node.rows).toHaveLength(3);
			expect(node.rows[0]).toHaveLength(3);
			// Diagonal elements should be 1
			expect(node.rows[0][0]).toEqual(expect.objectContaining({ type: 'number', value: '1' }));
			expect(node.rows[1][1]).toEqual(expect.objectContaining({ type: 'number', value: '1' }));
			expect(node.rows[2][2]).toEqual(expect.objectContaining({ type: 'number', value: '1' }));
			// Off-diagonal elements should be 0
			expect(node.rows[0][1]).toEqual(expect.objectContaining({ type: 'number', value: '0' }));
			expect(node.rows[0][2]).toEqual(expect.objectContaining({ type: 'number', value: '0' }));
			expect(node.rows[1][0]).toEqual(expect.objectContaining({ type: 'number', value: '0' }));
		});

		it('creates a 1x1 identity matrix', () => {
			const node = identityMatrix(1);

			expect(node.rows).toHaveLength(1);
			expect(node.rows[0]).toHaveLength(1);
			expect(node.rows[0][0]).toEqual(expect.objectContaining({ type: 'number', value: '1' }));
		});

		it('creates a 2x2 identity matrix', () => {
			const node = identityMatrix(2);

			expect(node.rows).toHaveLength(2);
			expect(node.rows[0][0]).toEqual(expect.objectContaining({ type: 'number', value: '1' }));
			expect(node.rows[0][1]).toEqual(expect.objectContaining({ type: 'number', value: '0' }));
			expect(node.rows[1][0]).toEqual(expect.objectContaining({ type: 'number', value: '0' }));
			expect(node.rows[1][1]).toEqual(expect.objectContaining({ type: 'number', value: '1' }));
		});

		it('defaults to pmatrix type', () => {
			const node = identityMatrix(2);

			expect(node.matrixType).toBe('pmatrix');
		});

		it('accepts matrixType option', () => {
			const node = identityMatrix(2, { matrixType: 'bmatrix' });

			expect(node.matrixType).toBe('bmatrix');
		});

		it('throws error for size <= 0', () => {
			expect(() => identityMatrix(0)).toThrow();
			expect(() => identityMatrix(-1)).toThrow();
		});

		it('throws error for size > 5 in v1', () => {
			expect(() => identityMatrix(6)).toThrow();
		});
	});

	// =============================================================================
	// Zero Matrix
	// =============================================================================

	describe('zeroMatrix', () => {
		it('creates a 2x3 zero matrix', () => {
			const node = zeroMatrix(2, 3);

			expect(node.type).toBe('matrix');
			expect(node.rows).toHaveLength(2);
			expect(node.rows[0]).toHaveLength(3);
			expect(node.rows[1]).toHaveLength(3);
			// All elements should be 0
			for (const row of node.rows) {
				for (const elem of row) {
					expect(elem).toEqual(expect.objectContaining({ type: 'number', value: '0' }));
				}
			}
		});

		it('creates a square zero matrix with single argument', () => {
			const node = zeroMatrix(3);

			expect(node.rows).toHaveLength(3);
			expect(node.rows[0]).toHaveLength(3);
		});

		it('defaults to pmatrix type', () => {
			const node = zeroMatrix(2, 2);

			expect(node.matrixType).toBe('pmatrix');
		});

		it('accepts matrixType option', () => {
			const node = zeroMatrix(2, 2, { matrixType: 'bmatrix' });

			expect(node.matrixType).toBe('bmatrix');
		});

		it('throws error for rows <= 0', () => {
			expect(() => zeroMatrix(0, 2)).toThrow();
			expect(() => zeroMatrix(-1, 2)).toThrow();
		});

		it('throws error for cols <= 0', () => {
			expect(() => zeroMatrix(2, 0)).toThrow();
			expect(() => zeroMatrix(2, -1)).toThrow();
		});

		it('throws error for size > 5 in v1', () => {
			expect(() => zeroMatrix(6, 3)).toThrow();
			expect(() => zeroMatrix(3, 6)).toThrow();
		});
	});
});
