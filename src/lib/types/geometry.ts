/**
 * TypeScript types for the Geometry Exercise System using MathGraph32
 * Complete type definitions for exercises, validation, attempts, and MathGraph32 API
 */

// =========================
// ENUMS & CONSTANTS
// =========================

export type ExerciseType = 'view' | 'measure' | 'construct' | 'proof' | 'explore';
export type ValidationMode = 'automatic' | 'step_by_step' | 'teacher_review' | 'self_check';
export type GradeLevel = 'elementary' | 'middle' | 'high' | 'advanced';
export type AttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'abandoned';
export type HintLevel = 'general' | 'specific' | 'step_by_step';
export type TemplateType =
	| 'triangle'
	| 'circle'
	| 'transformation'
	| 'angle'
	| 'polygon'
	| 'custom';

// MathGraph32 tool types
export type MathGraphTool =
	| 'point'
	| 'line'
	| 'segment'
	| 'ray'
	| 'circle'
	| 'arc'
	| 'polygon'
	| 'vector'
	| 'perpendicular'
	| 'parallel'
	| 'bisector'
	| 'midpoint'
	| 'intersection'
	| 'measurement'
	| 'angle'
	| 'transformation'
	| 'text'
	| 'latex';

// Point style options
export type PointStyle =
	| 'square'
	| 'round'
	| 'cross'
	| 'mult'
	| 'littleround'
	| 'diamond'
	| 'pixel'
	| 'biground'
	| 'bigmult'
	| 'o'
	| 'O'
	| 'OO'
	| 'x'
	| 'X'
	| '+'
	| '<>'
	| '[]'
	| '.';

// Line style options
export type LineStyle =
	| 'line'
	| '-'
	| 'dot'
	| '.'
	| 'dashdash'
	| '--'
	| 'dashdotdot'
	| '-..'
	| 'dashdotdotdot'
	| '-...'
	| 'dashdashdash'
	| '---';

// Fill style options
export type FillStyle = 'transp' | 'fill' | 'vert' | 'hor' | '/' | '\\';

// =========================
// GEOMETRY EXERCISE
// =========================

export interface GeometryExercise {
	id: string;

	// Metadata
	title: string;
	description: string | null;
	instructions: string;
	created_by: string;
	created_at: string;
	updated_at: string;

	// Exercise configuration
	exercise_type: ExerciseType;
	difficulty_level: number; // 1-5
	grade_level: GradeLevel;

	// Figure data
	initial_figure: string | null; // Base64 encoded
	template_id: string | null;

	// Randomization
	is_randomized: boolean;
	randomization_params: RandomizationParams | null;

	// Validation
	validation_mode: ValidationMode;
	validation_config: ValidationConfig;

	// Time limits
	time_limit_seconds: number | null;
	suggested_time_seconds: number | null;

	// Scoring
	max_score: number;
	passing_score: number;
	hint_penalty_percent: number;

	// Display settings
	tools_allowed: MathGraphTool[];
	grid_visible: boolean;
	axis_visible: boolean;
	measurements_visible: boolean;

	// Organization
	tags: string[];
	topics: string[];
	learning_objectives: string[] | null;

	// Publishing
	is_published: boolean;
	is_template: boolean;

	// Gamification
	gidouilles_reward: number;
	bonus_multiplier: number;
}

export interface RandomizationParams {
	seed?: number;
	points?: Record<
		string,
		{
			x: string | number; // Can be "random(0, 100)" or fixed number
			y: string | number;
		}
	>;
	angles?: Record<string, string | number>; // e.g., "random(30, 150)"
	lengths?: Record<string, string | number>;
	customParams?: Record<string, unknown>;
}

export interface ValidationConfig {
	// General
	tolerance?: number; // Degrees for angles, pixels for distances
	partialCredit?: boolean;

	// Measurement validation
	expectedAnswer?: number | string;
	answerTolerance?: number;
	unit?: string;

	// Construction validation
	requiredObjects?: string[]; // List of object tags that must be present
	forbiddenObjects?: string[]; // List of object tags that shouldn't be present
	maxObjects?: number;

	// Specific validations
	checkAngle?: boolean;
	expectedAngle?: number;

	checkDistance?: boolean;
	expectedDistance?: number;

	checkParallel?: boolean;
	lineTag1?: string;
	lineTag2?: string;

	checkPerpendicular?: boolean;

	checkCircle?: boolean;
	expectedRadius?: number;
	centerTag?: string;

	// Advanced
	customValidation?: string; // Name of custom validation function
	validationParams?: Record<string, unknown>;
}

// =========================
// EXERCISE STEPS
// =========================

export interface GeometryExerciseStep {
	id: string;
	exercise_id: string;

	// Step metadata
	step_number: number;
	title: string;
	description: string;

	// Validation
	validation_function: string; // e.g., "validatePerpendicularBisector"
	validation_params: Record<string, unknown>;

	// Hints
	hint_general: string | null;
	hint_specific: string | null;
	hint_step_by_step: string | null;

	// Scoring
	points: number;
	is_required: boolean;
	can_skip: boolean;

	// Display
	display_order: number;

	created_at: string;
}

// =========================
// EXERCISE ATTEMPTS
// =========================

export interface GeometryExerciseAttempt {
	id: string;
	exercise_id: string;
	student_id: string;

	// Attempt metadata
	attempt_number: number;
	started_at: string;
	submitted_at: string | null;
	last_saved_at: string;

	// Status
	status: AttemptStatus;

	// Figure state
	current_figure_state: string | null; // Base64 encoded
	figure_history: FigureHistoryEntry[];

	// Progress
	completed_steps: number[];
	current_step: number | null;

	// Validation
	validation_results: ValidationResults;

	// Scoring
	raw_score: number | null;
	hint_penalties: number;
	time_penalties: number;
	final_score: number | null;

	// Hints
	hints_used: HintUsage[];

	// Time
	time_spent_seconds: number;
	active_time_seconds: number;

	// Teacher feedback
	teacher_feedback: string | null;
	graded_by: string | null;
	graded_at: string | null;

	// Metadata
	randomization_seed: number | null;
	exercise_version_snapshot: Partial<GeometryExercise> | null;
}

export interface FigureHistoryEntry {
	timestamp: string;
	figureState: string; // Base64 encoded
	action?: string; // e.g., "point_added", "line_drawn", "auto_save"
}

export interface ValidationResults {
	isValid: boolean;
	score: number;
	maxScore: number;
	errors: ValidationError[];
	warnings: ValidationWarning[];
	feedback: string[];

	// Detailed results
	stepResults?: Record<number, StepValidationResult>;

	// Measurements
	measurements?: Record<string, number>;

	// Object checks
	objectsCreated?: string[];
	objectsMissing?: string[];
	objectsIncorrect?: string[];
}

export interface StepValidationResult {
	stepNumber: number;
	isValid: boolean;
	score: number;
	maxScore: number;
	feedback: string;
	errors: string[];
	warnings: string[];
}

export interface ValidationError {
	code: string;
	message: string;
	objectTag?: string;
	expectedValue?: number | string;
	actualValue?: number | string;
}

export interface ValidationWarning {
	code: string;
	message: string;
	suggestion?: string;
}

export interface HintUsage {
	stepId?: string;
	hintLevel: HintLevel;
	timestamp: string;
	penalty: number;
}

// =========================
// TEMPLATES
// =========================

export interface GeometryTemplate {
	id: string;

	// Metadata
	name: string;
	description: string | null;
	created_by: string;
	created_at: string;
	updated_at: string;

	// Template data
	base_figure: string; // Base64 encoded
	configurable_params: Record<string, ConfigurableParam>;

	// Type
	template_type: TemplateType;

	// Usage
	is_public: boolean;
	usage_count: number;

	// Organization
	tags: string[];
}

export interface ConfigurableParam {
	type: 'number' | 'angle' | 'length' | 'point' | 'boolean';
	label: string;
	default: number | string | boolean;
	min?: number;
	max?: number;
	step?: number;
	unit?: string;
	description?: string;
}

// =========================
// HINTS
// =========================

export interface GeometryHint {
	id: string;
	exercise_id: string | null;
	step_id: string | null;

	// Hint data
	hint_level: HintLevel;
	hint_text: string;
	hint_order: number;

	// Triggering
	trigger_condition: HintTriggerCondition | null;

	// Scoring
	score_penalty: number;

	created_at: string;
}

export interface HintTriggerCondition {
	timeSpent?: number; // Seconds
	attemptsFailed?: number;
	constructionState?: string;
	errorType?: string;
	customCondition?: string;
}

// =========================
// ASSIGNMENTS
// =========================

export interface GeometryAssignment {
	id: string;
	exercise_id: string;

	// Assignment details
	assigned_by: string;
	assigned_to_class: string | null;
	assigned_to_student: string | null;

	// Dates
	assigned_at: string;
	due_date: string | null;
	available_from: string;
	available_until: string | null;

	// Settings
	max_attempts: number | null;
	allow_late_submission: boolean;
	show_correct_answer_after_submission: boolean;

	// Status
	is_active: boolean;
}

// =========================
// MATHGRAPH32 API TYPES
// =========================

/**
 * MathGraph32 API interface
 * Based on the official API from addApi.js
 */
export interface MathGraphApp {
	// Core properties
	listApi: MathGraphObjectList;
	svgApi: SVGElement;
	svg: SVGElement;

	// Figure management
	setFig(options: SetFigOptions): Promise<void>;
	getBase64Code(): string; // OFFICIAL API: Export figure as base64
	getFig?(): Promise<string>; // LEGACY: May not exist, use getBase64Code()
	updateFigDisplay?(): void; // LEGACY: May not exist, use reDisplay()
	reDisplay(): void; // OFFICIAL API: Refresh display
	updateDependantDisplay(obj: MathGraphObject): void;
	recalculate(randomize?: boolean): void;
	deleteAfter(options: { elt: string | MathGraphObject }): void;

	// Point creation
	addPoint(options: AddPointOptions): MathGraphPoint | Promise<void>;
	addPointXY(options: AddPointXYOptions): MathGraphPoint | Promise<void>;
	addLinkedPointCircle(options: AddLinkedPointCircleOptions): MathGraphPoint | Promise<void>;
	addLinkedPointLine(options: AddLinkedPointLineOptions): MathGraphPoint | Promise<void>;
	addMidpoint(options: AddMidpointOptions): MathGraphPoint | Promise<void>;

	// Line creation
	addLineAB(options: AddLineOptions): MathGraphLine | Promise<void>;
	addLineHor(options: AddLineHorOptions): MathGraphLine | Promise<void>;
	addLineVer(options: AddLineVerOptions): MathGraphLine | Promise<void>;
	addLinePar(options: AddLineParOptions): MathGraphLine | Promise<void>;
	addLinePerp(options: AddLinePerpOptions): MathGraphLine | Promise<void>;
	addLineMedAB(options: AddLineMedABOptions): MathGraphLine | Promise<void>; // OFFICIAL: Perpendicular bisector
	addLineBisAOB(options: AddLineBisAOBOptions): MathGraphLine | Promise<void>; // OFFICIAL: Angle bisector
	addBisector?(options: AddBisectorOptions): MathGraphLine | Promise<void>; // LEGACY
	addMediator?(options: AddMediatorOptions): MathGraphLine | Promise<void>; // LEGACY
	addPerpBisector?(options: AddLineMedABOptions): MathGraphLine | Promise<void>; // DOES NOT EXIST

	// Circle creation
	addCircleOA(options: AddCircleOAOptions): MathGraphCircle | Promise<void>;
	addCircleOr(options: AddCircleOrOptions): MathGraphCircle | Promise<void>;

	// Segment/Ray/Vector
	addSegment(options: AddSegmentOptions): MathGraphSegment | Promise<void>;
	addRay(options: AddRayOptions): MathGraphRay | Promise<void>;
	addVector(options: AddVectorOptions): MathGraphVector | Promise<void>;

	// Polygon
	addPolygon(options: AddPolygonOptions): MathGraphPolygon | Promise<void>;
	addBrokenLine(options: AddBrokenLineOptions): MathGraphBrokenLine | Promise<void>;

	// Measurements
	addAngleMeasure(options: AddAngleMeasureOptions): MathGraphMeasure;
	addLengthMeasure(options: AddLengthMeasureOptions): MathGraphMeasure;
	setUnity(options: SetUnityOptions): void;

	// Calculations
	addCalc(options: AddCalcOptions): MathGraphCalculation;
	addVariable(options: AddVariableOptions): MathGraphVariable;
	addFunc(options: AddFuncOptions): MathGraphFunction;

	// Transformations
	addTranslation(options: AddTranslationOptions): MathGraphTransformation;
	addRotation(options: AddRotationOptions): MathGraphTransformation;
	addDilation(options: AddDilationOptions): MathGraphTransformation;
	addSymCent(options: AddSymCentOptions): MathGraphTransformation;
	addSymAx(options: AddSymAxOptions): MathGraphTransformation;
	addSimilitude(options: AddSimilitudeOptions): MathGraphTransformation;

	// Image points
	addImPointTranslation(options: AddImPointTranslationOptions): MathGraphPoint | Promise<void>;
	addImPointRotation(options: AddImPointRotationOptions): MathGraphPoint | Promise<void>;
	addImPointDilation(options: AddImPointDilationOptions): MathGraphPoint | Promise<void>;
	addImPointSymCent(options: AddImPointSymCentOptions): MathGraphPoint | Promise<void>;
	addImPointSymAx(options: AddImPointSymAxOptions): MathGraphPoint | Promise<void>;

	// Intersections
	addIntLineLine(options: AddIntLineLineOptions): MathGraphPoint | Promise<void>;
	addIntLineCircle(options: AddIntLineCircleOptions): MathGraphPoint | Promise<void>;
	addIntCircleCircle(options: AddIntCircleCircleOptions): MathGraphPoint | Promise<void>;

	// Display
	addText(options: AddTextOptions): MathGraphText | Promise<void>;
	addLatex(options: AddLatexOptions): MathGraphText | Promise<void>;
	addLinkedText(options: AddLinkedTextOptions): MathGraphText | Promise<void>;
	addLinkedLatex(options: AddLinkedLatexOptions): MathGraphText | Promise<void>;

	// Surfaces
	addSurface(options: AddSurfaceOptions): MathGraphSurface | Promise<void>;

	// Locus
	addPointLocus(options: AddPointLocusOptions): MathGraphLocus | Promise<void>;
	addObjectLocus(options: AddObjectLocusOptions): MathGraphLocus | Promise<void>;
	addCurve(options: AddCurveOptions): MathGraphLocus | Promise<void>;

	// System of axis
	addSystemOfAxis(options: AddSystemOfAxisOptions): MathGraphFrame | Promise<void>;

	// Utility
	setApiDoc(idDoc?: string): void;
	getElement(tag: string): MathGraphObject | null; // OFFICIAL API: Get object by tag
	getObjectByTag?(tag: string): MathGraphObject | null; // LEGACY: May not exist, use getElement()
	getPointByName?(name: string): MathGraphPoint | null; // LEGACY: May not exist, use getElement()
	sleep(seconds: number): Promise<void>;

	// Event handling
	addEventListener(options: AddEventListenerOptions): void;
	removeEventListener(options: RemoveEventListenerOptions): void;
}

// MathGraph32 object types
export interface MathGraphObject {
	tag?: string;
	name?: string;
	index: number;
	existe: boolean;
	estDeNature(nature: number): boolean;
	estDeNatureCalcul?(nature: number): boolean;
	depDe?(obj: MathGraphObject): boolean;
}

export interface MathGraphPoint extends MathGraphObject {
	x: number;
	y: number;
	nom: string;
	couleur: string;
}

export type MathGraphLine = MathGraphObject;

export interface MathGraphCircle extends MathGraphObject {
	centreX: number;
	centreY: number;
	rayon: number;
}

export type MathGraphSegment = MathGraphObject;

export type MathGraphRay = MathGraphObject;

export type MathGraphVector = MathGraphObject;

export type MathGraphPolygon = MathGraphObject;

export type MathGraphBrokenLine = MathGraphObject;

export interface MathGraphMeasure extends MathGraphObject {
	valeur: number;
}

export interface MathGraphCalculation extends MathGraphObject {
	valeur: number;
}

export interface MathGraphVariable extends MathGraphCalculation {
	min: number;
	max: number;
	step: number;
}

export type MathGraphFunction = MathGraphObject;

export type MathGraphTransformation = MathGraphObject;

export type MathGraphText = MathGraphObject;

export type MathGraphSurface = MathGraphObject;

export type MathGraphLocus = MathGraphObject;

export interface MathGraphFrame extends MathGraphObject {
	getAbsCoord(x: number, y: number): [number, number];
}

export interface MathGraphObjectList {
	col: MathGraphObject[];
	longueur(): number;
	get(index: number): MathGraphObject;
	getElement?(tag: string): MathGraphObject | null; // OFFICIAL API
	getPointByName?(name: string): MathGraphPoint | null; // LEGACY
	getByTag?(tag: string): MathGraphObject | null; // LEGACY
	getDimf(): { width: number; height: number };
	update(svg: SVGElement, backgroundColor: string, b: boolean): void;
}

// =========================
// MATHGRAPH32 API OPTIONS
// =========================

export interface BaseObjectOptions {
	name?: string;
	color?: string;
	opacity?: number;
	hidden?: boolean;
	hiddenName?: boolean;
	tag?: string;
	offsetX?: number;
	offsetY?: number;
	fontSize?: number;
}

export interface SetFigOptions {
	container?: HTMLElement;
	id?: string;
	fig?: string; // Base64 encoded
	width?: number;
	height?: number;
	removeAllDoc?: boolean;
}

export interface AddPointOptions extends BaseObjectOptions {
	x: number;
	y: number;
	pointStyle?: PointStyle;
	rep?: string | MathGraphFrame;
	absCoord?: boolean;
}

export interface AddPointXYOptions extends BaseObjectOptions {
	x: number | string; // Can be calculation name
	y: number | string;
	pointStyle?: PointStyle;
	rep?: string | MathGraphFrame;
}

export interface AddLinkedPointCircleOptions extends BaseObjectOptions {
	c: string | MathGraphCircle;
	x: number;
	y: number;
	pointStyle?: PointStyle;
	rep?: string | MathGraphFrame;
	absCoord?: boolean;
}

export interface AddLinkedPointLineOptions extends BaseObjectOptions {
	d: string | MathGraphLine;
	x: number;
	y: number;
	pointStyle?: PointStyle;
	rep?: string | MathGraphFrame;
	absCoord?: boolean;
}

export interface AddMidpointOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	b: string | MathGraphPoint;
	pointStyle?: PointStyle;
}

export interface AddLineOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	b: string | MathGraphPoint;
	lineStyle?: LineStyle;
	thickness?: number;
}

export interface AddLineHorOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	lineStyle?: LineStyle;
	thickness?: number;
}

export interface AddLineVerOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	lineStyle?: LineStyle;
	thickness?: number;
}

export interface AddLineParOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	d: string | MathGraphLine;
	lineStyle?: LineStyle;
	thickness?: number;
}

export interface AddLinePerpOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	d: string | MathGraphLine;
	lineStyle?: LineStyle;
	thickness?: number;
}

export interface AddBisectorOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	o: string | MathGraphPoint;
	b: string | MathGraphPoint;
	lineStyle?: LineStyle;
	thickness?: number;
}

export interface AddMediatorOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	b: string | MathGraphPoint;
	lineStyle?: LineStyle;
	thickness?: number;
}

// OFFICIAL API: Perpendicular bisector (médiatrice)
export interface AddLineMedABOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	b: string | MathGraphPoint;
	lineStyle?: LineStyle;
	thickness?: number;
}

// OFFICIAL API: Angle bisector (bissectrice)
export interface AddLineBisAOBOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	o: string | MathGraphPoint; // Vertex
	b: string | MathGraphPoint;
	lineStyle?: LineStyle;
	thickness?: number;
}

export interface AddCircleOAOptions extends BaseObjectOptions {
	o: string | MathGraphPoint;
	a: string | MathGraphPoint;
	lineStyle?: LineStyle;
	thickness?: number;
}

export interface AddCircleOrOptions extends BaseObjectOptions {
	o: string | MathGraphPoint;
	r: number | string; // Can be calculation name
	lineStyle?: LineStyle;
	thickness?: number;
}

export interface AddSegmentOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	b: string | MathGraphPoint;
	lineStyle?: LineStyle;
	thickness?: number;
	arrowStyle?: string;
}

export interface AddRayOptions extends BaseObjectOptions {
	o: string | MathGraphPoint;
	a: string | MathGraphPoint;
	lineStyle?: LineStyle;
	thickness?: number;
}

export interface AddVectorOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	b: string | MathGraphPoint;
	lineStyle?: LineStyle;
	thickness?: number;
	arrowStyle?: string;
}

export interface AddPolygonOptions extends BaseObjectOptions {
	points: string[] | MathGraphPoint[];
	lineStyle?: LineStyle;
	thickness?: number;
}

export interface AddBrokenLineOptions extends BaseObjectOptions {
	points: string[] | MathGraphPoint[];
	lineStyle?: LineStyle;
	thickness?: number;
}

export interface AddAngleMeasureOptions {
	a: string | MathGraphPoint;
	o: string | MathGraphPoint;
	b: string | MathGraphPoint;
}

export interface AddLengthMeasureOptions {
	a: string | MathGraphPoint;
	b: string | MathGraphPoint;
}

export interface SetUnityOptions {
	a: string | MathGraphPoint;
	b: string | MathGraphPoint;
}

export interface AddCalcOptions {
	nameCalc: string;
	formula: string;
}

export interface AddVariableOptions {
	nameCalc: string;
	val: number;
	min: number;
	max: number;
	step: number;
	dialog?: boolean;
}

export interface AddFuncOptions {
	nameCalc: string;
	formula: string;
	varName?: string;
}

export interface AddTranslationOptions {
	a: string | MathGraphPoint;
	b: string | MathGraphPoint;
}

export interface AddRotationOptions {
	o: string | MathGraphPoint;
	x: number | string; // Angle
}

export interface AddDilationOptions {
	o: string | MathGraphPoint;
	x: number | string; // Ratio
}

export interface AddSymCentOptions {
	o: string | MathGraphPoint;
}

export interface AddSymAxOptions {
	d: string | MathGraphLine;
}

export interface AddSimilitudeOptions {
	o: string | MathGraphPoint;
	x: number | string; // Angle
	y: number | string; // Ratio
}

export interface AddImPointTranslationOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	transf: MathGraphTransformation;
	pointStyle?: PointStyle;
}

export interface AddImPointRotationOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	o: string | MathGraphPoint;
	x: number | string; // Angle
	pointStyle?: PointStyle;
}

export interface AddImPointDilationOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	o: string | MathGraphPoint;
	x: number | string; // Ratio
	pointStyle?: PointStyle;
}

export interface AddImPointSymCentOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	o: string | MathGraphPoint;
	pointStyle?: PointStyle;
}

export interface AddImPointSymAxOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	d: string | MathGraphLine;
	pointStyle?: PointStyle;
}

export interface AddIntLineLineOptions extends BaseObjectOptions {
	d: string | MathGraphLine;
	d2: string | MathGraphLine;
	pointStyle?: PointStyle;
}

export interface AddIntLineCircleOptions extends BaseObjectOptions {
	d: string | MathGraphLine;
	c: string | MathGraphCircle;
	pointStyle?: PointStyle;
	tag2?: string; // For second intersection point
	smartIntersect?: boolean;
}

export interface AddIntCircleCircleOptions extends BaseObjectOptions {
	c: string | MathGraphCircle;
	c2: string | MathGraphCircle;
	pointStyle?: PointStyle;
	tag2?: string; // For second intersection point
	smartIntersect?: boolean;
}

export interface AddTextOptions extends BaseObjectOptions {
	text: string;
	x: number;
	y: number;
	rep?: string | MathGraphFrame;
	absCoord?: boolean;
	border?: 'none' | 'simple' | '3D';
	backgroundColor?: string;
	hAlign?: 'left' | 'center' | 'right';
	vAlign?: 'top' | 'middle' | 'bottom';
	opaque?: boolean;
}

export interface AddLatexOptions extends BaseObjectOptions {
	latex: string;
	x: number;
	y: number;
	rep?: string | MathGraphFrame;
	absCoord?: boolean;
	border?: 'none' | 'simple' | '3D';
	backgroundColor?: string;
	hAlign?: 'left' | 'center' | 'right';
	vAlign?: 'top' | 'middle' | 'bottom';
	opaque?: boolean;
}

export interface AddLinkedTextOptions extends BaseObjectOptions {
	text: string;
	a: string | MathGraphPoint;
	border?: 'none' | 'simple' | '3D';
	backgroundColor?: string;
	hAlign?: 'left' | 'center' | 'right';
	vAlign?: 'top' | 'middle' | 'bottom';
	opaque?: boolean;
}

export interface AddLinkedLatexOptions extends BaseObjectOptions {
	latex: string;
	a: string | MathGraphPoint;
	border?: 'none' | 'simple' | '3D';
	backgroundColor?: string;
	hAlign?: 'left' | 'center' | 'right';
	vAlign?: 'top' | 'middle' | 'bottom';
	opaque?: boolean;
}

export interface AddSurfaceOptions extends BaseObjectOptions {
	edge: string | MathGraphObject;
	fillStyle?: FillStyle;
}

export interface AddPointLocusOptions extends BaseObjectOptions {
	a: string | MathGraphPoint;
	b: string | MathGraphPoint; // Linked point
	x: number; // Number of positions
	lineStyle?: LineStyle;
	thickness?: number;
	closed?: boolean;
}

export interface AddObjectLocusOptions extends BaseObjectOptions {
	elt: string | MathGraphObject;
	a: string | MathGraphPoint; // Linked point
	x: number; // Number of positions
}

export interface AddCurveOptions extends BaseObjectOptions {
	calc: MathGraphFunction;
	x: number; // Number of points
	lineStyle?: LineStyle;
	thickness?: number;
	rep?: string | MathGraphFrame;
}

export interface AddSystemOfAxisOptions extends BaseObjectOptions {
	o: string | MathGraphPoint;
	a: string | MathGraphPoint;
	b: string | MathGraphPoint;
	lineStyle?: LineStyle;
	thickness?: number;
	verticalGrid?: boolean;
	horizontalGrid?: boolean;
	dottedGrid?: boolean;
}

export interface AddEventListenerOptions {
	eventName: string;
	elt: string | MathGraphObject;
	callBack: (event: Event) => void;
}

export interface RemoveEventListenerOptions {
	eventName: string;
	elt: string | MathGraphObject;
}

// =========================
// UTILITY TYPES
// =========================

export interface GeometryProgress {
	attempts: number;
	best_score: number;
	average_score: number;
	completed: boolean;
	last_attempt: string | null;
	total_time_spent: number;
}

export interface ClassGeometryStats {
	total_students: number;
	students_attempted: number;
	students_completed: number;
	average_score: number;
	average_time: number;
	pass_rate: number;
}

// =========================
// FORM DATA TYPES
// =========================

export interface CreateExerciseFormData {
	title: string;
	description?: string;
	instructions: string;
	exercise_type: ExerciseType;
	difficulty_level: number;
	grade_level: GradeLevel;
	validation_mode: ValidationMode;
	validation_config: ValidationConfig;
	tools_allowed: MathGraphTool[];
	gidouilles_reward: number;
	topics: string[];
	tags: string[];
}

export interface UpdateAttemptFormData {
	current_figure_state: string;
	completed_steps?: number[];
	current_step?: number;
	time_spent_seconds: number;
	active_time_seconds: number;
}

// =========================
// VALIDATION FUNCTION TYPES
// =========================

export type ValidationFunction = (app: MathGraphApp, params: ValidationParams) => ValidationResult;

export interface ValidationParams {
	tolerance?: number;
	[key: string]: unknown;
}

export interface ValidationResult {
	isValid: boolean;
	score: number;
	feedback: string;
	errors: string[];
	warnings: string[];
	measurements?: Record<string, number>;
}

// =========================
// EXPORTS
// =========================

// Re-export everything for convenience
export type * from './geometry';
