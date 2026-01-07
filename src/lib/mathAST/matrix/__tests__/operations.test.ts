/**
 * Matrix Operations Tests
 *
 * Phase 5: TDD tests for matrix operations with pedagogical steps
 */

import { describe, it, expect } from 'vitest';
import { matrix, number } from '../../factory';
import type { MatrixNode, NumberNode } from '../../types';
import {
	getDimensions,
	matrixAdd,
	matrixSubtract,
	scalarMultiply,
	matrixMultiply,
	transpose,
	trace,
	determinant,
	inverse
} from '../operations';
import { MatrixDimensionError, MatrixOperationError } from '../types';

// Helper to create a numeric matrix
function numMatrix(rows: number[][]): MatrixNode {
	return matrix(
		rows.map((row) => row.map((n) => number(n.toString()))),
		{ matrixType: 'pmatrix' }
	);
}

// Helper to extract numeric values from a matrix node
function extractValues(m: MatrixNode): number[][] {
	return m.rows.map((row) =>
		row.map((node) => {
			if (node.type === 'number') {
				return parseFloat(node.value);
			}
			throw new Error(`Expected number, got ${node.type}`);
		})
	);
}

describe('Matrix Dimensions', () => {
	it('returns dimensions for 2x2 matrix', () => {
		const m = numMatrix([
			[1, 2],
			[3, 4]
		]);
		expect(getDimensions(m)).toEqual({ rows: 2, cols: 2 });
	});

	it('returns dimensions for 3x2 matrix', () => {
		const m = numMatrix([
			[1, 2],
			[3, 4],
			[5, 6]
		]);
		expect(getDimensions(m)).toEqual({ rows: 3, cols: 2 });
	});

	it('returns dimensions for row vector', () => {
		const m = numMatrix([[1, 2, 3]]);
		expect(getDimensions(m)).toEqual({ rows: 1, cols: 3 });
	});

	it('returns dimensions for column vector', () => {
		const m = numMatrix([[1], [2], [3]]);
		expect(getDimensions(m)).toEqual({ rows: 3, cols: 1 });
	});
});

describe('Matrix Addition', () => {
	it('adds two 2x2 matrices', () => {
		const a = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const b = numMatrix([
			[5, 6],
			[7, 8]
		]);
		const result = matrixAdd(a, b);
		expect(extractValues(result)).toEqual([
			[6, 8],
			[10, 12]
		]);
	});

	it('adds 3x3 matrices', () => {
		const a = numMatrix([
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, 1]
		]);
		const b = numMatrix([
			[1, 1, 1],
			[1, 1, 1],
			[1, 1, 1]
		]);
		const result = matrixAdd(a, b);
		expect(extractValues(result)).toEqual([
			[2, 1, 1],
			[1, 2, 1],
			[1, 1, 2]
		]);
	});

	it('throws on dimension mismatch', () => {
		const a = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const b = numMatrix([[1, 2, 3]]);
		expect(() => matrixAdd(a, b)).toThrow(MatrixDimensionError);
	});
});

describe('Matrix Subtraction', () => {
	it('subtracts two 2x2 matrices', () => {
		const a = numMatrix([
			[5, 6],
			[7, 8]
		]);
		const b = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const result = matrixSubtract(a, b);
		expect(extractValues(result)).toEqual([
			[4, 4],
			[4, 4]
		]);
	});

	it('throws on dimension mismatch', () => {
		const a = numMatrix([[1, 2]]);
		const b = numMatrix([[1], [2]]);
		expect(() => matrixSubtract(a, b)).toThrow(MatrixDimensionError);
	});
});

describe('Scalar Multiplication', () => {
	it('multiplies matrix by scalar 2', () => {
		const m = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const result = scalarMultiply(number('2'), m);
		expect(extractValues(result)).toEqual([
			[2, 4],
			[6, 8]
		]);
	});

	it('multiplies by zero', () => {
		const m = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const result = scalarMultiply(number('0'), m);
		expect(extractValues(result)).toEqual([
			[0, 0],
			[0, 0]
		]);
	});

	it('multiplies by negative', () => {
		const m = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const result = scalarMultiply(number('-1'), m);
		expect(extractValues(result)).toEqual([
			[-1, -2],
			[-3, -4]
		]);
	});
});

describe('Matrix Multiplication', () => {
	it('multiplies 2x2 matrices', () => {
		const a = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const b = numMatrix([
			[5, 6],
			[7, 8]
		]);
		const result = matrixMultiply(a, b);
		// [1*5+2*7, 1*6+2*8] = [19, 22]
		// [3*5+4*7, 3*6+4*8] = [43, 50]
		expect(extractValues(result)).toEqual([
			[19, 22],
			[43, 50]
		]);
	});

	it('multiplies 2x3 by 3x2', () => {
		const a = numMatrix([
			[1, 2, 3],
			[4, 5, 6]
		]);
		const b = numMatrix([
			[7, 8],
			[9, 10],
			[11, 12]
		]);
		const result = matrixMultiply(a, b);
		// Result should be 2x2
		// [1*7+2*9+3*11, 1*8+2*10+3*12] = [58, 64]
		// [4*7+5*9+6*11, 4*8+5*10+6*12] = [139, 154]
		expect(extractValues(result)).toEqual([
			[58, 64],
			[139, 154]
		]);
	});

	it('multiplies with identity matrix', () => {
		const a = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const identity = numMatrix([
			[1, 0],
			[0, 1]
		]);
		const result = matrixMultiply(a, identity);
		expect(extractValues(result)).toEqual([
			[1, 2],
			[3, 4]
		]);
	});

	it('throws on incompatible dimensions (2x3 * 2x2)', () => {
		const a = numMatrix([
			[1, 2, 3],
			[4, 5, 6]
		]);
		const b = numMatrix([
			[1, 2],
			[3, 4]
		]);
		expect(() => matrixMultiply(a, b)).toThrow(MatrixDimensionError);
	});
});

describe('Transpose', () => {
	it('transposes 2x2 matrix', () => {
		const m = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const result = transpose(m);
		expect(extractValues(result)).toEqual([
			[1, 3],
			[2, 4]
		]);
	});

	it('transposes 2x3 to 3x2', () => {
		const m = numMatrix([
			[1, 2, 3],
			[4, 5, 6]
		]);
		const result = transpose(m);
		expect(extractValues(result)).toEqual([
			[1, 4],
			[2, 5],
			[3, 6]
		]);
	});

	it('transposes row vector to column vector', () => {
		const m = numMatrix([[1, 2, 3]]);
		const result = transpose(m);
		expect(extractValues(result)).toEqual([[1], [2], [3]]);
	});

	it('transpose of transpose is original', () => {
		const m = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const result = transpose(transpose(m));
		expect(extractValues(result)).toEqual([
			[1, 2],
			[3, 4]
		]);
	});
});

describe('Trace', () => {
	it('computes trace of 2x2 matrix', () => {
		const m = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const result = trace(m);
		expect((result as NumberNode).value).toBe('5');
	});

	it('computes trace of 3x3 identity', () => {
		const m = numMatrix([
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, 1]
		]);
		const result = trace(m);
		expect((result as NumberNode).value).toBe('3');
	});

	it('throws on non-square matrix', () => {
		const m = numMatrix([
			[1, 2, 3],
			[4, 5, 6]
		]);
		expect(() => trace(m)).toThrow(MatrixOperationError);
	});
});

describe('Determinant', () => {
	it('computes determinant of 1x1 matrix', () => {
		const m = numMatrix([[5]]);
		const result = determinant(m);
		expect((result as NumberNode).value).toBe('5');
	});

	it('computes determinant of 2x2 matrix', () => {
		const m = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const result = determinant(m);
		// det = 1*4 - 2*3 = -2
		expect((result as NumberNode).value).toBe('-2');
	});

	it('computes determinant of identity matrix', () => {
		const m = numMatrix([
			[1, 0],
			[0, 1]
		]);
		const result = determinant(m);
		expect((result as NumberNode).value).toBe('1');
	});

	it('computes determinant of 3x3 matrix', () => {
		const m = numMatrix([
			[1, 2, 3],
			[4, 5, 6],
			[7, 8, 9]
		]);
		const result = determinant(m);
		// This matrix is singular, det = 0
		expect((result as NumberNode).value).toBe('0');
	});

	it('computes determinant of non-singular 3x3', () => {
		const m = numMatrix([
			[1, 2, 3],
			[0, 1, 4],
			[5, 6, 0]
		]);
		const result = determinant(m);
		// det = 1*(1*0-4*6) - 2*(0*0-4*5) + 3*(0*6-1*5)
		// = 1*(-24) - 2*(-20) + 3*(-5)
		// = -24 + 40 - 15 = 1
		expect((result as NumberNode).value).toBe('1');
	});

	it('throws on non-square matrix', () => {
		const m = numMatrix([
			[1, 2, 3],
			[4, 5, 6]
		]);
		expect(() => determinant(m)).toThrow(MatrixOperationError);
	});
});

describe('Inverse', () => {
	it('computes inverse of 2x2 matrix', () => {
		const m = numMatrix([
			[4, 7],
			[2, 6]
		]);
		const result = inverse(m);
		// det = 4*6 - 7*2 = 10
		// inv = (1/10) * [[6, -7], [-2, 4]]
		const values = extractValues(result);
		expect(values[0][0]).toBeCloseTo(0.6);
		expect(values[0][1]).toBeCloseTo(-0.7);
		expect(values[1][0]).toBeCloseTo(-0.2);
		expect(values[1][1]).toBeCloseTo(0.4);
	});

	it('computes inverse of identity', () => {
		const m = numMatrix([
			[1, 0],
			[0, 1]
		]);
		const result = inverse(m);
		expect(extractValues(result)).toEqual([
			[1, 0],
			[0, 1]
		]);
	});

	it('throws on singular matrix', () => {
		const m = numMatrix([
			[1, 2],
			[2, 4]
		]); // det = 0
		expect(() => inverse(m)).toThrow(MatrixOperationError);
	});

	it('throws on non-square matrix', () => {
		const m = numMatrix([[1, 2, 3]]);
		expect(() => inverse(m)).toThrow(MatrixOperationError);
	});

	it('A * A^-1 = I', () => {
		const a = numMatrix([
			[4, 7],
			[2, 6]
		]);
		const aInv = inverse(a);
		const product = matrixMultiply(a, aInv);
		const values = extractValues(product);
		// Should be identity (within floating point tolerance)
		expect(values[0][0]).toBeCloseTo(1);
		expect(values[0][1]).toBeCloseTo(0);
		expect(values[1][0]).toBeCloseTo(0);
		expect(values[1][1]).toBeCloseTo(1);
	});
});
