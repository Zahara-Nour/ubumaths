/**
 * Step Recorder for Limit Evaluation
 *
 * Records limit evaluation steps for pedagogical display.
 *
 * @module mathAST/limits/step-recorder
 */

import type { MathNode } from '../types';
import type { LimitStep, LimitVerbosity, LimitRule } from './types';
import { StepRecorderBase } from '../common/step-recorder-base.js';
import { shouldIncludeStep as baseIncludeStep } from '../common/verbosity.js';

// =============================================================================
// French Descriptions
// =============================================================================

/**
 * French descriptions for limit rules.
 */
const RULE_DESCRIPTIONS: Readonly<Record<LimitRule, string>> = {
	'known-limit': "Application d'une limite connue",
	'direct-substitution': 'Substitution directe',
	factorization: 'Factorisation et simplification',
	rationalization: 'Rationalisation (multiplication par le conjugué)',
	lhopital: "Application de la règle de L'Hôpital",
	squeeze: 'Application du théorème des gendarmes',
	'algebraic-simplification': 'Simplification algébrique',
	'infinity-analysis': "Analyse du comportement à l'infini",
	'one-sided': 'Analyse des limites à gauche et à droite',
	linearity: 'Linéarité de la limite',
	product: "Limite d'un produit",
	quotient: "Limite d'un quotient",
	composition: "Limite d'une composée"
};

/**
 * Get the French description for a limit rule.
 */
export function getRuleDescription(rule: LimitRule): string {
	return RULE_DESCRIPTIONS[rule];
}

/**
 * Get a description for a custom rule.
 */
export function describeCustomRule(rule: string): string {
	return `Application de la règle : ${rule}`;
}

// =============================================================================
// Verbosity Level Utilities (re-exported for backwards compatibility)
// =============================================================================

/**
 * Check if a step should be included at a given verbosity level.
 * @deprecated Use shouldIncludeStep from '../common/verbosity' instead
 */
export function shouldIncludeStep(
	stepVerbosity: LimitVerbosity,
	requestedVerbosity: LimitVerbosity
): boolean {
	return baseIncludeStep(stepVerbosity, requestedVerbosity);
}

// =============================================================================
// Step Recorder Interface
// =============================================================================

/**
 * Interface for recording steps during limit evaluation.
 */
export interface LimitStepRecorder {
	/** Number of recorded steps */
	readonly length: number;

	/**
	 * Record a limit evaluation step.
	 */
	recordStep(
		rule: LimitRule,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: LimitVerbosity,
		operand?: MathNode,
		technicalNote?: string
	): void;

	/**
	 * Record a step using the default description for a rule.
	 */
	recordStepByRule(
		rule: LimitRule,
		before: MathNode,
		after: MathNode,
		verbosityLevel: LimitVerbosity,
		operand?: MathNode,
		technicalNote?: string
	): void;

	/**
	 * Record a step with a custom rule name.
	 */
	recordCustomStep(
		rule: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: LimitVerbosity,
		operand?: MathNode,
		technicalNote?: string
	): void;

	/**
	 * Get all recorded steps.
	 */
	getSteps(): readonly LimitStep[];

	/**
	 * Get steps filtered by verbosity level.
	 */
	getStepsFiltered(verbosity: LimitVerbosity): readonly LimitStep[];

	/**
	 * Clear all recorded steps.
	 */
	clear(): void;
}

// =============================================================================
// Step Recorder Implementation
// =============================================================================

/**
 * Records steps during limit evaluation.
 *
 * Extends StepRecorderBase for common functionality (ID generation,
 * step storage, verbosity filtering).
 *
 * @example
 * ```typescript
 * const recorder = createStepRecorder();
 * recorder.recordStepByRule('known-limit', before, after, 'summarized');
 * const steps = recorder.getStepsFiltered('summarized');
 * ```
 */
export class LimitStepRecorderImpl
	extends StepRecorderBase<LimitStep, LimitRule>
	implements LimitStepRecorder
{
	/**
	 * Record a limit evaluation step.
	 *
	 * @param rule - The rule applied
	 * @param description - Human-readable description in French
	 * @param before - Expression before transformation
	 * @param after - Expression after transformation
	 * @param verbosityLevel - Minimum verbosity to show this step
	 * @param operand - Value used in the operation (optional)
	 * @param technicalNote - Technical note (optional)
	 */
	recordStep(
		rule: LimitRule,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: LimitVerbosity,
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
	 * Record a step using the default description for a rule.
	 */
	recordStepByRule(
		rule: LimitRule,
		before: MathNode,
		after: MathNode,
		verbosityLevel: LimitVerbosity,
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
	 * Record a step with a custom rule name.
	 */
	recordCustomStep(
		rule: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: LimitVerbosity,
		operand?: MathNode,
		technicalNote?: string
	): void {
		this.pushStep({
			id: this.nextId++,
			rule: rule as LimitRule,
			description: describeCustomRule(rule),
			before,
			after,
			verbosityLevel,
			operand,
			technicalNote
		});
	}
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new limit step recorder.
 *
 * @example
 * ```typescript
 * const recorder = createStepRecorder();
 * recorder.recordStepByRule('known-limit', before, after, 'summarized');
 * ```
 */
export function createStepRecorder(): LimitStepRecorder {
	return new LimitStepRecorderImpl();
}
