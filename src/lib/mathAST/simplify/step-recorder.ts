/**
 * Step Recorder for Simplification
 *
 * Extends StepRecorderBase with a phase field for tracking
 * which part of the simplify pipeline produced each step.
 *
 * @module mathAST/simplify/step-recorder
 */

import type { MathNode } from '../types';
import type { Verbosity } from '../common/verbosity';
import { StepRecorderBase } from '../common/step-recorder-base';
import type { SimplifyStep, SimplifyPhase } from './types';

// =============================================================================
// Simplify Step Recorder
// =============================================================================

export class SimplifyStepRecorder extends StepRecorderBase<SimplifyStep> {
	private currentPhase: SimplifyPhase = 'rules';

	/**
	 * Set the current phase for subsequent recorded steps.
	 */
	setPhase(phase: SimplifyPhase): void {
		this.currentPhase = phase;
	}

	/**
	 * Record a simplification step.
	 */
	recordStep(
		rule: string,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: Verbosity
	): void {
		this.pushStep({
			id: this.nextId++,
			rule,
			description,
			before,
			after,
			verbosityLevel,
			phase: this.currentPhase
		});
	}
}
