/**
 * Construction Types - Type definitions for geometric construction animations
 *
 * This module defines the core types for representing geometric construction
 * scripts in the InstrumenPoche-style format. Uses discriminated unions for
 * type-safe handling of different object, action, and step types.
 *
 * @module constructions/types
 */

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
// Parameter Definitions
// =============================================================================

/**
 * Base interface for all parameter definitions
 */
interface ParameterDefBase {
	/** Display label for the parameter (French) */
	readonly label: string;
}

/**
 * Numeric parameter with min/max constraints and optional step
 */
export interface NumberParameterDef extends ParameterDefBase {
	readonly type: 'number';
	/** Default value */
	readonly default: number;
	/** Minimum allowed value */
	readonly min: number;
	/** Maximum allowed value */
	readonly max: number;
	/** Step increment for slider (default: 1) */
	readonly step?: number;
}

/**
 * Boolean toggle parameter
 */
export interface BooleanParameterDef extends ParameterDefBase {
	readonly type: 'boolean';
	/** Default value */
	readonly default: boolean;
}

/**
 * Color picker parameter
 */
export interface ColorParameterDef extends ParameterDefBase {
	readonly type: 'color';
	/** Default color (CSS color string) */
	readonly default: string;
}

/**
 * Union type for all parameter definitions (discriminated by 'type')
 */
export type ParameterDef = NumberParameterDef | BooleanParameterDef | ColorParameterDef;

/**
 * Map of parameter names to their definitions
 */
export interface ParameterDefMap {
	readonly [name: string]: ParameterDef;
}

// =============================================================================
// Style Types
// =============================================================================

/**
 * Line style for segments and shapes
 */
export type LineStyle = 'solid' | 'dashed' | 'dotted';

/**
 * Point style (visual representation)
 */
export type PointStyle = 'dot' | 'cross' | 'circle' | 'none';

/**
 * Common style properties shared across objects
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
// Object Definitions
// =============================================================================

/**
 * Base interface for all geometric objects
 */
interface ObjectDefBase {
	/** Unique identifier for this object */
	readonly id: string;
	/** Whether the object is initially visible */
	readonly visible?: boolean;
	/** Style properties */
	readonly style?: StyleProps;
	/** Initial draw progress (0-1). Defaults to 1 (fully drawn). Set to 0 for animated drawing. */
	readonly drawProgress?: number;
}

/**
 * Point object definition
 */
export interface PointDef extends ObjectDefBase {
	readonly kind: 'point';
	/** X coordinate (expression) */
	readonly x: Expr;
	/** Y coordinate (expression) */
	readonly y: Expr;
	/** Visual style of the point */
	readonly pointStyle?: PointStyle;
	/** Radius of the point marker in pixels */
	readonly radius?: number;
	/** Optional label displayed near the point */
	readonly label?: string;
}

/**
 * Segment object definition (line between two points)
 */
export interface SegmentDef extends ObjectDefBase {
	readonly kind: 'segment';
	/** Start point ID or inline coordinates */
	readonly from: string | { x: Expr; y: Expr };
	/** End point ID or inline coordinates */
	readonly to: string | { x: Expr; y: Expr };
}

/**
 * Line object definition (infinite line through two points)
 */
export interface LineDef extends ObjectDefBase {
	readonly kind: 'line';
	/** First point ID or inline coordinates */
	readonly through1: string | { x: Expr; y: Expr };
	/** Second point ID or inline coordinates */
	readonly through2: string | { x: Expr; y: Expr };
}

/**
 * Ray object definition (half-line from point through another)
 */
export interface RayDef extends ObjectDefBase {
	readonly kind: 'ray';
	/** Origin point ID or inline coordinates */
	readonly from: string | { x: Expr; y: Expr };
	/** Direction point ID or inline coordinates */
	readonly through: string | { x: Expr; y: Expr };
}

/**
 * Circle object definition
 */
export interface CircleDef extends ObjectDefBase {
	readonly kind: 'circle';
	/** Center point ID or inline coordinates */
	readonly center: string | { x: Expr; y: Expr };
	/** Radius (expression) */
	readonly radius: Expr;
	/** Whether to fill the circle */
	readonly filled?: boolean;
	/** Fill color (if different from stroke) */
	readonly fillColor?: string;
}

/**
 * Arc object definition (portion of a circle)
 */
export interface ArcDef extends ObjectDefBase {
	readonly kind: 'arc';
	/** Center point ID or inline coordinates */
	readonly center: string | { x: Expr; y: Expr };
	/** Radius (expression) */
	readonly radius: Expr;
	/** Start angle in degrees */
	readonly startAngle: Expr;
	/** End angle in degrees */
	readonly endAngle: Expr;
}

/**
 * Polygon object definition
 */
export interface PolygonDef extends ObjectDefBase {
	readonly kind: 'polygon';
	/** Ordered list of vertex point IDs or inline coordinates */
	readonly vertices: readonly (string | { x: Expr; y: Expr })[];
	/** Whether to fill the polygon */
	readonly filled?: boolean;
	/** Fill color (if different from stroke) */
	readonly fillColor?: string;
}

/**
 * Text object definition
 */
export interface TextDef extends ObjectDefBase {
	readonly kind: 'text';
	/** Text content (supports basic math notation) */
	readonly content: string;
	/** Position X coordinate */
	readonly x: Expr;
	/** Position Y coordinate */
	readonly y: Expr;
	/** Font size in pixels */
	readonly fontSize?: number;
	/** Text anchor: start, middle, end */
	readonly anchor?: 'start' | 'middle' | 'end';
	/** Vertical alignment: top, middle, bottom */
	readonly baseline?: 'top' | 'middle' | 'bottom';
}

/**
 * Angle mark object definition (arc showing an angle)
 */
export interface AngleMarkDef extends ObjectDefBase {
	readonly kind: 'angleMark';
	/** First ray point (angle measured from this direction) */
	readonly point1: string | { x: Expr; y: Expr };
	/** Vertex of the angle */
	readonly vertex: string | { x: Expr; y: Expr };
	/** Second ray point (angle measured to this direction) */
	readonly point2: string | { x: Expr; y: Expr };
	/** Radius of the angle arc in pixels */
	readonly radius?: number;
	/** Whether to show right angle marker (square) */
	readonly rightAngle?: boolean;
}

/**
 * Union type for all object definitions (discriminated by 'kind')
 */
export type ObjectDef =
	| PointDef
	| SegmentDef
	| LineDef
	| RayDef
	| CircleDef
	| ArcDef
	| PolygonDef
	| TextDef
	| AngleMarkDef;

/**
 * Type guard for PointDef
 */
export function isPointDef(obj: ObjectDef): obj is PointDef {
	return obj.kind === 'point';
}

/**
 * Type guard for SegmentDef
 */
export function isSegmentDef(obj: ObjectDef): obj is SegmentDef {
	return obj.kind === 'segment';
}

/**
 * Type guard for CircleDef
 */
export function isCircleDef(obj: ObjectDef): obj is CircleDef {
	return obj.kind === 'circle';
}

/**
 * Type guard for TextDef
 */
export function isTextDef(obj: ObjectDef): obj is TextDef {
	return obj.kind === 'text';
}

// =============================================================================
// Instrument Definitions
// =============================================================================

/**
 * Types of instruments available in the construction
 */
export type InstrumentType =
	| 'ruler'
	| 'compass'
	| 'compassRaised'
	| 'protractor'
	| 'setSquare'
	| 'pencil';

/**
 * Instrument state in the construction
 */
export interface InstrumentState {
	/** Type of instrument */
	readonly type: InstrumentType;
	/** Whether the instrument is currently visible */
	readonly visible: boolean;
	/** Position X coordinate */
	readonly x: Expr;
	/** Position Y coordinate */
	readonly y: Expr;
	/** Rotation angle in degrees */
	readonly rotation?: Expr;
	/** Scale factor (for zoom) */
	readonly scale?: number;
}

// =============================================================================
// Action Definitions
// =============================================================================

/**
 * Base interface for all actions
 */
interface ActionDefBase {
	/** Duration of the action in milliseconds */
	readonly duration?: number;
	/** Easing function name */
	readonly easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

/**
 * Show an object or instrument
 */
export interface ShowActionDef extends ActionDefBase {
	readonly kind: 'show';
	/** Target object ID or instrument type */
	readonly target: string | InstrumentType;
}

/**
 * Hide an object or instrument
 */
export interface HideActionDef extends ActionDefBase {
	readonly kind: 'hide';
	/** Target object ID or instrument type */
	readonly target: string | InstrumentType;
}

/**
 * Translate (move) an object or instrument
 */
export interface TranslateActionDef extends ActionDefBase {
	readonly kind: 'translate';
	/** Target object ID or instrument type */
	readonly target: string | InstrumentType;
	/** Delta X (relative movement) */
	readonly dx: Expr;
	/** Delta Y (relative movement) */
	readonly dy: Expr;
}

/**
 * Move an object or instrument to absolute position
 */
export interface MoveToActionDef extends ActionDefBase {
	readonly kind: 'moveTo';
	/** Target object ID or instrument type */
	readonly target: string | InstrumentType;
	/** Destination X coordinate */
	readonly x: Expr;
	/** Destination Y coordinate */
	readonly y: Expr;
}

/**
 * Rotate an object or instrument
 */
export interface RotateActionDef extends ActionDefBase {
	readonly kind: 'rotate';
	/** Target object ID or instrument type */
	readonly target: string | InstrumentType;
	/** Rotation angle in degrees (positive = counterclockwise) */
	readonly angle: Expr;
	/** Center of rotation (defaults to object center) */
	readonly center?: string | { x: Expr; y: Expr };
}

/**
 * Scale an object
 */
export interface ScaleActionDef extends ActionDefBase {
	readonly kind: 'scale';
	/** Target object ID */
	readonly target: string;
	/** Scale factor */
	readonly factor: Expr;
	/** Center of scaling (defaults to object center) */
	readonly center?: string | { x: Expr; y: Expr };
}

/**
 * Change the style of an object
 */
export interface StyleActionDef extends ActionDefBase {
	readonly kind: 'style';
	/** Target object ID */
	readonly target: string;
	/** New style properties to apply */
	readonly style: Partial<StyleProps>;
}

/**
 * Draw a segment progressively (pencil animation)
 */
export interface DrawActionDef extends ActionDefBase {
	readonly kind: 'draw';
	/** Target segment ID */
	readonly target: string;
	/** Draw from start (0) to end (1), or reverse */
	readonly direction?: 'forward' | 'reverse';
}

/**
 * Draw a circle progressively (compass animation)
 */
export interface DrawCircleActionDef extends ActionDefBase {
	readonly kind: 'drawCircle';
	/** Target circle ID */
	readonly target: string;
	/** Start angle in degrees */
	readonly startAngle?: Expr;
	/** End angle in degrees (default: startAngle + 360) */
	readonly endAngle?: Expr;
}

/**
 * Set the opening of the compass
 */
export interface SetCompassActionDef extends ActionDefBase {
	readonly kind: 'setCompass';
	/** Radius to set */
	readonly radius: Expr;
}

/**
 * Measure a distance with the ruler
 */
export interface MeasureActionDef extends ActionDefBase {
	readonly kind: 'measure';
	/** First point ID or coordinates */
	readonly from: string | { x: Expr; y: Expr };
	/** Second point ID or coordinates */
	readonly to: string | { x: Expr; y: Expr };
}

/** Point reference - either an ID string or inline coordinates */
export type PointRef = string | { readonly x: number; readonly y: number };

/**
 * Draw a line with the pencil, optionally creating a segment
 */
export interface DrawLineActionDef extends ActionDefBase {
	readonly kind: 'drawLine';
	/** Starting point - ID or inline coordinates */
	readonly from: PointRef;
	/** Ending point - ID or inline coordinates */
	readonly to: PointRef;
	/** Optional: create a segment object during drawing */
	readonly createObject?: {
		readonly id: string;
		readonly style?: StyleProps;
	};
}

/**
 * Draw an arc with the compass, optionally creating an arc object
 */
export interface DrawArcActionDef extends ActionDefBase {
	readonly kind: 'drawArc';
	/** Center point - ID or inline coordinates */
	readonly center: PointRef;
	/** Radius of the arc */
	readonly radius: Expr;
	/** Start angle in degrees */
	readonly startAngle: Expr;
	/** End angle in degrees */
	readonly endAngle: Expr;
	/** Optional: create an arc object during drawing */
	readonly createObject?: {
		readonly id: string;
		readonly style?: StyleProps;
	};
}

/**
 * Union type for all action definitions (discriminated by 'kind')
 */
export type ActionDef =
	| ShowActionDef
	| HideActionDef
	| TranslateActionDef
	| MoveToActionDef
	| RotateActionDef
	| ScaleActionDef
	| StyleActionDef
	| DrawActionDef
	| DrawCircleActionDef
	| SetCompassActionDef
	| MeasureActionDef
	| DrawLineActionDef
	| DrawArcActionDef;

/**
 * Type guard for TranslateActionDef
 */
export function isTranslateAction(action: ActionDef): action is TranslateActionDef {
	return action.kind === 'translate';
}

/**
 * Type guard for ShowActionDef
 */
export function isShowAction(action: ActionDef): action is ShowActionDef {
	return action.kind === 'show';
}

/**
 * Type guard for HideActionDef
 */
export function isHideAction(action: ActionDef): action is HideActionDef {
	return action.kind === 'hide';
}

// =============================================================================
// Step Definitions
// =============================================================================

/**
 * Create a new geometric object
 */
export interface CreateStep {
	readonly type: 'create';
	/** The object to create */
	readonly object: ObjectDef;
}

/**
 * Execute an action on an existing object
 */
export interface ActionStep {
	readonly type: 'action';
	/** The action to execute */
	readonly action: ActionDef;
}

/**
 * Pause the animation
 */
export interface PauseStep {
	readonly type: 'pause';
	/** Duration of the pause in milliseconds */
	readonly duration: number;
}

/**
 * Execute multiple actions simultaneously
 */
export interface ParallelStep {
	readonly type: 'parallel';
	/** Actions to execute in parallel */
	readonly actions: readonly ActionDef[];
}

/**
 * Comment step (no visual effect, for documentation)
 */
export interface CommentStep {
	readonly type: 'comment';
	/** Comment text (not displayed) */
	readonly text: string;
}

/**
 * Union type for all step definitions (discriminated by 'type')
 */
export type Step = CreateStep | ActionStep | PauseStep | ParallelStep | CommentStep;

/**
 * Type guard for CreateStep
 */
export function isCreateStep(step: Step): step is CreateStep {
	return step.type === 'create';
}

/**
 * Type guard for ActionStep
 */
export function isActionStep(step: Step): step is ActionStep {
	return step.type === 'action';
}

/**
 * Type guard for PauseStep
 */
export function isPauseStep(step: Step): step is PauseStep {
	return step.type === 'pause';
}

// =============================================================================
// Canvas Configuration
// =============================================================================

/**
 * Canvas dimensions and coordinate system
 */
export interface CanvasConfig {
	/** Width in pixels */
	readonly width: number;
	/** Height in pixels */
	readonly height: number;
	/** Background color (CSS color string) */
	readonly backgroundColor?: string;
	/** Whether to show a grid */
	readonly showGrid?: boolean;
	/** Grid spacing in pixels */
	readonly gridSpacing?: number;
	/** Grid color */
	readonly gridColor?: string;
}

// =============================================================================
// Construction Script
// =============================================================================

/**
 * Complete construction script structure
 *
 * This is the top-level type representing a full geometric construction
 * animation. It contains:
 * - Version for format compatibility
 * - Adjustable parameters
 * - Canvas configuration
 * - Steps to execute
 *
 * @example
 * ```json
 * {
 *   "version": 1,
 *   "title": "Construction d'un triangle equilateral",
 *   "parameters": {
 *     "sideLength": { "type": "number", "default": 200, "min": 50, "max": 400 }
 *   },
 *   "canvas": { "width": 800, "height": 600 },
 *   "steps": [
 *     { "type": "create", "object": { "kind": "point", "id": "A", "x": 100, "y": 450 } },
 *     { "type": "pause", "duration": 500 }
 *   ]
 * }
 * ```
 */
export interface ConstructionScript {
	/** Format version (for migration support) */
	readonly version: number;
	/** Title of the construction (French) */
	readonly title?: string;
	/** Description of the construction (French) */
	readonly description?: string;
	/** Adjustable parameters */
	readonly parameters?: ParameterDefMap;
	/** Canvas configuration */
	readonly canvas: CanvasConfig;
	/** Steps to execute in order */
	readonly steps: readonly Step[];
}

// =============================================================================
// Runtime Types
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
 * Runtime state of a geometric object
 */
export interface ObjectState {
	/** The original definition */
	readonly def: ObjectDef;
	/** Current visibility */
	visible: boolean;
	/** Current position (for points) */
	position?: Position;
	/** Current style overrides */
	style?: StyleProps;
	/** Animation progress (0-1) for drawing animations */
	drawProgress?: number;
}

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
 */
export interface ConstructionState {
	/** Current step index */
	currentStep: number;
	/** Whether animation is playing */
	isPlaying: boolean;
	/** Current parameter values */
	parameters: ParameterValues;
	/** State of all objects by ID */
	objects: Map<string, ObjectState>;
	/** State of instruments */
	instruments: Map<InstrumentType, InstrumentRuntimeState>;
	/** Time elapsed in current animation (ms) */
	elapsedTime: number;
}
