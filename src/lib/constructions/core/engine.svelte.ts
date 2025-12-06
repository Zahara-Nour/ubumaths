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
	ObjectState,
	ObjectDef,
	InstrumentRuntimeState,
	InstrumentType,
	Position,
	Step,
	ActionDef,
	Expr,
	DrawLineActionDef,
	DrawArcActionDef,
	SegmentDef,
	ArcDef,
	PointRef
} from '../types';
import { isCreateStep, isActionStep } from '../types';
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
 * Resolve a point reference to coordinates
 *
 * @param ref - Point reference (object ID or inline coordinates)
 * @param objects - Object states map
 * @param context - Evaluation context
 * @returns Position coordinates
 */
function resolvePointRef(
	ref: string | { x: Expr; y: Expr },
	objects: Map<string, ObjectState>,
	context: EvaluationContext
): Position {
	if (typeof ref === 'string') {
		// Object ID reference
		const obj = objects.get(ref);
		if (!obj) {
			throw new Error(`Object not found: ${ref}`);
		}
		if (!obj.position) {
			throw new Error(`Object ${ref} has no position`);
		}
		return obj.position;
	}

	// Inline coordinates
	return {
		x: evaluateExpr(ref.x, context),
		y: evaluateExpr(ref.y, context)
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
		const def = state.def;

		if (def.kind === 'point') {
			const x = evaluateExpr(def.x, context);
			const y = evaluateExpr(def.y, context);
			return {
				...state,
				position: { x, y }
			};
		}

		// Text objects may reference point positions via expressions
		if (def.kind === 'text') {
			const x = evaluateExpr(def.x, context);
			const y = evaluateExpr(def.y, context);
			return {
				...state,
				position: { x, y }
			};
		}

		// For other object types, recalculate as needed
		// (segments, circles, etc. derive from point positions)
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

		if (isCreateStep(step)) {
			// Create steps are instant
			this.#applyCreateStep(step.object);
			this.#appliedSteps.add(this.#currentAnimatingStep);
		} else if (isActionStep(step)) {
			this.#setupActionAnimation(step.action);
		} else if (step.type === 'parallel') {
			// Set up all parallel animations
			for (const action of step.actions) {
				this.#setupActionAnimation(action);
			}
		}
		// Pause and comment steps don't need animations
	}

	/**
	 * Set up animation state for an action
	 */
	#setupActionAnimation(action: ActionDef): void {
		const context = this.#createContext();
		const easing = action.easing ?? 'easeInOut';

		switch (action.kind) {
			case 'show': {
				// Show animation: fade in
				const animState: AnimationState = {
					type: 'show',
					target: action.target,
					start: { opacity: 0 },
					end: { opacity: 1 },
					easing
				};
				this.#activeAnimations.push(animState);
				// Make visible immediately but with opacity 0
				this.#setTargetVisibility(action.target, true);
				this.#setTargetOpacity(action.target, 0);

				// When showing compass, ensure compassRaised is hidden
				if (action.target === 'compass') {
					const compassRaised = this.instruments.get('compassRaised');
					if (compassRaised) {
						this.instruments.set('compassRaised', { ...compassRaised, visible: false });
					}
				}
				break;
			}

			case 'hide': {
				// Hide animation: fade out
				const animState: AnimationState = {
					type: 'hide',
					target: action.target,
					start: { opacity: 1 },
					end: { opacity: 0 },
					easing
				};
				this.#activeAnimations.push(animState);

				// When hiding compass, also hide compassRaised
				if (action.target === 'compass') {
					const compassRaised = this.instruments.get('compassRaised');
					if (compassRaised) {
						this.instruments.set('compassRaised', { ...compassRaised, visible: false });
					}
				}
				break;
			}

			case 'moveTo': {
				const endX = evaluateExpr(action.x, context);
				const endY = evaluateExpr(action.y, context);
				const { x: startX, y: startY } = this.#getTargetPosition(action.target);

				const animState: AnimationState = {
					type: 'moveTo',
					target: action.target,
					start: { x: startX, y: startY },
					end: { x: endX, y: endY },
					easing
				};
				this.#activeAnimations.push(animState);
				break;
			}

			case 'translate': {
				const dx = evaluateExpr(action.dx, context);
				const dy = evaluateExpr(action.dy, context);
				const { x: startX, y: startY } = this.#getTargetPosition(action.target);

				const animState: AnimationState = {
					type: 'translate',
					target: action.target,
					start: { x: startX, y: startY },
					end: { x: startX + dx, y: startY + dy },
					easing
				};
				this.#activeAnimations.push(animState);
				break;
			}

			case 'rotate': {
				const angle = evaluateExpr(action.angle, context);
				const startRotation = this.#getTargetRotation(action.target);

				const animState: AnimationState = {
					type: 'rotate',
					target: action.target,
					start: { rotation: startRotation },
					end: { rotation: startRotation + angle },
					easing
				};
				this.#activeAnimations.push(animState);
				break;
			}

			case 'setCompass': {
				const endRadius = evaluateExpr(action.radius, context);
				const compass = this.instruments.get('compass');
				const startRadius = compass?.compassRadius ?? DEFAULT_COMPASS_RADIUS;

				const animState: AnimationState = {
					type: 'setCompass',
					target: 'compass',
					start: { compassRadius: startRadius },
					end: { compassRadius: endRadius },
					easing
				};
				this.#activeAnimations.push(animState);
				break;
			}

			case 'draw': {
				const startProgress = action.direction === 'reverse' ? 1 : 0;
				const endProgress = action.direction === 'reverse' ? 0 : 1;

				const animState: AnimationState = {
					type: 'draw',
					target: action.target,
					start: { drawProgress: startProgress },
					end: { drawProgress: endProgress },
					easing
				};
				this.#activeAnimations.push(animState);
				// Set initial draw progress immediately (like show sets opacity to 0)
				this.#setTargetDrawProgress(action.target, startProgress);
				break;
			}

			case 'drawCircle': {
				const animState: AnimationState = {
					type: 'drawCircle',
					target: action.target,
					start: { drawProgress: 0 },
					end: { drawProgress: 1 },
					easing
				};
				this.#activeAnimations.push(animState);
				// Set initial draw progress to 0 immediately (like show sets opacity to 0)
				this.#setTargetDrawProgress(action.target, 0);
				break;
			}

			case 'drawLine': {
				const drawLineAction = action as DrawLineActionDef;
				const fromPos = this.#resolvePointRef(drawLineAction.from);
				const toPos = this.#resolvePointRef(drawLineAction.to);
				if (!fromPos || !toPos) break;

				const targetId = drawLineAction.createObject?.id ?? '';

				// Create segment object if specified
				if (drawLineAction.createObject) {
					const segmentDef: SegmentDef = {
						kind: 'segment',
						id: drawLineAction.createObject.id,
						from: { x: fromPos.x, y: fromPos.y },
						to: { x: toPos.x, y: toPos.y },
						visible: true,
						style: drawLineAction.createObject.style
					};
					this.objects.set(drawLineAction.createObject.id, {
						def: segmentDef,
						visible: true,
						drawProgress: 0
					});
				}

				const animState: AnimationState = {
					type: 'drawLine',
					target: targetId,
					start: {
						drawProgress: 0,
						fromX: fromPos.x,
						fromY: fromPos.y,
						toX: toPos.x,
						toY: toPos.y
					},
					end: { drawProgress: 1 },
					easing
				};
				this.#activeAnimations.push(animState);

				// Move pencil to start position and make visible
				const pencil = this.instruments.get('pencil');
				if (pencil) {
					this.instruments.set('pencil', {
						...pencil,
						x: fromPos.x,
						y: fromPos.y,
						visible: true
					});
				}
				break;
			}

			case 'drawArc': {
				const drawArcAction = action as DrawArcActionDef;
				const centerPos = this.#resolvePointRef(drawArcAction.center);
				if (!centerPos) break;

				const context = this.#createContext();
				const radiusValue = evaluateExpr(drawArcAction.radius, context);
				const startAngleValue = evaluateExpr(drawArcAction.startAngle, context);
				const endAngleValue = evaluateExpr(drawArcAction.endAngle, context);

				const targetId = drawArcAction.createObject?.id ?? '';

				// Create arc object if specified
				if (drawArcAction.createObject) {
					const arcDef: ArcDef = {
						kind: 'arc',
						id: drawArcAction.createObject.id,
						center: { x: centerPos.x, y: centerPos.y },
						radius: radiusValue,
						startAngle: startAngleValue,
						endAngle: endAngleValue,
						visible: true,
						style: drawArcAction.createObject.style
					};
					this.objects.set(drawArcAction.createObject.id, {
						def: arcDef,
						visible: true,
						drawProgress: 0
					});
				}

				const animState: AnimationState = {
					type: 'drawArc',
					target: targetId,
					start: {
						drawProgress: 0,
						centerX: centerPos.x,
						centerY: centerPos.y,
						radius: radiusValue,
						startAngle: startAngleValue,
						endAngle: endAngleValue
					},
					end: { drawProgress: 1 },
					easing
				};
				this.#activeAnimations.push(animState);

				// Setup for 3D raise/lower animation:
				// Keep compass visible at arc center, will animate rotateX during raise phase
				const compass = this.instruments.get('compass');
				if (compass) {
					this.instruments.set('compass', {
						...compass,
						x: centerPos.x,
						y: centerPos.y,
						rotation: startAngleValue,
						compassRadius: radiusValue,
						visible: true,
						opacity: 1,
						rotateX: 0
					});
				}
				// Initialize compassRaised hidden (will fade in during raise phase)
				const compassRaised = this.instruments.get('compassRaised');
				if (compassRaised) {
					this.instruments.set('compassRaised', {
						...compassRaised,
						x: centerPos.x,
						y: centerPos.y,
						rotation: startAngleValue,
						compassRadius: radiusValue,
						visible: true,
						opacity: 0
					});
				}
				break;
			}

			case 'style': {
				// Style changes are instant (no animation)
				this.#applyStyle(action.target, action.style);
				break;
			}
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

	/**
	 * Set draw progress of a target object
	 * Used to initialize draw progress before animation starts
	 */
	#setTargetDrawProgress(target: string, drawProgress: number): void {
		const obj = this.objects.get(target);
		if (obj) {
			this.objects.set(target, { ...obj, drawProgress });
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
			if (isCreateStep(step)) {
				this.#applyCreateStep(step.object);
			} else if (isActionStep(step)) {
				this.#applyActionInstantly(step.action);
			} else if (step.type === 'parallel') {
				// Apply all actions in parallel step
				for (const action of step.actions) {
					this.#applyActionInstantly(action);
				}
			}
			// Pause and comment steps don't need state changes

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
	 * Apply a create step to add a new object
	 *
	 * @param objectDef - Object definition to create
	 */
	#applyCreateStep(objectDef: ObjectDef): void {
		const context = this.#createContext();
		const state = this.#createObjectState(objectDef, context);

		// Add to objects map
		this.objects.set(objectDef.id, state);

		// Notify
		this.#callbacks.onObjectCreated?.(objectDef.id, state);
	}

	/**
	 * Create initial state for an object
	 *
	 * @param def - Object definition
	 * @param context - Evaluation context
	 * @returns Initial object state
	 */
	#createObjectState(def: ObjectDef, context: EvaluationContext): ObjectState {
		const baseState: ObjectState = {
			def,
			visible: def.visible !== false, // Default to visible
			style: def.style
		};

		// Calculate position for point objects
		if (def.kind === 'point') {
			const x = evaluateExpr(def.x, context);
			const y = evaluateExpr(def.y, context);
			return {
				...baseState,
				position: { x, y }
			};
		}

		// Calculate position for text objects (may use expressions like "$P_29.x + 10")
		if (def.kind === 'text') {
			const x = evaluateExpr(def.x, context);
			const y = evaluateExpr(def.y, context);
			return {
				...baseState,
				position: { x, y }
			};
		}

		return baseState;
	}

	/**
	 * Apply an action instantly to an existing object or instrument (no animation)
	 *
	 * @param action - Action to apply
	 */
	#applyActionInstantly(action: ActionDef): void {
		switch (action.kind) {
			case 'show':
				this.#applyShowHide(action.target, true);
				break;

			case 'hide':
				this.#applyShowHide(action.target, false);
				break;

			case 'translate':
				this.#applyTranslate(action.target, action.dx, action.dy);
				break;

			case 'moveTo':
				this.#applyMoveTo(action.target, action.x, action.y);
				break;

			case 'rotate':
				this.#applyRotate(action.target, action.angle, action.center);
				break;

			case 'style':
				this.#applyStyle(action.target, action.style);
				break;

			case 'draw':
				this.#applyDraw(action.target, action.direction ?? 'forward');
				break;

			case 'drawCircle':
				this.#applyDrawCircle(action.target, action.startAngle, action.endAngle);
				break;

			case 'setCompass':
				this.#applySetCompass(action.radius);
				break;

			case 'drawLine':
				this.#applyDrawLine(action as DrawLineActionDef);
				break;

			case 'drawArc':
				this.#applyDrawArc(action as DrawArcActionDef);
				break;

			case 'scale':
				// Scale actions would need additional implementation
				break;

			case 'measure':
				// Measure actions would need additional implementation
				break;
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
					// When showing compass, hide compassRaised
					// When hiding compass, also hide compassRaised
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
	 * Apply translate action
	 */
	#applyTranslate(target: string | InstrumentType, dx: Expr, dy: Expr): void {
		const context = this.#createContext();
		const deltaX = evaluateExpr(dx, context);
		const deltaY = evaluateExpr(dy, context);

		if (this.#isInstrumentType(target)) {
			const instrument = this.instruments.get(target);
			if (instrument) {
				this.instruments.set(target, {
					...instrument,
					x: instrument.x + deltaX,
					y: instrument.y + deltaY
				});
			}
			return;
		}

		const obj = this.objects.get(target);
		if (obj?.position) {
			const newState = {
				...obj,
				position: {
					x: obj.position.x + deltaX,
					y: obj.position.y + deltaY
				}
			};
			this.objects.set(target, newState);
			this.#callbacks.onObjectUpdated?.(target, newState);
		}
	}

	/**
	 * Apply moveTo action
	 */
	#applyMoveTo(target: string | InstrumentType, x: Expr, y: Expr): void {
		const context = this.#createContext();
		const newX = evaluateExpr(x, context);
		const newY = evaluateExpr(y, context);

		if (this.#isInstrumentType(target)) {
			const instrument = this.instruments.get(target);
			if (instrument) {
				this.instruments.set(target, { ...instrument, x: newX, y: newY });
			}
			return;
		}

		const obj = this.objects.get(target);
		if (obj) {
			const newState = {
				...obj,
				position: { x: newX, y: newY }
			};
			this.objects.set(target, newState);
			this.#callbacks.onObjectUpdated?.(target, newState);
		}
	}

	/**
	 * Apply rotate action
	 */
	#applyRotate(
		target: string | InstrumentType,
		angle: Expr,
		center?: string | { x: Expr; y: Expr }
	): void {
		const context = this.#createContext();
		const rotationAngle = evaluateExpr(angle, context);

		if (this.#isInstrumentType(target)) {
			const instrument = this.instruments.get(target);
			if (instrument) {
				this.instruments.set(target, {
					...instrument,
					rotation: instrument.rotation + rotationAngle
				});
			}
			return;
		}

		// For objects, rotation around a center requires geometric calculation
		const obj = this.objects.get(target);
		if (obj?.position && center) {
			const centerPos = resolvePointRef(center, this.objects, context);
			const { x, y } = obj.position;

			// Rotate point around center
			const rad = (rotationAngle * Math.PI) / 180;
			const cos = Math.cos(rad);
			const sin = Math.sin(rad);
			const dx = x - centerPos.x;
			const dy = y - centerPos.y;

			const newState = {
				...obj,
				position: {
					x: centerPos.x + dx * cos - dy * sin,
					y: centerPos.y + dx * sin + dy * cos
				}
			};

			this.objects.set(target, newState);
			this.#callbacks.onObjectUpdated?.(target, newState);
		}
	}

	/**
	 * Apply style action
	 */
	#applyStyle(target: string, style: Partial<import('../types').StyleProps>): void {
		const obj = this.objects.get(target);
		if (obj) {
			const newState = {
				...obj,
				style: { ...obj.style, ...style }
			};
			this.objects.set(target, newState);
			this.#callbacks.onObjectUpdated?.(target, newState);
		}
	}

	/**
	 * Apply draw action (set drawing progress)
	 */
	#applyDraw(target: string, direction: 'forward' | 'reverse'): void {
		const obj = this.objects.get(target);
		if (obj) {
			const newState = {
				...obj,
				drawProgress: direction === 'forward' ? 1 : 0
			};
			this.objects.set(target, newState);
			this.#callbacks.onObjectUpdated?.(target, newState);
		}
	}

	/**
	 * Apply drawCircle action
	 */
	#applyDrawCircle(target: string, _startAngle?: Expr, _endAngle?: Expr): void {
		const obj = this.objects.get(target);
		if (obj) {
			const newState = {
				...obj,
				drawProgress: 1
			};
			this.objects.set(target, newState);
			this.#callbacks.onObjectUpdated?.(target, newState);
		}
	}

	/**
	 * Apply setCompass action
	 */
	#applySetCompass(radius: Expr): void {
		const context = this.#createContext();
		const compassRadius = evaluateExpr(radius, context);

		const compass = this.instruments.get('compass');
		if (compass) {
			this.instruments.set('compass', { ...compass, compassRadius });
		}
	}

	/**
	 * Resolve a point reference to coordinates
	 */
	#resolvePointRef(ref: PointRef): Position | undefined {
		if (typeof ref === 'string') {
			const obj = this.objects.get(ref);
			return obj?.position;
		}
		return { x: ref.x, y: ref.y };
	}

	/**
	 * Apply drawLine action instantly
	 */
	#applyDrawLine(action: DrawLineActionDef): void {
		const fromPos = this.#resolvePointRef(action.from);
		const toPos = this.#resolvePointRef(action.to);
		if (!fromPos || !toPos) return;

		if (action.createObject) {
			const segmentDef: SegmentDef = {
				kind: 'segment',
				id: action.createObject.id,
				from: { x: fromPos.x, y: fromPos.y },
				to: { x: toPos.x, y: toPos.y },
				visible: true,
				style: action.createObject.style
			};
			this.objects.set(action.createObject.id, {
				def: segmentDef,
				visible: true,
				drawProgress: 1
			});
		}

		// Move pencil to end position
		const pencil = this.instruments.get('pencil');
		if (pencil) {
			this.instruments.set('pencil', { ...pencil, x: toPos.x, y: toPos.y, visible: true });
		}
	}

	/**
	 * Apply drawArc action instantly
	 */
	#applyDrawArc(action: DrawArcActionDef): void {
		const centerPos = this.#resolvePointRef(action.center);
		if (!centerPos) return;

		const context = this.#createContext();
		const radiusValue = evaluateExpr(action.radius, context);
		const startAngleValue = evaluateExpr(action.startAngle, context);
		const endAngleValue = evaluateExpr(action.endAngle, context);

		if (action.createObject) {
			const arcDef: ArcDef = {
				kind: 'arc',
				id: action.createObject.id,
				center: { x: centerPos.x, y: centerPos.y },
				radius: radiusValue,
				startAngle: startAngleValue,
				endAngle: endAngleValue,
				visible: true,
				style: action.createObject.style
			};
			this.objects.set(action.createObject.id, {
				def: arcDef,
				visible: true,
				drawProgress: 1
			});
		}

		// Hide regular compass and position raised compass at end
		const compass = this.instruments.get('compass');
		if (compass) {
			this.instruments.set('compass', { ...compass, visible: false });
		}
		const compassRaised = this.instruments.get('compassRaised');
		if (compassRaised) {
			this.instruments.set('compassRaised', {
				...compassRaised,
				x: centerPos.x,
				y: centerPos.y,
				rotation: endAngleValue,
				compassRadius: radiusValue,
				visible: true
			});
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
