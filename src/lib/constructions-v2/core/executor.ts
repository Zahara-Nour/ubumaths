/**
 * Construction Executor — orchestrates step-by-step DSL execution.
 *
 * Wraps a DslStepper and handles directives to manage instrument
 * state, instructions, pause durations, and speed factors.
 */

import { parseDsl, createStepper } from '$lib/geometry-core/dsl';
import type { DslStepper, DirectiveHandler, DslStatement } from '$lib/geometry-core/dsl';
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
	MAX_STEP_DURATION
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
	private _emptyFigure = new Figure();
	private _stepDurations: number[] = [];
	private _instrumentStates = new Map<InstrumentType, InstrumentState>();
	private _currentInstruction: string | null = null;
	private _speedFactor = 1;
	private _lastStepNewElementIds: string[] = [];
	/** Instruments auto-shown for the current step (to hide when step completes). */
	private _autoInstruments: Set<InstrumentType> = new Set();
	/** Movement animations for auto-instruments (previous → new position). */
	private _instrumentMoves = new Map<InstrumentType, InstrumentMove>();

	/** Load a DSL script and prepare for stepping. */
	load(script: string): void {
		const program = parseDsl(script);
		this._speedFactor = 1;
		this._currentInstruction = null;
		this._instrumentStates.clear();

		const handler: DirectiveHandler = (name, args) => {
			this.handleDirective(name, args);
		};
		this.stepper = createStepper(program, undefined, handler);
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
			// Track new drawable elements for animation
			const elements = this.stepper.figure.getAllElements();
			this._lastStepNewElementIds = elements
				.slice(sizeBefore)
				.filter((el) => DRAWABLE_TYPES.has(el.type))
				.map((el) => el.id);
			this.autoShowInstruments(sizeBefore);
		} else {
			this._lastStepNewElementIds = [];
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
		this._autoInstruments.clear();
		this._instrumentMoves.clear();
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

	/** Instrument types that were auto-shown for the current step. */
	get autoInstruments(): Set<InstrumentType> {
		return this._autoInstruments;
	}

	/** Movement animations for auto-instruments. */
	get instrumentMoves(): Map<InstrumentType, InstrumentMove> {
		return this._instrumentMoves;
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
	 *  If the instrument was never visible, it enters from off-screen (below the canvas). */
	private recordMove(type: InstrumentType, toX: number, toY: number, toRotation: number): void {
		const current = this._instrumentStates.get(type);
		let fromX: number, fromY: number, fromRotation: number;
		if (current && current.visible) {
			// Instrument was previously visible — slide from last known position
			fromX = current.x;
			fromY = current.y;
			fromRotation = current.rotation;
		} else {
			// First appearance or hidden — start from top-left corner (math coords)
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
			}
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

	private calculateStepDurations(): number[] {
		if (!this.stepper) return [];
		const steps = this.stepper.steps;
		const durations: number[] = [];
		let speedFactor = 1;

		for (const stmt of steps) {
			durations.push(this.stepDuration(stmt, speedFactor));
			if (stmt.kind === 'directive' && stmt.name === 'vitesse') {
				const arg = stmt.args[0];
				if (arg?.kind === 'number' && arg.value > 0) {
					speedFactor = arg.value;
				}
			}
		}
		return durations;
	}

	private stepDuration(stmt: DslStatement, speedFactor: number): number {
		if (stmt.kind === 'directive') {
			if (stmt.name === 'pause') {
				const arg = stmt.args[0];
				return arg?.kind === 'number' ? arg.value : DEFAULT_PAUSE_DURATION;
			}
			return 0; // other directives are instant
		}
		// Geometric step: apply speed factor
		const adjusted = Math.round(DEFAULT_STEP_DURATION / speedFactor);
		return Math.max(MIN_STEP_DURATION, Math.min(MAX_STEP_DURATION, adjusted));
	}
}
