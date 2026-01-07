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

// =============================================================================
// Verbosity Level Utilities
// =============================================================================

/**
 * Verbosity level ordering for filtering.
 */
const VERBOSITY_ORDER: Record<SolvingVerbosity, number> = {
	result: 0,
	summarized: 1,
	detailed: 2
};

/**
 * Check if a step should be included at a given verbosity level.
 */
export function shouldIncludeStep(
	stepVerbosity: SolvingVerbosity,
	requestedVerbosity: SolvingVerbosity
): boolean {
	return VERBOSITY_ORDER[stepVerbosity] <= VERBOSITY_ORDER[requestedVerbosity];
}

// =============================================================================
// Step Recorder Implementation
// =============================================================================

/**
 * Records steps during equation solving.
 *
 * @example
 * ```typescript
 * const recorder = new SolvingStepRecorderImpl();
 * recorder.recordStep('subtract-constant', 'On soustrait 3', before, after, 'detailed');
 * const steps = recorder.getStepsFiltered('summarized');
 * ```
 */
export class SolvingStepRecorderImpl implements SolveStepRecorder {
	private steps: SolveStep[] = [];
	private nextId = 1;

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
		const step: SolveStep = {
			id: this.nextId++,
			rule,
			description,
			before,
			after,
			verbosityLevel,
			operand,
			domainNote
		};

		this.steps.push(step);
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

	/**
	 * Get all recorded steps.
	 */
	getSteps(): readonly SolveStep[] {
		return this.steps;
	}

	/**
	 * Get steps filtered by verbosity level.
	 */
	getStepsFiltered(verbosity: SolvingVerbosity): readonly SolveStep[] {
		if (verbosity === 'result') {
			return [];
		}

		return this.steps.filter((step) => shouldIncludeStep(step.verbosityLevel, verbosity));
	}

	/**
	 * Clear all recorded steps.
	 */
	clear(): void {
		this.steps = [];
		this.nextId = 1;
	}

	/**
	 * Get the number of recorded steps.
	 */
	get length(): number {
		return this.steps.length;
	}
}

/**
 * Create a new step recorder.
 */
export function createStepRecorder(): SolveStepRecorder {
	return new SolvingStepRecorderImpl();
}
