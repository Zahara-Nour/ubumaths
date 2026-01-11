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

import type { MathNode, MatrixNode } from '../types';
import type { MatrixOperationOptions, MatrixOperationResult } from './types';
import type { Verbosity } from '../common/verbosity';
import type { NormalForm } from '../normal/types';
import { matrix, number, add, subtract, multiply, divide, opposite } from '../factory';
import { MatrixDimensionError, MatrixOperationError } from './types';
import { normalize } from '../normal/normalize';
import { denormalize } from '../normal/denormalize';
import { isZeroPolynomial, isOnePolynomial } from '../normal/polynomial';
import { toLatex } from '../latex-generator';
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
// Symbolic Computation Helpers
// =============================================================================

/**
 * Simplify a MathNode by normalizing and denormalizing.
 * This performs exact arithmetic on numeric expressions.
 */
function simplify(node: MathNode): MathNode {
	return denormalize(normalize(node));
}

/**
 * Check if a NormalForm represents zero (exact detection)
 */
function isZeroForm(form: NormalForm): boolean {
	return isZeroPolynomial(form.numerator);
}

/**
 * Check if a NormalForm represents one
 */
function isOneForm(form: NormalForm): boolean {
	return isOnePolynomial(form.numerator) && isOnePolynomial(form.denominator);
}

/**
 * Format a MathNode for display in step descriptions
 */
function formatNode(node: MathNode): string {
	return toLatex(node);
}

// =============================================================================
// Basic Operations
// =============================================================================

/**
 * Add two matrices element-wise
 *
 * Uses exact arithmetic via normalize/denormalize for precise results.
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
			// Create symbolic addition and simplify with exact arithmetic
			const sum = add(a.rows[i][j], b.rows[i][j]);
			row.push(simplify(sum));
		}
		resultRows.push(row);
	}

	return matrix(resultRows, { matrixType: a.matrixType });
}

/**
 * Subtract matrix b from matrix a element-wise
 *
 * Uses exact arithmetic via normalize/denormalize for precise results.
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
			// Create symbolic subtraction and simplify with exact arithmetic
			const diff = subtract(a.rows[i][j], b.rows[i][j]);
			row.push(simplify(diff));
		}
		resultRows.push(row);
	}

	return matrix(resultRows, { matrixType: a.matrixType });
}

/**
 * Multiply a matrix by a scalar
 *
 * Uses exact arithmetic via normalize/denormalize for precise results.
 */
export function scalarMultiply(scalar: MathNode, m: MatrixNode): MatrixNode {
	const resultRows: MathNode[][] = [];
	for (let i = 0; i < m.rows.length; i++) {
		const row: MathNode[] = [];
		for (let j = 0; j < m.rows[i].length; j++) {
			// Create symbolic multiplication and simplify with exact arithmetic
			const prod = multiply(scalar, m.rows[i][j], 'implicit');
			row.push(simplify(prod));
		}
		resultRows.push(row);
	}

	return matrix(resultRows, { matrixType: m.matrixType });
}

/**
 * Multiply two matrices
 *
 * Uses exact arithmetic via normalize/denormalize for precise results.
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
			// Build sum: a[i,0]*b[0,j] + a[i,1]*b[1,j] + ...
			let element: MathNode | null = null;
			for (let k = 0; k < dimA.cols; k++) {
				const term = multiply(a.rows[i][k], b.rows[k][j], 'implicit');
				element = element === null ? term : add(element, term);
			}
			// Simplify with exact arithmetic
			row.push(simplify(element!));
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
 * Uses exact arithmetic via normalize/denormalize for precise results.
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

	// Build sum symbolically: m[0][0] + m[1][1] + ... + m[n-1][n-1]
	let sum: MathNode | null = null;
	for (let i = 0; i < m.rows.length; i++) {
		sum = sum === null ? m.rows[i][i] : add(sum, m.rows[i][i]);
	}

	// Simplify with exact arithmetic
	return simplify(sum!);
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
 * Get the minor matrix (remove row i and column j) from a MatrixNode
 */
function getMinorMatrix(m: MatrixNode, rowToRemove: number, colToRemove: number): MatrixNode {
	const rows: MathNode[][] = [];
	for (let i = 0; i < m.rows.length; i++) {
		if (i === rowToRemove) continue;
		const row: MathNode[] = [];
		for (let j = 0; j < m.rows[i].length; j++) {
			if (j === colToRemove) continue;
			row.push(m.rows[i][j]);
		}
		rows.push(row);
	}
	return matrix(rows, { matrixType: m.matrixType });
}

/**
 * Compute determinant without step recording (internal)
 *
 * Uses exact arithmetic via normalize/denormalize for precise results.
 */
function computeDeterminant(m: MatrixNode): MathNode {
	const n = m.rows.length;

	// 1x1 case
	if (n === 1) {
		return m.rows[0][0];
	}

	// 2x2 case: ad - bc (symbolic then simplified)
	if (n === 2) {
		const ad = multiply(m.rows[0][0], m.rows[1][1], 'implicit');
		const bc = multiply(m.rows[0][1], m.rows[1][0], 'implicit');
		const det = subtract(ad, bc);
		return simplify(det);
	}

	// General case: cofactor expansion along first row
	let result: MathNode | null = null;
	for (let j = 0; j < n; j++) {
		const minorMatrix = getMinorMatrix(m, 0, j);
		const minorDet = computeDeterminant(minorMatrix);
		const term = multiply(m.rows[0][j], minorDet, 'implicit');
		// Alternate sign: +, -, +, -, ...
		const signedTerm = j % 2 === 0 ? term : opposite(term);
		result = result === null ? signedTerm : add(result, signedTerm);
	}

	return simplify(result!);
}

/**
 * Compute determinant with step recording (internal)
 *
 * Uses exact arithmetic via normalize/denormalize for precise results.
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
		recorder.recordStep('det-1x1', `det(A) = ${formatNode(result)}`, m, result, 'summarized');
		return result;
	}

	// 2x2 case: ad - bc (symbolic then simplified)
	if (n === 2) {
		const a = m.rows[0][0];
		const b = m.rows[0][1];
		const c = m.rows[1][0];
		const d = m.rows[1][1];

		// Compute symbolically
		const ad = multiply(a, d, 'implicit');
		const bc = multiply(b, c, 'implicit');
		const det = subtract(ad, bc);
		const result = simplify(det);

		// Step: apply 2x2 formula (summarized)
		recorder.recordStep(
			'det-2x2-formula',
			describeDet2x2(formatNode(a), formatNode(b), formatNode(c), formatNode(d)),
			m,
			result,
			'summarized'
		);

		// Step: detailed computation (detailed only)
		if (verbosity === 'detailed') {
			const adSimplified = simplify(ad);
			const bcSimplified = simplify(bc);
			recorder.recordStep(
				'det-result',
				`det = ${formatNode(a)} \\times ${formatNode(d)} - ${formatNode(b)} \\times ${formatNode(c)} = ${formatNode(adSimplified)} - ${formatNode(bcSimplified)} = ${formatNode(result)}`,
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
 *
 * Uses exact arithmetic via normalize/denormalize for precise results.
 */
function computeDeterminantCofactorWithSteps(
	m: MatrixNode,
	recorder: MatrixStepRecorderImpl,
	verbosity: Verbosity
): MathNode {
	const n = m.rows.length;

	// Step: cofactor expansion announcement (summarized)
	recorder.recordStep('det-cofactor-expansion', describeCofactorExpansion(n), m, m, 'summarized');

	// Compute each cofactor symbolically
	const cofactorTerms: string[] = [];
	let detExpr: MathNode | null = null;

	for (let j = 0; j < n; j++) {
		const signStr = j % 2 === 0 ? '+' : '-';
		const element = m.rows[0][j];
		const minorMatrix = getMinorMatrix(m, 0, j);
		const minorDet = computeDeterminant(minorMatrix);
		const minorDetSimplified = simplify(minorDet);

		// Build term: element * minorDet (with sign)
		const term = multiply(element, minorDetSimplified, 'implicit');
		const signedTerm = j % 2 === 0 ? term : opposite(term);
		detExpr = detExpr === null ? signedTerm : add(detExpr, signedTerm);

		// Build term string for display
		cofactorTerms.push(
			`${signStr === '-' ? '-' : j > 0 ? '+' : ''}${formatNode(element)} \\times ${formatNode(minorDetSimplified)}`
		);

		// Step: compute minor (detailed only)
		if (verbosity === 'detailed') {
			recorder.recordStep(
				'compute-minor',
				describeMinor(0, j) + ` = ${formatNode(minorDetSimplified)}`,
				m,
				minorDetSimplified,
				'detailed'
			);

			const cofactorValue =
				j % 2 === 0 ? minorDetSimplified : simplify(opposite(minorDetSimplified));
			const termValue = simplify(signedTerm);
			recorder.recordStep(
				'compute-cofactor',
				describeCofactor(0, j, formatNode(cofactorValue)) +
					` => terme: ${formatNode(element)} \\times ${formatNode(cofactorValue)} = ${formatNode(termValue)}`,
				m,
				termValue,
				'detailed'
			);
		}
	}

	const result = simplify(detExpr!);

	// Step: sum cofactors (summarized)
	recorder.recordStep(
		'sum-cofactors',
		describeSumCofactors(cofactorTerms) + ` = ${formatNode(result)}`,
		m,
		result,
		'summarized'
	);

	// Step: final result (summarized)
	recorder.recordStep('det-result', describeDetResult(formatNode(result)), m, result, 'summarized');

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
 *
 * Uses exact arithmetic via normalize/denormalize for precise results.
 */
function computeInverse(m: MatrixNode): MatrixNode {
	const n = m.rows.length;

	// Compute determinant symbolically
	const det = computeDeterminant(m);
	const detForm = normalize(det);

	if (isZeroForm(detForm)) {
		throw new MatrixOperationError(
			'Matrix is singular (determinant = 0), inverse does not exist',
			'inverse',
			'Singular matrix'
		);
	}

	// 2x2 case: A^{-1} = (1/det) * [[d, -b], [-c, a]]
	if (n === 2) {
		const a = m.rows[0][0];
		const b = m.rows[0][1];
		const c = m.rows[1][0];
		const d = m.rows[1][1];

		const resultRows: MathNode[][] = [
			[simplify(divide(d, det, 'fraction')), simplify(divide(opposite(b), det, 'fraction'))],
			[simplify(divide(opposite(c), det, 'fraction')), simplify(divide(a, det, 'fraction'))]
		];

		return matrix(resultRows, { matrixType: m.matrixType });
	}

	// General case: Gauss-Jordan elimination with exact arithmetic
	return gaussJordanInverseSymbolic(m);
}

/**
 * Compute inverse with step recording (internal)
 *
 * Uses exact arithmetic via normalize/denormalize for precise results.
 */
function computeInverseWithSteps(
	m: MatrixNode,
	recorder: MatrixStepRecorderImpl,
	verbosity: Verbosity
): MatrixNode {
	const n = m.rows.length;

	// Compute determinant symbolically
	const det = computeDeterminant(m);
	const detForm = normalize(det);

	// Step: check determinant (summarized)
	recorder.recordStep('check-determinant', describeCheckDet(formatNode(det)), m, m, 'summarized');

	if (isZeroForm(detForm)) {
		throw new MatrixOperationError(
			'Matrix is singular (determinant = 0), inverse does not exist',
			'inverse',
			'Singular matrix'
		);
	}

	// 2x2 case: direct formula
	if (n === 2) {
		return computeInverse2x2WithSteps(m, det, recorder, verbosity);
	}

	// General case: Gauss-Jordan elimination
	return computeInverseGaussJordanWithSteps(m, recorder, verbosity);
}

/**
 * Compute 2x2 inverse with steps
 *
 * Uses exact arithmetic via normalize/denormalize for precise results.
 */
function computeInverse2x2WithSteps(
	m: MatrixNode,
	det: MathNode,
	recorder: MatrixStepRecorderImpl,
	verbosity: Verbosity
): MatrixNode {
	const a = m.rows[0][0];
	const b = m.rows[0][1];
	const c = m.rows[1][0];
	const d = m.rows[1][1];

	// Step: apply 2x2 formula (summarized)
	recorder.recordStep(
		'inverse-2x2-formula',
		describeInverse2x2(formatNode(det)),
		m,
		m,
		'summarized'
	);

	// A^{-1} = (1/det) * [[d, -b], [-c, a]]
	const resultRows: MathNode[][] = [
		[simplify(divide(d, det, 'fraction')), simplify(divide(opposite(b), det, 'fraction'))],
		[simplify(divide(opposite(c), det, 'fraction')), simplify(divide(a, det, 'fraction'))]
	];

	const result = matrix(resultRows, { matrixType: m.matrixType });

	// Step: show result (detailed)
	if (verbosity === 'detailed') {
		recorder.recordStep(
			'inverse-result',
			`A^{-1} = (1/${formatNode(det)}) \\times [[${formatNode(d)}, ${formatNode(opposite(b))}], [${formatNode(opposite(c))}, ${formatNode(a)}]]`,
			m,
			result,
			'detailed'
		);
	}

	return result;
}

/**
 * Compute inverse using Gauss-Jordan with steps
 *
 * Uses exact arithmetic via normalize/denormalize for precise results.
 */
function computeInverseGaussJordanWithSteps(
	m: MatrixNode,
	recorder: MatrixStepRecorderImpl,
	verbosity: Verbosity
): MatrixNode {
	const n = m.rows.length;

	// Create augmented matrix [m | I] as MathNode[][]
	const augmented: MathNode[][] = [];
	for (let i = 0; i < n; i++) {
		const row: MathNode[] = [...m.rows[i]];
		for (let j = 0; j < n; j++) {
			row.push(i === j ? number('1') : number('0'));
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
			formatAugmentedMatrixSymbolic(augmented, n)
		);
	}

	// Forward elimination with partial pivoting
	for (let col = 0; col < n; col++) {
		// Find first non-zero pivot in column
		let pivotRow = -1;
		for (let row = col; row < n; row++) {
			const form = normalize(augmented[row][col]);
			if (!isZeroForm(form)) {
				pivotRow = row;
				break;
			}
		}

		if (pivotRow === -1) {
			throw new MatrixOperationError(
				'Matrix is singular during Gauss-Jordan elimination',
				'inverse',
				'Zero pivot encountered'
			);
		}

		// Swap rows if needed
		if (pivotRow !== col) {
			[augmented[col], augmented[pivotRow]] = [augmented[pivotRow], augmented[col]];

			// Step: row swap (summarized)
			recorder.recordStep('row-swap', describeRowSwap(col, pivotRow), m, m, 'summarized');

			// Show matrix after swap (detailed)
			if (verbosity === 'detailed') {
				recorder.recordStep(
					'row-swap',
					`Apres ${describeRowSwap(col, pivotRow)}:`,
					m,
					m,
					'detailed',
					formatAugmentedMatrixSymbolic(augmented, n)
				);
			}
		}

		const pivot = augmented[col][col];
		const pivotForm = normalize(pivot);

		// Scale pivot row if pivot is not 1
		if (!isOneForm(pivotForm)) {
			// scaleFactor = 1/pivot
			for (let j = 0; j < 2 * n; j++) {
				augmented[col][j] = simplify(divide(augmented[col][j], pivot, 'fraction'));
			}

			// Step: row scale (summarized)
			const scaleFactorDisplay = formatNode(simplify(divide(number('1'), pivot, 'fraction')));
			recorder.recordStep(
				'row-scale',
				describeRowScale(col, scaleFactorDisplay),
				m,
				m,
				'summarized'
			);

			// Show matrix after scale (detailed)
			if (verbosity === 'detailed') {
				recorder.recordStep(
					'row-scale',
					`Apres ${describeRowScale(col, scaleFactorDisplay)}:`,
					m,
					m,
					'detailed',
					formatAugmentedMatrixSymbolic(augmented, n)
				);
			}
		}

		// Eliminate column
		for (let row = 0; row < n; row++) {
			if (row !== col) {
				const factor = augmented[row][col];
				const factorForm = normalize(factor);

				if (!isZeroForm(factorForm)) {
					// row = row - factor * pivotRow
					for (let j = 0; j < 2 * n; j++) {
						const term = multiply(factor, augmented[col][j], 'implicit');
						augmented[row][j] = simplify(subtract(augmented[row][j], term));
					}

					// Step: row add (summarized)
					const negFactor = simplify(opposite(factor));
					recorder.recordStep(
						'row-add',
						describeRowAdd(row, col, formatNode(negFactor)),
						m,
						m,
						'summarized'
					);

					// Show matrix after row add (detailed)
					if (verbosity === 'detailed') {
						recorder.recordStep(
							'row-add',
							`Apres ${describeRowAdd(row, col, formatNode(negFactor))}:`,
							m,
							m,
							'detailed',
							formatAugmentedMatrixSymbolic(augmented, n)
						);
					}
				}
			}
		}
	}

	// Extract inverse (right half of augmented matrix)
	const resultRows: MathNode[][] = [];
	for (let i = 0; i < n; i++) {
		resultRows.push(augmented[i].slice(n));
	}

	const result = matrix(resultRows, { matrixType: m.matrixType });

	// Step: extract inverse (summarized)
	recorder.recordStep('extract-inverse', describeExtractInverse(), m, result, 'summarized');

	return result;
}

/**
 * Format augmented matrix as LaTeX string for display (symbolic version)
 */
function formatAugmentedMatrixSymbolic(augmented: MathNode[][], n: number): string {
	const rows = augmented.map((row) => {
		const left = row
			.slice(0, n)
			.map((v) => formatNode(v))
			.join(' & ');
		const right = row
			.slice(n)
			.map((v) => formatNode(v))
			.join(' & ');
		return `${left} & | & ${right}`;
	});
	return `\\begin{pmatrix} ${rows.join(' \\\\ ')} \\end{pmatrix}`;
}

/**
 * Compute matrix inverse using Gauss-Jordan elimination (no steps)
 *
 * Uses exact arithmetic via normalize/denormalize for precise results.
 */
function gaussJordanInverseSymbolic(m: MatrixNode): MatrixNode {
	const n = m.rows.length;

	// Create augmented matrix [m | I] as MathNode[][]
	const augmented: MathNode[][] = [];
	for (let i = 0; i < n; i++) {
		const row: MathNode[] = [...m.rows[i]];
		for (let j = 0; j < n; j++) {
			row.push(i === j ? number('1') : number('0'));
		}
		augmented.push(row);
	}

	// Forward elimination with partial pivoting
	for (let col = 0; col < n; col++) {
		// Find first non-zero pivot in column
		let pivotRow = -1;
		for (let row = col; row < n; row++) {
			const form = normalize(augmented[row][col]);
			if (!isZeroForm(form)) {
				pivotRow = row;
				break;
			}
		}

		if (pivotRow === -1) {
			throw new MatrixOperationError(
				'Matrix is singular during Gauss-Jordan elimination',
				'inverse',
				'Zero pivot encountered'
			);
		}

		// Swap rows if needed
		if (pivotRow !== col) {
			[augmented[col], augmented[pivotRow]] = [augmented[pivotRow], augmented[col]];
		}

		const pivot = augmented[col][col];
		const pivotForm = normalize(pivot);

		// Scale pivot row if pivot is not 1
		if (!isOneForm(pivotForm)) {
			for (let j = 0; j < 2 * n; j++) {
				augmented[col][j] = simplify(divide(augmented[col][j], pivot, 'fraction'));
			}
		}

		// Eliminate column
		for (let row = 0; row < n; row++) {
			if (row !== col) {
				const factor = augmented[row][col];
				const factorForm = normalize(factor);

				if (!isZeroForm(factorForm)) {
					// row = row - factor * pivotRow
					for (let j = 0; j < 2 * n; j++) {
						const term = multiply(factor, augmented[col][j], 'implicit');
						augmented[row][j] = simplify(subtract(augmented[row][j], term));
					}
				}
			}
		}
	}

	// Extract inverse (right half of augmented matrix)
	const resultRows: MathNode[][] = [];
	for (let i = 0; i < n; i++) {
		resultRows.push(augmented[i].slice(n));
	}

	return matrix(resultRows, { matrixType: m.matrixType });
}
