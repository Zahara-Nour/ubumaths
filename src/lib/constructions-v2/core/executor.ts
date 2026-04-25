/**
 * Construction Executor — orchestrates step-by-step DSL execution.
 *
 * Wraps a DslStepper and handles directives to manage instrument
 * state, instructions, pause durations, and speed factors.
 */

import { parseDsl, createStepper } from '$lib/geometry-core/dsl';
import type { DslStepper, DirectiveHandler, DslStatement } from '$lib/geometry-core/dsl';
import { Figure } from '$lib/geometry-core/graph/figure';
import { SymbolTable } from '$lib/geometry-core/dsl/symbol-table';
import type { ResolvedArgs, ResolvedValue } from '$lib/geometry-core/dsl/builtins';
import type { InstrumentType, InstrumentState } from '../types';
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
		const sizeBefore = this.stepper.figure.size;
		const result = this.stepper.step();
		if (result) {
			this.autoPositionInstruments(sizeBefore);
			// Track new drawable elements for animation
			const elements = this.stepper.figure.getAllElements();
			this._lastStepNewElementIds = elements
				.slice(sizeBefore)
				.filter((el) => DRAWABLE_TYPES.has(el.type))
				.map((el) => el.id);
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

	// ─── Auto-positioning ───────────────────────────────────

	private autoPositionInstruments(sizeBefore: number): void {
		if (!this.stepper) return;
		const fig = this.stepper.figure;
		if (fig.size <= sizeBefore) return; // no new element

		// Find the newest element(s)
		const elements = fig.getAllElements();
		const newElements = elements.slice(sizeBefore);

		for (const el of newElements) {
			if (el.type === 'segment') {
				// Auto-position ruler on segment
				const rulerState = this._instrumentStates.get('ruler');
				if (rulerState?.visible) {
					const p1 = fig.getPosition(el.startId);
					const p2 = fig.getPosition(el.endId);
					if (p1 && p2) {
						const pos = rulerPosition(
							{ x: geoToNumber(p1.x), y: geoToNumber(p1.y) },
							{ x: geoToNumber(p2.x), y: geoToNumber(p2.y) }
						);
						Object.assign(rulerState, pos);
					}
				}
			} else if (el.type === 'circleByRadius' || el.type === 'circleByPoint') {
				// Auto-position compass on circle center
				const compassState = this._instrumentStates.get('compass');
				if (compassState?.visible) {
					const center = fig.getPosition(el.centerId);
					if (center) {
						let radius = 100;
						if (el.type === 'circleByRadius') {
							radius = geoToNumber(el.radius);
						} else {
							const edge = fig.getPosition(el.edgePointId);
							if (edge) {
								const dx = geoToNumber(edge.x) - geoToNumber(center.x);
								const dy = geoToNumber(edge.y) - geoToNumber(center.y);
								radius = Math.sqrt(dx * dx + dy * dy);
							}
						}
						const pos = compassPosition(
							{ x: geoToNumber(center.x), y: geoToNumber(center.y) },
							radius
						);
						Object.assign(compassState, pos);
					}
				}
			}
		}
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
