/**
 * Construction Engine - Main orchestrator for geometric construction animations
 *
 * This module provides the central engine that coordinates script loading,
 * state management, expression evaluation, and timeline control using
 * Svelte 5 runes for reactivity.
 *
 * @module constructions/core/engine
 */

import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type {
	ConstructionScript,
	ParameterValues,
	ParameterDefMap,
	InstrumentRuntimeState,
	InstrumentType,
	Position,
	Step,
	NonParallelStep,
	PointStep,
	LineStep,
	ArcStep,
	CircleStep,
	TextStep,
	MarkStep,
	MoveStep,
	ShowStep,
	HideStep,
	RotateStep,
	SpreadStep,
	RaiseStep,
	LowerStep,
	StyleStep,
	Target,
	ObjectState,
	ObjectType
} from '../types';
import {
	isPointStep,
	isLineStep,
	isArcStep,
	isCircleStep,
	isTextStep,
	isMarkStep,
	isMoveStep,
	isShowStep,
	isHideStep,
	isRotateStep,
	isSpreadStep,
	isRaiseStep,
	isLowerStep,
	isStyleStep,
	isPauseStep,
	isParallelStep
} from '../types';
import { constructionScriptSchema } from '../schemas';
import { evaluateExpr, createContext, type EvaluationContext } from './evaluator';
import { Timeline, type TimelineOptions } from './timeline.svelte';
import { DEFAULT_CANVAS_CONFIG, DEFAULT_COMPASS_RADIUS } from '../constants';

// =============================================================================
// Compass Raise/Lower Animation Constants
// =============================================================================

/** Phase timing for compass raise/lower animation during drawArc */
const COMPASS_RAISE_END = 0.2; // 20% of animation duration for raising
const COMPASS_LOWER_START = 0.8; // Last 20% of animation duration for lowering
const COMPASS_MAX_TILT = -75; // Maximum rotateX angle in degrees
const COMPASS_FADE_PORTION = 0.3; // Fade happens in last/first 30% of raise/lower phase

// =============================================================================
// Animation State Types
// =============================================================================

/**
 * Animation state for interpolating between start and end values
 */
interface AnimationState {
	/** Type of animation */
	type:
		| 'moveTo'
		| 'translate'
		| 'rotate'
		| 'show'
		| 'hide'
		| 'setCompass'
		| 'draw'
		| 'drawCircle'
		| 'drawLine'
		| 'drawArc';
	/** Target (object ID or instrument type) */
	target: string | InstrumentType;
	/** Start values */
	start: {
		x?: number;
		y?: number;
		rotation?: number;
		opacity?: number;
		compassRadius?: number;
		drawProgress?: number;
		// For drawLine
		fromX?: number;
		fromY?: number;
		toX?: number;
		toY?: number;
		// For drawArc
		centerX?: number;
		centerY?: number;
		radius?: number;
		startAngle?: number;
		endAngle?: number;
	};
	/** End values */
	end: {
		x?: number;
		y?: number;
		rotation?: number;
		opacity?: number;
		compassRadius?: number;
		drawProgress?: number;
	};
	/** Easing function */
	easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

/**
 * Easing functions for smooth animations
 */
const easingFunctions = {
	linear: (t: number) => t,
	easeIn: (t: number) => t * t,
	easeOut: (t: number) => t * (2 - t),
	easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
};

// =============================================================================
// Types
// =============================================================================

// Re-export ObjectState and ObjectType for convenience
export type { ObjectState, ObjectType };

/**
 * Engine event callbacks
 */
export interface EngineCallbacks {
	/** Called when a step is applied */
	onStepApplied?: (stepIndex: number, step: Step) => void;
	/** Called when an object is created */
	onObjectCreated?: (id: string, state: ObjectState) => void;
	/** Called when an object is updated */
	onObjectUpdated?: (id: string, state: ObjectState) => void;
	/** Called when parameters change */
	onParametersChanged?: (parameters: ParameterValues) => void;
	/** Called when an error occurs */
	onError?: (error: string) => void;
	/** Called when playback completes */
	onComplete?: () => void;
}

/**
 * Engine configuration options
 */
export interface EngineOptions extends EngineCallbacks {
	/** Initial parameter values (overrides script defaults) */
	initialParameters?: ParameterValues;
}

/**
 * Snapshot of the engine state at a point in time
 */
export interface EngineSnapshot {
	/** Applied step indices */
	readonly appliedSteps: readonly number[];
	/** Object states */
	readonly objects: ReadonlyMap<string, ObjectState>;
	/** Instrument states */
	readonly instruments: ReadonlyMap<InstrumentType, InstrumentRuntimeState>;
	/** Parameter values */
	readonly parameters: ParameterValues;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Mutable parameter values type for internal use
 */
type MutableParameterValues = { [name: string]: number | boolean | string };

/**
 * Extract default parameter values from parameter definitions
 *
 * @param params - Parameter definition map
 * @returns Default parameter values
 */
function extractDefaultParameters(params?: ParameterDefMap): ParameterValues {
	if (!params) return {};

	const defaults: MutableParameterValues = {};
	for (const [name, def] of Object.entries(params)) {
		defaults[name] = def.default;
	}
	return defaults;
}

/**
 * Resolve a target reference to coordinates
 *
 * Target can be:
 * - A string (object ID): "A"
 * - A coordinate pair: [100, 200] or ["$param", "$A.y"]
 *
 * @param target - Target reference (object ID or coordinate pair)
 * @param objects - Object states map
 * @param context - Evaluation context
 * @returns Position coordinates
 */
function resolveTarget(
	target: Target,
	objects: Map<string, ObjectState>,
	context: EvaluationContext
): Position {
	if (typeof target === 'string') {
		// Object ID reference
		const obj = objects.get(target);
		if (!obj) {
			throw new Error(`Object not found: ${target}`);
		}
		if (!obj.position) {
			throw new Error(`Object ${target} has no position`);
		}
		return obj.position;
	}

	// Coordinate pair [x, y]
	return {
		x: evaluateExpr(target[0], context),
		y: evaluateExpr(target[1], context)
	};
}

/**
 * Create initial instrument state
 *
 * @param type - Instrument type
 * @returns Initial instrument runtime state
 */
function createInstrumentState(type: InstrumentType): InstrumentRuntimeState {
	return {
		type,
		visible: false,
		x: 0,
		y: 0,
		rotation: 0,
		scale: 1,
		compassRadius: type === 'compass' ? DEFAULT_COMPASS_RADIUS : undefined
	};
}

// =============================================================================
// Construction Engine Class
// =============================================================================

/**
 * Main engine for geometric construction animations
 *
 * Coordinates script loading, state management, expression evaluation,
 * and timeline control.
 *
 * @example
 * ```typescript
 * const engine = new ConstructionEngine({
 *   onStepApplied: (index, step) => console.log(`Applied step ${index}`)
 * });
 *
 * engine.load(script);
 * engine.timeline.play();
 * ```
 */
export class ConstructionEngine {
	// =========================================================================
	// Reactive State (Svelte 5 runes)
	// =========================================================================

	/** Loaded construction script */
	script = $state<ConstructionScript | null>(null);

	/** Map of object IDs to their current state */
	objects = $state(new SvelteMap<string, ObjectState>());

	/** Map of instrument types to their current state */
	instruments = $state(new SvelteMap<InstrumentType, InstrumentRuntimeState>());

	/** Current parameter values */
	parameters = $state<ParameterValues>({});

	/** Whether the engine is loading a script */
	isLoading = $state(false);

	/** Current error message (null if no error) */
	error = $state<string | null>(null);

	/** Set of step indices that have been applied */
	#appliedSteps = $state(new SvelteSet<number>());

	// =========================================================================
	// Derived State
	// =========================================================================

	/** Whether a script is loaded */
	isLoaded = $derived(this.script !== null);

	/** List of all objects as an array */
	objectsList = $derived([...this.objects.values()]);

	/** List of visible objects */
	visibleObjects = $derived(this.objectsList.filter((obj) => obj.visible));

	/** List of all instruments as an array */
	instrumentsList = $derived([...this.instruments.values()]);

	/** Canvas configuration from the loaded script */
	canvasConfig = $derived(this.script?.canvas ?? DEFAULT_CANVAS_CONFIG);

	/** Number of steps in the loaded script */
	stepCount = $derived(this.script?.steps.length ?? 0);

	/** Number of applied steps */
	appliedStepCount = $derived(this.#appliedSteps.size);

	/** Parameter definitions from the loaded script */
	parameterDefs = $derived(this.script?.parameters ?? {});

	// =========================================================================
	// Components
	// =========================================================================

	/** Timeline controller for animation playback */
	readonly timeline: Timeline;

	// =========================================================================
	// Private State
	// =========================================================================

	#callbacks: EngineCallbacks;
	#initialParameters?: ParameterValues;

	/** Active animations for the current step */
	#activeAnimations: AnimationState[] = [];

	/** Current step index being animated */
	#currentAnimatingStep = -1;

	// =========================================================================
	// Constructor
	// =========================================================================

	/**
	 * Create a new ConstructionEngine instance
	 *
	 * @param options - Configuration options
	 */
	constructor(options?: EngineOptions) {
		this.#callbacks = options ?? {};
		this.#initialParameters = options?.initialParameters;

		// Create timeline with callbacks
		const timelineOptions: TimelineOptions = {
			onStepChange: (index, step) => {
				this.#onStepChange(index, step);
			},
			onTimeUpdate: (_time, _progress) => {
				this.#onTimeUpdate();
			},
			onComplete: () => {
				// Ensure all animations reach their final state
				this.#finalizeActiveAnimations();
				this.#callbacks.onComplete?.();
			}
		};

		this.timeline = new Timeline(timelineOptions);
	}

	// =========================================================================
	// Script Loading
	// =========================================================================

	/**
	 * Load a construction script
	 *
	 * Validates the script, initializes parameters and state, and prepares
	 * the timeline for playback.
	 *
	 * @param script - Construction script to load
	 * @throws Error if script validation fails
	 */
	load(script: ConstructionScript): void {
		this.isLoading = true;
		this.error = null;

		try {
			// Validate the script
			const validation = constructionScriptSchema.safeParse(script);
			if (!validation.success) {
				const errorMsg = validation.error.issues
					.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
					.join('; ');
				throw new Error(`Invalid script: ${errorMsg}`);
			}

			// Reset state
			this.#reset();

			// Store the script
			this.script = script;

			// Initialize parameters with defaults, then apply any initial overrides
			const defaults = extractDefaultParameters(script.parameters);
			this.parameters = { ...defaults, ...this.#initialParameters };

			// Initialize instruments
			this.#initializeInstruments();

			// Load script into timeline
			this.timeline.load(script);

			// Apply initial state (step 0 objects if any)
			// The timeline will call onStepChange which triggers applyStepsUpTo

			this.isLoading = false;
		} catch (err) {
			this.isLoading = false;
			const message = err instanceof Error ? err.message : 'Unknown error loading script';
			this.error = message;
			this.#callbacks.onError?.(message);
			throw err;
		}
	}

	/**
	 * Load a construction script from a JSON string
	 *
	 * @param json - JSON string representing the script
	 * @throws Error if JSON parsing or validation fails
	 */
	loadFromJson(json: string): void {
		try {
			const data = JSON.parse(json);
			this.load(data as ConstructionScript);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to parse JSON';
			this.error = message;
			this.#callbacks.onError?.(message);
			throw err;
		}
	}

	/**
	 * Initialize instrument states
	 */
	#initializeInstruments(): void {
		const instrumentTypes: InstrumentType[] = [
			'ruler',
			'compass',
			'compassRaised',
			'protractor',
			'setSquare',
			'pencil'
		];
		this.instruments.clear();

		for (const type of instrumentTypes) {
			this.instruments.set(type, createInstrumentState(type));
		}
	}

	// =========================================================================
	// Parameter Management
	// =========================================================================

	/**
	 * Set a parameter value
	 *
	 * Updates the parameter and recalculates all dependent object positions.
	 *
	 * @param name - Parameter name
	 * @param value - New parameter value
	 */
	setParameter(name: string, value: number | boolean | string): void {
		if (!this.script?.parameters?.[name]) {
			console.warn(`Unknown parameter: ${name}`);
			return;
		}

		// Update parameter
		this.parameters = { ...this.parameters, [name]: value };

		// Recalculate all object positions
		this.recalculate();

		// Notify
		this.#callbacks.onParametersChanged?.(this.parameters);
	}

	/**
	 * Set multiple parameters at once
	 *
	 * @param params - Object with parameter name-value pairs
	 */
	setParameters(params: ParameterValues): void {
		this.parameters = { ...this.parameters, ...params };
		this.recalculate();
		this.#callbacks.onParametersChanged?.(this.parameters);
	}

	/**
	 * Reset parameters to their default values
	 */
	resetParameters(): void {
		if (!this.script) return;

		const defaults = extractDefaultParameters(this.script.parameters);
		this.parameters = defaults;
		this.recalculate();
		this.#callbacks.onParametersChanged?.(this.parameters);
	}

	// =========================================================================
	// State Recalculation
	// =========================================================================

	/**
	 * Recalculate all object positions based on current parameters
	 *
	 * This is called when parameters change to update dependent objects.
	 */
	recalculate(): void {
		if (!this.script) return;

		const context = this.#createContext();

		// Recalculate each object's position
		for (const [id, state] of this.objects) {
			const newState = this.#recalculateObject(state, context);
			this.objects.set(id, newState);

			// Update context with new position for dependent objects
			if (newState.position) {
				(context.objectPositions as Map<string, Position>).set(id, newState.position);
			}
		}
	}

	/**
	 * Recalculate a single object's state
	 *
	 * @param state - Current object state
	 * @param context - Evaluation context
	 * @returns Updated object state
	 */
	#recalculateObject(state: ObjectState, context: EvaluationContext): ObjectState {
		// Recalculate position for point objects
		if (state.type === 'point' && isPointStep(state.step)) {
			const x = evaluateExpr(state.step.at[0], context);
			const y = evaluateExpr(state.step.at[1], context);
			return {
				...state,
				position: { x, y }
			};
		}

		// Recalculate position for text objects (may use expressions like "$P_29.x + 10")
		if (state.type === 'text' && isTextStep(state.step)) {
			const x = evaluateExpr(state.step.at[0], context);
			const y = evaluateExpr(state.step.at[1], context);
			return {
				...state,
				position: { x, y }
			};
		}

		// Recalculate position for mark objects
		if (state.type === 'mark' && isMarkStep(state.step)) {
			const x = evaluateExpr(state.step.at[0], context);
			const y = evaluateExpr(state.step.at[1], context);
			return {
				...state,
				position: { x, y }
			};
		}

		// Recalculate circle geometry
		if (state.type === 'circle' && isCircleStep(state.step)) {
			const centerPos = resolveTarget(state.step.center, this.objects, context);
			let radius: number;
			if (state.step.radius !== undefined) {
				radius = evaluateExpr(state.step.radius, context);
			} else if (state.step.through) {
				const throughPos = this.objects.get(state.step.through)?.position;
				if (throughPos) {
					radius = Math.sqrt(
						Math.pow(throughPos.x - centerPos.x, 2) + Math.pow(throughPos.y - centerPos.y, 2)
					);
				} else {
					radius = state.computed?.radius ?? 100;
				}
			} else {
				radius = state.computed?.radius ?? 100;
			}
			return {
				...state,
				computed: {
					...state.computed,
					centerX: centerPos.x,
					centerY: centerPos.y,
					radius
				}
			};
		}

		// For other object types (lines, arcs), geometry is based on instrument state at creation time
		// and doesn't need recalculation based on parameters
		return state;
	}

	// =========================================================================
	// Animation Handling
	// =========================================================================

	/**
	 * Handle step change from timeline
	 * Sets up animations for the new step
	 */
	#onStepChange(index: number, step: Step): void {
		// First, finalize any previous animations
		if (this.#currentAnimatingStep >= 0 && this.#currentAnimatingStep < index) {
			this.#finalizeActiveAnimations();
		}

		// Apply all previous steps that weren't applied yet (for seeking forward)
		this.#applyPreviousSteps(index);

		// Set up animations for the current step
		this.#currentAnimatingStep = index;
		this.#setupStepAnimations(step);
	}

	/**
	 * Handle time update - interpolate active animations
	 */
	#onTimeUpdate(): void {
		const progress = this.timeline.stepProgress;
		this.#interpolateAnimations(progress);
	}

	/**
	 * Apply all steps before the target that haven't been applied
	 */
	#applyPreviousSteps(targetIndex: number): void {
		if (!this.script) return;

		for (let i = 0; i < targetIndex; i++) {
			if (!this.#appliedSteps.has(i)) {
				this.applyStepInstantly(i);
			}
		}
	}

	/**
	 * Set up animations for a step
	 */
	#setupStepAnimations(step: Step): void {
		this.#activeAnimations = [];

		// Object creation steps - instant but with visual feedback
		if (isPointStep(step) || isCircleStep(step) || isTextStep(step) || isMarkStep(step)) {
			this.#applyObjectCreationStep(step);
			this.#appliedSteps.add(this.#currentAnimatingStep);
			return;
		}

		// Line drawing step - animated
		if (isLineStep(step)) {
			this.#setupLineAnimation(step);
			return;
		}

		// Arc drawing step - animated with 3D compass effect
		if (isArcStep(step)) {
			this.#setupArcAnimation(step);
			return;
		}

		// Instrument actions - animated
		if (isMoveStep(step)) {
			this.#setupMoveAnimation(step);
			return;
		}
		if (isShowStep(step)) {
			this.#setupShowAnimation(step);
			return;
		}
		if (isHideStep(step)) {
			this.#setupHideAnimation(step);
			return;
		}
		if (isRotateStep(step)) {
			this.#setupRotateAnimation(step);
			return;
		}
		if (isSpreadStep(step)) {
			this.#setupSpreadAnimation(step);
			return;
		}
		if (isRaiseStep(step)) {
			this.#setupRaiseAnimation(step);
			return;
		}
		if (isLowerStep(step)) {
			this.#setupLowerAnimation(step);
			return;
		}

		// Style modification - instant
		if (isStyleStep(step)) {
			this.#applyStyleStep(step);
			this.#appliedSteps.add(this.#currentAnimatingStep);
			return;
		}

		// Parallel steps
		if (isParallelStep(step)) {
			for (const subStep of step.parallel) {
				this.#setupSubStepAnimation(subStep);
			}
			return;
		}

		// Pause steps don't need any setup
		if (isPauseStep(step)) {
			this.#appliedSteps.add(this.#currentAnimatingStep);
			return;
		}
	}

	/**
	 * Set up animation for a sub-step (within parallel)
	 */
	#setupSubStepAnimation(step: NonParallelStep): void {
		// Reuse the main step setup logic for each sub-step type
		if (isPointStep(step) || isCircleStep(step) || isTextStep(step) || isMarkStep(step)) {
			this.#applyObjectCreationStep(step);
			return;
		}
		if (isLineStep(step)) {
			this.#setupLineAnimation(step);
			return;
		}
		if (isArcStep(step)) {
			this.#setupArcAnimation(step);
			return;
		}
		if (isMoveStep(step)) {
			this.#setupMoveAnimation(step);
			return;
		}
		if (isShowStep(step)) {
			this.#setupShowAnimation(step);
			return;
		}
		if (isHideStep(step)) {
			this.#setupHideAnimation(step);
			return;
		}
		if (isRotateStep(step)) {
			this.#setupRotateAnimation(step);
			return;
		}
		if (isSpreadStep(step)) {
			this.#setupSpreadAnimation(step);
			return;
		}
		if (isRaiseStep(step)) {
			this.#setupRaiseAnimation(step);
			return;
		}
		if (isLowerStep(step)) {
			this.#setupLowerAnimation(step);
			return;
		}
		if (isStyleStep(step)) {
			this.#applyStyleStep(step);
			return;
		}
	}

	/**
	 * Apply an object creation step (point, circle, text, mark)
	 */
	#applyObjectCreationStep(step: PointStep | CircleStep | TextStep | MarkStep): void {
		const context = this.#createContext();

		if (isPointStep(step)) {
			const x = evaluateExpr(step.at[0], context);
			const y = evaluateExpr(step.at[1], context);
			const label = typeof step.label === 'string' ? step.label : step.label?.text;

			const state: ObjectState = {
				id: step.point,
				type: 'point',
				step,
				visible: step.visible !== false,
				position: { x, y },
				label,
				style: {
					color: step.color,
					opacity: 1
				}
			};
			this.objects.set(step.point, state);
			this.#callbacks.onObjectCreated?.(step.point, state);
			return;
		}

		if (isCircleStep(step)) {
			const centerPos = resolveTarget(step.center, this.objects, context);
			let radius: number;
			if (step.radius !== undefined) {
				radius = evaluateExpr(step.radius, context);
			} else if (step.through) {
				const throughPos = this.objects.get(step.through)?.position;
				if (!throughPos) throw new Error(`Through point not found: ${step.through}`);
				radius = Math.sqrt(
					Math.pow(throughPos.x - centerPos.x, 2) + Math.pow(throughPos.y - centerPos.y, 2)
				);
			} else {
				throw new Error('Circle must have radius or through point');
			}

			const state: ObjectState = {
				id: step.circle,
				type: 'circle',
				step,
				visible: step.visible !== false,
				drawProgress: 1,
				computed: {
					centerX: centerPos.x,
					centerY: centerPos.y,
					radius,
					startAngle: 0,
					endAngle: 360
				},
				style: {
					color: step.color,
					lineWidth: step.width,
					lineStyle: step.style,
					opacity: 1
				}
			};
			this.objects.set(step.circle, state);
			this.#callbacks.onObjectCreated?.(step.circle, state);
			return;
		}

		if (isTextStep(step)) {
			const x = evaluateExpr(step.at[0], context);
			const y = evaluateExpr(step.at[1], context);

			const state: ObjectState = {
				id: step.text,
				type: 'text',
				step,
				visible: step.visible !== false,
				position: { x, y },
				style: {
					color: step.color,
					opacity: 1
				}
			};
			this.objects.set(step.text, state);
			this.#callbacks.onObjectCreated?.(step.text, state);
			return;
		}

		if (isMarkStep(step)) {
			const x = evaluateExpr(step.at[0], context);
			const y = evaluateExpr(step.at[1], context);

			const state: ObjectState = {
				id: step.mark,
				type: 'mark',
				step,
				visible: step.visible !== false,
				position: { x, y },
				style: {
					color: step.color,
					lineWidth: step.width,
					opacity: 1
				}
			};
			this.objects.set(step.mark, state);
			this.#callbacks.onObjectCreated?.(step.mark, state);
			return;
		}
	}

	/**
	 * Set up line drawing animation
	 * Line draws from current pencil position to target
	 */
	#setupLineAnimation(step: LineStep): void {
		const context = this.#createContext();
		const easing = 'easeInOut';

		// Get current pencil position as the starting point
		const pencil = this.instruments.get('pencil');
		const fromX = pencil?.x ?? 0;
		const fromY = pencil?.y ?? 0;

		// Resolve the target position
		const toPos = resolveTarget(step.to, this.objects, context);

		// Create the line object
		const state: ObjectState = {
			id: step.line,
			type: 'line',
			step,
			visible: step.visible !== false,
			drawProgress: 0,
			computed: {
				fromX,
				fromY,
				toX: toPos.x,
				toY: toPos.y
			},
			style: {
				color: step.color,
				lineWidth: step.width,
				lineStyle: step.style,
				opacity: 1
			}
		};
		this.objects.set(step.line, state);

		// Set up animation
		const animState: AnimationState = {
			type: 'drawLine',
			target: step.line,
			start: {
				drawProgress: 0,
				fromX,
				fromY,
				toX: toPos.x,
				toY: toPos.y
			},
			end: { drawProgress: 1 },
			easing
		};
		this.#activeAnimations.push(animState);
	}

	/**
	 * Set up arc drawing animation
	 * Arc draws from current compass position with current radius
	 */
	#setupArcAnimation(step: ArcStep): void {
		const context = this.#createContext();
		const easing = 'easeInOut';

		// Get current compass state
		const compass = this.instruments.get('compass');
		const centerX = compass?.x ?? 0;
		const centerY = compass?.y ?? 0;
		const radius = compass?.compassRadius ?? DEFAULT_COMPASS_RADIUS;
		const startAngle = compass?.rotation ?? 0;

		// Calculate sweep angle
		const sweepAngle = evaluateExpr(step.sweep, context);
		const endAngle = startAngle + sweepAngle;

		// Create the arc object
		const state: ObjectState = {
			id: step.arc,
			type: 'arc',
			step,
			visible: step.visible !== false,
			drawProgress: 0,
			computed: {
				centerX,
				centerY,
				radius,
				startAngle,
				endAngle
			},
			style: {
				color: step.color,
				lineWidth: step.width,
				lineStyle: step.style,
				opacity: 1
			}
		};
		this.objects.set(step.arc, state);

		// Set up animation
		const animState: AnimationState = {
			type: 'drawArc',
			target: step.arc,
			start: {
				drawProgress: 0,
				centerX,
				centerY,
				radius,
				startAngle,
				endAngle
			},
			end: { drawProgress: 1 },
			easing
		};
		this.#activeAnimations.push(animState);

		// Setup for 3D raise/lower animation
		if (compass) {
			this.instruments.set('compass', {
				...compass,
				visible: true,
				opacity: 1,
				rotateX: 0
			});
		}
		const compassRaised = this.instruments.get('compassRaised');
		if (compassRaised) {
			this.instruments.set('compassRaised', {
				...compassRaised,
				x: centerX,
				y: centerY,
				rotation: startAngle,
				compassRadius: radius,
				visible: true,
				opacity: 0
			});
		}
	}

	/**
	 * Set up move animation
	 */
	#setupMoveAnimation(step: MoveStep): void {
		const context = this.#createContext();
		const easing = step.easing ?? 'easeInOut';

		const { x: startX, y: startY } = this.#getTargetPosition(step.move);
		const endPos = resolveTarget(step.to, this.objects, context);

		const animState: AnimationState = {
			type: 'moveTo',
			target: step.move,
			start: { x: startX, y: startY },
			end: { x: endPos.x, y: endPos.y },
			easing
		};
		this.#activeAnimations.push(animState);
	}

	/**
	 * Set up show animation
	 */
	#setupShowAnimation(step: ShowStep): void {
		const easing = 'easeInOut';

		const animState: AnimationState = {
			type: 'show',
			target: step.show,
			start: { opacity: 0 },
			end: { opacity: 1 },
			easing
		};
		this.#activeAnimations.push(animState);

		// Make visible immediately but with opacity 0
		this.#setTargetVisibility(step.show, true);
		this.#setTargetOpacity(step.show, 0);

		// When showing compass, ensure compassRaised is hidden
		if (step.show === 'compass') {
			const compassRaised = this.instruments.get('compassRaised');
			if (compassRaised) {
				this.instruments.set('compassRaised', { ...compassRaised, visible: false });
			}
		}
	}

	/**
	 * Set up hide animation
	 */
	#setupHideAnimation(step: HideStep): void {
		const easing = 'easeInOut';

		const animState: AnimationState = {
			type: 'hide',
			target: step.hide,
			start: { opacity: 1 },
			end: { opacity: 0 },
			easing
		};
		this.#activeAnimations.push(animState);

		// When hiding compass, also hide compassRaised
		if (step.hide === 'compass') {
			const compassRaised = this.instruments.get('compassRaised');
			if (compassRaised) {
				this.instruments.set('compassRaised', { ...compassRaised, visible: false });
			}
		}
	}

	/**
	 * Set up rotate animation
	 */
	#setupRotateAnimation(step: RotateStep): void {
		const context = this.#createContext();
		const easing = step.easing ?? 'easeInOut';

		const startRotation = this.#getTargetRotation(step.rotate);
		let endRotation: number;

		if (step.to !== undefined) {
			// Absolute angle
			endRotation = evaluateExpr(step.to, context);
		} else if (step.toward) {
			// Rotate toward a point
			const { x: targetX, y: targetY } = this.#getTargetPosition(step.rotate);
			const towardPos = this.objects.get(step.toward)?.position;
			if (!towardPos) throw new Error(`Target point not found: ${step.toward}`);
			endRotation = Math.atan2(towardPos.y - targetY, towardPos.x - targetX) * (180 / Math.PI);
		} else {
			throw new Error('Rotate must have either to or toward');
		}

		const animState: AnimationState = {
			type: 'rotate',
			target: step.rotate,
			start: { rotation: startRotation },
			end: { rotation: endRotation },
			easing
		};
		this.#activeAnimations.push(animState);
	}

	/**
	 * Set up spread (compass opening) animation
	 */
	#setupSpreadAnimation(step: SpreadStep): void {
		const context = this.#createContext();
		const easing = step.easing ?? 'easeInOut';

		const compass = this.instruments.get('compass');
		const startRadius = compass?.compassRadius ?? DEFAULT_COMPASS_RADIUS;
		let endRadius: number;

		if (step.radius !== undefined) {
			// Direct radius value
			endRadius = evaluateExpr(step.radius, context);
		} else if (step.to) {
			// Spread to reach a point
			const compassX = compass?.x ?? 0;
			const compassY = compass?.y ?? 0;
			const toPos = this.objects.get(step.to)?.position;
			if (!toPos) throw new Error(`Target point not found: ${step.to}`);
			endRadius = Math.sqrt(Math.pow(toPos.x - compassX, 2) + Math.pow(toPos.y - compassY, 2));
		} else {
			throw new Error('Spread must have either to or radius');
		}

		const animState: AnimationState = {
			type: 'setCompass',
			target: 'compass',
			start: { compassRadius: startRadius },
			end: { compassRadius: endRadius },
			easing
		};
		this.#activeAnimations.push(animState);
	}

	/**
	 * Set up raise animation (3D compass lift)
	 */
	#setupRaiseAnimation(_step: RaiseStep): void {
		// For now, raise is handled within drawArc animation
		// This could be expanded for standalone raise animation
		this.#appliedSteps.add(this.#currentAnimatingStep);
	}

	/**
	 * Set up lower animation (3D compass lower)
	 */
	#setupLowerAnimation(_step: LowerStep): void {
		// For now, lower is handled within drawArc animation
		// This could be expanded for standalone lower animation
		this.#appliedSteps.add(this.#currentAnimatingStep);
	}

	/**
	 * Apply style modification step
	 */
	#applyStyleStep(step: StyleStep): void {
		const obj = this.objects.get(step.style);
		if (obj) {
			const newState = {
				...obj,
				style: {
					...obj.style,
					color: step.color ?? obj.style?.color,
					lineWidth: step.width ?? obj.style?.lineWidth,
					lineStyle: step.lineStyle ?? obj.style?.lineStyle,
					opacity: step.opacity ?? obj.style?.opacity
				},
				visible: step.visible ?? obj.visible
			};
			this.objects.set(step.style, newState);
			this.#callbacks.onObjectUpdated?.(step.style, newState);
		}
	}

	/**
	 * Interpolate all active animations based on progress (0-1)
	 */
	#interpolateAnimations(progress: number): void {
		for (const anim of this.#activeAnimations) {
			const easedProgress = easingFunctions[anim.easing](progress);
			this.#applyInterpolatedState(anim, easedProgress);
		}
	}

	/**
	 * Apply interpolated state for an animation
	 */
	#applyInterpolatedState(anim: AnimationState, progress: number): void {
		switch (anim.type) {
			case 'moveTo':
			case 'translate': {
				if (
					anim.start.x !== undefined &&
					anim.start.y !== undefined &&
					anim.end.x !== undefined &&
					anim.end.y !== undefined
				) {
					const x = anim.start.x + (anim.end.x - anim.start.x) * progress;
					const y = anim.start.y + (anim.end.y - anim.start.y) * progress;
					this.#setTargetPosition(anim.target, x, y);
				}
				break;
			}

			case 'rotate': {
				if (anim.start.rotation !== undefined && anim.end.rotation !== undefined) {
					const rotation =
						anim.start.rotation + (anim.end.rotation - anim.start.rotation) * progress;
					this.#setTargetRotation(anim.target, rotation);
				}
				break;
			}

			case 'show':
			case 'hide': {
				if (anim.start.opacity !== undefined && anim.end.opacity !== undefined) {
					const opacity = anim.start.opacity + (anim.end.opacity - anim.start.opacity) * progress;
					this.#setTargetOpacity(anim.target, opacity);
				}
				break;
			}

			case 'setCompass': {
				if (anim.start.compassRadius !== undefined && anim.end.compassRadius !== undefined) {
					const radius =
						anim.start.compassRadius +
						(anim.end.compassRadius - anim.start.compassRadius) * progress;
					const compass = this.instruments.get('compass');
					if (compass) {
						this.instruments.set('compass', { ...compass, compassRadius: radius });
					}
				}
				break;
			}

			case 'draw':
			case 'drawCircle': {
				if (anim.start.drawProgress !== undefined && anim.end.drawProgress !== undefined) {
					const drawProgress =
						anim.start.drawProgress + (anim.end.drawProgress - anim.start.drawProgress) * progress;
					const obj = this.objects.get(anim.target as string);
					if (obj) {
						this.objects.set(anim.target as string, { ...obj, drawProgress });
					}
				}
				break;
			}

			case 'drawLine': {
				if (anim.start.drawProgress !== undefined && anim.end.drawProgress !== undefined) {
					const drawProgress =
						anim.start.drawProgress + (anim.end.drawProgress - anim.start.drawProgress) * progress;

					// Update segment draw progress
					if (anim.target) {
						const obj = this.objects.get(anim.target as string);
						if (obj) {
							this.objects.set(anim.target as string, { ...obj, drawProgress });
						}
					}

					// Update pencil position
					if (
						anim.start.fromX !== undefined &&
						anim.start.fromY !== undefined &&
						anim.start.toX !== undefined &&
						anim.start.toY !== undefined
					) {
						const currentX = anim.start.fromX + (anim.start.toX - anim.start.fromX) * progress;
						const currentY = anim.start.fromY + (anim.start.toY - anim.start.fromY) * progress;
						const pencil = this.instruments.get('pencil');
						if (pencil) {
							this.instruments.set('pencil', { ...pencil, x: currentX, y: currentY });
						}
					}
				}
				break;
			}

			case 'drawArc': {
				// 3-phase animation: raise -> draw -> lower
				const compass = this.instruments.get('compass');
				const compassRaised = this.instruments.get('compassRaised');

				if (progress <= COMPASS_RAISE_END) {
					// Phase 1: Raising - compass tilts and fades, compassRaised fades in
					const raiseProgress = progress / COMPASS_RAISE_END;

					// Tilt compass (rotateX: 0 -> COMPASS_MAX_TILT)
					const tilt = raiseProgress * COMPASS_MAX_TILT;

					// Cross-fade only in last COMPASS_FADE_PORTION of raise phase
					const fadeThreshold = 1 - COMPASS_FADE_PORTION;
					let compassOpacity = 1;
					let compassRaisedOpacity = 0;
					if (raiseProgress >= fadeThreshold) {
						const fadeProgress = (raiseProgress - fadeThreshold) / COMPASS_FADE_PORTION;
						compassOpacity = 1 - fadeProgress;
						compassRaisedOpacity = fadeProgress;
					}

					if (compass) {
						this.instruments.set('compass', {
							...compass,
							rotateX: tilt,
							opacity: compassOpacity
						});
					}
					if (compassRaised) {
						this.instruments.set('compassRaised', {
							...compassRaised,
							opacity: compassRaisedOpacity
						});
					}

					// No arc drawing during raise phase
				} else if (progress >= COMPASS_LOWER_START) {
					// Phase 3: Lowering - compassRaised fades out, compass tilts back and fades in
					const lowerProgress = (progress - COMPASS_LOWER_START) / (1 - COMPASS_LOWER_START);

					// Tilt compass back (rotateX: COMPASS_MAX_TILT -> 0)
					const tilt = COMPASS_MAX_TILT * (1 - lowerProgress);

					// Cross-fade only in first COMPASS_FADE_PORTION of lower phase
					let compassOpacity = 1;
					let compassRaisedOpacity = 0;
					if (lowerProgress <= COMPASS_FADE_PORTION) {
						const fadeProgress = lowerProgress / COMPASS_FADE_PORTION;
						compassOpacity = fadeProgress;
						compassRaisedOpacity = 1 - fadeProgress;
					}

					if (compass) {
						this.instruments.set('compass', {
							...compass,
							rotateX: tilt,
							opacity: compassOpacity,
							rotation: anim.start.endAngle ?? 0
						});
					}
					if (compassRaised) {
						this.instruments.set('compassRaised', {
							...compassRaised,
							opacity: compassRaisedOpacity,
							rotation: anim.start.endAngle ?? 0
						});
					}

					// Arc is fully drawn during lower phase
					if (anim.target) {
						const obj = this.objects.get(anim.target as string);
						if (obj) {
							this.objects.set(anim.target as string, { ...obj, drawProgress: 1 });
						}
					}
				} else {
					// Phase 2: Drawing - compass hidden, compassRaised visible and rotating
					const drawPhaseProgress =
						(progress - COMPASS_RAISE_END) / (COMPASS_LOWER_START - COMPASS_RAISE_END);

					// Hide compass, show compassRaised
					if (compass) {
						this.instruments.set('compass', {
							...compass,
							opacity: 0,
							rotateX: COMPASS_MAX_TILT
						});
					}

					// Interpolate compassRaised rotation
					if (
						anim.start.startAngle !== undefined &&
						anim.start.endAngle !== undefined &&
						compassRaised
					) {
						const currentAngle =
							anim.start.startAngle +
							(anim.start.endAngle - anim.start.startAngle) * drawPhaseProgress;
						this.instruments.set('compassRaised', {
							...compassRaised,
							opacity: 1,
							rotation: currentAngle
						});
					}

					// Interpolate arc drawing
					if (anim.target) {
						const obj = this.objects.get(anim.target as string);
						if (obj) {
							this.objects.set(anim.target as string, {
								...obj,
								drawProgress: drawPhaseProgress
							});
						}
					}
				}
				break;
			}
		}
	}

	/**
	 * Finalize all active animations to their end state
	 */
	#finalizeActiveAnimations(): void {
		for (const anim of this.#activeAnimations) {
			this.#applyInterpolatedState(anim, 1);

			// For hide animations, set visibility to false at the end
			if (anim.type === 'hide') {
				this.#setTargetVisibility(anim.target, false);
				this.#setTargetOpacity(anim.target, 1); // Reset opacity
			}

			// After drawArc, ensure compass is fully reset (rotateX=0, opacity=1) and compassRaised hidden
			if (anim.type === 'drawArc') {
				const compassRaised = this.instruments.get('compassRaised');
				if (compassRaised) {
					this.instruments.set('compassRaised', {
						...compassRaised,
						visible: false,
						opacity: 0
					});
				}
				const compass = this.instruments.get('compass');
				if (compass && anim.start.centerX !== undefined && anim.start.centerY !== undefined) {
					this.instruments.set('compass', {
						...compass,
						x: anim.start.centerX,
						y: anim.start.centerY,
						rotation: anim.start.endAngle ?? 0,
						compassRadius: anim.start.radius ?? compass.compassRadius,
						visible: true,
						opacity: 1,
						rotateX: 0
					});
				}
			}
		}

		// Mark the step as applied
		if (this.#currentAnimatingStep >= 0) {
			this.#appliedSteps.add(this.#currentAnimatingStep);
			if (this.script) {
				const step = this.script.steps[this.#currentAnimatingStep];
				if (step) {
					this.#callbacks.onStepApplied?.(this.#currentAnimatingStep, step);
				}
			}
		}

		this.#activeAnimations = [];
	}

	// =========================================================================
	// Target State Helpers
	// =========================================================================

	/**
	 * Get current position of a target
	 */
	#getTargetPosition(target: string | InstrumentType): { x: number; y: number } {
		if (this.#isInstrumentType(target)) {
			const instrument = this.instruments.get(target);
			return { x: instrument?.x ?? 0, y: instrument?.y ?? 0 };
		}

		const obj = this.objects.get(target);
		return { x: obj?.position?.x ?? 0, y: obj?.position?.y ?? 0 };
	}

	/**
	 * Set position of a target
	 */
	#setTargetPosition(target: string | InstrumentType, x: number, y: number): void {
		if (this.#isInstrumentType(target)) {
			const instrument = this.instruments.get(target);
			if (instrument) {
				this.instruments.set(target, { ...instrument, x, y });
			}
			return;
		}

		const obj = this.objects.get(target);
		if (obj) {
			this.objects.set(target, { ...obj, position: { x, y } });
		}
	}

	/**
	 * Get current rotation of a target
	 */
	#getTargetRotation(target: string | InstrumentType): number {
		if (this.#isInstrumentType(target)) {
			const instrument = this.instruments.get(target);
			return instrument?.rotation ?? 0;
		}
		return 0; // Objects don't have rotation state in the current implementation
	}

	/**
	 * Set rotation of a target
	 */
	#setTargetRotation(target: string | InstrumentType, rotation: number): void {
		if (this.#isInstrumentType(target)) {
			const instrument = this.instruments.get(target);
			if (instrument) {
				this.instruments.set(target, { ...instrument, rotation });
			}
		}
		// For objects with center rotation, this would need geometric calculations
	}

	/**
	 * Set visibility of a target
	 */
	#setTargetVisibility(target: string | InstrumentType, visible: boolean): void {
		if (this.#isInstrumentType(target)) {
			const instrument = this.instruments.get(target);
			if (instrument) {
				this.instruments.set(target, { ...instrument, visible });
			}
			return;
		}

		const obj = this.objects.get(target);
		if (obj) {
			this.objects.set(target, { ...obj, visible });
		}
	}

	/**
	 * Set opacity of a target
	 */
	#setTargetOpacity(target: string | InstrumentType, opacity: number): void {
		if (this.#isInstrumentType(target)) {
			const instrument = this.instruments.get(target);
			if (instrument) {
				this.instruments.set(target, { ...instrument, opacity });
			}
			return;
		}

		const obj = this.objects.get(target);
		if (obj) {
			const currentStyle = obj.style ?? {};
			this.objects.set(target, { ...obj, style: { ...currentStyle, opacity } });
		}
	}

	// =========================================================================
	// Step Application (Instant)
	// =========================================================================

	/**
	 * Apply all steps up to and including the given index (used for seeking)
	 *
	 * @param targetIndex - Target step index
	 */
	_applyStepsUpTo(targetIndex: number): void {
		if (!this.script) return;

		const steps = this.script.steps;

		// Apply all steps from 0 to targetIndex that haven't been applied yet
		for (let i = 0; i <= targetIndex && i < steps.length; i++) {
			if (!this.#appliedSteps.has(i)) {
				this.applyStepInstantly(i);
			}
		}
	}

	/**
	 * Apply a specific step instantly (no animation)
	 *
	 * This is used for seeking or when animations are disabled.
	 *
	 * @param stepIndex - Index of the step to apply
	 */
	applyStepInstantly(stepIndex: number): void {
		if (!this.script) return;

		const step = this.script.steps[stepIndex];
		if (!step) {
			console.warn(`Invalid step index: ${stepIndex}`);
			return;
		}

		try {
			this.#applyStepInstantlyImpl(step);

			// Mark step as applied
			this.#appliedSteps.add(stepIndex);

			// Notify
			this.#callbacks.onStepApplied?.(stepIndex, step);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Error applying step';
			this.error = message;
			this.#callbacks.onError?.(message);
		}
	}

	/**
	 * Apply a specific step (for backward compatibility)
	 *
	 * @deprecated Use applyStepInstantly for instant application
	 */
	applyStep(stepIndex: number): void {
		this.applyStepInstantly(stepIndex);
	}

	/**
	 * Apply a step instantly (implementation)
	 */
	#applyStepInstantlyImpl(step: Step): void {
		// Object creation steps
		if (isPointStep(step) || isCircleStep(step) || isTextStep(step) || isMarkStep(step)) {
			this.#applyObjectCreationStep(step);
			return;
		}

		// Line step
		if (isLineStep(step)) {
			this.#applyLineStepInstantly(step);
			return;
		}

		// Arc step
		if (isArcStep(step)) {
			this.#applyArcStepInstantly(step);
			return;
		}

		// Move step
		if (isMoveStep(step)) {
			this.#applyMoveStepInstantly(step);
			return;
		}

		// Show step
		if (isShowStep(step)) {
			this.#applyShowHide(step.show, true);
			return;
		}

		// Hide step
		if (isHideStep(step)) {
			this.#applyShowHide(step.hide, false);
			return;
		}

		// Rotate step
		if (isRotateStep(step)) {
			this.#applyRotateStepInstantly(step);
			return;
		}

		// Spread step
		if (isSpreadStep(step)) {
			this.#applySpreadStepInstantly(step);
			return;
		}

		// Style step
		if (isStyleStep(step)) {
			this.#applyStyleStep(step);
			return;
		}

		// Parallel step
		if (isParallelStep(step)) {
			for (const subStep of step.parallel) {
				this.#applyStepInstantlyImpl(subStep);
			}
			return;
		}

		// Pause and raise/lower steps don't need state changes
	}

	/**
	 * Apply line step instantly
	 */
	#applyLineStepInstantly(step: LineStep): void {
		const context = this.#createContext();

		// Get current pencil position as the starting point
		const pencil = this.instruments.get('pencil');
		const fromX = pencil?.x ?? 0;
		const fromY = pencil?.y ?? 0;

		// Resolve the target position
		const toPos = resolveTarget(step.to, this.objects, context);

		// Create the line object with drawProgress = 1
		const state: ObjectState = {
			id: step.line,
			type: 'line',
			step,
			visible: step.visible !== false,
			drawProgress: 1,
			computed: {
				fromX,
				fromY,
				toX: toPos.x,
				toY: toPos.y
			},
			style: {
				color: step.color,
				lineWidth: step.width,
				lineStyle: step.style,
				opacity: 1
			}
		};
		this.objects.set(step.line, state);

		// Move pencil to end position
		if (pencil) {
			this.instruments.set('pencil', { ...pencil, x: toPos.x, y: toPos.y });
		}
	}

	/**
	 * Apply arc step instantly
	 */
	#applyArcStepInstantly(step: ArcStep): void {
		const context = this.#createContext();

		// Get current compass state
		const compass = this.instruments.get('compass');
		const centerX = compass?.x ?? 0;
		const centerY = compass?.y ?? 0;
		const radius = compass?.compassRadius ?? DEFAULT_COMPASS_RADIUS;
		const startAngle = compass?.rotation ?? 0;

		// Calculate sweep angle
		const sweepAngle = evaluateExpr(step.sweep, context);
		const endAngle = startAngle + sweepAngle;

		// Create the arc object with drawProgress = 1
		const state: ObjectState = {
			id: step.arc,
			type: 'arc',
			step,
			visible: step.visible !== false,
			drawProgress: 1,
			computed: {
				centerX,
				centerY,
				radius,
				startAngle,
				endAngle
			},
			style: {
				color: step.color,
				lineWidth: step.width,
				lineStyle: step.style,
				opacity: 1
			}
		};
		this.objects.set(step.arc, state);

		// Update compass rotation to end angle
		if (compass) {
			this.instruments.set('compass', { ...compass, rotation: endAngle });
		}
	}

	/**
	 * Apply move step instantly
	 */
	#applyMoveStepInstantly(step: MoveStep): void {
		const context = this.#createContext();
		const targetPos = resolveTarget(step.to, this.objects, context);

		if (this.#isInstrumentType(step.move)) {
			const instrument = this.instruments.get(step.move);
			if (instrument) {
				this.instruments.set(step.move, { ...instrument, x: targetPos.x, y: targetPos.y });
			}
		} else {
			const obj = this.objects.get(step.move);
			if (obj) {
				const newState = { ...obj, position: targetPos };
				this.objects.set(step.move, newState);
				this.#callbacks.onObjectUpdated?.(step.move, newState);
			}
		}
	}

	/**
	 * Apply rotate step instantly
	 */
	#applyRotateStepInstantly(step: RotateStep): void {
		const context = this.#createContext();

		let endRotation: number;
		if (step.to !== undefined) {
			endRotation = evaluateExpr(step.to, context);
		} else if (step.toward) {
			const { x: targetX, y: targetY } = this.#getTargetPosition(step.rotate);
			const towardPos = this.objects.get(step.toward)?.position;
			if (!towardPos) throw new Error(`Target point not found: ${step.toward}`);
			endRotation = Math.atan2(towardPos.y - targetY, towardPos.x - targetX) * (180 / Math.PI);
		} else {
			throw new Error('Rotate must have either to or toward');
		}

		if (this.#isInstrumentType(step.rotate)) {
			const instrument = this.instruments.get(step.rotate);
			if (instrument) {
				this.instruments.set(step.rotate, { ...instrument, rotation: endRotation });
			}
		}
	}

	/**
	 * Apply spread step instantly
	 */
	#applySpreadStepInstantly(step: SpreadStep): void {
		const context = this.#createContext();
		const compass = this.instruments.get('compass');

		let endRadius: number;
		if (step.radius !== undefined) {
			endRadius = evaluateExpr(step.radius, context);
		} else if (step.to) {
			const compassX = compass?.x ?? 0;
			const compassY = compass?.y ?? 0;
			const toPos = this.objects.get(step.to)?.position;
			if (!toPos) throw new Error(`Target point not found: ${step.to}`);
			endRadius = Math.sqrt(Math.pow(toPos.x - compassX, 2) + Math.pow(toPos.y - compassY, 2));
		} else {
			throw new Error('Spread must have either to or radius');
		}

		if (compass) {
			this.instruments.set('compass', { ...compass, compassRadius: endRadius });
		}
	}

	/**
	 * Apply show/hide action
	 */
	#applyShowHide(target: string | InstrumentType, visible: boolean): void {
		// Check if target is an instrument
		if (this.#isInstrumentType(target)) {
			const instrument = this.instruments.get(target);
			if (instrument) {
				this.instruments.set(target, { ...instrument, visible });
			}

			// When showing/hiding compass, synchronize compassRaised
			if (target === 'compass') {
				const compassRaised = this.instruments.get('compassRaised');
				if (compassRaised) {
					this.instruments.set('compassRaised', { ...compassRaised, visible: false });
				}
			}
			return;
		}

		// Object target
		const obj = this.objects.get(target);
		if (obj) {
			const newState = { ...obj, visible };
			this.objects.set(target, newState);
			this.#callbacks.onObjectUpdated?.(target, newState);
		}
	}

	/**
	 * Check if a target is an instrument type
	 */
	#isInstrumentType(target: string | InstrumentType): target is InstrumentType {
		return ['ruler', 'compass', 'compassRaised', 'protractor', 'setSquare', 'pencil'].includes(
			target
		);
	}

	// =========================================================================
	// Context Creation
	// =========================================================================

	/**
	 * Create an evaluation context from current state
	 *
	 * @returns Evaluation context with parameters and object positions
	 */
	#createContext(): EvaluationContext {
		const objectPositions = new Map<string, Position>();

		for (const [id, state] of this.objects) {
			if (state.position) {
				objectPositions.set(id, state.position);
			}
		}

		return createContext(this.parameters, objectPositions);
	}

	// =========================================================================
	// State Management
	// =========================================================================

	/**
	 * Reset engine state
	 */
	#reset(): void {
		this.objects.clear();
		this.instruments.clear();
		this.#appliedSteps.clear();
		this.error = null;
	}

	/**
	 * Reset the engine completely (including script)
	 */
	reset(): void {
		this.timeline.reset();
		this.#reset();

		if (this.script) {
			// Reinitialize with current script
			const defaults = extractDefaultParameters(this.script.parameters);
			this.parameters = { ...defaults, ...this.#initialParameters };
			this.#initializeInstruments();
		}
	}

	/**
	 * Create a snapshot of the current state
	 *
	 * @returns Engine snapshot
	 */
	snapshot(): EngineSnapshot {
		return {
			appliedSteps: [...this.#appliedSteps],
			objects: new Map(this.objects),
			instruments: new Map(this.instruments),
			parameters: { ...this.parameters }
		};
	}

	/**
	 * Restore state from a snapshot
	 *
	 * @param snapshot - Snapshot to restore
	 */
	restoreSnapshot(snapshot: EngineSnapshot): void {
		this.#appliedSteps.clear();
		for (const step of snapshot.appliedSteps) {
			this.#appliedSteps.add(step);
		}
		this.objects.clear();
		for (const [id, state] of snapshot.objects) {
			this.objects.set(id, state);
		}
		this.instruments.clear();
		for (const [type, state] of snapshot.instruments) {
			this.instruments.set(type, state);
		}
		this.parameters = { ...snapshot.parameters };
	}

	// =========================================================================
	// Object Queries
	// =========================================================================

	/**
	 * Get an object by ID
	 *
	 * @param id - Object ID
	 * @returns Object state or undefined
	 */
	getObject(id: string): ObjectState | undefined {
		return this.objects.get(id);
	}

	/**
	 * Get the position of a point object
	 *
	 * @param id - Object ID
	 * @returns Position or undefined
	 */
	getPosition(id: string): Position | undefined {
		return this.objects.get(id)?.position;
	}

	/**
	 * Get an instrument state
	 *
	 * @param type - Instrument type
	 * @returns Instrument state or undefined
	 */
	getInstrument(type: InstrumentType): InstrumentRuntimeState | undefined {
		return this.instruments.get(type);
	}

	// =========================================================================
	// Cleanup
	// =========================================================================

	/**
	 * Clean up resources
	 *
	 * Call this when the engine is no longer needed.
	 */
	destroy(): void {
		this.timeline.destroy();
		this.#reset();
		this.script = null;
		this.parameters = {};
	}
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new ConstructionEngine instance
 *
 * @param options - Configuration options
 * @returns New ConstructionEngine instance
 */
export function createEngine(options?: EngineOptions): ConstructionEngine {
	return new ConstructionEngine(options);
}

/**
 * Load a script and create an engine in one step
 *
 * @param script - Construction script to load
 * @param options - Engine options
 * @returns Configured engine with loaded script
 */
export function createEngineWithScript(
	script: ConstructionScript,
	options?: EngineOptions
): ConstructionEngine {
	const engine = new ConstructionEngine(options);
	engine.load(script);
	return engine;
}
