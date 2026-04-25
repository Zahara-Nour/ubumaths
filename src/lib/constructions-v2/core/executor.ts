/**
 * Construction Executor — orchestrates step-by-step DSL execution.
 *
 * Wraps a DslStepper and handles directives to manage instrument
 * state, instructions, pause durations, and speed factors.
 */

import { parseDsl, createStepper } from '$lib/geometry-core/dsl';
import type { DslStepper, DirectiveHandler } from '$lib/geometry-core/dsl';
import { Figure } from '$lib/geometry-core/graph/figure';
import type { GeoElement } from '$lib/geometry-core/types/elements';
import {
	isCircleByRadius,
	isCircleByPoint,
	isArcByAngles,
	isArcByPoints
} from '$lib/geometry-core/types/elements';
import { SymbolTable } from '$lib/geometry-core/dsl/symbol-table';
import type { ResolvedArgs, ResolvedValue } from '$lib/geometry-core/dsl/builtins';
import type { InstrumentType, InstrumentState, InstrumentMove } from '../types';
import { createDefaultInstrumentState, DRAWABLE_TYPES } from '../types';
import { rulerPosition, compassPosition } from '../instruments/positioning';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import {
	DEFAULT_STEP_DURATION,
	DEFAULT_PAUSE_DURATION,
	MIN_STEP_DURATION,
	MAX_STEP_DURATION,
	MS_PER_PIXEL,
	AUTO_PAUSE_BETWEEN_STEPS,
	INSTRUMENT_RAMP_MS,
	INSTRUMENT_MOVE_SPEED_FACTOR
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
	private _stepPhases: { movePhaseEnd: number; pausePhaseStart: number; moveDurationMs: number }[] =
		[];
	/** Current step's move phase end (set during step()). */
	private _movePhaseEnd = 0;
	/** Current step's pause phase start (set during step()). */
	private _pausePhaseStart = 1;
	/** Current step's move duration in ms. */
	private _moveDurationMs = 0;

	/** Load a DSL script and prepare for stepping. */
	load(script: string): void {
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

	/** Execute one step. Returns false when done. */
	step(): boolean {
		if (!this.stepper) return false;
		// Hide instruments that were auto-shown for the previous step
		this.hideAutoInstruments();
		const sizeBefore = this.stepper.figure.size;
		const result = this.stepper.step();
		if (result) {
			// Track new elements for animation
			const elements = this.stepper.figure.getAllElements();
			const newElements = elements.slice(sizeBefore);
			this._lastStepNewElementIds = newElements
				.filter((el) => DRAWABLE_TYPES.has(el.type))
				.map((el) => el.id);
			this._lastStepNewPointIds = newElements
				.filter((el) => el.type === 'freePoint' || el.type === 'dependentPoint')
				.map((el) => el.id);
			this.autoShowInstruments(sizeBefore);
		} else {
			this._lastStepNewElementIds = [];
			this._lastStepNewPointIds = [];
		}
		return result;
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
		this._autoInstruments.clear();
		this._instrumentMoves.clear();
		this._lastInstrumentPositions.clear();
		this._movePhaseEnd = 0;
		this._pausePhaseStart = 1;
		this._moveDurationMs = 0;
		this._stepPhases = [];
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

	/** Instrument types that were auto-shown for the current step. */
	get autoInstruments(): Set<InstrumentType> {
		return this._autoInstruments;
	}

	/** Movement animations for auto-instruments. */
	get instrumentMoves(): Map<InstrumentType, InstrumentMove> {
		return this._instrumentMoves;
	}

	/** Progress ratio at which instrument movement ends and drawing begins. */
	get movePhaseEnd(): number {
		return this._movePhaseEnd;
	}

	/** Progress ratio at which drawing ends and post-draw pause begins. */
	get pausePhaseStart(): number {
		return this._pausePhaseStart;
	}

	/** Duration of the instrument move phase in ms. */
	get moveDurationMs(): number {
		return this._moveDurationMs;
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

				// Show and position compass only (no pencil — compass traces directly)
				const cx = geoToNumber(center.x);
				const cy = geoToNumber(center.y);
				const pos = compassPosition({ x: cx, y: cy }, radius);

				this.recordMove('compass', cx, cy, 0);

				const compass = this.ensureInstrument('compass');
				Object.assign(compass, pos);
				this._autoInstruments.add('compass');
				// Track last known position for next step's recordMove
				this._lastInstrumentPositions.set('compass', { x: cx, y: cy, rotation: 0 });
			}
		}

		// Read pre-calculated phase ratios
		const stepIdx = this.stepper!.currentIndex;
		if (stepIdx >= 0 && stepIdx < this._stepPhases.length) {
			this._movePhaseEnd = this._stepPhases[stepIdx].movePhaseEnd;
			this._pausePhaseStart = this._stepPhases[stepIdx].pausePhaseStart;
			this._moveDurationMs = this._stepPhases[stepIdx].moveDurationMs;
		} else {
			this._movePhaseEnd = 0;
			this._pausePhaseStart = 1;
			this._moveDurationMs = 0;
		}
	}

	private resolveRadius(el: GeoElement, fig: Figure): number {
		if (isCircleByRadius(el) || isArcByAngles(el)) {
			return geoToNumber(el.radius);
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
		const instrumentPos: Record<string, { x: number; y: number }> = {
			ruler: { x: -8, y: 6 },
			compass: { x: -8, y: 6 }
		};
		const steps = tempStepper.steps;

		for (let i = 0; i < steps.length; i++) {
			const stmt = steps[i];
			if (stmt.kind === 'directive') {
				if (stmt.name === 'pause') {
					const arg = stmt.args[0];
					durations.push(arg?.kind === 'number' ? arg.value : DEFAULT_PAUSE_DURATION);
				} else {
					durations.push(0);
				}
				this._stepPhases.push({ movePhaseEnd: 0, pausePhaseStart: 1, moveDurationMs: 0 });
				tempStepper.step();
				continue;
			}

			// Geometric step: measure before/after to get distance
			const sizeBefore = tempStepper.figure.size;
			tempStepper.step();
			const fig = tempStepper.figure;
			const newElements = fig.getAllElements().slice(sizeBefore);

			const hasDrawable = newElements.some((el) => DRAWABLE_TYPES.has(el.type));
			const hasPoint = newElements.some(
				(el) => el.type === 'freePoint' || el.type === 'dependentPoint'
			);
			if (!hasDrawable) {
				const adjusted = Math.round(DEFAULT_STEP_DURATION / speedFactor);
				const stepDur = hasPoint
					? Math.max(100, Math.min(MAX_STEP_DURATION, adjusted)) + AUTO_PAUSE_BETWEEN_STEPS
					: Math.max(100, Math.min(MAX_STEP_DURATION, adjusted));
				durations.push(stepDur);
				this._stepPhases.push({ movePhaseEnd: 0, pausePhaseStart: 1, moveDurationMs: 0 });
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
						const r = geoToNumber(el.radius);
						const sweep = Math.abs(geoToNumber(el.endAngle) - geoToNumber(el.startAngle));
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
						const r = geoToNumber(el.radius);
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

			// Calculate move duration from instrument distance
			let moveDuration = 0;
			if (instrumentTarget) {
				const prev = instrumentPos[instrumentTarget.type] ?? { x: -8, y: 6 };
				const dx = instrumentTarget.x - prev.x;
				const dy = instrumentTarget.y - prev.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const cruiseMs = Math.round(
					(dist * PPU * MS_PER_PIXEL) / (speedFactor * INSTRUMENT_MOVE_SPEED_FACTOR)
				);
				moveDuration = Math.max(
					600,
					cruiseMs <= INSTRUMENT_RAMP_MS ? cruiseMs : cruiseMs + INSTRUMENT_RAMP_MS
				);
				// Update instrument position for next step
				instrumentPos[instrumentTarget.type] = { x: instrumentTarget.x, y: instrumentTarget.y };
			}

			const totalDuration = moveDuration + drawDuration + AUTO_PAUSE_BETWEEN_STEPS;
			durations.push(totalDuration);
			this._stepPhases.push({
				movePhaseEnd: moveDuration / totalDuration,
				pausePhaseStart: (moveDuration + drawDuration) / totalDuration,
				moveDurationMs: moveDuration
			});
		}

		return durations;
	}
}
