/**
 * Step Recorder for Equation Solving
 *
 * Records solving steps for pedagogical display.
 *
 * @module mathAST/solve/step-recorder
 */

import type { MathNode } from '../types';
import type { SolveStep, SolveStepRecorder, SolvingVerbosity } from './types';
import { getRuleDescription } from './descriptions-fr';
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
	stepVerbosity: SolvingVerbosity,
	requestedVerbosity: SolvingVerbosity
): boolean {
	return baseIncludeStep(stepVerbosity, requestedVerbosity);
}

// =============================================================================
// Step Recorder Implementation
// =============================================================================

/**
 * Records steps during equation solving.
 *
 * Extends StepRecorderBase for common functionality (ID generation,
 * step storage, verbosity filtering).
 *
 * @example
 * ```typescript
 * const recorder = new SolvingStepRecorderImpl();
 * recorder.recordStep('subtract-constant', 'On soustrait 3', before, after, 'detailed');
 * const steps = recorder.getStepsFiltered('summarized');
 * ```
 */
export class SolvingStepRecorderImpl
	extends StepRecorderBase<SolveStep, string>
	implements SolveStepRecorder
{
	/**
	 * Record a solving step.
	 *
	 * @param rule - The rule key (e.g., 'subtract-constant')
	 * @param description - Human-readable description in French
	 * @param before - Expression before transformation
	 * @param after - Expression after transformation
	 * @param verbosityLevel - Minimum verbosity to show this step
	 * @param operand - Value used in the operation (optional)
	 * @param domainNote - Domain restriction note (optional)
	 */
	recordStep(
		rule: string,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: SolvingVerbosity,
		operand?: MathNode,
		domainNote?: string
	): void {
		this.pushStep({
			id: this.nextId++,
			rule,
			description,
			before,
			after,
			verbosityLevel,
			operand,
			domainNote
		});
	}

	/**
	 * Record a step using the default description for a rule.
	 */
	recordStepByRule(
		rule: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: SolvingVerbosity,
		operand?: MathNode,
		domainNote?: string
	): void {
		this.recordStep(
			rule,
			getRuleDescription(rule),
			before,
			after,
			verbosityLevel,
			operand,
			domainNote
		);
	}
}

/**
 * Create a new step recorder.
 */
export function createStepRecorder(): SolveStepRecorder {
	return new SolvingStepRecorderImpl();
}
