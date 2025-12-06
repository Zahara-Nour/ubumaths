/**
 * Draw Action Executors - Arc and line drawing with instruments
 *
 * This module provides action executors for drawing operations using
 * geometric instruments (compass for arcs, pencil for lines).
 *
 * The draw actions animate the instruments while creating geometric
 * objects on the canvas.
 *
 * @module constructions/actions/draw
 */

import type {
	Expr,
	Position,
	ObjectState,
	InstrumentRuntimeState,
	ArcDef,
	SegmentDef,
	StyleProps
} from '../types';
import { evaluateExpr } from '../core/evaluator';
import { DEFAULT_ANIMATION_DURATION } from '../constants';
import { interpolate, interpolateAngle } from '../utils/easing';
import {
	BaseActionExecutor,
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
 * Draw arc action definition
 *
 * Draws an arc using the compass instrument. The compass is positioned
 * at the center point and rotates to trace the arc.
 */
/** Point reference - either an ID string or inline coordinates */
type PointRef = string | { readonly x: number; readonly y: number };

export interface DrawArcActionDef {
	readonly kind: 'drawArc';
	/** Center point - ID or inline coordinates */
	readonly center: PointRef;
	/** Radius of the arc (expression) */
	readonly radius: Expr;
	/** Start angle in degrees (0 = right, 90 = up) */
	readonly startAngle: Expr;
	/** End angle in degrees */
	readonly endAngle: Expr;
	/** Animation duration in milliseconds */
	readonly duration?: number;
	/** Easing function name */
	readonly easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
	/** Optional: create an arc object during drawing */
	readonly createObject?: {
		readonly id: string;
		readonly style?: StyleProps;
	};
}

/**
 * Draw line action definition
 *
 * Draws a line using the pencil instrument. The pencil moves from
 * the start point to the end point, tracing a line.
 */
export interface DrawLineActionDef {
	readonly kind: 'drawLine';
	/** Starting point - ID or inline coordinates */
	readonly from: PointRef;
	/** Ending point - ID or inline coordinates */
	readonly to: PointRef;
	/** Animation duration in milliseconds */
	readonly duration?: number;
	/** Easing function name */
	readonly easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
	/** Optional: create a segment object during drawing */
	readonly createObject?: {
		readonly id: string;
		readonly style?: StyleProps;
	};
}

/**
 * Captured start state for draw arc action
 */
interface DrawArcStartState {
	readonly compassState: InstrumentRuntimeState;
	readonly centerPosition: Position;
}

/**
 * Captured start state for draw line action
 */
interface DrawLineStartState {
	readonly pencilState: InstrumentRuntimeState | undefined;
	readonly fromPosition: Position;
	readonly toPosition: Position;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the position of a point object
 *
 * @param pointId - ID of the point
 * @param context - Action context
 * @returns Position or undefined if not found
 */
function getPointPosition(pointRef: PointRef, context: ActionContext): Position | undefined {
	if (typeof pointRef === 'string') {
		const obj = context.getObject(pointRef);
		return obj?.position;
	}
	// Inline coordinates
	return { x: pointRef.x, y: pointRef.y };
}

/**
 * Calculate the angle from one point to another
 *
 * @param from - Starting point
 * @param to - Target point
 * @returns Angle in degrees (0 = right, 90 = up)
 */
function calculateAngle(from: Position, to: Position): number {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	return Math.atan2(-dy, dx) * (180 / Math.PI); // Negative dy because SVG y is inverted
}

/**
 * Convert a PointRef to a string key for caching
 */
function pointRefToKey(ref: PointRef): string {
	return typeof ref === 'string' ? ref : `${ref.x},${ref.y}`;
}

/**
 * Create an arc object state
 *
 * @param id - Object ID
 * @param center - Center position
 * @param radius - Arc radius
 * @param startAngle - Start angle in degrees
 * @param endAngle - End angle in degrees
 * @param progress - Drawing progress (0-1)
 * @param style - Optional style properties
 * @returns Object state for the arc
 */
function createArcState(
	id: string,
	center: Position,
	radius: number,
	startAngle: number,
	endAngle: number,
	progress: number,
	style?: StyleProps
): ObjectState {
	// Calculate the current end angle based on progress
	const currentEndAngle = startAngle + (endAngle - startAngle) * progress;

	const arcDef: ArcDef = {
		kind: 'arc',
		id,
		center: { x: center.x, y: center.y },
		radius,
		startAngle,
		endAngle: currentEndAngle,
		visible: true,
		style
	};

	return {
		def: arcDef,
		visible: true,
		position: center,
		drawProgress: progress
	};
}

/**
 * Create a segment object state
 *
 * @param id - Object ID
 * @param from - Starting position
 * @param to - Ending position
 * @param progress - Drawing progress (0-1)
 * @param style - Optional style properties
 * @returns Object state for the segment
 */
function createSegmentState(
	id: string,
	from: Position,
	to: Position,
	progress: number,
	style?: StyleProps
): ObjectState {
	const segmentDef: SegmentDef = {
		kind: 'segment',
		id,
		from: { x: from.x, y: from.y },
		to: { x: to.x, y: to.y },
		visible: true,
		style
	};

	return {
		def: segmentDef,
		visible: true,
		position: from,
		drawProgress: progress
	};
}

// =============================================================================
// Draw Arc Action Executor
// =============================================================================

/**
 * Action executor for drawing arcs with the compass
 *
 * This executor:
 * 1. Positions the compass at the center point
 * 2. Sets the compass opening to match the radius
 * 3. Animates the compass rotation to trace the arc
 * 4. Optionally creates an arc object as it draws
 *
 * @example
 * ```typescript
 * const action: DrawArcActionDef = {
 *   kind: 'drawArc',
 *   center: 'A',
 *   radius: 100,
 *   startAngle: 0,
 *   endAngle: 180,
 *   duration: 1000,
 *   easing: 'easeInOut',
 *   createObject: {
 *     id: 'arc1',
 *     style: { color: '#3b82f6', lineWidth: 2 }
 *   }
 * };
 * ```
 */
export class DrawArcActionExecutor extends BaseActionExecutor<DrawArcActionDef> {
	readonly kind = 'drawArc' as const;

	/** Cached start states for each action (keyed by center point ID) */
	private startStates = new Map<string, DrawArcStartState>();

	getDuration(action: DrawArcActionDef, _context: ActionContext): number {
		return action.duration ?? DEFAULT_ANIMATION_DURATION;
	}

	execute(action: DrawArcActionDef, progress: number, context: ActionContext): InterpolationState {
		const { center, radius, startAngle, endAngle, easing, createObject } = action;

		try {
			// Get center point position
			const centerPos = getPointPosition(center, context);
			if (!centerPos) {
				return notFoundResult(`center point: ${center}`);
			}

			// Evaluate expressions
			const radiusValue = evaluateExpr(radius, context.evalContext);
			const startAngleValue = evaluateExpr(startAngle, context.evalContext);
			const endAngleValue = evaluateExpr(endAngle, context.evalContext);

			// Get or capture start state
			const centerKey = pointRefToKey(center);
			let startState = this.startStates.get(centerKey);
			if (!startState) {
				const compassState = context.getInstrument('compass');
				startState = {
					compassState: compassState ?? {
						type: 'compass',
						x: centerPos.x,
						y: centerPos.y,
						rotation: startAngleValue,
						visible: true,
						scale: 1,
						compassRadius: radiusValue
					},
					centerPosition: centerPos
				};
				this.startStates.set(centerKey, startState);
			}

			// Calculate current angle based on progress
			const currentAngle = interpolateAngle(startAngleValue, endAngleValue, progress, easing);

			// Update compass state
			const compassState: InstrumentRuntimeState = {
				type: 'compass',
				x: centerPos.x,
				y: centerPos.y,
				rotation: currentAngle,
				visible: true,
				scale: 1,
				compassRadius: radiusValue
			};
			context.updateInstrument('compass', compassState);

			// Create or update arc object if specified
			if (createObject) {
				const arcState = createArcState(
					createObject.id,
					centerPos,
					radiusValue,
					startAngleValue,
					endAngleValue,
					progress,
					createObject.style
				);
				context.updateObject(createObject.id, arcState);
			}

			// Clear cached start state when animation completes
			if (progress >= 1) {
				this.startStates.delete(centerKey);
			}

			return successResult();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			return errorResult(`DrawArc action failed: ${message}`);
		}
	}

	captureStartState(
		action: DrawArcActionDef,
		context: ActionContext
	): DrawArcStartState | undefined {
		const centerPos = getPointPosition(action.center, context);
		if (!centerPos) return undefined;

		const compassState = context.getInstrument('compass');
		const startState: DrawArcStartState = {
			compassState: compassState ?? {
				type: 'compass',
				x: centerPos.x,
				y: centerPos.y,
				rotation: 0,
				visible: false,
				scale: 1,
				compassRadius: 100
			},
			centerPosition: centerPos
		};

		this.startStates.set(pointRefToKey(action.center), startState);
		return startState;
	}

	restoreStartState(action: DrawArcActionDef, startState: unknown, context: ActionContext): void {
		if (!startState || typeof startState !== 'object') return;
		const state = startState as DrawArcStartState;
		if (!state.compassState) return;

		context.updateInstrument('compass', state.compassState);

		// Remove created object if any
		if (action.createObject) {
			// Note: ObjectState deletion would need to be handled by the context
			// For now, we just mark it as invisible
			const obj = context.getObject(action.createObject.id);
			if (obj) {
				context.updateObject(action.createObject.id, { ...obj, visible: false });
			}
		}

		this.startStates.delete(pointRefToKey(action.center));
	}

	/**
	 * Reset the executor's internal state
	 */
	reset(): void {
		this.startStates.clear();
	}
}

// =============================================================================
// Draw Line Action Executor
// =============================================================================

/**
 * Action executor for drawing lines with the pencil
 *
 * This executor:
 * 1. Positions the pencil at the starting point
 * 2. Animates the pencil movement to the ending point
 * 3. Creates a trace line as it moves
 * 4. Optionally creates a segment object as it draws
 *
 * @example
 * ```typescript
 * const action: DrawLineActionDef = {
 *   kind: 'drawLine',
 *   from: 'A',
 *   to: 'B',
 *   duration: 800,
 *   easing: 'linear',
 *   createObject: {
 *     id: 'segment_AB',
 *     style: { color: '#1e40af', lineWidth: 2 }
 *   }
 * };
 * ```
 */
export class DrawLineActionExecutor extends BaseActionExecutor<DrawLineActionDef> {
	readonly kind = 'drawLine' as const;

	/** Cached start states for each action (keyed by from-to pair) */
	private startStates = new Map<string, DrawLineStartState>();

	getDuration(action: DrawLineActionDef, _context: ActionContext): number {
		return action.duration ?? DEFAULT_ANIMATION_DURATION;
	}

	execute(action: DrawLineActionDef, progress: number, context: ActionContext): InterpolationState {
		const { from, to, easing, createObject } = action;
		const fromKey = pointRefToKey(from);
		const toKey = pointRefToKey(to);
		const stateKey = `${fromKey}-${toKey}`;

		try {
			// Get point positions
			const fromPos = getPointPosition(from, context);
			const toPos = getPointPosition(to, context);

			if (!fromPos) {
				return notFoundResult(`from point: ${fromKey}`);
			}
			if (!toPos) {
				return notFoundResult(`to point: ${toKey}`);
			}

			// Get or capture start state
			let startState = this.startStates.get(stateKey);
			if (!startState) {
				const pencilState = context.getInstrument('pencil');
				startState = {
					pencilState,
					fromPosition: fromPos,
					toPosition: toPos
				};
				this.startStates.set(stateKey, startState);
			}

			// Calculate current position based on progress
			const easedProgress = progress; // Easing will be applied in interpolate
			const currentX = interpolate(fromPos.x, toPos.x, easedProgress, easing);
			const currentY = interpolate(fromPos.y, toPos.y, easedProgress, easing);

			// Calculate pencil rotation to point in direction of movement
			const angle = calculateAngle(fromPos, toPos);

			// Update pencil state
			const pencilState: InstrumentRuntimeState = {
				type: 'pencil',
				x: currentX,
				y: currentY,
				rotation: angle - 45, // Adjust for default pencil rotation
				visible: true,
				scale: 1
			};

			context.updateInstrument('pencil', pencilState);

			// Create or update segment object if specified
			if (createObject) {
				const segmentState = createSegmentState(
					createObject.id,
					fromPos,
					toPos,
					progress,
					createObject.style
				);
				context.updateObject(createObject.id, segmentState);
			}

			// Clear cached start state when animation completes
			if (progress >= 1) {
				this.startStates.delete(stateKey);
			}

			return successResult();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			return errorResult(`DrawLine action failed: ${message}`);
		}
	}

	captureStartState(
		action: DrawLineActionDef,
		context: ActionContext
	): DrawLineStartState | undefined {
		const fromPos = getPointPosition(action.from, context);
		const toPos = getPointPosition(action.to, context);

		if (!fromPos || !toPos) return undefined;

		const stateKey = `${pointRefToKey(action.from)}-${pointRefToKey(action.to)}`;
		const pencilState = context.getInstrument('pencil');

		const startState: DrawLineStartState = {
			pencilState,
			fromPosition: fromPos,
			toPosition: toPos
		};

		this.startStates.set(stateKey, startState);
		return startState;
	}

	restoreStartState(action: DrawLineActionDef, startState: unknown, context: ActionContext): void {
		if (!startState || typeof startState !== 'object') return;
		const state = startState as DrawLineStartState;

		// Restore pencil state if it existed
		if (state.pencilState) {
			context.updateInstrument('pencil', state.pencilState);
		}

		// Remove created object if any
		if (action.createObject) {
			const obj = context.getObject(action.createObject.id);
			if (obj) {
				context.updateObject(action.createObject.id, { ...obj, visible: false });
			}
		}

		const stateKey = `${pointRefToKey(action.from)}-${pointRefToKey(action.to)}`;
		this.startStates.delete(stateKey);
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
 * Create a new DrawArcActionExecutor instance
 */
export function createDrawArcExecutor(): DrawArcActionExecutor {
	return new DrawArcActionExecutor();
}

/**
 * Create a new DrawLineActionExecutor instance
 */
export function createDrawLineExecutor(): DrawLineActionExecutor {
	return new DrawLineActionExecutor();
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if an action is a DrawArcActionDef
 */
export function isDrawArcActionDef(action: { kind: string }): action is DrawArcActionDef {
	return action.kind === 'drawArc';
}

/**
 * Check if an action is a DrawLineActionDef
 */
export function isDrawLineActionDef(action: { kind: string }): action is DrawLineActionDef {
	return action.kind === 'drawLine';
}

// =============================================================================
// Helper Factory Functions
// =============================================================================

/**
 * Create a DrawArcActionDef
 *
 * @param center - ID of the center point
 * @param radius - Radius of the arc
 * @param startAngle - Start angle in degrees
 * @param endAngle - End angle in degrees
 * @param options - Optional parameters (duration, easing, createObject)
 * @returns DrawArcActionDef
 */
export function makeDrawArcAction(
	center: string,
	radius: Expr,
	startAngle: Expr,
	endAngle: Expr,
	options?: {
		duration?: number;
		easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
		createObject?: { id: string; style?: StyleProps };
	}
): DrawArcActionDef {
	return {
		kind: 'drawArc',
		center,
		radius,
		startAngle,
		endAngle,
		...options
	};
}

/**
 * Create a DrawLineActionDef
 *
 * @param from - ID of the starting point
 * @param to - ID of the ending point
 * @param options - Optional parameters (duration, easing, createObject)
 * @returns DrawLineActionDef
 */
export function makeDrawLineAction(
	from: string,
	to: string,
	options?: {
		duration?: number;
		easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
		createObject?: { id: string; style?: StyleProps };
	}
): DrawLineActionDef {
	return {
		kind: 'drawLine',
		from,
		to,
		...options
	};
}
