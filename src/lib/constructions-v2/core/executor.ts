/**
 * Construction Executor — orchestrates step-by-step DSL execution.
 *
 * Wraps a DslStepper and handles directives to manage instrument
 * state, instructions, pause durations, and speed factors.
 */

import { parseDsl, createStepper } from '$lib/geometry-core/dsl';
import type { DslStepper, DirectiveHandler } from '$lib/geometry-core/dsl';
import type { DslStatement } from '$lib/geometry-core/dsl/types';
import { DslRuntimeError } from '$lib/geometry-core/dsl/errors';
import type { DslRuntimeErrorDetails } from '$lib/geometry-core/dsl/errors';
import { Figure } from '$lib/geometry-core/graph/figure';
import type { GeoElement } from '$lib/geometry-core/types/elements';
import {
	isCircleByRadius,
	isCircleByPoint,
	isArcByAngles,
	isArcByPoints,
	isPointElement
} from '$lib/geometry-core/types/elements';
import { SymbolTable } from '$lib/geometry-core/dsl/symbol-table';
import type { ResolvedArgs, ResolvedValue } from '$lib/geometry-core/dsl/builtins';
import type { InstrumentType, InstrumentState, InstrumentMove } from '../types';
import { createDefaultInstrumentState, DRAWABLE_TYPES } from '../types';
import { rulerPosition, compassPosition } from '../instruments/positioning';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { resolveDecorators, lookupVoie, DecoratorResolveError } from './choreographies/resolve';
import type {
	DecoratorTriple,
	Voie,
	ChoreographyCtx,
	ChoreographyResult
} from './choreographies/types';
import { CHOREOGRAPHED_BUILTINS } from './choreographies/registry';
import { applyFinalVisibility } from './choreographies/visibility';
import {
	DEFAULT_STEP_DURATION,
	DEFAULT_PAUSE_DURATION,
	MIN_STEP_DURATION,
	MAX_STEP_DURATION,
	MS_PER_PIXEL,
	MS_PER_DEGREE,
	AUTO_PAUSE_BETWEEN_STEPS,
	INSTRUMENT_RAMP_MS,
	INSTRUMENT_MOVE_SPEED_FACTOR,
	COMPASS_RAISE_MS,
	COMPASS_LOWER_MS
} from '../constants';

/** French instrument name to InstrumentType mapping. */
const INSTRUMENT_NAME_MAP: Record<string, InstrumentType> = {
	regle: 'ruler',
	compas: 'compass',
	rapporteur: 'protractor',
	equerre: 'setSquare',
	crayon: 'pencil'
};

function resolveInstrumentName(name: string): InstrumentType | undefined {
	return INSTRUMENT_NAME_MAP[name];
}

function resolveStringArg(val: ResolvedValue): string | undefined {
	if (val.type === 'string') return val.value;
	return undefined;
}

function resolveNumberArg(val: ResolvedValue): number | undefined {
	if (val.type === 'nombre') return val.value;
	return undefined;
}

export class ConstructionExecutor {
	private stepper: DslStepper | null = null;
	private _program: ReturnType<typeof parseDsl> | null = null;
	private _emptyFigure = new Figure();
	private _stepDurations: number[] = [];
	private _instrumentStates = new Map<InstrumentType, InstrumentState>();
	private _currentInstruction: string | null = null;
	private _speedFactor = 1;
	private _lastStepNewElementIds: string[] = [];
	private _lastStepNewPointIds: string[] = [];
	/** Line / ray ids created in the last step. Animated with a simple fade-in
	 *  (no progressive trace, since lines are infinite). */
	private _lastStepNewLineIds: string[] = [];
	/** Instruments auto-shown for the current step (to hide when step completes). */
	private _autoInstruments: Set<InstrumentType> = new Set();
	/** Movement animations for auto-instruments (previous → new position). */
	private _instrumentMoves = new Map<InstrumentType, InstrumentMove>();
	/** Last known position of each instrument, independent of visibility.
	 *  Used by recordMove to slide from the correct position even after hideAutoInstruments. */
	private _lastInstrumentPositions = new Map<
		InstrumentType,
		{ x: number; y: number; rotation: number }
	>();
	/** Per-step phase ratios, calculated during pre-simulation. */
	private _stepPhases: {
		movePhaseEnd: number;
		drawPhaseStart: number;
		drawPhaseEnd: number;
		pausePhaseStart: number;
		moveDurationMs: number;
	}[] = [];
	/** Current step's move phase end (set during step()). */
	private _movePhaseEnd = 0;
	private _drawPhaseStart = 0;
	private _drawPhaseEnd = 1;
	/** Current step's pause phase start (set during step()). */
	private _pausePhaseStart = 1;
	/** Current step's move duration in ms. */
	private _moveDurationMs = 0;
	/** Last known compass radius (for opening animation). */
	private _lastCompassRadius = 0;
	/** Current compass radius. */
	private _compassCurRadius = 0;
	/** Runtime error captured during the pre-execution pass in calculateStepDurations.
	 *  When set, only steps 0..stepIndex-1 are considered valid; the timeline is built
	 *  from those, and the caller can display the error without losing the partial figure. */
	private _loadError: {
		message: string;
		line: number | null;
		stepIndex: number;
		details: DslRuntimeErrorDetails | null;
	} | null = null;
	/**
	 * Resolved decorator triple for the step currently being prepared, or null
	 * if the current step has no decorators (mode `@direct` implicit).
	 *
	 * Populated by `step()` from `stepper.nextStatement` BEFORE the stepper
	 * advances. Cleared when the step completes. Consumed by Phase 4 to
	 * dispatch to the appropriate choreography voie.
	 */
	private _currentDecoratorTriple: DecoratorTriple | null = null;
	/** Voie resolved for the current step (matching `_currentDecoratorTriple`). */
	private _currentVoie: Voie | null = null;
	/** Last choreography result (Phase 4) — used by Phase 5 visibility pass. */
	private _lastChoreographyResult: ChoreographyResult | null = null;
	/** Visibility decorator value of the last choreographed step. Used to apply
	 *  final visibility when the NEXT step begins (after the animation of the
	 *  current step has played out). */
	private _lastVisibilite: DecoratorTriple['visibilite'] | null = null;

	/** Load a DSL script and prepare for stepping. */
	load(script: string): void {
		this._loadError = null;
		this._program = parseDsl(script);
		this._speedFactor = 1;
		this._currentInstruction = null;
		this._instrumentStates.clear();

		const handler: DirectiveHandler = (name, args) => {
			this.handleDirective(name, args);
		};
		this.stepper = createStepper(this._program, undefined, handler);
		this._stepDurations = this.calculateStepDurations();
	}

	/** Runtime error captured during load(), or null if the script pre-executed cleanly. */
	get loadError(): {
		message: string;
		line: number | null;
		stepIndex: number;
		details: DslRuntimeErrorDetails | null;
	} | null {
		return this._loadError;
	}

	/** Execute one step. Returns false when done. */
	step(): boolean {
		if (!this.stepper) return false;
		// Hide instruments that were auto-shown for the previous step
		this.hideAutoInstruments();
		// Apply final visibility on the elements produced by the PREVIOUS
		// choreography (now that its animation has finished). This is when
		// `@squelette` hides the construction traces, `@epure` hides everything
		// except the principal, etc.
		if (this._lastChoreographyResult && this._lastVisibilite) {
			applyFinalVisibility(
				this.stepper.figure,
				this._lastChoreographyResult.produced,
				this._lastVisibilite
			);
		}
		// Resolve decorators on the upcoming statement BEFORE the stepper
		// advances. This catches `@invalid` and other errors early and exposes
		// the active triple+voie to the animation pipeline.
		this.resolveCurrentDecorators();
		// Capture the upcoming statement so we can build the choreography
		// context after the builtin runs.
		const upcomingStmt = this.stepper.nextStatement;
		const sizeBefore = this.stepper.figure.size;
		const result = this.stepper.step();
		if (result) {
			// If the statement is choreographed, invoke the choreography NOW so
			// any auxiliary elements (compass arcs, intersection points) are
			// created before `_lastStepNewElementIds` is computed and the canvas
			// animation pipeline starts.
			this._lastChoreographyResult = this.runChoreographyIfAny(upcomingStmt);
			// Capture the visibility for next step's final-visibility pass.
			this._lastVisibilite = this._currentDecoratorTriple?.visibilite ?? null;
			// Track new elements for animation (includes choreography additions)
			const elements = this.stepper.figure.getAllElements();
			const newElements = elements.slice(sizeBefore);
			this._lastStepNewElementIds = newElements
				.filter((el) => DRAWABLE_TYPES.has(el.type) && el.visible !== false)
				.map((el) => el.id);
			this._lastStepNewPointIds = newElements
				.filter((el) => isPointElement(el) && el.visible !== false)
				.map((el) => el.id);
			this._lastStepNewLineIds = newElements
				.filter((el) => (el.type === 'line' || el.type === 'ray') && el.visible !== false)
				.map((el) => el.id);
			this.autoShowInstruments(sizeBefore);
		} else {
			// End of the program. Apply visibility for the last choreographed
			// step before clearing state, so the figure settles into its
			// final visual form (@squelette/@epure traces hidden, etc.).
			if (this._lastChoreographyResult && this._lastVisibilite) {
				applyFinalVisibility(
					this.stepper.figure,
					this._lastChoreographyResult.produced,
					this._lastVisibilite
				);
			}
			this._lastStepNewElementIds = [];
			this._lastStepNewPointIds = [];
			this._lastStepNewLineIds = [];
			this._currentDecoratorTriple = null;
			this._currentVoie = null;
			this._lastChoreographyResult = null;
			this._lastVisibilite = null;
		}
		return result;
	}

	/**
	 * If `_currentVoie` is set (i.e. the just-executed statement was decorated
	 * with a non-`@direct` constraint), invoke its choreography function and
	 * return the result. The choreography typically creates auxiliary figure
	 * elements (compass arcs, intersection points) so the existing animation
	 * pipeline picks them up via `_lastStepNewElementIds`.
	 *
	 * Returns null when no choreography applies.
	 */
	private runChoreographyIfAny(stmt: DslStatement | undefined): ChoreographyResult | null {
		const voie = this._currentVoie;
		const triple = this._currentDecoratorTriple;
		if (!voie || !triple || !stmt || stmt.kind !== 'assignment') return null;
		if (!this.stepper) return null;
		// Resolve principal id (the variable assigned by the statement) and
		// builtin args from the symbol table.
		const principalEntry = this.stepper.symbols.get(stmt.name);
		if (!principalEntry?.figureId) return null;
		const callExpr = stmt.value;
		if (callExpr.kind !== 'call') return null;
		const args = this.resolveCallArgsOn(callExpr.args, this.stepper);
		if (!args) return null;
		const ctx: ChoreographyCtx = {
			figure: this.stepper.figure,
			args,
			principalId: principalEntry.figureId,
			visibilite: triple.visibilite,
			// V1 sub-choreography helper is a no-op stub ; Phase 4 composition
			// (cercle_circonscrit → 2 mediatrices) will use it.
			sub: () => ({
				steps: [],
				produced: { principal: '', charnieres: [], traces: [] }
			})
		};
		return voie.choreography(ctx);
	}

	/**
	 * Resolve a list of DSL call argument expressions to {ids, coords} for
	 * the choreography context, using the provided stepper's figure + symbols.
	 * V1 supports only identifier args (variables referencing previously-created
	 * points). Returns null on unresolvable args.
	 */
	private resolveCallArgsOn(
		callArgs: readonly { readonly kind: string; readonly name?: string }[],
		stepper: DslStepper
	): {
		readonly ids: readonly string[];
		readonly coords: readonly { x: number; y: number }[];
	} | null {
		const ids: string[] = [];
		const coords: { x: number; y: number }[] = [];
		for (const arg of callArgs) {
			if (arg.kind !== 'identifier' || !arg.name) return null;
			const entry = stepper.symbols.get(arg.name);
			if (!entry?.figureId) return null;
			const pos = stepper.figure.getPosition(entry.figureId);
			if (!pos) return null;
			ids.push(entry.figureId);
			coords.push({ x: geoToNumber(pos.x), y: geoToNumber(pos.y) });
		}
		return { ids, coords };
	}

	/**
	 * Pre-pass equivalent of `runChoreographyIfAny` : invoke the choreography
	 * on a temporary stepper so the pre-pass sees the auxiliary elements
	 * (arcs, intersections) it would create. Used by `calculateStepDurations`
	 * to size each step's duration and phase ratios correctly. Silent on
	 * resolver errors (the main step() will re-throw them).
	 */
	private runChoreographyOnTempStepper(
		stmt: DslStatement | undefined,
		tempStepper: DslStepper
	): void {
		if (!stmt || stmt.kind !== 'assignment') return;
		const decorators = stmt.decorators;
		if (!decorators || decorators.length === 0) return;
		const callExpr = stmt.value;
		if (callExpr.kind !== 'call') return;
		const builtinName = callExpr.name;
		if (!CHOREOGRAPHED_BUILTINS.has(builtinName)) return;
		let triple;
		try {
			triple = resolveDecorators(decorators, builtinName);
		} catch {
			return;
		}
		if (triple.contrainte === 'direct') return;
		const voie = lookupVoie(triple, builtinName);
		if (!voie) return;
		const principalEntry = tempStepper.symbols.get(stmt.name);
		if (!principalEntry?.figureId) return;
		const args = this.resolveCallArgsOn(callExpr.args, tempStepper);
		if (!args) return;
		const ctx: ChoreographyCtx = {
			figure: tempStepper.figure,
			args,
			principalId: principalEntry.figureId,
			visibilite: triple.visibilite,
			sub: () => ({
				steps: [],
				produced: { principal: '', charnieres: [], traces: [] }
			})
		};
		voie.choreography(ctx);
	}

	/**
	 * Inspect `stepper.nextStatement` and, if it is a decorated assignment to
	 * a choreographed builtin, resolve the decorator triple + look up the
	 * Voie. Stores result in `_currentDecoratorTriple` / `_currentVoie` for
	 * use by the animation pipeline (Phase 4+).
	 *
	 * Errors from `resolveDecorators` (unknown decorator, conflicting
	 * categories, …) are propagated as `DslRuntimeError` so the existing
	 * `_loadError` mechanism surfaces them in the player UI.
	 */
	private resolveCurrentDecorators(): void {
		this._currentDecoratorTriple = null;
		this._currentVoie = null;
		const stmt = this.stepper?.nextStatement;
		if (!stmt || stmt.kind !== 'assignment') return;
		const decorators = stmt.decorators;
		if (!decorators || decorators.length === 0) return;
		// Identify the called builtin name : RHS must be a function call.
		const value = stmt.value;
		if (value.kind !== 'call') {
			throw new DslRuntimeError(
				{
					summary: `Les décorateurs ne s'appliquent qu'aux appels de builtin (ligne ${stmt.line}).`,
					hint: 'Exemple : `d = mediatrice(A, B) @euclide`.'
				},
				stmt.line
			);
		}
		const builtinName = value.name;
		if (!CHOREOGRAPHED_BUILTINS.has(builtinName)) {
			throw new DslRuntimeError(
				{
					summary: `Le builtin \`${builtinName}\` n'a pas de chorégraphie déclarée.`,
					hint: `Builtins V1 : ${[...CHOREOGRAPHED_BUILTINS].join(', ')}.`
				},
				stmt.line
			);
		}
		try {
			const triple = resolveDecorators(decorators, builtinName);
			this._currentDecoratorTriple = triple;
			this._currentVoie = lookupVoie(triple, builtinName);
		} catch (e) {
			if (e instanceof DecoratorResolveError) {
				throw new DslRuntimeError({ summary: e.message, hint: e.hint }, stmt.line);
			}
			throw e;
		}
	}

	/** Currently-active decorator triple (null if step has no decorators). */
	get currentDecoratorTriple(): DecoratorTriple | null {
		return this._currentDecoratorTriple;
	}

	/** Currently-active choreography voie (null if `@direct` or no decorators). */
	get currentVoie(): Voie | null {
		return this._currentVoie;
	}

	/** Execute all remaining steps. */
	executeAll(): void {
		while (this.step()) {
			// continue
		}
	}

	/** Reset to initial state. */
	reset(): void {
		if (!this.stepper) return;
		this.stepper.reset();
		this._currentInstruction = null;
		this._speedFactor = 1;
		this._instrumentStates.clear();
		this._lastStepNewElementIds = [];
		this._lastStepNewPointIds = [];
		this._lastStepNewLineIds = [];
		this._autoInstruments.clear();
		this._instrumentMoves.clear();
		this._lastInstrumentPositions.clear();
		this._movePhaseEnd = 0;
		this._drawPhaseStart = 0;
		this._drawPhaseEnd = 1;
		this._pausePhaseStart = 1;
		this._moveDurationMs = 0;
		this._lastCompassRadius = 0;
		this._compassCurRadius = 0;
		this._stepPhases = [];
		this._currentDecoratorTriple = null;
		this._currentVoie = null;
		this._lastChoreographyResult = null;
		this._lastVisibilite = null;
		this._stepDurations = this.calculateStepDurations();
	}

	// ─── Accessors ───────────────────────────────────────────

	get figure(): Figure {
		return this.stepper?.figure ?? this._emptyFigure;
	}

	get symbols(): SymbolTable {
		return this.stepper?.symbols ?? new SymbolTable();
	}

	get currentStepIndex(): number {
		return this.stepper?.currentIndex ?? -1;
	}

	get totalSteps(): number {
		return this.stepper?.totalSteps ?? 0;
	}

	get stepDurations(): number[] {
		return this._stepDurations;
	}

	get instrumentStates(): Map<InstrumentType, InstrumentState> {
		return this._instrumentStates;
	}

	get currentInstruction(): string | null {
		return this._currentInstruction;
	}

	/** IDs of drawable elements created during the last step (segments, arcs, circles). */
	get lastStepNewElementIds(): string[] {
		return this._lastStepNewElementIds;
	}

	/** IDs of point elements created during the last step. */
	get lastStepNewPointIds(): string[] {
		return this._lastStepNewPointIds;
	}

	/** IDs of line/ray elements created during the last step (animated via fade-in). */
	get lastStepNewLineIds(): string[] {
		return this._lastStepNewLineIds;
	}

	/** Instrument types that were auto-shown for the current step. */
	get autoInstruments(): Set<InstrumentType> {
		return this._autoInstruments;
	}

	/** Movement animations for auto-instruments. */
	get instrumentMoves(): Map<InstrumentType, InstrumentMove> {
		return this._instrumentMoves;
	}

	get movePhaseEnd(): number {
		return this._movePhaseEnd;
	}
	get drawPhaseStart(): number {
		return this._drawPhaseStart;
	}
	get drawPhaseEnd(): number {
		return this._drawPhaseEnd;
	}
	get pausePhaseStart(): number {
		return this._pausePhaseStart;
	}
	get moveDurationMs(): number {
		return this._moveDurationMs;
	}
	get compassPrevRadius(): number {
		return this._lastCompassRadius;
	}
	get compassCurRadius(): number {
		return this._compassCurRadius;
	}

	// ─── Directive handling ──────────────────────────────────

	private handleDirective(name: string, args: ResolvedArgs): void {
		switch (name) {
			case 'instrument': {
				const instrName = resolveStringArg(args.positional[0]);
				if (!instrName) break;
				const type = resolveInstrumentName(instrName);
				if (!type) break;
				if (!this._instrumentStates.has(type)) {
					this._instrumentStates.set(type, createDefaultInstrumentState(type));
				}
				const state = this._instrumentStates.get(type)!;
				state.visible = true;
				const x = args.named.get('x');
				if (x) state.x = resolveNumberArg(x) ?? state.x;
				const y = args.named.get('y');
				if (y) state.y = resolveNumberArg(y) ?? state.y;
				const rot = args.named.get('rotation');
				if (rot) state.rotation = resolveNumberArg(rot) ?? state.rotation;
				break;
			}

			case 'instruction': {
				const text = resolveStringArg(args.positional[0]);
				this._currentInstruction = text ?? null;
				break;
			}

			case 'vitesse': {
				const factor = resolveNumberArg(args.positional[0]);
				if (factor && factor > 0) {
					this._speedFactor = factor;
				}
				break;
			}

			case 'cacher': {
				const instrName = args.positional[0] ? resolveStringArg(args.positional[0]) : undefined;
				if (instrName) {
					const type = resolveInstrumentName(instrName);
					if (type && this._instrumentStates.has(type)) {
						this._instrumentStates.get(type)!.visible = false;
					}
				} else {
					for (const [, state] of this._instrumentStates) {
						state.visible = false;
					}
				}
				break;
			}

			case 'montrer': {
				const instrName = resolveStringArg(args.positional[0]);
				if (!instrName) break;
				const type = resolveInstrumentName(instrName);
				if (!type) break;
				if (!this._instrumentStates.has(type)) {
					this._instrumentStates.set(type, createDefaultInstrumentState(type));
				}
				this._instrumentStates.get(type)!.visible = true;
				break;
			}

			case 'pause':
				// Duration is pre-calculated, no runtime action needed
				break;
		}
	}

	// ─── Auto instrument management ────────────────────────

	private ensureInstrument(type: InstrumentType): InstrumentState {
		if (!this._instrumentStates.has(type)) {
			this._instrumentStates.set(type, createDefaultInstrumentState(type));
		}
		return this._instrumentStates.get(type)!;
	}

	/** Record a movement animation for an instrument (from current to new position).
	 *  Uses _lastInstrumentPositions (not visibility) so the instrument slides from its
	 *  true last position even after hideAutoInstruments set visible=false. */
	private recordMove(type: InstrumentType, toX: number, toY: number, toRotation: number): void {
		const lastPos = this._lastInstrumentPositions.get(type);
		let fromX: number, fromY: number, fromRotation: number;
		if (lastPos) {
			fromX = lastPos.x;
			fromY = lastPos.y;
			fromRotation = lastPos.rotation;
		} else {
			// First appearance — start from top-left corner (math coords)
			fromX = -8;
			fromY = 6;
			fromRotation = 0;
		}
		this._instrumentMoves.set(type, { fromX, fromY, fromRotation, toX, toY, toRotation });
	}

	/** Auto-show and position instruments for new drawable elements. */
	private autoShowInstruments(sizeBefore: number): void {
		if (!this.stepper) return;
		const fig = this.stepper.figure;
		if (fig.size <= sizeBefore) return;

		const elements = fig.getAllElements();
		const newElements = elements.slice(sizeBefore);
		this._autoInstruments.clear();
		this._instrumentMoves.clear();

		for (const el of newElements) {
			if (el.type === 'segment') {
				const p1 = fig.getPosition(el.startId);
				const p2 = fig.getPosition(el.endId);
				if (!p1 || !p2) continue;

				const pos = rulerPosition(
					{ x: geoToNumber(p1.x), y: geoToNumber(p1.y) },
					{ x: geoToNumber(p2.x), y: geoToNumber(p2.y) }
				);

				// Record movement from previous position to new position
				this.recordMove('ruler', pos.x!, pos.y!, pos.rotation!);

				// Show and position ruler
				const ruler = this.ensureInstrument('ruler');
				Object.assign(ruler, pos);
				this._autoInstruments.add('ruler');
				// Track last known position for next step's recordMove
				this._lastInstrumentPositions.set('ruler', {
					x: pos.x!,
					y: pos.y!,
					rotation: pos.rotation!
				});

				// Show pencil at start point
				const pencil = this.ensureInstrument('pencil');
				pencil.visible = true;
				pencil.x = geoToNumber(p1.x);
				pencil.y = geoToNumber(p1.y);
				this._autoInstruments.add('pencil');
			} else if (
				el.type === 'circleByRadius' ||
				el.type === 'circleByPoint' ||
				el.type === 'arcByAngles' ||
				el.type === 'arcByPoints'
			) {
				const center = fig.getPosition(el.centerId);
				if (!center) continue;

				const radius = this.resolveRadius(el, fig);

				// Compute starting angle based on element type
				const cx = geoToNumber(center.x);
				const cy = geoToNumber(center.y);
				const startAngle = this.computeCompassStartAngle(el, fig);

				// Show and position compass (no pencil — compass traces directly)
				const pos = compassPosition({ x: cx, y: cy }, radius);

				this.recordMove('compass', cx, cy, startAngle);

				// Track radius for opening animation
				this._lastCompassRadius = this._compassCurRadius;
				this._compassCurRadius = radius;

				const compass = this.ensureInstrument('compass');
				Object.assign(compass, pos);
				compass.rotation = startAngle;
				this._autoInstruments.add('compass');
				// Track last known position with END angle (where compass finishes after drawing)
				const endAngle = this.computeCompassEndAngle(el, fig);
				this._lastInstrumentPositions.set('compass', { x: cx, y: cy, rotation: endAngle });
			}
		}

		// Read pre-calculated phase ratios
		const stepIdx = this.stepper!.currentIndex;
		if (stepIdx >= 0 && stepIdx < this._stepPhases.length) {
			const ph = this._stepPhases[stepIdx];
			this._movePhaseEnd = ph.movePhaseEnd;
			this._drawPhaseStart = ph.drawPhaseStart;
			this._drawPhaseEnd = ph.drawPhaseEnd;
			this._pausePhaseStart = ph.pausePhaseStart;
			this._moveDurationMs = ph.moveDurationMs;
		} else {
			this._movePhaseEnd = 0;
			this._drawPhaseStart = 0;
			this._drawPhaseEnd = 1;
			this._pausePhaseStart = 1;
			this._moveDurationMs = 0;
		}
	}

	/** Compute the starting angle (in degrees) for compass orientation.
	 *  For circleByPoint: angle from center to edge point.
	 *  For arcByAngles: start angle from element.
	 *  For arcByPoints: angle from center to start point.
	 *  For circleByRadius: 0 (starts from right side). */
	private computeCompassStartAngle(el: GeoElement, fig: Figure): number {
		if (isCircleByPoint(el)) {
			const center = fig.getPosition(el.centerId);
			const edge = fig.getPosition(el.edgePointId);
			if (center && edge) {
				return (
					Math.atan2(
						geoToNumber(edge.y) - geoToNumber(center.y),
						geoToNumber(edge.x) - geoToNumber(center.x)
					) *
					(180 / Math.PI)
				);
			}
		}
		if (isArcByAngles(el)) {
			return this.scalarParamToNumber(el.startAngle, fig) * (180 / Math.PI);
		}
		if (isArcByPoints(el)) {
			const center = fig.getPosition(el.centerId);
			const start = fig.getPosition(el.startId);
			if (center && start) {
				return (
					Math.atan2(
						geoToNumber(start.y) - geoToNumber(center.y),
						geoToNumber(start.x) - geoToNumber(center.x)
					) *
					(180 / Math.PI)
				);
			}
		}
		return 0; // circleByRadius starts at angle 0
	}

	/** Compute the ending angle (in degrees) after compass finishes drawing.
	 *  For circles: startAngle + 360 (full circle, same as start).
	 *  For arcByAngles: end angle from element.
	 *  For arcByPoints: angle from center to end point. */
	/** Compute start angle from a list of new elements (for pre-simulation). */
	private computeStartAngleForStep(elements: GeoElement[], fig: Figure): number {
		for (const el of elements) {
			if (DRAWABLE_TYPES.has(el.type)) {
				return this.computeCompassStartAngle(el, fig);
			}
		}
		return 0;
	}

	/** Compute end angle from a list of new elements (for pre-simulation). */
	private computeEndAngleForStep(elements: GeoElement[], fig: Figure): number {
		for (const el of elements) {
			if (DRAWABLE_TYPES.has(el.type)) {
				return this.computeCompassEndAngle(el, fig);
			}
		}
		return 0;
	}

	private computeCompassEndAngle(el: GeoElement, fig: Figure): number {
		if (isCircleByRadius(el)) {
			return 0; // full circle ends where it started
		}
		if (isCircleByPoint(el)) {
			return this.computeCompassStartAngle(el, fig); // full circle
		}
		if (isArcByAngles(el)) {
			return this.scalarParamToNumber(el.endAngle, fig) * (180 / Math.PI);
		}
		if (isArcByPoints(el)) {
			const center = fig.getPosition(el.centerId);
			const end = fig.getPosition(el.endId);
			if (center && end) {
				return (
					Math.atan2(
						geoToNumber(end.y) - geoToNumber(center.y),
						geoToNumber(end.x) - geoToNumber(center.x)
					) *
					(180 / Math.PI)
				);
			}
		}
		return 0;
	}

	/**
	 * Convert a `ScalarParam` (either `GeoValue` or `{scalarRef: id}`) to a number.
	 * Required at every site that reads element fields like `radius`, `startAngle`,
	 * `endAngle` because choreographies route these through reactive scalars
	 * (`createScalarExpression`) which are stored as `scalarRef`.
	 */
	private scalarParamToNumber(
		param:
			| { scalarRef: string }
			| { kind: 'numeric'; value: number }
			| { kind: 'exact'; node: unknown },
		fig: Figure
	): number {
		if (typeof param === 'object' && param !== null && 'scalarRef' in param) {
			return fig.getScalarValue(param.scalarRef) ?? 0;
		}
		return geoToNumber(param as Parameters<typeof geoToNumber>[0]);
	}

	private resolveRadius(el: GeoElement, fig: Figure): number {
		if (isCircleByRadius(el) || isArcByAngles(el)) {
			return this.scalarParamToNumber(el.radius, fig);
		}
		if (isCircleByPoint(el)) {
			const center = fig.getPosition(el.centerId);
			const edge = fig.getPosition(el.edgePointId);
			if (center && edge) {
				const dx = geoToNumber(edge.x) - geoToNumber(center.x);
				const dy = geoToNumber(edge.y) - geoToNumber(center.y);
				return Math.sqrt(dx * dx + dy * dy);
			}
		}
		if (isArcByPoints(el)) {
			const center = fig.getPosition(el.centerId);
			const start = fig.getPosition(el.startId);
			if (center && start) {
				const dx = geoToNumber(start.x) - geoToNumber(center.x);
				const dy = geoToNumber(start.y) - geoToNumber(center.y);
				return Math.sqrt(dx * dx + dy * dy);
			}
		}
		return 100;
	}

	/** Hide instruments that were auto-shown for the previous step. */
	hideAutoInstruments(): void {
		for (const type of this._autoInstruments) {
			const state = this._instrumentStates.get(type);
			if (state) state.visible = false;
		}
		this._autoInstruments.clear();
	}

	// ─── Duration calculation ────────────────────────────────

	/**
	 * Pre-simulate all steps to calculate durations.
	 * Each drawable step duration = moveDuration + drawDuration + AUTO_PAUSE.
	 * Also stores movePhaseEnd/pausePhaseStart ratios per step for the canvas.
	 */
	private calculateStepDurations(): number[] {
		if (!this._program) return [];
		const PPU = 40;

		// Create a temporary stepper to simulate execution
		let speedFactor = 1;
		const tempHandler: DirectiveHandler = (name, args) => {
			if (name === 'vitesse') {
				const val = args.positional[0];
				if (val?.type === 'nombre' && val.value > 0) speedFactor = val.value;
			}
		};
		const tempStepper = createStepper(this._program, undefined, tempHandler);

		const durations: number[] = [];
		this._stepPhases = [];

		// Track instrument positions for move distance calculation
		// Default start position: top-left corner in math coords
		const instrumentPos: Record<string, { x: number; y: number; rotation: number }> = {
			ruler: { x: -8, y: 6, rotation: 0 },
			compass: { x: -8, y: 6, rotation: 0 }
		};
		const steps = tempStepper.steps;

		for (let i = 0; i < steps.length; i++) {
			const durationsLenBefore = durations.length;
			const phasesLenBefore = this._stepPhases.length;
			try {
				const stmt = steps[i];
				// Validate decorators early (Phase 3) — surfaces `@invalid`,
				// conflicting categories, etc. via the existing _loadError flow.
				if (stmt.kind === 'assignment' && stmt.decorators && stmt.decorators.length > 0) {
					const callValue = stmt.value;
					if (callValue.kind !== 'call') {
						throw new DslRuntimeError(
							{
								summary: `Les décorateurs ne s'appliquent qu'aux appels de builtin (ligne ${stmt.line}).`,
								hint: 'Exemple : `d = mediatrice(A, B) @euclide`.'
							},
							stmt.line
						);
					}
					if (!CHOREOGRAPHED_BUILTINS.has(callValue.name)) {
						throw new DslRuntimeError(
							{
								summary: `Le builtin \`${callValue.name}\` n'a pas de chorégraphie déclarée.`,
								hint: `Builtins V1 : ${[...CHOREOGRAPHED_BUILTINS].join(', ')}.`
							},
							stmt.line
						);
					}
					try {
						resolveDecorators(stmt.decorators, callValue.name);
					} catch (resolveErr) {
						if (resolveErr instanceof DecoratorResolveError) {
							throw new DslRuntimeError(
								{ summary: resolveErr.message, hint: resolveErr.hint },
								stmt.line
							);
						}
						throw resolveErr;
					}
				}
				if (stmt.kind === 'directive') {
					if (stmt.name === 'pause') {
						const arg = stmt.args[0];
						durations.push(arg?.kind === 'number' ? arg.value : DEFAULT_PAUSE_DURATION);
					} else {
						durations.push(0);
					}
					this._stepPhases.push({
						movePhaseEnd: 0,
						drawPhaseStart: 0,
						drawPhaseEnd: 1,
						pausePhaseStart: 1,
						moveDurationMs: 0
					});
					tempStepper.step();
					continue;
				}

				// Geometric step: measure before/after to get distance
				const sizeBefore = tempStepper.figure.size;
				tempStepper.step();
				// If the statement is choreographed, run the choreography on this
				// temp stepper too. Otherwise the pre-pass would compute a too-
				// short step duration (no drawables anticipated) and the compass
				// instrument wouldn't get its move/draw phases.
				this.runChoreographyOnTempStepper(stmt, tempStepper);
				const fig = tempStepper.figure;
				const newElements = fig.getAllElements().slice(sizeBefore);

				const hasDrawable = newElements.some(
					(el) => DRAWABLE_TYPES.has(el.type) && el.visible !== false
				);
				const hasPoint = newElements.some((el) => isPointElement(el) && el.visible !== false);
				const hasFadeInLine = newElements.some(
					(el) => (el.type === 'line' || el.type === 'ray') && el.visible !== false
				);
				if (!hasDrawable) {
					const adjusted = Math.round(DEFAULT_STEP_DURATION / speedFactor);
					// Points AND fade-in lines/rays both get an auto-pause after their step
					// to give the user time to see the new element settle into place.
					const needsPause = hasPoint || hasFadeInLine;
					const stepDur = needsPause
						? Math.max(100, Math.min(MAX_STEP_DURATION, adjusted)) + AUTO_PAUSE_BETWEEN_STEPS
						: Math.max(100, Math.min(MAX_STEP_DURATION, adjusted));
					durations.push(stepDur);
					this._stepPhases.push({
						movePhaseEnd: 0,
						drawPhaseStart: 0,
						drawPhaseEnd: 1,
						pausePhaseStart: 1,
						moveDurationMs: 0
					});
					continue;
				}

				// Calculate draw duration from distance
				let drawDuration = DEFAULT_STEP_DURATION;
				let instrumentTarget: { type: string; x: number; y: number } | null = null;

				for (const el of newElements) {
					if (!DRAWABLE_TYPES.has(el.type)) continue;

					if (el.type === 'segment') {
						const p1 = fig.getPosition(el.startId);
						const p2 = fig.getPosition(el.endId);
						if (p1 && p2) {
							const x1 = geoToNumber(p1.x),
								y1 = geoToNumber(p1.y);
							const x2 = geoToNumber(p2.x),
								y2 = geoToNumber(p2.y);
							const distPx = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * PPU;
							drawDuration = Math.round(distPx * MS_PER_PIXEL);
							instrumentTarget = { type: 'ruler', x: x1, y: y1 };
						}
					} else if (isArcByAngles(el)) {
						const center = fig.getPosition(el.centerId);
						if (center) {
							const r = this.scalarParamToNumber(el.radius, fig);
							const sweep = Math.abs(
								this.scalarParamToNumber(el.endAngle, fig) -
									this.scalarParamToNumber(el.startAngle, fig)
							);
							drawDuration = Math.round(r * sweep * PPU * MS_PER_PIXEL);
							instrumentTarget = {
								type: 'compass',
								x: geoToNumber(center.x),
								y: geoToNumber(center.y)
							};
						}
					} else if (isArcByPoints(el)) {
						const center = fig.getPosition(el.centerId);
						const start = fig.getPosition(el.startId);
						const end = fig.getPosition(el.endId);
						if (center && start && end) {
							const cx = geoToNumber(center.x),
								cy = geoToNumber(center.y);
							const r = Math.sqrt(
								(geoToNumber(start.x) - cx) ** 2 + (geoToNumber(start.y) - cy) ** 2
							);
							const a1 = Math.atan2(geoToNumber(start.y) - cy, geoToNumber(start.x) - cx);
							const a2 = Math.atan2(geoToNumber(end.y) - cy, geoToNumber(end.x) - cx);
							let sweep = a2 - a1;
							if (sweep < 0) sweep += 2 * Math.PI;
							drawDuration = Math.round(r * sweep * PPU * MS_PER_PIXEL);
							instrumentTarget = { type: 'compass', x: cx, y: cy };
						}
					} else if (isCircleByRadius(el)) {
						const center = fig.getPosition(el.centerId);
						if (center) {
							const r = this.scalarParamToNumber(el.radius, fig);
							drawDuration = Math.round(2 * Math.PI * r * PPU * MS_PER_PIXEL);
							instrumentTarget = {
								type: 'compass',
								x: geoToNumber(center.x),
								y: geoToNumber(center.y)
							};
						}
					} else if (isCircleByPoint(el)) {
						const center = fig.getPosition(el.centerId);
						const edge = fig.getPosition(el.edgePointId);
						if (center && edge) {
							const cx = geoToNumber(center.x),
								cy = geoToNumber(center.y);
							const r = Math.sqrt(
								(geoToNumber(edge.x) - cx) ** 2 + (geoToNumber(edge.y) - cy) ** 2
							);
							drawDuration = Math.round(2 * Math.PI * r * PPU * MS_PER_PIXEL);
							instrumentTarget = { type: 'compass', x: cx, y: cy };
						}
					}
					break;
				}

				drawDuration = Math.max(
					MIN_STEP_DURATION,
					Math.min(MAX_STEP_DURATION, Math.round(drawDuration / speedFactor))
				);

				// Calculate move duration from instrument distance + rotation
				let moveDuration = 0;
				if (instrumentTarget) {
					const prev = instrumentPos[instrumentTarget.type] ?? { x: -8, y: 6, rotation: 0 };
					const dx = instrumentTarget.x - prev.x;
					const dy = instrumentTarget.y - prev.y;
					const dist = Math.sqrt(dx * dx + dy * dy);
					const cruiseMs = Math.round(
						(dist * PPU * MS_PER_PIXEL) / (speedFactor * INSTRUMENT_MOVE_SPEED_FACTOR)
					);

					// Compute start angle for this element (to know the rotation target)
					const startAngleDeg = this.computeStartAngleForStep(newElements, fig);
					let rotDelta = startAngleDeg - prev.rotation;
					while (rotDelta > 180) rotDelta -= 360;
					while (rotDelta < -180) rotDelta += 360;
					const rotMs = Math.round(
						(Math.abs(rotDelta) * MS_PER_DEGREE) / (speedFactor * INSTRUMENT_MOVE_SPEED_FACTOR)
					);

					const totalCruiseMs = Math.max(cruiseMs, rotMs);
					moveDuration = Math.max(
						600,
						totalCruiseMs <= INSTRUMENT_RAMP_MS ? totalCruiseMs : totalCruiseMs + INSTRUMENT_RAMP_MS
					);

					// Compute end angle for tracking (where compass finishes after drawing)
					const endAngleDeg = this.computeEndAngleForStep(newElements, fig);
					instrumentPos[instrumentTarget.type] = {
						x: instrumentTarget.x,
						y: instrumentTarget.y,
						rotation: endAngleDeg
					};
				}

				// Add compass raise/lower durations for compass steps
				const isCompass = instrumentTarget?.type === 'compass';
				const raiseDuration = isCompass ? COMPASS_RAISE_MS : 0;
				const lowerDuration = isCompass ? COMPASS_LOWER_MS : 0;

				const totalDuration =
					moveDuration + raiseDuration + drawDuration + lowerDuration + AUTO_PAUSE_BETWEEN_STEPS;
				durations.push(totalDuration);
				const moveEnd = moveDuration / totalDuration;
				const drawStart = (moveDuration + raiseDuration) / totalDuration;
				const drawEnd = (moveDuration + raiseDuration + drawDuration) / totalDuration;
				const pauseStart =
					(moveDuration + raiseDuration + drawDuration + lowerDuration) / totalDuration;
				this._stepPhases.push({
					movePhaseEnd: moveEnd,
					drawPhaseStart: drawStart,
					drawPhaseEnd: drawEnd,
					pausePhaseStart: pauseStart,
					moveDurationMs: moveDuration
				});
			} catch (e) {
				// Pre-execution failed at step i. Rollback any partial entries pushed
				// during this iteration, store the error info, stop the pass.
				durations.length = durationsLenBefore;
				this._stepPhases.length = phasesLenBefore;
				const message = e instanceof Error ? e.message : String(e);
				const m = message.match(/Ligne\s+(\d+)/i);
				const details = e instanceof DslRuntimeError ? e.details : null;
				this._loadError = {
					message,
					line: m ? parseInt(m[1], 10) : null,
					stepIndex: i,
					details
				};
				break;
			}
		}

		return durations;
	}
}
