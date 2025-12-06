/**
 * Constructions Module - Geometric construction animation system
 *
 * This module provides a complete system for defining, validating, and
 * rendering geometric construction animations in the style of InstrumenPoche.
 *
 * Features:
 * - Type-safe construction script definitions
 * - Zod validation for JSON scripts
 * - Mathematical expression evaluation with parameter support
 * - Runtime state management for animations
 *
 * @module constructions
 *
 * @example
 * ```typescript
 * import {
 *   validateConstructionScript,
 *   evaluateExpr,
 *   createContext,
 *   DEFAULT_CANVAS_CONFIG,
 *   type ConstructionScript
 * } from '$lib/constructions';
 *
 * // Validate a construction script
 * const result = validateConstructionScript(jsonData);
 * if (result.success) {
 *   const script: ConstructionScript = result.data;
 *
 *   // Create evaluation context
 *   const context = createContext(
 *     { sideLength: 200 },
 *     new Map([["A", { x: 100, y: 200 }]])
 *   );
 *
 *   // Evaluate expressions
 *   const x = evaluateExpr("$sideLength * sqrt(3) / 2", context);
 * }
 * ```
 */

// =============================================================================
// Type Exports
// =============================================================================

export type {
	// Expression types
	Expr,

	// Parameter types
	ParameterDef,
	NumberParameterDef,
	BooleanParameterDef,
	ColorParameterDef,
	ParameterDefMap,

	// Style types
	LineStyle,
	PointStyle,
	StyleProps,

	// Object definitions
	ObjectDef,
	PointDef,
	SegmentDef,
	LineDef,
	RayDef,
	CircleDef,
	ArcDef,
	PolygonDef,
	TextDef,
	AngleMarkDef,

	// Action definitions
	ActionDef,
	ShowActionDef,
	HideActionDef,
	TranslateActionDef,
	MoveToActionDef,
	RotateActionDef,
	ScaleActionDef,
	StyleActionDef,
	DrawActionDef,
	DrawCircleActionDef,
	SetCompassActionDef,
	MeasureActionDef,

	// Step definitions
	Step,
	CreateStep,
	ActionStep,
	PauseStep,
	ParallelStep,
	CommentStep,

	// Instrument types
	InstrumentType,
	InstrumentState,

	// Canvas and script
	CanvasConfig,
	ConstructionScript,

	// Runtime types
	ParameterValues,
	Position,
	ObjectState,
	InstrumentRuntimeState,
	ConstructionState
} from './types';

// =============================================================================
// Type Guard Exports
// =============================================================================

export {
	// Object type guards
	isPointDef,
	isSegmentDef,
	isCircleDef,
	isTextDef,

	// Action type guards
	isTranslateAction,
	isShowAction,
	isHideAction,

	// Step type guards
	isCreateStep,
	isActionStep,
	isPauseStep
} from './types';

// =============================================================================
// Schema Exports
// =============================================================================

export {
	// Base schemas
	exprSchema,
	coordSchema,
	coordExprSchema,
	durationSchema,
	colorSchema,
	objectIdSchema,
	parameterNameSchema,

	// Style schemas
	lineStyleSchema,
	pointStyleSchema,
	stylePropsSchema,

	// Parameter schemas
	numberParameterDefSchema,
	booleanParameterDefSchema,
	colorParameterDefSchema,
	parameterDefSchema,
	parameterDefMapSchema,

	// Object schemas
	inlineCoordsSchema,
	pointRefSchema,
	pointDefSchema,
	segmentDefSchema,
	lineDefSchema,
	rayDefSchema,
	circleDefSchema,
	arcDefSchema,
	polygonDefSchema,
	textDefSchema,
	angleMarkDefSchema,
	objectDefSchema,

	// Instrument schemas
	instrumentTypeSchema,
	actionTargetSchema,

	// Action schemas
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
	actionDefSchema,

	// Step schemas
	createStepSchema,
	actionStepSchema,
	pauseStepSchema,
	parallelStepSchema,
	commentStepSchema,
	stepSchema,

	// Canvas and script schemas
	canvasConfigSchema,
	constructionScriptSchema,

	// Schema types
	type ConstructionScriptInput,
	type ObjectDefInput,
	type ActionDefInput,
	type StepInput,

	// Validation helpers
	validateConstructionScript,
	extractParameterRefs,
	validateParameterReferences
} from './schemas';

// =============================================================================
// Constant Exports
// =============================================================================

export {
	// SVG constants
	SVG_NS,
	XLINK_NS,

	// Colors
	DEFAULT_COLORS,
	COLOR_CYCLE,

	// Style defaults
	DEFAULT_LINE_WIDTH,
	DEFAULT_POINT_RADIUS,
	DEFAULT_FONT_SIZE,
	DEFAULT_FONT_FAMILY,
	DEFAULT_OPACITY,
	DASH_PATTERN_DASHED,
	DASH_PATTERN_DOTTED,
	DEFAULT_STYLE,

	// Canvas defaults
	DEFAULT_CANVAS_WIDTH,
	DEFAULT_CANVAS_HEIGHT,
	DEFAULT_GRID_SPACING,
	DEFAULT_CANVAS_CONFIG,

	// Animation defaults
	DEFAULT_ANIMATION_DURATION,
	DEFAULT_PAUSE_DURATION,
	DEFAULT_EASING,
	ANIMATION_FRAME_INTERVAL,
	MIN_ANIMATION_DURATION,
	MAX_ANIMATION_DURATION,

	// Instrument defaults
	DEFAULT_RULER_LENGTH,
	DEFAULT_RULER_WIDTH,
	DEFAULT_PROTRACTOR_RADIUS,
	DEFAULT_COMPASS_RADIUS,
	DEFAULT_SET_SQUARE_SIZE,
	DEFAULT_INSTRUMENT_CONFIG,

	// Geometry constants
	DEG_TO_RAD,
	RAD_TO_DEG,
	EPSILON,
	DEFAULT_ANGLE_MARK_RADIUS,
	RIGHT_ANGLE_SIZE,

	// Z-index layers
	Z_INDEX,

	// Script format
	SCRIPT_VERSION,
	SUPPORTED_VERSIONS,

	// Limits
	MAX_OBJECTS,
	MAX_STEPS,
	MAX_PARAM_VALUE,
	MIN_PARAM_VALUE,
	MAX_COORDINATE,
	MIN_COORDINATE,
	MAX_DURATION_MS,

	// Patterns
	PARAM_REF_PATTERN,
	OBJECT_ID_PATTERN,
	PARAM_NAME_PATTERN
} from './constants';

// =============================================================================
// Evaluator Exports
// =============================================================================

export type { EvaluationContext, ParsedExpression, EvaluationResult } from './core/evaluator';

export {
	// Reference extraction
	extractReferences,
	getAllReferenceNames,

	// Expression preprocessing
	preprocessExpression,

	// Parsing
	parseExpression,

	// Evaluation
	evaluateAST,
	evaluateExpr,
	evaluateExprSafe,
	tryEvaluateExpr,

	// Validation
	validateExprReferences,

	// Context creation
	createEmptyContext,
	createContext
} from './core/evaluator';

// =============================================================================
// Renderer Exports
// =============================================================================

export type { Viewport, CanvasDimensions, CoordinateTransformer, TextStyle } from './core/renderer';

export {
	// SVG element creation
	createSvgElement,
	createGroup,
	createSvgRoot,

	// Coordinate transformation
	createTransformer,
	createIdentityTransformer,

	// Path generation
	pointToSvgCross,
	pointToSvgX,
	segmentToSvgLine,
	circleToSvgPath,
	arcToSvgPath,
	polygonToSvgPath,
	rightAngleMarkerPath,

	// Partial path generation (for animations)
	partialSegmentPath,
	partialArcPath,

	// Style application
	getDashArray,
	applyLineStyle,
	applyFillStyle,
	applyTextStyle,
	createPointMarker,

	// Grid
	generateGridPath,
	createGrid,

	// Visibility and transforms
	setVisibility,
	setOpacity,
	setTranslation,
	setRotation,
	setTransform
} from './core/renderer';

// =============================================================================
// Timeline Exports
// =============================================================================

export type {
	TimelineStatus,
	StepChangeCallback,
	TimeUpdateCallback,
	TimelineOptions
} from './core/timeline.svelte';

export { Timeline, createTimeline, formatTime, formatPlaybackRate } from './core/timeline.svelte';

// =============================================================================
// Engine Exports
// =============================================================================

export type { EngineCallbacks, EngineOptions, EngineSnapshot } from './core/engine.svelte';

export { ConstructionEngine, createEngine, createEngineWithScript } from './core/engine.svelte';

// =============================================================================
// Instrument Exports
// =============================================================================

export type { InstrumentRenderer } from './instruments';

export {
	instrumentRenderers,
	registerInstrumentRenderer,
	getInstrumentRenderer,
	hasInstrumentRenderer,
	getRegisteredInstruments,
	rulerRenderer
} from './instruments';
