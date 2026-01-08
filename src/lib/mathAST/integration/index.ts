/**
 * Integration Module
 *
 * Symbolic integration for mathematical expressions.
 *
 * @module mathAST/integration
 */

// =============================================================================
// Types
// =============================================================================

export type {
	IntegrandType,
	IntegrationTechnique,
	IntegrationStatus,
	IntegrationVerbosity,
	IntegrateStep,
	IntegrateResult,
	DefiniteIntegrateResult,
	IntegrateOptions,
	IntegrateStepRecorder,
	Integrator
} from './types';

export { DEFAULT_INTEGRATE_OPTIONS, IntegrationError } from './types';

// =============================================================================
// Step Recorder
// =============================================================================

export {
	IntegrationStepRecorderImpl,
	createStepRecorder,
	shouldIncludeStep
} from './step-recorder';

// =============================================================================
// Descriptions
// =============================================================================

export type { IntegrationRule } from './descriptions-fr';

export {
	getRuleDescription,
	describeCustomRule,
	describeIdentifyIntegrand,
	describePowerRule,
	describeConstantMultiple,
	describeUSubstitution,
	describeChooseUDv,
	describeComputeUV,
	describeApplyPartsFormula,
	describePartialFractions,
	describeTrigSubstitution,
	describeEvaluateBounds,
	describeFinalResult,
	describeNumericApproximation,
	CONSTANT_OF_INTEGRATION_NOTE,
	LIATE_RULE_DESCRIPTION
} from './descriptions-fr';

// =============================================================================
// Rules and Classification
// =============================================================================

export {
	zero,
	one,
	isZero,
	isOne,
	getNumericValue,
	numericNode,
	simplifiedAdd,
	simplifiedMultiply,
	simplifiedDivide,
	simplifiedPower,
	powerRule,
	constantRule,
	lnAbsRule,
	expRule,
	sinRule,
	cosRule,
	tanRule,
	containsVariable
} from './rules';

export { classifyIntegrand, detectVariable } from './classify';

// =============================================================================
// Pattern Matching
// =============================================================================

export type { USubstitutionMatch } from './patterns';
export { findUCandidates, matchUSubstitution, findProportionalityConstant } from './patterns';

// =============================================================================
// Integrators
// =============================================================================

export { basicIntegrator } from './integrators/basic';
export { uSubstitutionIntegrator, tryUSubstitution } from './integrators/u-substitution';
export { ALL_INTEGRATORS, selectIntegrator } from './integrators';

// =============================================================================
// Numeric Integration
// =============================================================================

export type { NumericResult, NumericIntegrateOptions } from './numeric';
export { simpson, adaptiveSimpson, numericIntegrate } from './numeric';

// =============================================================================
// Main Functions
// =============================================================================

export { integrate, integrateDefinite } from './integrate';
