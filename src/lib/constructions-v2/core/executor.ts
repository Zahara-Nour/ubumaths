/**
 * Construction Executor — orchestrates step-by-step DSL execution.
 *
 * Wraps a DslStepper and handles directives to manage instrument
 * state, instructions, pause durations, and speed factors.
 */

import { parseDsl, createStepper } from '$lib/geometry-core/dsl';
import type { DslStepper, DirectiveHandler } from '$lib/geometry-core/dsl';
import type { DslStatement, DslFunctionCallExpr } from '$lib/geometry-core/dsl/types';
import { DslRuntimeError } from '$lib/geometry-core/dsl/errors';
import type { DslRuntimeErrorDetails } from '$lib/geometry-core/dsl/errors';
import { Figure } from '$lib/geometry-core/graph/figure';
import type { GeoElement } from '$lib/geometry-core/types/elements';
import {
	isCircleByRadius,
	isCircleByPoint,
	isArcByAngles,
	isArcByPoints,
	isPointElement,
	isLine,
	isSegment,
	isRay
} from '$lib/geometry-core/types/elements';
import { SymbolTable } from '$lib/geometry-core/dsl/symbol-table';
import type { ResolvedArgs, ResolvedValue } from '$lib/geometry-core/dsl/builtins';
import type { InstrumentType, InstrumentState, InstrumentMove, InstrumentPose } from '../types';
import { createDefaultInstrumentState, DRAWABLE_TYPES } from '../types';
import { rulerPosition, compassPosition } from '../instruments/positioning';
import { compassDrawAngle } from './render-helpers';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import type { ScalarParam } from '$lib/geometry-core/types/geo-value';
import { isScalarRef, isInfinityParam } from '$lib/geometry-core/types/geo-value';
import { resolveDecorators, lookupVoie, DecoratorResolveError } from './choreographies/resolve';
import type {
	DecoratorTriple,
	Voie,
	ChoreographyCtx,
	ChoreographyResult,
	ChoreographyProduced,
	SubStep
} from './choreographies/types';
import { ChoreographyError } from './choreographies/types';
import { CHOREOGRAPHED_BUILTINS } from './choreographies/registry';
import { applyFinalVisibility } from './choreographies/visibility';
import { createAuxLabeler, createNameTaken, shownName } from './choreographies/names';

/**
 * A single entry in the timeline plan.
 *
 * For a non-decorated DSL statement : exactly 1 PlanEntry with
 * `isStatementBoundary = true`, `isLastEntryOfStatement = true`, and
 * `subStep = null` (executor falls back to inferring instruments + animated
 * ids from new figure elements, like the legacy pipeline).
 *
 * For a decorated `@euclide` statement : N PlanEntries (one per sub-step
 * returned by the choreography). The first has `isStatementBoundary = true`
 * (triggers `stepper.step()` + choreography invocation at runtime) ; the
 * last has `isLastEntryOfStatement = true` (triggers final visibility).
 */
interface PlanEntry {
	readonly statement: DslStatement;
	readonly isStatementBoundary: boolean;
	readonly isLastEntryOfStatement: boolean;
	readonly decoratorTriple: DecoratorTriple | null;
	readonly voie: Voie | null;
	/** Sub-step metadata (null for non-decorated statements). */
	readonly subStep: SubStep | null;
}
import {
	DEFAULT_STEP_DURATION,
	DEFAULT_PAUSE_DURATION,
	MIN_STEP_DURATION,
	MAX_STEP_DURATION,
	MS_PER_PIXEL,
	MS_PER_DEGREE,
	AUTO_PAUSE_BETWEEN_STEPS,
	READING_MS_PER_CHAR,
	MAX_READING_PAUSE,
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

/**
 * Argument d'un appel chorégraphié : expression du langage, ou id de figure
 * déjà résolu (points porteurs d'une droite, cf. `expandLineArgument`).
 */
type CallArg = { readonly kind: string; readonly name?: string } | string;

/** Builtins chorégraphiés qui acceptent la forme `(P, d)`. */
const LINE_FORM_BUILTINS = new Set(['parallele', 'perpendiculaire']);

/** Id de figure d'un argument identifiant, ou null. */
function symbolFigureId(
	arg: { readonly kind: string; readonly name?: string },
	stepper: DslStepper
): string | null {
	if (arg.kind !== 'identifier' || !arg.name) return null;
	return stepper.symbols.get(arg.name)?.figureId ?? null;
}

/**
 * Forme `parallele(P, d)` / `perpendiculaire(P, d)` (d droite, segment ou
 * demi-droite) : ramenée à `(P, A, B)` avec les deux points qui portent d,
 * dans l'ordre du builtin (`resolveLinePoints`), pour que les chorégraphies
 * pensées pour trois points jouent telles quelles. Toute autre forme est
 * rendue inchangée.
 */
function expandLineArgument(
	callExpr: DslFunctionCallExpr,
	stepper: DslStepper
): { callArgs: CallArg[]; lineName?: string } {
	const unchanged = { callArgs: [...callExpr.args] };
	if (!LINE_FORM_BUILTINS.has(callExpr.name) || callExpr.args.length !== 2) return unchanged;
	const [first, second] = callExpr.args;
	const lineId = symbolFigureId(second, stepper);
	const el = lineId ? stepper.figure.getElementById(lineId) : undefined;
	if (!el) return unchanged;
	// Nom de d pour les consignes (« coupe d » au lieu de « coupe (AB) »).
	const lineName = shownName(stepper.figure, lineId ?? undefined) ?? undefined;
	if (isLine(el)) return { callArgs: [first, el.point1Id, el.point2Id], lineName };
	if (isSegment(el)) return { callArgs: [first, el.startId, el.endId], lineName };
	if (isRay(el)) return { callArgs: [first, el.originId, el.throughId], lineName };
	return unchanged;
}

/**
 * Forme `milieu(s)` (s segment) : ramenée à `milieu(A, B)` avec les
 * extrémités de s, pour que la chorégraphie `@mesure` lise les deux points.
 * Toute autre forme est rendue inchangée.
 */
function expandSegmentArgument(
	callExpr: DslFunctionCallExpr,
	callArgs: CallArg[],
	stepper: DslStepper
): CallArg[] {
	if (callExpr.name !== 'milieu' || callExpr.args.length !== 1) return callArgs;
	const segmentId = symbolFigureId(callExpr.args[0], stepper);
	const el = segmentId ? stepper.figure.getElementById(segmentId) : undefined;
	return el && isSegment(el) ? [el.startId, el.endId] : callArgs;
}

/**
 * Pause après une sous-étape chorégraphiée : le temps de lire sa consigne
 * (`READING_MS_PER_CHAR` par caractère), entre la pause par défaut et
 * `MAX_READING_PAUSE`. Sans consigne : la pause par défaut.
 */
export function readingPauseMs(instruction: string | undefined): number {
	const reading = (instruction?.length ?? 0) * READING_MS_PER_CHAR;
	return Math.min(MAX_READING_PAUSE, Math.max(AUTO_PAUSE_BETWEEN_STEPS, reading));
}

/**
 * Noms déclarés par le script (affectations, y compris dans les boucles et
 * les `si`) : une lettre de point auxiliaire ne doit pas les reprendre,
 * même quand la déclaration vient après la construction.
 */
function declaredNames(statements: readonly DslStatement[], out = new Set<string>()): Set<string> {
	for (const stmt of statements) {
		if (stmt.kind === 'assignment') out.add(stmt.name);
		else if (stmt.kind === 'destructuring') for (const name of stmt.names) out.add(name);
		else if (stmt.kind === 'forRange' || stmt.kind === 'forIn') declaredNames(stmt.body, out);
		else if (stmt.kind === 'if') {
			declaredNames(stmt.body, out);
			if (stmt.elseBody) declaredNames(stmt.elseBody, out);
		}
	}
	return out;
}

export class ConstructionExecutor {
	private stepper: DslStepper | null = null;
	private _program: ReturnType<typeof parseDsl> | null = null;
	/** Noms déclarés par le script (`declaredNames`), calculés au chargement. */
	private _scriptNames: ReadonlySet<string> = new Set();
	/**
	 * Points auxiliaires que le script nomme lui-même plus loin (id → nom du
	 * script, ex. `O = centre(c)`) : relevés par une première pré-passe,
	 * ils gardent le nom de l'auteur dans les consignes et sur la figure.
	 */
	private _auxScriptNamed: ReadonlyMap<string, string> = new Map();
	/** Noms rendus par `ctx.auxLabel` pendant la pré-passe (id → nom). */
	private _auxGiven = new Map<string, string>();
	/** Points auxiliaires renommés par le script pendant la dernière pré-passe. */
	private _auxRenamed = new Map<string, string>();
	private _emptyFigure = new Figure();
	private _stepDurations: number[] = [];
	private _instrumentStates = new Map<InstrumentType, InstrumentState>();
	private _currentInstruction: string | null = null;
	private _lastStepNewElementIds: string[] = [];
	private _lastStepNewPointIds: string[] = [];
	/** Line / ray ids created in the last step. Animated with a simple fade-in
	 *  (no progressive trace, since lines are infinite). */
	private _lastStepNewLineIds: string[] = [];
	/** Instruments auto-shown for the current step (to hide when step completes). */
	private _autoInstruments: Set<InstrumentType> = new Set();
	/** Movement animations for auto-instruments (previous → new position). */
	private _instrumentMoves = new Map<InstrumentType, InstrumentMove>();
	/**
	 * Instruments automatiques du dernier tracé laissés en place pendant une
	 * directive (`@pause`, `@instruction`, `@cacher`…) : affichés immobiles
	 * dans leur pose de fin de geste, cachés au premier pas qui n'est pas une
	 * directive.
	 */
	private _heldInstruments = new Set<InstrumentType>();
	/**
	 * Pose de fin de geste des instruments automatiques du pas en cours dont
	 * la position change pendant le tracé (crayon au bout du trait, compas à
	 * l'angle de fin de l'arc).
	 */
	private _instrumentEndPoses = new Map<InstrumentType, InstrumentPose>();
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
	/**
	 * Flat list of timeline entries (sub-steps). One entry = one slider
	 * position. Built by `calculateStepDurations` and consumed by `step()`.
	 *
	 * Parallel to `_stepDurations` and `_stepPhases` — same length, same
	 * indexing.
	 */
	private _plan: PlanEntry[] = [];
	/** Current position in `_plan` (-1 before first step). */
	private _timelineIndex = -1;
	/**
	 * Current sub-step metadata exposed to the canvas. Populated by `step()`
	 * from `_plan[_timelineIndex].subStep` — null when the current entry has
	 * no choreography (non-decorated statement).
	 */
	private _currentSubStep: SubStep | null = null;
	/**
	 * Pending visibility application scheduled by the LAST sub-step of a
	 * chorégraphié statement. Drained at the start of the FOLLOWING `step()`
	 * (or when `step()` returns false) so the user sees the final
	 * construction state after the last sub-step's animation completes.
	 */
	private _pendingVisibility: {
		produced: ChoreographyProduced;
		triple: DecoratorTriple;
	} | null = null;

	/** Load a DSL script and prepare for stepping. */
	load(script: string): void {
		this._loadError = null;
		this._program = parseDsl(script);
		this._scriptNames = declaredNames(this._program.statements);
		this._currentInstruction = null;
		this._instrumentStates.clear();
		this._lastStepNewElementIds = [];
		this._lastStepNewPointIds = [];
		this._lastStepNewLineIds = [];
		this._autoInstruments.clear();
		this._instrumentMoves.clear();
		this._heldInstruments.clear();
		this._instrumentEndPoses.clear();
		this._lastInstrumentPositions.clear();
		this._timelineIndex = -1;
		this._currentSubStep = null;
		this._pendingVisibility = null;
		this._currentDecoratorTriple = null;
		this._currentVoie = null;
		this._lastChoreographyResult = null;

		const handler: DirectiveHandler = (name, args) => {
			this.handleDirective(name, args);
		};
		this.stepper = createStepper(this._program, undefined, handler);
		this._auxScriptNamed = new Map();
		this._stepDurations = this.calculateStepDurations();
		// Un point auxiliaire renommé par le script (`O = centre(c)`) : la
		// frise est refaite avec le nom de l'auteur.
		if (this._auxRenamed.size > 0) {
			this._auxScriptNamed = this._auxRenamed;
			this._loadError = null;
			this._stepDurations = this.calculateStepDurations();
		}
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
		// Drain any visibility scheduled by the previous step (the last
		// sub-step of a chorégraphié statement schedules visibility to be
		// applied just before the next step's animation begins).
		this.drainPendingVisibility();
		if (this._timelineIndex + 1 >= this._plan.length) {
			this._lastStepNewElementIds = [];
			this._lastStepNewPointIds = [];
			this._lastStepNewLineIds = [];
			this._currentDecoratorTriple = null;
			this._currentVoie = null;
			this._currentSubStep = null;
			// Keep `_lastChoreographyResult` so callers (tests, debug UI) can
			// still inspect the final choreography output after `executeAll()`.
			return false;
		}
		this._timelineIndex++;
		const entry = this._plan[this._timelineIndex];
		// Instruments du pas précédent : laissés en place pendant une
		// directive (pause entre deux étapes), cachés sinon.
		if (entry.statement.kind === 'directive') {
			this.holdAutoInstruments();
		} else {
			this.hideAutoInstruments();
		}
		this._currentSubStep = entry.subStep;
		this._currentDecoratorTriple = entry.decoratorTriple;
		this._currentVoie = entry.voie;

		if (entry.isStatementBoundary) {
			// Advance the DSL stepper exactly once per statement (regardless of
			// how many sub-steps the choreography expanded into).
			const sizeBefore = this.stepper.figure.size;
			const ok = this.stepper.step();
			if (!ok) {
				// Stepper exhausted unexpectedly — should not happen since the
				// pre-pass already validated the program. Bail safely.
				this._timelineIndex--;
				return false;
			}
			// If chorégraphié, invoke choreography on the runtime figure NOW
			// so the auxiliary elements (arcs, intersections, segment-trace)
			// are materialized with deterministic ids matching pre-pass.
			if (entry.voie && entry.decoratorTriple) {
				this._lastChoreographyResult = this.invokeChoreographyOn(
					entry.statement,
					entry.voie,
					entry.decoratorTriple,
					this.stepper
				);
			} else {
				this._lastChoreographyResult = null;
			}
			// For non-chorégraphié statements : preserve the legacy behavior
			// (infer animated ids + instrument positions from newly-created
			// figure elements).
			if (!entry.subStep) {
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
				return true;
			}
		}

		// Sub-step driven animation : populate animation state from the
		// pre-computed sub-step metadata.
		if (entry.subStep) {
			this.applySubStepToAnimationState(entry.subStep);
		}

		// Schedule final visibility application for the next step transition
		// when this is the LAST sub-step of a chorégraphié statement. The
		// visibility is intentionally not applied here — it would interfere
		// with elements currently being animated.
		if (
			entry.isLastEntryOfStatement &&
			entry.decoratorTriple !== null &&
			this._lastChoreographyResult !== null
		) {
			this._pendingVisibility = {
				produced: this._lastChoreographyResult.produced,
				triple: entry.decoratorTriple
			};
		}
		return true;
	}

	/** Apply any pending visibility (from the last sub-step of a chorégraphié statement). */
	private drainPendingVisibility(): void {
		if (!this._pendingVisibility || !this.stepper) return;
		applyFinalVisibility(
			this.stepper.figure,
			this._pendingVisibility.produced,
			this._pendingVisibility.triple
		);
		this._pendingVisibility = null;
	}

	/**
	 * Populate the executor's per-step animation state from a sub-step.
	 *
	 * For chorégraphié sub-steps, the sub-step explicitly declares which
	 * elements to animate and where instruments should go — bypassing the
	 * legacy infer-from-new-elements logic of `autoShowInstruments`.
	 */
	private applySubStepToAnimationState(subStep: SubStep): void {
		this._lastStepNewElementIds = [...subStep.animateDrawableIds];
		this._lastStepNewPointIds = [...subStep.animatePointIds];
		this._lastStepNewLineIds = [...subStep.animateLineIds];
		this._autoInstruments.clear();
		this._instrumentMoves.clear();
		this._instrumentEndPoses.clear();

		// Reveal the elements that were created hidden by the choreography so
		// the canvas overlay can animate them. The animation pipeline relies
		// on `hiddenElementIds` (derived from `_lastStepNew*Ids`) to suppress
		// the static rendering while the overlay traces them in.
		if (this.stepper) {
			const fig = this.stepper.figure;
			for (const id of subStep.animateDrawableIds) fig.showElement(id);
			for (const id of subStep.animatePointIds) fig.showElement(id);
			for (const id of subStep.animateLineIds) fig.showElement(id);
		}

		// Read pre-computed phase ratios for this timeline entry.
		const ph = this._stepPhases[this._timelineIndex];
		if (ph) {
			this._movePhaseEnd = ph.movePhaseEnd;
			this._drawPhaseStart = ph.drawPhaseStart;
			this._drawPhaseEnd = ph.drawPhaseEnd;
			this._pausePhaseStart = ph.pausePhaseStart;
			this._moveDurationMs = ph.moveDurationMs;
		}

		// Position the primary instrument from the sub-step target.
		if (subStep.instrument && subStep.instrumentTarget) {
			const { x, y, rotation } = subStep.instrumentTarget;
			this.recordMove(subStep.instrument, x, y, rotation);
			const instr = this.ensureInstrument(subStep.instrument);
			instr.x = x;
			instr.y = y;
			instr.rotation = rotation;
			instr.visible = true;
			this._autoInstruments.add(subStep.instrument);

			// Track POST-draw rotation for `_lastInstrumentPositions` so the
			// next sub-step's `recordMove` slides from the correct angle.
			// Matches the legacy `autoShowInstruments` behavior which stores
			// the end angle (compass rotation after sweeping through the arc).
			let endRotation = rotation;
			if (
				subStep.kind === 'compass-draw' &&
				subStep.compassRadius !== undefined &&
				subStep.compassRadius > 0
			) {
				const sweepDeg = (subStep.geometricDistance / subStep.compassRadius) * (180 / Math.PI);
				endRotation = rotation + sweepDeg;
			}
			this._lastInstrumentPositions.set(subStep.instrument, { x, y, rotation: endRotation });
			// Pose de fin de geste : même balayage que la toile pendant le
			// tracé (`compassDrawAngle`), pour que le compas ne saute pas.
			if (
				subStep.kind === 'compass-draw' &&
				subStep.animateDrawableIds.length > 0 &&
				this.stepper
			) {
				const sweep = compassDrawAngle(new Set(subStep.animateDrawableIds), this.stepper.figure, 1);
				this._instrumentEndPoses.set(subStep.instrument, { x, y, rotation: rotation - sweep });
			}

			if (subStep.instrument === 'compass' && subStep.compassRadius !== undefined) {
				this._lastCompassRadius = this._compassCurRadius;
				this._compassCurRadius = subStep.compassRadius;
				// Also set compassRadius on the instrument state (legacy
				// pipeline does this via `compassPosition` → `Object.assign`).
				instr.compassRadius = subStep.compassRadius;
			}
		}

		// Position the secondary instrument (typically pencil following ruler).
		if (subStep.secondaryInstrument && this.stepper) {
			const secondary = this.ensureInstrument(subStep.secondaryInstrument);
			secondary.visible = true;
			// For ruler-trace, place pencil at the segment's start point so the
			// drawing tip animation tracks correctly.
			if (subStep.secondaryInstrument === 'pencil' && subStep.animateDrawableIds.length > 0) {
				const segId = subStep.animateDrawableIds[0];
				const seg = this.stepper.figure.getElementById(segId);
				if (seg && seg.type === 'segment') {
					const startPos = this.stepper.figure.getPosition(seg.startId);
					if (startPos) {
						secondary.x = geoToNumber(startPos.x);
						secondary.y = geoToNumber(startPos.y);
					}
					const endPose = this.pencilEndPose(seg, this.stepper.figure);
					if (endPose) this._instrumentEndPoses.set('pencil', endPose);
				}
			}
			this._autoInstruments.add(subStep.secondaryInstrument);
		}
	}

	/**
	 * Invoke a choreography function on a specific stepper (used by both the
	 * pre-pass — operates on `tempStepper` — and runtime — operates on
	 * `this.stepper`). The two invocations create the SAME auxiliary elements
	 * (with the same ids) because Figure auto-id counters are deterministic
	 * when the underlying createX calls are issued in the same order.
	 *
	 * Returns null when no choreography applies (assignment without call RHS,
	 * missing symbol, etc.).
	 */
	private invokeChoreographyOn(
		stmt: DslStatement,
		voie: Voie,
		triple: DecoratorTriple,
		stepper: DslStepper
	): ChoreographyResult | null {
		if (stmt.kind !== 'assignment') return null;
		const principalEntry = stepper.symbols.get(stmt.name);
		if (!principalEntry?.figureId) return null;
		const callExpr = stmt.value;
		if (callExpr.kind !== 'call') return null;
		const { callArgs, lineName } = expandLineArgument(callExpr, stepper);
		const resolved = this.resolveCallArgsOn(
			expandSegmentArgument(callExpr, callArgs, stepper),
			stepper
		);
		if (!resolved) return null;
		const args = lineName ? { ...resolved, lineName } : resolved;
		const auxLabel = createAuxLabeler(
			stepper.figure,
			this._scriptNames,
			this._auxScriptNamed,
			this._auxGiven
		);
		const nameTaken = createNameTaken(stepper.figure, this._scriptNames);
		const ctx: ChoreographyCtx = {
			figure: stepper.figure,
			args,
			principalId: principalEntry.figureId,
			visibilite: triple.visibilite,
			auxLabel,
			nameTaken,
			sub: this.buildSubChoreographyFn(stepper.figure, auxLabel, nameTaken)
		};
		try {
			return voie.choreography(ctx);
		} catch (e) {
			// Cas dégénéré signalé par la chorégraphie : erreur d'exécution
			// rattachée à la ligne de l'instruction.
			if (e instanceof ChoreographyError) {
				throw new DslRuntimeError({ summary: e.message }, stmt.line);
			}
			throw e;
		}
	}

	/**
	 * Build the `ctx.sub` helper that composed choreographies use to invoke
	 * another voie programmatically (e.g. `cercle_circonscrit @euclide`
	 * composes two `mediatrice @euclide @squelette`).
	 *
	 * Contract : the caller must have already created the sub-principal
	 * element in the figure (via factory calls) and pass its id as
	 * `subPrincipalId`. The sub voie's choreography then creates its
	 * auxiliary elements (arcs, intersections, segment-traces, ...) and
	 * returns its `ChoreographyResult`. The parent splices the sub's
	 * `subSteps` into its own list and decides how to re-classify the sub's
	 * `produced` into its own `produced` (charnières / traces / hiddenSupport).
	 *
	 * Returns a stub result (empty subSteps + only the principalId in
	 * produced) when the requested voie is not declared. Errors are
	 * surfaced silently (the parent's chorégraphie can choose to handle or
	 * ignore them).
	 */
	private buildSubChoreographyFn(
		figure: Figure,
		auxLabel: ChoreographyCtx['auxLabel'],
		nameTaken: ChoreographyCtx['nameTaken']
	): ChoreographyCtx['sub'] {
		const sub: ChoreographyCtx['sub'] = (subBuiltin, subArgs, subPrincipalId, subDecorators) => {
			const subVoie = lookupVoie(subDecorators, subBuiltin);
			if (!subVoie) {
				return {
					subSteps: [],
					produced: { principal: subPrincipalId, charnieres: [], traces: [] }
				};
			}
			const subCtx: ChoreographyCtx = {
				figure,
				args: subArgs,
				principalId: subPrincipalId,
				visibilite: subDecorators.visibilite,
				auxLabel,
				nameTaken,
				sub
			};
			return subVoie.choreography(subCtx);
		};
		return sub;
	}

	/**
	 * Resolve a list of DSL call argument expressions (or figure ids already
	 * resolved, cf. `expandLineArgument`) to {ids, coords} for
	 * the choreography context, using the provided stepper's figure + symbols.
	 * V1 supports only identifier args (variables referencing previously-created
	 * points). Returns null on unresolvable args.
	 */
	private resolveCallArgsOn(
		callArgs: readonly CallArg[],
		stepper: DslStepper
	): {
		readonly ids: readonly string[];
		readonly coords: readonly { x: number; y: number }[];
	} | null {
		const ids: string[] = [];
		const coords: { x: number; y: number }[] = [];
		for (const arg of callArgs) {
			const figureId = typeof arg === 'string' ? arg : symbolFigureId(arg, stepper);
			if (!figureId) return null;
			const pos = stepper.figure.getPosition(figureId);
			if (!pos) return null;
			ids.push(figureId);
			coords.push({ x: geoToNumber(pos.x), y: geoToNumber(pos.y) });
		}
		return { ids, coords };
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
		this._instrumentStates.clear();
		this._lastStepNewElementIds = [];
		this._lastStepNewPointIds = [];
		this._lastStepNewLineIds = [];
		this._autoInstruments.clear();
		this._instrumentMoves.clear();
		this._heldInstruments.clear();
		this._instrumentEndPoses.clear();
		this._lastInstrumentPositions.clear();
		this._movePhaseEnd = 0;
		this._drawPhaseStart = 0;
		this._drawPhaseEnd = 1;
		this._pausePhaseStart = 1;
		this._moveDurationMs = 0;
		this._lastCompassRadius = 0;
		this._compassCurRadius = 0;
		this._stepPhases = [];
		this._plan = [];
		this._timelineIndex = -1;
		this._currentSubStep = null;
		this._pendingVisibility = null;
		this._currentDecoratorTriple = null;
		this._currentVoie = null;
		this._lastChoreographyResult = null;
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
		return this._timelineIndex;
	}

	get totalSteps(): number {
		return this._plan.length;
	}

	/** Currently-active sub-step, or null when the entry is non-choreographed. */
	get currentSubStep(): SubStep | null {
		return this._currentSubStep;
	}

	/** Plan entries (one per timeline slot). Exposed for tests + debugging. */
	get plan(): readonly PlanEntry[] {
		return this._plan;
	}

	/** Last choreography result produced by a chorégraphié statement boundary. */
	get lastChoreographyResult(): ChoreographyResult | null {
		return this._lastChoreographyResult;
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

	/** Instruments automatiques du dernier tracé laissés en place pendant une directive. */
	get heldInstruments(): Set<InstrumentType> {
		return this._heldInstruments;
	}

	/** Pose de fin de geste des instruments automatiques du pas en cours. */
	get instrumentEndPoses(): Map<InstrumentType, InstrumentPose> {
		return this._instrumentEndPoses;
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
				// Le script reprend la main sur cet instrument
				this._heldInstruments.delete(type);
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

			case 'vitesse':
				// Pris en compte à la pré-simulation (durées des pas), rien à faire ici
				break;

			case 'cacher': {
				const instrName = args.positional[0] ? resolveStringArg(args.positional[0]) : undefined;
				if (instrName) {
					const type = resolveInstrumentName(instrName);
					if (type) this._heldInstruments.delete(type);
					if (type && this._instrumentStates.has(type)) {
						this._instrumentStates.get(type)!.visible = false;
					}
				} else {
					this._heldInstruments.clear();
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
				this._heldInstruments.delete(type);
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
		this._instrumentEndPoses.clear();

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
				const pencilEnd = this.pencilEndPose(el, fig);
				if (pencilEnd) this._instrumentEndPoses.set('pencil', pencilEnd);
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
				this._instrumentEndPoses.set('compass', { x: cx, y: cy, rotation: endAngle });
			}
		}

		// Read pre-calculated phase ratios using the timeline index (not the
		// stepper index — they diverge for chorégraphié statements).
		const stepIdx = this._timelineIndex;
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
	private scalarParamToNumber(param: ScalarParam, fig: Figure): number {
		if (isScalarRef(param)) {
			return fig.getScalarValue(param.scalarRef) ?? 0;
		}
		if (isInfinityParam(param)) {
			return param.infinity === '+' ? Infinity : -Infinity;
		}
		return geoToNumber(param);
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

	/** Cache les instruments montrés automatiquement pour le pas précédent,
	 *  y compris ceux laissés en place pendant une directive. */
	hideAutoInstruments(): void {
		for (const type of [...this._autoInstruments, ...this._heldInstruments]) {
			const state = this._instrumentStates.get(type);
			if (state) state.visible = false;
		}
		this._autoInstruments.clear();
		this._heldInstruments.clear();
		this._instrumentEndPoses.clear();
	}

	/**
	 * Pas de directive (`@pause`, `@instruction`…) : les instruments
	 * automatiques du pas précédent restent affichés, immobiles, dans leur
	 * pose de fin de geste. Ils ne sont plus animés (ni déplacement, ni
	 * levée du compas) : plus rien à tracer pendant ce pas.
	 */
	private holdAutoInstruments(): void {
		for (const type of this._autoInstruments) {
			const state = this._instrumentStates.get(type);
			if (!state) continue;
			const end = this._instrumentEndPoses.get(type);
			if (end) {
				state.x = end.x;
				state.y = end.y;
				state.rotation = end.rotation;
			}
			this._heldInstruments.add(type);
		}
		this._autoInstruments.clear();
		this._instrumentMoves.clear();
		this._instrumentEndPoses.clear();
		this._movePhaseEnd = 0;
		this._drawPhaseStart = 0;
		this._drawPhaseEnd = 1;
		this._pausePhaseStart = 1;
		this._moveDurationMs = 0;
	}

	/**
	 * Pose du crayon au bout d'un segment tracé : à l'extrémité, incliné de
	 * 45° sur le trait comme pendant le tracé (`pencilRotation` de la toile).
	 */
	private pencilEndPose(el: GeoElement, fig: Figure): InstrumentPose | null {
		if (!isSegment(el)) return null;
		const p1 = fig.getPosition(el.startId);
		const p2 = fig.getPosition(el.endId);
		if (!p1 || !p2) return null;
		const x1 = geoToNumber(p1.x);
		const y1 = geoToNumber(p1.y);
		const x2 = geoToNumber(p2.x);
		const y2 = geoToNumber(p2.y);
		const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
		return { x: x2, y: y2, rotation: angle + 45 };
	}

	// ─── Duration calculation ────────────────────────────────

	/**
	 * Pre-simulate all steps to calculate durations and build the timeline plan.
	 *
	 * For non-decorated statements : 1 entry per statement (legacy behavior).
	 * For decorated `@euclide` statements : the choreography is invoked on the
	 * temporary stepper to capture the sub-steps and create auxiliary elements
	 * (arcs, intersections, segment-trace). Each sub-step becomes its own
	 * entry in `_stepDurations` / `_stepPhases` / `_plan` (slider sees them
	 * as individual step entries).
	 */
	private calculateStepDurations(): number[] {
		if (!this._program) return [];

		// Create a temporary stepper to simulate execution
		let speedFactor = 1;
		const tempHandler: DirectiveHandler = (name, args) => {
			if (name === 'vitesse') {
				const val = args.positional[0];
				if (val?.type === 'nombre' && val.value > 0) speedFactor = val.value;
			}
		};
		const tempStepper = createStepper(this._program, undefined, tempHandler);
		this._auxGiven = new Map();

		const durations: number[] = [];
		this._stepPhases = [];
		this._plan = [];

		// Track instrument positions for move distance calculation.
		// Default start position: top-left corner in math coords.
		const instrumentPos: Record<string, { x: number; y: number; rotation: number }> = {
			ruler: { x: -8, y: 6, rotation: 0 },
			compass: { x: -8, y: 6, rotation: 0 }
		};
		const steps = tempStepper.steps;

		for (let i = 0; i < steps.length; i++) {
			const durationsLenBefore = durations.length;
			const phasesLenBefore = this._stepPhases.length;
			const planLenBefore = this._plan.length;
			try {
				const stmt = steps[i];

				// ─── Decorator resolution + voie lookup ───
				let triple: DecoratorTriple | null = null;
				let voie: Voie | null = null;
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
						triple = resolveDecorators(stmt.decorators, callValue.name);
						voie = lookupVoie(triple, callValue.name);
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

				// ─── Directives ───
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
					this._plan.push({
						statement: stmt,
						isStatementBoundary: true,
						isLastEntryOfStatement: true,
						decoratorTriple: null,
						voie: null,
						subStep: null
					});
					tempStepper.step();
					continue;
				}

				// ─── Execute the DSL statement on the temp stepper ───
				const sizeBefore = tempStepper.figure.size;
				tempStepper.step();
				const fig = tempStepper.figure;

				// ─── Chorégraphié path : expand into N sub-step entries ───
				if (voie && triple) {
					const result = this.invokeChoreographyOn(stmt, voie, triple, tempStepper);
					// Visibilité finale appliquée aussi à la pré-passe, comme à l'exécution
					// (`drainPendingVisibility`) : une chorégraphie suivante voit les mêmes
					// éléments visibles dans les deux passes (cf. `revealHiddenUsedPoints`).
					// Ne crée aucun élément : l'alignement des ids est intact.
					if (result) applyFinalVisibility(tempStepper.figure, result.produced, triple);
					const subSteps = result?.subSteps ?? [];
					if (subSteps.length > 0) {
						for (let j = 0; j < subSteps.length; j++) {
							const ss = subSteps[j];
							const timing = this.computeSubStepTiming(ss, speedFactor, instrumentPos);
							durations.push(timing.totalDuration);
							this._stepPhases.push(timing.phases);
							this._plan.push({
								statement: stmt,
								isStatementBoundary: j === 0,
								isLastEntryOfStatement: j === subSteps.length - 1,
								decoratorTriple: triple,
								voie,
								subStep: ss
							});
							if (timing.newInstrumentPos) {
								instrumentPos[timing.newInstrumentPos.type] = {
									x: timing.newInstrumentPos.x,
									y: timing.newInstrumentPos.y,
									rotation: timing.newInstrumentPos.rotation
								};
							}
						}
						continue;
					}
					// Choreography returned no sub-steps (stub) — fall through to
					// legacy timing path so the script still progresses.
				}

				// ─── Legacy non-chorégraphié timing ───
				// `voie` may still be non-null when a decorated statement's
				// choreography returns no sub-steps (stub) — keep it so the
				// caller still sees `currentVoie` populated during the step.
				this.computeLegacyStatementTiming(
					stmt,
					triple,
					voie,
					sizeBefore,
					fig,
					speedFactor,
					instrumentPos,
					durations
				);
			} catch (e) {
				// Pre-execution failed at step i. Rollback any partial entries
				// pushed during this iteration, store the error info, stop.
				durations.length = durationsLenBefore;
				this._stepPhases.length = phasesLenBefore;
				this._plan.length = planLenBefore;
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

		// Étiquette provisoire remplacée par le nom du script (`labelElement`).
		this._auxRenamed = new Map();
		for (const [id, name] of this._auxGiven) {
			const label = tempStepper.figure.getElementById(id)?.label;
			if (label && label !== name) this._auxRenamed.set(id, label);
		}

		return durations;
	}

	/**
	 * Compute duration + phase ratios for a single sub-step + update tracked
	 * instrument position for subsequent sub-steps.
	 *
	 * Mirrors the legacy `calculateStepDurations` timing logic but operates
	 * on a sub-step's explicit metadata (instrument target, geometric
	 * distance) instead of inferring from newly-created figure elements.
	 */
	private computeSubStepTiming(
		subStep: SubStep,
		speedFactor: number,
		instrumentPos: Record<string, { x: number; y: number; rotation: number }>
	): {
		totalDuration: number;
		phases: {
			movePhaseEnd: number;
			drawPhaseStart: number;
			drawPhaseEnd: number;
			pausePhaseStart: number;
			moveDurationMs: number;
		};
		newInstrumentPos: { type: InstrumentType; x: number; y: number; rotation: number } | null;
	} {
		const PPU = 40;

		// Fade-in sub-steps (no instrument, no progressive trace) : short fade,
		// then the reading pause. The fade ends at `drawPhaseEnd` ; the canvas
		// holds the elements still during the pause (`fadeInProgress`).
		if (subStep.kind === 'point-fade-in' || subStep.kind === 'line-fade-in') {
			const adjusted = Math.round(DEFAULT_STEP_DURATION / speedFactor);
			const fade = Math.max(100, Math.min(MAX_STEP_DURATION, adjusted));
			const stepDur = fade + readingPauseMs(subStep.instruction);
			return {
				totalDuration: stepDur,
				phases: {
					movePhaseEnd: 0,
					drawPhaseStart: 0,
					drawPhaseEnd: fade / stepDur,
					pausePhaseStart: fade / stepDur,
					moveDurationMs: 0
				},
				newInstrumentPos: null
			};
		}

		// Draw duration from explicit geometric distance. For `compass-measure`,
		// no arc is drawn — the step is purely a move + pause to visualize
		// the compass taking a measure between two points.
		const isMeasure = subStep.kind === 'compass-measure';
		const rawDraw = isMeasure ? 0 : Math.round(subStep.geometricDistance * PPU * MS_PER_PIXEL);
		const drawDuration = isMeasure
			? 0
			: Math.max(MIN_STEP_DURATION, Math.min(MAX_STEP_DURATION, Math.round(rawDraw / speedFactor)));

		// Move duration from instrument position delta.
		let moveDuration = 0;
		let newInstrumentPos: {
			type: InstrumentType;
			x: number;
			y: number;
			rotation: number;
		} | null = null;
		if (subStep.instrument && subStep.instrumentTarget) {
			const prev = instrumentPos[subStep.instrument] ?? { x: -8, y: 6, rotation: 0 };
			const dx = subStep.instrumentTarget.x - prev.x;
			const dy = subStep.instrumentTarget.y - prev.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const cruiseMs = Math.round(
				(dist * PPU * MS_PER_PIXEL) / (speedFactor * INSTRUMENT_MOVE_SPEED_FACTOR)
			);
			let rotDelta = subStep.instrumentTarget.rotation - prev.rotation;
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

			// Where the instrument ends up rotation-wise after drawing.
			// For compass-draw : the angle advances by (geometricDistance / radius)
			// in radians. For compass-measure : no draw, rotation stays at target.
			let endRotation = subStep.instrumentTarget.rotation;
			if (
				subStep.kind === 'compass-draw' &&
				subStep.compassRadius !== undefined &&
				subStep.compassRadius > 0
			) {
				const sweepDeg = (subStep.geometricDistance / subStep.compassRadius) * (180 / Math.PI);
				endRotation = subStep.instrumentTarget.rotation + sweepDeg;
			}
			newInstrumentPos = {
				type: subStep.instrument,
				x: subStep.instrumentTarget.x,
				y: subStep.instrumentTarget.y,
				rotation: endRotation
			};
		}

		const isCompassDraw = subStep.kind === 'compass-draw';
		const raiseDuration = isCompassDraw ? COMPASS_RAISE_MS : 0;
		const lowerDuration = isCompassDraw ? COMPASS_LOWER_MS : 0;

		const totalDuration =
			moveDuration +
			raiseDuration +
			drawDuration +
			lowerDuration +
			readingPauseMs(subStep.instruction);
		const moveEnd = moveDuration / totalDuration;
		const drawStart = (moveDuration + raiseDuration) / totalDuration;
		const drawEnd = (moveDuration + raiseDuration + drawDuration) / totalDuration;
		const pauseStart =
			(moveDuration + raiseDuration + drawDuration + lowerDuration) / totalDuration;

		return {
			totalDuration,
			phases: {
				movePhaseEnd: moveEnd,
				drawPhaseStart: drawStart,
				drawPhaseEnd: drawEnd,
				pausePhaseStart: pauseStart,
				moveDurationMs: moveDuration
			},
			newInstrumentPos
		};
	}

	/**
	 * Legacy timing path for non-chorégraphié statements. Mirrors the original
	 * `calculateStepDurations` logic : infer instrument + animation from the
	 * elements created by the statement, push 1 entry into the timeline.
	 */
	private computeLegacyStatementTiming(
		stmt: DslStatement,
		triple: DecoratorTriple | null,
		voie: Voie | null,
		sizeBefore: number,
		fig: Figure,
		speedFactor: number,
		instrumentPos: Record<string, { x: number; y: number; rotation: number }>,
		durations: number[]
	): void {
		const PPU = 40;
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
			this._plan.push({
				statement: stmt,
				isStatementBoundary: true,
				isLastEntryOfStatement: true,
				decoratorTriple: triple,
				voie,
				subStep: null
			});
			return;
		}

		// Calculate draw duration from distance.
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
					const r = Math.sqrt((geoToNumber(start.x) - cx) ** 2 + (geoToNumber(start.y) - cy) ** 2);
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
					const r = Math.sqrt((geoToNumber(edge.x) - cx) ** 2 + (geoToNumber(edge.y) - cy) ** 2);
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

		let moveDuration = 0;
		if (instrumentTarget) {
			const prev = instrumentPos[instrumentTarget.type] ?? { x: -8, y: 6, rotation: 0 };
			const dx = instrumentTarget.x - prev.x;
			const dy = instrumentTarget.y - prev.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const cruiseMs = Math.round(
				(dist * PPU * MS_PER_PIXEL) / (speedFactor * INSTRUMENT_MOVE_SPEED_FACTOR)
			);

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

			const endAngleDeg = this.computeEndAngleForStep(newElements, fig);
			instrumentPos[instrumentTarget.type] = {
				x: instrumentTarget.x,
				y: instrumentTarget.y,
				rotation: endAngleDeg
			};
		}

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
		this._plan.push({
			statement: stmt,
			isStatementBoundary: true,
			isLastEntryOfStatement: true,
			decoratorTriple: triple,
			voie,
			subStep: null
		});
	}
}
