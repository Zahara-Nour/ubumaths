/**
 * Base Step Recorder
 *
 * Generic base class and interfaces for step recording across all mathAST modules
 * (normalization, limits, integration, solve).
 *
 * @module mathAST/common/step-recorder-base
 */

import type { MathNode } from '../types';
import type { Verbosity } from './verbosity';
import { shouldIncludeStep } from './verbosity';

// =============================================================================
// Base Step Interface
// =============================================================================

/**
 * Base interface for a recorded step.
 *
 * All step types (NormalizationStep, LimitStep, IntegrateStep, SolveStep)
 * extend this interface with their specific fields.
 *
 * @typeParam Rule - The type of rule identifier (typically a string union)
 */
export interface BaseStep<Rule extends string = string> {
	/** Unique identifier for this step */
	readonly id: number;

	/** Name of the rule applied */
	readonly rule: Rule;

	/** Human-readable description in French */
	readonly description: string;

	/** AST before the transformation */
	readonly before: MathNode;

	/** AST after the transformation */
	readonly after: MathNode;

	/** Minimum verbosity level to show this step */
	readonly verbosityLevel: Verbosity;
}

// =============================================================================
// Base Recorder Interface
// =============================================================================

/**
 * Base interface for step recorders.
 *
 * @typeParam S - The step type (extends BaseStep)
 * @typeParam R - The rule type (string union)
 */
export interface BaseStepRecorder<S extends BaseStep<R>, R extends string = string> {
	/** Number of recorded steps */
	readonly length: number;

	/**
	 * Record a step with explicit description.
	 */
	recordStep(
		rule: R,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: Verbosity
	): void;

	/**
	 * Get all recorded steps.
	 */
	getSteps(): readonly S[];

	/**
	 * Get steps filtered by verbosity level.
	 *
	 * @param verbosity - The requested verbosity level
	 * @returns Steps that should be shown at this verbosity level
	 */
	getStepsFiltered(verbosity: Verbosity): readonly S[];

	/**
	 * Clear all recorded steps.
	 */
	clear(): void;
}

// =============================================================================
// Base Recorder Implementation
// =============================================================================

/**
 * Abstract base class for step recorders.
 *
 * Provides common functionality for all step recorders:
 * - ID generation
 * - Step storage
 * - Verbosity filtering
 * - Clear functionality
 *
 * Subclasses must implement:
 * - `recordStep()` to create their specific step type
 * - Optionally `recordStepByRule()` for auto-description lookup
 *
 * @typeParam S - The step type (extends BaseStep)
 * @typeParam R - The rule type (string union)
 *
 * @example
 * ```typescript
 * class MyStepRecorder extends StepRecorderBase<MyStep, MyRule> {
 *   recordStep(rule: MyRule, description: string, before: MathNode,
 *              after: MathNode, verbosityLevel: Verbosity): void {
 *     this.pushStep({
 *       id: this.nextId++,
 *       rule,
 *       description,
 *       before,
 *       after,
 *       verbosityLevel,
 *       // ... additional fields specific to MyStep
 *     });
 *   }
 * }
 * ```
 */
export abstract class StepRecorderBase<S extends BaseStep<R>, R extends string = string>
	implements BaseStepRecorder<S, R>
{
	/** Internal storage for recorded steps */
	protected steps: S[] = [];

	/** Counter for generating unique step IDs */
	protected nextId = 1;

	/**
	 * Get the number of recorded steps.
	 */
	get length(): number {
		return this.steps.length;
	}

	/**
	 * Record a step. Must be implemented by subclasses to create
	 * their specific step type with any additional fields.
	 */
	abstract recordStep(
		rule: R,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: Verbosity
	): void;

	/**
	 * Push a step to the internal storage.
	 * Helper method for subclasses.
	 */
	protected pushStep(step: S): void {
		this.steps.push(step);
	}

	/**
	 * Get all recorded steps.
	 */
	getSteps(): readonly S[] {
		return this.steps;
	}

	/**
	 * Get steps filtered by verbosity level.
	 *
	 * - At 'result' level, returns empty array (no steps)
	 * - At 'summarized' level, returns 'summarized' steps only
	 * - At 'detailed' level, returns all steps
	 */
	getStepsFiltered(verbosity: Verbosity): readonly S[] {
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
