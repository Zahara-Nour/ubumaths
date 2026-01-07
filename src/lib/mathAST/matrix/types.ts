/**
 * Matrix Types for MathAST
 *
 * Type definitions specific to matrix operations and representation.
 */

import type { NodeMetadata } from '../types';

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
 */
export type MatrixVerbosity = 'result' | 'summarized' | 'detailed';

/**
 * A single step in a matrix operation.
 */
export interface MatrixStep {
	readonly id: number;
	readonly rule: string;
	readonly description: string; // French
	readonly before: string; // LaTeX representation
	readonly after: string; // LaTeX representation
	readonly verbosityLevel: MatrixVerbosity;
	readonly detail?: string; // Additional computation detail
}

/**
 * Options for matrix operations with step recording.
 */
export interface MatrixOperationOptions {
	verbosity?: MatrixVerbosity;
}
