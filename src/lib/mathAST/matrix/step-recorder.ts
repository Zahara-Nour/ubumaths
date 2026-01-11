/**
 * Step Recorder for Matrix Operations
 *
 * Records matrix operation steps for pedagogical display.
 *
 * @module mathAST/matrix/step-recorder
 */

import type { MathNode, MatrixNode } from '../types';
import type { MatrixStep, MatrixRule } from './types';
import type { Verbosity } from '../common/verbosity';
import { StepRecorderBase } from '../common/step-recorder-base';
import { getRuleDescription } from './descriptions-fr';
import { toLatex } from '../latex-generator';

// =============================================================================
// Step Recorder Implementation
// =============================================================================

/**
 * Records steps during matrix operations.
 *
 * Extends StepRecorderBase for common functionality (ID generation,
 * step storage, verbosity filtering).
 *
 * @example
 * ```typescript
 * const recorder = new MatrixStepRecorderImpl();
 * recorder.recordStep('det-2x2-formula', 'det = ad - bc', before, after, 'detailed');
 * const steps = recorder.getStepsFiltered('summarized');
 * ```
 */
export class MatrixStepRecorderImpl extends StepRecorderBase<MatrixStep, MatrixRule> {
	/**
	 * Record a matrix operation step.
	 *
	 * @param rule - The rule key (e.g., 'det-2x2-formula')
	 * @param description - Human-readable description in French
	 * @param before - Expression/matrix before transformation
	 * @param after - Expression/matrix after transformation
	 * @param verbosityLevel - Minimum verbosity to show this step
	 * @param matrixState - Optional LaTeX of augmented matrix state
	 */
	recordStep(
		rule: MatrixRule,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: Verbosity,
		matrixState?: string
	): void {
		this.pushStep({
			id: this.nextId++,
			rule,
			description,
			before,
			after,
			verbosityLevel,
			matrixState
		});
	}

	/**
	 * Record a step using the default description for a rule.
	 */
	recordStepByRule(
		rule: MatrixRule,
		before: MathNode,
		after: MathNode,
		verbosityLevel: Verbosity,
		matrixState?: string
	): void {
		this.recordStep(rule, getRuleDescription(rule), before, after, verbosityLevel, matrixState);
	}

	/**
	 * Record a step with matrix state from a MatrixNode.
	 * Automatically generates LaTeX representation.
	 */
	recordWithMatrixState(
		rule: MatrixRule,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: Verbosity,
		matrix: MatrixNode
	): void {
		const matrixState = toLatex(matrix);
		this.recordStep(rule, description, before, after, verbosityLevel, matrixState);
	}

	/**
	 * Record an augmented matrix state step.
	 * Used during inverse computation to show [A|I] at each step.
	 */
	recordAugmentedState(
		rule: MatrixRule,
		description: string,
		augmented: MatrixNode,
		verbosityLevel: Verbosity
	): void {
		const matrixLatex = toLatex(augmented);
		this.pushStep({
			id: this.nextId++,
			rule,
			description,
			before: augmented,
			after: augmented,
			verbosityLevel,
			matrixState: matrixLatex
		});
	}
}

/**
 * Create a new matrix step recorder.
 */
export function createMatrixStepRecorder(): MatrixStepRecorderImpl {
	return new MatrixStepRecorderImpl();
}

/**
 * Type alias for the step recorder interface.
 */
export type MatrixStepRecorder = MatrixStepRecorderImpl;
