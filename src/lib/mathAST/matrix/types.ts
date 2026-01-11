/**
 * Matrix Types for MathAST
 *
 * Type definitions specific to matrix operations and representation.
 */

import type { NodeMetadata } from '../types';
import type { Verbosity } from '../common/verbosity';
import type { BaseStep } from '../common/step-recorder-base';

// =============================================================================
// Matrix Display Type
// =============================================================================

/**
 * Matrix display type determines how the matrix is rendered in LaTeX.
 *
 * - 'plain': No delimiters (matrix environment)
 * - 'pmatrix': Parentheses ()
 * - 'bmatrix': Brackets []
 * - 'Bmatrix': Braces {}
 * - 'vmatrix': Single vertical bars || (determinant)
 * - 'Vmatrix': Double vertical bars |||| (norm)
 * - 'smallmatrix': Inline small matrix
 */
export type MatrixType =
	| 'plain'
	| 'pmatrix'
	| 'bmatrix'
	| 'Bmatrix'
	| 'vmatrix'
	| 'Vmatrix'
	| 'smallmatrix';

// =============================================================================
// Matrix Options
// =============================================================================

/**
 * Options for creating matrix nodes
 */
export interface MatrixOptions {
	matrixType?: MatrixType;
	metadata?: NodeMetadata;
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when matrix dimensions are incompatible for an operation.
 */
export class MatrixDimensionError extends Error {
	readonly name = 'MatrixDimensionError';

	constructor(
		message: string,
		public readonly expectedRows?: number,
		public readonly expectedCols?: number,
		public readonly actualRows?: number,
		public readonly actualCols?: number
	) {
		super(message);
		// Restore prototype chain (needed for instanceof to work correctly)
		Object.setPrototypeOf(this, MatrixDimensionError.prototype);
	}
}

/**
 * Error thrown when a matrix operation is invalid.
 */
export class MatrixOperationError extends Error {
	readonly name = 'MatrixOperationError';

	constructor(
		message: string,
		public readonly operation: string,
		public readonly details?: string
	) {
		super(message);
		Object.setPrototypeOf(this, MatrixOperationError.prototype);
	}
}

// =============================================================================
// Step Recording Types (for pedagogical output)
// =============================================================================

/**
 * Verbosity levels for pedagogical step output.
 * Alias to the common Verbosity type for backwards compatibility.
 */
export type MatrixVerbosity = Verbosity;

/**
 * Rule identifiers for matrix operations.
 * Used to identify the type of step in pedagogical output.
 */
export type MatrixRule =
	// Determinant rules
	| 'identify-matrix-size'
	| 'det-1x1'
	| 'det-2x2-formula'
	| 'det-cofactor-expansion'
	| 'compute-minor'
	| 'compute-cofactor'
	| 'sum-cofactors'
	| 'det-result'
	// Inverse rules
	| 'check-determinant'
	| 'inverse-2x2-formula'
	| 'augment-identity'
	| 'row-swap'
	| 'row-scale'
	| 'row-add'
	| 'extract-inverse'
	| 'inverse-result';

/**
 * A single step in a matrix operation.
 * Extends BaseStep with optional matrix state for visualizing intermediate results.
 */
export interface MatrixStep extends BaseStep<MatrixRule> {
	/**
	 * LaTeX representation of the matrix state at this step.
	 * Used for inverse operations to show the augmented matrix [A|I].
	 */
	readonly matrixState?: string;
}

/**
 * Result of a matrix operation with pedagogical steps.
 */
export interface MatrixOperationResult<T> {
	readonly result: T;
	readonly steps: readonly MatrixStep[];
}

/**
 * Options for matrix operations with step recording.
 */
export interface MatrixOperationOptions {
	readonly verbosity?: Verbosity;
}
