/**
 * Pause Action Executor
 *
 * Handles pause/delay actions in the animation timeline.
 * A pause action simply waits for a specified duration without
 * modifying any object or instrument state.
 *
 * Note: Pauses are typically handled at the Step level via PauseStep.
 * This executor provides an action-level interface for advanced use cases.
 *
 * @module constructions/actions/pause
 */

import {
	successResult,
	type ActionExecutor,
	type ActionContext,
	type InterpolationState
} from './base';

// =============================================================================
// Types
// =============================================================================

/**
 * Pause action definition
 *
 * While not part of the standard ActionDef union, this type can be used
 * for programmatic delays through the action executor interface.
 */
export interface PauseActionDef {
	readonly kind: 'pause';
	/** Duration of the pause in milliseconds */
	readonly duration: number;
}

/**
 * Type guard for PauseActionDef
 *
 * @param action - Action to check
 * @returns True if action is a PauseActionDef
 */
export function isPauseActionDef(action: { kind: string }): action is PauseActionDef {
	return action.kind === 'pause';
}

// =============================================================================
// Pause Action Executor
// =============================================================================

/**
 * Action executor for pause actions
 *
 * Waits for the specified duration without modifying any state.
 * The progress value indicates how far through the pause we are.
 *
 * @example
 * ```typescript
 * // Pause for 1 second
 * const action: PauseActionDef = {
 *   kind: 'pause',
 *   duration: 1000
 * };
 *
 * // At progress = 0.5, we're halfway through the pause
 * executor.execute(action, 0.5, context);
 * ```
 */
export class PauseActionExecutor implements ActionExecutor<PauseActionDef> {
	readonly kind = 'pause' as const;

	/**
	 * Get the duration of this action
	 *
	 * @param action - Pause action definition
	 * @returns Duration in milliseconds
	 */
	getDuration(action: PauseActionDef, _context: ActionContext): number {
		return action.duration;
	}

	/**
	 * Execute the pause action
	 *
	 * Since pause doesn't modify any state, this simply returns success.
	 * The timeline is responsible for actually waiting for the duration.
	 *
	 * @param _action - Pause action definition
	 * @param _progress - Progress value (0-1)
	 * @param _context - Action context
	 * @returns Success result
	 */
	execute(_action: PauseActionDef, _progress: number, _context: ActionContext): InterpolationState {
		// Pause actions don't modify state
		// The timeline handles the actual waiting
		return successResult();
	}

	/**
	 * Capture start state (not applicable for pause actions)
	 */
	captureStartState(_action: PauseActionDef, _context: ActionContext): undefined {
		// Pause actions don't need start state capture
		return undefined;
	}

	/**
	 * Restore start state (no-op for pause actions)
	 */
	restoreStartState(_action: PauseActionDef, _startState: unknown, _context: ActionContext): void {
		// Nothing to restore
	}

	/**
	 * Reset the executor's internal state
	 */
	reset(): void {
		// No internal state to reset
	}
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new PauseActionExecutor instance
 */
export function createPauseExecutor(): PauseActionExecutor {
	return new PauseActionExecutor();
}

/**
 * Create a PauseActionDef with the specified duration
 *
 * Convenience function for creating pause actions programmatically.
 *
 * @param duration - Pause duration in milliseconds
 * @returns Pause action definition
 */
export function makePauseAction(duration: number): PauseActionDef {
	return {
		kind: 'pause',
		duration
	};
}

// =============================================================================
// Delay Utilities
// =============================================================================

/**
 * Create a promise that resolves after a delay
 *
 * Utility function for implementing pauses in async contexts.
 *
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a cancellable delay
 *
 * Returns a delay promise and a cancel function.
 * Useful for implementing interruptible pauses.
 *
 * @param ms - Delay in milliseconds
 * @returns Object with promise and cancel function
 *
 * @example
 * ```typescript
 * const { promise, cancel } = cancellableDelay(1000);
 *
 * // Start the delay
 * promise.then(() => console.log('Delay completed'));
 *
 * // Cancel the delay early
 * cancel();
 * ```
 */
export function cancellableDelay(ms: number): { promise: Promise<void>; cancel: () => void } {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let resolvePromise: (() => void) | null = null;

	const promise = new Promise<void>((resolve) => {
		resolvePromise = resolve;
		timeoutId = setTimeout(resolve, ms);
	});

	const cancel = () => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		if (resolvePromise) {
			resolvePromise();
			resolvePromise = null;
		}
	};

	return { promise, cancel };
}
