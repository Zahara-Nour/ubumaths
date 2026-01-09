/**
 * Step Recorder for Normalization
 *
 * Records transformation steps during simplification/normalization
 * for pedagogical display.
 *
 * @module mathAST/normal/step-recorder
 */

import type { MathNode } from '../types';
import type { NormalizationStep, NormalizationVerbosity } from './types';
import { hashMathNode } from './hash';
import { StepRecorderBase } from '../common/step-recorder-base.js';
import type { Verbosity } from '../common/verbosity.js';
import { getRuleDescription } from './rule-descriptions-fr.js';

// Re-export for backwards compatibility
export { getRuleDescription, RULE_DESCRIPTIONS } from './rule-descriptions-fr.js';

// =============================================================================
// Step Recorder Class
// =============================================================================

/**
 * Records normalization/simplification steps.
 *
 * Extends StepRecorderBase for common functionality (ID generation,
 * step storage, verbosity filtering).
 *
 * Features unique to NormalizationStepRecorder:
 * - Hash-based deduplication (only records if before !== after)
 * - Auto-description lookup from RULE_DESCRIPTIONS
 *
 * @example
 * const recorder = new StepRecorder();
 * recorder.recordStep('additive-identity', 'desc', before, after, 'detailed');
 * const steps = recorder.getSteps();
 */
export class StepRecorder extends StepRecorderBase<NormalizationStep, string> {
	/**
	 * Records a step with explicit verbosity level.
	 *
	 * Compares before and after using hash - only records if different.
	 *
	 * @param rule - Name of the rule applied
	 * @param description - Human-readable description in French
	 * @param before - AST before transformation
	 * @param after - AST after transformation
	 * @param verbosityLevel - Minimum verbosity to show this step
	 * @returns true if a step was recorded (transformation occurred)
	 */
	recordStep(
		rule: string,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: Verbosity = 'detailed'
	): boolean {
		const beforeHash = hashMathNode(before);
		const afterHash = hashMathNode(after);

		if (beforeHash === afterHash) {
			return false;
		}

		this.pushStep({
			id: this.nextId++,
			rule,
			description,
			before,
			after,
			verbosityLevel
		});

		return true;
	}

	/**
	 * Records a step using auto-lookup description.
	 *
	 * @param rule - Name of the rule applied
	 * @param before - AST before transformation
	 * @param after - AST after transformation
	 * @param verbosityLevel - Minimum verbosity to show this step (default: 'detailed')
	 * @returns true if a step was recorded (transformation occurred)
	 */
	recordStepByRule(
		rule: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: Verbosity = 'detailed'
	): boolean {
		return this.recordStep(rule, getRuleDescription(rule), before, after, verbosityLevel);
	}

	/**
	 * Records a step with custom description.
	 * @deprecated Use recordStep with explicit description instead
	 */
	recordStepWithDescription(
		rule: string,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: Verbosity = 'detailed'
	): boolean {
		return this.recordStep(rule, description, before, after, verbosityLevel);
	}
}

// =============================================================================
// Phase 1 Preprocessing with Step Recording
// =============================================================================

import { simplifyRadicals } from './rules/radicals.js';

/**
 * Applies Phase 1 preprocessing rules once, recording steps.
 *
 * Note: Arithmetic and power rules have been moved to Phase 2 (polynomial normalization).
 * Phase 1 now only handles radical combination rules that Phase 2 cannot do efficiently.
 *
 * @param node - The node to preprocess
 * @param recorder - Optional step recorder
 * @param verbosity - Verbosity level for recording (default: 'detailed')
 * @returns The preprocessed node
 */
export function preprocessOnceWithSteps(
	node: MathNode,
	recorder?: StepRecorder,
	verbosity: Verbosity = 'detailed'
): MathNode {
	// Apply radical rules (Phase 1)
	const result = simplifyRadicals(node);
	if (recorder && verbosity !== 'result') {
		recorder.recordStepByRule('radicals', node, result, verbosity);
	}

	return result;
}

/**
 * Preprocesses an expression to fixed point, recording all steps.
 *
 * @param node - The node to preprocess
 * @param verbosity - Verbosity level for recording (default: 'summarized')
 * @param maxIterations - Maximum number of iterations (default 100)
 * @returns Object with preprocessed node and recorded steps
 */
export function preprocessWithSteps(
	node: MathNode,
	verbosity: NormalizationVerbosity = 'summarized',
	maxIterations: number = 100
): { result: MathNode; steps: readonly NormalizationStep[] } {
	const recorder = new StepRecorder();
	let current = node;
	let currentHash = hashMathNode(current);

	for (let i = 0; i < maxIterations; i++) {
		const next = preprocessOnceWithSteps(current, recorder, verbosity);
		const nextHash = hashMathNode(next);

		// Fixed point reached
		if (nextHash === currentHash) {
			break;
		}

		current = next;
		currentHash = nextHash;
	}

	return {
		result: current,
		steps: recorder.getStepsFiltered(verbosity)
	};
}
