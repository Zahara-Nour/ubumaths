/**
 * Rotate Action Executor
 *
 * Handles rotation animations for objects and instruments.
 * Supports rotation around a center point (object ID or coordinates).
 *
 * @module constructions/actions/rotate
 */

import type { RotateActionDef, Position, Expr } from '../types';
import { evaluateExpr } from '../core/evaluator';
import { DEFAULT_ANIMATION_DURATION, DEG_TO_RAD } from '../constants';
import { interpolate, interpolateAngle } from '../utils/easing';
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
 * Captured start state for rotate action
 */
interface RotateStartState {
	/** Original position (for objects with positions) */
	readonly position?: Position;

	/** Original rotation angle (for instruments) */
	readonly rotation?: number;

	/** Whether the target is an instrument */
	readonly isInstrument: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Resolve a center point reference to coordinates
 *
 * @param center - Center reference (object ID or inline coordinates)
 * @param context - Action context
 * @returns Position or undefined if not found
 */
function resolveCenter(
	center: string | { x: Expr; y: Expr } | undefined,
	context: ActionContext
): Position | undefined {
	if (!center) {
		return undefined; // No center means rotate around self
	}

	if (typeof center === 'string') {
		// Object ID reference
		const obj = context.getObject(center);
		return obj?.position;
	}

	// Inline coordinates
	try {
		return {
			x: evaluateExpr(center.x, context.evalContext),
			y: evaluateExpr(center.y, context.evalContext)
		};
	} catch {
		return undefined;
	}
}

/**
 * Rotate a point around a center by a given angle
 *
 * @param point - Point to rotate
 * @param center - Center of rotation
 * @param angleDegrees - Rotation angle in degrees (positive = counterclockwise)
 * @returns Rotated point
 */
function rotatePoint(point: Position, center: Position, angleDegrees: number): Position {
	const rad = angleDegrees * DEG_TO_RAD;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);

	const dx = point.x - center.x;
	const dy = point.y - center.y;

	return {
		x: center.x + dx * cos - dy * sin,
		y: center.y + dx * sin + dy * cos
	};
}

/**
 * Get the current rotation of an instrument
 *
 * @param target - Instrument type
 * @param context - Action context
 * @returns Rotation in degrees or undefined if not found
 */
function getInstrumentRotation(target: string, context: ActionContext): number | undefined {
	if (!isInstrumentTarget(target)) return undefined;

	const instrument = context.getInstrument(target);
	return instrument?.rotation;
}

/**
 * Update the rotation of an instrument
 *
 * @param target - Instrument type
 * @param rotation - New rotation in degrees
 * @param context - Action context
 * @returns True if update succeeded
 */
function updateInstrumentRotation(
	target: string,
	rotation: number,
	context: ActionContext
): boolean {
	if (!isInstrumentTarget(target)) return false;

	const instrument = context.getInstrument(target);
	if (!instrument) return false;

	context.updateInstrument(target, {
		...instrument,
		rotation
	});
	return true;
}

/**
 * Get the current position of an object
 *
 * @param target - Object ID
 * @param context - Action context
 * @returns Position or undefined if not found
 */
function getObjectPosition(target: string, context: ActionContext): Position | undefined {
	const obj = context.getObject(target);
	return obj?.position;
}

/**
 * Update the position of an object
 *
 * @param target - Object ID
 * @param position - New position
 * @param context - Action context
 * @returns True if update succeeded
 */
function updateObjectPosition(target: string, position: Position, context: ActionContext): boolean {
	const obj = context.getObject(target);
	if (!obj) return false;

	context.updateObject(target, {
		...obj,
		position
	});
	return true;
}

// =============================================================================
// Rotate Action Executor
// =============================================================================

/**
 * Action executor for rotate actions
 *
 * Rotates an object or instrument by a specified angle. For objects with
 * positions (points), rotates around a center point. For instruments,
 * rotates in place.
 *
 * @example
 * ```typescript
 * // Rotate point B around point A by 90 degrees
 * const action: RotateActionDef = {
 *   kind: 'rotate',
 *   target: 'B',
 *   angle: 90,
 *   center: 'A',
 *   duration: 500,
 *   easing: 'easeInOut'
 * };
 *
 * // Rotate the ruler by 45 degrees
 * const action2: RotateActionDef = {
 *   kind: 'rotate',
 *   target: 'ruler',
 *   angle: 45,
 *   duration: 300
 * };
 * ```
 */
export class RotateActionExecutor extends BaseActionExecutor<RotateActionDef> {
	readonly kind = 'rotate' as const;

	/** Cached start states for each target */
	private startStates = new Map<string, RotateStartState>();

	getDuration(action: RotateActionDef, _context: ActionContext): number {
		return action.duration ?? DEFAULT_ANIMATION_DURATION;
	}

	execute(action: RotateActionDef, progress: number, context: ActionContext): InterpolationState {
		const { target, angle, center, easing } = action;

		try {
			// Get or capture start state
			let startState = this.startStates.get(target);
			if (!startState) {
				startState = this.captureState(target, context);
				if (!startState) {
					return notFoundResult(target);
				}
				this.startStates.set(target, startState);
			}

			// Evaluate the rotation angle
			const rotationAngle = evaluateExpr(angle, context.evalContext);

			if (startState.isInstrument) {
				// For instruments, just interpolate the rotation property
				return this.executeInstrumentRotation(
					target,
					startState,
					rotationAngle,
					progress,
					easing,
					context
				);
			} else {
				// For objects, rotate around a center point
				return this.executeObjectRotation(
					target,
					startState,
					rotationAngle,
					center,
					progress,
					easing,
					context
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			return errorResult(`Rotate action failed: ${message}`);
		}
	}

	/**
	 * Execute rotation for an instrument (rotate in place)
	 */
	private executeInstrumentRotation(
		target: string,
		startState: RotateStartState,
		rotationAngle: number,
		progress: number,
		easing: string | undefined,
		context: ActionContext
	): InterpolationState {
		const startRotation = startState.rotation ?? 0;
		const endRotation = startRotation + rotationAngle;

		// Interpolate rotation with optional shortest-path handling
		const currentRotation = interpolateAngle(startRotation, endRotation, progress, easing);

		const success = updateInstrumentRotation(target, currentRotation, context);
		if (!success) {
			return notFoundResult(target);
		}

		// Clear cached start state when animation completes
		if (progress >= 1) {
			this.startStates.delete(target);
		}

		return successResult();
	}

	/**
	 * Execute rotation for an object around a center point
	 */
	private executeObjectRotation(
		target: string,
		startState: RotateStartState,
		rotationAngle: number,
		center: string | { x: Expr; y: Expr } | undefined,
		progress: number,
		easing: string | undefined,
		context: ActionContext
	): InterpolationState {
		const startPos = startState.position;
		if (!startPos) {
			return errorResult(`Object ${target} has no position for rotation`);
		}

		// Resolve the center of rotation
		const centerPos = resolveCenter(center, context);
		if (!centerPos) {
			// If no center specified, we can't rotate an object (it would just stay in place)
			return errorResult('Rotation center not specified or not found');
		}

		// Interpolate the current angle
		const currentAngle = interpolate(0, rotationAngle, progress, easing);

		// Rotate the start position by the current angle
		const currentPos = rotatePoint(startPos, centerPos, currentAngle);

		const success = updateObjectPosition(target, currentPos, context);
		if (!success) {
			return notFoundResult(target);
		}

		// Clear cached start state when animation completes
		if (progress >= 1) {
			this.startStates.delete(target);
		}

		return successResult();
	}

	/**
	 * Capture the start state of a target
	 */
	private captureState(target: string, context: ActionContext): RotateStartState | undefined {
		if (isInstrumentTarget(target)) {
			const rotation = getInstrumentRotation(target, context);
			if (rotation === undefined) return undefined;

			return {
				rotation,
				isInstrument: true
			};
		}

		const position = getObjectPosition(target, context);
		if (!position) return undefined;

		return {
			position,
			isInstrument: false
		};
	}

	captureStartState(action: RotateActionDef, context: ActionContext): RotateStartState | undefined {
		const state = this.captureState(action.target, context);
		if (state) {
			this.startStates.set(action.target, state);
		}
		return state;
	}

	restoreStartState(action: RotateActionDef, startState: unknown, context: ActionContext): void {
		// Validate startState before casting
		if (!startState || typeof startState !== 'object') return;
		const state = startState as RotateStartState;
		if (typeof state.isInstrument !== 'boolean') return;

		if (state.isInstrument && state.rotation !== undefined) {
			updateInstrumentRotation(action.target, state.rotation, context);
		} else if (state.position) {
			updateObjectPosition(action.target, state.position, context);
		}

		this.startStates.delete(action.target);
	}

	/**
	 * Reset the executor's internal state
	 *
	 * Call this when seeking to the beginning of the timeline
	 */
	reset(): void {
		this.startStates.clear();
	}
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new RotateActionExecutor instance
 */
export function createRotateExecutor(): RotateActionExecutor {
	return new RotateActionExecutor();
}
