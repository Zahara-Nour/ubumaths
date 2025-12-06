/**
 * Show/Hide Action Executors
 *
 * Handles visibility animations for objects and instruments.
 * Supports instant visibility changes and optional fade animations.
 *
 * @module constructions/actions/show-hide
 */

import type { ShowActionDef, HideActionDef, InstrumentType } from '../types';
import { interpolate } from '../utils/easing';
import {
	BaseActionExecutor,
	isInstrumentTarget,
	successResult,
	notFoundResult,
	type ActionContext,
	type InterpolationState
} from './base';

// =============================================================================
// Types
// =============================================================================

/**
 * Captured start state for show/hide actions
 */
interface VisibilityStartState {
	/** Whether the target was visible */
	readonly wasVisible: boolean;
	/** Initial opacity (for fade animations) */
	readonly opacity: number;
	/** Whether the target is an instrument */
	readonly isInstrument: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the current visibility and opacity of a target
 *
 * @param target - Target ID (object ID or instrument type)
 * @param context - Action context
 * @returns Visibility state or undefined if not found
 */
function getTargetVisibility(
	target: string,
	context: ActionContext
): { visible: boolean; opacity: number } | undefined {
	if (isInstrumentTarget(target)) {
		const instrument = context.getInstrument(target);
		if (!instrument) return undefined;
		return { visible: instrument.visible, opacity: 1 };
	}

	const obj = context.getObject(target);
	if (!obj) return undefined;
	return { visible: obj.visible, opacity: obj.style?.opacity ?? 1 };
}

/**
 * Update the visibility and opacity of a target
 *
 * @param target - Target ID
 * @param visible - New visibility
 * @param opacity - New opacity (for fade effects)
 * @param context - Action context
 * @returns True if update succeeded
 */
function updateTargetVisibility(
	target: string,
	visible: boolean,
	opacity: number,
	context: ActionContext
): boolean {
	if (isInstrumentTarget(target)) {
		const instrument = context.getInstrument(target);
		if (!instrument) return false;

		context.updateInstrument(target as InstrumentType, {
			...instrument,
			visible
		});
		return true;
	}

	const obj = context.getObject(target);
	if (!obj) return false;

	context.updateObject(target, {
		...obj,
		visible,
		style: { ...obj.style, opacity }
	});
	return true;
}

// =============================================================================
// Show Action Executor
// =============================================================================

/**
 * Action executor for show actions
 *
 * Makes an object or instrument visible. Supports optional fade-in animation
 * when duration is specified.
 *
 * @example
 * ```typescript
 * // Instant show
 * const action: ShowActionDef = {
 *   kind: 'show',
 *   target: 'pointA'
 * };
 *
 * // Fade in over 300ms
 * const fadeAction: ShowActionDef = {
 *   kind: 'show',
 *   target: 'segment1',
 *   duration: 300,
 *   easing: 'easeOut'
 * };
 * ```
 */
export class ShowActionExecutor extends BaseActionExecutor<ShowActionDef> {
	readonly kind = 'show' as const;

	/** Cached start states for each target */
	private startStates = new Map<string, VisibilityStartState>();

	getDuration(action: ShowActionDef, _context: ActionContext): number {
		// Show actions are instant by default, but can have duration for fade effects
		return action.duration ?? 0;
	}

	execute(action: ShowActionDef, progress: number, context: ActionContext): InterpolationState {
		const { target, easing } = action;
		const duration = this.getDuration(action, context);

		// Get or capture start state
		let startState = this.startStates.get(target);
		if (!startState) {
			const visibility = getTargetVisibility(target, context);
			if (!visibility) {
				return notFoundResult(target);
			}
			startState = {
				wasVisible: visibility.visible,
				opacity: visibility.opacity,
				isInstrument: isInstrumentTarget(target)
			};
			this.startStates.set(target, startState);
		}

		// If no duration, apply instantly
		if (duration === 0) {
			const success = updateTargetVisibility(target, true, 1, context);
			if (!success) return notFoundResult(target);
			this.startStates.delete(target);
			return successResult();
		}

		// Fade in animation
		const startOpacity = startState.wasVisible ? startState.opacity : 0;
		const currentOpacity = interpolate(startOpacity, 1, progress, easing);

		// Make visible as soon as animation starts
		const success = updateTargetVisibility(target, true, currentOpacity, context);
		if (!success) return notFoundResult(target);

		// Clear cached state when complete
		if (progress >= 1) {
			this.startStates.delete(target);
		}

		return successResult();
	}

	captureStartState(
		action: ShowActionDef,
		context: ActionContext
	): VisibilityStartState | undefined {
		const visibility = getTargetVisibility(action.target, context);
		if (!visibility) return undefined;

		const state: VisibilityStartState = {
			wasVisible: visibility.visible,
			opacity: visibility.opacity,
			isInstrument: isInstrumentTarget(action.target)
		};

		this.startStates.set(action.target, state);
		return state;
	}

	restoreStartState(action: ShowActionDef, startState: unknown, context: ActionContext): void {
		if (!startState || typeof startState !== 'object') return;
		const state = startState as VisibilityStartState;
		if (typeof state.wasVisible !== 'boolean') return;

		updateTargetVisibility(action.target, state.wasVisible, state.opacity, context);
		this.startStates.delete(action.target);
	}

	/**
	 * Reset the executor's internal state
	 */
	reset(): void {
		this.startStates.clear();
	}
}

// =============================================================================
// Hide Action Executor
// =============================================================================

/**
 * Action executor for hide actions
 *
 * Hides an object or instrument. Supports optional fade-out animation
 * when duration is specified.
 *
 * @example
 * ```typescript
 * // Instant hide
 * const action: HideActionDef = {
 *   kind: 'hide',
 *   target: 'pointA'
 * };
 *
 * // Fade out over 300ms
 * const fadeAction: HideActionDef = {
 *   kind: 'hide',
 *   target: 'segment1',
 *   duration: 300,
 *   easing: 'easeIn'
 * };
 * ```
 */
export class HideActionExecutor extends BaseActionExecutor<HideActionDef> {
	readonly kind = 'hide' as const;

	/** Cached start states for each target */
	private startStates = new Map<string, VisibilityStartState>();

	getDuration(action: HideActionDef, _context: ActionContext): number {
		// Hide actions are instant by default, but can have duration for fade effects
		return action.duration ?? 0;
	}

	execute(action: HideActionDef, progress: number, context: ActionContext): InterpolationState {
		const { target, easing } = action;
		const duration = this.getDuration(action, context);

		// Get or capture start state
		let startState = this.startStates.get(target);
		if (!startState) {
			const visibility = getTargetVisibility(target, context);
			if (!visibility) {
				return notFoundResult(target);
			}
			startState = {
				wasVisible: visibility.visible,
				opacity: visibility.opacity,
				isInstrument: isInstrumentTarget(target)
			};
			this.startStates.set(target, startState);
		}

		// If no duration, apply instantly
		if (duration === 0) {
			const success = updateTargetVisibility(target, false, 0, context);
			if (!success) return notFoundResult(target);
			this.startStates.delete(target);
			return successResult();
		}

		// Fade out animation
		const startOpacity = startState.opacity;
		const currentOpacity = interpolate(startOpacity, 0, progress, easing);

		// Only set invisible when fully faded
		const visible = progress < 1;
		const success = updateTargetVisibility(target, visible, currentOpacity, context);
		if (!success) return notFoundResult(target);

		// Clear cached state when complete
		if (progress >= 1) {
			this.startStates.delete(target);
		}

		return successResult();
	}

	captureStartState(
		action: HideActionDef,
		context: ActionContext
	): VisibilityStartState | undefined {
		const visibility = getTargetVisibility(action.target, context);
		if (!visibility) return undefined;

		const state: VisibilityStartState = {
			wasVisible: visibility.visible,
			opacity: visibility.opacity,
			isInstrument: isInstrumentTarget(action.target)
		};

		this.startStates.set(action.target, state);
		return state;
	}

	restoreStartState(action: HideActionDef, startState: unknown, context: ActionContext): void {
		if (!startState || typeof startState !== 'object') return;
		const state = startState as VisibilityStartState;
		if (typeof state.wasVisible !== 'boolean') return;

		updateTargetVisibility(action.target, state.wasVisible, state.opacity, context);
		this.startStates.delete(action.target);
	}

	/**
	 * Reset the executor's internal state
	 */
	reset(): void {
		this.startStates.clear();
	}
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new ShowActionExecutor instance
 */
export function createShowExecutor(): ShowActionExecutor {
	return new ShowActionExecutor();
}

/**
 * Create a new HideActionExecutor instance
 */
export function createHideExecutor(): HideActionExecutor {
	return new HideActionExecutor();
}
