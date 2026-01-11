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
	MatrixRule,
	MatrixStep,
	MatrixOperationOptions,
	MatrixOperationResult
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

// Step Recorder
export { createMatrixStepRecorder, MatrixStepRecorderImpl } from './step-recorder';
export type { MatrixStepRecorder } from './step-recorder';
