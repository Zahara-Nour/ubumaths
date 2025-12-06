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
	PointDef
} from '../types';
import { isCreateStep, isActionStep, isPauseStep } from '../types';
import { constructionScriptSchema } from '../schemas';
import { evaluateExpr, createContext, type EvaluationContext } from './evaluator';
import { Timeline, type TimelineOptions } from './timeline.svelte';
import { DEFAULT_CANVAS_CONFIG, DEFAULT_COMPASS_RADIUS, DEFAULT_POINT_RADIUS } from '../constants';

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
				this.#applyStepsUpTo(index);
			},
			onComplete: () => {
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
		const instrumentTypes: InstrumentType[] = ['ruler', 'compass', 'protractor', 'setSquare'];
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

		// For other object types, recalculate as needed
		// (segments, circles, etc. derive from point positions)
		return state;
	}

	// =========================================================================
	// Step Application
	// =========================================================================

	/**
	 * Apply all steps up to and including the given index
	 *
	 * @param targetIndex - Target step index
	 */
	#applyStepsUpTo(targetIndex: number): void {
		if (!this.script) return;

		const steps = this.script.steps;

		// Apply all steps from 0 to targetIndex that haven't been applied yet
		for (let i = 0; i <= targetIndex && i < steps.length; i++) {
			if (!this.#appliedSteps.has(i)) {
				this.applyStep(i);
			}
		}
	}

	/**
	 * Apply a specific step
	 *
	 * This is the main method for executing construction steps.
	 *
	 * @param stepIndex - Index of the step to apply
	 */
	applyStep(stepIndex: number): void {
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
				this.#applyAction(step.action);
			} else if (step.type === 'parallel') {
				// Apply all actions in parallel step
				for (const action of step.actions) {
					this.#applyAction(action);
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

		return baseState;
	}

	/**
	 * Apply an action to an existing object or instrument
	 *
	 * @param action - Action to apply
	 */
	#applyAction(action: ActionDef): void {
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
	#applyDrawCircle(target: string, startAngle?: Expr, endAngle?: Expr): void {
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
	 * Check if a target is an instrument type
	 */
	#isInstrumentType(target: string | InstrumentType): target is InstrumentType {
		return ['ruler', 'compass', 'protractor', 'setSquare'].includes(target);
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
