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

// =============================================================================
// Verbosity Level Utilities
// =============================================================================

/**
 * Verbosity level ordering for filtering.
 */
const VERBOSITY_ORDER: Record<IntegrationVerbosity, number> = {
	result: 0,
	summarized: 1,
	detailed: 2
};

/**
 * Check if a step should be included at a given verbosity level.
 */
export function shouldIncludeStep(
	stepVerbosity: IntegrationVerbosity,
	requestedVerbosity: IntegrationVerbosity
): boolean {
	return VERBOSITY_ORDER[stepVerbosity] <= VERBOSITY_ORDER[requestedVerbosity];
}

// =============================================================================
// Step Recorder Implementation
// =============================================================================

/**
 * Records steps during integration.
 *
 * @example
 * ```typescript
 * const recorder = new IntegrationStepRecorderImpl();
 * recorder.recordStep('power-rule', 'On applique la regle des puissances', before, after, 'detailed');
 * const steps = recorder.getStepsFiltered('summarized');
 * ```
 */
export class IntegrationStepRecorderImpl implements IntegrateStepRecorder {
	private steps: IntegrateStep[] = [];
	private nextId = 1;

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
		const step: IntegrateStep = {
			id: this.nextId++,
			rule,
			description,
			before,
			after,
			verbosityLevel,
			operand,
			technicalNote
		};

		this.steps.push(step);
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

	/**
	 * Get all recorded steps.
	 */
	getSteps(): readonly IntegrateStep[] {
		return this.steps;
	}

	/**
	 * Get steps filtered by verbosity level.
	 */
	getStepsFiltered(verbosity: IntegrationVerbosity): readonly IntegrateStep[] {
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
 * Create a new integration step recorder.
 */
export function createStepRecorder(): IntegrateStepRecorder {
	return new IntegrationStepRecorderImpl();
}
