/**
 * Step Generator Types
 *
 * Type definitions for the pedagogical step-by-step calculation display.
 */

import type { MathNode } from '../types';

/**
 * School level for adapting step detail
 */
export type SchoolLevel = 'primaire' | 'college' | 'lycee' | 'superieur';

/**
 * A single calculation step
 */
export interface CalculationStep {
	/** Step number (1-indexed) */
	readonly index: number;
	/** Description of what operation is being performed (in French) */
	readonly description: string;
	/** The expression at this step (LaTeX format) */
	readonly expression: string;
	/** Optional explanation for pedagogical purposes */
	readonly explanation?: string;
	/** The AST node at this step */
	readonly ast?: MathNode;
	/** Sub-steps for collapsible detail */
	readonly subSteps?: readonly CalculationStep[];
}

/**
 * Result of step generation
 */
export interface StepGenerationResult {
	/** Original expression (LaTeX) */
	readonly original: string;
	/** Final result (LaTeX) */
	readonly result: string;
	/** All calculation steps */
	readonly steps: readonly CalculationStep[];
	/** School level used for generation */
	readonly level: SchoolLevel;
}

/**
 * Configuration for step generation
 */
export interface StepGeneratorConfig {
	/** School level for detail adaptation */
	readonly level: SchoolLevel;
	/** Maximum number of steps to generate */
	readonly maxSteps?: number;
	/** Include sub-steps for complex operations */
	readonly includeSubSteps?: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: StepGeneratorConfig = {
	level: 'college',
	maxSteps: 20,
	includeSubSteps: true
};
