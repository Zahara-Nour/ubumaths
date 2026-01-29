/**
 * Domain Step Recorder
 *
 * Records domain computation steps for pedagogical display.
 * Lightweight recorder designed for domain-specific needs (no before/after AST).
 *
 * @module mathAST/domain/domain-step-recorder
 */

import type { Verbosity } from '../common/verbosity';
import { shouldIncludeStep } from '../common/verbosity';
import type { Domain } from './types';
import type { DomainRule, EnhancedDomainStep } from './enhanced-step-types';
import { getDomainRuleDescription, applyDomainRuleTemplate } from './step-descriptions';

// =============================================================================
// Step Recorder Interface
// =============================================================================

/**
 * Interface for recording domain computation steps.
 */
export interface DomainStepRecorder {
	/** Number of recorded steps */
	readonly length: number;

	/**
	 * Record a domain computation step.
	 *
	 * @param rule - The rule applied
	 * @param expression - LaTeX expression being analyzed
	 * @param constraint - LaTeX constraint applied
	 * @param options - Additional options
	 */
	record(
		rule: DomainRule,
		expression: string,
		constraint: string,
		options?: {
			intermediateDomain?: Domain;
			reasoning?: string;
			verbosityLevel?: Verbosity;
			description?: string;
		}
	): void;

	/**
	 * Record a step using a template with variable substitution.
	 *
	 * @param rule - The rule applied
	 * @param expression - LaTeX expression being analyzed
	 * @param constraint - LaTeX constraint applied
	 * @param templateValues - Values to substitute in the template
	 * @param options - Additional options
	 */
	recordWithTemplate(
		rule: DomainRule,
		expression: string,
		constraint: string,
		templateValues: Record<string, string>,
		options?: {
			intermediateDomain?: Domain;
			verbosityLevel?: Verbosity;
		}
	): void;

	/**
	 * Get all recorded steps.
	 */
	getSteps(): readonly EnhancedDomainStep[];

	/**
	 * Get steps filtered by verbosity level.
	 *
	 * @param verbosity - The requested verbosity level
	 * @returns Steps that should be shown at this verbosity level
	 */
	getStepsFiltered(verbosity: Verbosity): readonly EnhancedDomainStep[];

	/**
	 * Clear all recorded steps.
	 */
	clear(): void;
}

// =============================================================================
// Step Recorder Implementation
// =============================================================================

/**
 * Records steps during domain computation.
 *
 * This recorder is designed specifically for domain computation and differs
 * from the generic StepRecorderBase in that domain steps don't have
 * before/after AST nodes (they track constraints, not transformations).
 *
 * @example
 * ```typescript
 * const recorder = createDomainStepRecorder();
 *
 * recorder.record('sqrt_constraint', '\\sqrt{x - 2}', 'x - 2 \\geq 0', {
 *   intermediateDomain: intervalDomain([greaterThanOrEqual(fromNumber(2))]),
 *   verbosityLevel: 'summarized'
 * });
 *
 * const steps = recorder.getStepsFiltered('summarized');
 * ```
 */
class DomainStepRecorderImpl implements DomainStepRecorder {
	private steps: EnhancedDomainStep[] = [];
	private nextId = 1;

	/**
	 * Get the number of recorded steps.
	 */
	get length(): number {
		return this.steps.length;
	}

	/**
	 * Record a domain computation step.
	 */
	record(
		rule: DomainRule,
		expression: string,
		constraint: string,
		options: {
			intermediateDomain?: Domain;
			reasoning?: string;
			verbosityLevel?: Verbosity;
			description?: string;
		} = {}
	): void {
		const {
			intermediateDomain,
			reasoning,
			verbosityLevel = 'summarized',
			description = getDomainRuleDescription(rule)
		} = options;

		this.steps.push({
			id: this.nextId++,
			rule,
			description,
			expression,
			constraint,
			intermediateDomain,
			reasoning,
			verbosityLevel
		});
	}

	/**
	 * Record a step using a template with variable substitution.
	 */
	recordWithTemplate(
		rule: DomainRule,
		expression: string,
		constraint: string,
		templateValues: Record<string, string>,
		options: {
			intermediateDomain?: Domain;
			verbosityLevel?: Verbosity;
		} = {}
	): void {
		const reasoning = applyDomainRuleTemplate(rule, templateValues);

		this.record(rule, expression, constraint, {
			...options,
			reasoning
		});
	}

	/**
	 * Get all recorded steps.
	 */
	getSteps(): readonly EnhancedDomainStep[] {
		return this.steps;
	}

	/**
	 * Get steps filtered by verbosity level.
	 */
	getStepsFiltered(verbosity: Verbosity): readonly EnhancedDomainStep[] {
		if (verbosity === 'result') {
			return [];
		}

		return this.steps.filter((step) => shouldIncludeStep(step.verbosityLevel, verbosity));
	}

	/**
	 * Clear all recorded steps and reset ID counter.
	 */
	clear(): void {
		this.steps = [];
		this.nextId = 1;
	}
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new domain step recorder.
 *
 * @example
 * ```typescript
 * const recorder = createDomainStepRecorder();
 *
 * // Record a constraint step
 * recorder.record('sqrt_constraint', '\\sqrt{x - 2}', 'x \\geq 2', {
 *   intermediateDomain: intervalDomain([greaterThanOrEqual(fromNumber(2))]),
 *   verbosityLevel: 'summarized'
 * });
 *
 * // Record with template
 * recorder.recordWithTemplate('ln_constraint', '\\ln(x + 1)', 'x > -1',
 *   { expr: 'x + 1' },
 *   { verbosityLevel: 'detailed' }
 * );
 *
 * // Get filtered steps
 * const summary = recorder.getStepsFiltered('summarized');
 * const detailed = recorder.getStepsFiltered('detailed');
 * ```
 */
export function createDomainStepRecorder(): DomainStepRecorder {
	return new DomainStepRecorderImpl();
}

// =============================================================================
// Null Recorder (for when steps are not needed)
// =============================================================================

/**
 * A no-op recorder that does nothing.
 * Use this when step recording is disabled to avoid null checks.
 */
class NullDomainStepRecorder implements DomainStepRecorder {
	get length(): number {
		return 0;
	}

	record(): void {
		// No-op
	}

	recordWithTemplate(): void {
		// No-op
	}

	getSteps(): readonly EnhancedDomainStep[] {
		return [];
	}

	getStepsFiltered(): readonly EnhancedDomainStep[] {
		return [];
	}

	clear(): void {
		// No-op
	}
}

/** Singleton null recorder instance */
const NULL_RECORDER = new NullDomainStepRecorder();

/**
 * Get the null recorder (singleton).
 * Use this when step recording is disabled.
 */
export function getNullRecorder(): DomainStepRecorder {
	return NULL_RECORDER;
}
