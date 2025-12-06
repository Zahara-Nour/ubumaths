/**
 * Translate Action Executor
 *
 * Handles translation (movement) animations for objects and instruments.
 * Supports both relative translation (dx, dy) and absolute positioning (moveTo).
 *
 * @module constructions/actions/translate
 */

import type { TranslateActionDef, MoveToActionDef, Position } from '../types';
import { evaluateExpr } from '../core/evaluator';
import { DEFAULT_ANIMATION_DURATION } from '../constants';
import { interpolate } from '../utils/easing';
import {
	BaseActionExecutor,
	isInstrumentTarget,
	successResult,
	notFoundResult,
	errorResult,
	type ActionContext,
	type InterpolationState
} from './base';

// =============================================================================
// Types
// =============================================================================

/**
 * Captured start state for translate action
 */
interface TranslateStartState {
	readonly position: Position;
	readonly isInstrument: boolean;
}

/**
 * Captured start state for moveTo action
 */
interface MoveToStartState {
	readonly position: Position;
	readonly isInstrument: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the current position of an object or instrument
 *
 * @param target - Target ID
 * @param context - Action context
 * @returns Position or undefined if not found
 */
function getTargetPosition(target: string, context: ActionContext): Position | undefined {
	if (isInstrumentTarget(target)) {
		const instrument = context.getInstrument(target);
		if (!instrument) return undefined;
		return { x: instrument.x, y: instrument.y };
	}

	const obj = context.getObject(target);
	return obj?.position;
}

/**
 * Update the position of an object or instrument
 *
 * @param target - Target ID
 * @param position - New position
 * @param context - Action context
 * @returns True if update succeeded
 */
function updateTargetPosition(target: string, position: Position, context: ActionContext): boolean {
	if (isInstrumentTarget(target)) {
		const instrument = context.getInstrument(target);
		if (!instrument) return false;

		context.updateInstrument(target, {
			...instrument,
			x: position.x,
			y: position.y
		});
		return true;
	}

	const obj = context.getObject(target);
	if (!obj) return false;

	context.updateObject(target, {
		...obj,
		position
	});
	return true;
}

// =============================================================================
// Translate Action Executor
// =============================================================================

/**
 * Action executor for translate (relative movement) actions
 *
 * Translates an object or instrument by a delta (dx, dy) from its current position.
 * The translation is animated with optional easing.
 *
 * @example
 * ```typescript
 * // Move point A by 100 pixels right and 50 pixels down over 500ms
 * const action: TranslateActionDef = {
 *   kind: 'translate',
 *   target: 'A',
 *   dx: 100,
 *   dy: 50,
 *   duration: 500,
 *   easing: 'easeInOut'
 * };
 * ```
 */
export class TranslateActionExecutor extends BaseActionExecutor<TranslateActionDef> {
	readonly kind = 'translate' as const;

	/** Cached start positions for each target */
	private startPositions = new Map<string, Position>();

	getDuration(action: TranslateActionDef, _context: ActionContext): number {
		return action.duration ?? DEFAULT_ANIMATION_DURATION;
	}

	execute(
		action: TranslateActionDef,
		progress: number,
		context: ActionContext
	): InterpolationState {
		const { target, dx, dy, easing } = action;

		try {
			// Get or capture start position
			let startPos = this.startPositions.get(target);
			if (!startPos) {
				startPos = getTargetPosition(target, context);
				if (!startPos) {
					return notFoundResult(target);
				}
				this.startPositions.set(target, startPos);
			}

			// Evaluate delta expressions
			const deltaX = evaluateExpr(dx, context.evalContext);
			const deltaY = evaluateExpr(dy, context.evalContext);

			// Calculate end position
			const endX = startPos.x + deltaX;
			const endY = startPos.y + deltaY;

			// Interpolate current position based on progress
			const currentX = interpolate(startPos.x, endX, progress, easing);
			const currentY = interpolate(startPos.y, endY, progress, easing);

			// Update target position
			const success = updateTargetPosition(target, { x: currentX, y: currentY }, context);
			if (!success) {
				return notFoundResult(target);
			}

			// Clear cached start position when animation completes
			if (progress >= 1) {
				this.startPositions.delete(target);
			}

			return successResult();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			return errorResult(`Translate action failed: ${message}`);
		}
	}

	captureStartState(
		action: TranslateActionDef,
		context: ActionContext
	): TranslateStartState | undefined {
		const position = getTargetPosition(action.target, context);
		if (!position) return undefined;

		// Also cache it for the execute method
		this.startPositions.set(action.target, position);

		return {
			position,
			isInstrument: isInstrumentTarget(action.target)
		};
	}

	restoreStartState(action: TranslateActionDef, startState: unknown, context: ActionContext): void {
		// Validate startState before casting
		if (!startState || typeof startState !== 'object') return;
		const state = startState as TranslateStartState;
		if (!state.position) return;

		updateTargetPosition(action.target, state.position, context);
		this.startPositions.delete(action.target);
	}

	/**
	 * Reset the executor's internal state
	 *
	 * Call this when seeking to the beginning of the timeline
	 */
	reset(): void {
		this.startPositions.clear();
	}
}

// =============================================================================
// MoveTo Action Executor
// =============================================================================

/**
 * Action executor for moveTo (absolute positioning) actions
 *
 * Moves an object or instrument to an absolute position (x, y).
 * The movement is animated with optional easing.
 *
 * @example
 * ```typescript
 * // Move point A to coordinates (200, 300) over 500ms
 * const action: MoveToActionDef = {
 *   kind: 'moveTo',
 *   target: 'A',
 *   x: 200,
 *   y: 300,
 *   duration: 500,
 *   easing: 'easeOut'
 * };
 * ```
 */
export class MoveToActionExecutor extends BaseActionExecutor<MoveToActionDef> {
	readonly kind = 'moveTo' as const;

	/** Cached start positions for each target */
	private startPositions = new Map<string, Position>();

	getDuration(action: MoveToActionDef, _context: ActionContext): number {
		return action.duration ?? DEFAULT_ANIMATION_DURATION;
	}

	execute(action: MoveToActionDef, progress: number, context: ActionContext): InterpolationState {
		const { target, x, y, easing } = action;

		try {
			// Get or capture start position
			let startPos = this.startPositions.get(target);
			if (!startPos) {
				startPos = getTargetPosition(target, context);
				if (!startPos) {
					return notFoundResult(target);
				}
				this.startPositions.set(target, startPos);
			}

			// Evaluate target position expressions
			const endX = evaluateExpr(x, context.evalContext);
			const endY = evaluateExpr(y, context.evalContext);

			// Interpolate current position based on progress
			const currentX = interpolate(startPos.x, endX, progress, easing);
			const currentY = interpolate(startPos.y, endY, progress, easing);

			// Update target position
			const success = updateTargetPosition(target, { x: currentX, y: currentY }, context);
			if (!success) {
				return notFoundResult(target);
			}

			// Clear cached start position when animation completes
			if (progress >= 1) {
				this.startPositions.delete(target);
			}

			return successResult();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			return errorResult(`MoveTo action failed: ${message}`);
		}
	}

	captureStartState(action: MoveToActionDef, context: ActionContext): MoveToStartState | undefined {
		const position = getTargetPosition(action.target, context);
		if (!position) return undefined;

		// Also cache it for the execute method
		this.startPositions.set(action.target, position);

		return {
			position,
			isInstrument: isInstrumentTarget(action.target)
		};
	}

	restoreStartState(action: MoveToActionDef, startState: unknown, context: ActionContext): void {
		// Validate startState before casting
		if (!startState || typeof startState !== 'object') return;
		const state = startState as MoveToStartState;
		if (!state.position) return;

		updateTargetPosition(action.target, state.position, context);
		this.startPositions.delete(action.target);
	}

	/**
	 * Reset the executor's internal state
	 *
	 * Call this when seeking to the beginning of the timeline
	 */
	reset(): void {
		this.startPositions.clear();
	}
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new TranslateActionExecutor instance
 */
export function createTranslateExecutor(): TranslateActionExecutor {
	return new TranslateActionExecutor();
}

/**
 * Create a new MoveToActionExecutor instance
 */
export function createMoveToExecutor(): MoveToActionExecutor {
	return new MoveToActionExecutor();
}
