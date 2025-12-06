/**
 * Action Executors - Registry and exports for animation actions
 *
 * This module provides a registry of action executors and convenient
 * factory functions for creating and using them.
 *
 * @module constructions/actions
 */

import type { ActionDef } from '../types';
import type { ActionExecutor, ActionContext, InterpolationState } from './base';
import { createTranslateExecutor, createMoveToExecutor } from './translate';
import { createRotateExecutor } from './rotate';
import { createShowExecutor, createHideExecutor } from './show-hide';
import { CreateActionExecutor, createCreateExecutor, type CreateActionDef } from './create';
import { PauseActionExecutor, createPauseExecutor, type PauseActionDef } from './pause';
import {
	DrawArcActionExecutor,
	DrawLineActionExecutor,
	createDrawArcExecutor,
	createDrawLineExecutor,
	type DrawArcActionDef,
	type DrawLineActionDef
} from './draw';

// =============================================================================
// Re-exports
// =============================================================================

export type { ActionExecutor, ActionContext, InterpolationState } from './base';
export {
	BaseActionExecutor,
	isInstrumentTarget,
	getActionEasing,
	successResult,
	notFoundResult,
	errorResult
} from './base';

export {
	TranslateActionExecutor,
	MoveToActionExecutor,
	createTranslateExecutor,
	createMoveToExecutor
} from './translate';

export { RotateActionExecutor, createRotateExecutor } from './rotate';

export {
	ShowActionExecutor,
	HideActionExecutor,
	createShowExecutor,
	createHideExecutor
} from './show-hide';

export {
	CreateActionExecutor,
	createCreateExecutor,
	createObjectState,
	makeCreateAction,
	isCreateActionDef,
	type CreateActionDef
} from './create';

export {
	PauseActionExecutor,
	createPauseExecutor,
	makePauseAction,
	isPauseActionDef,
	delay,
	cancellableDelay,
	type PauseActionDef
} from './pause';

export {
	DrawArcActionExecutor,
	DrawLineActionExecutor,
	createDrawArcExecutor,
	createDrawLineExecutor,
	isDrawArcActionDef,
	isDrawLineActionDef,
	makeDrawArcAction,
	makeDrawLineAction,
	type DrawArcActionDef,
	type DrawLineActionDef
} from './draw';

// =============================================================================
// Types
// =============================================================================

/**
 * Map of action kinds to their executors
 */
type ActionExecutorMap = {
	[K in ActionDef['kind']]?: ActionExecutor<Extract<ActionDef, { kind: K }>>;
};

// =============================================================================
// Action Registry
// =============================================================================

/**
 * Registry of action executors
 *
 * Provides a central place to register and retrieve action executors
 * by their action kind.
 */
export class ActionRegistry {
	private executors: ActionExecutorMap = {};

	/**
	 * Register an action executor
	 *
	 * @param executor - Action executor to register
	 */
	register<T extends ActionDef>(executor: ActionExecutor<T>): void {
		this.executors[executor.kind as ActionDef['kind']] =
			executor as ActionExecutorMap[ActionDef['kind']];
	}

	/**
	 * Get an executor for an action kind
	 *
	 * @param kind - Action kind
	 * @returns Action executor or undefined if not registered
	 */
	get<K extends ActionDef['kind']>(
		kind: K
	): ActionExecutor<Extract<ActionDef, { kind: K }>> | undefined {
		return this.executors[kind] as ActionExecutor<Extract<ActionDef, { kind: K }>> | undefined;
	}

	/**
	 * Check if an executor is registered for an action kind
	 *
	 * @param kind - Action kind
	 * @returns True if an executor is registered
	 */
	has(kind: ActionDef['kind']): boolean {
		return kind in this.executors;
	}

	/**
	 * Get all registered action kinds
	 *
	 * @returns Array of registered action kinds
	 */
	getRegisteredKinds(): ActionDef['kind'][] {
		return Object.keys(this.executors) as ActionDef['kind'][];
	}

	/**
	 * Execute an action at a specific progress
	 *
	 * @param action - Action to execute
	 * @param progress - Progress value (0-1)
	 * @param context - Action context
	 * @returns Interpolation result
	 */
	execute(action: ActionDef, progress: number, context: ActionContext): InterpolationState {
		const executor = this.get(action.kind);
		if (!executor) {
			return {
				found: false,
				error: `No executor registered for action kind: ${action.kind}`
			};
		}

		// Type assertion needed because TypeScript can't infer the relationship
		// between the action kind and the executor type
		return (executor as ActionExecutor<ActionDef>).execute(action, progress, context);
	}

	/**
	 * Get the duration of an action
	 *
	 * @param action - Action to get duration for
	 * @param context - Action context
	 * @returns Duration in milliseconds, or 0 if no executor found
	 */
	getDuration(action: ActionDef, context: ActionContext): number {
		const executor = this.get(action.kind);
		if (!executor) return 0;

		return (executor as ActionExecutor<ActionDef>).getDuration(action, context);
	}

	/**
	 * Reset all executors
	 *
	 * Call this when seeking to the beginning of the timeline
	 */
	resetAll(): void {
		for (const kind of this.getRegisteredKinds()) {
			const executor = this.executors[kind];
			if (executor && 'reset' in executor && typeof executor.reset === 'function') {
				(executor as { reset: () => void }).reset();
			}
		}
	}
}

// =============================================================================
// Default Registry
// =============================================================================

/**
 * Create a registry with all default action executors registered
 *
 * @returns Configured ActionRegistry instance
 */
export function createDefaultRegistry(): ActionRegistry {
	const registry = new ActionRegistry();

	// Register translation actions
	registry.register(createTranslateExecutor());
	registry.register(createMoveToExecutor());

	// Register rotation action
	registry.register(createRotateExecutor());

	// Register show/hide actions
	registry.register(createShowExecutor());
	registry.register(createHideExecutor());

	// Register draw actions (synchronized instrument + object animation)
	registry.register(createDrawLineExecutor());
	registry.register(createDrawArcExecutor());

	return registry;
}

/**
 * Extended action types that are not part of the standard ActionDef union
 *
 * These can be used for advanced use cases where create, pause, and draw
 * actions need to be treated as actions (e.g., for a unified API).
 */
export type ExtendedActionDef =
	| ActionDef
	| CreateActionDef
	| PauseActionDef
	| DrawArcActionDef
	| DrawLineActionDef;

/**
 * Type for all extended action executors
 */
type ExtendedExecutor =
	| CreateActionExecutor
	| PauseActionExecutor
	| DrawArcActionExecutor
	| DrawLineActionExecutor;

/**
 * Extended registry that supports both standard and extended action types
 *
 * This class extends ActionRegistry to support CreateActionDef, PauseActionDef,
 * DrawArcActionDef, and DrawLineActionDef in addition to the standard ActionDef types.
 */
export class ExtendedActionRegistry extends ActionRegistry {
	private extendedExecutors = new Map<string, ExtendedExecutor>();

	/**
	 * Register an extended action executor
	 */
	registerExtended(executor: ExtendedExecutor): void {
		this.extendedExecutors.set(executor.kind, executor);
	}

	/**
	 * Get an extended executor by kind
	 */
	getExtended(kind: string): ExtendedExecutor | undefined {
		return this.extendedExecutors.get(kind);
	}

	/**
	 * Check if an extended executor is registered
	 */
	hasExtended(kind: string): boolean {
		return this.extendedExecutors.has(kind) || this.has(kind as ActionDef['kind']);
	}

	/**
	 * Execute an extended action
	 */
	executeExtended(
		action: ExtendedActionDef,
		progress: number,
		context: ActionContext
	): InterpolationState {
		const extendedExecutor = this.extendedExecutors.get(action.kind);
		if (extendedExecutor) {
			if (action.kind === 'create') {
				return (extendedExecutor as CreateActionExecutor).execute(
					action as CreateActionDef,
					progress,
					context
				);
			}
			if (action.kind === 'pause') {
				return (extendedExecutor as PauseActionExecutor).execute(
					action as PauseActionDef,
					progress,
					context
				);
			}
			if (action.kind === 'drawArc') {
				return (extendedExecutor as DrawArcActionExecutor).execute(
					action as DrawArcActionDef,
					progress,
					context
				);
			}
			if (action.kind === 'drawLine') {
				return (extendedExecutor as DrawLineActionExecutor).execute(
					action as DrawLineActionDef,
					progress,
					context
				);
			}
		}
		return this.execute(action as ActionDef, progress, context);
	}

	/**
	 * Get duration for an extended action
	 */
	getDurationExtended(action: ExtendedActionDef, context: ActionContext): number {
		const extendedExecutor = this.extendedExecutors.get(action.kind);
		if (extendedExecutor) {
			if (action.kind === 'create') {
				return (extendedExecutor as CreateActionExecutor).getDuration(
					action as CreateActionDef,
					context
				);
			}
			if (action.kind === 'pause') {
				return (extendedExecutor as PauseActionExecutor).getDuration(
					action as PauseActionDef,
					context
				);
			}
			if (action.kind === 'drawArc') {
				return (extendedExecutor as DrawArcActionExecutor).getDuration(
					action as DrawArcActionDef,
					context
				);
			}
			if (action.kind === 'drawLine') {
				return (extendedExecutor as DrawLineActionExecutor).getDuration(
					action as DrawLineActionDef,
					context
				);
			}
		}
		return this.getDuration(action as ActionDef, context);
	}

	/**
	 * Reset all executors including extended ones
	 */
	override resetAll(): void {
		super.resetAll();
		for (const executor of this.extendedExecutors.values()) {
			if ('reset' in executor && typeof executor.reset === 'function') {
				executor.reset();
			}
		}
	}
}

/**
 * Create a registry with all action executors including extended actions
 *
 * This includes create, pause, and draw executors which are not part of the
 * standard ActionDef union but can be useful for advanced use cases.
 *
 * @returns Configured ExtendedActionRegistry instance
 */
export function createExtendedRegistry(): ExtendedActionRegistry {
	const registry = new ExtendedActionRegistry();

	// Register standard actions
	registry.register(createTranslateExecutor());
	registry.register(createMoveToExecutor());
	registry.register(createRotateExecutor());
	registry.register(createShowExecutor());
	registry.register(createHideExecutor());

	// Register extended actions
	registry.registerExtended(createCreateExecutor());
	registry.registerExtended(createPauseExecutor());
	registry.registerExtended(createDrawArcExecutor());
	registry.registerExtended(createDrawLineExecutor());

	return registry;
}

/**
 * Default action registry instance with all standard executors
 */
export const defaultRegistry = createDefaultRegistry();

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Execute an action using the default registry
 *
 * @param action - Action to execute
 * @param progress - Progress value (0-1)
 * @param context - Action context
 * @returns Interpolation result
 */
export function executeAction(
	action: ActionDef,
	progress: number,
	context: ActionContext
): InterpolationState {
	return defaultRegistry.execute(action, progress, context);
}

/**
 * Get the duration of an action using the default registry
 *
 * @param action - Action to get duration for
 * @param context - Action context
 * @returns Duration in milliseconds
 */
export function getActionDuration(action: ActionDef, context: ActionContext): number {
	return defaultRegistry.getDuration(action, context);
}

/**
 * Check if an action kind is supported
 *
 * @param kind - Action kind to check
 * @returns True if the action kind has a registered executor
 */
export function isActionSupported(kind: ActionDef['kind']): boolean {
	return defaultRegistry.has(kind);
}
