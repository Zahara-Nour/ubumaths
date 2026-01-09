/**
 * Step Recorder for Integration
 *
 * Records integration steps for pedagogical display.
 *
 * @module mathAST/integration/step-recorder
 */

import type { MathNode } from '../types';
import type { IntegrateStep, IntegrateStepRecorder, IntegrationVerbosity } from './types';
import type { IntegrationRule } from './descriptions-fr';
import { getRuleDescription, describeCustomRule } from './descriptions-fr';
import { StepRecorderBase } from '../common/step-recorder-base.js';
import { shouldIncludeStep as baseIncludeStep } from '../common/verbosity.js';

// =============================================================================
// Verbosity Level Utilities (re-exported for backwards compatibility)
// =============================================================================

/**
 * Check if a step should be included at a given verbosity level.
 * @deprecated Use shouldIncludeStep from '../common/verbosity' instead
 */
export function shouldIncludeStep(
	stepVerbosity: IntegrationVerbosity,
	requestedVerbosity: IntegrationVerbosity
): boolean {
	return baseIncludeStep(stepVerbosity, requestedVerbosity);
}

// =============================================================================
// Step Recorder Implementation
// =============================================================================

/**
 * Records steps during integration.
 *
 * Extends StepRecorderBase for common functionality (ID generation,
 * step storage, verbosity filtering).
 *
 * @example
 * ```typescript
 * const recorder = new IntegrationStepRecorderImpl();
 * recorder.recordStep('power-rule', 'On applique la regle des puissances', before, after, 'detailed');
 * const steps = recorder.getStepsFiltered('summarized');
 * ```
 */
export class IntegrationStepRecorderImpl
	extends StepRecorderBase<IntegrateStep, string>
	implements IntegrateStepRecorder
{
	/**
	 * Record an integration step.
	 *
	 * @param rule - The rule key (e.g., 'power-rule')
	 * @param description - Human-readable description in French
	 * @param before - Expression before transformation
	 * @param after - Expression after transformation
	 * @param verbosityLevel - Minimum verbosity to show this step
	 * @param operand - Value used in the operation (optional)
	 * @param technicalNote - Technical note (optional)
	 */
	recordStep(
		rule: string,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: IntegrationVerbosity,
		operand?: MathNode,
		technicalNote?: string
	): void {
		this.pushStep({
			id: this.nextId++,
			rule,
			description,
			before,
			after,
			verbosityLevel,
			operand,
			technicalNote
		});
	}

	/**
	 * Record a step using the default description for a known rule.
	 * Use this for typed rules from IntegrationRule.
	 */
	recordStepByRule(
		rule: IntegrationRule,
		before: MathNode,
		after: MathNode,
		verbosityLevel: IntegrationVerbosity,
		operand?: MathNode,
		technicalNote?: string
	): void {
		this.recordStep(
			rule,
			getRuleDescription(rule),
			before,
			after,
			verbosityLevel,
			operand,
			technicalNote
		);
	}

	/**
	 * Record a step using a custom rule name with fallback description.
	 * Use this for custom/unknown rule names.
	 */
	recordCustomStep(
		rule: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: IntegrationVerbosity,
		operand?: MathNode,
		technicalNote?: string
	): void {
		this.recordStep(
			rule,
			describeCustomRule(rule),
			before,
			after,
			verbosityLevel,
			operand,
			technicalNote
		);
	}
}

/**
 * Create a new integration step recorder.
 */
export function createStepRecorder(): IntegrateStepRecorder {
	return new IntegrationStepRecorderImpl();
}
