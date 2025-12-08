/**
 * Construction Types - Type definitions for geometric construction animations
 *
 * This module defines the core types for representing geometric construction
 * scripts in a simplified flat JSON format. Types are inferred from Zod schemas
 * defined in schemas.ts for runtime validation and TypeScript types are derived
 * from those schemas.
 *
 * New format examples:
 * - Objects: { "point": "A", "at": [100, 200] }
 * - Instruments: { "move": "pencil", "to": [100, 200] }
 * - Control: { "pause": 1000 }, { "parallel": [...] }
 *
 * @module constructions/types
 */

import type { z } from 'zod';
import {
	type ConstructionScriptInput,
	type StepInput,
	type NonParallelStepInput,
	type PointStepInput,
	type MidpointStepInput,
	type LineStepInput,
	type ArcStepInput,
	type CircleStepInput,
	type TextStepInput,
	type LabelStepInput,
	type MarkStepInput,
	type MarkShape as MarkShapeInput,
	type MoveStepInput,
	type PlaceStepInput,
	type ShowStepInput,
	type HideStepInput,
	type RotateStepInput,
	type SpreadStepInput,
	type RaiseStepInput,
	type LowerStepInput,
	type StyleStepInput,
	type PauseStepInput,
	type InstructionStepInput,
	type ParallelStepInput,
	type CoordPair,
	type TargetRef,
	type LabelInput,
	parameterDefSchema,
	canvasConfigSchema,
	instrumentSchema,
	lineStyleSchema,
	pointStyleSchema,
	arrowSchema,
	isPointStep,
	isMidpointStep,
	isLineStep,
	isArcStep,
	isCircleStep,
	isTextStep,
	isLabelStep,
	isMarkStep,
	isMoveStep,
	isPlaceStep,
	isShowStep,
	isHideStep,
	isRotateStep,
	isSpreadStep,
	isRaiseStep,
	isLowerStep,
	isStyleStep,
	isPauseStep,
	isInstructionStep,
	isParallelStep
} from './schemas.js';

// =============================================================================
// Re-exports from Schemas (Validated Input Types)
// =============================================================================

/**
 * Complete construction script (validated input format)
 * Inferred from constructionScriptSchema
 */
export type ConstructionScript = ConstructionScriptInput;

/**
 * A single step in the construction (validated input format)
 * Can be any of: point, line, arc, circle, text, mark, move, show, hide,
 * rotate, spread, raise, lower, style, pause, or parallel
 */
export type Step = StepInput;

/**
 * Non-parallel step (for use in parallel arrays)
 */
export type NonParallelStep = NonParallelStepInput;

/**
 * Individual step types (validated input format)
 */
export type PointStep = PointStepInput;
export type MidpointStep = MidpointStepInput;
export type LineStep = LineStepInput;
export type ArcStep = ArcStepInput;
export type CircleStep = CircleStepInput;
export type TextStep = TextStepInput;
export type LabelStep = LabelStepInput;
export type MarkStep = MarkStepInput;
export type MoveStep = MoveStepInput;
export type PlaceStep = PlaceStepInput;
export type ShowStep = ShowStepInput;
export type HideStep = HideStepInput;
export type RotateStep = RotateStepInput;
export type SpreadStep = SpreadStepInput;
export type RaiseStep = RaiseStepInput;
export type LowerStep = LowerStepInput;
export type StyleStep = StyleStepInput;
export type PauseStep = PauseStepInput;
export type InstructionStep = InstructionStepInput;
export type ParallelStep = ParallelStepInput;

/**
 * Coordinate pair [x, y]
 */
export type Coord = CoordPair;

/**
 * Target reference: either a point ID (string) or coordinates [x, y]
 */
export type Target = TargetRef;

/**
 * Label: string or object with text and offset
 */
export type Label = LabelInput;

/**
 * Parameter definition (inferred from Zod schema)
 */
export type ParameterDef = z.infer<typeof parameterDefSchema>;

/**
 * Number parameter definition
 */
export type NumberParameterDef = Extract<ParameterDef, { type: 'number' }>;

/**
 * Boolean parameter definition
 */
export type BooleanParameterDef = Extract<ParameterDef, { type: 'boolean' }>;

/**
 * Color parameter definition
 */
export type ColorParameterDef = Extract<ParameterDef, { type: 'color' }>;

/**
 * Map of parameter names to their definitions
 */
export interface ParameterDefMap {
	readonly [name: string]: ParameterDef;
}

/**
 * Canvas configuration (inferred from Zod schema)
 */
export type CanvasConfig = z.infer<typeof canvasConfigSchema>;

/**
 * Instrument types
 */
export type InstrumentType = z.infer<typeof instrumentSchema>;

/**
 * Line style
 */
export type LineStyle = z.infer<typeof lineStyleSchema>;

/**
 * Point style
 */
export type PointStyle = z.infer<typeof pointStyleSchema>;

/**
 * Arrow position
 */
export type ArrowPosition = z.infer<typeof arrowSchema>;

/**
 * Mark shape (tick, cross, circle)
 */
export type MarkShape = MarkShapeInput;

// =============================================================================
// Expression Types
// =============================================================================

/**
 * An expression that can be either a literal number or a string expression
 * containing parameter references.
 *
 * String expressions use `$paramName` for parameters and `$objectId.x` or
 * `$objectId.y` for object coordinates.
 *
 * @example
 * // Literal number
 * const x: Expr = 100;
 *
 * // Parameter reference
 * const x: Expr = "$sideLength";
 *
 * // Expression with parameter
 * const x: Expr = "$sideLength * sqrt(3) / 2";
 *
 * // Object coordinate reference
 * const x: Expr = "$A.x + 50";
 */
export type Expr = number | string;

// =============================================================================
// Style Properties (Common Runtime Styles)
// =============================================================================

/**
 * Common style properties for runtime state
 * Note: Input validation uses schemas, this is for runtime state only
 */
export interface StyleProps {
	/** Stroke/fill color (CSS color string) */
	readonly color?: string;
	/** Line width in pixels */
	readonly lineWidth?: number;
	/** Line style */
	readonly lineStyle?: LineStyle;
	/** Opacity (0-1) */
	readonly opacity?: number;
}

// =============================================================================
// Runtime Types (Engine State Management)
// =============================================================================

/**
 * Current values of all parameters
 */
export interface ParameterValues {
	readonly [name: string]: number | boolean | string;
}

/**
 * Position in 2D space
 */
export interface Position {
	readonly x: number;
	readonly y: number;
}

/**
 * Object type discriminator
 */
export type ObjectType = 'point' | 'line' | 'arc' | 'circle' | 'text' | 'label' | 'mark';

/**
 * Runtime state of a drawn object (point, line, arc, circle, text, label, mark)
 * Tracks the current state of objects created by steps
 */
export interface ObjectState {
	/** Object ID */
	readonly id: string;
	/** Object type (from step type) */
	readonly type: ObjectType;
	/** Original step that created this object */
	readonly step:
		| PointStep
		| MidpointStep
		| LineStep
		| ArcStep
		| CircleStep
		| TextStep
		| LabelStep
		| MarkStep;
	/** Current visibility */
	visible: boolean;
	/** Current position (for movable objects like points, text, labels, marks) */
	position?: Position;
	/** Current style overrides */
	style?: StyleProps;
	/** Animation progress (0-1) for drawing animations */
	drawProgress?: number;
	/** Label (for points) */
	label?: string;
	/** Parent object ID (for labels attached to points) */
	parentId?: string;
	/** Computed geometry values */
	computed?: {
		// For lines
		fromX?: number;
		fromY?: number;
		toX?: number;
		toY?: number;
		// For arcs and circles
		centerX?: number;
		centerY?: number;
		radius?: number;
		startAngle?: number;
		endAngle?: number;
	};
}

/**
 * @deprecated Use ObjectState instead. Alias for backward compatibility.
 */
export type DrawnObjectState = ObjectState;

/**
 * Runtime state of an instrument
 */
export interface InstrumentRuntimeState {
	readonly type: InstrumentType;
	visible: boolean;
	x: number;
	y: number;
	rotation: number;
	scale: number;
	/** Opacity for animations (0-1) */
	opacity?: number;
	/** 3D rotation around X-axis (degrees) for raise/lower animation */
	rotateX?: number;
	/** Compass-specific: current opening radius */
	compassRadius?: number;
}

/**
 * Complete runtime state of a construction
 * Used by the engine to track execution state
 */
export interface ConstructionState {
	/** Current step index */
	currentStep: number;
	/** Whether animation is playing */
	isPlaying: boolean;
	/** Current parameter values */
	parameters: ParameterValues;
	/** State of all drawn objects by ID */
	objects: Map<string, ObjectState>;
	/** State of instruments */
	instruments: Map<InstrumentType, InstrumentRuntimeState>;
	/** Time elapsed in current animation (ms) */
	elapsedTime: number;
}

// =============================================================================
// Type Guards (Re-exported from Schemas)
// =============================================================================

/**
 * Re-export type guards from schemas for step type checking
 * These are used by the engine to determine step types at runtime
 */
export {
	isPointStep,
	isMidpointStep,
	isLineStep,
	isArcStep,
	isCircleStep,
	isTextStep,
	isLabelStep,
	isMarkStep,
	isMoveStep,
	isPlaceStep,
	isShowStep,
	isHideStep,
	isRotateStep,
	isSpreadStep,
	isRaiseStep,
	isLowerStep,
	isStyleStep,
	isPauseStep,
	isInstructionStep,
	isParallelStep
};
