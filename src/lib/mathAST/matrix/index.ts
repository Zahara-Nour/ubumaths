/**
 * Matrix Module Index
 *
 * Exports all matrix-related types, operations, and utilities.
 *
 * @module mathAST/matrix
 */

// Types
export type {
	MatrixType,
	MatrixOptions,
	MatrixVerbosity,
	MatrixStep,
	MatrixOperationOptions
} from './types';
export { MatrixDimensionError, MatrixOperationError } from './types';

// Operations
export {
	getDimensions,
	matrixAdd,
	matrixSubtract,
	scalarMultiply,
	matrixMultiply,
	transpose,
	trace,
	determinant,
	inverse
} from './operations';

export type { MatrixDimensions } from './operations';
