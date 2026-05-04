/**
 * Common utilities for mathAST modules
 *
 * @module mathAST/common
 */

// Constants
export {
	ZERO_TOLERANCE,
	EQUALITY_TOLERANCE,
	INFINITY_THRESHOLD,
	NUMERIC_DELTA
} from './constants.js';

// Formatting
export { formatNumber, cleanNumber } from './format.js';

// Numeric Evaluation
export {
	getNumericValue,
	numericNode,
	extractRational,
	evaluateNumeric,
	evaluateWithSubstitution
} from './numeric.js';

// Simplified Constructors
export {
	zero,
	one,
	negativeOne,
	simplifiedAdd,
	simplifiedSubtract,
	simplifiedMultiply,
	simplifiedDivide,
	simplifiedPower,
	simplifiedOpposite
} from './simplify.js';

// Verbosity
export { type Verbosity, VERBOSITY_ORDER, shouldIncludeStep } from './verbosity.js';

// Step Recorder Base
export { type BaseStep, type BaseStepRecorder, StepRecorderBase } from './step-recorder-base.js';

// Step Renderer Base (types only — safe to re-export, no runtime side effects)
export {
	type SchoolLevel,
	type RenderFormat,
	type RenderOptions,
	type PedagogicalRenderOptions,
	type RenderedStep,
	type StepRenderer
} from './step-renderer-base.js';

// =============================================================================
// NOT re-exported here — must be imported directly from their files:
//   - import { GenericTechnicalRenderer } from '$lib/mathAST/common/technical-renderer';
//   - import { rewrite, type EngineConfig, ... } from '$lib/mathAST/common/rewriting-engine';
//
// Background: re-exporting these from common/index.ts pulls in their runtime
// imports (latex-generator, pattern/rule, pattern/match) for every module that
// imports `from '../common'`. limits/ and domain/ modules do this for shared
// constants like ZERO_TOLERANCE, and that earlier load order causes
// reproducible failures in 50+ continuity/range/differentiability tests
// (a discontinuity in 1/x at 0 mis-classifies as 'essential' instead of
// 'infinite', because tryAlgebraicSimplification yields a subtly different
// limit value).
//
// The runtime modules involved (pattern/rule, pattern/match, normal/hash) are
// already loaded by limits/known-limits.ts and others in baseline, so the
// behavior is sensitive to the *order* of evaluation through Vitest's module
// graph rather than the modules themselves. Root cause not pinpointed within
// the MVP time budget; tests pass when consumers import these symbols
// directly. Investigation can resume when adding a future renderer/engine
// re-export.
// =============================================================================

// Variable Detection
export { containsVariable } from './contains-variable.js';

// Cooperative interruption
export {
	AbortError,
	checkAbort,
	makeAbortChecker,
	getActiveAbortChecker,
	withActiveAbortChecker,
	type AbortChecker
} from './abort.js';

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
