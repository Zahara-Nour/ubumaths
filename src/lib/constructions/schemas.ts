/**
 * Construction Schemas - Zod validation schemas for construction scripts
 *
 * This module provides comprehensive Zod schemas for validating construction
 * script JSON data. All schemas include sensible bounds and descriptive
 * error messages in English (for developer debugging).
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

/** Maximum number of vertices in a polygon */
const MAX_POLYGON_VERTICES = 100;

/** Maximum number of parameters */
const MAX_PARAMETERS = 50;

/** Maximum string length for labels and content */
const MAX_STRING_LENGTH = 500;

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
 * Common style properties
 */
export const stylePropsSchema = z.object({
	color: colorSchema.optional(),
	lineWidth: z.number().min(0.1, 'Line width too small').max(20, 'Line width too large').optional(),
	lineStyle: lineStyleSchema.optional(),
	opacity: z
		.number()
		.min(0, 'Opacity must be at least 0')
		.max(1, 'Opacity must be at most 1')
		.optional()
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
	.record(parameterNameSchema, parameterDefSchema)
	.refine((data) => Object.keys(data).length <= MAX_PARAMETERS, {
		message: `Too many parameters (max ${MAX_PARAMETERS})`
	});

// =============================================================================
// Inline Coordinates Schema
// =============================================================================

/**
 * Inline coordinates object
 */
export const inlineCoordsSchema = z.object({
	x: coordExprSchema,
	y: coordExprSchema
});

/**
 * Point reference: either object ID or inline coordinates
 */
export const pointRefSchema = z.union([objectIdSchema, inlineCoordsSchema]);

// =============================================================================
// Object Definition Schemas
// =============================================================================

/**
 * Base object properties
 */
const objectDefBaseSchema = z.object({
	id: objectIdSchema,
	visible: z.boolean().optional(),
	style: stylePropsSchema.optional()
});

/**
 * Point object definition
 */
export const pointDefSchema = objectDefBaseSchema.extend({
	kind: z.literal('point'),
	x: coordExprSchema,
	y: coordExprSchema,
	pointStyle: pointStyleSchema.optional(),
	radius: z.number().min(1).max(50).optional(),
	label: z.string().max(20).optional()
});

/**
 * Segment object definition
 */
export const segmentDefSchema = objectDefBaseSchema.extend({
	kind: z.literal('segment'),
	from: pointRefSchema,
	to: pointRefSchema,
	arrowHead: z.enum(['start', 'end', 'both']).optional()
});

/**
 * Line object definition
 */
export const lineDefSchema = objectDefBaseSchema.extend({
	kind: z.literal('line'),
	through1: pointRefSchema,
	through2: pointRefSchema
});

/**
 * Ray object definition
 */
export const rayDefSchema = objectDefBaseSchema.extend({
	kind: z.literal('ray'),
	from: pointRefSchema,
	through: pointRefSchema
});

/**
 * Circle object definition
 */
export const circleDefSchema = objectDefBaseSchema.extend({
	kind: z.literal('circle'),
	center: pointRefSchema,
	radius: exprSchema,
	filled: z.boolean().optional(),
	fillColor: colorSchema.optional()
});

/**
 * Arc object definition
 */
export const arcDefSchema = objectDefBaseSchema.extend({
	kind: z.literal('arc'),
	center: pointRefSchema,
	radius: exprSchema,
	startAngle: exprSchema,
	endAngle: exprSchema
});

/**
 * Polygon object definition
 */
export const polygonDefSchema = objectDefBaseSchema.extend({
	kind: z.literal('polygon'),
	vertices: z
		.array(pointRefSchema)
		.min(3, 'Polygon must have at least 3 vertices')
		.max(MAX_POLYGON_VERTICES, `Too many vertices (max ${MAX_POLYGON_VERTICES})`),
	filled: z.boolean().optional(),
	fillColor: colorSchema.optional()
});

/**
 * Text object definition
 */
export const textDefSchema = objectDefBaseSchema.extend({
	kind: z.literal('text'),
	content: z.string().min(1).max(MAX_STRING_LENGTH),
	x: coordExprSchema,
	y: coordExprSchema,
	fontSize: z.number().min(6).max(100).optional(),
	anchor: z.enum(['start', 'middle', 'end']).optional(),
	baseline: z.enum(['top', 'middle', 'bottom']).optional()
});

/**
 * Angle mark object definition
 */
export const angleMarkDefSchema = objectDefBaseSchema.extend({
	kind: z.literal('angleMark'),
	point1: pointRefSchema,
	vertex: pointRefSchema,
	point2: pointRefSchema,
	radius: z.number().min(5).max(100).optional(),
	rightAngle: z.boolean().optional()
});

/**
 * Union of all object definitions
 */
export const objectDefSchema = z.discriminatedUnion('kind', [
	pointDefSchema,
	segmentDefSchema,
	lineDefSchema,
	rayDefSchema,
	circleDefSchema,
	arcDefSchema,
	polygonDefSchema,
	textDefSchema,
	angleMarkDefSchema
]);

// =============================================================================
// Instrument Schemas
// =============================================================================

/**
 * Instrument type enum
 */
export const instrumentTypeSchema = z.enum(['ruler', 'compass', 'protractor', 'setSquare']);

/**
 * Action target: object ID or instrument type
 */
export const actionTargetSchema = z.union([objectIdSchema, instrumentTypeSchema]);

// =============================================================================
// Action Definition Schemas
// =============================================================================

/**
 * Base action properties
 */
const actionDefBaseSchema = z.object({
	duration: durationSchema.optional(),
	easing: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut']).optional()
});

/**
 * Show action
 */
export const showActionDefSchema = actionDefBaseSchema.extend({
	kind: z.literal('show'),
	target: actionTargetSchema
});

/**
 * Hide action
 */
export const hideActionDefSchema = actionDefBaseSchema.extend({
	kind: z.literal('hide'),
	target: actionTargetSchema
});

/**
 * Translate action
 */
export const translateActionDefSchema = actionDefBaseSchema.extend({
	kind: z.literal('translate'),
	target: actionTargetSchema,
	dx: exprSchema,
	dy: exprSchema
});

/**
 * Move to action
 */
export const moveToActionDefSchema = actionDefBaseSchema.extend({
	kind: z.literal('moveTo'),
	target: actionTargetSchema,
	x: coordExprSchema,
	y: coordExprSchema
});

/**
 * Rotate action
 */
export const rotateActionDefSchema = actionDefBaseSchema.extend({
	kind: z.literal('rotate'),
	target: actionTargetSchema,
	angle: exprSchema,
	center: pointRefSchema.optional()
});

/**
 * Scale action
 */
export const scaleActionDefSchema = actionDefBaseSchema.extend({
	kind: z.literal('scale'),
	target: objectIdSchema,
	factor: exprSchema,
	center: pointRefSchema.optional()
});

/**
 * Style action
 */
export const styleActionDefSchema = actionDefBaseSchema.extend({
	kind: z.literal('style'),
	target: objectIdSchema,
	style: stylePropsSchema.partial()
});

/**
 * Draw action (progressive segment drawing)
 */
export const drawActionDefSchema = actionDefBaseSchema.extend({
	kind: z.literal('draw'),
	target: objectIdSchema,
	direction: z.enum(['forward', 'reverse']).optional()
});

/**
 * Draw circle action (compass animation)
 */
export const drawCircleActionDefSchema = actionDefBaseSchema.extend({
	kind: z.literal('drawCircle'),
	target: objectIdSchema,
	startAngle: exprSchema.optional(),
	endAngle: exprSchema.optional()
});

/**
 * Set compass action
 */
export const setCompassActionDefSchema = actionDefBaseSchema.extend({
	kind: z.literal('setCompass'),
	radius: exprSchema
});

/**
 * Measure action
 */
export const measureActionDefSchema = actionDefBaseSchema.extend({
	kind: z.literal('measure'),
	from: pointRefSchema,
	to: pointRefSchema
});

/**
 * Draw line action (pencil animation with synchronized segment creation)
 */
export const drawLineActionDefSchema = actionDefBaseSchema.extend({
	kind: z.literal('drawLine'),
	from: pointRefSchema,
	to: pointRefSchema,
	createObject: z
		.object({
			id: objectIdSchema,
			style: stylePropsSchema.optional(),
			arrowHead: z.enum(['start', 'end', 'both']).optional()
		})
		.optional()
});

/**
 * Draw arc action (compass animation with synchronized arc creation)
 */
export const drawArcActionDefSchema = actionDefBaseSchema.extend({
	kind: z.literal('drawArc'),
	center: pointRefSchema,
	radius: exprSchema,
	startAngle: exprSchema,
	endAngle: exprSchema,
	createObject: z
		.object({
			id: objectIdSchema,
			style: stylePropsSchema.optional()
		})
		.optional()
});

/**
 * Union of all action definitions
 */
export const actionDefSchema = z.discriminatedUnion('kind', [
	showActionDefSchema,
	hideActionDefSchema,
	translateActionDefSchema,
	moveToActionDefSchema,
	rotateActionDefSchema,
	scaleActionDefSchema,
	styleActionDefSchema,
	drawActionDefSchema,
	drawCircleActionDefSchema,
	setCompassActionDefSchema,
	measureActionDefSchema,
	drawLineActionDefSchema,
	drawArcActionDefSchema
]);

// =============================================================================
// Step Schemas
// =============================================================================

/**
 * Create step
 */
export const createStepSchema = z.object({
	type: z.literal('create'),
	object: objectDefSchema
});

/**
 * Action step
 */
export const actionStepSchema = z.object({
	type: z.literal('action'),
	action: actionDefSchema
});

/**
 * Pause step
 */
export const pauseStepSchema = z.object({
	type: z.literal('pause'),
	duration: durationSchema
});

/**
 * Parallel step (multiple simultaneous actions)
 */
export const parallelStepSchema = z.object({
	type: z.literal('parallel'),
	actions: z
		.array(actionDefSchema)
		.min(1, 'Parallel step must have at least one action')
		.max(50, 'Too many parallel actions')
});

/**
 * Comment step
 */
export const commentStepSchema = z.object({
	type: z.literal('comment'),
	text: z.string().max(1000)
});

/**
 * Union of all step types
 */
export const stepSchema = z.discriminatedUnion('type', [
	createStepSchema,
	actionStepSchema,
	pauseStepSchema,
	parallelStepSchema,
	commentStepSchema
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

/** Inferred type from objectDefSchema */
export type ObjectDefInput = z.infer<typeof objectDefSchema>;

/** Inferred type from actionDefSchema */
export type ActionDefInput = z.infer<typeof actionDefSchema>;

/** Inferred type from stepSchema */
export type StepInput = z.infer<typeof stepSchema>;

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
 * Validate that all parameter references in a script are defined
 *
 * @param script - The construction script to validate
 * @returns Array of undefined parameter names (empty if all valid)
 */
export function validateParameterReferences(script: ConstructionScriptInput): string[] {
	const definedParams = new Set(Object.keys(script.parameters ?? {}));
	const createdObjects = new Set<string>();
	const undefinedRefs: string[] = [];

	function checkExpr(expr: string | number) {
		if (typeof expr !== 'string') return;
		const refs = extractParameterRefs(expr);
		for (const ref of refs) {
			// Check if it's a parameter or an object reference (e.g., $A.x)
			if (!definedParams.has(ref) && !createdObjects.has(ref)) {
				if (!undefinedRefs.includes(ref)) {
					undefinedRefs.push(ref);
				}
			}
		}
	}

	function checkPointRef(ref: string | { x: string | number; y: string | number }) {
		if (typeof ref === 'string') {
			// Object reference - will be validated separately
		} else {
			checkExpr(ref.x);
			checkExpr(ref.y);
		}
	}

	for (const step of script.steps) {
		if (step.type === 'create') {
			const obj = step.object;
			createdObjects.add(obj.id);

			switch (obj.kind) {
				case 'point':
					checkExpr(obj.x);
					checkExpr(obj.y);
					break;
				case 'segment':
					checkPointRef(obj.from);
					checkPointRef(obj.to);
					break;
				case 'circle':
					checkPointRef(obj.center);
					checkExpr(obj.radius);
					break;
				case 'arc':
					checkPointRef(obj.center);
					checkExpr(obj.radius);
					checkExpr(obj.startAngle);
					checkExpr(obj.endAngle);
					break;
				case 'text':
					checkExpr(obj.x);
					checkExpr(obj.y);
					break;
				case 'polygon':
					for (const vertex of obj.vertices) {
						checkPointRef(vertex);
					}
					break;
				case 'line':
					checkPointRef(obj.through1);
					checkPointRef(obj.through2);
					break;
				case 'ray':
					checkPointRef(obj.from);
					checkPointRef(obj.through);
					break;
				case 'angleMark':
					checkPointRef(obj.point1);
					checkPointRef(obj.vertex);
					checkPointRef(obj.point2);
					break;
			}
		} else if (step.type === 'action') {
			const action = step.action;
			switch (action.kind) {
				case 'translate':
					checkExpr(action.dx);
					checkExpr(action.dy);
					break;
				case 'moveTo':
					checkExpr(action.x);
					checkExpr(action.y);
					break;
				case 'rotate':
					checkExpr(action.angle);
					if (action.center && typeof action.center !== 'string') {
						checkExpr(action.center.x);
						checkExpr(action.center.y);
					}
					break;
				case 'scale':
					checkExpr(action.factor);
					break;
				case 'setCompass':
					checkExpr(action.radius);
					break;
				case 'drawCircle':
					if (action.startAngle !== undefined) checkExpr(action.startAngle);
					if (action.endAngle !== undefined) checkExpr(action.endAngle);
					break;
				case 'measure':
					checkPointRef(action.from);
					checkPointRef(action.to);
					break;
			}
		}
	}

	return undefinedRefs;
}
