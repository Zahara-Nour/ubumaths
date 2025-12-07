/**
 * Construction Schemas - Zod validation schemas for construction scripts
 *
 * This module provides comprehensive Zod schemas for validating construction
 * script JSON data using a simplified flat format.
 *
 * New format examples:
 * - Objects: { "point": "A", "at": [100, 200] }
 * - Instruments: { "move": "pencil", "to": [100, 200] }
 * - Control: { "pause": 1000 }, { "parallel": [...] }
 *
 * @module constructions/schemas
 */

import { z } from 'zod';

// =============================================================================
// Constants for Validation
// =============================================================================

/** Maximum coordinate value (prevents rendering issues) */
const MAX_COORD = 10000;

/** Minimum coordinate value */
const MIN_COORD = -10000;

/** Maximum duration for any animation in ms (30 seconds) */
const MAX_DURATION = 30000;

/** Maximum number of steps in a construction */
const MAX_STEPS = 1000;

/** Maximum number of parameters */
const MAX_PARAMETERS = 50;

/** Maximum string length for labels and content */
const MAX_STRING_LENGTH = 500;

/** Maximum line width */
const MAX_LINE_WIDTH = 20;

/** Maximum font size */
const MAX_FONT_SIZE = 100;

/** Minimum font size */
const MIN_FONT_SIZE = 6;

// =============================================================================
// Base Schemas
// =============================================================================

/**
 * Schema for expression values (number or string expression)
 *
 * String expressions can contain:
 * - Parameter references: $paramName
 * - Object coordinate references: $objectId.x, $objectId.y
 * - Mathematical expressions: $sideLength * sqrt(3) / 2
 */
export const exprSchema = z.union([
	z.number().finite('Expression must be a finite number'),
	z
		.string()
		.min(1, 'Expression string cannot be empty')
		.max(MAX_STRING_LENGTH, `Expression string too long (max ${MAX_STRING_LENGTH} chars)`)
]);

/**
 * Schema for coordinate values with bounds
 */
export const coordSchema = z
	.number()
	.finite('Coordinate must be a finite number')
	.min(MIN_COORD, `Coordinate too small (min ${MIN_COORD})`)
	.max(MAX_COORD, `Coordinate too large (max ${MAX_COORD})`);

/**
 * Schema for coordinate expression (number or string)
 */
export const coordExprSchema = z.union([
	coordSchema,
	z
		.string()
		.min(1, 'Coordinate expression cannot be empty')
		.max(MAX_STRING_LENGTH, `Coordinate expression too long`)
]);

/**
 * Schema for duration values
 */
export const durationSchema = z
	.number()
	.int('Duration must be an integer')
	.min(0, 'Duration cannot be negative')
	.max(MAX_DURATION, `Duration too long (max ${MAX_DURATION}ms)`);

/**
 * Schema for CSS color strings
 */
export const colorSchema = z
	.string()
	.min(1, 'Color cannot be empty')
	.max(50, 'Color string too long')
	.regex(
		/^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-zA-Z]+)/,
		'Invalid color format (use hex, rgb, hsl, or named colors)'
	);

/**
 * Schema for object identifiers
 */
export const objectIdSchema = z
	.string()
	.min(1, 'Object ID cannot be empty')
	.max(50, 'Object ID too long')
	.regex(
		/^[a-zA-Z][a-zA-Z0-9_]*$/,
		'Object ID must start with letter, contain only alphanumeric and underscore'
	);

/**
 * Schema for parameter names
 */
export const parameterNameSchema = z
	.string()
	.min(1, 'Parameter name cannot be empty')
	.max(50, 'Parameter name too long')
	.regex(
		/^[a-zA-Z][a-zA-Z0-9_]*$/,
		'Parameter name must start with letter, contain only alphanumeric and underscore'
	);

/**
 * Coordinate pair as tuple [x, y]
 */
export const coordPairSchema = z.tuple([coordExprSchema, coordExprSchema]);

/**
 * Target reference: either a point ID (string) or coordinates [x, y]
 */
export const targetRefSchema = z.union([objectIdSchema, coordPairSchema]);

/**
 * Instrument types (including compassRaised for 3D raised compass view)
 */
export const instrumentSchema = z.enum([
	'ruler',
	'compass',
	'compassRaised',
	'protractor',
	'setSquare',
	'pencil'
]);

/**
 * Drawing instrument (for move, rotate)
 */
export const drawingTargetSchema = z.union([instrumentSchema, objectIdSchema]);

// =============================================================================
// Style Schemas
// =============================================================================

/**
 * Line style enum
 */
export const lineStyleSchema = z.enum(['solid', 'dashed', 'dotted']);

/**
 * Point style enum
 */
export const pointStyleSchema = z.enum(['dot', 'cross', 'circle', 'none']);

/**
 * Arrow position enum
 */
export const arrowSchema = z.enum(['start', 'end', 'both']);

/**
 * Common style properties for inline use
 */
export const inlineStyleSchema = z.object({
	color: colorSchema.optional(),
	width: z.number().min(0).max(MAX_LINE_WIDTH).optional(),
	style: lineStyleSchema.optional(),
	opacity: z.number().min(0).max(1).optional()
});

// =============================================================================
// Parameter Definition Schemas
// =============================================================================

/**
 * Number parameter definition
 */
export const numberParameterDefSchema = z
	.object({
		type: z.literal('number'),
		label: z.string().min(1).max(100, 'Label too long'),
		default: z.number().finite('Default must be finite'),
		min: z.number().finite('Min must be finite'),
		max: z.number().finite('Max must be finite'),
		step: z.number().positive('Step must be positive').optional()
	})
	.refine((data) => data.min <= data.max, {
		message: 'min must be less than or equal to max',
		path: ['min']
	})
	.refine((data) => data.default >= data.min && data.default <= data.max, {
		message: 'default must be between min and max',
		path: ['default']
	});

/**
 * Boolean parameter definition
 */
export const booleanParameterDefSchema = z.object({
	type: z.literal('boolean'),
	label: z.string().min(1).max(100, 'Label too long'),
	default: z.boolean()
});

/**
 * Color parameter definition
 */
export const colorParameterDefSchema = z.object({
	type: z.literal('color'),
	label: z.string().min(1).max(100, 'Label too long'),
	default: colorSchema
});

/**
 * Union of all parameter definitions
 */
export const parameterDefSchema = z.discriminatedUnion('type', [
	numberParameterDefSchema,
	booleanParameterDefSchema,
	colorParameterDefSchema
]);

/**
 * Map of parameter definitions
 */
export const parameterDefMapSchema = z
	.record(z.string(), parameterDefSchema)
	.refine((data) => Object.keys(data).length <= MAX_PARAMETERS, {
		message: `Too many parameters (max ${MAX_PARAMETERS})`
	})
	.refine(
		(data) => {
			const invalidKeys = Object.keys(data).filter(
				(key) => !parameterNameSchema.safeParse(key).success
			);
			return invalidKeys.length === 0;
		},
		{
			message:
				'All parameter names must start with a letter and contain only alphanumeric characters and underscores'
		}
	);

// =============================================================================
// Label Schema
// =============================================================================

/**
 * Label can be a simple string or an object with text and offset
 */
export const labelSchema = z.union([
	z.string().max(20, 'Label text too long'),
	z.object({
		text: z.string().max(20, 'Label text too long'),
		offset: z.tuple([z.number(), z.number()]).optional()
	})
]);

// =============================================================================
// Object Step Schemas (first key = type, value = id)
// =============================================================================

/**
 * Point step: { "point": "A", "at": [100, 200], "label": "A" }
 */
export const pointStepSchema = z.object({
	point: objectIdSchema,
	at: coordPairSchema,
	label: labelSchema.optional(),
	style: pointStyleSchema.optional(),
	radius: z.number().min(1).max(50).optional(),
	color: colorSchema.optional(),
	visible: z.boolean().optional()
});

/**
 * Line step: { "line": "seg1", "to": "B" } or { "line": "seg1", "to": [300, 400] }
 * Draws from current pencil position to target
 */
export const lineStepSchema = z.object({
	line: objectIdSchema,
	to: targetRefSchema,
	arrow: arrowSchema.optional(),
	color: colorSchema.optional(),
	width: z.number().min(0).max(MAX_LINE_WIDTH).optional(),
	style: lineStyleSchema.optional(),
	visible: z.boolean().optional()
});

/**
 * Arc step: { "arc": "c1", "sweep": 360 }
 * Draws arc from current compass position
 */
export const arcStepSchema = z.object({
	arc: objectIdSchema,
	sweep: exprSchema, // Angle in degrees (positive = counterclockwise, negative = clockwise)
	color: colorSchema.optional(),
	width: z.number().min(0).max(MAX_LINE_WIDTH).optional(),
	style: lineStyleSchema.optional(),
	visible: z.boolean().optional()
});

/**
 * Circle step: { "circle": "c1", "center": "O", "radius": 100 }
 * or: { "circle": "c1", "center": "O", "through": "A" }
 */
export const circleStepSchema = z
	.object({
		circle: objectIdSchema,
		center: targetRefSchema,
		radius: exprSchema.optional(),
		through: objectIdSchema.optional(),
		color: colorSchema.optional(),
		width: z.number().min(0).max(MAX_LINE_WIDTH).optional(),
		style: lineStyleSchema.optional(),
		filled: z.boolean().optional(),
		fillColor: colorSchema.optional(),
		visible: z.boolean().optional()
	})
	.refine((data) => data.radius !== undefined || data.through !== undefined, {
		message: 'Circle must have either radius or through point'
	})
	.refine((data) => !(data.radius !== undefined && data.through !== undefined), {
		message: 'Circle cannot have both radius and through point'
	});

/**
 * Text step: { "text": "t1", "at": [480, 146], "content": "Hello" }
 */
export const textStepSchema = z.object({
	text: objectIdSchema,
	at: coordPairSchema,
	content: z.string().min(1).max(MAX_STRING_LENGTH),
	color: colorSchema.optional(),
	size: z.number().min(MIN_FONT_SIZE).max(MAX_FONT_SIZE).optional(),
	anchor: z.enum(['start', 'middle', 'end']).optional(),
	baseline: z.enum(['top', 'middle', 'bottom']).optional(),
	visible: z.boolean().optional()
});

/**
 * Mark step: { "mark": "m1", "at": [352, 285], "angle": 45 }
 * Tick mark on a line segment
 */
export const markStepSchema = z.object({
	mark: objectIdSchema,
	at: coordPairSchema,
	angle: exprSchema, // Rotation angle in degrees
	count: z.number().int().min(1).max(5).optional(), // Number of tick marks (default 1)
	length: z.number().min(1).max(50).optional(), // Length of tick mark
	color: colorSchema.optional(),
	width: z.number().min(0).max(MAX_LINE_WIDTH).optional(),
	visible: z.boolean().optional()
});

// =============================================================================
// Instrument Action Schemas (first key = action, value = instrument/target)
// =============================================================================

/**
 * Move step: { "move": "pencil", "to": [100, 200] } or { "move": "ruler", "to": "A" }
 */
export const moveStepSchema = z.object({
	move: drawingTargetSchema,
	to: targetRefSchema,
	duration: durationSchema.optional(),
	easing: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut']).optional()
});

/**
 * Show step: { "show": "ruler" }
 */
export const showStepSchema = z.object({
	show: drawingTargetSchema,
	duration: durationSchema.optional()
});

/**
 * Hide step: { "hide": "compass" }
 */
export const hideStepSchema = z.object({
	hide: drawingTargetSchema,
	duration: durationSchema.optional()
});

/**
 * Rotate step: { "rotate": "ruler", "toward": "B" } or { "rotate": "compass", "to": 155 }
 */
export const rotateStepSchema = z
	.object({
		rotate: drawingTargetSchema,
		toward: objectIdSchema.optional(), // Rotate to point toward this object
		to: exprSchema.optional(), // Rotate to this absolute angle (degrees)
		duration: durationSchema.optional(),
		easing: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut']).optional()
	})
	.refine((data) => data.toward !== undefined || data.to !== undefined, {
		message: 'Rotate must have either toward or to'
	})
	.refine((data) => !(data.toward !== undefined && data.to !== undefined), {
		message: 'Rotate cannot have both toward and to'
	});

/**
 * Spread step: { "spread": "compass", "to": "T" } or { "spread": "compass", "radius": 100 }
 * Sets the compass opening
 */
export const spreadStepSchema = z
	.object({
		spread: z.literal('compass'),
		to: objectIdSchema.optional(), // Spread to reach this point from current position
		radius: exprSchema.optional(), // Set to this radius directly
		duration: durationSchema.optional(),
		easing: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut']).optional()
	})
	.refine((data) => data.to !== undefined || data.radius !== undefined, {
		message: 'Spread must have either to or radius'
	})
	.refine((data) => !(data.to !== undefined && data.radius !== undefined), {
		message: 'Spread cannot have both to and radius'
	});

/**
 * Raise step: { "raise": "compass" }
 * Lifts the compass (3D animation)
 */
export const raiseStepSchema = z.object({
	raise: z.literal('compass'),
	duration: durationSchema.optional()
});

/**
 * Lower step: { "lower": "compass" }
 * Lowers the compass (3D animation)
 */
export const lowerStepSchema = z.object({
	lower: z.literal('compass'),
	duration: durationSchema.optional()
});

// =============================================================================
// Modification Schemas
// =============================================================================

/**
 * Style modification step: { "style": "t1", "color": "gray" }
 */
export const styleStepSchema = z.object({
	style: objectIdSchema,
	color: colorSchema.optional(),
	width: z.number().min(0).max(MAX_LINE_WIDTH).optional(),
	lineStyle: lineStyleSchema.optional(),
	opacity: z.number().min(0).max(1).optional(),
	visible: z.boolean().optional(),
	duration: durationSchema.optional()
});

// =============================================================================
// Control Schemas
// =============================================================================

/**
 * Pause step: { "pause": 1000 }
 */
export const pauseStepSchema = z.object({
	pause: durationSchema
});

/**
 * Non-parallel step union (for use in parallel arrays)
 */
export const nonParallelStepSchema = z.union([
	pointStepSchema,
	lineStepSchema,
	arcStepSchema,
	circleStepSchema,
	textStepSchema,
	markStepSchema,
	moveStepSchema,
	showStepSchema,
	hideStepSchema,
	rotateStepSchema,
	spreadStepSchema,
	raiseStepSchema,
	lowerStepSchema,
	styleStepSchema,
	pauseStepSchema
]);

/**
 * Parallel step: { "parallel": [...] }
 * Executes multiple steps simultaneously
 */
export const parallelStepSchema = z.object({
	parallel: z
		.array(nonParallelStepSchema)
		.min(1, 'Parallel step must have at least one action')
		.max(50, 'Too many parallel actions')
});

/**
 * Union of all step types
 * The discriminator is implicit based on which key is present
 */
export const stepSchema = z.union([
	// Objects (first key is type, value is id)
	pointStepSchema,
	lineStepSchema,
	arcStepSchema,
	circleStepSchema,
	textStepSchema,
	markStepSchema,
	// Instruments (first key is action, value is instrument)
	moveStepSchema,
	showStepSchema,
	hideStepSchema,
	rotateStepSchema,
	spreadStepSchema,
	raiseStepSchema,
	lowerStepSchema,
	// Modifications
	styleStepSchema,
	// Control
	pauseStepSchema,
	parallelStepSchema
]);

// =============================================================================
// Canvas Configuration Schema
// =============================================================================

/**
 * Canvas configuration
 */
export const canvasConfigSchema = z.object({
	width: z.number().int().min(100, 'Width too small').max(4000, 'Width too large'),
	height: z.number().int().min(100, 'Height too small').max(4000, 'Height too large'),
	backgroundColor: colorSchema.optional(),
	showGrid: z.boolean().optional(),
	gridSpacing: z.number().min(5).max(200).optional(),
	gridColor: colorSchema.optional()
});

// =============================================================================
// Construction Script Schema
// =============================================================================

/**
 * Complete construction script validation schema
 */
export const constructionScriptSchema = z.object({
	version: z.number().int().min(1, 'Version must be at least 1').max(100, 'Version too high'),
	title: z.string().max(200).optional(),
	description: z.string().max(2000).optional(),
	parameters: parameterDefMapSchema.optional(),
	canvas: canvasConfigSchema,
	steps: z.array(stepSchema).max(MAX_STEPS, `Too many steps (max ${MAX_STEPS})`)
});

// =============================================================================
// Type Exports from Schemas
// =============================================================================

/** Inferred type from constructionScriptSchema */
export type ConstructionScriptInput = z.infer<typeof constructionScriptSchema>;

/** Inferred type from stepSchema */
export type StepInput = z.infer<typeof stepSchema>;

/** Inferred type for non-parallel steps */
export type NonParallelStepInput = z.infer<typeof nonParallelStepSchema>;

/** Individual step types */
export type PointStepInput = z.infer<typeof pointStepSchema>;
export type LineStepInput = z.infer<typeof lineStepSchema>;
export type ArcStepInput = z.infer<typeof arcStepSchema>;
export type CircleStepInput = z.infer<typeof circleStepSchema>;
export type TextStepInput = z.infer<typeof textStepSchema>;
export type MarkStepInput = z.infer<typeof markStepSchema>;
export type MoveStepInput = z.infer<typeof moveStepSchema>;
export type ShowStepInput = z.infer<typeof showStepSchema>;
export type HideStepInput = z.infer<typeof hideStepSchema>;
export type RotateStepInput = z.infer<typeof rotateStepSchema>;
export type SpreadStepInput = z.infer<typeof spreadStepSchema>;
export type RaiseStepInput = z.infer<typeof raiseStepSchema>;
export type LowerStepInput = z.infer<typeof lowerStepSchema>;
export type StyleStepInput = z.infer<typeof styleStepSchema>;
export type PauseStepInput = z.infer<typeof pauseStepSchema>;
export type ParallelStepInput = z.infer<typeof parallelStepSchema>;

/** Coordinate pair type */
export type CoordPair = z.infer<typeof coordPairSchema>;

/** Target reference type (point ID or coordinates) */
export type TargetRef = z.infer<typeof targetRefSchema>;

/** Label type */
export type LabelInput = z.infer<typeof labelSchema>;

// =============================================================================
// Type Guards for Step Types
// =============================================================================

export function isPointStep(step: StepInput): step is PointStepInput {
	return 'point' in step;
}

export function isLineStep(step: StepInput): step is LineStepInput {
	return 'line' in step;
}

export function isArcStep(step: StepInput): step is ArcStepInput {
	return 'arc' in step;
}

export function isCircleStep(step: StepInput): step is CircleStepInput {
	return 'circle' in step;
}

export function isTextStep(step: StepInput): step is TextStepInput {
	return 'text' in step;
}

export function isMarkStep(step: StepInput): step is MarkStepInput {
	return 'mark' in step;
}

export function isMoveStep(step: StepInput): step is MoveStepInput {
	return 'move' in step;
}

export function isShowStep(step: StepInput): step is ShowStepInput {
	return 'show' in step;
}

export function isHideStep(step: StepInput): step is HideStepInput {
	return 'hide' in step;
}

export function isRotateStep(step: StepInput): step is RotateStepInput {
	return 'rotate' in step;
}

export function isSpreadStep(step: StepInput): step is SpreadStepInput {
	return 'spread' in step;
}

export function isRaiseStep(step: StepInput): step is RaiseStepInput {
	return 'raise' in step;
}

export function isLowerStep(step: StepInput): step is LowerStepInput {
	return 'lower' in step;
}

export function isStyleStep(step: StepInput): step is StyleStepInput {
	return 'style' in step;
}

export function isPauseStep(step: StepInput): step is PauseStepInput {
	return 'pause' in step;
}

export function isParallelStep(step: StepInput): step is ParallelStepInput {
	return 'parallel' in step;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate a construction script JSON object
 *
 * @param data - Raw JSON data to validate
 * @returns Validation result with typed data or errors
 *
 * @example
 * ```typescript
 * const result = validateConstructionScript(jsonData);
 * if (result.success) {
 *   // result.data is typed as ConstructionScriptInput
 *   console.log(result.data.steps.length);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateConstructionScript(
	data: unknown
): { success: true; data: ConstructionScriptInput } | { success: false; error: string } {
	const result = constructionScriptSchema.safeParse(data);
	if (result.success) {
		return { success: true, data: result.data };
	}
	const errorMessages = result.error.issues
		.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
		.join('; ');
	return { success: false, error: errorMessages };
}

/**
 * Validate a single step
 *
 * @param data - Raw step data to validate
 * @returns Validation result with typed data or errors
 */
export function validateStep(
	data: unknown
): { success: true; data: StepInput } | { success: false; error: string } {
	const result = stepSchema.safeParse(data);
	if (result.success) {
		return { success: true, data: result.data };
	}
	const errorMessages = result.error.issues
		.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
		.join('; ');
	return { success: false, error: errorMessages };
}

/**
 * Extract all parameter references from an expression string
 *
 * @param expr - Expression string to analyze
 * @returns Array of parameter names (without $ prefix)
 *
 * @example
 * ```typescript
 * extractParameterRefs("$sideLength * sqrt(3) / 2");
 * // Returns: ["sideLength"]
 *
 * extractParameterRefs("$A.x + $offset");
 * // Returns: ["A", "offset"]
 * ```
 */
export function extractParameterRefs(expr: string): string[] {
	const pattern = /\$([a-zA-Z][a-zA-Z0-9_]*)(?:\.x|\.y)?/g;
	const refs: string[] = [];
	let match;
	while ((match = pattern.exec(expr)) !== null) {
		if (!refs.includes(match[1])) {
			refs.push(match[1]);
		}
	}
	return refs;
}

/**
 * Helper to check expressions in validation
 */
function checkExpr(
	expr: string | number,
	definedParams: Set<string>,
	createdObjects: Set<string>,
	undefinedRefs: string[]
): void {
	if (typeof expr !== 'string') return;
	const refs = extractParameterRefs(expr);
	for (const ref of refs) {
		if (!definedParams.has(ref) && !createdObjects.has(ref)) {
			if (!undefinedRefs.includes(ref)) {
				undefinedRefs.push(ref);
			}
		}
	}
}

/**
 * Helper to check target references
 */
function checkTargetRef(
	ref: TargetRef,
	definedParams: Set<string>,
	createdObjects: Set<string>,
	undefinedRefs: string[]
): void {
	if (Array.isArray(ref)) {
		checkExpr(ref[0], definedParams, createdObjects, undefinedRefs);
		checkExpr(ref[1], definedParams, createdObjects, undefinedRefs);
	}
	// String refs are object IDs, validated separately
}

/**
 * Validate that all parameter references in a script are defined
 *
 * @param script - The construction script to validate
 * @returns Array of undefined parameter names (empty if all valid)
 */
export function validateParameterReferences(script: ConstructionScriptInput): string[] {
	const definedParams = new Set(Object.keys(script.parameters ?? {}));
	const createdObjects = new Set<string>();
	const undefinedRefs: string[] = [];

	for (const step of script.steps) {
		// Track created objects
		if (isPointStep(step)) {
			createdObjects.add(step.point);
			checkExpr(step.at[0], definedParams, createdObjects, undefinedRefs);
			checkExpr(step.at[1], definedParams, createdObjects, undefinedRefs);
		} else if (isLineStep(step)) {
			createdObjects.add(step.line);
			checkTargetRef(step.to, definedParams, createdObjects, undefinedRefs);
		} else if (isArcStep(step)) {
			createdObjects.add(step.arc);
			checkExpr(step.sweep, definedParams, createdObjects, undefinedRefs);
		} else if (isCircleStep(step)) {
			createdObjects.add(step.circle);
			checkTargetRef(step.center, definedParams, createdObjects, undefinedRefs);
			if (step.radius !== undefined) {
				checkExpr(step.radius, definedParams, createdObjects, undefinedRefs);
			}
		} else if (isTextStep(step)) {
			createdObjects.add(step.text);
			checkExpr(step.at[0], definedParams, createdObjects, undefinedRefs);
			checkExpr(step.at[1], definedParams, createdObjects, undefinedRefs);
		} else if (isMarkStep(step)) {
			createdObjects.add(step.mark);
			checkExpr(step.at[0], definedParams, createdObjects, undefinedRefs);
			checkExpr(step.at[1], definedParams, createdObjects, undefinedRefs);
			checkExpr(step.angle, definedParams, createdObjects, undefinedRefs);
		} else if (isMoveStep(step)) {
			checkTargetRef(step.to, definedParams, createdObjects, undefinedRefs);
		} else if (isRotateStep(step)) {
			if (step.to !== undefined) {
				checkExpr(step.to, definedParams, createdObjects, undefinedRefs);
			}
		} else if (isSpreadStep(step)) {
			if (step.radius !== undefined) {
				checkExpr(step.radius, definedParams, createdObjects, undefinedRefs);
			}
		} else if (isParallelStep(step)) {
			// Recursively check parallel steps (simplified - doesn't track object creation order)
			for (const parallelStep of step.parallel) {
				if (isPointStep(parallelStep)) {
					createdObjects.add(parallelStep.point);
				} else if (isLineStep(parallelStep)) {
					createdObjects.add(parallelStep.line);
				} else if (isArcStep(parallelStep)) {
					createdObjects.add(parallelStep.arc);
				} else if (isCircleStep(parallelStep)) {
					createdObjects.add(parallelStep.circle);
				} else if (isTextStep(parallelStep)) {
					createdObjects.add(parallelStep.text);
				} else if (isMarkStep(parallelStep)) {
					createdObjects.add(parallelStep.mark);
				}
			}
		}
	}

	return undefinedRefs;
}
