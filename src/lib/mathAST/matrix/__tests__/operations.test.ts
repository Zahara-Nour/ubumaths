/**
 * Matrix Operations Tests
 *
 * Phase 5: TDD tests for matrix operations with pedagogical steps
 */

import { describe, it, expect } from 'vitest';
import { matrix, number, divide } from '../../factory';
import type { MatrixNode, NumberNode, MathNode } from '../../types';
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
import { evaluate } from '../../eval/evaluate';

// Helper to create a numeric matrix
function numMatrix(rows: number[][]): MatrixNode {
	return matrix(
		rows.map((row) => row.map((n) => number(n.toString()))),
		{ matrixType: 'pmatrix' }
	);
}

// Helper to convert a MathNode to a number using evaluate
function toNum(node: MathNode): number {
	const result = evaluate(node, { mode: 'decimal' });
	if (typeof result.value !== 'number') {
		throw new Error(`Expected numeric result, got ${typeof result.value}`);
	}
	return result.value;
}

// Helper to extract numeric values from a matrix node
function extractValues(m: MatrixNode): number[][] {
	return m.rows.map((row) => row.map((node) => toNum(node)));
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
		expect(toNum(result)).toBe(5);
	});

	it('computes determinant of 2x2 matrix', () => {
		const m = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const result = determinant(m);
		// det = 1*4 - 2*3 = -2
		expect(toNum(result)).toBe(-2);
	});

	it('computes determinant of identity matrix', () => {
		const m = numMatrix([
			[1, 0],
			[0, 1]
		]);
		const result = determinant(m);
		expect(toNum(result)).toBe(1);
	});

	it('computes determinant of 3x3 matrix', () => {
		const m = numMatrix([
			[1, 2, 3],
			[4, 5, 6],
			[7, 8, 9]
		]);
		const result = determinant(m);
		// This matrix is singular, det = 0
		expect(toNum(result)).toBe(0);
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
		expect(toNum(result)).toBe(1);
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

// =============================================================================
// Edge Cases: Exact Arithmetic
// =============================================================================

describe('Exact Arithmetic Edge Cases', () => {
	// Helper to create a fraction node
	const frac = (num: number, den: number) =>
		divide(number(num.toString()), number(den.toString()), 'fraction');

	// Helper to create a matrix with fraction elements
	function fracMatrix(rows: [number, number][][]): MatrixNode {
		return matrix(
			rows.map((row) => row.map(([num, den]) => frac(num, den))),
			{ matrixType: 'pmatrix' }
		);
	}

	describe('Fraction Addition', () => {
		it('1/3 + 1/3 + 1/3 = 1 exactly', () => {
			const third = frac(1, 3);
			const m1 = matrix([[third]], { matrixType: 'pmatrix' });
			const m2 = matrix([[third]], { matrixType: 'pmatrix' });
			const m3 = matrix([[third]], { matrixType: 'pmatrix' });

			const sum = matrixAdd(matrixAdd(m1, m2), m3);
			expect(toNum(sum.rows[0][0])).toBe(1); // Exact, not 0.9999...
		});

		it('1/2 + 1/4 + 1/4 = 1 exactly', () => {
			const a = matrix([[frac(1, 2)]], { matrixType: 'pmatrix' });
			const b = matrix([[frac(1, 4)]], { matrixType: 'pmatrix' });
			const c = matrix([[frac(1, 4)]], { matrixType: 'pmatrix' });

			const sum = matrixAdd(matrixAdd(a, b), c);
			expect(toNum(sum.rows[0][0])).toBe(1);
		});

		it('1/6 + 1/3 = 1/2 exactly', () => {
			const a = matrix([[frac(1, 6)]], { matrixType: 'pmatrix' });
			const b = matrix([[frac(1, 3)]], { matrixType: 'pmatrix' });

			const sum = matrixAdd(a, b);
			expect(toNum(sum.rows[0][0])).toBe(0.5);
		});

		it('adds matrices with mixed fractions', () => {
			const a = fracMatrix([
				[
					[1, 2],
					[1, 3]
				],
				[
					[1, 4],
					[1, 5]
				]
			]);
			const b = fracMatrix([
				[
					[1, 2],
					[2, 3]
				],
				[
					[3, 4],
					[4, 5]
				]
			]);

			const sum = matrixAdd(a, b);
			expect(toNum(sum.rows[0][0])).toBe(1); // 1/2 + 1/2
			expect(toNum(sum.rows[0][1])).toBe(1); // 1/3 + 2/3
			expect(toNum(sum.rows[1][0])).toBe(1); // 1/4 + 3/4
			expect(toNum(sum.rows[1][1])).toBe(1); // 1/5 + 4/5
		});
	});

	describe('Fraction Subtraction', () => {
		it('1/2 - 1/3 = 1/6 exactly', () => {
			const a = matrix([[frac(1, 2)]], { matrixType: 'pmatrix' });
			const b = matrix([[frac(1, 3)]], { matrixType: 'pmatrix' });

			const diff = matrixSubtract(a, b);
			expect(toNum(diff.rows[0][0])).toBeCloseTo(1 / 6);
		});

		it('3/4 - 1/4 = 1/2 exactly', () => {
			const a = matrix([[frac(3, 4)]], { matrixType: 'pmatrix' });
			const b = matrix([[frac(1, 4)]], { matrixType: 'pmatrix' });

			const diff = matrixSubtract(a, b);
			expect(toNum(diff.rows[0][0])).toBe(0.5);
		});
	});

	describe('Fraction Multiplication', () => {
		it('(1/2) * (1/3) = 1/6 in scalar multiply', () => {
			const m = matrix([[frac(1, 3)]], { matrixType: 'pmatrix' });
			const result = scalarMultiply(frac(1, 2), m);
			expect(toNum(result.rows[0][0])).toBeCloseTo(1 / 6);
		});

		it('matrix multiply with fractions gives exact result', () => {
			const a = fracMatrix([
				[
					[1, 2],
					[1, 3]
				],
				[
					[1, 4],
					[1, 5]
				]
			]);
			const b = fracMatrix([
				[
					[1, 1],
					[0, 1]
				],
				[
					[0, 1],
					[1, 1]
				]
			]);

			const product = matrixMultiply(a, b);
			// [0][0] = 1/2 * 1 + 1/3 * 0 = 1/2
			// [0][1] = 1/2 * 0 + 1/3 * 1 = 1/3
			expect(toNum(product.rows[0][0])).toBe(0.5);
			expect(toNum(product.rows[0][1])).toBeCloseTo(1 / 3);
		});
	});

	describe('Large Integers', () => {
		it('handles large integer addition without precision loss', () => {
			const large = 9007199254740991; // Number.MAX_SAFE_INTEGER
			const a = numMatrix([[large]]);
			const b = numMatrix([[1]]);

			const sum = matrixAdd(a, b);
			// With BigInt arithmetic, this should be exact
			expect(toNum(sum.rows[0][0])).toBe(large + 1);
		});

		it('handles large integer multiplication', () => {
			const a = numMatrix([[1000000]]);
			const b = numMatrix([[1000000]]);

			const product = matrixMultiply(a, b);
			expect(toNum(product.rows[0][0])).toBe(1e12);
		});
	});
});

// =============================================================================
// Edge Cases: Determinant
// =============================================================================

describe('Determinant Edge Cases', () => {
	describe('Special Matrix Types', () => {
		it('diagonal matrix: det = product of diagonal', () => {
			const m = numMatrix([
				[2, 0, 0],
				[0, 3, 0],
				[0, 0, 4]
			]);
			expect(toNum(determinant(m))).toBe(24); // 2 * 3 * 4
		});

		it('upper triangular matrix: det = product of diagonal', () => {
			const m = numMatrix([
				[1, 5, 9],
				[0, 2, 7],
				[0, 0, 3]
			]);
			expect(toNum(determinant(m))).toBe(6); // 1 * 2 * 3
		});

		it('lower triangular matrix: det = product of diagonal', () => {
			const m = numMatrix([
				[2, 0, 0],
				[4, 3, 0],
				[6, 7, 5]
			]);
			expect(toNum(determinant(m))).toBe(30); // 2 * 3 * 5
		});

		it('anti-diagonal matrix', () => {
			const m = numMatrix([
				[0, 0, 1],
				[0, 2, 0],
				[3, 0, 0]
			]);
			// det = -6 (sign depends on permutation)
			expect(toNum(determinant(m))).toBe(-6);
		});

		it('identity matrix of any size has det = 1', () => {
			for (const n of [1, 2, 3, 4]) {
				const identity: number[][] = [];
				for (let i = 0; i < n; i++) {
					const row: number[] = [];
					for (let j = 0; j < n; j++) {
						row.push(i === j ? 1 : 0);
					}
					identity.push(row);
				}
				expect(toNum(determinant(numMatrix(identity)))).toBe(1);
			}
		});
	});

	describe('Singular Matrices', () => {
		it('matrix with zero row has det = 0', () => {
			const m = numMatrix([
				[1, 2, 3],
				[0, 0, 0],
				[4, 5, 6]
			]);
			expect(toNum(determinant(m))).toBe(0);
		});

		it('matrix with zero column has det = 0', () => {
			const m = numMatrix([
				[1, 0, 3],
				[2, 0, 4],
				[5, 0, 6]
			]);
			expect(toNum(determinant(m))).toBe(0);
		});

		it('matrix with duplicate rows has det = 0', () => {
			const m = numMatrix([
				[1, 2, 3],
				[4, 5, 6],
				[1, 2, 3]
			]);
			expect(toNum(determinant(m))).toBe(0);
		});

		it('matrix with proportional rows has det = 0', () => {
			const m = numMatrix([
				[1, 2, 3],
				[2, 4, 6],
				[7, 8, 9]
			]);
			expect(toNum(determinant(m))).toBe(0);
		});

		it('matrix with linearly dependent columns has det = 0', () => {
			const m = numMatrix([
				[1, 2, 3],
				[4, 5, 9],
				[7, 8, 15]
			]); // col3 = col1 + col2
			expect(toNum(determinant(m))).toBe(0);
		});
	});

	describe('Determinant Properties', () => {
		it('det(A^T) = det(A)', () => {
			const m = numMatrix([
				[1, 2, 3],
				[4, 5, 6],
				[7, 8, 10]
			]);
			expect(toNum(determinant(transpose(m)))).toBe(toNum(determinant(m)));
		});

		it('det(kA) = k^n * det(A) for n×n matrix', () => {
			const m = numMatrix([
				[1, 2],
				[3, 4]
			]);
			const k = 2;
			const kA = scalarMultiply(number(k.toString()), m);
			// For 2×2: det(kA) = k² * det(A)
			expect(toNum(determinant(kA))).toBe(k * k * toNum(determinant(m)));
		});

		it('det(AB) = det(A) * det(B)', () => {
			const a = numMatrix([
				[1, 2],
				[3, 4]
			]);
			const b = numMatrix([
				[5, 6],
				[7, 8]
			]);
			const product = matrixMultiply(a, b);
			expect(toNum(determinant(product))).toBeCloseTo(
				toNum(determinant(a)) * toNum(determinant(b))
			);
		});

		it('swapping rows changes sign of determinant', () => {
			const m1 = numMatrix([
				[1, 2],
				[3, 4]
			]);
			const m2 = numMatrix([
				[3, 4],
				[1, 2]
			]);
			expect(toNum(determinant(m1))).toBe(-toNum(determinant(m2)));
		});
	});

	describe('4x4 and 5x5 Determinants', () => {
		it('computes 4x4 determinant correctly', () => {
			const m = numMatrix([
				[1, 2, 3, 4],
				[5, 6, 7, 8],
				[9, 10, 11, 12],
				[13, 14, 15, 16]
			]);
			// This matrix is singular (rows are in arithmetic progression)
			expect(toNum(determinant(m))).toBe(0);
		});

		it('computes non-singular 4x4 determinant', () => {
			const m = numMatrix([
				[1, 0, 0, 0],
				[0, 2, 0, 0],
				[0, 0, 3, 0],
				[0, 0, 0, 4]
			]);
			expect(toNum(determinant(m))).toBe(24);
		});

		it('computes 5x5 identity determinant', () => {
			const m = numMatrix([
				[1, 0, 0, 0, 0],
				[0, 1, 0, 0, 0],
				[0, 0, 1, 0, 0],
				[0, 0, 0, 1, 0],
				[0, 0, 0, 0, 1]
			]);
			expect(toNum(determinant(m))).toBe(1);
		});
	});
});

// =============================================================================
// Edge Cases: Inverse
// =============================================================================

describe('Inverse Edge Cases', () => {
	describe('Fractional Inverses', () => {
		it('inverse of [[2,0],[0,2]] = [[1/2,0],[0,1/2]]', () => {
			const m = numMatrix([
				[2, 0],
				[0, 2]
			]);
			const inv = inverse(m);
			expect(toNum(inv.rows[0][0])).toBe(0.5);
			expect(toNum(inv.rows[0][1])).toBe(0);
			expect(toNum(inv.rows[1][0])).toBe(0);
			expect(toNum(inv.rows[1][1])).toBe(0.5);
		});

		it('inverse preserves exact fractions', () => {
			const m = numMatrix([
				[3, 0],
				[0, 3]
			]);
			const inv = inverse(m);
			// inv should be [[1/3, 0], [0, 1/3]]
			expect(toNum(inv.rows[0][0])).toBeCloseTo(1 / 3);
			expect(toNum(inv.rows[1][1])).toBeCloseTo(1 / 3);
		});
	});

	describe('Inverse Properties', () => {
		it('inv(inv(A)) = A', () => {
			const a = numMatrix([
				[1, 2],
				[3, 5]
			]);
			const invInvA = inverse(inverse(a));
			const values = extractValues(invInvA);
			expect(values[0][0]).toBeCloseTo(1);
			expect(values[0][1]).toBeCloseTo(2);
			expect(values[1][0]).toBeCloseTo(3);
			expect(values[1][1]).toBeCloseTo(5);
		});

		it('A^-1 * A = I', () => {
			const a = numMatrix([
				[1, 2],
				[3, 5]
			]);
			const product = matrixMultiply(inverse(a), a);
			const values = extractValues(product);
			expect(values[0][0]).toBeCloseTo(1);
			expect(values[0][1]).toBeCloseTo(0);
			expect(values[1][0]).toBeCloseTo(0);
			expect(values[1][1]).toBeCloseTo(1);
		});

		it('(AB)^-1 = B^-1 * A^-1', () => {
			const a = numMatrix([
				[1, 2],
				[3, 5]
			]);
			const b = numMatrix([
				[2, 1],
				[1, 1]
			]);
			const abInv = inverse(matrixMultiply(a, b));
			const bInvAInv = matrixMultiply(inverse(b), inverse(a));
			const values1 = extractValues(abInv);
			const values2 = extractValues(bInvAInv);
			for (let i = 0; i < 2; i++) {
				for (let j = 0; j < 2; j++) {
					expect(values1[i][j]).toBeCloseTo(values2[i][j]);
				}
			}
		});

		it('(A^T)^-1 = (A^-1)^T', () => {
			const a = numMatrix([
				[1, 2],
				[3, 5]
			]);
			const atInv = inverse(transpose(a));
			const aInvT = transpose(inverse(a));
			const values1 = extractValues(atInv);
			const values2 = extractValues(aInvT);
			for (let i = 0; i < 2; i++) {
				for (let j = 0; j < 2; j++) {
					expect(values1[i][j]).toBeCloseTo(values2[i][j]);
				}
			}
		});

		it('det(A^-1) = 1/det(A)', () => {
			const a = numMatrix([
				[1, 2],
				[3, 5]
			]);
			const detA = toNum(determinant(a));
			const detAInv = toNum(determinant(inverse(a)));
			expect(detAInv).toBeCloseTo(1 / detA);
		});
	});

	describe('3x3 Inverse', () => {
		it('computes 3x3 inverse correctly', () => {
			const m = numMatrix([
				[1, 2, 3],
				[0, 1, 4],
				[5, 6, 0]
			]);
			const inv = inverse(m);
			const product = matrixMultiply(m, inv);
			const values = extractValues(product);

			// Should be identity
			for (let i = 0; i < 3; i++) {
				for (let j = 0; j < 3; j++) {
					expect(values[i][j]).toBeCloseTo(i === j ? 1 : 0);
				}
			}
		});

		it('3x3 inverse with row swaps during elimination', () => {
			// Matrix that requires row swap (first pivot is 0)
			const m = numMatrix([
				[0, 1, 2],
				[1, 0, 3],
				[4, 5, 6]
			]);
			const inv = inverse(m);
			const product = matrixMultiply(m, inv);
			const values = extractValues(product);

			for (let i = 0; i < 3; i++) {
				for (let j = 0; j < 3; j++) {
					expect(values[i][j]).toBeCloseTo(i === j ? 1 : 0);
				}
			}
		});
	});

	describe('Singular Matrix Detection', () => {
		it('throws for matrix with det very close to but not exactly 0', () => {
			// Matrix that is exactly singular
			const m = numMatrix([
				[1, 2],
				[2, 4]
			]);
			expect(() => inverse(m)).toThrow(MatrixOperationError);
		});

		it('throws for 3x3 singular matrix', () => {
			const m = numMatrix([
				[1, 2, 3],
				[4, 5, 6],
				[7, 8, 9]
			]);
			expect(() => inverse(m)).toThrow(MatrixOperationError);
		});
	});
});

// =============================================================================
// Edge Cases: Matrix Multiplication Properties
// =============================================================================

describe('Matrix Multiplication Properties', () => {
	describe('Associativity', () => {
		it('(AB)C = A(BC)', () => {
			const a = numMatrix([
				[1, 2],
				[3, 4]
			]);
			const b = numMatrix([
				[5, 6],
				[7, 8]
			]);
			const c = numMatrix([
				[9, 10],
				[11, 12]
			]);

			const abc1 = matrixMultiply(matrixMultiply(a, b), c);
			const abc2 = matrixMultiply(a, matrixMultiply(b, c));

			const values1 = extractValues(abc1);
			const values2 = extractValues(abc2);

			for (let i = 0; i < 2; i++) {
				for (let j = 0; j < 2; j++) {
					expect(values1[i][j]).toBe(values2[i][j]);
				}
			}
		});
	});

	describe('Non-Commutativity', () => {
		it('AB ≠ BA in general', () => {
			const a = numMatrix([
				[1, 2],
				[3, 4]
			]);
			const b = numMatrix([
				[5, 6],
				[7, 8]
			]);

			const ab = extractValues(matrixMultiply(a, b));
			const ba = extractValues(matrixMultiply(b, a));

			// At least one element should differ
			const isDifferent =
				ab[0][0] !== ba[0][0] ||
				ab[0][1] !== ba[0][1] ||
				ab[1][0] !== ba[1][0] ||
				ab[1][1] !== ba[1][1];
			expect(isDifferent).toBe(true);
		});
	});

	describe('Distributivity', () => {
		it('A(B + C) = AB + AC', () => {
			const a = numMatrix([
				[1, 2],
				[3, 4]
			]);
			const b = numMatrix([
				[5, 6],
				[7, 8]
			]);
			const c = numMatrix([
				[9, 10],
				[11, 12]
			]);

			const left = matrixMultiply(a, matrixAdd(b, c));
			const right = matrixAdd(matrixMultiply(a, b), matrixMultiply(a, c));

			const values1 = extractValues(left);
			const values2 = extractValues(right);

			for (let i = 0; i < 2; i++) {
				for (let j = 0; j < 2; j++) {
					expect(values1[i][j]).toBe(values2[i][j]);
				}
			}
		});

		it('(A + B)C = AC + BC', () => {
			const a = numMatrix([
				[1, 2],
				[3, 4]
			]);
			const b = numMatrix([
				[5, 6],
				[7, 8]
			]);
			const c = numMatrix([
				[9, 10],
				[11, 12]
			]);

			const left = matrixMultiply(matrixAdd(a, b), c);
			const right = matrixAdd(matrixMultiply(a, c), matrixMultiply(b, c));

			const values1 = extractValues(left);
			const values2 = extractValues(right);

			for (let i = 0; i < 2; i++) {
				for (let j = 0; j < 2; j++) {
					expect(values1[i][j]).toBe(values2[i][j]);
				}
			}
		});
	});

	describe('Transpose of Product', () => {
		it('(AB)^T = B^T * A^T', () => {
			const a = numMatrix([
				[1, 2],
				[3, 4]
			]);
			const b = numMatrix([
				[5, 6],
				[7, 8]
			]);

			const abT = transpose(matrixMultiply(a, b));
			const bTaT = matrixMultiply(transpose(b), transpose(a));

			const values1 = extractValues(abT);
			const values2 = extractValues(bTaT);

			for (let i = 0; i < 2; i++) {
				for (let j = 0; j < 2; j++) {
					expect(values1[i][j]).toBe(values2[i][j]);
				}
			}
		});
	});

	describe('Zero and Identity', () => {
		it('A * 0 = 0', () => {
			const a = numMatrix([
				[1, 2],
				[3, 4]
			]);
			const zero = numMatrix([
				[0, 0],
				[0, 0]
			]);

			const result = extractValues(matrixMultiply(a, zero));
			expect(result).toEqual([
				[0, 0],
				[0, 0]
			]);
		});

		it('I * A = A * I = A', () => {
			const a = numMatrix([
				[1, 2],
				[3, 4]
			]);
			const identity = numMatrix([
				[1, 0],
				[0, 1]
			]);

			expect(extractValues(matrixMultiply(identity, a))).toEqual(extractValues(a));
			expect(extractValues(matrixMultiply(a, identity))).toEqual(extractValues(a));
		});
	});
});

// =============================================================================
// Edge Cases: Trace Properties
// =============================================================================

describe('Trace Properties', () => {
	it('tr(A + B) = tr(A) + tr(B)', () => {
		const a = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const b = numMatrix([
			[5, 6],
			[7, 8]
		]);

		const trSum = toNum(trace(matrixAdd(a, b)));
		const sumTr = toNum(trace(a)) + toNum(trace(b));
		expect(trSum).toBe(sumTr);
	});

	it('tr(kA) = k * tr(A)', () => {
		const a = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const k = 3;

		const trKA = toNum(trace(scalarMultiply(number(k.toString()), a)));
		const kTrA = k * toNum(trace(a));
		expect(trKA).toBe(kTrA);
	});

	it('tr(AB) = tr(BA)', () => {
		const a = numMatrix([
			[1, 2],
			[3, 4]
		]);
		const b = numMatrix([
			[5, 6],
			[7, 8]
		]);

		expect(toNum(trace(matrixMultiply(a, b)))).toBe(toNum(trace(matrixMultiply(b, a))));
	});

	it('tr(A^T) = tr(A)', () => {
		const a = numMatrix([
			[1, 2],
			[3, 4]
		]);

		expect(toNum(trace(transpose(a)))).toBe(toNum(trace(a)));
	});

	it('trace of zero matrix is 0', () => {
		const zero = numMatrix([
			[0, 0, 0],
			[0, 0, 0],
			[0, 0, 0]
		]);
		expect(toNum(trace(zero))).toBe(0);
	});

	it('trace of identity n×n is n', () => {
		for (const n of [1, 2, 3, 4, 5]) {
			const identity: number[][] = [];
			for (let i = 0; i < n; i++) {
				const row: number[] = [];
				for (let j = 0; j < n; j++) {
					row.push(i === j ? 1 : 0);
				}
				identity.push(row);
			}
			expect(toNum(trace(numMatrix(identity)))).toBe(n);
		}
	});
});

// =============================================================================
// Edge Cases: 1x1 Matrices
// =============================================================================

describe('1x1 Matrix Edge Cases', () => {
	it('1x1 addition', () => {
		const a = numMatrix([[5]]);
		const b = numMatrix([[3]]);
		expect(extractValues(matrixAdd(a, b))).toEqual([[8]]);
	});

	it('1x1 multiplication', () => {
		const a = numMatrix([[5]]);
		const b = numMatrix([[3]]);
		expect(extractValues(matrixMultiply(a, b))).toEqual([[15]]);
	});

	it('1x1 determinant', () => {
		expect(toNum(determinant(numMatrix([[7]])))).toBe(7);
	});

	it('1x1 inverse', () => {
		const m = numMatrix([[4]]);
		const inv = inverse(m);
		expect(toNum(inv.rows[0][0])).toBe(0.25);
	});

	it('1x1 trace', () => {
		expect(toNum(trace(numMatrix([[9]])))).toBe(9);
	});

	it('1x1 transpose is same', () => {
		const m = numMatrix([[5]]);
		expect(extractValues(transpose(m))).toEqual([[5]]);
	});
});
