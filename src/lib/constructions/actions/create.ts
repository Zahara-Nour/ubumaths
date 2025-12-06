/**
 * Create Action Executor
 *
 * Handles the creation of geometric objects. This executor provides an action-level
 * interface for object creation, allowing it to be used in parallel steps and
 * other action contexts.
 *
 * Note: Object creation is typically handled at the Step level via CreateStep.
 * This executor provides an alternative for advanced use cases.
 *
 * @module constructions/actions/create
 */

import type {
	ObjectDef,
	ObjectState,
	PointDef,
	SegmentDef,
	CircleDef,
	LineDef,
	RayDef,
	ArcDef,
	PolygonDef,
	TextDef,
	AngleMarkDef
} from '../types';
import { evaluateExpr, type EvaluationContext } from '../core/evaluator';
import {
	successResult,
	errorResult,
	type ActionExecutor,
	type ActionContext,
	type InterpolationState
} from './base';

// =============================================================================
// Types
// =============================================================================

/**
 * Create action definition
 *
 * While not part of the standard ActionDef union, this type can be used
 * for programmatic object creation through the action executor interface.
 */
export interface CreateActionDef {
	readonly kind: 'create';
	/** The object definition to create */
	readonly object: ObjectDef;
	/** Duration is always 0 for create actions */
	readonly duration?: 0;
}

/**
 * Type guard for CreateActionDef
 *
 * @param action - Action to check
 * @returns True if action is a CreateActionDef
 */
export function isCreateActionDef(action: { kind: string }): action is CreateActionDef {
	return action.kind === 'create';
}

// =============================================================================
// Object State Creation
// =============================================================================

/**
 * Create an evaluation context from the action context
 *
 * @param context - Action context
 * @returns Evaluation context for expression evaluation
 */
function createEvalContext(context: ActionContext): EvaluationContext {
	return context.evalContext;
}

/**
 * Create initial state for a point object
 *
 * @param def - Point definition
 * @param context - Action context
 * @returns Object state with calculated position
 */
function createPointState(def: PointDef, context: ActionContext): ObjectState {
	const evalCtx = createEvalContext(context);

	const x = evaluateExpr(def.x, evalCtx);
	const y = evaluateExpr(def.y, evalCtx);

	return {
		def,
		visible: def.visible !== false,
		position: { x, y },
		style: def.style
	};
}

/**
 * Create initial state for a segment object
 *
 * @param def - Segment definition
 * @param context - Action context
 * @returns Object state
 */
function createSegmentState(def: SegmentDef, _context: ActionContext): ObjectState {
	return {
		def,
		visible: def.visible !== false,
		style: def.style,
		drawProgress: 1 // Fully drawn by default
	};
}

/**
 * Create initial state for a circle object
 *
 * @param def - Circle definition
 * @param context - Action context
 * @returns Object state
 */
function createCircleState(def: CircleDef, _context: ActionContext): ObjectState {
	return {
		def,
		visible: def.visible !== false,
		style: def.style,
		drawProgress: 1 // Fully drawn by default
	};
}

/**
 * Create initial state for a line object
 *
 * @param def - Line definition
 * @param context - Action context
 * @returns Object state
 */
function createLineState(def: LineDef, _context: ActionContext): ObjectState {
	return {
		def,
		visible: def.visible !== false,
		style: def.style
	};
}

/**
 * Create initial state for a ray object
 *
 * @param def - Ray definition
 * @param context - Action context
 * @returns Object state
 */
function createRayState(def: RayDef, _context: ActionContext): ObjectState {
	return {
		def,
		visible: def.visible !== false,
		style: def.style
	};
}

/**
 * Create initial state for an arc object
 *
 * @param def - Arc definition
 * @param context - Action context
 * @returns Object state
 */
function createArcState(def: ArcDef, _context: ActionContext): ObjectState {
	return {
		def,
		visible: def.visible !== false,
		style: def.style,
		drawProgress: 1
	};
}

/**
 * Create initial state for a polygon object
 *
 * @param def - Polygon definition
 * @param context - Action context
 * @returns Object state
 */
function createPolygonState(def: PolygonDef, _context: ActionContext): ObjectState {
	return {
		def,
		visible: def.visible !== false,
		style: def.style
	};
}

/**
 * Create initial state for a text object
 *
 * @param def - Text definition
 * @param context - Action context
 * @returns Object state with calculated position
 */
function createTextState(def: TextDef, context: ActionContext): ObjectState {
	const evalCtx = createEvalContext(context);

	const x = evaluateExpr(def.x, evalCtx);
	const y = evaluateExpr(def.y, evalCtx);

	return {
		def,
		visible: def.visible !== false,
		position: { x, y },
		style: def.style
	};
}

/**
 * Create initial state for an angle mark object
 *
 * @param def - Angle mark definition
 * @param context - Action context
 * @returns Object state
 */
function createAngleMarkState(def: AngleMarkDef, _context: ActionContext): ObjectState {
	return {
		def,
		visible: def.visible !== false,
		style: def.style
	};
}

/**
 * Create initial state for any object type
 *
 * Routes to the appropriate state creation function based on object kind.
 *
 * @param def - Object definition
 * @param context - Action context
 * @returns Object state
 */
export function createObjectState(def: ObjectDef, context: ActionContext): ObjectState {
	switch (def.kind) {
		case 'point':
			return createPointState(def, context);
		case 'segment':
			return createSegmentState(def, context);
		case 'circle':
			return createCircleState(def, context);
		case 'line':
			return createLineState(def, context);
		case 'ray':
			return createRayState(def, context);
		case 'arc':
			return createArcState(def, context);
		case 'polygon':
			return createPolygonState(def, context);
		case 'text':
			return createTextState(def, context);
		case 'angleMark':
			return createAngleMarkState(def, context);
		default: {
			// Exhaustive check - this should never happen
			const _exhaustive: never = def;
			throw new Error(`Unknown object kind: ${(def as ObjectDef).kind}`);
		}
	}
}

// =============================================================================
// Create Action Executor
// =============================================================================

/**
 * Action executor for create actions
 *
 * Creates a new geometric object and adds it to the construction.
 * This is an instantaneous action (duration = 0).
 *
 * @example
 * ```typescript
 * const action: CreateActionDef = {
 *   kind: 'create',
 *   object: {
 *     kind: 'point',
 *     id: 'A',
 *     x: 100,
 *     y: 200,
 *     label: 'A'
 *   }
 * };
 *
 * executor.execute(action, 1, context);
 * ```
 */
export class CreateActionExecutor implements ActionExecutor<CreateActionDef> {
	readonly kind = 'create' as const;

	/**
	 * Get the duration of this action
	 *
	 * Create actions are always instantaneous.
	 *
	 * @returns 0 (instant)
	 */
	getDuration(_action: CreateActionDef, _context: ActionContext): number {
		return 0;
	}

	/**
	 * Execute the create action
	 *
	 * Creates the object and adds it to the context.
	 *
	 * @param action - Create action definition
	 * @param progress - Progress value (ignored for instant actions)
	 * @param context - Action context
	 * @returns Interpolation result
	 */
	execute(action: CreateActionDef, _progress: number, context: ActionContext): InterpolationState {
		const { object } = action;

		try {
			// Check if object already exists
			if (context.getObject(object.id)) {
				return errorResult(`Object already exists: ${object.id}`);
			}

			// Create the object state
			const state = createObjectState(object, context);

			// Add to context
			context.updateObject(object.id, state);

			return successResult();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			return errorResult(`Failed to create object: ${message}`);
		}
	}

	/**
	 * Capture start state (not applicable for create actions)
	 */
	captureStartState(_action: CreateActionDef, _context: ActionContext): undefined {
		// Create actions don't need start state capture
		return undefined;
	}

	/**
	 * Restore start state (limited support for create actions)
	 *
	 * Note: Object removal is not currently supported by ActionContext.
	 * Timeline implementations must handle create action reversal at a higher
	 * level by maintaining snapshots or using a different approach.
	 *
	 * @param action - Create action definition
	 * @param _startState - Not used for create actions
	 * @param _context - Action context
	 */
	restoreStartState(action: CreateActionDef, _startState: unknown, _context: ActionContext): void {
		// Object removal is not supported by ActionContext.
		// Log a warning to help debugging timeline seek issues.
		if (typeof console !== 'undefined' && console.warn) {
			console.warn(
				`[CreateActionExecutor] Cannot restore state for create action on object: ${action.object.id}. ` +
					`Object removal is not supported.`
			);
		}
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
 * Create a new CreateActionExecutor instance
 */
export function createCreateExecutor(): CreateActionExecutor {
	return new CreateActionExecutor();
}

/**
 * Create a CreateActionDef from an ObjectDef
 *
 * Convenience function for creating create actions programmatically.
 *
 * @param object - Object definition to create
 * @returns Create action definition
 */
export function makeCreateAction(object: ObjectDef): CreateActionDef {
	return {
		kind: 'create',
		object
	};
}
