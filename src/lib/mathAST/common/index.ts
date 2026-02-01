/**
 * Common utilities for mathAST modules
 *
 * @module mathAST/common
 */

// Verbosity
export { type Verbosity, VERBOSITY_ORDER, shouldIncludeStep } from './verbosity.js';

// Step Recorder Base
export { type BaseStep, type BaseStepRecorder, StepRecorderBase } from './step-recorder-base.js';

// Periodic Functions
export {
	type PeriodicFunctionInfo,
	type PeriodicPattern,
	type EnumerationOptions,
	type EnumeratedPoint,
	PERIODIC_FUNCTIONS,
	isPeriodicTrigFunction,
	getPeriodicFunctionInfo,
	getPeriodicFunctionNames,
	getPeriodicPattern,
	enumerateDiscontinuityPoints,
	isDiscontinuityPoint,
	piOverTwo,
	pi
} from './periodic-functions.js';
