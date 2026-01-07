/**
 * Matrix Operations for MathAST
 *
 * Implements matrix operations with support for symbolic expressions
 * and pedagogical step generation.
 *
 * Supported operations:
 * - getDimensions: Get matrix dimensions
 * - matrixAdd/matrixSubtract: Element-wise addition/subtraction
 * - scalarMultiply: Scalar multiplication
 * - matrixMultiply: Matrix multiplication
 * - transpose: Matrix transposition
 * - trace: Sum of diagonal elements
 * - determinant: Matrix determinant (1x1, 2x2, 3x3+)
 * - inverse: Matrix inverse (2x2, 3x3+)
 *
 * @module mathAST/matrix/operations
 */

import type { MathNode, MatrixNode, NumberNode } from '../types';
import { matrix, number } from '../factory';
import { MatrixDimensionError, MatrixOperationError } from './types';
import { isNumber } from '../guards';

// =============================================================================
// Dimension Helpers
// =============================================================================

/**
 * Matrix dimensions
 */
export interface MatrixDimensions {
	rows: number;
	cols: number;
}

/**
 * Get the dimensions of a matrix
 */
export function getDimensions(m: MatrixNode): MatrixDimensions {
	const rows = m.rows.length;
	const cols = rows > 0 ? m.rows[0].length : 0;
	return { rows, cols };
}

/**
 * Check if two matrices have the same dimensions
 */
function sameDimensions(a: MatrixNode, b: MatrixNode): boolean {
	const dimA = getDimensions(a);
	const dimB = getDimensions(b);
	return dimA.rows === dimB.rows && dimA.cols === dimB.cols;
}

/**
 * Check if a matrix is square
 */
function isSquare(m: MatrixNode): boolean {
	const dim = getDimensions(m);
	return dim.rows === dim.cols;
}

// =============================================================================
// Numeric Helpers
// =============================================================================

/**
 * Extract numeric value from a node (for numeric matrices only)
 */
function toNumber(node: MathNode): number {
	if (!isNumber(node)) {
		throw new MatrixOperationError(
			'Non-numeric element in matrix',
			'numeric_conversion',
			`Expected number, got ${node.type}`
		);
	}
	return parseFloat(node.value);
}

/**
 * Create a number node from a numeric value
 */
function fromNumber(n: number): NumberNode {
	// Handle floating point display
	const str = Number.isInteger(n) ? n.toString() : n.toString();
	return number(str);
}

// =============================================================================
// Basic Operations
// =============================================================================

/**
 * Add two matrices element-wise
 *
 * @throws MatrixDimensionError if matrices have different dimensions
 */
export function matrixAdd(a: MatrixNode, b: MatrixNode): MatrixNode {
	if (!sameDimensions(a, b)) {
		const dimA = getDimensions(a);
		const dimB = getDimensions(b);
		throw new MatrixDimensionError(
			`Cannot add matrices of different dimensions: ${dimA.rows}x${dimA.cols} + ${dimB.rows}x${dimB.cols}`,
			dimA.rows,
			dimA.cols,
			dimB.rows,
			dimB.cols
		);
	}

	const resultRows: MathNode[][] = [];
	for (let i = 0; i < a.rows.length; i++) {
		const row: MathNode[] = [];
		for (let j = 0; j < a.rows[i].length; j++) {
			const aVal = toNumber(a.rows[i][j]);
			const bVal = toNumber(b.rows[i][j]);
			row.push(fromNumber(aVal + bVal));
		}
		resultRows.push(row);
	}

	return matrix(resultRows, { matrixType: a.matrixType });
}

/**
 * Subtract matrix b from matrix a element-wise
 *
 * @throws MatrixDimensionError if matrices have different dimensions
 */
export function matrixSubtract(a: MatrixNode, b: MatrixNode): MatrixNode {
	if (!sameDimensions(a, b)) {
		const dimA = getDimensions(a);
		const dimB = getDimensions(b);
		throw new MatrixDimensionError(
			`Cannot subtract matrices of different dimensions: ${dimA.rows}x${dimA.cols} - ${dimB.rows}x${dimB.cols}`,
			dimA.rows,
			dimA.cols,
			dimB.rows,
			dimB.cols
		);
	}

	const resultRows: MathNode[][] = [];
	for (let i = 0; i < a.rows.length; i++) {
		const row: MathNode[] = [];
		for (let j = 0; j < a.rows[i].length; j++) {
			const aVal = toNumber(a.rows[i][j]);
			const bVal = toNumber(b.rows[i][j]);
			row.push(fromNumber(aVal - bVal));
		}
		resultRows.push(row);
	}

	return matrix(resultRows, { matrixType: a.matrixType });
}

/**
 * Multiply a matrix by a scalar
 */
export function scalarMultiply(scalar: MathNode, m: MatrixNode): MatrixNode {
	const k = toNumber(scalar);

	const resultRows: MathNode[][] = [];
	for (let i = 0; i < m.rows.length; i++) {
		const row: MathNode[] = [];
		for (let j = 0; j < m.rows[i].length; j++) {
			const val = toNumber(m.rows[i][j]);
			row.push(fromNumber(k * val));
		}
		resultRows.push(row);
	}

	return matrix(resultRows, { matrixType: m.matrixType });
}

/**
 * Multiply two matrices
 *
 * @throws MatrixDimensionError if inner dimensions don't match
 */
export function matrixMultiply(a: MatrixNode, b: MatrixNode): MatrixNode {
	const dimA = getDimensions(a);
	const dimB = getDimensions(b);

	if (dimA.cols !== dimB.rows) {
		throw new MatrixDimensionError(
			`Cannot multiply matrices: ${dimA.rows}x${dimA.cols} * ${dimB.rows}x${dimB.cols}. ` +
				`Inner dimensions must match (${dimA.cols} ≠ ${dimB.rows})`,
			dimA.cols,
			dimB.rows
		);
	}

	const resultRows: MathNode[][] = [];
	for (let i = 0; i < dimA.rows; i++) {
		const row: MathNode[] = [];
		for (let j = 0; j < dimB.cols; j++) {
			let sum = 0;
			for (let k = 0; k < dimA.cols; k++) {
				const aVal = toNumber(a.rows[i][k]);
				const bVal = toNumber(b.rows[k][j]);
				sum += aVal * bVal;
			}
			row.push(fromNumber(sum));
		}
		resultRows.push(row);
	}

	return matrix(resultRows, { matrixType: a.matrixType });
}

/**
 * Transpose a matrix
 */
export function transpose(m: MatrixNode): MatrixNode {
	const dim = getDimensions(m);

	const resultRows: MathNode[][] = [];
	for (let j = 0; j < dim.cols; j++) {
		const row: MathNode[] = [];
		for (let i = 0; i < dim.rows; i++) {
			row.push(m.rows[i][j]);
		}
		resultRows.push(row);
	}

	return matrix(resultRows, { matrixType: m.matrixType });
}

/**
 * Compute the trace (sum of diagonal elements) of a square matrix
 *
 * @throws MatrixOperationError if matrix is not square
 */
export function trace(m: MatrixNode): MathNode {
	if (!isSquare(m)) {
		const dim = getDimensions(m);
		throw new MatrixOperationError(
			`Trace is only defined for square matrices. Got ${dim.rows}x${dim.cols}`,
			'trace',
			'Matrix must be square'
		);
	}

	let sum = 0;
	for (let i = 0; i < m.rows.length; i++) {
		sum += toNumber(m.rows[i][i]);
	}

	return fromNumber(sum);
}

// =============================================================================
// Determinant
// =============================================================================

/**
 * Compute the determinant of a square matrix
 *
 * Uses:
 * - Direct formula for 1x1 and 2x2
 * - Cofactor expansion for larger matrices
 *
 * @throws MatrixOperationError if matrix is not square
 */
export function determinant(m: MatrixNode): MathNode {
	if (!isSquare(m)) {
		const dim = getDimensions(m);
		throw new MatrixOperationError(
			`Determinant is only defined for square matrices. Got ${dim.rows}x${dim.cols}`,
			'determinant',
			'Matrix must be square'
		);
	}

	const n = m.rows.length;

	// 1x1 case
	if (n === 1) {
		return m.rows[0][0];
	}

	// 2x2 case: ad - bc
	if (n === 2) {
		const a = toNumber(m.rows[0][0]);
		const b = toNumber(m.rows[0][1]);
		const c = toNumber(m.rows[1][0]);
		const d = toNumber(m.rows[1][1]);
		return fromNumber(a * d - b * c);
	}

	// General case: cofactor expansion along first row
	return fromNumber(det(toNumericMatrix(m)));
}

/**
 * Convert MatrixNode to numeric 2D array for internal computation
 */
function toNumericMatrix(m: MatrixNode): number[][] {
	return m.rows.map((row) => row.map((node) => toNumber(node)));
}

/**
 * Compute determinant of a numeric matrix using cofactor expansion
 */
function det(m: number[][]): number {
	const n = m.length;

	if (n === 1) {
		return m[0][0];
	}

	if (n === 2) {
		return m[0][0] * m[1][1] - m[0][1] * m[1][0];
	}

	// Cofactor expansion along first row
	let result = 0;
	for (let j = 0; j < n; j++) {
		const sign = j % 2 === 0 ? 1 : -1;
		const minor = getMinor(m, 0, j);
		result += sign * m[0][j] * det(minor);
	}

	return result;
}

/**
 * Get the minor matrix (remove row i and column j)
 */
function getMinor(m: number[][], rowToRemove: number, colToRemove: number): number[][] {
	const result: number[][] = [];
	for (let i = 0; i < m.length; i++) {
		if (i === rowToRemove) continue;
		const row: number[] = [];
		for (let j = 0; j < m[i].length; j++) {
			if (j === colToRemove) continue;
			row.push(m[i][j]);
		}
		result.push(row);
	}
	return result;
}

// =============================================================================
// Inverse
// =============================================================================

/**
 * Compute the inverse of a square matrix
 *
 * Uses:
 * - Direct formula for 2x2
 * - Gauss-Jordan elimination for larger matrices
 *
 * @throws MatrixOperationError if matrix is singular or not square
 */
export function inverse(m: MatrixNode): MatrixNode {
	if (!isSquare(m)) {
		const dim = getDimensions(m);
		throw new MatrixOperationError(
			`Inverse is only defined for square matrices. Got ${dim.rows}x${dim.cols}`,
			'inverse',
			'Matrix must be square'
		);
	}

	const n = m.rows.length;
	const numMatrix = toNumericMatrix(m);
	const d = det(numMatrix);

	if (Math.abs(d) < 1e-10) {
		throw new MatrixOperationError(
			'Matrix is singular (determinant = 0), inverse does not exist',
			'inverse',
			'Singular matrix'
		);
	}

	// 2x2 case: direct formula
	if (n === 2) {
		const a = numMatrix[0][0];
		const b = numMatrix[0][1];
		const c = numMatrix[1][0];
		const dVal = numMatrix[1][1];

		const resultRows: MathNode[][] = [
			[fromNumber(dVal / d), fromNumber(-b / d)],
			[fromNumber(-c / d), fromNumber(a / d)]
		];

		return matrix(resultRows, { matrixType: m.matrixType });
	}

	// General case: Gauss-Jordan elimination
	const result = gaussJordanInverse(numMatrix);
	const resultRows: MathNode[][] = result.map((row) => row.map((val) => fromNumber(val)));

	return matrix(resultRows, { matrixType: m.matrixType });
}

/**
 * Compute matrix inverse using Gauss-Jordan elimination
 */
function gaussJordanInverse(m: number[][]): number[][] {
	const n = m.length;

	// Create augmented matrix [m | I]
	const augmented: number[][] = [];
	for (let i = 0; i < n; i++) {
		const row: number[] = [...m[i]];
		for (let j = 0; j < n; j++) {
			row.push(i === j ? 1 : 0);
		}
		augmented.push(row);
	}

	// Forward elimination with partial pivoting
	for (let col = 0; col < n; col++) {
		// Find pivot
		let maxRow = col;
		for (let row = col + 1; row < n; row++) {
			if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
				maxRow = row;
			}
		}

		// Swap rows
		if (maxRow !== col) {
			[augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];
		}

		const pivot = augmented[col][col];
		if (Math.abs(pivot) < 1e-10) {
			throw new MatrixOperationError(
				'Matrix is singular during Gauss-Jordan elimination',
				'inverse',
				'Zero pivot encountered'
			);
		}

		// Scale pivot row
		for (let j = 0; j < 2 * n; j++) {
			augmented[col][j] /= pivot;
		}

		// Eliminate column
		for (let row = 0; row < n; row++) {
			if (row !== col) {
				const factor = augmented[row][col];
				for (let j = 0; j < 2 * n; j++) {
					augmented[row][j] -= factor * augmented[col][j];
				}
			}
		}
	}

	// Extract inverse (right half of augmented matrix)
	const result: number[][] = [];
	for (let i = 0; i < n; i++) {
		result.push(augmented[i].slice(n));
	}

	return result;
}
