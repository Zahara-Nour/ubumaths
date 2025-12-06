/**
 * Action Executor Base - Interface for animation actions
 *
 * This module defines the base interface for action executors that handle
 * animated transformations on geometric objects and instruments.
 *
 * @module constructions/actions/base
 */

import type { ActionDef, ObjectState, InstrumentRuntimeState, InstrumentType } from '../types';
import type { EvaluationContext } from '../core/evaluator';
import type { EasingName } from '../utils/easing';

// =============================================================================
// Types
// =============================================================================

/**
 * Context provided to action executors
 *
 * Contains all the information needed to execute an action, including
 * the current state of objects and instruments, and the evaluation context
 * for resolving expressions.
 */
export interface ActionContext {
	/** Map of object IDs to their current state */
	readonly objects: Map<string, ObjectState>;

	/** Map of instrument types to their current state */
	readonly instruments: Map<InstrumentType, InstrumentRuntimeState>;

	/** Evaluation context for resolving expressions */
	readonly evalContext: EvaluationContext;

	/**
	 * Get an object state by ID
	 *
	 * @param id - Object ID
	 * @returns Object state or undefined if not found
	 */
	getObject(id: string): ObjectState | undefined;

	/**
	 * Update an object state
	 *
	 * @param id - Object ID
	 * @param state - New object state
	 */
	updateObject(id: string, state: ObjectState): void;

	/**
	 * Get an instrument state
	 *
	 * @param type - Instrument type
	 * @returns Instrument state or undefined if not found
	 */
	getInstrument(type: InstrumentType): InstrumentRuntimeState | undefined;

	/**
	 * Update an instrument state
	 *
	 * @param type - Instrument type
	 * @param state - New instrument state
	 */
	updateInstrument(type: InstrumentType, state: InstrumentRuntimeState): void;
}

/**
 * Result of calculating action interpolation
 */
export interface InterpolationState {
	/** Whether the action target was found */
	readonly found: boolean;

	/** Error message if something went wrong */
	readonly error?: string;
}

/**
 * Interface for action executors
 *
 * An action executor handles a specific type of animation action (translate,
 * rotate, show, hide, etc.). It provides methods to:
 * - Calculate the duration of the action
 * - Execute the action at a specific progress point (0-1)
 *
 * Action executors should be stateless - all state is passed via ActionContext.
 */
export interface ActionExecutor<T extends ActionDef = ActionDef> {
	/**
	 * The action kind this executor handles
	 */
	readonly kind: T['kind'];

	/**
	 * Get the duration of this action in milliseconds
	 *
	 * Returns 0 for instant actions (show, hide, style changes).
	 *
	 * @param action - Action definition
	 * @param context - Action context for evaluating expressions
	 * @returns Duration in milliseconds
	 */
	getDuration(action: T, context: ActionContext): number;

	/**
	 * Execute the action at a specific progress point
	 *
	 * Progress is a value from 0 to 1, where:
	 * - 0 = action start state
	 * - 1 = action end state
	 *
	 * The progress value is LINEAR (not eased). Each executor is responsible
	 * for applying its own easing based on the action's `easing` property.
	 * This allows different actions to have different easing functions.
	 *
	 * @param action - Action definition
	 * @param progress - Linear progress value (0-1)
	 * @param context - Action context for reading/updating state
	 * @returns Interpolation result
	 */
	execute(action: T, progress: number, context: ActionContext): InterpolationState;

	/**
	 * Get the start state for this action
	 *
	 * Called before animation starts to capture the initial state.
	 * This is optional - if not provided, the executor should calculate
	 * the start state from the current object/instrument state.
	 *
	 * @param action - Action definition
	 * @param context - Action context
	 * @returns Start state data (executor-specific format)
	 */
	captureStartState?(action: T, context: ActionContext): unknown;

	/**
	 * Restore the start state
	 *
	 * Called when seeking backwards to restore the state before this action.
	 * This is optional - if not provided, the timeline will need to
	 * recalculate state from the beginning.
	 *
	 * @param action - Action definition
	 * @param startState - State captured by captureStartState
	 * @param context - Action context
	 */
	restoreStartState?(action: T, startState: unknown, context: ActionContext): void;
}

// =============================================================================
// Base Implementation Helpers
// =============================================================================

/**
 * Check if a target is an instrument type
 *
 * @param target - Target string to check
 * @returns True if the target is an instrument type
 */
export function isInstrumentTarget(target: string): target is InstrumentType {
	return ['ruler', 'compass', 'protractor', 'setSquare'].includes(target);
}

/**
 * Get the easing name from an action definition
 *
 * @param action - Action definition
 * @returns Easing name or undefined for default
 */
export function getActionEasing(action: ActionDef): EasingName | undefined {
	return action.easing as EasingName | undefined;
}

/**
 * Create a successful interpolation result
 */
export function successResult(): InterpolationState {
	return { found: true };
}

/**
 * Create a not-found interpolation result
 *
 * @param target - The target that was not found
 */
export function notFoundResult(target: string): InterpolationState {
	return {
		found: false,
		error: `Target not found: ${target}`
	};
}

/**
 * Create an error interpolation result
 *
 * @param message - Error message
 */
export function errorResult(message: string): InterpolationState {
	return {
		found: false,
		error: message
	};
}

// =============================================================================
// Abstract Base Class
// =============================================================================

/**
 * Abstract base class for action executors
 *
 * Provides common functionality and helper methods for implementing
 * action executors.
 */
export abstract class BaseActionExecutor<T extends ActionDef = ActionDef>
	implements ActionExecutor<T>
{
	abstract readonly kind: T['kind'];

	abstract getDuration(action: T, context: ActionContext): number;

	abstract execute(action: T, progress: number, context: ActionContext): InterpolationState;

	/**
	 * Get the target object or instrument state
	 *
	 * @param target - Target ID (object ID or instrument type)
	 * @param context - Action context
	 * @returns Object state, instrument state, or undefined
	 */
	protected getTargetState(
		target: string,
		context: ActionContext
	): ObjectState | InstrumentRuntimeState | undefined {
		if (isInstrumentTarget(target)) {
			return context.getInstrument(target);
		}
		return context.getObject(target);
	}

	/**
	 * Update the target object or instrument state
	 *
	 * @param target - Target ID (object ID or instrument type)
	 * @param state - New state
	 * @param context - Action context
	 */
	protected updateTargetState(
		target: string,
		state: ObjectState | InstrumentRuntimeState,
		context: ActionContext
	): void {
		if (isInstrumentTarget(target)) {
			context.updateInstrument(target, state as InstrumentRuntimeState);
		} else {
			context.updateObject(target, state as ObjectState);
		}
	}
}
