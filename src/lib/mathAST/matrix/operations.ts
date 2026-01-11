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
import type { MatrixOperationOptions, MatrixOperationResult } from './types';
import type { Verbosity } from '../common/verbosity';
import { matrix, number } from '../factory';
import { MatrixDimensionError, MatrixOperationError } from './types';
import { isNumber } from '../guards';
import { MatrixStepRecorderImpl, createMatrixStepRecorder } from './step-recorder';
import {
	describeMatrixSize,
	describeDet2x2,
	describeCofactorExpansion,
	describeMinor,
	describeCofactor,
	describeSumCofactors,
	describeDetResult,
	describeCheckDet,
	describeInverse2x2,
	describeAugmentedMatrix,
	describeRowSwap,
	describeRowScale,
	describeRowAdd,
	describeExtractInverse
} from './descriptions-fr';

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
 * Compute the determinant of a square matrix (without steps)
 */
export function determinant(m: MatrixNode): MathNode;
/**
 * Compute the determinant with pedagogical steps
 */
export function determinant(
	m: MatrixNode,
	options: MatrixOperationOptions
): MatrixOperationResult<MathNode>;
/**
 * Compute the determinant of a square matrix
 *
 * Uses:
 * - Direct formula for 1x1 and 2x2
 * - Cofactor expansion for larger matrices
 *
 * @param m - The square matrix
 * @param options - Optional settings including verbosity for step recording
 * @returns The determinant value, or an object with result and steps if options provided
 * @throws MatrixOperationError if matrix is not square
 */
export function determinant(
	m: MatrixNode,
	options?: MatrixOperationOptions
): MathNode | MatrixOperationResult<MathNode> {
	if (!isSquare(m)) {
		const dim = getDimensions(m);
		throw new MatrixOperationError(
			`Determinant is only defined for square matrices. Got ${dim.rows}x${dim.cols}`,
			'determinant',
			'Matrix must be square'
		);
	}

	// If no options, just return the result (backward compatible)
	if (!options) {
		return computeDeterminant(m);
	}

	// With options, record steps
	const recorder = createMatrixStepRecorder();
	const verbosity = options.verbosity ?? 'summarized';
	const result = computeDeterminantWithSteps(m, recorder, verbosity);

	return {
		result,
		steps: recorder.getStepsFiltered(verbosity)
	};
}

/**
 * Compute determinant without step recording (internal)
 */
function computeDeterminant(m: MatrixNode): MathNode {
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
 * Compute determinant with step recording (internal)
 */
function computeDeterminantWithSteps(
	m: MatrixNode,
	recorder: MatrixStepRecorderImpl,
	verbosity: Verbosity
): MathNode {
	const n = m.rows.length;
	const dim = getDimensions(m);

	// Step: identify matrix size (summarized)
	recorder.recordStep(
		'identify-matrix-size',
		describeMatrixSize(dim.rows, dim.cols),
		m,
		m,
		'summarized'
	);

	// 1x1 case
	if (n === 1) {
		const result = m.rows[0][0];
		recorder.recordStep(
			'det-1x1',
			`det(A) = ${formatNumber(toNumber(result))}`,
			m,
			result,
			'summarized'
		);
		return result;
	}

	// 2x2 case: ad - bc
	if (n === 2) {
		const a = toNumber(m.rows[0][0]);
		const b = toNumber(m.rows[0][1]);
		const c = toNumber(m.rows[1][0]);
		const d = toNumber(m.rows[1][1]);
		const detValue = a * d - b * c;
		const result = fromNumber(detValue);

		// Step: apply 2x2 formula (summarized)
		recorder.recordStep(
			'det-2x2-formula',
			describeDet2x2(formatNumber(a), formatNumber(b), formatNumber(c), formatNumber(d)),
			m,
			result,
			'summarized'
		);

		// Step: detailed computation (detailed only)
		if (verbosity === 'detailed') {
			const ad = a * d;
			const bc = b * c;
			recorder.recordStep(
				'det-result',
				`det = ${formatNumber(a)} x ${formatNumber(d)} - ${formatNumber(b)} x ${formatNumber(c)} = ${formatNumber(ad)} - ${formatNumber(bc)} = ${formatNumber(detValue)}`,
				m,
				result,
				'detailed'
			);
		}

		return result;
	}

	// General case: cofactor expansion
	return computeDeterminantCofactorWithSteps(m, recorder, verbosity);
}

/**
 * Compute determinant using cofactor expansion with step recording
 */
function computeDeterminantCofactorWithSteps(
	m: MatrixNode,
	recorder: MatrixStepRecorderImpl,
	verbosity: Verbosity
): MathNode {
	const n = m.rows.length;
	const numMatrix = toNumericMatrix(m);

	// Step: cofactor expansion announcement (summarized)
	recorder.recordStep('det-cofactor-expansion', describeCofactorExpansion(n), m, m, 'summarized');

	// Compute each cofactor
	const cofactorTerms: string[] = [];
	let detValue = 0;

	for (let j = 0; j < n; j++) {
		const sign = j % 2 === 0 ? 1 : -1;
		const signStr = sign === 1 ? '+' : '-';
		const element = numMatrix[0][j];
		const minorMatrix = getMinor(numMatrix, 0, j);
		const minorValue = det(minorMatrix);
		const cofactorValue = sign * minorValue;
		const termValue = element * cofactorValue;

		detValue += termValue;

		// Build term string for display
		const absMinor = Math.abs(minorValue);
		cofactorTerms.push(
			`${signStr === '-' ? '-' : j > 0 ? '+' : ''}${formatNumber(element)} x ${formatNumber(absMinor)}`
		);

		// Step: compute minor (detailed only)
		if (verbosity === 'detailed') {
			recorder.recordStep(
				'compute-minor',
				describeMinor(0, j) + ` = ${formatNumber(minorValue)}`,
				m,
				fromNumber(minorValue),
				'detailed'
			);

			recorder.recordStep(
				'compute-cofactor',
				describeCofactor(0, j, formatNumber(cofactorValue)) +
					` => terme: ${formatNumber(element)} x ${formatNumber(cofactorValue)} = ${formatNumber(termValue)}`,
				m,
				fromNumber(termValue),
				'detailed'
			);
		}
	}

	const result = fromNumber(detValue);

	// Step: sum cofactors (summarized)
	recorder.recordStep(
		'sum-cofactors',
		describeSumCofactors(cofactorTerms) + ` = ${formatNumber(detValue)}`,
		m,
		result,
		'summarized'
	);

	// Step: final result (summarized)
	recorder.recordStep(
		'det-result',
		describeDetResult(formatNumber(detValue)),
		m,
		result,
		'summarized'
	);

	return result;
}

/**
 * Format a number for display (avoid ugly decimals)
 */
function formatNumber(n: number): string {
	if (Number.isInteger(n)) {
		return n.toString();
	}
	// Round to 6 decimal places to avoid floating point noise
	const rounded = Math.round(n * 1e6) / 1e6;
	if (Number.isInteger(rounded)) {
		return rounded.toString();
	}
	return rounded.toString();
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
 * Compute the inverse of a square matrix (without steps)
 */
export function inverse(m: MatrixNode): MatrixNode;
/**
 * Compute the inverse with pedagogical steps
 */
export function inverse(
	m: MatrixNode,
	options: MatrixOperationOptions
): MatrixOperationResult<MatrixNode>;
/**
 * Compute the inverse of a square matrix
 *
 * Uses:
 * - Direct formula for 2x2
 * - Gauss-Jordan elimination for larger matrices
 *
 * @param m - The square matrix
 * @param options - Optional settings including verbosity for step recording
 * @returns The inverse matrix, or an object with result and steps if options provided
 * @throws MatrixOperationError if matrix is singular or not square
 */
export function inverse(
	m: MatrixNode,
	options?: MatrixOperationOptions
): MatrixNode | MatrixOperationResult<MatrixNode> {
	if (!isSquare(m)) {
		const dim = getDimensions(m);
		throw new MatrixOperationError(
			`Inverse is only defined for square matrices. Got ${dim.rows}x${dim.cols}`,
			'inverse',
			'Matrix must be square'
		);
	}

	// If no options, just return the result (backward compatible)
	if (!options) {
		return computeInverse(m);
	}

	// With options, record steps
	const recorder = createMatrixStepRecorder();
	const verbosity = options.verbosity ?? 'summarized';
	const result = computeInverseWithSteps(m, recorder, verbosity);

	return {
		result,
		steps: recorder.getStepsFiltered(verbosity)
	};
}

/**
 * Compute inverse without step recording (internal)
 */
function computeInverse(m: MatrixNode): MatrixNode {
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
 * Compute inverse with step recording (internal)
 */
function computeInverseWithSteps(
	m: MatrixNode,
	recorder: MatrixStepRecorderImpl,
	verbosity: Verbosity
): MatrixNode {
	const n = m.rows.length;
	const numMatrix = toNumericMatrix(m);
	const d = det(numMatrix);

	// Step: check determinant (summarized)
	recorder.recordStep('check-determinant', describeCheckDet(formatNumber(d)), m, m, 'summarized');

	if (Math.abs(d) < 1e-10) {
		throw new MatrixOperationError(
			'Matrix is singular (determinant = 0), inverse does not exist',
			'inverse',
			'Singular matrix'
		);
	}

	// 2x2 case: direct formula
	if (n === 2) {
		return computeInverse2x2WithSteps(m, numMatrix, d, recorder, verbosity);
	}

	// General case: Gauss-Jordan elimination
	return computeInverseGaussJordanWithSteps(m, numMatrix, recorder, verbosity);
}

/**
 * Compute 2x2 inverse with steps
 */
function computeInverse2x2WithSteps(
	m: MatrixNode,
	numMatrix: number[][],
	d: number,
	recorder: MatrixStepRecorderImpl,
	verbosity: Verbosity
): MatrixNode {
	const a = numMatrix[0][0];
	const b = numMatrix[0][1];
	const c = numMatrix[1][0];
	const dVal = numMatrix[1][1];

	// Step: apply 2x2 formula (summarized)
	recorder.recordStep(
		'inverse-2x2-formula',
		describeInverse2x2(formatNumber(d)),
		m,
		m,
		'summarized'
	);

	const resultRows: MathNode[][] = [
		[fromNumber(dVal / d), fromNumber(-b / d)],
		[fromNumber(-c / d), fromNumber(a / d)]
	];

	const result = matrix(resultRows, { matrixType: m.matrixType });

	// Step: show result (detailed)
	if (verbosity === 'detailed') {
		recorder.recordStep(
			'inverse-result',
			`A^{-1} = (1/${formatNumber(d)}) x [[${formatNumber(dVal)}, ${formatNumber(-b)}], [${formatNumber(-c)}, ${formatNumber(a)}]]`,
			m,
			result,
			'detailed'
		);
	}

	return result;
}

/**
 * Compute inverse using Gauss-Jordan with steps
 */
function computeInverseGaussJordanWithSteps(
	m: MatrixNode,
	numMatrix: number[][],
	recorder: MatrixStepRecorderImpl,
	verbosity: Verbosity
): MatrixNode {
	const n = numMatrix.length;

	// Create augmented matrix [m | I]
	const augmented: number[][] = [];
	for (let i = 0; i < n; i++) {
		const row: number[] = [...numMatrix[i]];
		for (let j = 0; j < n; j++) {
			row.push(i === j ? 1 : 0);
		}
		augmented.push(row);
	}

	// Step: form augmented matrix (summarized)
	recorder.recordStep('augment-identity', describeAugmentedMatrix(n), m, m, 'summarized');

	// Show initial augmented matrix (detailed)
	if (verbosity === 'detailed') {
		recorder.recordStep(
			'augment-identity',
			'Matrice augmentee initiale [A|I]:',
			m,
			m,
			'detailed',
			formatAugmentedMatrix(augmented, n)
		);
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

		// Swap rows if needed
		if (maxRow !== col) {
			[augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

			// Step: row swap (summarized)
			recorder.recordStep('row-swap', describeRowSwap(col, maxRow), m, m, 'summarized');

			// Show matrix after swap (detailed)
			if (verbosity === 'detailed') {
				recorder.recordStep(
					'row-swap',
					`Apres ${describeRowSwap(col, maxRow)}:`,
					m,
					m,
					'detailed',
					formatAugmentedMatrix(augmented, n)
				);
			}
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
		if (Math.abs(pivot - 1) > 1e-10) {
			const scaleFactor = 1 / pivot;
			for (let j = 0; j < 2 * n; j++) {
				augmented[col][j] *= scaleFactor;
			}

			// Step: row scale (summarized)
			recorder.recordStep(
				'row-scale',
				describeRowScale(col, formatNumber(scaleFactor)),
				m,
				m,
				'summarized'
			);

			// Show matrix after scale (detailed)
			if (verbosity === 'detailed') {
				recorder.recordStep(
					'row-scale',
					`Apres ${describeRowScale(col, formatNumber(scaleFactor))}:`,
					m,
					m,
					'detailed',
					formatAugmentedMatrix(augmented, n)
				);
			}
		}

		// Eliminate column
		for (let row = 0; row < n; row++) {
			if (row !== col && Math.abs(augmented[row][col]) > 1e-10) {
				const factor = -augmented[row][col];
				for (let j = 0; j < 2 * n; j++) {
					augmented[row][j] += factor * augmented[col][j];
				}

				// Step: row add (summarized)
				recorder.recordStep(
					'row-add',
					describeRowAdd(row, col, formatNumber(factor)),
					m,
					m,
					'summarized'
				);

				// Show matrix after row add (detailed)
				if (verbosity === 'detailed') {
					recorder.recordStep(
						'row-add',
						`Apres ${describeRowAdd(row, col, formatNumber(factor))}:`,
						m,
						m,
						'detailed',
						formatAugmentedMatrix(augmented, n)
					);
				}
			}
		}
	}

	// Extract inverse (right half of augmented matrix)
	const resultNumeric: number[][] = [];
	for (let i = 0; i < n; i++) {
		resultNumeric.push(augmented[i].slice(n));
	}

	const resultRows: MathNode[][] = resultNumeric.map((row) => row.map((val) => fromNumber(val)));
	const result = matrix(resultRows, { matrixType: m.matrixType });

	// Step: extract inverse (summarized)
	recorder.recordStep('extract-inverse', describeExtractInverse(), m, result, 'summarized');

	return result;
}

/**
 * Format augmented matrix as LaTeX string for display
 */
function formatAugmentedMatrix(augmented: number[][], n: number): string {
	const rows = augmented.map((row) => {
		const left = row
			.slice(0, n)
			.map((v) => formatNumber(v))
			.join(' & ');
		const right = row
			.slice(n)
			.map((v) => formatNumber(v))
			.join(' & ');
		return `${left} & | & ${right}`;
	});
	return `\\begin{pmatrix} ${rows.join(' \\\\ ')} \\end{pmatrix}`;
}

/**
 * Compute matrix inverse using Gauss-Jordan elimination (no steps)
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
